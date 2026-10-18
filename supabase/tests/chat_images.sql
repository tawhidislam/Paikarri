-- Synthetic users/messages/product snapshots only. Everything rolls back.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create function pg_temp.denied(q text) returns void language plpgsql as $$begin begin execute q;exception when insufficient_privilege or raise_exception or invalid_parameter_value or check_violation then return;end;raise exception 'UNEXPECTEDLY ALLOWED: %',q;end$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('f1000000-0000-4000-8000-000000000001','buyer@chat.invalid',now(),'{"full_name":"Synthetic Buyer"}'),
('f1000000-0000-4000-8000-000000000002','supplier@chat.invalid',now(),'{}'),
('f1000000-0000-4000-8000-000000000003','unrelated@chat.invalid',now(),'{}'),
('f1000000-0000-4000-8000-000000000004','owner@chat.invalid',now(),'{}'),
('f1000000-0000-4000-8000-000000000005','staff@chat.invalid',now(),'{}'),
('f1000000-0000-4000-8000-000000000006','secondbuyer@chat.invalid',now(),'{}');
update public.user_roles set role=case user_id when 'f1000000-0000-4000-8000-000000000004' then 'super_admin' when 'f1000000-0000-4000-8000-000000000005' then 'admin' else 'supplier' end where user_id in('f1000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000005');
insert into public.businesses(id,owner_id,name,division,district) values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','Synthetic chat business','Dhaka','Dhaka');
insert into public.products(id,business_id,category_id,name,name_bn,description,price,moq,status) values('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',(select id from public.categories limit 1),'Synthetic chat product','Synthetic BN','Synthetic product for chat testing',185,100,'approved'),('f3000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000001',(select id from public.categories limit 1),'Pending private product','Synthetic BN','Synthetic pending product',200,10,'pending');

create temp table images_fixture(c uuid,f jsonb,m jsonb,access uuid);grant all on images_fixture to authenticated;
set local role authenticated;set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into images_fixture(c) select(public.chat_start('f2000000-0000-4000-8000-000000000001')->'thread'->>'id')::uuid;
update images_fixture set f=public.chat_image_prepare(c,100,100,80);
select pg_temp.denied(format('select public.chat_image_prepare(%L,1048577,100,80)',c)) from images_fixture;
select pg_temp.denied(format('select public.chat_image_finalize(%L,auth.uid())',f->>'id')) from images_fixture;
select pg_temp.denied(format('select public.chat_send_image(%L,'''',''f4000000-0000-4000-8000-000000000001'',%L)',c,f->>'id')) from images_fixture;
select pg_temp.ok(private.chat_image_upload(f->>'path'),'owner may upload to prepared path') from images_fixture;
reset role;
insert into storage.objects(bucket_id,name,metadata) select 'chat-images',f->>'path','{"size":100,"mimetype":"image/webp"}' from images_fixture;
select public.chat_image_finalize((f->>'id')::uuid,'f1000000-0000-4000-8000-000000000001') from images_fixture;
set local role authenticated;set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.ok(not private.chat_image_read(f->>'path'),'peer cannot read an unsent image') from images_fixture;
select pg_temp.denied(format('select public.chat_send_image(%L,'''',''f4000000-0000-4000-8000-000000000002'',%L)',c,f->>'id')) from images_fixture;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
update images_fixture set m=public.chat_send_image(c,'Photo of the product','f4000000-0000-4000-8000-000000000001',(f->>'id')::uuid);
select pg_temp.ok(public.chat_send_image(c,'Photo of the product','f4000000-0000-4000-8000-000000000001',(f->>'id')::uuid)=m,'image send retry is idempotent') from images_fixture;
select pg_temp.ok(public.chat_messages(c)->'rows'->0->>'image_id'=f->>'id','message page includes image ID') from images_fixture;
select pg_temp.denied(format('select public.chat_image_discard(%L)',f->>'id')) from images_fixture;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.ok(private.chat_image_read(f->>'path'),'peer reads sent images') from images_fixture;
select pg_temp.ok(public.chat_image_access((f->>'id')::uuid)->>'path'=f->>'path','participant can request signed viewing') from images_fixture;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.denied(format('select public.chat_image_access(%L)',f->>'id')) from images_fixture;
select pg_temp.ok(not private.chat_image_read(f->>'path') and not private.chat_image_upload(f->>'path'),'unrelated accounts cannot access storage paths') from images_fixture;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000005","role":"authenticated"}';
select pg_temp.denied(format('select public.chat_image_access(%L)',f->>'id')) from images_fixture;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select pg_temp.denied(format('select public.chat_image_access(%L)',f->>'id')) from images_fixture;
update images_fixture set access=(public.admin_monitor_open(c)->>'access_id')::uuid;
select pg_temp.ok(public.admin_monitor_messages(c,access)->'rows'->0->>'image_id'=f->>'id','audited monitoring includes attachments') from images_fixture;
select public.chat_image_access((f->>'id')::uuid,access) is not null from images_fixture;
reset role;
select pg_temp.ok((select count(*)=1 from public.admin_audit_logs a,images_fixture f where a.entity_id=f.c and a.action='conversation_monitor.image_accessed'),'monitoring image access audited');
select pg_temp.ok((select not public and file_size_limit=1048576 from storage.buckets where id='chat-images'),'bucket private and capped');
select 'Chat image privacy, validation, idempotency and monitoring checks passed' result;
rollback;
