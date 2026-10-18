-- Dedicated console. No user data is removed. Cloud-only migration.
alter table public.user_roles drop constraint user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check(role in ('buyer','supplier','admin','super_admin'));
create table public.account_statuses (
 user_id uuid primary key references public.profiles on delete cascade,
 status text not null default 'active' check(status in ('active','suspended')),
 reason text not null default '' check(length(reason)<=2000),
 changed_by uuid references public.profiles, updated_at timestamptz not null default now()
);
insert into public.account_statuses(user_id) select id from public.profiles;
create table public.platform_settings (
 id uuid primary key default '00000000-0000-0000-0000-000000000001' check(id='00000000-0000-0000-0000-000000000001'),
 name_en text not null default 'Paikari' check(length(name_en) between 2 and 100),
 name_bn text not null default 'পাইকারি' check(length(name_bn) between 2 and 100),
 tagline_en text not null default 'Bangladesh, in business.' check(length(tagline_en)<=200),
 tagline_bn text not null default 'বাংলাদেশের ব্যবসার সঙ্গী।' check(length(tagline_bn)<=200),
 support_email text not null default '' check(support_email='' or support_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 support_phone text not null default '' check(length(support_phone)<=30),
 default_locale text not null default 'en' check(default_locale in ('en','bn')),
 supplier_registration_open boolean not null default true, updated_at timestamptz not null default now()
);
insert into public.platform_settings default values;
alter table public.account_statuses enable row level security;
alter table public.platform_settings enable row level security;
revoke all on public.account_statuses,public.platform_settings from anon,authenticated;
grant select on public.account_statuses to authenticated;
grant select on public.platform_settings to anon,authenticated;
grant all on public.account_statuses,public.platform_settings to service_role;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('admin','super_admin')); $$;
create function private.is_super_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role='super_admin'); $$;
create function private.is_active(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.account_statuses where user_id=uid and status='suspended'); $$;
create function private.business_active(bid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses where id=bid and private.is_active(owner_id)); $$;
create function private.public_business(bid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses b where b.id=bid and private.is_active(b.owner_id)
 and (b.verified or exists(select 1 from public.products p where p.business_id=b.id and p.status='approved'))); $$;
create policy statuses_read on public.account_statuses for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy settings_read on public.platform_settings for select using(true);
create function private.signup_status() returns trigger language plpgsql security definer set search_path='' as $$
 begin insert into public.account_statuses(user_id) values(new.id);return new;end; $$;
create trigger signup_status after insert on public.profiles for each row execute function private.signup_status();
-- Public paths never reveal a suspended supplier; ownership reads remain for remediation.
alter policy businesses_read on public.businesses using(private.public_business(id) or private.owns_business(id) or private.is_admin());
alter policy products_read on public.products using((status='approved' and private.business_active(business_id)) or private.owns_business(business_id) or private.is_admin());
alter policy categories_admin on public.categories using(private.is_super_admin()) with check(private.is_super_admin());
-- A trigger also protects direct CRUD and the atomic save_product RPC, including deletes.
create function private.guard_suspended_listing() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is not null and not private.is_admin() and not private.is_active(auth.uid()) then
 raise exception 'Account suspended: product management is restricted' using errcode='42501'; end if;
 if TG_OP='DELETE' then return old; else return new;end if;end; $$;
create trigger suspended_products before insert or update or delete on public.products for each row execute function private.guard_suspended_listing();
create trigger suspended_images before insert or update or delete on public.product_images for each row execute function private.guard_suspended_listing();
create trigger suspended_tiers before insert or update or delete on public.product_price_tiers for each row execute function private.guard_suspended_listing();
alter policy product_assets_read on storage.objects using(bucket_id='product-images' and (private.is_admin() or (storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.path=storage.objects.name and p.status='approved' and private.business_active(p.business_id))));
alter policy product_assets_upload on storage.objects with check(bucket_id='product-images' and private.is_active(auth.uid()) and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[2] and private.owns_business(p.business_id)));
alter policy product_assets_delete on storage.objects using(bucket_id='product-images' and private.is_active(auth.uid()) and (storage.foldername(name))[1]=auth.uid()::text);
create or replace function private.guard_inquiry() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 perform private.consume_limit(TG_TABLE_NAME,case when TG_TABLE_NAME='messages' then 30 else 10 end,60);
 if TG_TABLE_NAME<>'messages' and not private.is_active(auth.uid()) then raise exception 'Account suspended: new interactions are restricted' using errcode='42501';end if;
 if TG_TABLE_NAME='quotation_requests' then
 if not exists(select 1 from public.products where id=new.product_id and business_id=new.business_id and status='approved' and private.business_active(business_id) and new.quantity>=moq) then raise exception 'Invalid product, suspended supplier, or quantity below MOQ'; end if;
 elsif TG_TABLE_NAME='conversations' then
 if not private.public_business(new.business_id) then raise exception 'Supplier unavailable';end if;
 end if;return new;end; $$;
