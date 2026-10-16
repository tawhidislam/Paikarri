-- Execute against linked CLOUD project: supabase db query --linked --file supabase/tests/authorization.sql
-- Every fixture and assertion runs in one transaction and is rolled back.
begin;
create function pg_temp.assert_true(condition boolean, message text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;
select pg_temp.assert_true(not has_function_privilege('anon','public.moderate_product(uuid,text,text)','execute'),'Anonymous RPC execution revoked');
select pg_temp.assert_true(not has_function_privilege('anon','private.consume_limit(text,integer,integer)','execute'),'Private limiter is not a callable client RPC');
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','buyer@rls-test.invalid','{"role":"admin","full_name":"Buyer test"}'),
 ('10000000-0000-4000-8000-000000000002','supplier1@rls-test.invalid','{}'),
 ('10000000-0000-4000-8000-000000000003','supplier2@rls-test.invalid','{}'),
 ('10000000-0000-4000-8000-000000000004','admin@rls-test.invalid','{}');
update public.user_roles set role='supplier' where user_id in ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003');
update public.user_roles set role='admin' where user_id='10000000-0000-4000-8000-000000000004';
insert into public.businesses(id,owner_id,name,division,district) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Supplier one','Dhaka','Dhaka'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','Supplier two','Dhaka','Gazipur');
insert into public.categories(id,name,name_bn,slug) values('30000000-0000-4000-8000-000000000001','Test category','পরীক্ষা','rls-test-category');
insert into public.products(id,business_id,category_id,name,description,price,moq,status) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Published test product','Long enough product description',100,10,'approved'),
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Private test product','Long enough product description',100,10,'pending');
insert into public.product_images(product_id,path) values('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000002/private.jpg');
insert into public.product_images(product_id,path) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000001/public.jpg');
update public.products set status='approved' where id='40000000-0000-4000-8000-000000000001';
insert into storage.objects(bucket_id,name) values
 ('product-images','10000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000001/public.jpg'),
 ('product-images','10000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000002/private.jpg'),
 ('business-documents','10000000-0000-4000-8000-000000000003/test.pdf');
