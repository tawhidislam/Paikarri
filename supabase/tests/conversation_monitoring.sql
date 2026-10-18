-- Synthetic conversations/messages only. Every write and audit event rolls back.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create function pg_temp.denied(q text) returns void language plpgsql as $$begin begin execute q;exception when insufficient_privilege or raise_exception or no_data_found then return;end;raise exception 'Unexpectedly allowed: %',q;end$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('c1000000-0000-4000-8000-000000000001','owner@monitor.invalid',now(),'{}'),
('c1000000-0000-4000-8000-000000000002','staff@monitor.invalid',now(),'{}'),
('c1000000-0000-4000-8000-000000000003','supplier@monitor.invalid',now(),'{}'),
('c1000000-0000-4000-8000-000000000004','customer@monitor.invalid',now(),'{}'),
('c1000000-0000-4000-8000-000000000005','unrelated@monitor.invalid',now(),'{}'),
('c1000000-0000-4000-8000-000000000006','empty@monitor.invalid',now(),'{}');
update public.user_roles set role=case user_id when 'c1000000-0000-4000-8000-000000000001' then 'super_admin' when 'c1000000-0000-4000-8000-000000000002' then 'admin' else 'supplier' end where user_id in('c1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000005');
update public.profiles set full_name='Synthetic customer' where id='c1000000-0000-4000-8000-000000000004';
insert into public.businesses(id,owner_id,name,division,district) values('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003','Synthetic monitor supplier','Dhaka','Dhaka');
insert into public.categories(id,name,name_bn,slug) values('c3000000-0000-4000-8000-000000000001','Monitor test','Monitor test','monitor-test');
insert into public.products(business_id,category_id,name,description,price,moq,status) values('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','Synthetic monitoring fixture','Synthetic description',100,10,'approved');
set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into public.conversations(id,business_id,buyer_id,created_at) values('c4000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000004','2026-10-16T00:00:00Z'),('c4000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000006','2026-10-16T00:00:00Z');
do $$begin for n in 1..120 loop
 update private.rate_limits set count=0 where user_id='c1000000-0000-4000-8000-000000000004' and scope='messages';
 insert into public.messages(id,conversation_id,sender_id,body,created_at) values(('c5000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000004','Synthetic private message '||n,'2026-10-17T18:00:00Z');
end loop;end$$;
update public.account_statuses set status='suspended',reason='Synthetic fixture suspension' where user_id='c1000000-0000-4000-8000-000000000003';
set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';set local role authenticated;
select pg_temp.ok((select count(*)=0 from public.conversations),'super admin does not gain direct conversation access');
select pg_temp.ok((select count(*)=0 from public.messages),'super admin does not gain direct message access');
select pg_temp.ok((public.admin_monitor_list('{"business_id":"c2000000-0000-4000-8000-000000000001"}')->>'total')::int=2,'includes suspended suppliers and empty threads');
select pg_temp.ok((public.admin_monitor_list('{"q":"customer@monitor.invalid"}')->>'total')::int=1,'search by participant email');
select pg_temp.ok((public.admin_monitor_list('{"supplier":"supplier@monitor.invalid","customer":"Synthetic customer"}')->>'total')::int=1,'supplier and customer filters');
select pg_temp.ok((public.admin_monitor_list('{"business_id":"c2000000-0000-4000-8000-000000000001","from":"2026-10-18","to":"2026-10-18"}')->>'total')::int=1,'Bangladesh midnight included');
select pg_temp.ok((public.admin_monitor_list('{"business_id":"c2000000-0000-4000-8000-000000000001","to":"2026-10-17"}')->>'total')::int=1,'end date excludes next Bangladesh day');
select pg_temp.ok(public.admin_monitor_list('{"q":"monitor.invalid"}')::text not like '%Synthetic private message%','list never contains message bodies');
select pg_temp.denied($$select public.admin_monitor_list('{}',1,101)$$);
select pg_temp.denied($$select public.admin_monitor_list('{"from":"2026-10-18","to":"2026-10-17"}')$$);
select pg_temp.denied($$select public.admin_monitor_messages('c4000000-0000-4000-8000-000000000001')$$);
create temp table monitor_pages(kind text,data jsonb);grant all on monitor_pages to authenticated;
insert into monitor_pages values('opened',public.admin_monitor_open('c4000000-0000-4000-8000-000000000001'));
select pg_temp.ok((select data->'supplier'->>'status'='suspended' from monitor_pages where kind='opened'),'details retain suspended supplier');
insert into monitor_pages select 'first',data->'messages' from monitor_pages where kind='opened';
insert into monitor_pages select 'older',public.admin_monitor_messages('c4000000-0000-4000-8000-000000000001',(select (data->>'access_id')::uuid from monitor_pages where kind='opened'),data->'oldest') from monitor_pages where kind='first';
insert into monitor_pages select 'oldest',public.admin_monitor_messages('c4000000-0000-4000-8000-000000000001',(select (data->>'access_id')::uuid from monitor_pages where kind='opened'),data->'oldest') from monitor_pages where kind='older';
select pg_temp.ok((select jsonb_array_length(data->'rows')=50 and (data->>'has_more')::boolean from monitor_pages where kind='first'),'latest 50 and more history');
select pg_temp.ok((select jsonb_array_length(data->'rows')=20 and not(data->>'has_more')::boolean from monitor_pages where kind='oldest'),'complete history beyond 100 messages');
select pg_temp.ok((select count(distinct r->>'id')=120 from monitor_pages p cross join lateral jsonb_array_elements(p.data->'rows') r where kind in('first','older','oldest')),'equal timestamp pagination has no duplicates or gaps');
insert into monitor_pages select 'after',public.admin_monitor_messages('c4000000-0000-4000-8000-000000000001',(select (data->>'access_id')::uuid from monitor_pages where kind='opened'),null,data->'newest') from monitor_pages where kind='oldest';
select pg_temp.ok((select jsonb_array_length(data->'rows')=50 and data->'rows'->0->>'id'='c5000000-0000-4000-8000-000000000021' from monitor_pages where kind='after'),'newer cursor polls in ascending tuple order');
select pg_temp.ok((select count(*)=1 from public.admin_audit_logs where entity_id='c4000000-0000-4000-8000-000000000001' and action='conversation_monitor.opened'),'pagination and polling do not repeat opening audit');
select pg_temp.denied($$select public.admin_monitor_open('c4000000-0000-4000-8000-000000000099')$$);
select pg_temp.ok((select count(*)=1 from public.admin_audit_logs where entity_id='c4000000-0000-4000-8000-000000000001' and action='conversation_monitor.opened'),'failed access creates no successful opening');
select pg_temp.ok((public.admin_monitor_open('c4000000-0000-4000-8000-000000000002')->'messages'->'rows')='[]'::jsonb,'empty thread opens without invented messages');
select pg_temp.denied($$insert into public.messages(conversation_id,sender_id,body) values('c4000000-0000-4000-8000-000000000001',auth.uid(),'Cannot intervene')$$);
select pg_temp.ok((select bool_and(details='{}'::jsonb) from public.admin_audit_logs where action='conversation_monitor.opened'),'audit contains no content or contact snapshots');
set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.denied($$select public.admin_monitor_list()$$);select pg_temp.denied($$select public.admin_monitor_open('c4000000-0000-4000-8000-000000000001')$$);select pg_temp.denied($$select public.admin_monitor_messages('c4000000-0000-4000-8000-000000000001')$$);
select pg_temp.ok((select count(*)=0 from public.admin_audit_logs where action like 'conversation_monitor.%'),'staff audit RLS excludes monitoring');
select pg_temp.ok((public.admin_list('audit','{"action":"conversation_monitor"}')->>'total')::int=0,'staff generic audit API excludes monitoring');
set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select pg_temp.denied($$select public.admin_monitor_list()$$);select pg_temp.denied($$select public.admin_monitor_open('c4000000-0000-4000-8000-000000000001')$$);select pg_temp.denied($$select public.admin_monitor_messages('c4000000-0000-4000-8000-000000000001')$$);
select pg_temp.ok((select count(*)=120 from public.messages where conversation_id='c4000000-0000-4000-8000-000000000001'),'customer retains own message history');
set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.denied($$select public.admin_monitor_list()$$);select pg_temp.denied($$select public.admin_monitor_open('c4000000-0000-4000-8000-000000000001')$$);select pg_temp.denied($$select public.admin_monitor_messages('c4000000-0000-4000-8000-000000000001')$$);
select pg_temp.ok((select count(*)=120 from public.messages where conversation_id='c4000000-0000-4000-8000-000000000001'),'suspended supplier retains participant follow-up');
set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000005","role":"authenticated"}';
select pg_temp.denied($$select public.admin_monitor_open('c4000000-0000-4000-8000-000000000001')$$);
select pg_temp.ok((select count(*)=0 from public.messages),'unrelated supplier cannot read content');
set local role anon;set local request.jwt.claims='{}';
select pg_temp.ok(not has_function_privilege('anon','public.admin_monitor_list(jsonb,integer,integer)','execute') and not has_function_privilege('anon','public.admin_monitor_open(uuid)','execute') and not has_function_privilege('anon','public.admin_monitor_messages(uuid,uuid,jsonb,jsonb,integer)','execute'),'guest monitoring privileges revoked');
reset role;
select 'Conversation monitoring assertions passed; all synthetic data rolled back.' as result;
rollback;
