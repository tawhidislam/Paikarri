-- Run against the explicitly designated CLOUD test project after both supplier-mobile migrations.
-- Every synthetic account, notification, object metadata row and write rolls back.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create function pg_temp.reject(q text,expected text) returns void language plpgsql as $$
begin
 begin execute q;
 exception when others then if sqlstate=expected then return;end if;raise;end;
 raise exception 'UNEXPECTEDLY ALLOWED: %',q;
end$$;
select pg_temp.ok(not has_function_privilege('anon','public.supplier_api_command(text,uuid,jsonb,text)','execute'),'guest cannot execute commands');
select pg_temp.ok(not has_function_privilege('authenticated','private.supplier_api_execute(text,uuid,jsonb)','execute'),'dispatcher implementation is private');
select pg_temp.ok(not has_function_privilege('authenticated','public.supplier_api_upload_verified(uuid,uuid)','execute'),'client cannot verify its own bytes');
select pg_temp.ok(not has_table_privilege('authenticated','private.supplier_api_replays','select'),'replay responses are private');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('a2400000-0000-4000-8000-000000000001','supplier1@mobile.invalid',now(),'{}'),
('a2400000-0000-4000-8000-000000000002','supplier2@mobile.invalid',now(),'{}'),
('a2400000-0000-4000-8000-000000000003','buyer@mobile.invalid',now(),'{}'),
('a2400000-0000-4000-8000-000000000004','staff@mobile.invalid',now(),'{}');
update public.user_roles set role=case when user_id='a2400000-0000-4000-8000-000000000004' then 'admin' else 'supplier' end where user_id in('a2400000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000002','a2400000-0000-4000-8000-000000000004');
insert into public.businesses(id,owner_id,name,division,district,contact_phone) values
('b2400000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000001','Synthetic mobile supplier','Dhaka','Dhaka','+8801712345678'),
('b2400000-0000-4000-8000-000000000002','a2400000-0000-4000-8000-000000000002','Other synthetic mobile supplier','Dhaka','Dhaka','+8801712345679');
insert into public.categories(id,name,name_bn,slug) values('c2400000-0000-4000-8000-000000000001','Synthetic mobile category','পরীক্ষা','synthetic-mobile-api');
insert into public.products(id,business_id,category_id,name,description,price,moq,stock,status)
select ('d2400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'b2400000-0000-4000-8000-000000000001','c2400000-0000-4000-8000-000000000001','Synthetic product '||n,'Synthetic mobile API fixtures only',100,1,100,'approved' from generate_series(1,1026)n;
insert into public.products(id,business_id,category_id,name,description,price,moq,stock,status) values('d2400000-0000-4000-8001-000000000001','b2400000-0000-4000-8000-000000000002','c2400000-0000-4000-8000-000000000001','Other private product','Synthetic isolation fixture',100,1,10,'pending');
set local request.jwt.claims='{"sub":"a2400000-0000-4000-8000-000000000003","role":"authenticated"}';
-- Reset only the synthetic actor's inquiry counter between fixture inserts.
do $$begin for n in 1..1026 loop
 delete from private.rate_limits where user_id='a2400000-0000-4000-8000-000000000003' and scope='quotation_requests';
 insert into public.quotation_requests(id,buyer_id,business_id,product_id,quantity,message) values(('e2400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'a2400000-0000-4000-8000-000000000003','b2400000-0000-4000-8000-000000000001','d2400000-0000-4000-8000-000000000001',10,'Synthetic wholesale quotation request');
end loop;end$$;
insert into public.checkout_batches(id,buyer_id,nonce,request) values('f2400000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000003','f2400000-0000-4000-8000-000000000002','{}');
insert into public.orders(id,batch_id,buyer_id,business_id,supplier_name,buyer_name,status,payment_method,subtotal,shipping_address) values
('f2400000-0000-4000-8001-000000000001','f2400000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000003','b2400000-0000-4000-8000-000000000001','Synthetic mobile supplier','Synthetic buyer','processing','cod',100,'{}');
insert into public.checkout_batches(id,buyer_id,nonce,request) values('f2400000-0000-4000-8000-000000000003','a2400000-0000-4000-8000-000000000003','f2400000-0000-4000-8000-000000000004','{}');
insert into public.orders(id,batch_id,buyer_id,business_id,supplier_name,buyer_name,status,payment_method,subtotal,shipping_address) values
('f2400000-0000-4000-8001-000000000002','f2400000-0000-4000-8000-000000000003','a2400000-0000-4000-8000-000000000003','b2400000-0000-4000-8000-000000000001','Synthetic mobile supplier','Synthetic buyer','processing','bank_transfer',100,'{}');
create temp table mobile_fixture(product jsonb,payload jsonb,upload jsonb,verification jsonb);grant all on mobile_fixture to authenticated,service_role;
insert into mobile_fixture(payload) values('{"name":"Retry safe shirt","name_bn":"","description":"Synthetic creation for replay tests","category_id":"c2400000-0000-4000-8000-000000000001","price":100,"moq":10,"stock":50,"unit":"piece","specifications":{},"tiers":[]}');
set local role authenticated;
select pg_temp.reject($q$select public.supplier_api_read('overview')$q$,'42501');
set local request.jwt.claims='{"sub":"a2400000-0000-4000-8000-000000000004","role":"authenticated"}';
select pg_temp.reject($q$select public.supplier_api_read('products')$q$,'42501');
set local request.jwt.claims='{"sub":"a2400000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.ok((public.supplier_api_read('products')->>'total')::int=1026,'products counted past PostgREST cap');
select pg_temp.ok(jsonb_array_length(public.supplier_api_read('products',null,'{"page":42}')->'rows')=1,'last product page accessible');
select pg_temp.ok((public.supplier_api_read('quotations')->>'total')::int=1026,'quotations counted past cap');
select pg_temp.ok(jsonb_array_length(public.supplier_api_read('quotations',null,'{"page":42}')->'rows')=1,'last quotation page accessible');
select pg_temp.reject($q$select public.supplier_api_read('product','d2400000-0000-4000-8001-000000000001')$q$,'P0002');
select pg_temp.reject($q$select public.supplier_api_read('export')$q$,'22023');
select pg_temp.ok(public.supplier_api_read('order','f2400000-0000-4000-8001-000000000001')->'allowed_actions'?'ship','COD supplier can dispatch');
select pg_temp.ok(not(public.supplier_api_read('order','f2400000-0000-4000-8001-000000000002')->'allowed_actions'?'ship'),'bank dispatch unavailable before financial verification');
select pg_temp.reject($q$select public.supplier_api_command('order_action','f2400000-0000-4000-8001-000000000002','{"expected_version":1,"action":"ship","values":{"carrier":"Synthetic","tracking_number":"SYNTHETIC"}}','bank-ship-001')$q$,'PT409');
select pg_temp.reject($q$select public.supplier_api_command('order_action','f2400000-0000-4000-8001-000000000002','{"expected_version":1,"action":"confirm_payment","values":{"reference":"Synthetic"}}','bank-verify-001')$q$,'PT409');
select pg_temp.ok(public.supplier_api_command('order_action','f2400000-0000-4000-8001-000000000001','{"expected_version":1,"action":"ship","values":{"carrier":"Synthetic","tracking_number":"SYNTHETIC"}}','cod-ship-001')->>'status'='shipped','COD dispatch preserves state machine');
select pg_temp.ok(public.supplier_api_command('order_action','f2400000-0000-4000-8001-000000000001','{"expected_version":1,"action":"ship","values":{"carrier":"Synthetic","tracking_number":"SYNTHETIC"}}','cod-ship-001')->>'status'='shipped','dispatch replay succeeds after state change');
update mobile_fixture set product=public.supplier_api_command('product_create',null,payload,'create-product-001');
select pg_temp.ok(public.supplier_api_command('product_create',null,payload,'create-product-001')=product,'retry returns identical product') from mobile_fixture;
select pg_temp.ok((public.supplier_api_read('products')->>'total')::int=1027,'retry did not create a second product');
select pg_temp.reject(format('select public.supplier_api_command(''product_create'',null,%L,''create-product-001'')',(payload||'{"name":"Different input"}')::text),'PT409') from mobile_fixture;
select public.supplier_api_command('inventory',(s->>'id')::uuid,jsonb_build_object('product_id',f.product->>'id','expected_version',(s->>'version')::int,'quantity',45),'inventory-001') from mobile_fixture f cross join lateral jsonb_array_elements(public.product_options((f.product->>'id')::uuid)->'skus') s;
select pg_temp.reject(format('select public.supplier_api_command(''inventory'',%L,%L,''inventory-stale-001'')',s->>'id',jsonb_build_object('product_id',f.product->>'id','expected_version',(s->>'version')::int-1,'quantity',999)::text),'PT409') from mobile_fixture f cross join lateral jsonb_array_elements(public.product_options((f.product->>'id')::uuid)->'skus') s;
select public.supplier_api_command('product_update',(product->>'id')::uuid,jsonb_build_object('expected_updated_at',public.supplier_api_read('product',(product->>'id')::uuid)->>'updated_at','values',payload),'safe-product-edit-001') from mobile_fixture;
select pg_temp.ok((public.product_options((product->>'id')::uuid)->'skus'->0->>'stock')::int=45,'product edit never restores old stock') from mobile_fixture;
select pg_temp.reject(format('select public.supplier_api_command(''product_update'',%L,%L,''stale-product-001'')',product->>'id',jsonb_build_object('expected_updated_at','2000-01-01T00:00:00Z','values',payload)::text),'PT409') from mobile_fixture;
select pg_temp.reject($q$select public.supplier_api_command('business_update',null,'{"expected_updated_at":"2000-01-01T00:00:00Z","values":{"name":"stale"}}','stale-business-001')$q$,'PT409');
select public.supplier_api_command('quotation_response','e2400000-0000-4000-8000-000000000001','{"price":90,"message":"Synthetic delivery terms"}','response-001');
select public.supplier_api_command('quotation_response','e2400000-0000-4000-8000-000000000001','{"price":90,"message":"Synthetic delivery terms"}','response-001');
select pg_temp.ok((public.supplier_api_read('quotation','e2400000-0000-4000-8000-000000000001')->'response'->>'price')::numeric=90,'quotation response safely replayed');
update mobile_fixture set verification=public.supplier_api_command('verification_start',null,'{}','verification-start-001');
select pg_temp.ok(public.supplier_api_read('overview')->'verification'->'current'->>'status'='draft','overview uses current application records');
select pg_temp.ok((select count(*)=0 from public.supplier_verifications where business_id='b2400000-0000-4000-8000-000000000001'),'verification count does not need legacy rows');
update mobile_fixture set upload=public.supplier_api_command('upload_prepare',null,jsonb_build_object('purpose','product','parent_id',product->>'id','mime','image/png','size',40),'upload-product-001');
select pg_temp.reject(format('select public.supplier_api_command(''upload_complete'',%L,''{}'',''complete-unverified-001'')',upload->>'id'),'22023') from mobile_fixture;
select pg_temp.reject(format('select public.supplier_api_upload_verified(%L,''a2400000-0000-4000-8000-000000000001'')',upload->>'id'),'42501') from mobile_fixture;
reset role;
insert into storage.objects(bucket_id,name,metadata) select upload->>'bucket',upload->>'path','{"mimetype":"image/png","size":40}' from mobile_fixture;
-- Byte validation is separately exercised by the Edge tests; only service_role may attest it.
set local role service_role;
select public.supplier_api_upload_verified((upload->>'id')::uuid,'a2400000-0000-4000-8000-000000000001') from mobile_fixture;
reset role;set local role authenticated;
select public.supplier_api_command('upload_complete',(upload->>'id')::uuid,'{}','complete-product-001') from mobile_fixture;
select pg_temp.ok(jsonb_array_length(public.supplier_api_read('product',(product->>'id')::uuid)->'images')=1,'verified image attached') from mobile_fixture;
select pg_temp.ok(not private.supplier_api_asset_deletable(upload->>'bucket',upload->>'path'),'prepared bytes cannot be replaced after validation') from mobile_fixture;
select public.supplier_api_command('upload_remove',(upload->>'id')::uuid,'{}','remove-product-001') from mobile_fixture;
select public.supplier_api_command('upload_remove',(upload->>'id')::uuid,'{}','remove-product-001') from mobile_fixture;
select pg_temp.ok(jsonb_array_length(public.supplier_api_read('product',(product->>'id')::uuid)->'images')=0,'removal is retry safe') from mobile_fixture;
set local request.jwt.claims='{"sub":"a2400000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.reject(format('select public.supplier_api_upload_info(%L)',upload->>'id'),'P0002') from mobile_fixture;
select pg_temp.reject(format('select public.supplier_api_command(''product_delete'',%L,%L,''cross-delete-001'')',product->>'id',jsonb_build_object('expected_updated_at',product->>'updated_at')::text),'P0002') from mobile_fixture;
reset role;
-- Ten-image cap is server-enforced, including callers bypassing the mobile handler.
insert into public.product_images(product_id,path,position) select (product->>'id')::uuid,'synthetic/'||n,n from mobile_fixture cross join generate_series(1,10)n;
select pg_temp.reject(format('insert into public.product_images(product_id,path) values(%L,''synthetic/eleven'')',product->>'id'),'23514') from mobile_fixture;
update public.account_statuses set status='suspended',reason='Synthetic mobile suspension' where user_id='a2400000-0000-4000-8000-000000000001';
set local role authenticated;set local request.jwt.claims='{"sub":"a2400000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.reject(format('select public.supplier_api_command(''product_create'',null,%L,''suspended-create-001'')',payload::text),'42501') from mobile_fixture;
select pg_temp.ok(public.supplier_api_read('quotation','e2400000-0000-4000-8000-000000000001') is not null,'suspended supplier retains historical follow-up');
reset role;
rollback;
