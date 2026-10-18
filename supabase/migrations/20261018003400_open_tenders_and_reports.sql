-- Moderated open tenders; bids remain sealed between the bidder and buyer.
create table public.open_tenders(id uuid primary key default gen_random_uuid(),buyer_id uuid not null references public.profiles,category_id uuid not null references public.categories,title text not null check(length(trim(title)) between 5 and 200),requirements text not null check(length(trim(requirements)) between 20 and 5000),quantity int not null check(quantity between 1 and 1000000),unit text not null check(length(unit) between 1 and 30),district text not null check(length(district) between 2 and 80),delivery_date date not null,expires_at timestamptz not null,status text not null default 'open' check(status in('open','closed','awarded')),moderation text not null default 'pending' check(moderation in('pending','approved','rejected')),moderation_note text not null default '',version int not null default 1,created_at timestamptz not null default now());
create table public.tender_bids(id uuid primary key default gen_random_uuid(),tender_id uuid not null references public.open_tenders,business_id uuid not null references public.businesses,product_id uuid not null references public.products,notes text not null check(length(notes) between 5 and 3000),preparation_min int not null check(preparation_min between 0 and 365),preparation_max int not null check(preparation_max between preparation_min and 365),expires_at timestamptz not null,version int not null default 1,request_id uuid references public.sourcing_requests,offer_id uuid references public.sourcing_offers,created_at timestamptz not null default now(),unique(tender_id,business_id));
create table public.tender_bid_lines(bid_id uuid not null references public.tender_bids,sku_id uuid not null references public.product_skus,quantity int not null check(quantity between 1 and 1000000),unit_price numeric(14,2) not null check(unit_price>0),primary key(bid_id,sku_id));
create index tender_feed on public.open_tenders(moderation,status,expires_at,created_at desc);
create index tender_buyer on public.open_tenders(buyer_id,created_at desc);
alter table public.open_tenders enable row level security;alter table public.tender_bids enable row level security;alter table public.tender_bid_lines enable row level security;
-- No raw table grants; all projections and mutations use role-checked RPCs.
revoke all on public.open_tenders,public.tender_bids,public.tender_bid_lines from public,anon,authenticated;
grant all on public.open_tenders,public.tender_bids,public.tender_bid_lines to service_role;
create function public.tender_create(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare tid uuid;begin
 if auth.uid() is null or not coalesce(private.is_buyer(),false) or not coalesce(private.is_active(auth.uid()),false) then raise exception 'Active buyer required' using errcode='42501';end if;perform private.consume_limit('tender_create',10,86400);
 if (payload->>'expires_at')::timestamptz<=now() or (payload->>'expires_at')::timestamptz>now()+interval '90 days' or (payload->>'delivery_date')::date<(now() at time zone 'Asia/Dhaka')::date then raise exception 'Choose valid expiry and delivery dates';end if;
 insert into public.open_tenders(buyer_id,category_id,title,requirements,quantity,unit,district,delivery_date,expires_at) values(auth.uid(),(payload->>'category_id')::uuid,trim(payload->>'title'),trim(payload->>'requirements'),(payload->>'quantity')::int,payload->>'unit',payload->>'district',(payload->>'delivery_date')::date,(payload->>'expires_at')::timestamptz) returning id into tid;return tid;
end$$;
create function public.tender_list(view_kind text default 'open',search text default '',category uuid default null,page int default 1,page_size int default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if page is null or page_size is null or view_kind is null or page<1 or page_size not between 1 and 100 or length(search)>200 or view_kind not in('open','mine','review') then raise exception 'Invalid tender filters';end if;
 if(view_kind='mine' and (auth.uid() is null or not coalesce(private.is_buyer(),false))) or(view_kind='review' and (auth.uid() is null or not coalesce(private.is_admin(),false))) then raise exception 'Tender access denied' using errcode='42501';end if;
 return(with candidates as(select t.* from public.open_tenders t where(case view_kind when 'mine' then t.buyer_id=auth.uid() when 'review' then t.moderation='pending' else t.moderation='approved' and t.status='open' and t.expires_at>now() and private.is_active(t.buyer_id) end) and(category is null or t.category_id=category) and(t.title ilike '%'||search||'%' or t.requirements ilike '%'||search||'%')) select jsonb_build_object('total',(select count(*) from candidates),'rows',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'quantity',quantity,'unit',unit,'district',district,'delivery_date',delivery_date,'expires_at',expires_at,'status',status,'moderation',moderation,'version',version,'created_at',created_at) order by created_at desc,id) from(select * from candidates order by created_at desc,id offset (page-1)*page_size limit page_size)x),'[]')));
