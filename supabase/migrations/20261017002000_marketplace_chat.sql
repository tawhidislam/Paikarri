-- Additive participant chat: safe product cards, idempotent sends, and private read cursors.
alter table public.messages add column product_id uuid references public.products on delete set null;
alter table public.messages add column product_snapshot jsonb check(product_snapshot is null or (jsonb_typeof(product_snapshot)='object' and octet_length(product_snapshot::text)<=4000));
alter table public.messages add column client_nonce uuid;
create unique index messages_sender_nonce_idx on public.messages(sender_id,client_nonce) where client_nonce is not null;
create table public.conversation_read_states(
 conversation_id uuid not null references public.conversations on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 last_read_at timestamptz not null,
 last_read_id uuid not null,
 updated_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
alter table public.conversation_read_states enable row level security;
revoke all on public.conversation_read_states from public,anon,authenticated;
grant select on public.conversation_read_states to authenticated;
grant all on public.conversation_read_states to service_role;
create policy read_states_participant on public.conversation_read_states for select to authenticated using(private.in_conversation(conversation_id));
alter publication supabase_realtime add table public.conversation_read_states;

create function private.chat_access(target uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not(private.is_buyer() or private.is_supplier()) or not private.in_conversation(target) then raise exception 'Conversation access denied' using errcode='42501';end if;
end;$$;
create function private.chat_product(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'name',name,'name_bn',name_bn,'price',price,'moq',moq,'unit',unit) from public.products where id=target;
$$;
create function private.guard_chat_product() returns trigger language plpgsql security definer set search_path='' as $$begin
 -- Client writes cannot forge future timestamps and corrupt unread/read ordering.
 if current_setting('role',true) in('authenticated','anon') then new.created_at=clock_timestamp();end if;
 if new.product_id is null then new.product_snapshot=null;return new;end if;
 if not exists(select 1 from public.products p join public.conversations c on c.business_id=p.business_id where c.id=new.conversation_id and p.id=new.product_id and p.status='approved' and private.business_active(p.business_id)) then raise exception 'Product unavailable for this conversation' using errcode='42501';end if;
 new.product_snapshot=private.chat_product(new.product_id);return new;
end;$$;
create trigger message_product_context before insert on public.messages for each row execute function private.guard_chat_product();

create function public.chat_thread(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 perform private.chat_access(target);
 select jsonb_build_object('id',c.id,'business_id',b.id,'buyer_id',c.buyer_id,'supplier_id',b.owner_id,'business_name',b.name,'business_name_bn',b.name_bn,'buyer_name',p.full_name,'verified',private.supplier_verified(b.id),'supplier_status',coalesce(s.status,'active'),'created_at',c.created_at,
 'latest',(select jsonb_build_object('body',m.body,'sender_id',m.sender_id,'created_at',m.created_at) from public.messages m where m.conversation_id=c.id order by m.created_at desc,m.id desc limit 1),
 'unread_count',(select count(*) from public.messages m where m.conversation_id=c.id and m.sender_id<>auth.uid() and (m.created_at,m.id)>(coalesce(own.last_read_at,'-infinity'),coalesce(own.last_read_id,'00000000-0000-0000-0000-000000000000'))),
 'peer_read_at',peer.last_read_at,'peer_read_id',peer.last_read_id)
 into result from public.conversations c join public.businesses b on b.id=c.business_id join public.profiles p on p.id=c.buyer_id left join public.account_statuses s on s.user_id=b.owner_id
 left join public.conversation_read_states own on own.conversation_id=c.id and own.user_id=auth.uid()
 left join public.conversation_read_states peer on peer.conversation_id=c.id and peer.user_id=case when c.buyer_id=auth.uid() then b.owner_id else c.buyer_id end where c.id=target;
 return result;
end;$$;
create function public.chat_start(business uuid,product uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare cid uuid;begin
 if not private.is_buyer() then raise exception 'Buyer account required to start supplier chat' using errcode='42501';end if;
 select id into cid from public.conversations where buyer_id=auth.uid() and business_id=business;
 if product is not null and not exists(select 1 from public.products p where p.id=product and p.business_id=business and p.status='approved' and private.business_active(business)) then raise exception 'Product unavailable for this conversation' using errcode='42501';end if;
 if cid is null then
  if not private.is_active(auth.uid()) or not private.public_business(business) or private.owns_business(business) then raise exception 'New conversations are unavailable for this account or supplier' using errcode='42501';end if;
  insert into public.conversations(buyer_id,business_id) values(auth.uid(),business) on conflict(buyer_id,business_id) do nothing returning id into cid;
  if cid is null then select id into cid from public.conversations where buyer_id=auth.uid() and business_id=business;end if;
 end if;
 return jsonb_build_object('thread',public.chat_thread(cid),'product',case when product is not null then private.chat_product(product) end);
end;$$;
create function public.chat_list(search text default '',unread_only boolean default false,page integer default 1,page_size integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not(private.is_buyer() or private.is_supplier()) then raise exception 'Participant account required' using errcode='42501';end if;
 if page is null or page_size is null or page<1 or page>100000 or page_size<1 or page_size>100 or length(coalesce(search,''))>200 then raise exception 'Invalid conversation pagination';end if;
 with base as materialized(select c.id,coalesce(m.created_at,c.created_at) activity from public.conversations c join public.businesses b on b.id=c.business_id join public.profiles p on p.id=c.buyer_id
 left join lateral(select body,created_at from public.messages where conversation_id=c.id order by created_at desc,id desc limit 1) m on true
 where (c.buyer_id=auth.uid() or b.owner_id=auth.uid()) and (coalesce(search,'')='' or concat_ws(' ',b.name,b.name_bn,p.full_name,c.buyer_id::text,m.body) ilike '%'||search||'%')
 and (not coalesce(unread_only,false) or exists(select 1 from public.messages x left join public.conversation_read_states r on r.conversation_id=c.id and r.user_id=auth.uid() where x.conversation_id=c.id and x.sender_id<>auth.uid() and (x.created_at,x.id)>(coalesce(r.last_read_at,'-infinity'),coalesce(r.last_read_id,'00000000-0000-0000-0000-000000000000'))))),
 paged as(select * from base order by activity desc,id desc limit page_size offset (page-1)*page_size)
 select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg(public.chat_thread(id) order by activity desc,id desc) from paged),'[]')) into result;return result;
end;$$;
create function public.chat_messages(target uuid,before_cursor jsonb default null,after_cursor jsonb default null,page_size integer default 50) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cursor_value jsonb;cursor_time timestamptz;cursor_id uuid;result jsonb;
begin
 perform private.chat_access(target);
 if page_size is null or page_size<1 or page_size>100 or (before_cursor is not null and after_cursor is not null) then raise exception 'Invalid message pagination';end if;
 cursor_value=coalesce(before_cursor,after_cursor);
 if cursor_value is not null then
  if jsonb_typeof(cursor_value) is distinct from 'object' or cursor_value->>'created_at' is null or cursor_value->>'id' is null then raise exception 'Invalid message cursor';end if;
  cursor_time=(cursor_value->>'created_at')::timestamptz;cursor_id=(cursor_value->>'id')::uuid;
 end if;
 with candidates as materialized (
 select id,conversation_id,sender_id,body,created_at,product_snapshot from public.messages
 where conversation_id=target and (before_cursor is null or (created_at,id)<(cursor_time,cursor_id)) and (after_cursor is null or (created_at,id)>(cursor_time,cursor_id))
 order by case when after_cursor is not null then created_at end asc,case when after_cursor is not null then id end asc,case when after_cursor is null then created_at end desc,case when after_cursor is null then id end desc limit page_size+1
 ),paged as materialized(select * from candidates order by case when after_cursor is not null then created_at end asc,case when after_cursor is not null then id end asc,case when after_cursor is null then created_at end desc,case when after_cursor is null then id end desc limit page_size)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged) order by created_at,id) from paged),'[]'),'has_more',(select count(*)>page_size from candidates),
 'oldest',(select jsonb_build_object('created_at',created_at,'id',id) from paged order by created_at,id limit 1),'newest',(select jsonb_build_object('created_at',created_at,'id',id) from paged order by created_at desc,id desc limit 1)) into result;return result;
