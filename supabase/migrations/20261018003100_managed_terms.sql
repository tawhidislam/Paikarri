-- Additive bilingual Terms CMS. No content is published by this migration.
create table public.terms_content (
 id uuid primary key default '00000000-0000-0000-0000-000000000003' check(id='00000000-0000-0000-0000-000000000003'),
 draft jsonb not null default '{}', published jsonb, revision integer not null default 0,
 published_revision integer, published_at timestamptz, published_by uuid references public.profiles,
 updated_at timestamptz not null default now()
);
insert into public.terms_content default values;
create table public.terms_content_history (
 id uuid primary key default gen_random_uuid(), revision integer not null unique,
 action text not null check(action in ('saved','published')),
 before_content jsonb, after_content jsonb not null,
 actor_id uuid not null references public.profiles, created_at timestamptz not null default now()
);
alter table public.terms_content enable row level security;
alter table public.terms_content_history enable row level security;
revoke all on public.terms_content,public.terms_content_history from public,anon,authenticated;
grant select on public.terms_content,public.terms_content_history to authenticated;
grant all on public.terms_content,public.terms_content_history to service_role;
create policy terms_owner_read on public.terms_content for select to authenticated using(private.is_super_admin());
create policy terms_history_owner_read on public.terms_content_history for select to authenticated using(private.is_super_admin());

create function private.validate_terms(config jsonb,publishing boolean) returns void language plpgsql set search_path='' as $$
declare k text;s jsonb;d date;
begin
 if config is null or jsonb_typeof(config)<>'object' or octet_length(config::text)>100000 then raise exception 'Invalid terms content';end if;
 foreach k in array array['title_en','title_bn','intro_en','intro_bn','effective_date'] loop
  if jsonb_typeof(config->k) is distinct from 'string' then raise exception 'Invalid terms field: %',k;end if;
  if length(config->>k)>(case when k like 'title_%' then 160 when k='effective_date' then 10 else 2000 end) then raise exception 'Terms field too long: %',k;end if;
 end loop;
 if config->>'effective_date'<>'' then
  if (config->>'effective_date') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid effective date';end if;
  d=(config->>'effective_date')::date;
  if to_char(d,'YYYY-MM-DD')<>config->>'effective_date' then raise exception 'Invalid effective date';end if;
 end if;
 if jsonb_typeof(config->'sections') is distinct from 'array' or jsonb_array_length(config->'sections')>30 then raise exception 'Up to 30 terms sections allowed';end if;
 if publishing and (length(trim(config->>'title_en'))=0 or length(trim(config->>'title_bn'))=0 or length(trim(config->>'intro_en'))=0 or length(trim(config->>'intro_bn'))=0 or config->>'effective_date'='' or jsonb_array_length(config->'sections')=0) then raise exception 'Complete both languages and choose an effective date before publishing';end if;
 for s in select value from jsonb_array_elements(config->'sections') loop
  if jsonb_typeof(s)<>'object' then raise exception 'Invalid section';end if;
  foreach k in array array['heading_en','heading_bn','body_en','body_bn'] loop
   if jsonb_typeof(s->k) is distinct from 'string' or length(s->>k)>(case when k like 'heading_%' then 200 else 8000 end) then raise exception 'Invalid section field: %',k;end if;
   if publishing and length(trim(s->>k))=0 then raise exception 'Complete every section in both languages before publishing';end if;
  end loop;
 end loop;
end;$$;
revoke all on function private.validate_terms(jsonb,boolean) from public,anon,authenticated;

create function public.get_terms_content() returns jsonb language sql stable security definer set search_path='' as $$
 select case when published is null then null else jsonb_build_object('content',published,'version',published_revision,'published_at',published_at) end from public.terms_content;
$$;
create function public.admin_terms_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 return (select jsonb_build_object('draft',draft,'published',published,'revision',revision,'published_at',published_at,'published_revision',published_revision,'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.revision desc) from(select revision,action,after_content,created_at from public.terms_content_history order by revision desc limit 20) h),'[]'::jsonb)) from public.terms_content);
end;$$;
create function public.admin_save_terms(config jsonb,expected_revision integer) returns integer language plpgsql security definer set search_path='' as $$
declare current public.terms_content;rev integer;
begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 perform private.validate_terms(config,false);
 select * into current from public.terms_content for update;
 if current.revision is distinct from expected_revision then raise exception 'Terms changed in another tab. Reload before saving.' using errcode='40001';end if;
 rev=current.revision+1;
 update public.terms_content set draft=config,revision=rev,updated_at=now() where id=current.id;
 insert into public.terms_content_history(revision,action,before_content,after_content,actor_id) values(rev,'saved',current.draft,config,auth.uid());
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'terms_content.saved',current.id,jsonb_build_object('before_revision',current.revision,'after_revision',rev));
 return rev;
end;$$;
create function public.admin_publish_terms(expected_revision integer) returns void language plpgsql security definer set search_path='' as $$
declare current public.terms_content;rev integer;
begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 select * into current from public.terms_content for update;
 if current.revision is distinct from expected_revision then raise exception 'Terms changed in another tab. Reload before publishing.' using errcode='40001';end if;
 perform private.validate_terms(current.draft,true);
 rev=current.revision+1;
 update public.terms_content set published=draft,published_revision=rev,revision=rev,published_at=now(),published_by=auth.uid(),updated_at=now() where id=current.id;
 insert into public.terms_content_history(revision,action,before_content,after_content,actor_id) values(rev,'published',current.published,current.draft,auth.uid());
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'terms_content.published',current.id,jsonb_build_object('before_revision',current.revision,'after_revision',rev));
end;$$;
revoke all on function public.get_terms_content(),public.admin_terms_state(),public.admin_save_terms(jsonb,integer),public.admin_publish_terms(integer) from public,anon,authenticated;
grant execute on function public.get_terms_content() to anon,authenticated;
grant execute on function public.admin_terms_state(),public.admin_save_terms(jsonb,integer),public.admin_publish_terms(integer) to authenticated;
