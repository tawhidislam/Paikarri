-- Additive wholesale SKU inventory. Existing stock is already net of reservations.
create table public.product_attributes(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products on delete cascade,name text not null check(length(name) between 1 and 60),position int not null check(position between 0 and 2),unique(product_id,name));
create table public.product_attribute_values(id uuid primary key default gen_random_uuid(),attribute_id uuid not null references public.product_attributes on delete cascade,value text not null check(length(value) between 1 and 80),unique(attribute_id,value));
create table public.product_skus(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products on delete cascade,code text not null check(length(code) between 1 and 80),stock int not null check(stock between 0 and 1000000000),active boolean not null default true,image_id uuid references public.product_images on delete set null,version int not null default 1,unique(product_id,code),unique(id,product_id));
create table public.sku_options(sku_id uuid not null references public.product_skus on delete cascade,value_id uuid not null references public.product_attribute_values,primary key(sku_id,value_id));
create table public.sku_prices(sku_id uuid not null references public.product_skus on delete cascade,min_quantity int not null check(min_quantity between 1 and 1000000),price numeric(14,2) not null check(price>0),primary key(sku_id,min_quantity));
create table public.product_sourcing(product_id uuid primary key references public.products on delete cascade,preparation_min int not null default 1 check(preparation_min between 0 and 365),preparation_max int not null default 7 check(preparation_max between preparation_min and 365),dispatch_location text not null default '' check(length(dispatch_location)<=200),packaging text not null default '' check(length(packaging)<=500),delivery_notes text not null default '' check(length(delivery_notes)<=2000),samples_enabled boolean not null default false,sample_limit int not null default 1 check(sample_limit between 1 and 10),customization_enabled boolean not null default false,customization_moq int not null default 1 check(customization_moq>0),estimates_updated_at timestamptz,version int not null default 1);
insert into public.product_skus(product_id,code,stock) select id,'STANDARD',stock from public.products;
insert into public.sku_prices select s.id,1,p.price from public.product_skus s join public.products p on p.id=s.product_id;
insert into public.sku_prices select s.id,t.min_quantity,t.price from public.product_skus s join public.product_price_tiers t on t.product_id=s.product_id on conflict(sku_id,min_quantity) do update set price=excluded.price;
insert into public.product_sourcing(product_id,customization_moq) select id,moq from public.products;
create table public.cart_sku_items(buyer_id uuid not null references public.profiles,product_id uuid not null references public.products on delete cascade,sku_id uuid not null,quantity int not null check(quantity between 1 and 1000000),updated_at timestamptz not null default now(),primary key(buyer_id,sku_id),foreign key(sku_id,product_id) references public.product_skus(id,product_id) on delete cascade);
insert into public.cart_sku_items select c.buyer_id,c.product_id,s.id,c.quantity,c.updated_at from public.cart_items c join public.product_skus s on s.product_id=c.product_id;
alter table public.order_items add column sku_id uuid references public.product_skus,add column variant_snapshot jsonb not null default '{}',add column inventory_released boolean not null default false;
alter table public.orders add column purchase_kind text not null default 'wholesale' check(purchase_kind in('wholesale','sample','customization'));
create function private.product_readable(target uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.products p where p.id=target and (private.owns_business(p.business_id) or private.is_admin() or(p.status='approved' and private.business_active(p.business_id))));$$;
create function private.sku_snapshot(target uuid) returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_object_agg(a.name,v.value),'{}') from public.sku_options o join public.product_attribute_values v on v.id=o.value_id join public.product_attributes a on a.id=v.attribute_id where o.sku_id=target;$$;
create function private.sku_price(target uuid,qty int) returns numeric language sql stable security definer set search_path='' as $$ select price from public.sku_prices where sku_id=target and min_quantity<=qty order by min_quantity desc limit 1;$$;
create function private.sku_sync_stock() returns trigger language plpgsql security definer set search_path='' as $$begin update public.products set stock=(select coalesce(sum(stock),0) from public.product_skus where product_id=new.product_id and active) where id=new.product_id;return new;end$$;
create trigger sku_stock_sync after insert or update of stock,active on public.product_skus for each row execute function private.sku_sync_stock();
create function private.guard_inventory_write() returns trigger language plpgsql security invoker set search_path='' as $$begin if current_user not in('postgres','supabase_admin') and new.stock is distinct from old.stock then raise exception 'Use authorized SKU inventory controls' using errcode='42501';end if;return new;end$$;
create trigger product_inventory_guard before update of stock on public.products for each row execute function private.guard_inventory_write();
create function public.product_options(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.product_readable(target) then raise exception 'Product unavailable' using errcode='42501';end if;
 return jsonb_build_object('sourcing',(select to_jsonb(s) from public.product_sourcing s where product_id=target),'attributes',coalesce((select jsonb_agg(jsonb_build_object('name',a.name,'values',(select jsonb_agg(v.value order by v.value) from public.product_attribute_values v where v.attribute_id=a.id)) order by a.position) from public.product_attributes a where a.product_id=target and exists(select 1 from public.product_attribute_values v join public.sku_options o on o.value_id=v.id join public.product_skus k on k.id=o.sku_id where v.attribute_id=a.id and k.active)),'[]'),'skus',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'code',s.code,'stock',s.stock,'active',s.active,'image_id',s.image_id,'version',s.version,'options',private.sku_snapshot(s.id),'prices',(select jsonb_agg(jsonb_build_object('min_quantity',t.min_quantity,'price',t.price) order by t.min_quantity) from public.sku_prices t where t.sku_id=s.id)) order by s.code) from public.product_skus s where s.product_id=target and(s.active or private.owns_business((select business_id from public.products where id=target)))),'[]'));
