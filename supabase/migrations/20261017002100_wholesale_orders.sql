-- Wholesale orders. Cloud only. No gateway, money movement, or destructive data changes.
create table public.cart_items (
 buyer_id uuid not null references public.profiles,
 product_id uuid not null references public.products on delete cascade,
 quantity integer not null check(quantity between 1 and 1000000),
 updated_at timestamptz not null default now(), primary key(buyer_id,product_id)
);
create table public.checkout_batches (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references public.profiles,
 nonce uuid not null, request jsonb not null, created_at timestamptz not null default now(), unique(buyer_id,nonce)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 batch_id uuid not null references public.checkout_batches,
 buyer_id uuid not null references public.profiles, business_id uuid not null references public.businesses,
 supplier_name text not null, buyer_name text not null,
 status text not null default 'pending_confirmation' check(status in('pending_confirmation','awaiting_acceptance','processing','shipped','completed','cancelled','disputed')),
 payment_method text not null check(payment_method in('cod','bank_transfer')),
 payment_status text not null default 'unpaid' check(payment_status in('unpaid','reported','paid','refund_pending','refunded')),
 subtotal numeric(16,2) not null check(subtotal>0), shipping_fee numeric(14,2) not null default 0 check(shipping_fee>=0),
 total numeric(16,2) generated always as (subtotal+shipping_fee) stored,
 shipping_address jsonb not null check(jsonb_typeof(shipping_address)='object'),
 buyer_note text not null default '' check(length(buyer_note)<=2000),
 supplier_note text not null default '' check(length(supplier_note)<=2000),
 cancellation_requested boolean not null default false,
 version integer not null default 1,
 expires_at timestamptz default now()+interval '48 hours',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 completed_at timestamptz, unique(batch_id,business_id)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders,
 product_id uuid references public.products on delete set null,
 name text not null,name_bn text not null,unit text not null,
 quantity integer not null check(quantity>0), unit_price numeric(14,2) not null check(unit_price>0),
 line_total numeric(16,2) generated always as(quantity*unit_price) stored
);
create table public.order_events (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,
 actor_id uuid references public.profiles,actor_role text not null,action text not null,
 from_status text,to_status text,note text not null default '' check(length(note)<=2000),
 created_at timestamptz not null default clock_timestamp()
);
create table public.order_shipments (
 id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.orders,
 carrier text not null check(length(carrier) between 2 and 100),
 tracking_number text not null check(length(tracking_number) between 2 and 120),
 shipped_at timestamptz not null default now()
);
create table public.order_payments (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,
 kind text not null check(kind in('payment_report','payment_confirmed','refund_confirmed')),
 amount numeric(16,2) not null check(amount>0),reference text not null check(length(reference) between 3 and 200),
 actor_id uuid not null references public.profiles,created_at timestamptz not null default now()
);
create unique index order_payment_confirmation_once on public.order_payments(order_id,kind) where kind in('payment_confirmed','refund_confirmed');
create table public.order_disputes (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,
 reason text not null check(length(reason) between 10 and 2000),previous_status text not null,
 opened_by uuid not null references public.profiles,opened_at timestamptz not null default now(),
 resolution text check(resolution in('resume','cancel','complete')),resolution_note text,
 resolved_by uuid references public.profiles,resolved_at timestamptz
);
create table public.order_returns (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders,dispute_id uuid not null unique references public.order_disputes,
 status text not null default 'authorized' check(status in('authorized','in_transit','received')),
 authorized_by uuid not null references public.profiles,authorized_at timestamptz not null default now(),
 carrier text,tracking_number text,dispatched_at timestamptz,received_at timestamptz,restocked boolean not null default false
);
create index order_returns_order on public.order_returns(order_id);
create unique index one_open_order_dispute on public.order_disputes(order_id) where resolved_at is null;
create index orders_buyer_list on public.orders(buyer_id,created_at desc,id);
create index orders_supplier_list on public.orders(business_id,created_at desc,id);
create index orders_status_list on public.orders(status,created_at desc);
create index orders_expiration on public.orders(expires_at) where expires_at is not null;
create index order_items_order on public.order_items(order_id);
create index order_items_product on public.order_items(product_id);
create index order_events_timeline on public.order_events(order_id,created_at,id);
create index order_payments_order on public.order_payments(order_id);
create index order_disputes_order on public.order_disputes(order_id);