end$$;
create function public.tender_detail(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare t public.open_tenders;begin
 select * into t from public.open_tenders where id=target;
 if t.id is null or not(coalesce(t.buyer_id=auth.uid(),false) or coalesce(private.is_admin(),false) or(t.moderation='approved' and t.status='open' and t.expires_at>now() and private.is_active(t.buyer_id)) or exists(select 1 from public.tender_bids b where b.tender_id=t.id and private.owns_business(b.business_id))) then raise exception 'Tender unavailable' using errcode='42501';end if;
 return (to_jsonb(t)-'buyer_id'-'moderation_note')||jsonb_build_object('moderation_note',case when t.buyer_id=auth.uid() or private.is_admin() then t.moderation_note else '' end,'is_owner',coalesce(t.buyer_id=auth.uid(),false),'bids',coalesce((select jsonb_agg((to_jsonb(b)-'business_id')||jsonb_build_object('supplier_name',(select name from public.businesses where id=b.business_id),'lines',(select jsonb_agg(to_jsonb(l)-'bid_id') from public.tender_bid_lines l where bid_id=b.id)) order by b.created_at desc) from public.tender_bids b where b.tender_id=t.id and(t.buyer_id=auth.uid() or private.is_super_admin() or private.owns_business(b.business_id))),'[]'));
end$$;
create function public.tender_moderate(target uuid,expected_version int,decision text,note text) returns void language plpgsql security definer set search_path='' as $$declare t public.open_tenders;begin
 if auth.uid() is null or not coalesce(private.is_admin(),false) then raise exception 'Admin required' using errcode='42501';end if;
 select * into t from public.open_tenders where id=target for update;
 if t.id is null or t.version is distinct from expected_version then raise exception 'Tender changed. Reload before review' using errcode='40001';end if;
 if decision not in('approved','rejected') or length(trim(note)) not between 5 and 1000 then raise exception 'Provide a decision and explanatory feedback';end if;
 update public.open_tenders set moderation=decision,moderation_note=note,version=version+1 where id=target;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'tender.moderated',target,jsonb_build_object('before',t.moderation,'after',decision));
end$$;
create function public.tender_close(target uuid,expected_version int) returns void language plpgsql security definer set search_path='' as $$begin
 update public.open_tenders set status='closed',version=version+1 where id=target and buyer_id=auth.uid() and status='open' and version=expected_version;
 if not found then raise exception 'Tender unavailable or changed' using errcode='40001';end if;
