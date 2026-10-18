-- Normalize before enforcing minimum length, including direct RPC requests.
create or replace function public.search_suggestions(keyword text) returns jsonb language plpgsql stable security invoker set search_path='' as $$declare term text;query_value tsquery;result jsonb;begin
 if char_length(keyword)>160 then raise exception 'Search supports up to 160 characters' using errcode='22023';end if;
 term=lower(trim(regexp_replace(coalesce(keyword,''),'[[:space:]]+',' ','g')));
 if char_length(term)<2 then return jsonb_build_object('products','[]'::jsonb,'categories','[]'::jsonb);end if;
 query_value=private.catalog_prefix_query(term);
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
