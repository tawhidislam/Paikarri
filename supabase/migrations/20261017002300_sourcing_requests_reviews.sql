create table public.sourcing_requests(id uuid primary key default gen_random_uuid(),buyer_id uuid not null references public.profiles,product_id uuid not null references public.products,business_id uuid not null references public.businesses,kind text not null check(kind in('wholesale','sample','customization')),revision int not null default 1,created_at timestamptz not null default now());
create table public.sourcing_request_revisions(request_id uuid not null references public.sourcing_requests,revision int not null,requirements text not null check(length(requirements)<=5000),branding text not null default '' check(length(branding)<=2000),packaging text not null default '' check(length(packaging)<=2000),specifications text not null default '' check(length(specifications)<=2000),desired_date date,district text not null default '' check(length(district)<=80),submitted_at timestamptz,version int not null default 1,primary key(request_id,revision));
create table public.sourcing_request_lines(request_id uuid not null,revision int not null,sku_id uuid not null references public.product_skus,quantity int not null check(quantity between 1 and 1000000),primary key(request_id,revision,sku_id),foreign key(request_id,revision) references public.sourcing_request_revisions);
create table public.sourcing_files(id uuid primary key default gen_random_uuid(),request_id uuid not null,revision int not null,path text not null unique,mime text not null check(mime in('image/jpeg','image/png','image/webp','application/pdf')),size int not null check(size between 1 and 10485760),verified boolean not null default false,foreign key(request_id,revision) references public.sourcing_request_revisions);
create table public.sourcing_offers(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.sourcing_requests,request_revision int not null,revision int not null,preparation_min int not null check(preparation_min between 0 and 365),preparation_max int not null check(preparation_max between preparation_min and 365),notes text not null check(length(notes)<=3000),expires_at timestamptz not null,created_at timestamptz not null default now(),accepted_order_id uuid unique references public.orders,unique(request_id,revision),foreign key(request_id,request_revision) references public.sourcing_request_revisions);
create table public.sourcing_offer_lines(offer_id uuid not null references public.sourcing_offers,sku_id uuid not null references public.product_skus,quantity int not null check(quantity between 1 and 1000000),unit_price numeric(14,2) not null check(unit_price>0),primary key(offer_id,sku_id));
alter table public.orders add column accepted_offer_id uuid unique references public.sourcing_offers;
create index sourcing_buyer on public.sourcing_requests(buyer_id,created_at desc);
create index sourcing_business on public.sourcing_requests(business_id,created_at desc);
create index sourcing_offer_request on public.sourcing_offers(request_id,revision desc);
create function private.can_read_request(target uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.sourcing_requests r where r.id=target and(r.buyer_id=auth.uid() or private.owns_business(r.business_id) or private.is_super_admin()));$$;
create function public.sourcing_draft(target uuid,expected_version int,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;rv public.sourcing_request_revisions;pid uuid;p public.products;line jsonb;begin
 if not private.is_buyer() or not private.is_active(auth.uid()) then raise exception 'Active buyer required' using errcode='42501';end if;
 perform private.consume_limit('sourcing_draft',30,60);
 if payload is null or octet_length(payload::text)>40000 or jsonb_typeof(payload->'lines') is distinct from 'array' or jsonb_array_length(payload->'lines') not between 1 and 100 then raise exception 'Invalid request selections';end if;
 if target is null then
 pid=(payload->>'product_id')::uuid;select * into p from public.products where id=pid for share;
 if p.id is null or p.status<>'approved' or not private.business_active(p.business_id) then raise exception 'Product unavailable';end if;
 insert into public.sourcing_requests(buyer_id,product_id,business_id,kind) values(auth.uid(),pid,p.business_id,payload->>'kind') returning * into r;
 else select * into r from public.sourcing_requests where id=target and buyer_id=auth.uid() for update;
 if r.id is null then raise exception 'Request unavailable' using errcode='42501';end if;
 select * into rv from public.sourcing_request_revisions where request_id=r.id and revision=r.revision for update;
 if expected_version is distinct from rv.version then raise exception 'Draft changed. Reload before saving' using errcode='40001';end if;
 if exists(select 1 from public.sourcing_offers where request_id=r.id and accepted_order_id is not null) then raise exception 'Accepted requests cannot be revised';end if;
 if rv.submitted_at is not null then r.revision=r.revision+1;update public.sourcing_requests set revision=r.revision where id=r.id;end if;end if;
 insert into public.sourcing_request_revisions(request_id,revision,requirements,branding,packaging,specifications,desired_date,district)
 values(r.id,r.revision,trim(payload->>'requirements'),coalesce(payload->>'branding',''),coalesce(payload->>'packaging',''),coalesce(payload->>'specifications',''),(payload->>'desired_date')::date,coalesce(payload->>'district',''))
 on conflict(request_id,revision) do update set requirements=excluded.requirements,branding=excluded.branding,packaging=excluded.packaging,specifications=excluded.specifications,desired_date=excluded.desired_date,district=excluded.district,version=sourcing_request_revisions.version+1;
 delete from public.sourcing_request_lines where request_id=r.id and revision=r.revision;
 for line in select * from jsonb_array_elements(payload->'lines') loop
 if not exists(select 1 from public.product_skus where id=(line->>'sku_id')::uuid and product_id=r.product_id and active) then raise exception 'SKU unavailable';end if;
 insert into public.sourcing_request_lines values(r.id,r.revision,(line->>'sku_id')::uuid,(line->>'quantity')::int);end loop;
 return r.id;
end$$;
create function public.sourcing_submit(target uuid,expected_version int) returns void language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;v public.sourcing_request_revisions;s public.product_sourcing;p public.products;qty int;begin
 if not private.is_buyer() or not private.is_active(auth.uid()) then raise exception 'Active buyer required' using errcode='42501';end if;
 select * into r from public.sourcing_requests where id=target and buyer_id=auth.uid() for update;
 if r.id is null then raise exception 'Request unavailable' using errcode='42501';end if;
 select * into v from public.sourcing_request_revisions where request_id=target and revision=r.revision for update;
 if v.version is distinct from expected_version or v.submitted_at is not null then raise exception 'Draft changed or already submitted' using errcode='40001';end if;
 select * into p from public.products where id=r.product_id for share;select * into s from public.product_sourcing where product_id=p.id;
 if p.status<>'approved' or not private.business_active(p.business_id) then raise exception 'Product unavailable';end if;
 select sum(quantity) into qty from public.sourcing_request_lines where request_id=target and revision=r.revision;
 if qty is null or length(trim(v.requirements))<10 or v.district='' or(v.desired_date is not null and v.desired_date<(now() at time zone 'Asia/Dhaka')::date) then raise exception 'Complete requirements, delivery district and valid timing';end if;
 if(r.kind='sample' and(not s.samples_enabled or qty>s.sample_limit)) or(r.kind='customization' and(not s.customization_enabled or qty<greatest(p.moq,s.customization_moq))) or(r.kind='wholesale' and qty<p.moq) then raise exception 'Request quantity or availability does not meet supplier requirements';end if;
 if exists(select 1 from public.sourcing_files where request_id=target and revision=r.revision and not verified) then raise exception 'Finish validating attachments first';end if;
 update public.sourcing_request_revisions set submitted_at=now(),version=version+1 where request_id=target and revision=r.revision;
end$$;
create function public.sourcing_file_prepare(target uuid,mime text,size int) returns jsonb language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;fid uuid;path_value text;begin
 perform private.consume_limit('sourcing_upload',20,3600);
 select * into r from public.sourcing_requests where id=target and buyer_id=auth.uid() for update;
 if r.id is null or not private.is_active(auth.uid()) or r.kind<>'customization' or not exists(select 1 from public.sourcing_request_revisions where request_id=target and revision=r.revision and submitted_at is null) then raise exception 'Editable customization draft required' using errcode='42501';end if;
 if(select count(*) from public.sourcing_files where request_id=target and revision=r.revision)>=5 then raise exception 'At most five attachments';end if;
 fid=gen_random_uuid();path_value=auth.uid()||'/'||target||'/'||r.revision||'/'||fid;
 insert into public.sourcing_files(id,request_id,revision,path,mime,size) values(fid,target,r.revision,path_value,mime,size);
 return jsonb_build_object('id',fid,'path',path_value);
end$$;
create function public.sourcing_file_finalize(target uuid,actor uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.sourcing_files f set verified=true from public.sourcing_requests r,public.sourcing_request_revisions v where f.id=target and r.id=f.request_id and r.buyer_id=actor and v.request_id=r.id and v.revision=f.revision and v.submitted_at is null;
 if not found then raise exception 'Attachment unavailable';end if;
end$$;
create function public.sourcing_file_remove(target uuid) returns void language plpgsql security definer set search_path='' as $$begin
 delete from public.sourcing_files f using public.sourcing_requests r,public.sourcing_request_revisions v where f.id=target and r.id=f.request_id and r.buyer_id=auth.uid() and v.request_id=r.id and v.revision=f.revision and v.submitted_at is null;
 if not found then raise exception 'Editable attachment required' using errcode='42501';end if;
end$$;
create function public.sourcing_file_access(target uuid) returns text language plpgsql security definer set search_path='' as $$declare f public.sourcing_files;begin
 select * into f from public.sourcing_files where id=target;
 if f.id is null or not private.can_read_request(f.request_id) then raise exception 'Attachment unavailable' using errcode='42501';end if;
 if private.is_super_admin() then insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'sourcing_file.opened',target,'{}');end if;
 return f.path;
end$$;
create function public.sourcing_offer_publish(target uuid,expected_revision int,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;oid uuid;line jsonb;next_revision int;begin
 select * into r from public.sourcing_requests where id=target and private.owns_business(business_id) for update;
 if r.id is null or not private.is_supplier() or not private.is_active(auth.uid()) then raise exception 'Active owning supplier required' using errcode='42501';end if;
 if r.revision<>expected_revision or not exists(select 1 from public.sourcing_request_revisions where request_id=target and revision=r.revision and submitted_at is not null) then raise exception 'Request revision changed' using errcode='40001';end if;
 if exists(select 1 from public.sourcing_offers where request_id=target and accepted_order_id is not null) then raise exception 'An offer was already accepted';end if;
 if payload is null or octet_length(payload::text)>40000 or jsonb_typeof(payload->'lines') is distinct from 'array' or (payload->>'expires_at')::timestamptz<=now() or (payload->>'expires_at')::timestamptz>now()+interval '90 days' then raise exception 'Provide an offer expiring within 90 days';end if;
 select coalesce(max(revision),0)+1 into next_revision from public.sourcing_offers where request_id=target;
 insert into public.sourcing_offers(request_id,request_revision,revision,preparation_min,preparation_max,notes,expires_at) values(target,r.revision,next_revision,(payload->>'preparation_min')::int,(payload->>'preparation_max')::int,coalesce(payload->>'notes',''),(payload->>'expires_at')::timestamptz) returning id into oid;
 for line in select * from jsonb_array_elements(payload->'lines') loop
 if not exists(select 1 from public.sourcing_request_lines where request_id=target and revision=r.revision and sku_id=(line->>'sku_id')::uuid and quantity=(line->>'quantity')::int) then raise exception 'Offer must use requested SKU quantities';end if;
 insert into public.sourcing_offer_lines values(oid,(line->>'sku_id')::uuid,(line->>'quantity')::int,(line->>'unit_price')::numeric);end loop;
 if(select count(*) from public.sourcing_offer_lines where offer_id=oid)<>(select count(*) from public.sourcing_request_lines where request_id=target and revision=r.revision) then raise exception 'Price every requested SKU';end if;
 return oid;
end$$;
create function public.sourcing_offer_checkout(target uuid,expected_revision int,nonce uuid,address jsonb,method text,note text) returns jsonb language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;offer public.sourcing_offers;p public.products;batch public.checkout_batches;oid uuid;line record;req jsonb;begin
 if not private.is_buyer() or not private.is_active(auth.uid()) or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verified active buyer required' using errcode='42501';end if;
 perform private.validate_order_address(address);
 if method is null or method not in('cod','bank_transfer') or nonce is null or note is null or length(note)>2000 then raise exception 'Invalid checkout';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,21));
 select sr.* into r from public.sourcing_requests sr join public.sourcing_offers so on so.request_id=sr.id where so.id=target and sr.buyer_id=auth.uid() for update of sr;
 if r.id is null then raise exception 'Offer unavailable' using errcode='42501';end if;
 select * into offer from public.sourcing_offers where id=target for update;
 req=jsonb_build_object('offer_id',target,'revision',expected_revision,'address',address,'method',method,'note',note);
 select * into batch from public.checkout_batches where buyer_id=auth.uid() and checkout_batches.nonce=sourcing_offer_checkout.nonce;
 if batch.id is not null then if batch.request<>req then raise exception 'Retry differs from original checkout';end if;return(select jsonb_build_object('ids',jsonb_agg(id)) from public.orders where batch_id=batch.id);end if;
 if offer.accepted_order_id is not null or exists(select 1 from public.sourcing_offers where request_id=r.id and accepted_order_id is not null) or offer.revision<>expected_revision or offer.request_revision<>r.revision or offer.revision<>(select max(revision) from public.sourcing_offers where request_id=r.id) or offer.expires_at<=now() then raise exception 'Offer expired, revised or already accepted';end if;
 select * into p from public.products where id=r.product_id for update;
 perform user_id from public.account_statuses where user_id=auth.uid() or user_id=(select owner_id from public.businesses where id=r.business_id) order by user_id for share;
 if p.status<>'approved' or not private.business_active(p.business_id) or not private.is_active(auth.uid()) then raise exception 'Product or account unavailable';end if;
 perform s.id from public.product_skus s join public.sourcing_offer_lines l on l.sku_id=s.id where l.offer_id=target order by s.id for update of s;
 if exists(select 1 from public.sourcing_offer_lines l join public.product_skus s on s.id=l.sku_id where l.offer_id=target and(not s.active or s.product_id<>p.id or s.stock<l.quantity)) then raise exception 'SKU unavailable or insufficient stock';end if;
 insert into public.checkout_batches(buyer_id,nonce,request) values(auth.uid(),nonce,req) returning * into batch;
 insert into public.orders(batch_id,buyer_id,business_id,supplier_name,buyer_name,payment_method,subtotal,shipping_address,buyer_note,purchase_kind,accepted_offer_id)
 select batch.id,auth.uid(),p.business_id,b.name,pr.full_name,method,(select sum(quantity*unit_price) from public.sourcing_offer_lines where offer_id=target),sourcing_offer_checkout.address,sourcing_offer_checkout.note,r.kind,target from public.businesses b,public.profiles pr where b.id=p.business_id and pr.id=auth.uid() returning id into oid;
 for line in select * from public.sourcing_offer_lines where offer_id=target order by sku_id loop
 insert into public.order_items(order_id,product_id,sku_id,variant_snapshot,name,name_bn,unit,quantity,unit_price) values(oid,p.id,line.sku_id,private.sku_snapshot(line.sku_id),p.name,p.name_bn,p.unit,line.quantity,line.unit_price);
 update public.product_skus set stock=stock-line.quantity,version=version+1 where id=line.sku_id;end loop;
 update public.sourcing_offers set accepted_order_id=oid where id=target;perform private.order_event(oid,'placed',null,'pending_confirmation');return jsonb_build_object('ids',jsonb_build_array(oid));
