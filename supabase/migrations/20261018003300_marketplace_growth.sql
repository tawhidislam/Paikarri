-- Additive sourcing and supplier enablement. No payment or shipping-state bypass.
create function public.catalog_facets(keyword text default null, category_slug text default null, division_filter text default null, district_filter text default null, min_price numeric default null, max_price numeric default null, max_moq integer default null, verified_only boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'categories',coalesce((select jsonb_object_agg(slug,n) from(select c.slug,count(*) n from public.search_products(keyword,null,division_filter,district_filter,min_price,max_price,max_moq,verified_only) p join public.categories c on c.id=p.category_id or c.id=(select parent_id from public.categories where id=p.category_id) group by c.slug) x),'{}'),
 'divisions',coalesce((select jsonb_object_agg(division,n) from(select b.division,count(*) n from public.search_products(keyword,category_slug,null,null,min_price,max_price,max_moq,verified_only)p join public.businesses b on b.id=p.business_id group by b.division)x),'{}'),
 'districts',coalesce((select jsonb_object_agg(district,n) from(select b.district,count(*) n from public.search_products(keyword,category_slug,division_filter,null,min_price,max_price,max_moq,verified_only)p join public.businesses b on b.id=p.business_id group by b.district)x),'{}'),
 'price_max',(select coalesce(max(price),0) from public.search_products(keyword,category_slug,division_filter,district_filter,null,null,max_moq,verified_only)));
$$;
create table public.buyer_organizations(
 user_id uuid primary key references public.profiles on delete cascade,
 name text not null check(length(trim(name)) between 2 and 160),
 business_type text not null check(business_type in('retailer','wholesaler','exporter','institution','other')),
 trade_license_number text not null default '' check(length(trade_license_number)<=100),
 address text not null default '' check(length(address)<=500),version int not null default 1,updated_at timestamptz not null default now());
alter table public.buyer_organizations enable row level security;
create policy buyer_organization_owner on public.buyer_organizations for select to authenticated using(user_id=auth.uid());
grant select on public.buyer_organizations to authenticated;
create function public.buyer_organization_save(expected_version int,payload jsonb) returns void language plpgsql security definer set search_path='' as $$declare current_version int;begin
 if auth.uid() is null or not coalesce(private.is_buyer(),false) or not coalesce(private.is_active(auth.uid()),false) then raise exception 'Active buyer required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,33));
 select version into current_version from public.buyer_organizations where user_id=auth.uid() for update;
 if coalesce(current_version,0) is distinct from expected_version then raise exception 'Business profile changed. Reload before saving' using errcode='40001';end if;
 insert into public.buyer_organizations(user_id,name,business_type,trade_license_number,address) values(auth.uid(),trim(payload->>'name'),payload->>'business_type',coalesce(payload->>'trade_license_number',''),coalesce(payload->>'address','')) on conflict(user_id) do update set name=excluded.name,business_type=excluded.business_type,trade_license_number=excluded.trade_license_number,address=excluded.address,version=buyer_organizations.version+1,updated_at=now();
