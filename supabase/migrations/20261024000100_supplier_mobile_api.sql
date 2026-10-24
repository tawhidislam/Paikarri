-- Additive supplier mobile API. Caller JWTs remain authoritative; no service-role app CRUD.
create table private.supplier_api_replays (
 actor uuid not null references public.profiles on delete cascade,
 operation text not null, key text not null, fingerprint text not null,
 response jsonb not null, expires_at timestamptz not null default now()+interval '24 hours',
 primary key(actor,operation,key)
);
alter table private.supplier_api_replays enable row level security;
revoke all on private.supplier_api_replays from public,anon,authenticated;

create function private.supplier_api_business() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare bid uuid;
begin
 if auth.uid() is null or not coalesce(private.is_supplier(),false) then
 raise exception 'Supplier required' using errcode='42501';end if;
 select id into bid from public.businesses where owner_id=auth.uid();return bid;
end$$;

-- Used by both detail responses and the command authorization below.
create function private.supplier_order_actions(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare o public.orders; actions text[]=array['note'];
begin
 select * into o from public.orders where id=target and business_id=private.supplier_api_business();
 if not found then raise exception 'Order unavailable' using errcode='P0002';end if;
 if o.status='pending_confirmation' and o.expires_at>now() then actions=array_append(actions,'confirm');end if;
 if o.status in('pending_confirmation','awaiting_acceptance','processing') then actions=array_append(actions,'cancel');end if;
 if o.status='processing' then
 if o.cancellation_requested then actions=array_append(actions,'decline_cancel');
 elsif o.payment_method='cod' or o.payment_status='paid' then actions=array_append(actions,'ship');end if;
 end if;
 if o.status='disputed' and exists(select 1 from public.order_returns r join public.order_disputes d on d.id=r.dispute_id where r.order_id=o.id and r.status='in_transit' and d.resolved_at is null) then actions=array_append(actions,'return_received');end if;
 return to_jsonb(actions);
end$$;

create function public.supplier_api_read(operation text,target uuid default null,filters jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare bid uuid;result jsonb;page_num int;search_value text;state_value text;
begin
 bid=private.supplier_api_business();
 if filters is null or jsonb_typeof(filters)<>'object' then raise exception 'Invalid filters' using errcode='22023';end if;
 page_num=coalesce((filters->>'page')::int,1);search_value=coalesce(filters->>'search','');state_value=coalesce(filters->>'state','');
 if page_num not between 1 and 100000 or length(search_value)>200 or length(state_value)>60 then raise exception 'Invalid filters' using errcode='22023';end if;
 case operation
 when 'overview' then
 select jsonb_build_object(
 'business_id',bid,
 'products',jsonb_build_object('total',count(*),'pending',count(*) filter(where status='pending'),'approved',count(*) filter(where status='approved'),'archived',count(*) filter(where status='archived')),
 'orders',(select coalesce(jsonb_object_agg(status,n),'{}') from(select status,count(*) n from public.orders where business_id=bid group by status)s),
 'unanswered_quotations',(select count(*) from public.quotation_requests q where q.business_id=bid and not exists(select 1 from public.quotation_responses r where r.request_id=q.id)),
 'unread_messages',public.chat_unread_total(),'unread_notifications',public.notification_unread_count(),
 'active_warnings',(select count(*) from public.supplier_warnings where business_id=bid and status in('open','response_submitted')),
 'verification',jsonb_build_object('verified',coalesce(private.supplier_verified(bid),false),'current',(select jsonb_build_object('id',id,'status',status,'revision',revision,'valid_until',valid_until,'lock_version',lock_version) from public.verification_applications where business_id=bid order by revision desc limit 1))) into result from public.products where business_id=bid;
 when 'products' then
 with base as materialized(select p.* from public.products p where p.business_id=bid and (state_value='' or p.status=state_value) and(search_value='' or concat_ws(' ',p.name,p.name_bn) ilike '%'||search_value||'%')),
 paged as(select b.* from base b order by created_at desc,id desc limit 25 offset(page_num-1)*25)
 select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg((to_jsonb(p)-'search_vector'-'moderation_note')||jsonb_build_object('moderation_note',(select note from public.product_moderation_notes where product_id=p.id)) order by p.created_at desc,p.id desc) from paged p),'[]')) into result;
 when 'product' then
 select (to_jsonb(p)-'search_vector'-'moderation_note')||jsonb_build_object('moderation_note',(select note from public.product_moderation_notes where product_id=p.id),'tiers',coalesce((select jsonb_agg(t order by min_quantity) from public.product_price_tiers t where product_id=p.id),'[]'),'images',coalesce((select jsonb_agg(i order by position,id) from public.product_images i where product_id=p.id),'[]')) into result from public.products p where id=target and business_id=bid;
 if result is null then raise exception 'Product unavailable' using errcode='P0002';end if;
 when 'quotations' then
 with base as materialized(select q.* from public.quotation_requests q where business_id=bid and (search_value='' or q.message ilike '%'||search_value||'%') and (state_value='' or (state_value='responded')=exists(select 1 from public.quotation_responses r where r.request_id=q.id))),
 paged as(select * from base order by created_at desc,id desc limit 25 offset(page_num-1)*25)
 select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg(to_jsonb(q)||jsonb_build_object('product',(select jsonb_build_object('id',p.id,'name',p.name,'name_bn',p.name_bn,'unit',p.unit) from public.products p where p.id=q.product_id),'response',(select to_jsonb(r) from public.quotation_responses r where r.request_id=q.id)) order by created_at desc,id desc) from paged q),'[]')) into result;
 when 'quotation' then
 select to_jsonb(q)||jsonb_build_object('product',(select jsonb_build_object('id',p.id,'name',p.name,'name_bn',p.name_bn,'unit',p.unit) from public.products p where p.id=q.product_id),'response',(select to_jsonb(r) from public.quotation_responses r where r.request_id=q.id)) into result from public.quotation_requests q where q.id=target and q.business_id=bid;
 if result is null then raise exception 'Quotation unavailable' using errcode='P0002';end if;
 when 'order' then
 result=public.order_detail(target);
 result=result||jsonb_build_object('allowed_actions',private.supplier_order_actions(target));
 when 'orders' then
 result=public.order_list(search_value,state_value,page_num,25);
 select result||jsonb_build_object('rows',coalesce(jsonb_agg(v||jsonb_build_object('allowed_actions',private.supplier_order_actions((v->>'id')::uuid))),'[]')) into result from jsonb_array_elements(result->'rows')v;
 when 'tenders_mine' then
 with base as materialized(select t.* from public.open_tenders t where exists(select 1 from public.tender_bids b where b.tender_id=t.id and b.business_id=bid) and (filters->>'category' is null or t.category_id=(filters->>'category')::uuid) and (search_value='' or t.title ilike '%'||search_value||'%')),
 paged as(select * from base order by created_at desc,id desc limit 25 offset(page_num-1)*25)
 select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg(to_jsonb(p)-'buyer_id'-'moderation_note' order by created_at desc,id desc) from paged p),'[]')) into result;
 when 'export' then
 if(select count(*) from public.products where business_id=bid)>500 then raise exception 'Exports support at most 500 products' using errcode='22023';end if;
 select coalesce(jsonb_agg((to_jsonb(p)-'search_vector'-'moderation_note')||jsonb_build_object('category_slug',c.slug,'tiers',coalesce((select jsonb_agg(jsonb_build_object('min_quantity',min_quantity,'price',price) order by min_quantity) from public.product_price_tiers where product_id=p.id),'[]')) order by p.created_at,p.id),'[]') into result from public.products p join public.categories c on c.id=p.category_id where p.business_id=bid;
 else raise exception 'Unknown read operation' using errcode='22023';
 end case;
 return result;