create function private.can_read_order(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.is_buyer() or private.is_supplier() or private.is_super_admin()) and exists(select 1 from public.orders o join public.businesses b on b.id=o.business_id where o.id=target and (o.buyer_id=auth.uid() or b.owner_id=auth.uid() or private.is_super_admin()));$$;
do $$declare t text;begin
 foreach t in array array['cart_items','checkout_batches','orders','order_items','order_events','order_shipments','order_payments','order_disputes','order_returns'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;end$$;
create policy cart_owner on public.cart_items for select to authenticated using(buyer_id=auth.uid() and private.is_buyer());
create policy batch_owner on public.checkout_batches for select to authenticated using(buyer_id=auth.uid() and (private.is_buyer() or private.is_supplier()));
create policy orders_participant on public.orders for select to authenticated using(private.can_read_order(id));
do $$declare t text;begin foreach t in array array['order_items','order_events','order_shipments','order_payments','order_disputes','order_returns'] loop
 execute format('create policy order_participant on public.%I for select to authenticated using(private.can_read_order(order_id))',t);end loop;end$$;
grant execute on function private.can_read_order(uuid) to authenticated;
revoke all on function private.can_read_order(uuid) from public,anon;

-- Existing direct listing writes remain suspended-account protected. Trusted database
-- routines may adjust stock for an existing order even after a participant is suspended.
alter function private.guard_suspended_listing() security invoker;
create or replace function private.guard_suspended_listing() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if current_user not in('postgres','supabase_admin') and auth.uid() is not null and not private.is_admin() and not private.is_active(auth.uid()) then
 raise exception 'Account suspended: product management is restricted' using errcode='42501';end if;
 if TG_OP='DELETE' then return old;else return new;end if;end$$;

create function private.require_order_user() returns void language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not(private.is_buyer() or private.is_supplier() or private.is_super_admin()) then raise exception 'Order access denied' using errcode='42501';end if;end$$;
create function private.order_unit_price(target uuid,qty integer) returns numeric language sql stable security definer set search_path='' as $$
 select coalesce((select t.price from public.product_price_tiers t where t.product_id=p.id and t.min_quantity<=qty order by t.min_quantity desc limit 1),p.price) from public.products p where p.id=target;$$;
create function public.cart_set(product uuid,quantity integer) returns void language plpgsql security definer set search_path='' as $$declare p public.products;begin
 if not private.is_buyer() then raise exception 'Buyer account required' using errcode='42501';end if;
 perform private.consume_limit('cart_set',60,60);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,21));
 if quantity is null or quantity<0 or quantity>1000000 then raise exception 'Invalid order quantity';end if;
 if quantity=0 then delete from public.cart_items where buyer_id=auth.uid() and product_id=product;return;end if;
 if not private.is_active(auth.uid()) then raise exception 'Account suspended: new orders are unavailable' using errcode='42501';end if;
 select * into p from public.products where id=product;
 if p.id is null or p.status<>'approved' or not private.business_active(p.business_id) then raise exception 'Product is unavailable';end if;
 if quantity<p.moq or quantity>p.stock then raise exception 'Quantity must meet the minimum order and available stock';end if;
 if (select count(*) from public.cart_items where buyer_id=auth.uid() and product_id<>product)>=50 then raise exception 'A cart supports up to 50 products';end if;
 insert into public.cart_items values(auth.uid(),product,quantity,now()) on conflict(buyer_id,product_id) do update set quantity=excluded.quantity,updated_at=now();
end$$;
create function public.cart_quote() returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not private.is_buyer() then raise exception 'Buyer account required' using errcode='42501';end if;
 select jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object('product_id',p.id,'business_id',b.id,'supplier_name',b.name,'name',p.name,'name_bn',p.name_bn,'unit',p.unit,'quantity',c.quantity,'moq',p.moq,'stock',p.stock,'unit_price',private.order_unit_price(p.id,c.quantity),'available',p.status='approved' and private.business_active(b.id) and c.quantity>=p.moq and c.quantity<=p.stock) order by b.id,p.id),'[]')) into result
 from public.cart_items c join public.products p on p.id=c.product_id join public.businesses b on b.id=p.business_id where c.buyer_id=auth.uid();return result;