insert into public.supplier_verifications(business_id,document_path,document_type) values('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003/test.pdf','trade_license');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.conversations(id,buyer_id,business_id) values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
-- Test triggers rate-limit writes; fixture creation requires an authenticated identity.
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select pg_temp.assert_true((select role='buyer' from public.user_roles where user_id=auth.uid()),'Signup metadata cannot grant admin');
select pg_temp.assert_true((select count(*)=1 from public.profiles),'Profile isolation');
select pg_temp.assert_true((select count(*)=1 from public.products where id::text like '40000000%'),'Only approved products visible to buyers');
select pg_temp.assert_true((select count(*)=0 from public.supplier_verifications),'Buyer cannot read verification documents');
select pg_temp.assert_true((select count(*)=0 from public.product_images where product_id='40000000-0000-4000-8000-000000000002'),'Pending image metadata hidden');
do $$ begin
 begin update public.user_roles set role='admin' where user_id=auth.uid(); exception when insufficient_privilege then null; end;
 perform pg_temp.assert_true(not private.is_admin(),'Direct role escalation blocked');
 begin perform public.moderate_product('40000000-0000-4000-8000-000000000001','approved','');raise exception 'Buyer moderation unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin insert into public.products(business_id,category_id,name,description,price,moq) values('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Injected product','Long enough description',1,1);raise exception 'Buyer insert unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin insert into public.quotation_requests(buyer_id,business_id,product_id,quantity,message) values(auth.uid(),'20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'Please quote this order');raise exception 'Below-MOQ quote unexpectedly succeeded';exception when raise_exception then if sqlerrm not like 'Invalid product%' then raise;end if;end;
 end $$;
insert into public.quotation_requests(buyer_id,business_id,product_id,quantity,message) values(auth.uid(),'20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',10,'Please quote this order');
insert into public.messages(conversation_id,sender_id,body) values('50000000-0000-4000-8000-000000000001',auth.uid(),'Buyer inquiry');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.assert_true((select count(*)=0 from public.conversations),'Unrelated supplier cannot read conversation');
select pg_temp.assert_true((select count(*)=0 from public.messages),'Unrelated supplier cannot read messages');
select pg_temp.assert_true((select count(*)=0 from public.quotation_requests),'Unrelated supplier cannot read quotations');
do $$ begin
 begin insert into public.messages(conversation_id,sender_id,body) values('50000000-0000-4000-8000-000000000001',auth.uid(),'Injected message');raise exception 'Cross-user message unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin update public.businesses set verified=true where owner_id=auth.uid();raise exception 'Self verification unexpectedly succeeded';exception when raise_exception then if sqlerrm not like 'Protected business%' then raise;end if;end;
 end $$;
update public.products set name='Forbidden mutation' where id='40000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(not exists(select 1 from public.products where name='Forbidden mutation'),'Cross-supplier mutation blocked');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
update public.products set name='Edited product',status='approved' where id='40000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select status='pending' from public.products where id='40000000-0000-4000-8000-000000000001'),'Supplier edit resets approval');
select pg_temp.assert_true((select count(*)=1 from public.quotation_requests),'Supplier sees own quotation');
do $$ begin
 begin
 perform public.save_product('{"id":"40000000-0000-4000-8000-000000000001","name":"Should roll back","description":"Long enough description","name_bn":"","category_id":"30000000-0000-4000-8000-000000000001","price":100,"moq":10,"stock":100,"unit":"piece","tiers":[{"min_quantity":10,"price":90},{"min_quantity":10,"price":80}]}');
 raise exception 'Duplicate tiers unexpectedly accepted';
 exception when unique_violation then null;end;
 perform pg_temp.assert_true((select name='Edited product' from public.products where id='40000000-0000-4000-8000-000000000001'),'Failed tier save rolls back parent edit');
 end $$;
select pg_temp.assert_true((select count(*)=0 from public.supplier_verifications),'Supplier cannot read other business verification');
insert into public.quotation_responses(request_id,price,message) select id,90,'Delivery within seven days.' from public.quotation_requests;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.moderate_product('40000000-0000-4000-8000-000000000001','approved','RLS test');
select pg_temp.assert_true((select count(*)=1 from public.admin_audit_logs where entity_id='40000000-0000-4000-8000-000000000001'),'Moderation creates audit log');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.assert_true((select count(*)=1 from public.quotation_responses),'Buyer can read supplier response');
select pg_temp.assert_true((select count(*)=0 from public.product_moderation_notes),'Buyer cannot read private reviewer feedback');
select pg_temp.assert_true((select moderation_note='' from public.products where id='40000000-0000-4000-8000-000000000001'),'Public product row contains no private feedback');
do $$ declare i integer; begin
 for i in 1..29 loop insert into public.messages(conversation_id,sender_id,body) values('50000000-0000-4000-8000-000000000001',auth.uid(),'Rate limit test');end loop;
 begin insert into public.messages(conversation_id,sender_id,body) values('50000000-0000-4000-8000-000000000001',auth.uid(),'Over rate limit');raise exception 'Rate limit unexpectedly bypassed';exception when raise_exception then if sqlerrm not like 'Rate limit exceeded%' then raise;end if;end;
 end $$;
set local role anon;
set local request.jwt.claims='{}';
select pg_temp.assert_true((select count(*)=1 from public.products where id::text like '40000000%'),'Anonymous approved-only browsing');
select pg_temp.assert_true((select count(*)=1 from public.search_products('Edited','rls-test-category','Dhaka','Dhaka',50,150,20,false)),'Full-text and catalog filters return approved matches');
select pg_temp.assert_true((select count(*)=0 from public.search_products('Edited',null,'Sylhet',null,null,null,null,false)),'Location filtering excludes mismatches');
select pg_temp.assert_true((select count(*)=1 from storage.objects where bucket_id='product-images' and name like '10000000%'),'Approved-only image storage access');
select pg_temp.assert_true((select count(*)=0 from storage.objects where bucket_id='business-documents'),'Anonymous document storage denial');
select pg_temp.assert_true((select count(*)=0 from public.product_images where product_id='40000000-0000-4000-8000-000000000002'),'Anonymous pending images hidden');
reset role;
select 'All authorization assertions passed. Fixtures rolled back.' as result;
rollback;
