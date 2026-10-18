-- Public, bounded autocomplete over the same approved/active catalog as browsing.
-- Tokenize through PostgreSQL first; no user text is interpolated as SQL or query syntax.
create function private.catalog_prefix_query(keyword text) returns tsquery language sql immutable set search_path='' as $$
 select case when phrase is null then null else to_tsquery('simple',phrase) end
 from(select string_agg(quote_literal(token)||':*',' & ') phrase from(select unnest(tsvector_to_array(to_tsvector('simple',left(coalesce(keyword,''),160)))) token limit 12)tokens)q;
$$;
revoke all on function private.catalog_prefix_query(text) from public,anon,authenticated;
grant execute on function private.catalog_prefix_query(text) to anon,authenticated;
create or replace function public.search_products(keyword text default null, category_slug text default null, division_filter text default null, district_filter text default null, min_price numeric default null, max_price numeric default null, max_moq integer default null, verified_only boolean default false)
returns setof public.products language sql stable security invoker set search_path='' as $$
 select p.* from public.products p join public.businesses b on b.id=p.business_id join public.categories category on category.id=p.category_id
 where p.status='approved' and private.business_active(p.business_id)
 and (nullif(trim(keyword),'') is null
 or p.search_vector @@ private.catalog_prefix_query(keyword)
 or position(lower(left(trim(keyword),160)) in lower(p.name||' '||p.name_bn))>0
 or to_tsvector('simple',category.name||' '||category.name_bn) @@ private.catalog_prefix_query(keyword)
 or to_tsvector('simple',b.name||' '||b.name_bn) @@ private.catalog_prefix_query(keyword))
 and (nullif(category_slug,'') is null or p.category_id in(select c.id from public.categories c where c.slug=category_slug or c.parent_id=(select id from public.categories where slug=category_slug)))
 and (nullif(division_filter,'') is null or b.division=division_filter)
 and (nullif(district_filter,'') is null or b.district=district_filter)
 and (min_price is null or p.price>=min_price) and(max_price is null or p.price<=max_price)
 and(max_moq is null or p.moq<=max_moq) and(not verified_only or b.verified);
$$;
create function public.search_suggestions(keyword text) returns jsonb language plpgsql stable security invoker set search_path='' as $$declare term text;query_value tsquery;result jsonb;begin
 if keyword is null or char_length(trim(keyword))<2 then return jsonb_build_object('products','[]'::jsonb,'categories','[]'::jsonb);end if;
 if char_length(keyword)>160 then raise exception 'Search supports up to 160 characters' using errcode='22023';end if;
 term=lower(trim(regexp_replace(keyword,'[[:space:]]+',' ','g')));query_value=private.catalog_prefix_query(term);
 with eligible as materialized(select * from public.search_products(term)),
 ranked as(select p.id,p.name,p.name_bn,p.price,p.unit,p.moq,p.stock,b.name supplier_name,b.name_bn supplier_name_bn,
 (select i.path from public.product_images i where i.product_id=p.id order by i.position,i.id limit 1) image,
 case when lower(p.name)=term or lower(p.name_bn)=term then 0 when starts_with(lower(p.name),term) or starts_with(lower(p.name_bn),term) then 1 when to_tsvector('simple',p.name||' '||p.name_bn)@@query_value then 2 else 3 end relevance,
 ts_rank_cd(p.search_vector,query_value) rank_value,p.created_at
 from eligible p join public.businesses b on b.id=p.business_id
 order by relevance,rank_value desc,p.created_at desc,p.id limit 6),
 matching_categories as(select c.id,c.name,c.name_bn,c.slug from public.categories c
 where(position(term in lower(c.name||' '||c.name_bn||' '||c.slug))>0 or to_tsvector('simple',c.name||' '||c.name_bn)@@query_value)
 and exists(select 1 from public.public_products() p where p.category_id=c.id or p.category_id in(select child.id from public.categories child where child.parent_id=c.id))
 order by case when lower(c.name)=term or lower(c.name_bn)=term then 0 else 1 end,c.name,c.id limit 4)
 select jsonb_build_object('products',coalesce((select jsonb_agg(to_jsonb(r)-'relevance'-'rank_value'-'created_at' order by relevance,rank_value desc,created_at desc,id) from ranked r),'[]'),
 'categories',coalesce((select jsonb_agg(c) from matching_categories c),'[]')) into result;return result;
end$$;
revoke all on function public.search_suggestions(text) from public,anon,authenticated;
grant execute on function public.search_suggestions(text) to anon,authenticated;