end$$;
create function public.sourcing_list(page int default 1,page_size int default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not(private.is_buyer() or private.is_supplier() or private.is_super_admin()) then raise exception 'Request access denied' using errcode='42501';end if;
 if page is null or page<1 or page_size is null or page_size not between 1 and 100 then raise exception 'Invalid pagination';end if;
 return(with base as materialized(select r.id,r.kind,r.revision,r.created_at,p.name product_name,b.name supplier_name,pr.full_name buyer_name,v.submitted_at from public.sourcing_requests r join public.products p on p.id=r.product_id join public.businesses b on b.id=r.business_id join public.profiles pr on pr.id=r.buyer_id join public.sourcing_request_revisions v on v.request_id=r.id and v.revision=r.revision where private.can_read_request(r.id) and(r.buyer_id=auth.uid() or v.submitted_at is not null)),paged as(select * from base order by created_at desc,id limit page_size offset(page-1)*page_size)select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg(paged) from paged),'[]')));
end$$;
create function public.sourcing_detail(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;begin
 select * into r from public.sourcing_requests where id=target;
 if r.id is null or not private.can_read_request(target) or(r.buyer_id<>auth.uid() and not exists(select 1 from public.sourcing_request_revisions where request_id=target and submitted_at is not null)) then raise exception 'Request unavailable' using errcode='42501';end if;
 if private.is_super_admin() then insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'sourcing_request.opened',target,'{}');end if;
 return to_jsonb(r)||jsonb_build_object('product_name',(select name from public.products where id=r.product_id),'revisions',(select jsonb_agg(to_jsonb(v)||jsonb_build_object('lines',(select jsonb_agg(to_jsonb(l)||jsonb_build_object('options',private.sku_snapshot(l.sku_id))) from public.sourcing_request_lines l where l.request_id=target and l.revision=v.revision),'files',coalesce((select jsonb_agg(to_jsonb(f)-'path') from public.sourcing_files f where f.request_id=target and f.revision=v.revision),'[]')) order by v.revision) from public.sourcing_request_revisions v where request_id=target and(r.buyer_id=auth.uid() or submitted_at is not null)),'offers',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('lines',(select jsonb_agg(l) from public.sourcing_offer_lines l where l.offer_id=o.id)) order by revision desc) from public.sourcing_offers o where request_id=target),'[]'));
