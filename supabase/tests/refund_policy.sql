-- Synthetic identities and every content change are rolled back.
begin;
create temporary table terms_unchanged as select to_jsonb(t) as content from public.terms_content t;
create function pg_temp.check_ok(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$begin begin execute statement;exception when insufficient_privilege or check_violation or raise_exception or serialization_failure or invalid_datetime_format or datetime_field_overflow or invalid_parameter_value then return;end;raise exception 'Unexpectedly allowed: %',statement;end$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('e9200000-0000-4000-8000-000000000001','refund-owner@example.invalid',now(),'{}'),
 ('e9200000-0000-4000-8000-000000000002','refund-staff@example.invalid',now(),'{}'),
 ('e9200000-0000-4000-8000-000000000003','refund-buyer@example.invalid',now(),'{}'),
 ('e9200000-0000-4000-8000-000000000004','refund-supplier@example.invalid',now(),'{}');
update public.user_roles set role=case user_id when 'e9200000-0000-4000-8000-000000000001' then 'super_admin' when 'e9200000-0000-4000-8000-000000000002' then 'admin' else 'supplier' end where user_id in('e9200000-0000-4000-8000-000000000001','e9200000-0000-4000-8000-000000000002','e9200000-0000-4000-8000-000000000004');
create temporary table refund_fixture(config jsonb, baseline jsonb);
insert into refund_fixture values(' {"title_en":"Synthetic refund policy","title_bn":"পরীক্ষামূলক শর্তাবলি","intro_en":"Synthetic introduction","intro_bn":"পরীক্ষামূলক ভূমিকা","effective_date":"2026-10-18","sections":[{"heading_en":"Accounts","heading_bn":"অ্যাকাউন্ট","body_en":"Synthetic rules only","body_bn":"পরীক্ষামূলক নিয়ম"}]}',public.get_refund_content());
grant select on refund_fixture to authenticated;
set local role anon;set local request.jwt.claims='{}';
select pg_temp.denied($$select public.admin_refund_state()$$);
select pg_temp.denied($$select * from public.refund_content$$);
select pg_temp.denied($$select public.admin_publish_refund(0)$$);
set local role authenticated;
set local request.jwt.claims='{"sub":"e9200000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.check_ok((select count(*)=0 from public.refund_content),'staff cannot read draft');
select pg_temp.check_ok((select count(*)=0 from public.refund_content_history),'staff cannot read history');
select pg_temp.denied($$select public.admin_refund_state()$$);
select pg_temp.denied($$select public.admin_save_refund((select config from refund_fixture),0)$$);
select pg_temp.denied($$update public.refund_content set revision=999$$);
set local request.jwt.claims='{"sub":"e9200000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.denied($$select public.admin_publish_refund(0)$$);
select pg_temp.check_ok((select count(*)=0 from public.refund_content),'buyer cannot read draft');
set local request.jwt.claims='{"sub":"e9200000-0000-4000-8000-000000000004","role":"authenticated"}';
select pg_temp.denied($$select public.admin_refund_state()$$);
select pg_temp.denied($$select public.admin_save_refund((select config from refund_fixture),0)$$);
set local request.jwt.claims='{"sub":"e9200000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.denied($$update public.refund_content set revision=999$$);
select public.admin_save_refund((select config from refund_fixture),(public.admin_refund_state()->>'revision')::int);
select pg_temp.check_ok(public.get_refund_content() is not distinct from (select baseline from refund_fixture),'saving does not publish');
select pg_temp.denied($$select public.admin_save_refund((select config from refund_fixture),-1)$$);
select pg_temp.denied($$select public.admin_publish_refund(-1)$$);
select pg_temp.denied($$select public.admin_save_refund((select jsonb_set(config,'{effective_date}','"2026-02-30"') from refund_fixture),(public.admin_refund_state()->>'revision')::int)$$);
select pg_temp.denied($$select public.admin_save_refund((select jsonb_set(config,'{sections}','{}') from refund_fixture),(public.admin_refund_state()->>'revision')::int)$$);
select public.admin_publish_refund((public.admin_refund_state()->>'revision')::int);
select pg_temp.check_ok(public.get_refund_content()->'content'=(select config from refund_fixture),'saved content published');
select public.admin_save_refund((select jsonb_set(config,'{title_en}','"Unpublished replacement"') from refund_fixture),(public.admin_refund_state()->>'revision')::int);
select pg_temp.check_ok(public.get_refund_content()->'content'->>'title_en'='Synthetic refund policy','later drafts do not replace published terms');
select public.admin_save_refund((select jsonb_set(config,'{sections,0,body_bn}','""') from refund_fixture),(public.admin_refund_state()->>'revision')::int);
select pg_temp.denied($$select public.admin_publish_refund((public.admin_refund_state()->>'revision')::int)$$);
select pg_temp.check_ok((select count(*)=4 from public.refund_content_history where actor_id=auth.uid()),'every successful mutation has immutable history');
select pg_temp.check_ok((select count(*)=4 from public.admin_audit_logs where admin_id=auth.uid() and action like 'refund_content.%'),'every successful mutation audited');
select pg_temp.denied($$delete from public.refund_content_history$$);
set local role anon;set local request.jwt.claims='{}';
select pg_temp.check_ok(public.get_refund_content()->'content'->>'title_en'='Synthetic refund policy','guests see published version only');
reset role;
select pg_temp.check_ok((select to_jsonb(t) from public.terms_content t)=(select content from terms_unchanged),'refund edits never change terms content');
rollback;