end$$;
create function private.validate_order_address(a jsonb) returns void language plpgsql immutable set search_path='' as $$begin
 if a is null or jsonb_typeof(a)<>'object' or length(coalesce(a->>'name','')) not between 2 and 120 or coalesce(a->>'phone','') !~ '^(\+?8801[3-9][0-9]{8}|01[3-9][0-9]{8})$'
 or length(coalesce(a->>'address','')) not between 10 and 500 or length(coalesce(a->>'district','')) not between 2 and 80 or a->>'division' not in('Dhaka','Chattogram','Rajshahi','Khulna','Barishal','Sylhet','Rangpur','Mymensingh') then raise exception 'Complete a valid Bangladesh delivery address and mobile number';end if;
 if not ('{"Dhaka": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"], "Chattogram": ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox’s Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"], "Rajshahi": ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"], "Khulna": ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"], "Barishal": ["Barguna", "Barishal", "Bhola", "Jhalokathi", "Patuakhali", "Pirojpur"], "Sylhet": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"], "Rangpur": ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"], "Mymensingh": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"]}'::jsonb->(a->>'division') ? (a->>'district')) or a->>'division' is null or octet_length(a::text)>2000 then raise exception 'Invalid delivery address';end if;
end$$;
create function private.order_event(target uuid,event text,old_status text,new_status text,message text default '') returns void language plpgsql security definer set search_path='' as $$begin
 insert into public.order_events(order_id,actor_id,actor_role,action,from_status,to_status,note) values(target,auth.uid(),coalesce((select role from public.user_roles where user_id=auth.uid()),'system'),event,old_status,new_status,message);
 insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id,actor_id)
 select recipient,'order_update','Order updated','অর্ডার আপডেট হয়েছে','Open your order for its latest status and next steps.','সর্বশেষ অবস্থা ও পরবর্তী ধাপ দেখতে অর্ডার খুলুন।','/dashboard/orders/'||target,target,auth.uid()
 from (select o.buyer_id recipient from public.orders o where o.id=target union select b.owner_id from public.orders o join public.businesses b on b.id=o.business_id where o.id=target) recipients where recipient is distinct from auth.uid();
 if event in('report_payment','dispute') or exists(select 1 from public.orders where id=target and payment_status='refund_pending') then
 insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id,actor_id)
 select user_id,'order_update','Order review required','অর্ডার পর্যালোচনা প্রয়োজন','An order requires payment, dispute, or refund review.','একটি অর্ডারের পেমেন্ট, বিরোধ বা ফেরত পর্যালোচনা করুন।','/admin/orders/'||target,target,auth.uid() from public.user_roles where role='super_admin' and user_id is distinct from auth.uid();end if;
