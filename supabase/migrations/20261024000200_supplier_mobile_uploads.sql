-- Private upload tickets. Verification is service-only after inspecting immutable bytes.
create table private.supplier_api_uploads (
 id uuid primary key default gen_random_uuid(),actor uuid not null references public.profiles on delete cascade,
 purpose text not null check(purpose in('product','store','avatar','verification','chat')),
 parent_id uuid not null,slot text,bucket text not null,path text not null unique,mime text not null,
 size bigint not null check(size>0),width integer,height integer,verified boolean not null default false,
 attached boolean not null default false,discarded boolean not null default false,
 previous_path text,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '1 hour'
);
alter table private.supplier_api_uploads enable row level security;
revoke all on private.supplier_api_uploads from public,anon,authenticated;

create function private.supplier_api_upload_execute(operation text,target uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f private.supplier_api_uploads;bid uuid;prepared jsonb;result jsonb;file_id uuid;prev text;
begin
 bid=private.supplier_api_business();
 if operation='asset_remove' then
 f.purpose=payload->>'purpose';
 if f.purpose='product' then
 if not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 select i.path into f.path from public.product_images i join public.products p on p.id=i.product_id where i.id=target and p.business_id=bid for update of p;
 if f.path is null then raise exception 'Image unavailable' using errcode='P0002';end if;
 delete from public.product_images where id=target;f.bucket='product-images';
 elsif f.purpose='store' then
 if target is distinct from bid then raise exception 'Business unavailable' using errcode='P0002';end if;
 f.path=payload->>'expected_path';perform public.set_store_picture(bid,f.path,null);f.bucket='store-images';
 elsif f.purpose='avatar' then
 if target is distinct from auth.uid() then raise exception 'Profile unavailable' using errcode='P0002';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 select avatar_path into prev from public.profiles where id=auth.uid();
 if prev is distinct from payload->>'expected_path' then raise exception 'Avatar changed' using errcode='40001';end if;
 f.path=prev;f.bucket='avatars';update public.profiles set avatar_path=null where id=auth.uid();
 elsif f.purpose='chat' then f.path=public.chat_image_discard(target);f.bucket='chat-images';
 else raise exception 'Asset cannot be removed through this operation' using errcode='22023';end if;
 if f.path is null then raise exception 'Asset unavailable' using errcode='P0002';end if;
 update private.supplier_api_uploads set discarded=true,verified=false where path=f.path and actor=auth.uid();
 return jsonb_build_object('removed',true,'bucket',f.bucket,'path',f.path);
 end if;
 if operation='upload_prepare' then
 f.id=gen_random_uuid();f.actor=auth.uid();f.purpose=payload->>'purpose';f.parent_id=(payload->>'parent_id')::uuid;f.slot=payload->>'slot';f.mime=payload->>'mime';f.size=(payload->>'size')::bigint;f.width=(payload->>'width')::int;f.height=(payload->>'height')::int;
 if f.mime not in('image/jpeg','image/png','image/webp','application/pdf') or f.size is null or f.size<=0 then raise exception 'Invalid file' using errcode='22023';end if;
 if f.purpose='product' then
 if not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 perform 1 from public.products where id=f.parent_id and business_id=bid for update;
 if not found then raise exception 'Product unavailable' using errcode='P0002';end if;
 if(select count(*) from public.product_images where product_id=f.parent_id)>=10 then raise exception 'Use up to 10 product images' using errcode='23514';end if;
 f.bucket='product-images';
 elsif f.purpose='store' then
 if f.parent_id is distinct from bid then raise exception 'Business unavailable' using errcode='P0002';end if;
 f.bucket='store-images';select profile_image_path into f.previous_path from public.businesses where id=bid;
 elsif f.purpose='avatar' then
 if f.parent_id is distinct from auth.uid() then raise exception 'Profile unavailable' using errcode='P0002';end if;
 f.bucket='avatars';select avatar_path into f.previous_path from public.profiles where id=auth.uid();
 elsif f.purpose='verification' then
 perform 1 from public.verification_applications where id=f.parent_id and business_id=bid and status='draft' for update;
 if not found then raise exception 'Draft application unavailable' using errcode='P0002';end if;
 if f.slot not in('identity_front','identity_back','trade_license','bank_proof') or f.slot is null then raise exception 'Invalid evidence slot' using errcode='22023';end if;
 f.bucket='business-documents';
 elsif f.purpose='chat' then
 if f.mime<>'image/webp' then raise exception 'Chat images must be WebP' using errcode='22023';end if;
 prepared=public.chat_image_prepare(f.parent_id,f.size::int,(payload->>'width')::int,(payload->>'height')::int);
 f.id=(prepared->>'id')::uuid;f.path=prepared->>'path';f.bucket='chat-images';
 else raise exception 'Invalid upload purpose' using errcode='22023';end if;
 if (f.mime='application/pdf' and (f.purpose<>'verification' or f.slot<>'trade_license'))
 or f.size>(case f.purpose when 'store' then 262144 when 'avatar' then 2097152 when 'chat' then 1048576 when 'product' then 5242880 else 10485760 end)
 or(f.purpose='store' and f.mime<>'image/webp') then raise exception 'File exceeds upload profile' using errcode='22023';end if;
 if f.path is null then
 f.path=auth.uid()::text||'/'||case when f.purpose='avatar' then '' else f.parent_id::text||'/' end||case when f.purpose='verification' then f.slot||'/' else '' end||f.id::text||case f.mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png' when 'application/pdf' then '.pdf' else '.webp' end;
 end if;
 insert into private.supplier_api_uploads(id,actor,purpose,parent_id,slot,bucket,path,mime,size,width,height,previous_path) values(f.id,f.actor,f.purpose,f.parent_id,f.slot,f.bucket,f.path,f.mime,f.size,f.width,f.height,f.previous_path) returning * into f;
 return to_jsonb(f)-'actor';
 end if;
 select * into f from private.supplier_api_uploads where id=target and actor=auth.uid() for update;
 if not found then raise exception 'Upload unavailable' using errcode='P0002';end if;
 if operation='upload_complete' then
 if f.discarded then raise exception 'Upload was removed' using errcode='40001';end if;
 if f.attached then return jsonb_build_object('upload',to_jsonb(f)-'actor','verification',null);end if;
 if not f.verified or f.expires_at<=now() then raise exception 'Verified current upload required' using errcode='22023';end if;
 if f.purpose='product' then
 if not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 perform 1 from public.products where id=f.parent_id and business_id=bid for update;
 if not found then raise exception 'Product unavailable' using errcode='P0002';end if;
 insert into public.product_images(id,product_id,path,position) values(f.id,f.parent_id,f.path,coalesce((select max(position)+1 from public.product_images where product_id=f.parent_id),0));
 elsif f.purpose='store' then perform public.set_store_picture(f.parent_id,f.previous_path,f.path);
 elsif f.purpose='avatar' then
 perform 1 from public.profiles where id=auth.uid() for update;
 select avatar_path into prev from public.profiles where id=auth.uid();
 if prev is distinct from f.previous_path then raise exception 'Avatar changed. Refresh before saving' using errcode='40001';end if;
 update public.profiles set avatar_path=f.path where id=auth.uid();
 elsif f.purpose='verification' then
 result=public.verification_attach_file(f.parent_id,(payload->>'expected_version')::int,f.slot,f.path);
 elsif f.purpose='chat' then
 perform private.chat_access(f.parent_id);
 if not exists(select 1 from public.chat_images where id=f.id and verified and not discarded) then raise exception 'Image verification required' using errcode='22023';end if;
 end if;
 update private.supplier_api_uploads set attached=true where id=f.id returning * into f;
 return jsonb_build_object('upload',to_jsonb(f)-'actor','verification',result);
 elsif operation='upload_remove' then
 if f.discarded then return jsonb_build_object('bucket',f.bucket,'path',f.path,'removed',true);end if;
 if f.attached then
 if f.purpose='product' then
 if not private.is_active(auth.uid()) then raise exception 'Active supplier required' using errcode='42501';end if;
 delete from public.product_images where id=f.id and product_id in(select id from public.products where business_id=bid);
 elsif f.purpose='store' then perform public.set_store_picture(f.parent_id,f.path,null);
 elsif f.purpose='avatar' then
 perform 1 from public.profiles where id=auth.uid() for update;
 update public.profiles set avatar_path=null where id=auth.uid() and avatar_path=f.path;
 elsif f.purpose='verification' then
 select id into file_id from public.verification_files where application_id=f.parent_id and object_path=f.path;
 result=public.verification_remove_file(f.parent_id,(payload->>'expected_version')::int,file_id);
 elsif f.purpose='chat' then perform public.chat_image_discard(f.id);
 end if;
 elsif f.purpose='chat' then perform public.chat_image_discard(f.id);
 end if;
 update private.supplier_api_uploads set discarded=true,verified=false where id=f.id;
 return jsonb_build_object('bucket',f.bucket,'path',f.path,'removed',true,'verification',result);
 end if;
 raise exception 'Unknown upload operation' using errcode='22023';
end$$;

create function public.supplier_api_upload_info(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f private.supplier_api_uploads;
begin
 perform private.supplier_api_business();
 select * into f from private.supplier_api_uploads where id=target and actor=auth.uid();
 if not found then raise exception 'Upload unavailable' using errcode='P0002';end if;
 return to_jsonb(f)-'actor';
end$$;
create function public.supplier_api_upload_verified(target uuid,actor uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f private.supplier_api_uploads;
begin
 select * into f from private.supplier_api_uploads where id=target and supplier_api_uploads.actor=supplier_api_upload_verified.actor for update;
 if not found or f.discarded or f.expires_at<=now() then raise exception 'Upload unavailable' using errcode='P0002';end if;
 if not exists(select 1 from storage.objects where bucket_id=f.bucket and name=f.path and(metadata->>'size')::bigint=f.size and metadata->>'mimetype'=f.mime) then raise exception 'Upload contents unavailable' using errcode='22023';end if;
 if f.purpose='chat' then perform public.chat_image_finalize(f.id,actor);end if;
 update private.supplier_api_uploads set verified=true where id=target;
end$$;

-- Authorized previews for existing web assets as well as new mobile tickets.
create function public.supplier_api_asset(purpose text,target uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare bid uuid;path text;bucket text;ctx jsonb;
begin
 bid=private.supplier_api_business();
 case purpose
 when 'product' then bucket='product-images';select i.path into path from public.product_images i join public.products p on p.id=i.product_id where i.id=target and p.business_id=bid;
 when 'verification' then bucket='business-documents';select f.object_path into path from public.verification_files f join public.verification_applications a on a.id=f.application_id where f.id=target and a.business_id=bid;
 when 'legacy' then bucket='business-documents';select document_path into path from public.supplier_verifications where id=target and business_id=bid;
 when 'store' then bucket='store-images';select profile_image_path into path from public.businesses where id=target and id=bid;
 when 'avatar' then bucket='avatars';select avatar_path into path from public.profiles where id=target and id=auth.uid();
 when 'chat' then bucket='chat-images';ctx=public.chat_image_access(target);path=ctx->>'path';
 when 'request' then bucket='request-attachments';path=public.sourcing_file_access(target);
 else raise exception 'Invalid asset purpose' using errcode='22023';end case;
 if path is null then raise exception 'Asset unavailable' using errcode='P0002';end if;
 return jsonb_build_object('bucket',bucket,'path',path);
end$$;

-- Keep the command dispatcher closed to arbitrary function names.
do $$declare definition text;begin
 definition=pg_get_functiondef('private.supplier_api_execute(text,uuid,jsonb)'::regprocedure);
 if position('case operation' in definition)=0 then raise exception 'Supplier command dispatcher changed; inspect before extending';end if;
 definition=replace(definition,'case operation','case operation'||E'\n when ''upload_prepare'',''upload_complete'',''upload_remove'',''asset_remove'' then result=private.supplier_api_upload_execute(operation,target,payload);');
 execute definition;
end$$;
revoke all on function private.supplier_api_upload_execute(text,uuid,jsonb),public.supplier_api_upload_verified(uuid,uuid),public.supplier_api_upload_info(uuid),public.supplier_api_asset(text,uuid) from public,anon,authenticated;
grant execute on function public.supplier_api_upload_info(uuid),public.supplier_api_asset(text,uuid) to authenticated;
grant execute on function public.supplier_api_upload_verified(uuid,uuid) to service_role;

-- Prepared mobile objects cannot be replaced between byte inspection and attachment.
create function private.supplier_api_asset_deletable(bucket text,path text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from private.supplier_api_uploads u where u.bucket=supplier_api_asset_deletable.bucket and u.path=supplier_api_asset_deletable.path and not u.discarded);
$$;
revoke all on function private.supplier_api_asset_deletable(text,text) from public,anon,authenticated;
grant execute on function private.supplier_api_asset_deletable(text,text) to authenticated;
create policy supplier_mobile_immutable_upload on storage.objects as restrictive for delete to authenticated
using(private.supplier_api_asset_deletable(bucket_id,name));

-- Service-only maintenance: expire unused tickets first, then delete their storage bytes.
create function public.supplier_api_upload_gc() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with candidates as(select id from private.supplier_api_uploads where (not attached or discarded) and expires_at<now()-interval '23 hours' order by created_at limit 100 for update skip locked),
 expired as(update private.supplier_api_uploads u set discarded=true,verified=false where u.id in(select id from candidates) returning id,bucket,path)
 select coalesce(jsonb_agg(to_jsonb(expired)),'[]') into result from expired;
 return result;
end$$;
revoke all on function public.supplier_api_upload_gc() from public,anon,authenticated;
grant execute on function public.supplier_api_upload_gc() to service_role;

create function private.supplier_mobile_evidence_removed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.verification_files where object_path=old.object_path) then
 update private.supplier_api_uploads set discarded=true,verified=false where path=old.object_path;end if;
 return old;
end$$;
revoke all on function private.supplier_mobile_evidence_removed() from public,anon,authenticated;
create trigger supplier_mobile_evidence_removed after delete on public.verification_files for each row execute function private.supplier_mobile_evidence_removed();

-- Existing web editors can unlink a mobile asset before deleting its bytes.
create function private.supplier_mobile_asset_unlinked() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_path text;
begin
 if TG_TABLE_NAME='product_images' then old_path=old.path;
 elsif TG_TABLE_NAME='businesses' then
 if old.profile_image_path is not distinct from new.profile_image_path then return new;end if;old_path=old.profile_image_path;
 else
 if old.avatar_path is not distinct from new.avatar_path then return new;end if;old_path=old.avatar_path;
 end if;
 if old_path is not null then update private.supplier_api_uploads set discarded=true,verified=false where path=old_path;end if;
 if TG_OP='DELETE' then return old;end if;return new;
end$$;
revoke all on function private.supplier_mobile_asset_unlinked() from public,anon,authenticated;
create trigger supplier_mobile_product_unlinked after delete on public.product_images for each row execute function private.supplier_mobile_asset_unlinked();
create trigger supplier_mobile_store_unlinked after update of profile_image_path on public.businesses for each row execute function private.supplier_mobile_asset_unlinked();
create trigger supplier_mobile_avatar_unlinked after update of avatar_path on public.profiles for each row execute function private.supplier_mobile_asset_unlinked();

create function public.supplier_api_upload_gc_ack(targets uuid[]) returns void
language sql security definer set search_path='' as $$
 delete from private.supplier_api_uploads u where id=any(targets) and discarded and expires_at<now()-interval '23 hours' and not exists(select 1 from storage.objects o where o.bucket_id=u.bucket and o.name=u.path);
$$;
revoke all on function public.supplier_api_upload_gc_ack(uuid[]) from public,anon,authenticated;
grant execute on function public.supplier_api_upload_gc_ack(uuid[]) to service_role;