end$$;

-- Hard cap also protects existing web clients and simultaneous uploads.
create function private.supplier_product_image_limit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.products where id=new.product_id for update;
 if(select count(*) from public.product_images where product_id=new.product_id and id<>new.id)>=10 then raise exception 'Use up to 10 product images' using errcode='23514';end if;
 return new;
end$$;
create trigger supplier_product_image_limit before insert or update of product_id on public.product_images for each row execute function private.supplier_product_image_limit();

create function private.supplier_api_execute(operation text,target uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare bid uuid;b public.businesses;row_product public.products;v jsonb;result jsonb;pid uuid;cleanup_path text;row_profile public.profiles;
begin
 if operation='onboarding' then
 if not(coalesce(private.is_buyer(),false) or coalesce(private.is_supplier(),false)) then raise exception 'Buyer or supplier required' using errcode='42501';end if;
 if private.is_buyer() then perform public.register_supplier();end if;
 return jsonb_build_object('role','supplier');
 end if;
 bid=private.supplier_api_business();
 case operation
 when 'business_create' then
 if bid is not null then raise exception 'Business already exists' using errcode='23505';end if;
 if not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 insert into public.businesses(owner_id,name,name_bn,description,division,district,address,contact_phone,website)
 values(auth.uid(),payload->>'name',coalesce(payload->>'name_bn',''),coalesce(payload->>'description',''),payload->>'division',payload->>'district',coalesce(payload->>'address',''),payload->>'contact_phone',coalesce(payload->>'website','')) returning to_jsonb(businesses) into result;
 when 'business_update' then
 select * into b from public.businesses where id=bid for update;
 if b.id is null then raise exception 'Business unavailable' using errcode='P0002';end if;
 if b.updated_at is distinct from (payload->>'expected_updated_at')::timestamptz then raise exception 'Business changed. Refresh before saving' using errcode='40001';end if;
 v=to_jsonb(b)||(payload->'values');
 update public.businesses set name=v->>'name',name_bn=v->>'name_bn',description=v->>'description',division=v->>'division',district=v->>'district',address=v->>'address',contact_phone=v->>'contact_phone',website=v->>'website' where id=bid returning to_jsonb(businesses) into result;
 when 'profile_update' then
 select * into row_profile from public.profiles where id=auth.uid() for update;
 if row_profile.id is null then raise exception 'Profile unavailable' using errcode='P0002';end if;
 update public.profiles set full_name=coalesce(payload->>'full_name',full_name),phone=case when payload ? 'phone' then payload->>'phone' else phone end where id=auth.uid() returning to_jsonb(profiles) into result;
 when 'shipping' then
 perform public.shipping_preset_save(bid,(payload->>'expected_version')::int,payload->'values');result=public.shipping_preset_get();
 when 'product_create' then
 pid=public.save_product(payload-'id');result=public.supplier_api_read('product',pid);
 when 'product_update','product_archive','product_delete' then
 if not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 select * into row_product from public.products where id=target and business_id=bid for update;
 if row_product.id is null then raise exception 'Product unavailable' using errcode='P0002';end if;
 if row_product.updated_at is distinct from (payload->>'expected_updated_at')::timestamptz then raise exception 'Product changed. Refresh before saving' using errcode='40001';end if;
 if operation='product_update' then
 pid=public.save_product((to_jsonb(row_product)||(payload->'values'))||jsonb_build_object('id',target,'tiers',coalesce(payload->'values'->'tiers',(select coalesce(jsonb_agg(jsonb_build_object('min_quantity',min_quantity,'price',price)),'[]') from public.product_price_tiers where product_id=target))));
 result=public.supplier_api_read('product',pid);
 elsif operation='product_archive' then
 update public.products set status='archived' where id=target;result=public.supplier_api_read('product',target);
 else delete from public.products where id=target;result=jsonb_build_object('deleted',true);end if;
 when 'options' then
 result=public.supplier_options_save(target,(payload->>'expected_version')::int,payload->'values');
 when 'inventory' then
 if not exists(select 1 from public.product_skus s join public.products p on p.id=s.product_id where s.id=target and p.id=(payload->>'product_id')::uuid and p.business_id=bid) then raise exception 'SKU unavailable' using errcode='P0002';end if;
 perform public.supplier_inventory(target,(payload->>'expected_version')::int,(payload->>'quantity')::int);result=public.product_options((payload->>'product_id')::uuid);
 when 'quotation_response' then
 perform 1 from public.quotation_requests where id=target and business_id=bid for update;
 if not found then raise exception 'Quotation unavailable' using errcode='P0002';end if;
 insert into public.quotation_responses(request_id,price,message) values(target,(payload->>'price')::numeric,payload->>'message') returning to_jsonb(quotation_responses) into result;
 when 'offer' then result=to_jsonb(public.sourcing_offer_publish(target,(payload->>'expected_revision')::int,payload->'values'));
 when 'order_action' then
 perform 1 from public.orders where id=target and business_id=bid for update;
 if not coalesce(private.supplier_order_actions(target)?(payload->>'action'),false) then raise exception 'Order action unavailable' using errcode='40001';end if;
 result=public.order_action(target,(payload->>'expected_version')::int,payload->>'action',payload->'values');result=result||jsonb_build_object('allowed_actions',private.supplier_order_actions(target));
 when 'message' then
 if payload->>'image_id' is null then result=public.chat_send(target,payload->>'body',(payload->>'nonce')::uuid,(payload->>'product_id')::uuid);
 else result=public.chat_send_image(target,payload->>'body',(payload->>'nonce')::uuid,(payload->>'image_id')::uuid,(payload->>'product_id')::uuid);end if;
 when 'read' then perform public.chat_mark_read(target,(payload->>'message_id')::uuid);result=jsonb_build_object('read',true);
 when 'verification_start' then result=public.verification_start();
 when 'verification_step' then result=public.verification_save_step(target,(payload->>'expected_version')::int,payload->>'step',payload->'values');
 when 'verification_submit' then result=public.verification_submit(target,(payload->>'expected_version')::int,(payload->>'declaration')::boolean);
 when 'verification_remove' then
 select f.object_path into cleanup_path from public.verification_files f join public.verification_applications a on a.id=f.application_id where f.id=(payload->>'file_id')::uuid and a.id=target and a.business_id=bid;
 result=public.verification_remove_file(target,(payload->>'expected_version')::int,(payload->>'file_id')::uuid);
 if cleanup_path is not null and split_part(cleanup_path,'/',2)=target::text and not exists(select 1 from public.verification_files where object_path=cleanup_path) then
 result=result||jsonb_build_object('_cleanup',jsonb_build_object('bucket','business-documents','path',cleanup_path));end if;
 when 'warning_response' then perform public.supplier_warning_respond(target,(payload->>'expected_version')::int,payload->>'response');result=jsonb_build_object('submitted',true);
 when 'review_reply' then perform public.review_reply(target,(payload->>'expected_version')::int,payload->>'body');result=jsonb_build_object('submitted',true);
 when 'tender_bid' then result=to_jsonb(public.tender_bid_save(target,(payload->>'expected_version')::int,payload->'values'));
 when 'import' then result=to_jsonb(public.supplier_bulk_products(payload->'products'));
 when 'notification_read' then perform public.mark_notification(target,(payload->>'is_read')::boolean);result=jsonb_build_object('updated',true);
 when 'notifications_read' then perform public.mark_all_notifications_read();result=jsonb_build_object('updated',true);
 else raise exception 'Unknown command' using errcode='22023';
 end case;
 return result;
end$$;

-- A failed business operation rolls back its replay record and limiter counters too.
create function public.supplier_api_command(operation text,target uuid,payload jsonb,idempotency_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cached private.supplier_api_replays;hash text;result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if operation<>'onboarding' then perform private.supplier_api_business();end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>2097152 or operation is null or length(operation)>60 or idempotency_key is null or length(idempotency_key) not between 8 and 200 then raise exception 'Valid command and Idempotency-Key required' using errcode='22023';end if;
 hash=encode(sha256(convert_to(jsonb_build_object('target',target,'payload',payload)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||operation||':'||idempotency_key,24001));
 select * into cached from private.supplier_api_replays where actor=auth.uid() and supplier_api_replays.operation=supplier_api_command.operation and key=idempotency_key;
 if cached.expires_at>now() then
 if cached.fingerprint<>hash then raise exception 'Idempotency key reused with different input' using errcode='40001';end if;
 return cached.response;
 end if;
 perform private.consume_limit('supplier_api_command',120,60);
 result=private.supplier_api_execute(operation,target,payload);
 insert into private.supplier_api_replays(actor,operation,key,fingerprint,response) values(auth.uid(),operation,idempotency_key,hash,result)
 on conflict on constraint supplier_api_replays_pkey do update set fingerprint=excluded.fingerprint,response=excluded.response,expires_at=now()+interval '24 hours';
 -- Bounded, per-actor cleanup; scheduled retention is installed separately below.
 delete from private.supplier_api_replays where actor=auth.uid() and expires_at<=now();
 return result;
end$$;
revoke all on function private.supplier_api_business(),private.supplier_order_actions(uuid),private.supplier_api_execute(text,uuid,jsonb),private.supplier_product_image_limit() from public,anon,authenticated;
revoke all on function public.supplier_api_read(text,uuid,jsonb),public.supplier_api_command(text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.supplier_api_read(text,uuid,jsonb),public.supplier_api_command(text,uuid,jsonb,text) to authenticated;
-- Existing hosted project uses pg_cron. Do not make local/other cloud installs depend on it.
do $$begin if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('supplier-api-replay-retention','17 * * * *',$job$delete from private.supplier_api_replays where expires_at<=now();$job$);
 end if;end$$;
