-- Additive operations release. No historical messages or content are published.
create table public.homepage_content (
 id uuid primary key default '00000000-0000-0000-0000-000000000002' check(id='00000000-0000-0000-0000-000000000002'),
 draft jsonb not null default '{}', published jsonb, revision integer not null default 0,
 published_at timestamptz, published_by uuid references public.profiles, updated_at timestamptz not null default now()
);
insert into public.homepage_content default values;
alter table public.homepage_content enable row level security;
revoke all on public.homepage_content from public,anon,authenticated;
grant select on public.homepage_content to authenticated;
grant all on public.homepage_content to service_role;
create policy homepage_owner_read on public.homepage_content for select to authenticated using(private.is_super_admin());
create trigger console_audit after update on public.homepage_content for each row execute function private.audit_console();
create table public.notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles on delete cascade,
 kind text not null check(kind in ('product_review','verification_review','account_status','staff_access','quotation','quotation_response','onboarding_reminder')),
 title_en text not null check(length(title_en) between 1 and 160),title_bn text not null check(length(title_bn) between 1 and 160),
 body_en text not null check(length(body_en)<=3000),body_bn text not null check(length(body_bn)<=3000),
 href text not null check(href ~ '^/(dashboard|admin)(/|$)'),
 entity_id uuid, actor_id uuid references public.profiles, reminder_template text,
 created_at timestamptz not null default now(),read_at timestamptz
);
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
create policy notifications_recipient_read on public.notifications for select to authenticated using(recipient_id=auth.uid());
create index notifications_inbox_idx on public.notifications(recipient_id,created_at desc);
create index notifications_unread_idx on public.notifications(recipient_id) where read_at is null;
create index notifications_reminder_idx on public.notifications(recipient_id,reminder_template,created_at desc) where kind='onboarding_reminder';
create function private.valid_local_link(value text) returns boolean language sql immutable set search_path='' as $$
 select value is not null and value ~ '^/(products|suppliers|dashboard/business|info/[a-z-]+|auth/register)(\?.*)?$' and value !~ '[[:space:]\\]' and length(value)<=500; $$;
create function private.validate_homepage(config jsonb, publishing boolean) returns void language plpgsql security definer set search_path='' as $$
 declare k text;item text;asset text;
 begin
 if config is null or jsonb_typeof(config)<>'object' or octet_length(config::text)>20000 then raise exception 'Invalid homepage content';end if;
 foreach k in array array['hero_eyebrow_en','hero_eyebrow_bn','hero_title_en','hero_title_bn','hero_body_en','hero_body_bn','hero_button_en','hero_button_bn','hero_href','hero_alt_en','hero_alt_bn','announcement_en','announcement_bn','announcement_href'] loop
 if jsonb_typeof(config->k) is distinct from 'string' or length(config->>k)>1000 then raise exception 'Invalid text field: %',k;end if;end loop;
 if length(trim(config->>'hero_title_en')) not between 3 and 160 or length(trim(config->>'hero_title_bn')) not between 3 and 160 or length(trim(config->>'hero_button_en')) not between 1 and 60 or length(trim(config->>'hero_button_bn')) not between 1 and 60 then raise exception 'Hero titles and button labels required';end if;
 if not private.valid_local_link(config->>'hero_href') or ((config->>'announcement_href')<>'' and not private.valid_local_link(config->>'announcement_href')) then raise exception 'Choose a safe marketplace link';end if;
 foreach k in array array['show_categories','show_products','show_suppliers','show_arrivals','show_deals','show_supplier_cta','show_announcement'] loop
 if jsonb_typeof(config->k) is distinct from 'boolean' then raise exception 'Invalid section toggle: %',k;end if;end loop;
 if (config->>'show_announcement')::boolean and (length(trim(config->>'announcement_en'))<3 or length(trim(config->>'announcement_bn'))<3) then raise exception 'Bilingual announcement text required';end if;
 foreach k in array array['category_ids','product_ids','supplier_ids'] loop
 if jsonb_typeof(config->k) is distinct from 'array' then raise exception 'Invalid featured selection';end if;
 if jsonb_array_length(config->k)>(case k when 'category_ids' then 6 when 'product_ids' then 8 else 3 end) then raise exception 'Too many featured selections';end if;
 if (select count(*)<>count(distinct value) from jsonb_array_elements_text(config->k)) then raise exception 'Duplicate featured selection';end if;
 for item in select jsonb_array_elements_text(config->k) loop
 if item is null then raise exception 'Invalid featured identifier';end if;
 if k='category_ids' and not exists(select 1 from public.categories where id=item::uuid) then raise exception 'Category no longer exists';end if;
 if publishing and k='product_ids' and not exists(select 1 from public.products p where p.id=item::uuid and p.status='approved' and private.business_active(p.business_id)) then raise exception 'Only approved active-supplier products may be featured';end if;
 if publishing and k='supplier_ids' and not exists(select 1 from public.businesses b where b.id=item::uuid and b.verified and private.business_active(b.id)) then raise exception 'Only active verified suppliers may be featured';end if;
 -- Cast validates UUIDs even when saving drafts.
 perform item::uuid;
 end loop;end loop;
 if jsonb_typeof(config->'hero_image') not in ('string','null') or not(config ? 'hero_image') then raise exception 'Invalid image path';end if;
 asset=nullif(config->>'hero_image','');
 if asset is not null and (length(trim(config->>'hero_alt_en'))<3 or length(trim(config->>'hero_alt_bn'))<3 or not exists(select 1 from storage.objects where bucket_id='marketing-assets' and name=asset)) then raise exception 'Upload an image and provide bilingual alternative text';end if;
 end; $$;
