-- Filtering happens in PostgreSQL before pagination; no client-side row caps.
create function public.search_products(keyword text default null, category_slug text default null, division_filter text default null, district_filter text default null, min_price numeric default null, max_price numeric default null, max_moq integer default null, verified_only boolean default false)
returns setof public.products language sql stable security invoker set search_path='' as $$
 select p.* from public.products p join public.businesses b on b.id=p.business_id
 where p.status='approved'
 and (nullif(keyword,'') is null or p.search_vector @@ websearch_to_tsquery('simple',keyword))
 and (nullif(category_slug,'') is null or p.category_id in (select c.id from public.categories c where c.slug=category_slug or c.parent_id=(select id from public.categories where slug=category_slug)))
 and (nullif(division_filter,'') is null or b.division=division_filter)
 and (nullif(district_filter,'') is null or b.district=district_filter)
 and (min_price is null or p.price>=min_price) and (max_price is null or p.price<=max_price)
 and (max_moq is null or p.moq<=max_moq) and (not verified_only or b.verified);
$$;
revoke all on function public.search_products(text,text,text,text,numeric,numeric,integer,boolean) from public;
grant execute on function public.search_products(text,text,text,text,numeric,numeric,integer,boolean) to anon,authenticated;
create function private.audit_category() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is not null and private.is_admin() then
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'category.'||lower(TG_OP),case when TG_OP='DELETE' then old.id else new.id end,jsonb_build_object('name',case when TG_OP='DELETE' then old.name else new.name end));
 end if;return null;
 end; $$;
revoke all on function private.audit_category() from public;
create trigger audit_category after insert or update or delete on public.categories for each row execute function private.audit_category();
-- Ownership predicates use these FKs when checking participant access.
create index favorites_product_idx on public.favorites(product_id);
create index saved_suppliers_business_idx on public.saved_suppliers(business_id);
create index quotation_product_idx on public.quotation_requests(product_id);
create index messages_sender_idx on public.messages(sender_id);
create index reports_reporter_idx on public.reports(reporter_id);
create index audit_admin_idx on public.admin_audit_logs(admin_id);
create index verifications_reviewer_idx on public.supplier_verifications(reviewed_by);
