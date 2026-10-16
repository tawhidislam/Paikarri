-- Cloud-only initial schema. Non-destructive: fails if marketplace tables already exist.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 full_name text not null default '' check(char_length(full_name)<=120),
 phone text check(phone ~ '^\+?8801[3-9][0-9]{8}$'),
 avatar_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid primary key references public.profiles on delete cascade,
 role text not null default 'buyer' check(role in ('buyer','supplier','admin'))
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references public.profiles on delete cascade,
 name text not null check(char_length(name) between 2 and 160), name_bn text not null default '',
 description text not null default '' check(char_length(description)<=10000),
 division text not null, district text not null, address text not null default '',
 contact_phone text not null default '', website text not null default '',
 verified boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), parent_id uuid references public.categories,
 name text not null, name_bn text not null, slug text not null unique check(slug ~ '^[a-z0-9-]+$'), icon text not null default 'Package',
 check(parent_id is distinct from id)
);
create table public.products (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses on delete cascade,
 category_id uuid not null references public.categories, name text not null check(char_length(name) between 3 and 200),
 name_bn text not null default '', description text not null check(char_length(description) between 10 and 20000),
 price numeric(14,2) not null check(price>0), moq integer not null check(moq>0),
 stock integer not null default 0 check(stock>=0), unit text not null default 'piece' check(char_length(unit) between 1 and 30),
 specifications jsonb not null default '{}'::jsonb check(jsonb_typeof(specifications)='object'),
 status text not null default 'pending' check(status in ('draft','pending','approved','rejected','archived')),
 moderation_note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_vector tsvector generated always as (to_tsvector('simple',coalesce(name,'') || ' ' || coalesce(name_bn,'') || ' ' || coalesce(description,''))) stored
);
create table public.product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade,
 path text not null unique, position integer not null default 0 check(position>=0)
);
create table public.product_price_tiers (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade,
 min_quantity integer not null check(min_quantity>0), price numeric(14,2) not null check(price>0), unique(product_id,min_quantity)
);
create table public.supplier_verifications (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses on delete cascade,
 document_path text not null, document_type text not null check(document_type in ('trade_license','tax_certificate','registration')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 review_note text not null default '', reviewed_by uuid references public.profiles, reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.favorites (
 user_id uuid not null references public.profiles on delete cascade, product_id uuid not null references public.products on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,product_id)
);
create table public.saved_suppliers (
 user_id uuid not null references public.profiles on delete cascade, business_id uuid not null references public.businesses on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,business_id)
);
create table public.quotation_requests (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references public.profiles,
 business_id uuid not null references public.businesses, product_id uuid not null references public.products,
 quantity integer not null check(quantity>0), message text not null check(char_length(message) between 10 and 3000),
 created_at timestamptz not null default now()
);
create table public.quotation_responses (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.quotation_requests on delete cascade,
 price numeric(14,2) not null check(price>0), message text not null check(char_length(message) between 5 and 3000),
 created_at timestamptz not null default now()
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references public.profiles,
 business_id uuid not null references public.businesses, created_at timestamptz not null default now(), unique(buyer_id,business_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations on delete cascade,
 sender_id uuid not null references public.profiles, body text not null check(char_length(body) between 1 and 4000),
 created_at timestamptz not null default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles,
 product_id uuid not null references public.products, reason text not null check(char_length(reason) between 10 and 2000),
 status text not null default 'open' check(status in ('open','resolved','dismissed')), created_at timestamptz not null default now()
);
create table public.admin_audit_logs (
 id uuid primary key default gen_random_uuid(), admin_id uuid references public.profiles,
 action text not null, entity_id uuid not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table private.rate_limits (user_id uuid not null, scope text not null, window_start timestamptz not null, count integer not null default 1, primary key(user_id,scope));
alter table private.rate_limits enable row level security;

create index products_search_idx on public.products using gin(search_vector);
create index products_catalog_idx on public.products(status,category_id,price,created_at desc);
create index products_business_idx on public.products(business_id);
create index businesses_location_idx on public.businesses(division,district);
create index messages_thread_idx on public.messages(conversation_id,created_at);
create index quotation_buyer_idx on public.quotation_requests(buyer_id,created_at desc);
create index quotation_supplier_idx on public.quotation_requests(business_id,created_at desc);
create index verification_business_idx on public.supplier_verifications(business_id,status);
create index tiers_product_idx on public.product_price_tiers(product_id);
create index images_product_idx on public.product_images(product_id);
create index categories_parent_idx on public.categories(parent_id);
create index conversations_business_idx on public.conversations(business_id);
create index reports_product_idx on public.reports(product_id);

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'); $$;
create function private.owns_business(bid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses where id=bid and owner_id=(select auth.uid())); $$;
create function private.owns_product(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.products p join public.businesses b on b.id=p.business_id where p.id=pid and b.owner_id=(select auth.uid())); $$;
create function private.in_conversation(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.conversations c join public.businesses b on b.id=c.business_id where c.id=cid and ((select auth.uid())=c.buyer_id or (select auth.uid())=b.owner_id)); $$;
create function private.is_buyer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='buyer'); $$;
create function private.is_supplier() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='supplier'); $$;
create function private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120));
 -- Metadata is never used for authorization. Every signup starts as a buyer.
 insert into public.user_roles(user_id,role) values(new.id,'buyer'); return new;
 end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.on_signup();