end$$;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in('product_review','verification_review','account_status','staff_access','quotation','quotation_response','onboarding_reminder','supplier_warning','verification_renewal','order_update'));
create function public.order_checkout(nonce uuid,address jsonb,method text,note text,expected jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare batch public.checkout_batches;line_record record;bid uuid;oid uuid;subtotal numeric;request_value jsonb;rows_value jsonb;result jsonb;
begin
 if not private.is_buyer() or not private.is_active(auth.uid()) then raise exception 'Active buyer account required' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verify your email before placing an order';end if;
 perform private.validate_order_address(address);
 if nonce is null or method is null or method not in('cod','bank_transfer') or note is null or length(note)>2000 or expected is null or jsonb_typeof(expected)<>'array' or octet_length(expected::text)>20000 then raise exception 'Invalid checkout';end if;
 request_value=jsonb_build_object('address',jsonb_build_object('name',trim(address->>'name'),'phone',address->>'phone','address',trim(address->>'address'),'district',address->>'district','division',address->>'division'),'method',method,'note',trim(note),'expected',expected);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,21));
 select * into batch from public.checkout_batches where buyer_id=auth.uid() and checkout_batches.nonce=order_checkout.nonce;
 if batch.id is not null then
 if batch.request<>request_value then raise exception 'Checkout retry does not match the original request';end if;
 return (select jsonb_build_object('ids',jsonb_agg(id order by id)) from public.orders where batch_id=batch.id);end if;
 perform private.consume_limit('order_checkout',10,60);
 if not exists(select 1 from public.cart_items where buyer_id=auth.uid()) then raise exception 'Your cart is empty';end if;
 if (select count(distinct p.business_id) from public.cart_items c join public.products p on p.id=c.product_id where c.buyer_id=auth.uid())>10 then raise exception 'Checkout supports up to 10 suppliers';end if;
 -- Deterministic locks protect the last available units from simultaneous checkouts.
 perform p.id from public.products p join public.cart_items c on c.product_id=p.id where c.buyer_id=auth.uid() order by p.id for update of p;
 perform s.user_id from public.account_statuses s where s.user_id=auth.uid() or s.user_id in(select b.owner_id from public.cart_items c join public.products p on p.id=c.product_id join public.businesses b on b.id=p.business_id where c.buyer_id=auth.uid()) order by s.user_id for share;
 if not private.is_active(auth.uid()) then raise exception 'Active buyer account required' using errcode='42501';end if;
 -- Tier mutations through save_product serialize on the product row. Lock tier rows too.
 perform t.id from public.product_price_tiers t join public.cart_items c on c.product_id=t.product_id where c.buyer_id=auth.uid() order by t.id for share of t;
 rows_value=public.cart_quote()->'rows';
 if exists(select 1 from jsonb_array_elements(rows_value) r where not(r->>'available')::boolean) then raise exception 'A product is unavailable or its quantity no longer meets stock or MOQ';end if;
 if expected<>(select jsonb_agg(jsonb_build_object('product_id',r->>'product_id','quantity',(r->>'quantity')::integer,'unit_price',(r->>'unit_price')::numeric) order by r->>'product_id') from jsonb_array_elements(rows_value) r) then raise exception 'Prices or quantities changed. Refresh your cart before placing the order';end if;
 insert into public.checkout_batches(buyer_id,nonce,request) values(auth.uid(),nonce,request_value) returning * into batch;
 for bid in select distinct (r->>'business_id')::uuid from jsonb_array_elements(rows_value) r loop
 select sum((r->>'quantity')::integer*(r->>'unit_price')::numeric) into subtotal from jsonb_array_elements(rows_value) r where (r->>'business_id')::uuid=bid;
 if subtotal>99999999999999.99 then raise exception 'Order value exceeds the supported maximum';end if;
 insert into public.orders(batch_id,buyer_id,business_id,supplier_name,buyer_name,payment_method,subtotal,shipping_address,buyer_note)
 select batch.id,auth.uid(),bid,b.name,p.full_name,method,subtotal,request_value->'address',trim(note) from public.businesses b,public.profiles p where b.id=bid and p.id=auth.uid() returning id into oid;
 for line_record in select r from jsonb_array_elements(rows_value) r where (r->>'business_id')::uuid=bid loop
 insert into public.order_items(order_id,product_id,name,name_bn,unit,quantity,unit_price) values(oid,(line_record.r->>'product_id')::uuid,line_record.r->>'name',line_record.r->>'name_bn',line_record.r->>'unit',(line_record.r->>'quantity')::integer,(line_record.r->>'unit_price')::numeric);
 update public.products set stock=stock-(line_record.r->>'quantity')::integer where id=(line_record.r->>'product_id')::uuid;
 end loop;
 perform private.order_event(oid,'placed',null,'pending_confirmation');
 end loop;
 delete from public.cart_items where buyer_id=auth.uid();
 select jsonb_build_object('ids',jsonb_agg(id order by id)) into result from public.orders where batch_id=batch.id;return result;
