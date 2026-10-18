-- Trusted identity-review triggers must still invalidate approved listings when
-- suspended suppliers correct their business identity. Direct supplier CRUD
-- remains blocked, including invoker save_product() calls.
create or replace function private.guard_suspended_listing() returns trigger language plpgsql security invoker set search_path='' as $$
 begin
 if current_user not in ('postgres','supabase_admin') and auth.uid() is not null and not private.is_admin() and not private.is_active(auth.uid()) then
 raise exception 'Account suspended: product management is restricted' using errcode='42501';end if;
 if TG_OP='DELETE' then return old;else return new;end if;end; $$;
revoke all on function private.guard_suspended_listing() from public,anon,authenticated;
