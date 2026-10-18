-- Synthetic identities and every content change are rolled back.
begin;
create function pg_temp.check_ok(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$begin begin execute statement;exception when insufficient_privilege or check_violation or raise_exception or serialization_failure or invalid_datetime_format or datetime_field_overflow or invalid_parameter_value then return;end;raise exception 'Unexpectedly allowed: %',statement;end$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('e9100000-0000-4000-8000-000000000001','terms-owner@example.invalid',now(),'{}'),
 ('e9100000-0000-4000-8000-000000000002','terms-staff@example.invalid',now(),'{}'),
 ('e9100000-0000-4000-8000-000000000003','terms-buyer@example.invalid',now(),'{}'),
 ('e9100000-0000-4000-8000-000000000004','terms-supplier@example.invalid',now(),'{}');
update public.user_roles set role=case user_id when 'e9100000-0000-4000-8000-000000000001' then 'super_admin' when 'e9100000-0000-4000-8000-000000000002' then 'admin' else 'supplier' end where user_id in('e9100000-0000-4000-8000-000000000001','e9100000-0000-4000-8000-000000000002','e9100000-0000-4000-8000-000000000004');
create temporary table terms_fixture(config jsonb, baseline jsonb);
insert into terms_fixture values(' {"title_en":"Synthetic terms","title_bn":"পরীক্ষামূলক শর্তাবলি","intro_en":"Synthetic introduction","intro_bn":"পরীক্ষামূলক ভূমিকা","effective_date":"2026-10-18","sections":[{"heading_en":"Accounts","heading_bn":"অ্যাকাউন্ট","body_en":"Synthetic rules only","body_bn":"পরীক্ষামূলক নিয়ম"}]}',public.get_terms_content());
grant select on terms_fixture to authenticated;
set local role anon;set local request.jwt.claims='{}';
select pg_temp.denied($$select public.admin_terms_state()$$);
select pg_temp.denied($$select * from public.terms_content$$);
select pg_temp.denied($$select public.admin_publish_terms(0)$$);
set local role authenticated;
set local request.jwt.claims='{"sub":"e9100000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.check_ok((select count(*)=0 from public.terms_content),'staff cannot read draft');
select pg_temp.check_ok((select count(*)=0 from public.terms_content_history),'staff cannot read history');
select pg_temp.denied($$select public.admin_terms_state()$$);
select pg_temp.denied($$select public.admin_save_terms((select config from terms_fixture),0)$$);
select pg_temp.denied($$update public.terms_content set revision=999$$);
set local request.jwt.claims='{"sub":"e9100000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.denied($$select public.admin_publish_terms(0)$$);
select pg_temp.check_ok((select count(*)=0 from public.terms_content),'buyer cannot read draft');
set local request.jwt.claims='{"sub":"e9100000-0000-4000-8000-000000000004","role":"authenticated"}';
select pg_temp.denied($$select public.admin_terms_state()$$);
select pg_temp.denied($$select public.admin_save_terms((select config from terms_fixture),0)$$);
set local request.jwt.claims='{"sub":"e9100000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.denied($$update public.terms_content set revision=999$$);
select public.admin_save_terms((select config from terms_fixture),(public.admin_terms_state()->>'revision')::int);
select pg_temp.check_ok(public.get_terms_content() is not distinct from (select baseline from terms_fixture),'saving does not publish');
select pg_temp.denied($$select public.admin_save_terms((select config from terms_fixture),-1)$$);
select pg_temp.denied($$select public.admin_publish_terms(-1)$$);
select pg_temp.denied($$select public.admin_save_terms((select jsonb_set(config,'{effective_date}','"2026-02-30"') from terms_fixture),(public.admin_terms_state()->>'revision')::int)$$);
select pg_temp.denied($$select public.admin_save_terms((select jsonb_set(config,'{sections}','{}') from terms_fixture),(public.admin_terms_state()->>'revision')::int)$$);
select public.admin_publish_terms((public.admin_terms_state()->>'revision')::int);
select pg_temp.check_ok(public.get_terms_content()->'content'=(select config from terms_fixture),'saved content published');
select public.admin_save_terms((select jsonb_set(config,'{title_en}','"Unpublished replacement"') from terms_fixture),(public.admin_terms_state()->>'revision')::int);
select pg_temp.check_ok(public.get_terms_content()->'content'->>'title_en'='Synthetic terms','later drafts do not replace published terms');
select public.admin_save_terms((select jsonb_set(config,'{sections,0,body_bn}','""') from terms_fixture),(public.admin_terms_state()->>'revision')::int);
select pg_temp.denied($$select public.admin_publish_terms((public.admin_terms_state()->>'revision')::int)$$);
select pg_temp.check_ok((select count(*)=4 from public.terms_content_history where actor_id=auth.uid()),'every successful mutation has immutable history');
select pg_temp.check_ok((select count(*)=4 from public.admin_audit_logs where admin_id=auth.uid() and action like 'terms_content.%'),'every successful mutation audited');
select pg_temp.denied($$delete from public.terms_content_history$$);
set local role anon;set local request.jwt.claims='{}';
select pg_temp.check_ok(public.get_terms_content()->'content'->>'title_en'='Synthetic terms','guests see published version only');
reset role;
rollback;