create function private.touch_row() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger touch_profiles before update on public.profiles for each row execute function private.touch_row();
create trigger touch_businesses before update on public.businesses for each row execute function private.touch_row();
create trigger touch_products before update on public.products for each row execute function private.touch_row();

-- Guards also protect fields when RLS allows owners to update a row.
create function private.guard_business() returns trigger language plpgsql set search_path='' as $$
 begin
 if current_user in ('postgres','supabase_admin') then return new; end if;
 if TG_OP='INSERT' then new.verified=false;
 elsif new.id<>old.id or new.owner_id<>old.owner_id or new.verified<>old.verified then raise exception 'Protected business fields';
 end if; return new; end; $$;
create trigger guard_business before insert or update on public.businesses for each row execute function private.guard_business();
create function private.guard_product() returns trigger language plpgsql set search_path='' as $$
 begin
 if current_user in ('postgres','supabase_admin') then return new; end if;
 if TG_OP='UPDATE' and (new.id<>old.id or new.business_id<>old.business_id) then raise exception 'Protected ownership'; end if;
 if new.status not in ('draft','pending','archived') then new.status='pending'; end if;
 new.moderation_note=''; return new;
 end; $$;
create trigger guard_product before insert or update on public.products for each row execute function private.guard_product();
create function private.invalidate_product() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 update public.products set status='pending' where id=case when TG_OP='DELETE' then old.product_id else new.product_id end and status='approved';
 return null; end; $$;
create trigger invalidate_image after insert or update or delete on public.product_images for each row execute function private.invalidate_product();
create trigger invalidate_tier after insert or update or delete on public.product_price_tiers for each row execute function private.invalidate_product();

-- Rate limits run inside the database so they cannot be bypassed with direct REST calls.
create function private.consume_limit(scope_name text, max_count integer, seconds integer) returns void language plpgsql security definer set search_path='' as $$
 declare n integer;
 begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into private.rate_limits(user_id,scope,window_start,count) values(auth.uid(),scope_name,now(),1)
 on conflict(user_id,scope) do update set
 count=case when private.rate_limits.window_start < now()-make_interval(secs=>seconds) then 1 else private.rate_limits.count+1 end,
 window_start=case when private.rate_limits.window_start < now()-make_interval(secs=>seconds) then now() else private.rate_limits.window_start end
 returning count into n;
 if n>max_count then raise exception 'Rate limit exceeded. Please try again later.' using errcode='P0001'; end if;
 end; $$;
