-- Store logos stay private in Storage; eligible storefronts expose short-lived signed images.
alter table public.businesses add column profile_image_path text;
alter table public.businesses add constraint business_picture_path_length check(profile_image_path is null or length(profile_image_path)<=180);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('store-images','store-images',false,262144,array['image/webp']);

create function private.manages_store_image(object_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.is_supplier()
 and object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 and split_part(object_path,'/',1)=auth.uid()::text
 and exists(select 1 from public.businesses b where b.id::text=split_part(object_path,'/',2) and b.owner_id=auth.uid());
$$;
create function private.reads_store_image(object_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.manages_store_image(object_path) or exists(
 select 1 from public.businesses b where b.profile_image_path=object_path
 and (private.public_business(b.id) or private.is_admin()));
$$;
create function private.unlinked_store_image(object_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.businesses where profile_image_path=object_path);
$$;
create policy store_picture_read on storage.objects for select to anon,authenticated
using(bucket_id='store-images' and private.reads_store_image(name));
create policy store_picture_upload on storage.objects for insert to authenticated
with check(bucket_id='store-images' and private.manages_store_image(name));
-- No UPDATE policy: every replacement has a unique path and cannot overwrite another file.
create policy store_picture_delete on storage.objects for delete to authenticated
using(bucket_id='store-images' and private.manages_store_image(name) and private.unlinked_store_image(name));

create function private.guard_store_picture() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' and new.profile_image_path is null then return new;end if;
 if TG_OP='UPDATE' and new.profile_image_path is not distinct from old.profile_image_path then return new;end if;
 if not (new.owner_id=auth.uid() and private.is_supplier()) then
 raise exception 'Supplier ownership required' using errcode='42501';end if;
 if new.profile_image_path is not null then
 if not private.manages_store_image(new.profile_image_path)
 or split_part(new.profile_image_path,'/',2)<>new.id::text
 or not exists(select 1 from storage.objects o where o.bucket_id='store-images' and o.name=new.profile_image_path and o.metadata->>'mimetype'='image/webp' and (o.metadata->>'size')::bigint between 1 and 262144)
 then raise exception 'Upload an optimized store picture to your own business path first';end if;
 end if;
 return new;
end;$$;
create trigger guard_store_picture before insert or update of profile_image_path on public.businesses
for each row execute function private.guard_store_picture();
create function public.set_store_picture(target uuid,expected_path text,new_path text) returns void
language plpgsql security definer set search_path='' as $$
declare b public.businesses;
begin
 if not private.is_supplier() or auth.uid() is null then raise exception 'Supplier required' using errcode='42501';end if;
 select * into b from public.businesses where id=target and owner_id=auth.uid() for update;
 if not found then raise exception 'Supplier ownership required' using errcode='42501';end if;
 if b.profile_image_path is distinct from expected_path then raise exception 'Store picture changed. Refresh before trying again.' using errcode='40001';end if;
 update public.businesses set profile_image_path=new_path where id=target;
end;$$;
revoke all on function private.manages_store_image(text),private.reads_store_image(text),private.unlinked_store_image(text),private.guard_store_picture(),public.set_store_picture(uuid,text,text) from public,anon,authenticated;
grant execute on function private.manages_store_image(text),private.reads_store_image(text),private.unlinked_store_image(text) to anon,authenticated;
grant execute on function public.set_store_picture(uuid,text,text) to authenticated;