end$$;
create function public.tender_bid_save(target uuid,expected_version int,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare t public.open_tenders;bid uuid;old_bid public.tender_bids;product public.products;line jsonb;total int;begin
 if auth.uid() is null or not coalesce(private.is_supplier(),false) or not coalesce(private.is_active(auth.uid()),false) then raise exception 'Active supplier required' using errcode='42501';end if;
 select id into bid from public.businesses where owner_id=auth.uid();if not private.supplier_verified(bid) then raise exception 'Current supplier verification required' using errcode='42501';end if;
 perform private.consume_limit('tender_bid',30,3600);
 select * into t from public.open_tenders where id=target for update;
 if t.id is null or t.moderation<>'approved' or t.status<>'open' or t.expires_at<=now() or not private.is_active(t.buyer_id) then raise exception 'Tender unavailable';end if;
 select * into product from public.products where id=(payload->>'product_id')::uuid and business_id=bid and status='approved';
 if product.id is null or product.category_id<>t.category_id or product.unit<>t.unit then raise exception 'Choose an approved product in the tender category and unit';end if;
 if jsonb_typeof(payload->'lines') is distinct from 'array' or jsonb_array_length(payload->'lines') not between 1 and 100 then raise exception 'Provide SKU selections';end if;
 select sum((l->>'quantity')::int) into total from jsonb_array_elements(payload->'lines')l;
 if total<t.quantity or total<product.moq or total>1000000 then raise exception 'Meet the tender quantity and product MOQ';end if;
 if (payload->>'expires_at')::timestamptz<=now() or(payload->>'expires_at')::timestamptz>now()+interval '90 days' then raise exception 'Invalid offer expiry';end if;
 select * into old_bid from public.tender_bids where tender_id=target and business_id=bid for update;
 if coalesce(old_bid.version,0)<>expected_version then raise exception 'Bid changed. Reload before saving' using errcode='40001';end if;
 insert into public.tender_bids(tender_id,business_id,product_id,notes,preparation_min,preparation_max,expires_at) values(target,bid,product.id,payload->>'notes',(payload->>'preparation_min')::int,(payload->>'preparation_max')::int,(payload->>'expires_at')::timestamptz) on conflict(tender_id,business_id) do update set product_id=excluded.product_id,notes=excluded.notes,preparation_min=excluded.preparation_min,preparation_max=excluded.preparation_max,expires_at=excluded.expires_at,version=tender_bids.version+1 returning id into bid;
 delete from public.tender_bid_lines where bid_id=bid;
 for line in select * from jsonb_array_elements(payload->'lines') loop
 if not exists(select 1 from public.product_skus where id=(line->>'sku_id')::uuid and product_id=product.id and active and stock>=(line->>'quantity')::int) then raise exception 'SKU unavailable or insufficient stock';end if;
 insert into public.tender_bid_lines values(bid,(line->>'sku_id')::uuid,(line->>'quantity')::int,(line->>'unit_price')::numeric);end loop;
 return bid;
end$$;
create function public.tender_award(target uuid,expected_version int) returns jsonb language plpgsql security definer set search_path='' as $$declare b public.tender_bids;t public.open_tenders;rid uuid;oid uuid;begin
 if auth.uid() is null or not coalesce(private.is_buyer(),false) or not coalesce(private.is_active(auth.uid()),false) then raise exception 'Active buyer required' using errcode='42501';end if;
 select t1.* into t from public.open_tenders t1 join public.tender_bids b1 on b1.tender_id=t1.id where b1.id=target and t1.buyer_id=auth.uid() for update of t1;
 select * into b from public.tender_bids where id=target for update;
 if t.id is null or b.id is null then raise exception 'Bid unavailable' using errcode='42501';end if;
 if b.offer_id is not null then return jsonb_build_object('request_id',b.request_id,'offer_id',b.offer_id);end if;
 if b.version is distinct from expected_version or t.status<>'open' or t.moderation<>'approved' or t.expires_at<=now() or b.expires_at<=now() or not private.supplier_verified(b.business_id) or not private.business_active(b.business_id) or not exists(select 1 from public.products where id=b.product_id and status='approved') then raise exception 'Bid expired or changed';end if;
 insert into public.sourcing_requests(buyer_id,product_id,business_id,kind) values(auth.uid(),b.product_id,b.business_id,'wholesale') returning id into rid;
 insert into public.sourcing_request_revisions(request_id,revision,requirements,desired_date,district,submitted_at) values(rid,1,t.requirements,t.delivery_date,t.district,now());
 insert into public.sourcing_request_lines select rid,1,sku_id,quantity from public.tender_bid_lines where bid_id=b.id;
 insert into public.sourcing_offers(request_id,request_revision,revision,preparation_min,preparation_max,notes,expires_at) values(rid,1,1,b.preparation_min,b.preparation_max,b.notes,b.expires_at) returning id into oid;
 insert into public.sourcing_offer_lines select oid,sku_id,quantity,unit_price from public.tender_bid_lines where bid_id=b.id;
 update public.tender_bids set request_id=rid,offer_id=oid where id=b.id;update public.open_tenders set status='awarded',version=version+1 where id=t.id;
 return jsonb_build_object('request_id',rid,'offer_id',oid);
end$$;
-- Financial reports are safe projections; no addresses, bank details or payment references.
create function public.admin_financial_report(from_date date,to_date date) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not coalesce(private.is_super_admin(),false) then raise exception 'Super admin required' using errcode='42501';end if;
 if from_date is null or to_date is null or to_date<from_date or to_date-from_date>366 then raise exception 'Choose up to 366 days';end if;
 if(select count(*) from public.orders where created_at>=from_date::timestamp at time zone 'Asia/Dhaka' and created_at<(to_date+1)::timestamp at time zone 'Asia/Dhaka')>5000 then raise exception 'Narrow the report dates to at most 5000 orders';end if;
 select jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.number,'created_at',o.created_at,'supplier_name',o.supplier_name,'status',o.status,'payment_method',o.payment_method,'payment_status',o.payment_status,'subtotal',o.subtotal,'shipping_fee',o.shipping_fee,'total',o.total,'confirmed_payments',(select coalesce(sum(amount),0) from public.order_payments where order_id=o.id and kind='payment_confirmed'),'confirmed_refunds',(select coalesce(sum(amount),0) from public.order_payments where order_id=o.id and kind='refund_confirmed')) order by o.created_at,o.id),'[]')) into result from public.orders o where o.created_at>=from_date::timestamp at time zone 'Asia/Dhaka' and o.created_at<(to_date+1)::timestamp at time zone 'Asia/Dhaka';
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'financial_report.generated',auth.uid(),jsonb_build_object('from',from_date,'to',to_date,'rows',jsonb_array_length(result->'rows')));return result;
end$$;
-- In-app sourcing notifications and deduplicated expiring-offer notices.
create function private.notify_sourcing_submission() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.submitted_at is not null and (TG_OP='INSERT' or old.submitted_at is null) then
 insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id)
 select b.owner_id,'quotation','New sourcing request','নতুন সোর্সিং অনুরোধ','A buyer submitted a sourcing request.','একজন ক্রেতা সোর্সিং অনুরোধ জমা দিয়েছেন।','/dashboard/requests/'||r.id,r.id from public.sourcing_requests r join public.businesses b on b.id=r.business_id where r.id=new.request_id;end if;return new;
