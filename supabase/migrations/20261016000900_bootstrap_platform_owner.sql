-- Explicit owner authorization for this linked project. No ongoing email-based access.
do $$
 declare owner_id uuid := '577ea4d7-d6b4-4e9d-b84b-64b6cd083c02'; before_role text;
 begin
 if not exists(select 1 from auth.users where id=owner_id and lower(email)='mdtawhid1318@gmail.com' and email_confirmed_at is not null) then
 raise exception 'Owner bootstrap requires the designated existing, verified Auth account';end if;
 select role into before_role from public.user_roles where user_id=owner_id for update;
 if before_role not in ('admin','super_admin') or before_role is null then raise exception 'Owner must already be an explicitly approved administrator';end if;
 if before_role='admin' then
 update public.user_roles set role='super_admin' where user_id=owner_id;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(null,'account.bootstrap_super_admin',owner_id,jsonb_build_object('operator','linked-project migration','reason','Explicit owner-approved dedicated console rollout','before',jsonb_build_object('role',before_role),'after',jsonb_build_object('role','super_admin')));
 end if;
 end $$;
