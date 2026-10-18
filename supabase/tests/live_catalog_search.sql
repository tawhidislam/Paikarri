-- Synthetic search fixtures only; all changes roll back.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at) values
('ea100000-0000-4000-8000-000000000001','search-owner@test.invalid',now()),
('ea100000-0000-4000-8000-000000000002','search-suspended@test.invalid',now()),
('ea100000-0000-4000-8000-000000000003','search-admin@test.invalid',now());
update public.user_roles set role=case when user_id='ea100000-0000-4000-8000-000000000003' then 'super_admin' else 'supplier' end where user_id::text like 'ea100000%';
insert into public.categories(id,slug,name,name_bn) values('ea200000-0000-4000-8000-000000000001','zqx-textiles','Zqx Textiles','জেডকিউ কাপড়');
insert into public.businesses(id,owner_id,name,name_bn,division,district) values
('ea300000-0000-4000-8000-000000000001','ea100000-0000-4000-8000-000000000001','Zqx Wholesale','জেডকিউ পাইকার','Dhaka','Dhaka'),
('ea300000-0000-4000-8000-000000000002','ea100000-0000-4000-8000-000000000002','Hidden Wholesale','গোপন','Dhaka','Dhaka');
update public.account_statuses set status='suspended',reason='Synthetic search test' where user_id='ea100000-0000-4000-8000-000000000002';
insert into public.products(id,business_id,category_id,name,name_bn,description,price,moq,stock,status) values
('ea400000-0000-4000-8000-000000000001','ea300000-0000-4000-8000-000000000001','ea200000-0000-4000-8000-000000000001','Zqx Cotton Shirt','জেডকিউ সুতির জামা','Synthetic catalog search fixture',100,10,100,'approved'),
('ea400000-0000-4000-8000-000000000002','ea300000-0000-4000-8000-000000000001','ea200000-0000-4000-8000-000000000001','Zqx Cotton Pending','জেডকিউ সুতির','Synthetic pending fixture',100,10,100,'pending'),
('ea400000-0000-4000-8000-000000000003','ea300000-0000-4000-8000-000000000002','ea200000-0000-4000-8000-000000000001','Zqx Cotton Hidden','জেডকিউ সুতির','Synthetic suspended fixture',100,10,100,'approved');
set local role anon;
select pg_temp.ok(public.search_suggestions('zq')->'products'->0->>'id'='ea400000-0000-4000-8000-000000000001','prefix returns approved active listing');
select pg_temp.ok(jsonb_array_length(public.search_suggestions('zq')->'products')=1,'pending and suspended listings excluded');
select pg_temp.ok(public.search_suggestions('zqx cot')->'products'->0->>'name'='Zqx Cotton Shirt','multiword prefix');
select pg_temp.ok(public.search_suggestions('জেডকিউ সুতি')->'products'->0->>'name'='Zqx Cotton Shirt','Bangla partial word');
select pg_temp.ok(jsonb_array_length(public.search_suggestions('zqx tex')->'categories')=1,'eligible category suggestion');
select pg_temp.ok(jsonb_array_length(public.search_suggestions('zqx whole')->'products')=1,'supplier name search');
select pg_temp.ok(public.search_suggestions(E'\n\t ')->'products'='[]'::jsonb,'whitespace does not return unrelated suggestions');
select pg_temp.ok(public.search_suggestions('z')->'products'='[]'::jsonb,'single character does not query');
select pg_temp.ok(public.search_suggestions('%_')->'products'='[]'::jsonb,'wildcards are literal');
select pg_temp.ok(public.search_suggestions($q$'; drop table products; --$q$)->'products'='[]'::jsonb,'query syntax is untrusted data');
select pg_temp.ok((select count(*)=0 from public.search_products('zqx',min_price=>200)),'existing price filter retained');
select pg_temp.ok((select count(*)=1 from public.search_products('zqx',division_filter=>'Dhaka')),'existing location filter retained');
select pg_temp.ok(not(public.search_suggestions('zqx')->'products'->0 ? 'owner_id'),'safe result fields');
reset role;
set local request.jwt.claims='{"sub":"ea100000-0000-4000-8000-000000000003","role":"authenticated"}';set local role authenticated;
select pg_temp.ok(jsonb_array_length(public.search_suggestions('zqx')->'products')=1,'admin search cannot leak pending or suspended products');
reset role;
-- Enough eligible matches to check the hard bounds.
insert into public.products(business_id,category_id,name,name_bn,description,price,moq,stock,status)
select 'ea300000-0000-4000-8000-000000000001','ea200000-0000-4000-8000-000000000001','Zqx Cotton '||n,'জেডকিউ সুতির','Synthetic bounded search',100,10,100,'approved' from generate_series(1,10)n;
set local role anon;
select pg_temp.ok(jsonb_array_length(public.search_suggestions('zqx')->'products')=6,'maximum six products');
select pg_temp.ok(public.search_suggestions('zqx cotton shirt')->'products'->0->>'name'='Zqx Cotton Shirt','exact name ranks first');
do $$begin begin perform public.search_suggestions(repeat('x',161));exception when invalid_parameter_value then return;end;raise exception 'Overlong search unexpectedly allowed';end$$;
reset role;
rollback;