end$$;
create function public.supplier_inventory(target uuid,expected_version int,quantity int) returns void language plpgsql security definer set search_path='' as $$declare s public.product_skus;begin
 if not private.is_supplier() or not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 perform p.id from public.products p join public.product_skus k on k.product_id=p.id where k.id=target and private.owns_business(p.business_id) for update of p;
 if not found then raise exception 'SKU unavailable' using errcode='42501';end if;
 select * into s from public.product_skus where id=target for update;
 if s.version is distinct from expected_version then raise exception 'Inventory changed. Refresh before saving' using errcode='40001';end if;
 update public.product_skus set stock=quantity,version=version+1 where id=target;
end$$;
create function public.supplier_options_save(target uuid,expected_version int,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.products;source public.product_sourcing;entry jsonb;opt record;aid uuid;vid uuid;sid uuid;t jsonb;seen uuid[]='{}';names text[];version_value int;
begin
 if not private.is_supplier() or not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 select * into p from public.products where id=target and private.owns_business(business_id) for update;
 if p.id is null then raise exception 'Product unavailable' using errcode='42501';end if;
 insert into public.product_sourcing(product_id,customization_moq) values(target,p.moq) on conflict do nothing;
 select * into source from public.product_sourcing where product_id=target for update;
 if expected_version is distinct from source.version then raise exception 'Options changed. Reload before saving' using errcode='40001';end if;
 if payload is null or octet_length(payload::text)>200000 or jsonb_typeof(payload->'skus') is distinct from 'array' or jsonb_array_length(payload->'skus') not between 1 and 100 then raise exception 'Provide between one and 100 SKUs';end if;
 select array_agg(key order by key) into names from jsonb_object_keys(payload->'skus'->0->'options') key;
 if coalesce(array_length(names,1),0)>3 then raise exception 'At most three variant attributes';end if;
 -- Attributes and values persist so referenced SKU identities are never rewritten.
 for entry in select * from jsonb_array_elements(payload->'skus') loop
 if (select array_agg(key order by key) from jsonb_object_keys(entry->'options') key) is distinct from names then raise exception 'Every SKU must have the same attributes';end if;
 if entry->>'id' is not null then
 select id into sid from public.product_skus where id=(entry->>'id')::uuid and product_id=target;
 if sid is null then raise exception 'SKU unavailable';end if;
 if (entry->>'version')::int is distinct from (select version from public.product_skus where id=sid) then raise exception 'SKU inventory changed. Reload before saving' using errcode='40001';end if;
 if private.sku_snapshot(sid)<>entry->'options' or (select code from public.product_skus where id=sid)<>entry->>'code' then raise exception 'Archive an existing SKU and create a new identity instead';end if;
 else
 if exists(select 1 from public.product_skus s where s.product_id=target and private.sku_snapshot(s.id)=entry->'options' and s.active) then raise exception 'Duplicate variant combination';end if;
 insert into public.product_skus(product_id,code,stock,active,image_id) values(target,entry->>'code',(entry->>'stock')::int,coalesce((entry->>'active')::boolean,true),(entry->>'image_id')::uuid) returning id into sid;
 for opt in select key,value from jsonb_each_text(entry->'options') loop
 insert into public.product_attributes(product_id,name,position) values(target,opt.key,array_position(names,opt.key)-1) on conflict(product_id,name) do update set name=excluded.name returning id into aid;
 insert into public.product_attribute_values(attribute_id,value) values(aid,opt.value) on conflict(attribute_id,value) do update set value=excluded.value returning id into vid;
 insert into public.sku_options values(sid,vid);
 end loop;end if;
 if sid=any(seen) then raise exception 'Duplicate SKU';end if;seen=array_append(seen,sid);
 if entry->>'image_id' is not null and not exists(select 1 from public.product_images where id=(entry->>'image_id')::uuid and product_id=target) then raise exception 'Choose an image belonging to this product';end if;
 update public.product_skus set stock=(entry->>'stock')::int,active=coalesce((entry->>'active')::boolean,true),image_id=(entry->>'image_id')::uuid,version=version+1 where id=sid;
 if jsonb_typeof(entry->'prices') is distinct from 'array' then raise exception 'SKU prices required';end if;
 delete from public.sku_prices where sku_id=sid;
 for t in select * from jsonb_array_elements(entry->'prices') loop insert into public.sku_prices values(sid,(t->>'min_quantity')::int,(t->>'price')::numeric);end loop;
 if (select array_agg(min_quantity order by min_quantity) from public.sku_prices where sku_id=sid) is distinct from (select array_agg(q order by q) from(select 1 q union select min_quantity from public.product_price_tiers where product_id=target) thresholds) then raise exception 'Each SKU needs prices at every shared threshold';end if;
 end loop;
 update public.product_skus set active=false,version=version+1 where product_id=target and not(id=any(seen));
 if not exists(select 1 from public.product_skus where product_id=target and active) then raise exception 'At least one active SKU required';end if;
 update public.product_sourcing set estimates_updated_at=now(),preparation_min=(payload->'sourcing'->>'preparation_min')::int,preparation_max=(payload->'sourcing'->>'preparation_max')::int,dispatch_location=coalesce(payload->'sourcing'->>'dispatch_location',''),packaging=coalesce(payload->'sourcing'->>'packaging',''),delivery_notes=coalesce(payload->'sourcing'->>'delivery_notes',''),samples_enabled=coalesce((payload->'sourcing'->>'samples_enabled')::boolean,false),sample_limit=coalesce((payload->'sourcing'->>'sample_limit')::int,1),customization_enabled=coalesce((payload->'sourcing'->>'customization_enabled')::boolean,false),customization_moq=greatest(p.moq,coalesce((payload->'sourcing'->>'customization_moq')::int,p.moq)),version=version+1 where product_id=target returning version into version_value;
 update public.products set status='pending',price=(select min(price) from public.sku_prices t join public.product_skus s on s.id=t.sku_id where s.product_id=target and s.active) where id=target;
 return public.product_options(target);
end$$;
create function public.cart_skus_set(product uuid,selections jsonb) returns void language plpgsql security definer set search_path='' as $$declare p public.products;r jsonb;qty int;begin
 if not private.is_buyer() then raise exception 'Buyer account required' using errcode='42501';end if;
 perform private.consume_limit('cart_set',60,60);perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,21));
 if jsonb_typeof(selections) is distinct from 'array' or jsonb_array_length(selections)>100 then raise exception 'Invalid SKU selections';end if;
 if jsonb_array_length(selections)=0 then delete from public.cart_sku_items where buyer_id=auth.uid() and product_id=product;return;end if;
 if not private.is_active(auth.uid()) then raise exception 'Active buyer required' using errcode='42501';end if;
 select * into p from public.products where id=product for share;
 if p.id is null or p.status<>'approved' or not private.business_active(p.business_id) then raise exception 'Product unavailable';end if;
 select sum((x->>'quantity')::int) into qty from jsonb_array_elements(selections) x;
 if qty<p.moq or qty>1000000 then raise exception 'Combined quantity must meet product MOQ';end if;
 if (select count(*)<>count(distinct x->>'sku_id') from jsonb_array_elements(selections)x) then raise exception 'Duplicate SKU';end if;
 if(select count(distinct product_id) from public.cart_sku_items where buyer_id=auth.uid() and product_id<>product)>=50 then raise exception 'At most 50 cart products';end if;
 delete from public.cart_sku_items where buyer_id=auth.uid() and product_id=product;
 for r in select * from jsonb_array_elements(selections) loop
 if not exists(select 1 from public.product_skus where id=(r->>'sku_id')::uuid and product_id=product and active and stock>=(r->>'quantity')::int and (r->>'quantity')::int>0) then raise exception 'SKU unavailable or insufficient stock';end if;
 insert into public.cart_sku_items values(auth.uid(),product,(r->>'sku_id')::uuid,(r->>'quantity')::int,now());end loop;