end$$;
create table public.product_reviews(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products,buyer_id uuid not null references public.profiles,order_id uuid not null references public.orders,rating int not null check(rating between 1 and 5),body text not null check(length(trim(body)) between 10 and 3000),status text not null default 'pending' check(status in('pending','approved','rejected','hidden','withdrawn')),version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(buyer_id,product_id));
create table public.review_replies(review_id uuid primary key references public.product_reviews,body text not null check(length(trim(body)) between 10 and 3000),status text not null default 'pending' check(status in('pending','approved','rejected','hidden')),version int not null default 1,updated_at timestamptz not null default now());
create table public.review_reports(id uuid primary key default gen_random_uuid(),review_id uuid not null references public.product_reviews,reporter_id uuid not null references public.profiles,reason text not null check(length(trim(reason)) between 10 and 2000),status text not null default 'pending' check(status in('pending','resolved','dismissed')),created_at timestamptz not null default now(),unique(review_id,reporter_id));
create table public.review_decisions(id uuid primary key default gen_random_uuid(),review_id uuid not null references public.product_reviews,actor_id uuid not null references public.profiles,target_kind text not null,version int not null,decision text not null,reason text not null,created_at timestamptz not null default now());
create index reviews_product on public.product_reviews(product_id,created_at desc);
create index reviews_moderation on public.product_reviews(status,updated_at);
create function private.review_eligible(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.product_reviews r join public.orders o on o.id=r.order_id where r.id=target and o.buyer_id=r.buyer_id and o.status='completed' and exists(select 1 from public.order_items i where i.order_id=o.id and i.product_id=r.product_id));$$;
create function public.review_save(product uuid,order_ref uuid,rating int,body text,expected_version int default 0) returns uuid language plpgsql security definer set search_path='' as $$declare r public.product_reviews;rid uuid;begin
 if not private.is_buyer() or not private.is_active(auth.uid()) then raise exception 'Active buyer required' using errcode='42501';end if;
 perform private.consume_limit('review_save',10,60);
 if not exists(select 1 from public.orders o join public.order_items i on i.order_id=o.id where o.id=order_ref and o.buyer_id=auth.uid() and o.status='completed' and i.product_id=product) then raise exception 'A completed purchase of this product is required' using errcode='42501';end if;
 select * into r from public.product_reviews where buyer_id=auth.uid() and product_id=product for update;
 if r.id is null then if expected_version<>0 then raise exception 'Review changed';end if;insert into public.product_reviews(product_id,buyer_id,order_id,rating,body) values(product,auth.uid(),order_ref,rating,trim(body)) returning id into rid;
 else if r.version<>expected_version then raise exception 'Review changed. Reload before editing' using errcode='40001';end if;
 update public.product_reviews set rating=review_save.rating,body=trim(review_save.body),status='pending',version=version+1,updated_at=now() where id=r.id;rid=r.id;end if;return rid;