end$$;
create function public.order_detail(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 perform private.require_order_user();
 if not private.can_read_order(target) then raise exception 'Order unavailable' using errcode='42501';end if;
 select to_jsonb(o)-'batch_id'||jsonb_build_object('items',coalesce((select jsonb_agg(i order by i.id) from public.order_items i where i.order_id=o.id),'[]'),
 'events',coalesce((select jsonb_agg(e order by e.created_at,e.id) from public.order_events e where e.order_id=o.id),'[]'),
 'shipments',coalesce((select jsonb_agg(s) from public.order_shipments s where s.order_id=o.id),'[]'),
 'payments',coalesce((select jsonb_agg(p order by p.created_at,p.id) from public.order_payments p where p.order_id=o.id),'[]'),
 'disputes',coalesce((select jsonb_agg(d order by d.opened_at,d.id) from public.order_disputes d where d.order_id=o.id),'[]'),'returns',coalesce((select jsonb_agg(r order by r.authorized_at,r.id) from public.order_returns r where r.order_id=o.id),'[]')) into result from public.orders o where o.id=target;return result;
end$$;
create function public.order_list(search text default '',state text default '',page integer default 1,page_size integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 perform private.require_order_user();
 if page is null or page<1 or page>100000 or page_size is null or page_size<1 or page_size>100 or search is null or length(search)>200 or state is null or length(state)>60 then raise exception 'Invalid order filters';end if;
 with accessible as materialized(select o.id,o.number,o.supplier_name,o.buyer_name,o.status,o.payment_status,o.payment_method,o.total,o.created_at,o.updated_at,o.cancellation_requested from public.orders o join public.businesses b on b.id=o.business_id
 where (o.buyer_id=auth.uid() or b.owner_id=auth.uid() or private.is_super_admin())),
 base as materialized(select * from accessible o where (state='' or o.status=state or o.payment_status=state) and (search='' or concat_ws(' ',o.number::text,o.supplier_name,o.buyer_name) ilike '%'||search||'%')),
 paged as(select * from base order by created_at desc,id desc limit page_size offset(page-1)*page_size)
 select jsonb_build_object('total',(select count(*) from base),'rows',coalesce((select jsonb_agg(paged order by created_at desc,id desc) from paged),'[]'),'counts',jsonb_build_object('open',(select count(*) from accessible o where o.status in('pending_confirmation','awaiting_acceptance','processing','shipped')),'disputed',(select count(*) from accessible o where o.status='disputed'),'refund_pending',(select count(*) from accessible o where o.payment_status='refund_pending'))) into result;return result;
end$$;
create function private.release_order_stock(target uuid) returns void language plpgsql security definer set search_path='' as $$declare i record;begin
 for i in select product_id,quantity from public.order_items where order_id=target and product_id is not null order by product_id loop update public.products set stock=stock+i.quantity where id=i.product_id;end loop;
end$$;
create function public.order_action(target uuid,expected_version integer,action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders;previous text;is_buyer boolean;is_seller boolean;is_owner boolean;message text;reference_value text;d public.order_disputes;fee numeric;before_value jsonb;return_record public.order_returns;
begin
 perform private.require_order_user();
 select * into o from public.orders where id=target for update;
 if o.id is null or not private.can_read_order(target) then raise exception 'Order unavailable' using errcode='42501';end if;
 if expected_version is distinct from o.version then raise exception 'Order changed. Refresh before trying again' using errcode='40001';end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>6000 then raise exception 'Invalid order action';end if;
 before_value=jsonb_build_object('status',o.status,'payment_status',o.payment_status,'shipping_fee',o.shipping_fee,'version',o.version,'cancellation_requested',o.cancellation_requested);
 is_buyer=o.buyer_id=auth.uid();is_seller=private.owns_business(o.business_id);is_owner=private.is_super_admin();previous=o.status;message=trim(coalesce(payload->>'note',''));reference_value=trim(coalesce(payload->>'reference',''));
 if length(message)>2000 then raise exception 'Use at most 2000 characters';end if;
 if action in('cancel','request_cancel','decline_cancel','authorize_return','return_received','dispute','resolve_cancel','resolve_resume','resolve_complete') and length(message)<10 then raise exception 'Explain the reason in at least 10 characters';end if;
 if action='confirm' and is_seller and o.status='pending_confirmation' then
 fee=(payload->>'shipping_fee')::numeric;
 if fee is null or fee<0 or fee>1000000 or fee<>round(fee,2) then raise exception 'Enter a valid delivery charge';end if;
 if o.expires_at<=now() then raise exception 'Order confirmation period expired';end if;
 o.shipping_fee=fee;o.supplier_note=message;o.status='awaiting_acceptance';o.expires_at=now()+interval '48 hours';
 elsif action='accept' and is_buyer and o.status='awaiting_acceptance' then
 if o.expires_at<=now() then raise exception 'Order acceptance period expired';end if;
 o.status='processing';o.expires_at=null;
 elsif action='cancel' and ((is_buyer and o.status in('pending_confirmation','awaiting_acceptance')) or (is_seller and o.status in('pending_confirmation','awaiting_acceptance','processing'))) then
 o.status='cancelled';o.expires_at=null;o.cancellation_requested=false;
 perform private.release_order_stock(target);
 if o.payment_status='paid' then o.payment_status='refund_pending';end if;
 elsif action='request_cancel' and is_buyer and o.status='processing' and not o.cancellation_requested then
 o.cancellation_requested=true;
 elsif action='decline_cancel' and is_seller and o.status='processing' and o.cancellation_requested then
 o.cancellation_requested=false;
 elsif action='ship' and is_seller and o.status='processing' and not o.cancellation_requested then
 if o.payment_method='bank_transfer' and o.payment_status<>'paid' then raise exception 'Bank payment must be confirmed before shipment';end if;
 if length(trim(coalesce(payload->>'carrier',''))) not between 2 and 100 or length(trim(coalesce(payload->>'tracking_number',''))) not between 2 and 120 then raise exception 'Enter the carrier and tracking reference';end if;
 insert into public.order_shipments(order_id,carrier,tracking_number) values(target,trim(payload->>'carrier'),trim(payload->>'tracking_number'));o.status='shipped';
 elsif action='receive' and is_buyer and o.status='shipped' then
 o.status='completed';o.completed_at=now();
 elsif action='report_payment' and is_buyer and o.payment_method='bank_transfer' and o.status='processing' and o.payment_status in('unpaid','reported') then
 if length(reference_value) not between 3 and 200 then raise exception 'Enter the bank payment reference';end if;
 insert into public.order_payments(order_id,kind,amount,reference,actor_id) values(target,'payment_report',o.total,reference_value,auth.uid());o.payment_status='reported';
 elsif action='confirm_payment' and is_owner and o.status in('processing','shipped','completed','disputed','cancelled') and o.payment_status in('unpaid','reported') then
 if length(reference_value) not between 3 and 200 then raise exception 'Enter the externally verified payment reference';end if;
 insert into public.order_payments(order_id,kind,amount,reference,actor_id) values(target,'payment_confirmed',o.total,reference_value,auth.uid());o.payment_status=case when o.status='cancelled' then 'refund_pending' else 'paid' end;
 elsif action='confirm_refund' and is_owner and o.status='cancelled' and o.payment_status='refund_pending' then
 if length(reference_value) not between 3 and 200 then raise exception 'Enter the externally completed refund reference';end if;
 insert into public.order_payments(order_id,kind,amount,reference,actor_id) values(target,'refund_confirmed',o.total,reference_value,auth.uid());o.payment_status='refunded';
 elsif action='dispute' and is_buyer and o.status in('processing','shipped','completed') then
 if o.completed_at<now()-interval '30 days' then raise exception 'The 30-day dispute period has ended';end if;
 insert into public.order_disputes(order_id,reason,previous_status,opened_by) values(target,message,o.status,auth.uid());o.status='disputed';
 elsif action='authorize_return' and is_owner and o.status='disputed' then
 select * into d from public.order_disputes where order_id=target and resolved_at is null;
 if d.id is null or d.previous_status not in('shipped','completed') or exists(select 1 from public.order_returns where order_id=target) then raise exception 'Only shipped goods can be returned';end if;
 insert into public.order_returns(order_id,dispute_id,authorized_by) values(target,d.id,auth.uid());
 elsif action='return_ship' and is_buyer and o.status='disputed' then
 select r.* into return_record from public.order_returns r join public.order_disputes active_dispute on active_dispute.id=r.dispute_id where r.order_id=target and active_dispute.resolved_at is null for update of r;
 if return_record.id is null or return_record.status<>'authorized' then raise exception 'An authorized return is required';end if;
 if length(trim(coalesce(payload->>'carrier',''))) not between 2 and 100 or length(trim(coalesce(payload->>'tracking_number',''))) not between 2 and 120 then raise exception 'Enter the carrier and tracking reference';end if;
 update public.order_returns set status='in_transit',carrier=trim(payload->>'carrier'),tracking_number=trim(payload->>'tracking_number'),dispatched_at=now() where id=return_record.id;
 elsif action='return_received' and is_seller and o.status='disputed' then
 select r.* into return_record from public.order_returns r join public.order_disputes active_dispute on active_dispute.id=r.dispute_id where r.order_id=target and active_dispute.resolved_at is null for update of r;
 if return_record.id is null or return_record.status<>'in_transit' then raise exception 'Return shipment is not awaiting receipt';end if;
 if coalesce((payload->>'restock')::boolean,false) then perform private.release_order_stock(target);end if;
 update public.order_returns set status='received',received_at=now(),restocked=coalesce((payload->>'restock')::boolean,false) where id=return_record.id;
 elsif action in('resolve_cancel','resolve_resume','resolve_complete') and is_owner and o.status='disputed' then
 select * into d from public.order_disputes where order_id=target and resolved_at is null for update;
 if d.id is null then raise exception 'Open dispute not found';end if;
 if exists(select 1 from public.order_returns r where r.dispute_id=d.id and r.status<>'received') then raise exception 'Wait until the authorized return is received before resolving the dispute';end if;
 if action='resolve_cancel' then
 o.status='cancelled';o.cancellation_requested=false;
 if d.previous_status='processing' then perform private.release_order_stock(target);end if;
 if o.payment_status='paid' then o.payment_status='refund_pending';end if;
 elsif action='resolve_resume' then o.status=d.previous_status;
 else
 if d.previous_status not in('shipped','completed') then raise exception 'Only shipped orders can be resolved as delivered';end if;
 o.status='completed';o.completed_at=coalesce(o.completed_at,now());end if;
 update public.order_disputes set resolution=case action when 'resolve_cancel' then 'cancel' when 'resolve_resume' then 'resume' else 'complete' end,resolution_note=message,resolved_by=auth.uid(),resolved_at=now() where id=d.id;
 elsif action='note' and length(message)>=2 then null;
 else raise exception 'This action is not allowed for your account or the current order state' using errcode='42501';end if;
 perform private.consume_limit('order_action',30,60);
 update public.orders set status=o.status,payment_status=o.payment_status,shipping_fee=o.shipping_fee,supplier_note=o.supplier_note,cancellation_requested=o.cancellation_requested,expires_at=o.expires_at,completed_at=o.completed_at,updated_at=now(),version=version+1 where id=target;
 perform private.order_event(target,action,previous,o.status,message);
 if is_owner then insert into public.admin_audit_logs(admin_id,action,entity_id,details) select auth.uid(),'order.'||action,target,jsonb_build_object('before',before_value,'after',jsonb_build_object('status',x.status,'payment_status',x.payment_status,'shipping_fee',x.shipping_fee,'version',x.version,'cancellation_requested',x.cancellation_requested)) from public.orders x where x.id=target;end if;
 return public.order_detail(target);
end$$;
create function private.expire_orders() returns void language plpgsql security definer set search_path='' as $$declare o public.orders;begin
 for o in select * from public.orders where expires_at<=now() and status in('pending_confirmation','awaiting_acceptance') order by id for update skip locked loop
 perform private.release_order_stock(o.id);
 update public.orders set status='cancelled',expires_at=null,updated_at=now(),version=version+1 where id=o.id;
 perform private.order_event(o.id,'expired',o.status,'cancelled','Confirmation period expired; reserved stock released.');end loop;
end$$;
-- Explicit deny-by-default function grants.
do $$declare f record;begin
 for f in select p.oid::regprocedure sig,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in('cart_set','cart_quote','order_checkout','order_detail','order_list','order_action')) or (n.nspname='private' and p.proname in('require_order_user','order_unit_price','validate_order_address','order_event','release_order_stock','expire_orders')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 if f.nspname='public' then execute format('grant execute on function %s to authenticated',f.sig);end if;end loop;end$$;
select cron.schedule('paikari-order-expiry','*/5 * * * *',$job$select private.expire_orders();$job$);