create function private.guard_inquiry() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 perform private.consume_limit(TG_TABLE_NAME,case when TG_TABLE_NAME='messages' then 30 else 10 end,60);
 if TG_TABLE_NAME='quotation_requests' then
 if not exists(select 1 from public.products where id=new.product_id and business_id=new.business_id and status='approved' and new.quantity>=moq) then raise exception 'Invalid product or quantity below MOQ'; end if;
 end if; return new; end; $$;
create trigger limit_quotes before insert on public.quotation_requests for each row execute function private.guard_inquiry();
create trigger limit_messages before insert on public.messages for each row execute function private.guard_inquiry();
create trigger limit_reports before insert on public.reports for each row execute function private.guard_inquiry();
create trigger limit_conversations before insert on public.conversations for each row execute function private.guard_inquiry();

-- Explicitly enable RLS, then grant only the operations covered by policies.
do $$ declare t text; begin foreach t in array array['profiles','user_roles','businesses','categories','products','product_images','product_price_tiers','supplier_verifications','favorites','saved_suppliers','quotation_requests','quotation_responses','conversations','messages','reports','admin_audit_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select, insert, update, delete on public.%I to authenticated',t);
 end loop; end $$;
grant select on public.businesses, public.categories, public.products, public.product_images, public.product_price_tiers to anon;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or private.is_admin());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy businesses_read on public.businesses for select using(verified or private.owns_business(id) or private.is_admin() or exists(select 1 from public.products p where p.business_id=businesses.id and p.status='approved'));
create policy businesses_insert on public.businesses for insert to authenticated with check(owner_id=auth.uid() and private.is_supplier() and not verified);
create policy businesses_update on public.businesses for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy categories_read on public.categories for select using(true);
create policy categories_admin on public.categories for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy products_read on public.products for select using(status='approved' or private.owns_business(business_id) or private.is_admin());
create policy products_insert on public.products for insert to authenticated with check(private.owns_business(business_id) and status in ('draft','pending'));
create policy products_update on public.products for update to authenticated using(private.owns_business(business_id)) with check(private.owns_business(business_id));
create policy products_delete on public.products for delete to authenticated using(private.owns_business(business_id));
create policy images_read on public.product_images for select using(exists(select 1 from public.products p where p.id=product_id));
create policy images_insert on public.product_images for insert to authenticated with check(private.owns_product(product_id) and split_part(path,'/',1)=auth.uid()::text and split_part(path,'/',2)=product_id::text);
create policy images_delete on public.product_images for delete to authenticated using(private.owns_product(product_id));
create policy tiers_read on public.product_price_tiers for select using(exists(select 1 from public.products p where p.id=product_id));
create policy tiers_manage on public.product_price_tiers for all to authenticated using(private.owns_product(product_id)) with check(private.owns_product(product_id));
create policy verifications_read on public.supplier_verifications for select to authenticated using(private.owns_business(business_id) or private.is_admin());
create policy verifications_insert on public.supplier_verifications for insert to authenticated with check(private.owns_business(business_id) and status='pending' and review_note='' and reviewed_by is null and reviewed_at is null and split_part(document_path,'/',1)=auth.uid()::text);
create policy favorites_manage on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and private.is_buyer());
create policy saved_manage on public.saved_suppliers for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and private.is_buyer());
create policy quotes_read on public.quotation_requests for select to authenticated using(buyer_id=auth.uid() or private.owns_business(business_id));
create policy quotes_insert on public.quotation_requests for insert to authenticated with check(buyer_id=auth.uid() and private.is_buyer() and not private.owns_business(business_id));
create policy responses_read on public.quotation_responses for select to authenticated using(exists(select 1 from public.quotation_requests q where q.id=request_id));
create policy responses_insert on public.quotation_responses for insert to authenticated with check(exists(select 1 from public.quotation_requests q where q.id=request_id and private.owns_business(q.business_id)));
create policy conversations_read on public.conversations for select to authenticated using(private.in_conversation(id));
create policy conversations_insert on public.conversations for insert to authenticated with check(buyer_id=auth.uid() and private.is_buyer() and not private.owns_business(business_id) and exists(select 1 from public.businesses b where b.id=business_id));
create policy messages_read on public.messages for select to authenticated using(private.in_conversation(conversation_id));
create policy messages_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and private.in_conversation(conversation_id));
create policy reports_read on public.reports for select to authenticated using(reporter_id=auth.uid() or private.is_admin());
create policy reports_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid() and status='open');
create policy audit_read on public.admin_audit_logs for select to authenticated using(private.is_admin());

