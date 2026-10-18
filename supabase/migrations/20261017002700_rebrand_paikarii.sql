-- Requested platform rebrand. Keep identities, account emails, paths and job IDs stable.
alter table public.platform_settings alter column name_en set default 'Paikarii.com';
alter table public.platform_settings alter column name_bn set default 'Paikarii.com';
do $$declare s public.platform_settings;h public.homepage_content;draft_value jsonb;published_value jsonb;entry record;copy_value text;original_value text;column_name text;config_value jsonb;begin
 select * into s from public.platform_settings for update;
 update public.platform_settings set name_en='Paikarii.com',name_bn='Paikarii.com',updated_at=now() where id=s.id;
 if s.name_en<>'Paikarii.com' or s.name_bn<>'Paikarii.com' then
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(null,'platform_settings.brand_rename',s.id,jsonb_build_object('operator','owner-requested linked-project migration','before',jsonb_build_object('name_en',s.name_en,'name_bn',s.name_bn),'after',jsonb_build_object('name_en','Paikarii.com','name_bn','Paikarii.com')));end if;
 select * into h from public.homepage_content for update;
 if h.id is not null then
 draft_value=h.draft;published_value=h.published;
 foreach column_name in array array['draft','published'] loop
 config_value=case column_name when 'draft' then draft_value else published_value end;
 if config_value is null then continue;end if;
 for entry in select key,value from jsonb_each_text(config_value) where key ~ '(_en|_bn)$' loop
 original_value=entry.value;copy_value=regexp_replace(original_value,'\mPaikari\M','Paikarii.com','gi');
 copy_value=replace(replace(replace(copy_value,'পাইকারিতে স্বাগতম','Paikarii.com-এ স্বাগতম'),'পাইকারির সাথে এগিয়ে যান','Paikarii.com-এর সাথে এগিয়ে যান'),'পাইকারিতে বিক্রি শুরু করুন','Paikarii.com-এ বিক্রি শুরু করুন');
 if copy_value is distinct from original_value then config_value=jsonb_set(config_value,array[entry.key],to_jsonb(copy_value));end if;
 end loop;
 if column_name='draft' then draft_value=config_value;else published_value=config_value;end if;
 end loop;
 if draft_value is distinct from h.draft or published_value is distinct from h.published then
 update public.homepage_content set draft=draft_value,published=published_value,revision=revision+1,updated_at=now() where id=h.id;
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(null,'homepage_content.brand_rename',h.id,jsonb_build_object('operator','owner-requested linked-project migration','draft_brand_copy_changed',draft_value is distinct from h.draft,'published_brand_copy_changed',published_value is distinct from h.published));
 end if;end if;
end$$;
