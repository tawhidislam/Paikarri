-- Super-admin-only oversight. Participant table policies and messaging writes remain unchanged.
create index if not exists messages_monitor_cursor_idx on public.messages(conversation_id,created_at,id);
create function public.admin_monitor_list(filters jsonb default '{}',page integer default 1,page_size integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;start_date date;end_date date;
begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 if page is null or page_size is null or page<1 or page>100000 or page_size<1 or page_size>100 or jsonb_typeof(filters) is distinct from 'object' then raise exception 'Invalid pagination or filters';end if;
 start_date=nullif(filters->>'from','')::date;end_date=nullif(filters->>'to','')::date;
 if start_date>end_date then raise exception 'Start date must not follow end date';end if;
 with base as materialized (
  select c.id,c.business_id,b.owner_id supplier_id,b.name supplier_name,coalesce(s.status,'active') supplier_status,c.buyer_id customer_id,p.full_name customer_name,u.email customer_email,c.created_at,
  coalesce(m.last_message,c.created_at) last_activity,coalesce(m.total,0) message_count
  from public.conversations c join public.businesses b on b.id=c.business_id join public.profiles p on p.id=c.buyer_id join auth.users u on u.id=p.id join public.profiles sp on sp.id=b.owner_id join auth.users su on su.id=b.owner_id left join public.account_statuses s on s.user_id=b.owner_id
  left join lateral(select count(*) total,max(created_at) last_message from public.messages where conversation_id=c.id) m on true
  where (coalesce(filters->>'q','')='' or concat_ws(' ',b.name,sp.full_name,su.email,p.full_name,u.email) ilike '%'||left(filters->>'q',200)||'%')
  and (coalesce(filters->>'supplier','')='' or concat_ws(' ',b.name,sp.full_name,su.email) ilike '%'||left(filters->>'supplier',200)||'%')
  and (coalesce(filters->>'customer','')='' or concat_ws(' ',p.full_name,u.email) ilike '%'||left(filters->>'customer',200)||'%')
  and (coalesce(filters->>'business_id','')='' or c.business_id::text=filters->>'business_id')
  and (coalesce(filters->>'customer_id','')='' or c.buyer_id::text=filters->>'customer_id')
 ),filtered as materialized(select * from base where (start_date is null or last_activity>=start_date::timestamp at time zone 'Asia/Dhaka') and (end_date is null or last_activity<(end_date+1)::timestamp at time zone 'Asia/Dhaka')),
 paged as(select * from filtered order by last_activity desc,id desc limit page_size offset (page-1)*page_size)
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(paged) order by last_activity desc,id desc) from paged),'[]')) into result;return result;
end;$$;
create function public.admin_monitor_messages(target uuid,access_id uuid default null,before_cursor jsonb default null,after_cursor jsonb default null,page_size integer default 50) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cursor_value jsonb;cursor_time timestamptz;cursor_id uuid;result jsonb;
begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 if not exists(select 1 from public.conversations where id=target) then raise exception 'Conversation unavailable' using errcode='P0002';end if;
 if not exists(select 1 from public.admin_audit_logs where id=access_id and admin_id=auth.uid() and entity_id=target and action='conversation_monitor.opened') then raise exception 'Open an audited review before reading messages' using errcode='42501';end if;
 if page_size is null or page_size<1 or page_size>100 or (before_cursor is not null and after_cursor is not null) then raise exception 'Invalid message pagination';end if;
 cursor_value=coalesce(before_cursor,after_cursor);
 if cursor_value is not null then
  if jsonb_typeof(cursor_value) is distinct from 'object' or cursor_value->>'created_at' is null or cursor_value->>'id' is null then raise exception 'Invalid message cursor';end if;
  cursor_time=(cursor_value->>'created_at')::timestamptz;cursor_id=(cursor_value->>'id')::uuid;
 end if;
 with candidates as materialized (
 select id,conversation_id,sender_id,body,created_at from public.messages
 where conversation_id=target and (before_cursor is null or (created_at,id)<(cursor_time,cursor_id)) and (after_cursor is null or (created_at,id)>(cursor_time,cursor_id))
 order by case when after_cursor is not null then created_at end asc,case when after_cursor is not null then id end asc,case when after_cursor is null then created_at end desc,case when after_cursor is null then id end desc limit page_size+1
 ),paged as materialized(select * from candidates order by case when after_cursor is not null then created_at end asc,case when after_cursor is not null then id end asc,case when after_cursor is null then created_at end desc,case when after_cursor is null then id end desc limit page_size)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged) order by created_at,id) from paged),'[]'),'has_more',(select count(*)>page_size from candidates),
 'oldest',(select jsonb_build_object('created_at',created_at,'id',id) from paged order by created_at,id limit 1),'newest',(select jsonb_build_object('created_at',created_at,'id',id) from paged order by created_at desc,id desc limit 1)) into result;return result;
end;$$;
create function public.admin_monitor_open(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;opening_id uuid;
begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 select jsonb_build_object('conversation',jsonb_build_object('id',c.id,'created_at',c.created_at),
 'supplier',jsonb_build_object('id',b.owner_id,'business_id',b.id,'name',b.name,'email',su.email,'status',coalesce(ss.status,'active')),
 'customer',jsonb_build_object('id',p.id,'name',p.full_name,'email',u.email,'status',coalesce(cs.status,'active')))
 into result from public.conversations c join public.businesses b on b.id=c.business_id join public.profiles p on p.id=c.buyer_id join auth.users u on u.id=p.id join auth.users su on su.id=b.owner_id left join public.account_statuses ss on ss.user_id=b.owner_id left join public.account_statuses cs on cs.user_id=c.buyer_id where c.id=target;
 if result is null then raise exception 'Conversation unavailable' using errcode='P0002';end if;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'conversation_monitor.opened',target,'{}') returning id into opening_id;
 result=result||jsonb_build_object('access_id',opening_id,'messages',public.admin_monitor_messages(target,opening_id));
 return result;
end;$$;
revoke all on function public.admin_monitor_list(jsonb,integer,integer),public.admin_monitor_open(uuid),public.admin_monitor_messages(uuid,uuid,jsonb,jsonb,integer) from public,anon,authenticated;
grant execute on function public.admin_monitor_list(jsonb,integer,integer),public.admin_monitor_open(uuid),public.admin_monitor_messages(uuid,uuid,jsonb,jsonb,integer) to authenticated;
-- Preserve all existing private audit exclusions and add monitoring to them.
alter policy audit_read on public.admin_audit_logs using(private.is_admin() and (private.is_super_admin() or (action not like 'homepage_content.%' and action not like 'verification.%' and action not like 'supplier_verifications.%' and action not like 'conversation_monitor.%')));
do $$declare definition text;begin
 definition=pg_get_functiondef('public.admin_list(text,jsonb,integer,integer)'::regprocedure);
 if position('a.action not like ''supplier_verifications.%''' in definition)=0 then raise exception 'Existing audit filter not found';end if;
 definition=replace(definition,'a.action not like ''supplier_verifications.%''','a.action not like ''supplier_verifications.%'' and a.action not like ''conversation_monitor.%''');execute definition;
end;$$;