create function public.register_supplier() returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.user_roles set role='supplier' where user_id=auth.uid() and role='buyer';
 end; $$;
create function public.moderate_product(target uuid, decision text, note text default '') returns void language plpgsql security definer set search_path='' as $$
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if decision not in ('approved','rejected','archived') or length(note)>2000 then raise exception 'Invalid decision'; end if;
 update public.products set status=decision,moderation_note=note where id=target;
 if not found then raise exception 'Product not found'; end if;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'product.'||decision,target,jsonb_build_object('note',note));
 end; $$;
create function public.review_verification(target uuid, decision text, note text default '') returns void language plpgsql security definer set search_path='' as $$
 declare bid uuid;
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if decision not in ('approved','rejected') or length(note)>2000 then raise exception 'Invalid decision'; end if;
 update public.supplier_verifications set status=decision,review_note=note,reviewed_by=auth.uid(),reviewed_at=now() where id=target returning business_id into bid;
 if bid is null then raise exception 'Verification not found'; end if;
 update public.businesses set verified=exists(select 1 from public.supplier_verifications where business_id=bid and status='approved') where id=bid;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'verification.'||decision,target,jsonb_build_object('note',note));
 end; $$;
create function public.resolve_report(target uuid, decision text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if decision not in ('resolved','dismissed') then raise exception 'Invalid decision'; end if;
 update public.reports set status=decision where id=target;
 if not found then raise exception 'Report not found'; end if;
 insert into public.admin_audit_logs(admin_id,action,entity_id) values(auth.uid(),'report.'||decision,target);
 end; $$;
revoke all on all functions in schema private from public;
grant execute on function private.is_admin(), private.is_buyer(), private.is_supplier(), private.owns_business(uuid),private.owns_product(uuid),private.in_conversation(uuid) to anon, authenticated;
revoke all on function public.register_supplier(),public.moderate_product(uuid,text,text),public.review_verification(uuid,text,text),public.resolve_report(uuid,text) from public;
grant execute on function public.register_supplier(),public.moderate_product(uuid,text,text),public.review_verification(uuid,text,text),public.resolve_report(uuid,text) to authenticated;

-- Public bucket URLs bypass object RLS. Keep product-images private and issue
-- short-lived signed URLs only for rows visible under the following policy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('product-images','product-images',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('business-documents','business-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
 ('avatars','avatars',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy product_assets_read on storage.objects for select using(bucket_id='product-images' and (private.is_admin() or (storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.path=storage.objects.name and p.status='approved')));
create policy product_assets_upload on storage.objects for insert to authenticated with check(bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[2] and private.owns_business(p.business_id)));
create policy product_assets_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy documents_read on storage.objects for select to authenticated using(bucket_id='business-documents' and ((storage.foldername(name))[1]=auth.uid()::text or private.is_admin()));
create policy documents_upload on storage.objects for insert to authenticated with check(bucket_id='business-documents' and (storage.foldername(name))[1]=auth.uid()::text and private.is_supplier());
create policy avatars_read on storage.objects for select to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatars_upload on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

alter publication supabase_realtime add table public.messages;