end$$;
create function public.buyer_organization_context(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not (auth.uid()=target or exists(select 1 from public.conversations c join public.businesses b on b.id=c.business_id where c.buyer_id=target and b.owner_id=auth.uid()) or exists(select 1 from public.sourcing_requests r join public.businesses b on b.id=r.business_id where r.buyer_id=target and b.owner_id=auth.uid())) then raise exception 'Participant access required' using errcode='42501';end if;
 return(select jsonb_build_object('name',name,'business_type',business_type) from public.buyer_organizations where user_id=target);
end$$;
create table public.shipping_presets(
 business_id uuid primary key references public.businesses on delete cascade, enabled boolean not null default false,
 inside_dhaka_base numeric(12,2) not null default 0 check(inside_dhaka_base between 0 and 1000000),outside_dhaka_base numeric(12,2) not null default 0 check(outside_dhaka_base between 0 and 1000000),per_kg_surcharge numeric(12,2) not null default 0 check(per_kg_surcharge between 0 and 100000),free_shipping_threshold numeric(14,2) check(free_shipping_threshold>0),carrier_preference text not null default 'self' check(carrier_preference in('steadfast','sundarban','pathao','sa_paribahan','self')),version int not null default 1,updated_at timestamptz not null default now());
alter table public.shipping_presets enable row level security;
create policy shipping_presets_owner on public.shipping_presets for select to authenticated using(private.owns_business(business_id));
grant select on public.shipping_presets to authenticated;
create function public.shipping_preset_save(target uuid,expected_version int,payload jsonb) returns void language plpgsql security definer set search_path='' as $$declare current_version int;begin
 if auth.uid() is null or not coalesce(private.is_supplier(),false) or not coalesce(private.is_active(auth.uid()),false) or not private.owns_business(target) then raise exception 'Active owning supplier required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(target::text,33));select version into current_version from public.shipping_presets where business_id=target for update;
 if coalesce(current_version,0) is distinct from expected_version then raise exception 'Shipping settings changed. Reload before saving' using errcode='40001';end if;
 insert into public.shipping_presets(business_id,enabled,inside_dhaka_base,outside_dhaka_base,per_kg_surcharge,free_shipping_threshold,carrier_preference) values(target,(payload->>'enabled')::boolean,(payload->>'inside_dhaka_base')::numeric,(payload->>'outside_dhaka_base')::numeric,(payload->>'per_kg_surcharge')::numeric,nullif(payload->>'free_shipping_threshold','')::numeric,payload->>'carrier_preference') on conflict(business_id) do update set enabled=excluded.enabled,inside_dhaka_base=excluded.inside_dhaka_base,outside_dhaka_base=excluded.outside_dhaka_base,per_kg_surcharge=excluded.per_kg_surcharge,free_shipping_threshold=excluded.free_shipping_threshold,carrier_preference=excluded.carrier_preference,version=shipping_presets.version+1,updated_at=now();
end$$;
create function public.public_shipping_presets(target uuid) returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(s)-'version'-'updated_at' from public.shipping_presets s where business_id=target and enabled and private.business_active(target) and exists(select 1 from public.products p where p.business_id=target and p.status='approved');$$;
create function public.supplier_bulk_products(payload jsonb) returns uuid[] language plpgsql security definer set search_path='' as $$declare item jsonb;ids uuid[]='{}';begin
 if auth.uid() is null or not coalesce(private.is_supplier(),false) or not coalesce(private.is_active(auth.uid()),false) then raise exception 'Active supplier required' using errcode='42501';end if;
 perform private.consume_limit('bulk_products',5,3600);
 if jsonb_typeof(payload) is distinct from 'array' or jsonb_array_length(payload) not between 1 and 100 or octet_length(payload::text)>2097152 then raise exception 'Import between 1 and 100 products';end if;
 for item in select * from jsonb_array_elements(payload) loop
 if item ? 'id' then raise exception 'Bulk import creates new drafts only';end if;
 ids=array_append(ids,public.save_product(item));end loop;return ids;
end$$;
create function public.supplier_performance() returns jsonb language plpgsql stable security definer set search_path='' as $$declare bid uuid;begin
 select id into bid from public.businesses where owner_id=auth.uid();if bid is null or not private.is_supplier() then raise exception 'Supplier required' using errcode='42501';end if;
 return jsonb_build_object('inquiries',(select count(*) from public.conversations where business_id=bid),
 'responded',(select count(*) from public.conversations c where c.business_id=bid and exists(select 1 from public.messages m where m.conversation_id=c.id and m.sender_id=auth.uid())),
 'responded_within_two_hours',(select count(*) from public.conversations c where c.business_id=bid and (select min(created_at) from public.messages m where m.conversation_id=c.id and m.sender_id=auth.uid())<=(select min(created_at)+interval '2 hours' from public.messages m where m.conversation_id=c.id and m.sender_id<>auth.uid())),
 'orders',(select count(*) from public.orders where business_id=bid),'completed',(select count(*) from public.orders where business_id=bid and status='completed'),
 'average_delivery_days',(select round(avg(extract(epoch from(completed_at-created_at))/86400)::numeric,1) from public.orders where business_id=bid and status='completed'));
end$$;
-- Narrow privilege grants; no unprotected client-side role decisions.
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('catalog_facets','buyer_organization_save','buyer_organization_context','shipping_preset_save','public_shipping_presets','supplier_bulk_products','supplier_performance') loop execute format('revoke all on function %s from public,anon,authenticated',f);execute format('grant execute on function %s to authenticated',f);end loop;end$$;
grant execute on function public.catalog_facets(text,text,text,text,numeric,numeric,integer,boolean),public.public_shipping_presets(uuid) to anon;
create function public.buyer_organization_get() returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(o)-'user_id' from public.buyer_organizations o where user_id=auth.uid();$$;
create function public.shipping_preset_get() returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(s) from public.shipping_presets s where private.owns_business(business_id);$$;
revoke all on function public.buyer_organization_get(),public.shipping_preset_get() from public,anon;
grant execute on function public.buyer_organization_get(),public.shipping_preset_get() to authenticated;
-- Search history is private and synchronized only for signed-in accounts.
create table public.account_search_history(user_id uuid not null references public.profiles on delete cascade,query text not null check(length(query) between 2 and 160),searched_at timestamptz not null default now(),primary key(user_id,query));
alter table public.account_search_history enable row level security;
revoke all on public.account_search_history from public,anon,authenticated;
grant all on public.account_search_history to service_role;
create function public.search_history(operation text default 'list',query_text text default null) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if operation is null or operation not in('list','record','clear') then raise exception 'Invalid history operation';end if;
 if operation='record' then
  if query_text is null or length(trim(query_text)) not between 2 and 160 then raise exception 'Invalid search';end if;
  perform private.consume_limit('search_history',60,60);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,34));
  insert into public.account_search_history(user_id,query) values(auth.uid(),trim(query_text)) on conflict(user_id,query) do update set searched_at=now();
  delete from public.account_search_history where user_id=auth.uid() and query not in(select query from public.account_search_history where user_id=auth.uid() order by searched_at desc,query limit 10);
 elsif operation='clear' then delete from public.account_search_history where user_id=auth.uid();end if;
 return(select coalesce(jsonb_agg(query order by searched_at desc,query),'[]') from public.account_search_history where user_id=auth.uid());
end$$;
revoke all on function public.search_history(text,text) from public,anon;
grant execute on function public.search_history(text,text) to authenticated;