end$$;
create trigger sourcing_submission_notice after insert or update of submitted_at on public.sourcing_request_revisions for each row execute function private.notify_sourcing_submission();
create table private.offer_reminder_log(offer_id uuid primary key references public.sourcing_offers,created_at timestamptz not null default now());
create function private.remind_expiring_offers() returns void language plpgsql security definer set search_path='' as $$declare offer record;begin
 for offer in select o.id,o.request_id,r.buyer_id from public.sourcing_offers o join public.sourcing_requests r on r.id=o.request_id where o.accepted_order_id is null and o.expires_at>now() and o.expires_at<=now()+interval '24 hours' and o.request_revision=r.revision and o.revision=(select max(revision) from public.sourcing_offers where request_id=r.id) loop
 insert into private.offer_reminder_log(offer_id) values(offer.id) on conflict do nothing;
 if found then insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id) values(offer.buyer_id,'quotation_response','Offer expires within 24 hours','অফারের মেয়াদ ২৪ ঘণ্টার মধ্যে শেষ হবে','Review your supplier offer before it expires.','মেয়াদ শেষ হওয়ার আগে সরবরাহকারীর অফার পর্যালোচনা করুন।','/dashboard/requests/'||offer.request_id,offer.id);end if;end loop;
end$$;
select cron.schedule('paikarii-offer-expiry-reminders','0 * * * *','select private.remind_expiring_offers();');
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('tender_create','tender_list','tender_detail','tender_moderate','tender_close','tender_bid_save','tender_award','admin_financial_report') loop execute format('revoke all on function %s from public,anon,authenticated',f);execute format('grant execute on function %s to authenticated',f);end loop;end$$;
grant execute on function public.tender_list(text,text,uuid,int,int),public.tender_detail(uuid) to anon;
revoke all on function private.notify_sourcing_submission(),private.remind_expiring_offers() from public,anon,authenticated;
alter table private.offer_reminder_log enable row level security;
revoke all on private.offer_reminder_log from public,anon,authenticated;
