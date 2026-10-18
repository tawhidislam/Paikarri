-- Private, bounded chat images. Original images are never uploaded by the client.
create table public.chat_images (
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations,
 uploader_id uuid not null references public.profiles,path text not null unique,
 size int not null check(size between 1 and 1048576),width int not null check(width between 1 and 1600),height int not null check(height between 1 and 1600),
 verified boolean not null default false,discarded boolean not null default false,created_at timestamptz not null default now()
);
alter table public.chat_images enable row level security;
revoke all on public.chat_images from public,anon,authenticated;
grant all on public.chat_images to service_role;
alter table public.messages add column image_id uuid references public.chat_images;
create unique index message_image_once on public.messages(image_id) where image_id is not null;
create index chat_images_owner_created on public.chat_images(uploader_id,created_at);
create function public.chat_image_prepare(target uuid,file_size int,image_width int,image_height int) returns jsonb language plpgsql security definer set search_path='' as $$declare f public.chat_images;begin
 perform private.chat_access(target);perform private.consume_limit('chat_image_upload',30,3600);
 f.id=gen_random_uuid();f.path=auth.uid()::text||'/'||target::text||'/'||f.id::text||'.webp';
 insert into public.chat_images(id,conversation_id,uploader_id,path,size,width,height) values(f.id,target,auth.uid(),f.path,file_size,image_width,image_height) returning * into f;
 return jsonb_build_object('id',f.id,'path',f.path);
end$$;
create function private.chat_image_read(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.chat_images f where f.path=object_path and ((f.uploader_id=auth.uid()) or(f.verified and exists(select 1 from public.messages m where m.image_id=f.id and private.in_conversation(m.conversation_id)))));
$$;
create function private.chat_image_upload(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.chat_images f where f.path=object_path and f.uploader_id=auth.uid() and not f.verified and not f.discarded and f.created_at>now()-interval '1 hour' and private.in_conversation(f.conversation_id) and not exists(select 1 from public.messages where image_id=f.id));
$$;
create function private.chat_image_delete(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.chat_images f where f.path=object_path and f.uploader_id=auth.uid() and not exists(select 1 from public.messages where image_id=f.id));
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-images','chat-images',false,1048576,array['image/webp']);
create policy chat_images_upload on storage.objects for insert to authenticated with check(bucket_id='chat-images' and private.chat_image_upload(name));
create policy chat_images_read on storage.objects for select to authenticated using(bucket_id='chat-images' and private.chat_image_read(name));
-- No UPDATE policy: uploaded bytes cannot be overwritten, even before sending.
-- No direct DELETE policy: discard locks the metadata before removing an unused file.
create function public.chat_image_finalize(target uuid,actor uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.chat_images f set verified=true where f.id=target and f.uploader_id=actor and not f.discarded and exists(select 1 from storage.objects o where o.bucket_id='chat-images' and o.name=f.path and (o.metadata->>'size')::bigint=f.size and o.metadata->>'mimetype'='image/webp');
 if not found then raise exception 'Image upload unavailable';end if;
end$$;
create function public.chat_image_discard(target uuid) returns text language plpgsql security definer set search_path='' as $$declare f public.chat_images;begin
 select * into f from public.chat_images where id=target and uploader_id=auth.uid() for update;
 if f.id is null or exists(select 1 from public.messages where image_id=f.id) then raise exception 'Only unsent images can be removed' using errcode='42501';end if;
 update public.chat_images set verified=false,discarded=true where id=f.id;return f.path;
end$$;
create function private.guard_chat_image() returns trigger language plpgsql security definer set search_path='' as $$declare f public.chat_images;begin
 if new.image_id is null then return new;end if;
 select * into f from public.chat_images where id=new.image_id for update;
 if f.id is null or not f.verified or f.discarded or f.uploader_id<>new.sender_id or f.conversation_id<>new.conversation_id then raise exception 'Verified image in this conversation required' using errcode='42501';end if;return new;
end$$;
create trigger message_image_guard before insert on public.messages for each row execute function private.guard_chat_image();
create function public.chat_send_image(target uuid,body text,nonce uuid,image uuid,product uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare m public.messages;caption text=trim(coalesce(body,''));begin
 perform private.chat_access(target);
 if nonce is null or image is null or length(caption)>4000 then raise exception 'Invalid image message';end if;
 if caption='' then caption='Image';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||nonce::text,35));
 select * into m from public.messages where sender_id=auth.uid() and client_nonce=nonce;
 if m.id is not null then
  if m.conversation_id<>target or m.body<>caption or m.image_id is distinct from image or m.product_id is distinct from product then raise exception 'Message retry does not match the original';end if;
  return to_jsonb(m)-'client_nonce';end if;
 insert into public.messages(conversation_id,sender_id,body,client_nonce,product_id,image_id) values(target,auth.uid(),caption,nonce,product,image) returning * into m;
 return to_jsonb(m)-'client_nonce';
end$$;
create function public.chat_image_access(target uuid,monitor_access uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare f public.chat_images;begin
 select * into f from public.chat_images where id=target;
 if f.id is null or auth.uid() is null or not f.verified or f.discarded or not exists(select 1 from public.messages where image_id=f.id) then raise exception 'Image unavailable' using errcode='42501';end if;
 if not private.in_conversation(f.conversation_id) then
  if not coalesce(private.is_super_admin(),false) or not exists(select 1 from public.admin_audit_logs where id=monitor_access and admin_id=auth.uid() and entity_id=f.conversation_id and action='conversation_monitor.opened') then raise exception 'Image access denied' using errcode='42501';end if;
  insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'conversation_monitor.image_accessed',f.conversation_id,'{}');
 end if;
 return jsonb_build_object('path',f.path,'width',f.width,'height',f.height);
end$$;
-- Keep cursor pagination and audited monitoring authorization intact.
do $$declare d text;sig text;begin foreach sig in array array['public.chat_messages(uuid,jsonb,jsonb,integer)','public.admin_monitor_messages(uuid,uuid,jsonb,jsonb,integer)'] loop
 d=pg_get_functiondef(sig::regprocedure);
 if position('body,created_at,product_snapshot from public.messages' in d)=0 then raise exception 'Unexpected chat projection; inspect before changing';end if;
 execute replace(d,'body,created_at,product_snapshot from public.messages','body,created_at,product_snapshot,image_id from public.messages');end loop;end$$;
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('chat_image_prepare','chat_image_finalize','chat_image_discard','chat_send_image','chat_image_access') loop execute format('revoke all on function %s from public,anon,authenticated',f);execute format('grant execute on function %s to authenticated',f);end loop;end$$;
revoke all on function public.chat_image_finalize(uuid,uuid) from authenticated;
grant execute on function public.chat_image_finalize(uuid,uuid) to service_role;
revoke all on function private.guard_chat_image() from public,anon,authenticated;
-- Monitoring image audit records follow the existing super-admin-only monitor scope.
-- A server-only maintenance task can remove abandoned uploads after 24 hours.
create function public.chat_image_gc_candidates() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 with candidates as(select f.id from public.chat_images f where created_at<now()-interval '24 hours' and not exists(select 1 from public.messages where image_id=f.id) order by created_at for update skip locked limit 100),marked as(update public.chat_images set discarded=true,verified=false where id in(select id from candidates) returning id,path)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',path)),'[]') into result from marked;return result;
end$$;
revoke all on function public.chat_image_gc_candidates() from public,anon,authenticated;
grant execute on function public.chat_image_gc_candidates() to service_role;