end$$;
create or replace function public.cart_set(product uuid,quantity int) returns void language plpgsql security definer set search_path='' as $$declare sid uuid;begin
 if quantity=0 then perform public.cart_skus_set(product,'[]');return;end if;
 if(select count(*) from public.product_skus where product_id=product and active)<>1 or exists(select 1 from public.product_attributes where product_id=product) then raise exception 'Select variants on the product page';end if;
 select id into sid from public.product_skus where product_id=product and active;
 perform public.cart_skus_set(product,jsonb_build_array(jsonb_build_object('sku_id',sid,'quantity',quantity)));
end$$;
create or replace function public.cart_quote() returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not private.is_buyer() then raise exception 'Buyer account required' using errcode='42501';end if;
 select jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object('product_id',p.id,'sku_id',s.id,'sku_version',s.version,'variant_snapshot',private.sku_snapshot(s.id),'business_id',b.id,'supplier_name',b.name,'name',p.name,'name_bn',p.name_bn,'unit',p.unit,'quantity',c.quantity,'moq',p.moq,'stock',s.stock,'unit_price',private.sku_price(s.id,q.qty),'available',s.active and p.status='approved' and private.business_active(b.id) and q.qty>=p.moq and c.quantity<=s.stock) order by b.id,p.id,s.id),'[]')) into result
 from public.cart_sku_items c join public.products p on p.id=c.product_id join public.product_skus s on s.id=c.sku_id join public.businesses b on b.id=p.business_id join(select product_id,sum(quantity)::int qty from public.cart_sku_items where buyer_id=auth.uid() group by product_id)q on q.product_id=p.id where c.buyer_id=auth.uid();return result;