end$$;
create function public.review_withdraw(target uuid,expected_version int) returns void language plpgsql security definer set search_path='' as $$begin
 update public.product_reviews set status='withdrawn',version=version+1,updated_at=now() where id=target and buyer_id=auth.uid() and version=expected_version;
 if not found then raise exception 'Review unavailable or changed' using errcode='42501';end if;
end$$;
create function public.review_reply(target uuid,expected_version int,body text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_supplier() or not private.is_active(auth.uid()) or not exists(select 1 from public.product_reviews r join public.products p on p.id=r.product_id where r.id=target and private.owns_business(p.business_id)) then raise exception 'Owning supplier required' using errcode='42501';end if;
 if expected_version=0 then insert into public.review_replies(review_id,body) values(target,trim(body));else update public.review_replies set body=trim(review_reply.body),status='pending',version=version+1,updated_at=now() where review_id=target and version=expected_version;
 if not found then raise exception 'Reply changed' using errcode='40001';end if;end if;
end$$;
create function public.review_report(target uuid,reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not private.is_active(auth.uid()) or not exists(select 1 from public.product_reviews r join public.products p on p.id=r.product_id where r.id=target and r.status='approved' and private.review_eligible(r.id) and p.status='approved' and private.business_active(p.business_id)) then raise exception 'Review unavailable' using errcode='42501';end if;
 perform private.consume_limit('review_report',5,60);insert into public.review_reports(review_id,reporter_id,reason) values(target,auth.uid(),trim(reason));
end$$;
create function public.product_reviews_read(target uuid,page int default 1,page_size int default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if page is null or page<1 or page_size is null or page_size not between 1 and 100 or not exists(select 1 from public.products p where p.id=target and p.status='approved' and private.business_active(p.business_id)) then raise exception 'Product unavailable';end if;
 return(with base as materialized(select r.id,r.rating,r.body,split_part(pr.full_name,' ',1) buyer_name,r.created_at,o.purchase_kind,case when reply.status='approved' then reply.body end supplier_reply from public.product_reviews r join public.profiles pr on pr.id=r.buyer_id join public.orders o on o.id=r.order_id left join public.review_replies reply on reply.review_id=r.id where r.product_id=target and r.status='approved' and private.review_eligible(r.id)),paged as(select * from base order by created_at desc,id limit page_size offset(page-1)*page_size)select jsonb_build_object('total',(select count(*) from base),'rating',(select round(avg(rating),2) from base where purchase_kind<>'sample'),'count',(select count(*) from base where purchase_kind<>'sample'),'sample_count',(select count(*) from base where purchase_kind='sample'),'rows',coalesce((select jsonb_agg(paged) from paged),'[]')));
end$$;
create function public.my_product_review(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.is_buyer() then raise exception 'Buyer required' using errcode='42501';end if;
 return jsonb_build_object('review',(select to_jsonb(r) from public.product_reviews r where r.product_id=target and r.buyer_id=auth.uid()),'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'number',o.number,'purchase_kind',o.purchase_kind)) from public.orders o where o.buyer_id=auth.uid() and o.status='completed' and exists(select 1 from public.order_items i where i.order_id=o.id and i.product_id=target)),'[]'));
end$$;
create function public.admin_reviews(page int default 1,page_size int default 25,state text default 'pending') returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if page is null or page<1 or page_size is null or page_size not between 1 and 100 or length(state)>30 then raise exception 'Invalid filters';end if;
 return(with base as materialized(select r.id,r.product_id,p.name product_name,pr.full_name buyer_name,r.rating,r.body,r.status,r.version,r.created_at,private.review_eligible(r.id) eligible,o.purchase_kind,case when reply.review_id is not null then jsonb_build_object('body',reply.body,'status',reply.status,'version',reply.version) end reply,coalesce((select jsonb_agg(jsonb_build_object('id',rr.id,'reason',rr.reason,'status',rr.status)) from public.review_reports rr where rr.review_id=r.id),'[]') reports from public.product_reviews r join public.products p on p.id=r.product_id join public.profiles pr on pr.id=r.buyer_id join public.orders o on o.id=r.order_id left join public.review_replies reply on reply.review_id=r.id where state='' or r.status=state or reply.status=state or exists(select 1 from public.review_reports rr where rr.review_id=r.id and rr.status=state)),paged as(select * from base order by created_at desc,id limit page_size offset(page-1)*page_size) select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg(paged) from paged),'[]')));
end$$;
create function public.admin_review_decide(target uuid,kind text,expected_version int,decision text,reason text) returns void language plpgsql security definer set search_path='' as $$declare r public.product_reviews;old_value jsonb;begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if decision is null or decision not in('approved','rejected','hidden','resolved','dismissed') or length(trim(coalesce(reason,''))) not between 10 and 2000 then raise exception 'A decision and explanatory reason are required';end if;
 select * into r from public.product_reviews where id=target for update;
 if r.id is null then raise exception 'Review unavailable';end if;
 if kind='review' and r.status='withdrawn' then raise exception 'Withdrawn reviews cannot be published';end if;
 if decision='approved' and not private.review_eligible(target) then raise exception 'Review is not currently eligible';end if;
 if kind='review' and decision in('approved','rejected','hidden') then old_value=jsonb_build_object('status',r.status,'version',r.version);update public.product_reviews set status=decision,version=version+1,updated_at=now() where id=target and version=expected_version;
 elsif kind='reply' and decision in('approved','rejected','hidden') then select jsonb_build_object('status',status,'version',version) into old_value from public.review_replies where review_id=target;update public.review_replies set status=decision,version=version+1,updated_at=now() where review_id=target and version=expected_version;
 elsif kind='reports' and decision in('resolved','dismissed') and expected_version=r.version then update public.review_reports set status=decision where review_id=target and status='pending';old_value='{}';
 else raise exception 'Invalid moderation action';end if;
 if not found then raise exception 'Content changed. Refresh before reviewing' using errcode='40001';end if;
 insert into public.review_decisions(review_id,actor_id,target_kind,version,decision,reason) values(target,auth.uid(),kind,expected_version,decision,trim(reason));
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'review.'||kind||'.'||decision,target,jsonb_build_object('before',old_value,'after',jsonb_build_object('status',decision),'reason',trim(reason)));
end$$;
-- RPC-only access prevents private order evidence leaking to staff moderation.
do $$declare t text;begin foreach t in array array['sourcing_requests','sourcing_request_revisions','sourcing_request_lines','sourcing_files','sourcing_offers','sourcing_offer_lines','product_reviews','review_replies','review_reports','review_decisions'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('request-attachments','request-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create function private.request_file_upload(path_value text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.sourcing_files f join public.sourcing_requests r on r.id=f.request_id join public.sourcing_request_revisions v on v.request_id=r.id and v.revision=f.revision where f.path=path_value and r.buyer_id=auth.uid() and private.is_active(auth.uid()) and v.submitted_at is null and not f.verified);$$;
create function private.request_file_read(path_value text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.sourcing_files f where f.path=path_value and private.can_read_request(f.request_id) and(not private.is_super_admin() or exists(select 1 from public.admin_audit_logs a where a.admin_id=auth.uid() and a.entity_id=f.id and a.action='sourcing_file.opened' and a.created_at>now()-interval '5 minutes')));$$;
create policy request_file_insert on storage.objects for insert to authenticated with check(bucket_id='request-attachments' and private.request_file_upload(name));
create policy request_file_select on storage.objects for select to authenticated using(bucket_id='request-attachments' and private.request_file_read(name));
-- No UPDATE/DELETE policy: uploaded evidence cannot be overwritten or removed.
alter policy audit_read on public.admin_audit_logs using(private.is_admin() and(private.is_super_admin() or(action not like 'homepage_content.%' and action not like 'verification.%' and action not like 'supplier_verifications.%' and action not like 'conversation_monitor.%' and action not like 'sourcing_file.%' and action not like 'sourcing_request.%')));
create function public.supplier_reviews(page int default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.is_supplier() or page is null or page<1 then raise exception 'Supplier required' using errcode='42501';end if;
 return(with base as materialized(select r.id,r.body,r.rating,r.status,p.name product_name,to_jsonb(reply)-'review_id' reply from public.product_reviews r join public.products p on p.id=r.product_id left join public.review_replies reply on reply.review_id=r.id where private.owns_business(p.business_id) and r.status='approved' and private.review_eligible(r.id)),paged as(select * from base order by id limit 25 offset(page-1)*25)select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg(paged) from paged),'[]')));
end$$;
create or replace function private.request_file_read(path_value text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.sourcing_files f join public.sourcing_requests r on r.id=f.request_id join public.sourcing_request_revisions v on v.request_id=r.id and v.revision=f.revision where f.path=path_value and private.can_read_request(f.request_id) and(r.buyer_id=auth.uid() or v.submitted_at is not null) and(not private.is_super_admin() or exists(select 1 from public.admin_audit_logs a where a.admin_id=auth.uid() and a.entity_id=f.id and a.action='sourcing_file.opened' and a.created_at>now()-interval '5 minutes')));$$;
-- Keep generic audit searches aligned with table policy.
do $$declare definition text;begin
 definition=pg_get_functiondef('public.admin_list(text,jsonb,integer,integer)'::regprocedure);
 if position('a.action not like ''conversation_monitor.%''' in definition)=0 then raise exception 'Existing audit privacy filter not found';end if;
 definition=replace(definition,'a.action not like ''conversation_monitor.%''','a.action not like ''conversation_monitor.%'' and a.action not like ''sourcing_file.%'' and a.action not like ''sourcing_request.%''');execute definition;
end$$;
do $$declare f record;begin for f in select p.oid::regprocedure sig,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where(n.nspname='public' and p.proname in('sourcing_draft','sourcing_submit','sourcing_file_prepare','sourcing_file_finalize','sourcing_file_remove','sourcing_file_access','sourcing_offer_publish','sourcing_offer_checkout','sourcing_list','sourcing_detail','review_save','review_withdraw','review_reply','review_report','product_reviews_read','my_product_review','admin_reviews','admin_review_decide','supplier_reviews')) or(n.nspname='private' and p.proname in('can_read_request','request_file_upload','request_file_read','review_eligible')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 if f.nspname='public' and f.proname<>'sourcing_file_finalize' then execute format('grant execute on function %s to authenticated',f.sig);end if;end loop;end$$;
grant execute on function public.product_reviews_read(uuid,int,int) to anon;
grant execute on function public.sourcing_file_finalize(uuid,uuid) to service_role;
grant execute on function private.request_file_upload(text),private.request_file_read(text) to authenticated;