create or replace function public.register_supplier() returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if private.is_supplier() then return;end if;
 if not private.is_active(auth.uid()) then raise exception 'Account suspended' using errcode='42501';end if;
 if not (select supplier_registration_open from public.platform_settings) then raise exception 'Supplier registration is currently paused';end if;
 update public.user_roles set role='supplier' where user_id=auth.uid() and role='buyer';
 if not found then raise exception 'Buyer account required';end if;end; $$;
-- Transactional, complete before/after audit snapshots for privileged changes.
create function private.audit_console() returns trigger language plpgsql security definer set search_path='' as $$
 declare before_row jsonb;after_row jsonb;target uuid;
 begin
 if not private.is_admin() then return null;end if;
 if TG_OP<>'INSERT' then before_row=to_jsonb(old);end if;
 if TG_OP<>'DELETE' then after_row=to_jsonb(new);end if;
 target=coalesce(after_row->>'id',after_row->>'user_id',before_row->>'id',before_row->>'user_id')::uuid;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),TG_TABLE_NAME||'.'||lower(TG_OP),target,jsonb_build_object('before',before_row,'after',after_row));return null;end; $$;
drop trigger audit_category on public.categories;
do $$ declare t text;begin foreach t in array array['categories','products','supplier_verifications','reports','businesses','user_roles','account_statuses','platform_settings'] loop
 execute format('create trigger console_audit after insert or update or delete on public.%I for each row execute function private.audit_console()',t);end loop;end $$;
create function public.admin_set_account_status(target uuid, new_status text, reason text) returns void language plpgsql security definer set search_path='' as $$
 declare account_role text;
 begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 if new_status not in ('active','suspended') or length(trim(reason)) not between 5 and 2000 then raise exception 'Status and reason (5–2000 characters) required';end if;
 select role into account_role from public.user_roles where user_id=target for update;
 if account_role is null or account_role not in ('buyer','supplier') then raise exception 'Only buyer and supplier accounts may be suspended or reactivated';end if;
 insert into public.account_statuses(user_id,status,reason,changed_by) values(target,new_status,trim(reason),auth.uid())
 on conflict(user_id) do update set status=excluded.status,reason=excluded.reason,changed_by=excluded.changed_by,updated_at=now();end; $$;
create function public.admin_set_staff(target uuid, grant_access boolean, reason text) returns void language plpgsql security definer set search_path='' as $$
 declare r text;
 begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 if grant_access is null or reason is null or length(trim(reason)) not between 5 and 2000 then raise exception 'Reason required (5–2000 characters)';end if;
 select role into r from public.user_roles where user_id=target for update;
 if (grant_access and r is distinct from 'buyer') or (not grant_access and r is distinct from 'admin') then raise exception 'Grant requires a buyer; revoke requires a staff admin';end if;
 if not private.is_active(target) or not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) then raise exception 'An active verified account is required';end if;
 update public.user_roles set role=case when grant_access then 'admin' else 'buyer' end where user_id=target;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'staff.reason',target,jsonb_build_object('reason',trim(reason),'grant_access',grant_access));end; $$;