end;$$;
create function public.chat_send(target uuid,body text,nonce uuid,product uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare m public.messages;begin
 perform private.chat_access(target);
 if nonce is null or body is null or length(trim(body)) not between 1 and 4000 then raise exception 'Write a message of 1–4000 characters';end if;
 select * into m from public.messages where sender_id=auth.uid() and client_nonce=nonce;
 if m.id is not null then
  if m.conversation_id<>target or m.body<>trim(body) or m.product_id is distinct from product then raise exception 'Message retry does not match the original';end if;
  return to_jsonb(m)-'client_nonce';
 end if;
 insert into public.messages(conversation_id,sender_id,body,client_nonce,product_id) values(target,auth.uid(),trim(body),nonce,product) on conflict(sender_id,client_nonce) where client_nonce is not null do nothing returning * into m;
 if m.id is null then select * into m from public.messages where sender_id=auth.uid() and client_nonce=nonce;
  if m.conversation_id<>target or m.body<>trim(body) or m.product_id is distinct from product then raise exception 'Message retry does not match the original';end if;
 end if;
 return to_jsonb(m)-'client_nonce';
end;$$;
create function public.chat_mark_read(target uuid,message uuid) returns void language plpgsql security definer set search_path='' as $$declare m public.messages;begin
 perform private.chat_access(target);
 select * into m from public.messages where id=message and conversation_id=target;
 if m.id is null then raise exception 'Message is not in this conversation' using errcode='42501';end if;
 insert into public.conversation_read_states(conversation_id,user_id,last_read_at,last_read_id) values(target,auth.uid(),m.created_at,m.id)
 on conflict(conversation_id,user_id) do update set last_read_at=excluded.last_read_at,last_read_id=excluded.last_read_id,updated_at=now() where (conversation_read_states.last_read_at,conversation_read_states.last_read_id)<(excluded.last_read_at,excluded.last_read_id);
end;$$;
create function public.chat_unread_total() returns bigint language plpgsql stable security definer set search_path='' as $$declare result bigint;begin
 if auth.uid() is null or not(private.is_buyer() or private.is_supplier()) then raise exception 'Participant account required' using errcode='42501';end if;
 select count(*) into result from public.messages m join public.conversations c on c.id=m.conversation_id join public.businesses b on b.id=c.business_id left join public.conversation_read_states r on r.conversation_id=c.id and r.user_id=auth.uid()
 where (c.buyer_id=auth.uid() or b.owner_id=auth.uid()) and m.sender_id<>auth.uid() and (m.created_at,m.id)>(coalesce(r.last_read_at,'-infinity'),coalesce(r.last_read_id,'00000000-0000-0000-0000-000000000000'));return result;
end;$$;
-- Monitoring remains separately audited/read-only and now includes safe product cards.
do $$declare d text;begin d=pg_get_functiondef('public.admin_monitor_messages(uuid,uuid,jsonb,jsonb,integer)'::regprocedure);
 if position('select id,conversation_id,sender_id,body,created_at from public.messages' in d)=0 then raise exception 'Monitoring projection changed; inspect before patching';end if;
 execute replace(d,'select id,conversation_id,sender_id,body,created_at from public.messages','select id,conversation_id,sender_id,body,created_at,product_snapshot from public.messages');end;$$;
do $$declare f record;begin for f in select p.oid::regprocedure signature,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.proname in('chat_access','chat_product','guard_chat_product','chat_thread','chat_start','chat_list','chat_messages','chat_send','chat_mark_read','chat_unread_total') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);if f.nspname='public' then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end;$$;
