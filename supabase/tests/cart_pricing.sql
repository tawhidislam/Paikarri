-- Hosted integration test: synthetic fixtures only, always rolled back.
begin;
select pg_advisory_xact_lock(hashtextextended('paikarii-cart-pricing-fixtures', 0));
create function pg_temp.ok(value boolean, label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$begin begin execute statement;exception when insufficient_privilege or raise_exception or invalid_parameter_value or check_violation or serialization_failure then return;end;raise exception 'UNEXPECTEDLY ALLOWED: %',statement;end$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('f1000000-0000-4000-8000-000000000001','cart-buyer@pricing.invalid',now(),'{}'),
('f1000000-0000-4000-8000-000000000002','cart-supplier@pricing.invalid',now(),'{}'),
('f1000000-0000-4000-8000-000000000003','cart-other@pricing.invalid',now(),'{}'),
('f1000000-0000-4000-8000-000000000004','cart-staff@pricing.invalid',now(),'{}');
update public.user_roles set role=case user_id when 'f1000000-0000-4000-8000-000000000002' then 'supplier' else 'admin' end where user_id in('f1000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000004');
insert into public.businesses(id,owner_id,name,division,district) values ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','Synthetic Cart Pricing','Dhaka','Dhaka');
insert into public.products(id,business_id,category_id,name,name_bn,description,price,moq,stock,status) values ('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',(select id from public.categories limit 1),'Synthetic Cart Chair','','Rolled-back pricing fixture only',1950,8,1000,'approved');
create temp table pricing_fixture(sku uuid,second_sku uuid,address jsonb,expected jsonb,result jsonb);grant all on pricing_fixture to authenticated;
insert into pricing_fixture(sku,address) select id,'{"name":"Synthetic Buyer","phone":"01712345678","address":"10 Synthetic Road Dhaka","division":"Dhaka","district":"Dhaka"}' from public.product_skus where product_id='f3000000-0000-4000-8000-000000000001';
insert into public.sku_prices select sku,q,p from pricing_fixture cross join(values(8,1950),(24,1853),(80,1755)) tiers(q,p);
set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.ok(jsonb_array_length(public.product_options('f3000000-0000-4000-8000-000000000001')->'skus'->0->'prices')=4,'safe options expose complete quantity schedule');
do $$declare q int;p numeric;begin
 for q,p in select * from(values(8,1950),(23,1950),(24,1853),(79,1853),(80,1755),(8,1950)) tiers(q,p) loop
 perform public.cart_set('f3000000-0000-4000-8000-000000000001',q);
 perform pg_temp.ok((public.cart_quote()->'rows'->0->>'unit_price')::numeric=p,'exact tier boundary '||q);
 end loop;
end$$;
select pg_temp.denied($$select public.cart_set('f3000000-0000-4000-8000-000000000001',7)$$);
select pg_temp.denied($$select public.cart_set('f3000000-0000-4000-8000-000000000001',1001)$$);
-- A second SKU uses a different schedule, with combined product quantity.
reset role;
insert into public.product_skus(id,product_id,code,stock) values('f4000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000001','CREAM',1000);
update pricing_fixture set second_sku='f4000000-0000-4000-8000-000000000002';
insert into public.sku_prices select second_sku,q,p from pricing_fixture cross join(values(1,2050),(8,2050),(24,1953),(80,1855)) tiers(q,p);
set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.cart_skus_set('f3000000-0000-4000-8000-000000000001',jsonb_build_array(jsonb_build_object('sku_id',sku,'quantity',20),jsonb_build_object('sku_id',second_sku,'quantity',4))) from pricing_fixture;
select pg_temp.ok((select (r->>'unit_price')::numeric=1853 from jsonb_array_elements(public.cart_quote()->'rows')r,pricing_fixture f where r->>'sku_id'=f.sku::text),'combined 24 units qualifies green SKU');
select pg_temp.ok((select (r->>'unit_price')::numeric=1953 from jsonb_array_elements(public.cart_quote()->'rows')r,pricing_fixture f where r->>'sku_id'=f.second_sku::text),'combined 24 units qualifies distinct cream SKU price');
update pricing_fixture set expected=(select jsonb_agg(jsonb_build_object('product_id',r->>'product_id','sku_id',r->>'sku_id','sku_version',(r->>'sku_version')::int,'quantity',(r->>'quantity')::int,'unit_price',(r->>'unit_price')::numeric) order by r->>'product_id',r->>'sku_id') from jsonb_array_elements(public.cart_quote()->'rows')r);
select pg_temp.denied(format('select public.order_checkout(''f5000000-0000-4000-8000-000000000001'',%L,''cod'','''',%L)',address::text,jsonb_set(expected,'{0,unit_price}','1')::text)) from pricing_fixture;
update pricing_fixture set result=public.order_checkout('f5000000-0000-4000-8000-000000000001',address,'cod','Synthetic test',expected);
select pg_temp.ok((public.order_detail((result->'ids'->>0)::uuid)->>'subtotal')::numeric=44872,'checkout freezes exact SKU tier totals') from pricing_fixture;
select pg_temp.ok(public.cart_quote()->'rows'='[]'::jsonb,'successful checkout empties cart');
select pg_temp.ok(public.order_checkout('f5000000-0000-4000-8000-000000000001',address,'cod','Synthetic test',expected)=result,'checkout retry remains idempotent') from pricing_fixture;
select public.cart_skus_set('f3000000-0000-4000-8000-000000000001',jsonb_build_array(jsonb_build_object('sku_id',sku,'quantity',4),jsonb_build_object('sku_id',second_sku,'quantity',4))) from pricing_fixture;
select pg_temp.denied(format('select public.cart_skus_set(''f3000000-0000-4000-8000-000000000001'',%L)',jsonb_build_array(jsonb_build_object('sku_id',sku,'quantity',4))::text)) from pricing_fixture;
select public.cart_skus_set('f3000000-0000-4000-8000-000000000001','[]');
select pg_temp.ok(public.cart_quote()->'rows'='[]'::jsonb,'whole-product removal clears variants without violating remaining MOQ');
reset role;
select pg_temp.ok((select stock=980 from public.product_skus s,pricing_fixture f where s.id=f.sku),'green inventory reserved exactly once');
select pg_temp.ok((select stock=996 from public.product_skus s,pricing_fixture f where s.id=f.second_sku),'cream inventory reserved exactly once');
set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.ok(public.cart_quote()->'rows'='[]'::jsonb,'unrelated buyer cannot read another cart');
select pg_temp.denied(format('select public.order_detail(%L)',result->'ids'->>0)) from pricing_fixture;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.denied('select public.cart_quote()');
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select pg_temp.denied('select public.cart_quote()');
reset role;
set local role anon;
select pg_temp.denied('select public.cart_quote()');
reset role;
select 'Cart tier boundaries, combined SKU pricing, checkout, inventory, idempotency and authorization passed; fixtures rolled back.' as result;
rollback;
