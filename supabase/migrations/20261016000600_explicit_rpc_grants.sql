-- Supabase Cloud may assign explicit default EXECUTE grants to API roles.
-- Revoking PUBLIC alone does not remove those role-specific grants.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin(), private.is_buyer(),private.is_supplier(),private.owns_business(uuid),private.owns_product(uuid),private.in_conversation(uuid) to anon,authenticated;
revoke all on function public.register_supplier(),public.moderate_product(uuid,text,text),public.review_verification(uuid,text,text),public.resolve_report(uuid,text),public.save_product(jsonb) from public,anon,authenticated;
grant execute on function public.register_supplier(),public.moderate_product(uuid,text,text),public.review_verification(uuid,text,text),public.resolve_report(uuid,text),public.save_product(jsonb) to authenticated;
-- Supabase's baseline event-trigger helper is not an application RPC.
do $$ begin if to_regprocedure('public.rls_auto_enable()') is not null then execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated'; end if;end $$;