create function public.admin_save_homepage(config jsonb, expected_revision integer) returns integer language plpgsql security definer set search_path='' as $$
 declare rev integer;
 begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 perform private.validate_homepage(config,false);
 update public.homepage_content set draft=config,revision=revision+1,updated_at=now() where revision=expected_revision returning revision into rev;
 if rev is null then raise exception 'Content changed in another tab. Reload before saving.' using errcode='40001';end if;return rev;end; $$;
create function public.admin_publish_homepage(expected_revision integer) returns void language plpgsql security definer set search_path='' as $$
 declare content public.homepage_content;
 begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 select * into content from public.homepage_content for update;
 if content.revision is distinct from expected_revision then raise exception 'Content changed. Save and reload before publishing.' using errcode='40001';end if;
 perform private.validate_homepage(content.draft,true);
 update public.homepage_content set published=draft,published_at=now(),published_by=auth.uid(),revision=revision+1,updated_at=now();end; $$;
create function public.get_homepage_content() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare config jsonb;
 begin
 select published into config from public.homepage_content;
 if config is null then return null;end if;
 config=jsonb_set(config,'{category_ids}',coalesce((select jsonb_agg(i.value order by i.n) from jsonb_array_elements_text(config->'category_ids') with ordinality i(value,n) join public.categories c on c.id=i.value::uuid),'[]'));
 config=jsonb_set(config,'{product_ids}',coalesce((select jsonb_agg(i.value order by i.n) from jsonb_array_elements_text(config->'product_ids') with ordinality i(value,n) join public.products p on p.id=i.value::uuid where p.status='approved' and private.business_active(p.business_id)),'[]'));
 config=jsonb_set(config,'{supplier_ids}',coalesce((select jsonb_agg(i.value order by i.n) from jsonb_array_elements_text(config->'supplier_ids') with ordinality i(value,n) join public.businesses b on b.id=i.value::uuid where b.verified and private.business_active(b.id)),'[]'));
 return config;end; $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('marketing-assets','marketing-assets',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy marketing_read on storage.objects for select using(bucket_id='marketing-assets' and (private.is_super_admin() or exists(select 1 from public.homepage_content h where h.published->>'hero_image'=storage.objects.name)));
-- The table is owner-only, so use a narrow definer predicate for public storage reads.
create function private.published_marketing_asset(path text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.homepage_content where published->>'hero_image'=path); $$;
alter policy marketing_read on storage.objects using(bucket_id='marketing-assets' and (private.is_super_admin() or private.published_marketing_asset(name)));
create policy marketing_upload on storage.objects for insert to authenticated with check(bucket_id='marketing-assets' and private.is_super_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy marketing_delete on storage.objects for delete to authenticated using(bucket_id='marketing-assets' and private.is_super_admin() and (storage.foldername(name))[1]=auth.uid()::text and not private.published_marketing_asset(name) and not exists(select 1 from public.homepage_content h where h.draft->>'hero_image'=name));
-- Notification read state is the only recipient-controlled field.
create function public.mark_notification(target uuid, is_read boolean default true) returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null or is_read is null then raise exception 'Authentication and read state required' using errcode='42501';end if;
 update public.notifications set read_at=case when is_read then coalesce(read_at,now()) else null end where id=target and recipient_id=auth.uid();
 if not found then raise exception 'Notification not found' using errcode='42501';end if;end; $$;
create function public.mark_all_notifications_read() returns void language plpgsql security definer set search_path='' as $$
 begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 update public.notifications set read_at=now() where recipient_id=auth.uid() and read_at is null;end; $$;
create function private.notify_event() returns trigger language plpgsql security definer set search_path='' as $$
 declare recipient uuid;note text;title_en text;title_bn text;body_en text;body_bn text;link text;event_kind text;entity uuid;
 begin
 if TG_TABLE_NAME in ('account_statuses','user_roles') then entity=new.user_id;else entity=new.id;end if;
 if TG_TABLE_NAME='products' then
 if not private.is_admin() then return null;end if;
 select owner_id into recipient from public.businesses where id=new.business_id;
 select n.note into note from public.product_moderation_notes n where n.product_id=new.id;
 event_kind='product_review';title_en='Product review updated';title_bn='পণ্য পর্যালোচনা আপডেট';body_en=new.name||': '||new.status||'. '||coalesce(note,'');body_bn=new.name||': '||case new.status when 'approved' then 'অনুমোদিত' when 'rejected' then 'প্রত্যাখ্যাত' when 'archived' then 'সংরক্ষিত' else 'পর্যালোচনাধীন' end||'। '||coalesce(note,'');link='/dashboard/products';
 elsif TG_TABLE_NAME='supplier_verifications' then
 if (old.status,old.review_note,old.reviewed_at) is not distinct from (new.status,new.review_note,new.reviewed_at) or not private.is_admin() then return null;end if;
 select owner_id into recipient from public.businesses where id=new.business_id;
 event_kind='verification_review';title_en='Business verification updated';title_bn='ব্যবসা যাচাইকরণ আপডেট';body_en=new.document_type||': '||new.status||'. '||new.review_note;body_bn=case new.status when 'approved' then 'যাচাইকরণ অনুমোদিত। ' when 'rejected' then 'যাচাইকরণ প্রত্যাখ্যাত। ' else 'আবার পর্যালোচনা প্রয়োজন। ' end||new.review_note;link='/dashboard/verification';
 elsif TG_TABLE_NAME='account_statuses' then
 entity=new.user_id;if TG_OP='INSERT' then if new.status='active' then return null;end if;else if old.status is not distinct from new.status and old.reason is not distinct from new.reason then return null;end if;end if;
 recipient=new.user_id;event_kind='account_status';title_en='Account status updated';title_bn='অ্যাকাউন্টের অবস্থা আপডেট';body_en=new.status||': '||new.reason;body_bn=case new.status when 'suspended' then 'অ্যাকাউন্ট স্থগিত: ' else 'অ্যাকাউন্ট সক্রিয়: ' end||new.reason;link='/dashboard';
 elsif TG_TABLE_NAME='user_roles' then
 if old.role is not distinct from new.role or not private.is_admin() then return null;end if;
 entity=new.user_id;recipient=new.user_id;event_kind='staff_access';title_en='Account access updated';title_bn='অ্যাকাউন্টের অধিকার আপডেট';body_en='Your account role is now '||new.role||'.';body_bn='আপনার অ্যাকাউন্টের ভূমিকা পরিবর্তিত হয়েছে।';link=case when new.role in ('admin','super_admin') then '/admin/inbox' else '/dashboard/notifications' end;
 elsif TG_TABLE_NAME='quotation_requests' then
 select owner_id into recipient from public.businesses where id=new.business_id;
 event_kind='quotation';title_en='New quotation request';title_bn='নতুন দরপত্রের অনুরোধ';body_en='A buyer requested a quotation. Open your workspace to respond.';body_bn='একজন ক্রেতা দরপত্র চেয়েছেন। উত্তর দিতে আপনার কর্মক্ষেত্র খুলুন।';link='/dashboard/quotations';
 elsif TG_TABLE_NAME='quotation_responses' then
 select buyer_id into recipient from public.quotation_requests where id=new.request_id;
 event_kind='quotation_response';title_en='Supplier quotation received';title_bn='সরবরাহকারীর দরপত্র এসেছে';body_en='A supplier responded to your quotation request.';body_bn='একজন সরবরাহকারী আপনার দরপত্রের অনুরোধের উত্তর দিয়েছেন।';link='/dashboard/quotations';
 end if;
 if recipient is not null then insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id,actor_id) values(recipient,event_kind,title_en,title_bn,left(body_en,3000),left(body_bn,3000),link,entity,auth.uid());end if;return null;end; $$;
-- Alphabetical order places notification creation after existing audit/feedback triggers.
create trigger z_notify after update on public.products for each row execute function private.notify_event();
create trigger z_notify after update on public.supplier_verifications for each row execute function private.notify_event();
create trigger z_notify after insert or update on public.account_statuses for each row execute function private.notify_event();
create trigger z_notify after update on public.user_roles for each row execute function private.notify_event();
create trigger z_notify after insert on public.quotation_requests for each row execute function private.notify_event();
create trigger z_notify after insert on public.quotation_responses for each row execute function private.notify_event();
create view private.supplier_onboarding as
with progress as (
 select p.id,p.full_name,u.email,p.created_at,b.id as business_id,b.name,b.division,b.district,
 coalesce(s.status,'active') as status,
 (b.id is not null and length(trim(b.address))>=3 and length(trim(b.description))>=20 and length(trim(b.contact_phone))>=8) as profile_complete,
 coalesce(v.approved,0) as approved_documents,coalesce(v.pending,0) as pending_documents,coalesce(v.rejected,0) as rejected_documents,
 coalesce(l.total,0) as products,coalesce(l.approved,0) as approved_products,coalesce(l.pending,0) as pending_products,
 coalesce(l.with_images,0) as products_with_images
 from public.profiles p join public.user_roles r on r.user_id=p.id and r.role='supplier' join auth.users u on u.id=p.id
 left join public.businesses b on b.owner_id=p.id left join public.account_statuses s on s.user_id=p.id
 left join lateral(select count(*) filter(where status='approved') approved,count(*) filter(where status='pending') pending,count(*) filter(where status='rejected') rejected from public.supplier_verifications where business_id=b.id) v on true
 left join lateral(select count(*) total,count(*) filter(where status='approved') approved,count(*) filter(where status='pending') pending,count(*) filter(where exists(select 1 from public.product_images i where i.product_id=products.id)) with_images from public.products where business_id=b.id and status<>'archived') l on true
)
select *, ((profile_complete::int+(approved_documents>0)::int+(approved_products>0)::int)*100/3) as completion,
 case when status='suspended' then 'suspended' when not profile_complete then 'profile_missing' when approved_documents=0 and pending_documents>0 then 'documents_pending' when approved_documents=0 and rejected_documents>0 then 'documents_rejected' when approved_documents=0 then 'documents_missing' when products=0 then 'products_missing' when approved_products=0 then 'products_pending' else 'ready' end as stage,
 (select max(created_at) from public.notifications n where n.recipient_id=progress.id and n.kind='onboarding_reminder') as last_reminded_at
from progress;
revoke all on private.supplier_onboarding from public,anon,authenticated;
create function public.admin_operations_list(kind text, filters jsonb default '{}', page integer default 1,page_size integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare base text;result jsonb;
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if page is null or page<1 or page>100000 or page_size is null or page_size not between 1 and 100 then raise exception 'Invalid pagination';end if;
 if kind='onboarding' then base='select to_jsonb(s) as row from private.supplier_onboarding s';
 elsif kind='notifications' then base='select to_jsonb(n)||jsonb_build_object(''email'',u.email,''full_name'',p.full_name,''delivery_status'',case when n.read_at is null then ''delivered'' else ''read'' end) as row from public.notifications n join public.profiles p on p.id=n.recipient_id join auth.users u on u.id=p.id';
 else raise exception 'Unknown list';end if;
 execute 'with filtered as materialized (select row from ('||base||') t where
 (coalesce($1->>''q'','''')='''' or concat_ws('' '',row->>''name'',row->>''email'',row->>''full_name'',row->>''title_en'',row->>''id'') ilike ''%''||left(($1->>''q''),200)||''%'')
 and (coalesce($1->>''stage'','''')='''' or row->>''stage''=$1->>''stage'')
 and (coalesce($1->>''kind'','''')='''' or row->>''kind''=$1->>''kind'')
 and (coalesce($1->>''status'','''')='''' or row->>''delivery_status''=$1->>''status'')
 and (coalesce($1->>''id'','''')='''' or row->>''id''=$1->>''id'')
 and (coalesce($1->>''from'','''')='''' or (row->>''created_at'')::timestamptz>=($1->>''from'')::date::timestamp at time zone ''Asia/Dhaka'')
 and (coalesce($1->>''to'','''')='''' or (row->>''created_at'')::timestamptz<(($1->>''to'')::date+1)::timestamp at time zone ''Asia/Dhaka''))
 select jsonb_build_object(''total'',(select count(*) from filtered),''rows'',coalesce((select jsonb_agg(row) from (select row from filtered order by row->>''created_at'' desc,row->>''id'' limit $2 offset $3) p),''[]''::jsonb))'
 into result using filters,page_size,(page-1)*page_size;return result;end; $$;
create function public.admin_send_onboarding_reminder(target uuid, template text) returns uuid language plpgsql security definer set search_path='' as $$
 declare supplier private.supplier_onboarding;notification_id uuid;heading_en text;heading_bn text;message_en text;message_bn text;link text;
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if template is null or template not in ('profile','documents','products') then raise exception 'Invalid reminder template';end if;
 perform private.consume_limit('onboarding_reminders',5,60);
 -- Lock the recipient role row to serialize deduplication across staff sessions.
 perform 1 from public.user_roles where user_id=target and role='supplier' for update;
 if not found then raise exception 'Supplier account required';end if;
 select * into supplier from private.supplier_onboarding where id=target;
 if exists(select 1 from public.notifications where recipient_id=target and reminder_template=template and created_at>now()-interval '24 hours') then raise exception 'This reminder was already delivered in the last 24 hours';end if;
 if template='profile' then
 if supplier.profile_complete then raise exception 'Business profile is already complete';end if;
 heading_en='Complete your business profile';heading_bn='আপনার ব্যবসার প্রোফাইল সম্পূর্ণ করুন';message_en='Add your business description, address and contact phone so buyers can learn about your company.';message_bn='ক্রেতাদের আপনার প্রতিষ্ঠান সম্পর্কে জানাতে ব্যবসার বিবরণ, ঠিকানা ও যোগাযোগ নম্বর যোগ করুন।';link='/dashboard/business';
 elsif template='documents' then
 if supplier.approved_documents>0 or supplier.pending_documents>0 then raise exception 'Documents are approved or awaiting review';end if;
 heading_en='Submit business verification documents';heading_bn='ব্যবসা যাচাইকরণের নথি জমা দিন';message_en='Upload your business documents securely from the verification page. Review feedback is available there.';message_bn='যাচাইকরণ পাতা থেকে নিরাপদে ব্যবসার নথি জমা দিন। পর্যালোচনার মতামত সেখানেই পাবেন।';link='/dashboard/verification';
 else
 if supplier.products>0 then raise exception 'Supplier already has active listings';end if;
 if supplier.status='suspended' then raise exception 'Reactivate the account before requesting a new listing';end if;
 heading_en='Add your first wholesale product';heading_bn='আপনার প্রথম পাইকারি পণ্য যোগ করুন';message_en='Create a product listing with specifications, MOQ, pricing and images. Listings are reviewed before publication.';message_bn='বিবরণ, সর্বনিম্ন অর্ডার, মূল্য ও ছবি দিয়ে পণ্য যোগ করুন। প্রকাশের আগে পণ্য পর্যালোচনা করা হয়।';link='/dashboard/products/new';end if;
 insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id,actor_id,reminder_template) values(target,'onboarding_reminder',heading_en,heading_bn,message_en,message_bn,link,target,auth.uid(),template) returning id into notification_id;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'onboarding.reminder',target,jsonb_build_object('notification_id',notification_id,'template',template,'channel','in_app'));
 return notification_id;end; $$;
-- Default explicit grants must be revoked as well as PUBLIC privileges.
do $$ declare f record;begin for f in select p.oid::regprocedure signature,p.proname,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
 (n.nspname='public' and p.proname in ('admin_save_homepage','admin_publish_homepage','get_homepage_content','mark_notification','mark_all_notifications_read','admin_operations_list','admin_send_onboarding_reminder')) or
 (n.nspname='private' and p.proname in ('valid_local_link','validate_homepage','published_marketing_asset','notify_event')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.nspname='public' then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;end $$;
grant execute on function public.get_homepage_content(),private.published_marketing_asset(text) to anon,authenticated;
create function public.admin_homepage_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;return (select to_jsonb(h) from public.homepage_content h);end; $$;
create function public.notification_unread_count() returns bigint language sql stable security invoker set search_path='' as $$ select count(*) from public.notifications where recipient_id=auth.uid() and read_at is null; $$;
create function public.get_notification_inbox(unread_only boolean default false,page integer default 1,page_size integer default 25) returns jsonb language plpgsql stable security invoker set search_path='' as $$
 declare result jsonb;
 begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if page is null or page<1 or page>100000 or page_size is null or page_size not between 1 and 100 then raise exception 'Invalid pagination';end if;
 select jsonb_build_object('total',(select count(*) from public.notifications where recipient_id=auth.uid() and (not unread_only or read_at is null)),
 'rows',coalesce((select jsonb_agg(to_jsonb(n)) from (select * from public.notifications where recipient_id=auth.uid() and (not unread_only or read_at is null) order by created_at desc,id limit page_size offset (page-1)*page_size) n),'[]')) into result;return result;end; $$;
revoke all on function public.admin_homepage_state(),public.notification_unread_count(),public.get_notification_inbox(boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_homepage_state(),public.notification_unread_count(),public.get_notification_inbox(boolean,integer,integer) to authenticated;
