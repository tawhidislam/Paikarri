create or replace function public.search_products(keyword text default null, category_slug text default null, division_filter text default null, district_filter text default null, min_price numeric default null, max_price numeric default null, max_moq integer default null, verified_only boolean default false)
returns setof public.products language sql stable security invoker set search_path='' as $$
 select p.* from public.products p join public.businesses b on b.id=p.business_id
 where p.status='approved' and private.business_active(p.business_id)
 and (nullif(keyword,'') is null or p.search_vector @@ websearch_to_tsquery('simple',keyword))
 and (nullif(category_slug,'') is null or p.category_id in (select c.id from public.categories c where c.slug=category_slug or c.parent_id=(select id from public.categories where slug=category_slug)))
 and (nullif(division_filter,'') is null or b.division=division_filter)
 and (nullif(district_filter,'') is null or b.district=district_filter)
 and (min_price is null or p.price>=min_price) and (max_price is null or p.price<=max_price)
 and (max_moq is null or p.moq<=max_moq) and (not verified_only or b.verified);
$$;
-- Public routes use explicit eligible-catalog projections even for signed-in
-- operators. Administrative review still uses protected management queries.
create function public.public_products() returns setof public.products language sql stable security invoker set search_path='' as $$
 select p.* from public.products p where p.status='approved' and private.business_active(p.business_id); $$;
create function public.public_businesses() returns setof public.businesses language sql stable security invoker set search_path='' as $$
 select b.* from public.businesses b where private.public_business(b.id); $$;
revoke all on function public.public_products(),public.public_businesses() from public,anon,authenticated;
grant execute on function public.public_products(),public.public_businesses() to anon,authenticated;