create function public.admin_update_settings(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 update public.platform_settings set name_en=payload->>'name_en',name_bn=payload->>'name_bn',tagline_en=payload->>'tagline_en',tagline_bn=payload->>'tagline_bn',support_email=payload->>'support_email',support_phone=payload->>'support_phone',default_locale=payload->>'default_locale',supplier_registration_open=(payload->>'supplier_registration_open')::boolean,updated_at=now();end; $$;
-- Explicit projection from Auth: never return its row, encrypted passwords, identities or tokens.
create function public.admin_list(kind text, filters jsonb default '{}', page integer default 1, page_size integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare base text;result jsonb;
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if page<1 or page_size<1 or page_size>100 or page>100000 then raise exception 'Invalid pagination';end if;
 if kind in ('accounts','suppliers','staff') then
 base=$q$select jsonb_build_object('id',p.id,'full_name',p.full_name,'phone',p.phone,'email',u.email,'email_confirmed_at',u.email_confirmed_at,'last_sign_in_at',u.last_sign_in_at,'created_at',p.created_at,'role',r.role,'status',coalesce(s.status,'active'),'reason',coalesce(s.reason,''),'business_id',b.id,'name',b.name,'division',b.division,'district',b.district,'verified',b.verified) row from public.profiles p join auth.users u on u.id=p.id join public.user_roles r on r.user_id=p.id left join public.account_statuses s on s.user_id=p.id left join public.businesses b on b.owner_id=p.id where $q$ || case kind when 'suppliers' then 'r.role=''supplier''' when 'staff' then 'r.role in (''admin'',''super_admin'')' else 'true' end;
 elsif kind='products' then
 base=$q$select to_jsonb(p)-'search_vector' || jsonb_build_object('moderation_note',coalesce(n.note,''),'supplier_name',b.name,'images',coalesce((select jsonb_agg(to_jsonb(i) order by i.position) from public.product_images i where i.product_id=p.id),'[]'),'tiers',coalesce((select jsonb_agg(to_jsonb(t) order by t.min_quantity) from public.product_price_tiers t where t.product_id=p.id),'[]')) row from public.products p join public.businesses b on b.id=p.business_id left join public.product_moderation_notes n on n.product_id=p.id$q$;
 elsif kind='verifications' then
 base=$q$select to_jsonb(v)||jsonb_build_object('name',b.name,'owner_id',b.owner_id,'division',b.division) row from public.supplier_verifications v join public.businesses b on b.id=v.business_id$q$;
 elsif kind='reports' then base=$q$select to_jsonb(r)||jsonb_build_object('name',p.name) row from public.reports r join public.products p on p.id=r.product_id$q$;
 elsif kind='categories' then base=$q$select to_jsonb(c)||jsonb_build_object('parent_name',p.name) row from public.categories c left join public.categories p on p.id=c.parent_id$q$;
 elsif kind='audit' then base=$q$select to_jsonb(a)||jsonb_build_object('actor',u.email) row from public.admin_audit_logs a left join auth.users u on u.id=a.admin_id$q$;
 else raise exception 'Unknown management list';end if;
 execute 'with filtered as materialized (select row from ('||base||') x where
 (coalesce($1->>''q'','''')='''' or concat_ws('' '',row->>''name'',row->>''full_name'',row->>''email'',row->>''action'',row->>''entity_id'',row->>''actor'',row->>''id'') ilike ''%''||left(($1->>''q''),200)||''%'')
 and (coalesce($1->>''status'','''')='''' or row->>''status''=$1->>''status'')
 and (coalesce($1->>''role'','''')='''' or row->>''role''=$1->>''role'')
 and (coalesce($1->>''division'','''')='''' or row->>''division''=$1->>''division'')
 and (coalesce($1->>''verified'','''')='''' or row->>''verified''=$1->>''verified'')
 and (coalesce($1->>''business_id'','''')='''' or row->>''business_id''=$1->>''business_id'')
 and (coalesce($1->>''id'','''')='''' or row->>''id''=$1->>''id'')
 and (coalesce($1->>''actor'','''')='''' or row->>''actor'' ilike ''%''||($1->>''actor'')||''%'')
 and (coalesce($1->>''action'','''')='''' or row->>''action'' ilike ''%''||($1->>''action'')||''%'')
 and (coalesce($1->>''target'','''')='''' or row->>''entity_id''=$1->>''target'')
 and (coalesce($1->>''from'','''')='''' or (row->>''created_at'')::timestamptz>=($1->>''from'')::date::timestamp at time zone ''Asia/Dhaka'')
 and (coalesce($1->>''to'','''')='''' or (row->>''created_at'')::timestamptz<(($1->>''to'')::date+1)::timestamp at time zone ''Asia/Dhaka''))
 select jsonb_build_object(''total'',(select count(*) from filtered),''rows'',coalesce((select jsonb_agg(row) from (select row from filtered order by row->>''created_at'' desc nulls last,row->>''id'' limit $2 offset $3) paged),''[]''::jsonb))'
 into result using filters,page_size,(page-1)*page_size;return result;end; $$;
create function public.admin_supplier_detail(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 return (select jsonb_build_object('business',to_jsonb(b),'products',(select count(*) from public.products where business_id=b.id),'quotations',(select count(*) from public.quotation_requests where business_id=b.id),'conversations',(select count(*) from public.conversations where business_id=b.id)) from public.businesses b where b.id=target);end; $$;
create function public.admin_statistics(days integer default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if days not in (7,30,90) then raise exception 'Invalid trend range';end if;
 return jsonb_build_object('counts',jsonb_build_object('Accounts',(select count(*) from public.profiles),'Suppliers',(select count(*) from public.businesses),'Products',(select count(*) from public.products),'Quotations',(select count(*) from public.quotation_requests),'Pending products',(select count(*) from public.products where status='pending'),'Pending verifications',(select count(*) from public.supplier_verifications where status='pending'),'Open reports',(select count(*) from public.reports where status='open'),'Suspended accounts',(select count(*) from public.account_statuses where status='suspended')),
 'trends',(select jsonb_agg(jsonb_build_object('date',d::date,'registrations',(select count(*) from public.profiles where (created_at at time zone 'Asia/Dhaka')::date=d::date),'suppliers',(select count(*) from public.businesses where (created_at at time zone 'Asia/Dhaka')::date=d::date),'products',(select count(*) from public.products where (created_at at time zone 'Asia/Dhaka')::date=d::date),'quotations',(select count(*) from public.quotation_requests where (created_at at time zone 'Asia/Dhaka')::date=d::date)) order by d) from generate_series((now() at time zone 'Asia/Dhaka')::date-days+1,(now() at time zone 'Asia/Dhaka')::date,'1 day') d));end; $$;
-- Historical labels are exposed only through actual participation; private chat RLS is unchanged.
create function public.participant_context() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('businesses',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name)) from public.businesses b where b.owner_id=auth.uid() or exists(select 1 from public.conversations c where c.business_id=b.id and c.buyer_id=auth.uid()) or exists(select 1 from public.quotation_requests q where q.business_id=b.id and q.buyer_id=auth.uid())),'[]'),
 'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name)) from public.products p join public.businesses b on b.id=p.business_id where exists(select 1 from public.quotation_requests q where q.product_id=p.id and (q.buyer_id=auth.uid() or b.owner_id=auth.uid()))),'[]')); $$;
-- Revoke Supabase default explicit EXECUTE privileges as well as PUBLIC.
do $$ declare f record;begin for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('admin_list','admin_supplier_detail','admin_statistics','admin_set_account_status','admin_set_staff','admin_update_settings','participant_context')) or (n.nspname='private' and p.proname in ('is_super_admin','is_active','business_active','public_business','signup_status','audit_console','guard_suspended_listing')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname like 'admin_%' or f.proname='participant_context' then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;end $$;
grant execute on function private.is_super_admin(),private.is_active(uuid),private.business_active(uuid),private.public_business(uuid) to anon,authenticated;
create index account_status_state_idx on public.account_statuses(status);
create index audit_created_idx on public.admin_audit_logs(created_at desc);
create index profiles_created_idx on public.profiles(created_at desc);
create function public.get_platform_settings() returns jsonb language sql stable security invoker set search_path='' as $$ select to_jsonb(s) from public.platform_settings s; $$;
create function public.get_account_status() returns jsonb language sql stable security invoker set search_path='' as $$ select to_jsonb(s) from public.account_statuses s where user_id=auth.uid(); $$;
revoke all on function public.get_platform_settings(),public.get_account_status() from public,anon,authenticated;
grant execute on function public.get_platform_settings() to anon,authenticated;
grant execute on function public.get_account_status() to authenticated;
create function public.admin_resolve_report(target uuid, decision text, note text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if decision not in ('resolved','dismissed') or length(trim(note)) not between 5 and 2000 then raise exception 'Decision and reason required';end if;
 perform public.resolve_report(target,decision);
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'report.decision',target,jsonb_build_object('decision',decision,'note',note));end; $$;
revoke all on function public.admin_resolve_report(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_resolve_report(uuid,text,text) to authenticated;
