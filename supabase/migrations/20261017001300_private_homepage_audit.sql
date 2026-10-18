-- Homepage audit snapshots contain private drafts. Preserve their full history
-- for the owner without exposing it through staff audit SELECTs or definer RPCs.
alter policy audit_read on public.admin_audit_logs using(private.is_admin() and (action not like 'homepage_content.%' or private.is_super_admin()));
create or replace function public.admin_list(kind text, filters jsonb default '{}', page integer default 1, page_size integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 elsif kind='audit' then base=$q$select to_jsonb(a)||jsonb_build_object('actor',u.email) row from public.admin_audit_logs a left join auth.users u on u.id=a.admin_id where a.action not like 'homepage_content.%' or private.is_super_admin()$q$;
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