end$$;
create or replace function private.release_order_stock(target uuid) returns void language plpgsql security definer set search_path='' as $$declare i record;sid uuid;begin
 -- Caller locks the order; each frozen line is restored at most once, including legacy lines.
 perform p.id from public.products p join public.order_items oi on oi.product_id=p.id where oi.order_id=target order by p.id for update of p;
 for i in select * from public.order_items where order_id=target and product_id is not null and not inventory_released order by product_id,sku_id,id for update loop
 sid=i.sku_id;
 if sid is null then select id into sid from public.product_skus where product_id=i.product_id and code='STANDARD';end if;
 update public.product_skus set stock=stock+i.quantity,version=version+1 where id=sid;
 update public.order_items set inventory_released=true where id=i.id;end loop;
end$$;
-- Explicit per-table policies; mutation is possible only through authorized RPCs.
do $$declare t text;begin foreach t in array array['product_attributes','product_attribute_values','product_skus','sku_options','sku_prices','product_sourcing','cart_sku_items'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end$$;
create policy own_cart_skus on public.cart_sku_items for select to authenticated using(buyer_id=auth.uid() and private.is_buyer());
-- Public presentation is intentionally projected through product_options(), not raw tables.

create or replace function public.order_checkout(nonce uuid,address jsonb,method text,note text,expected jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if not exists(select 1 from public.cart_sku_items where buyer_id=auth.uid()) then raise exception 'Your cart is empty';end if;
 if (select count(distinct p.business_id) from public.cart_sku_items c join public.products p on p.id=c.product_id where c.buyer_id=auth.uid())>10 then raise exception 'Checkout supports up to 10 suppliers';end if;
 -- Deterministic locks protect the last available units from simultaneous checkouts.
 perform p.id from public.products p join public.cart_sku_items c on c.product_id=p.id where c.buyer_id=auth.uid() order by p.id for update of p;
 perform s.id from public.product_skus s join public.cart_sku_items c on c.sku_id=s.id where c.buyer_id=auth.uid() order by s.id for update of s;
 perform s.user_id from public.account_statuses s where s.user_id=auth.uid() or s.user_id in(select b.owner_id from public.cart_sku_items c join public.products p on p.id=c.product_id join public.businesses b on b.id=p.business_id where c.buyer_id=auth.uid()) order by s.user_id for share;
 if not private.is_active(auth.uid()) then raise exception 'Active buyer account required' using errcode='42501';end if;
 -- Tier mutations through save_product serialize on the product row. Lock tier rows too.
 perform t.id from public.product_price_tiers t join public.cart_sku_items c on c.product_id=t.product_id where c.buyer_id=auth.uid() order by t.id for share of t;
 rows_value=public.cart_quote()->'rows';
 if exists(select 1 from jsonb_array_elements(rows_value) r where not(r->>'available')::boolean) then raise exception 'A product is unavailable or its quantity no longer meets stock or MOQ';end if;
 if expected<>(select jsonb_agg(jsonb_build_object('product_id',r->>'product_id','sku_id',r->>'sku_id','sku_version',(r->>'sku_version')::int,'quantity',(r->>'quantity')::integer,'unit_price',(r->>'unit_price')::numeric) order by r->>'product_id',r->>'sku_id') from jsonb_array_elements(rows_value) r)
 and not (not exists(select 1 from public.cart_sku_items c join public.product_attributes a on a.product_id=c.product_id where c.buyer_id=auth.uid()) and expected=(select jsonb_agg(jsonb_build_object('product_id',r->>'product_id','quantity',(r->>'quantity')::int,'unit_price',(r->>'unit_price')::numeric) order by r->>'product_id') from jsonb_array_elements(rows_value) r)) then raise exception 'Prices or quantities changed. Refresh your cart before placing the order';end if;
 insert into public.checkout_batches(buyer_id,nonce,request) values(auth.uid(),nonce,request_value) returning * into batch;
 for bid in select distinct (r->>'business_id')::uuid from jsonb_array_elements(rows_value) r loop
 select sum((r->>'quantity')::integer*(r->>'unit_price')::numeric) into subtotal from jsonb_array_elements(rows_value) r where (r->>'business_id')::uuid=bid;
 if subtotal>99999999999999.99 then raise exception 'Order value exceeds the supported maximum';end if;
 insert into public.orders(batch_id,buyer_id,business_id,supplier_name,buyer_name,payment_method,subtotal,shipping_address,buyer_note)
 select batch.id,auth.uid(),bid,b.name,p.full_name,method,subtotal,request_value->'address',trim(note) from public.businesses b,public.profiles p where b.id=bid and p.id=auth.uid() returning id into oid;
 for line_record in select r from jsonb_array_elements(rows_value) r where (r->>'business_id')::uuid=bid loop
 insert into public.order_items(order_id,product_id,sku_id,variant_snapshot,name,name_bn,unit,quantity,unit_price) values(oid,(line_record.r->>'product_id')::uuid,(line_record.r->>'sku_id')::uuid,line_record.r->'variant_snapshot',line_record.r->>'name',line_record.r->>'name_bn',line_record.r->>'unit',(line_record.r->>'quantity')::integer,(line_record.r->>'unit_price')::numeric);
 update public.product_skus set stock=stock-(line_record.r->>'quantity')::integer,version=version+1 where id=(line_record.r->>'sku_id')::uuid;
 end loop;
 perform private.order_event(oid,'placed',null,'pending_confirmation');
 end loop;
 delete from public.cart_sku_items where buyer_id=auth.uid();
 select jsonb_build_object('ids',jsonb_agg(id order by id)) into result from public.orders where batch_id=batch.id;return result;
end$$;

create or replace function public.save_product(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare pid uuid; bid uuid; tier jsonb;
 begin
 if not private.is_active(auth.uid()) or not private.is_supplier() then raise exception 'Supplier account required' using errcode='42501'; end if;
 select id into bid from public.businesses where owner_id=auth.uid();
 if bid is null then raise exception 'Create your business profile first'; end if;
 if coalesce(jsonb_typeof(payload->'tiers'),'array') <> 'array' or jsonb_array_length(coalesce(payload->'tiers','[]'))>20 then raise exception 'Invalid pricing tiers'; end if;
 if payload->>'id' is not null then
 pid=(payload->>'id')::uuid;
 perform 1 from public.products where id=pid and business_id=bid for update;
 if not found then raise exception 'Product not found or access denied' using errcode='42501'; end if;
 update public.products set name=payload->>'name',name_bn=coalesce(payload->>'name_bn',''),description=payload->>'description',category_id=(payload->>'category_id')::uuid,
 price=(payload->>'price')::numeric,moq=(payload->>'moq')::integer,stock=stock,unit=payload->>'unit',specifications=coalesce(payload->'specifications','{}'),status='pending' where id=pid;
 else
 insert into public.products(business_id,category_id,name,name_bn,description,price,moq,stock,unit,specifications)
 values(bid,(payload->>'category_id')::uuid,payload->>'name',coalesce(payload->>'name_bn',''),payload->>'description',(payload->>'price')::numeric,(payload->>'moq')::integer,(payload->>'stock')::integer,payload->>'unit',coalesce(payload->'specifications','{}')) returning id into pid;
 end if;
 delete from public.product_price_tiers where product_id=pid;
 for tier in select * from jsonb_array_elements(coalesce(payload->'tiers','[]')) loop
 insert into public.product_price_tiers(product_id,min_quantity,price) values(pid,(tier->>'min_quantity')::integer,(tier->>'price')::numeric);
 end loop;

 if not exists(select 1 from public.product_skus where product_id=pid) then
 insert into public.product_skus(product_id,code,stock) values(pid,'STANDARD',(payload->>'stock')::int);
 end if;
 if (select count(*) from public.product_skus where product_id=pid)=1 and not exists(select 1 from public.product_attributes where product_id=pid) then
 update public.product_skus set stock=(payload->>'stock')::int,version=version+1 where product_id=pid;
 delete from public.sku_prices where sku_id in(select id from public.product_skus where product_id=pid);
 insert into public.sku_prices select id,1,(payload->>'price')::numeric from public.product_skus where product_id=pid;
 insert into public.sku_prices select s.id,t.min_quantity,t.price from public.product_skus s join public.product_price_tiers t on t.product_id=s.product_id where s.product_id=pid on conflict(sku_id,min_quantity) do update set price=excluded.price;
 else
 -- Repair shared schedules for any new thresholds; existing SKU prices remain specific.
 delete from public.sku_prices t using public.product_skus s where t.sku_id=s.id and s.product_id=pid and t.min_quantity<>1 and not exists(select 1 from public.product_price_tiers x where x.product_id=pid and x.min_quantity=t.min_quantity);
 insert into public.sku_prices select s.id,t.min_quantity,t.price from public.product_skus s join public.product_price_tiers t on t.product_id=s.product_id where s.product_id=pid on conflict do nothing;
 end if;
 insert into public.product_sourcing(product_id,customization_moq) values(pid,(payload->>'moq')::int) on conflict do nothing;
 return pid;
 end; $$;
do $$declare f record;begin for f in select p.oid::regprocedure sig,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where(n.nspname='public' and p.proname in('product_options','supplier_inventory','supplier_options_save','cart_skus_set')) or(n.nspname='private' and p.proname in('product_readable','sku_snapshot','sku_price','sku_sync_stock','guard_inventory_write')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);if f.nspname='public' then execute format('grant execute on function %s to authenticated',f.sig);end if;end loop;end$$;
grant execute on function public.product_options(uuid) to anon;

create function private.product_standard_sku() returns trigger language plpgsql security definer set search_path='' as $$declare sid uuid;begin
 insert into public.product_skus(product_id,code,stock) values(new.id,'STANDARD',new.stock) returning id into sid;
 insert into public.sku_prices values(sid,1,new.price);
 insert into public.product_sourcing(product_id,customization_moq) values(new.id,new.moq);
 return new;end$$;
create trigger product_standard_sku after insert on public.products for each row execute function private.product_standard_sku();
create function private.standard_tier_sync() returns trigger language plpgsql security definer set search_path='' as $$declare target uuid;sid uuid;begin
 if TG_OP='DELETE' then target=old.product_id;else target=new.product_id;end if;
 if not exists(select 1 from public.product_attributes where product_id=target) then
 select id into sid from public.product_skus where product_id=target and active;
 if TG_OP='DELETE' then delete from public.sku_prices where sku_id=sid and min_quantity=old.min_quantity and min_quantity<>1;
 else insert into public.sku_prices values(sid,new.min_quantity,new.price) on conflict(sku_id,min_quantity) do update set price=excluded.price;end if;end if;
 return null;end$$;
create trigger standard_tier_sync after insert or update or delete on public.product_price_tiers for each row execute function private.standard_tier_sync();
revoke all on function private.product_standard_sku(),private.standard_tier_sync() from public,anon,authenticated;
