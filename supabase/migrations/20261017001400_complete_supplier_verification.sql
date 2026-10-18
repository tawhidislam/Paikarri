-- Complete private supplier verification. Additive; legacy evidence is retained.
create table public.verification_applications (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses,
 revision integer not null check(revision>0), lock_version integer not null default 1,
 status text not null default 'draft' check(status in ('draft','submitted','approved','changes_requested','rejected','expired','revoked')),
 business_snapshot jsonb not null default '{}', declaration_at timestamptz, submitted_at timestamptz,
 reviewed_at timestamptz, reviewed_by uuid references public.profiles, valid_until date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(), unique(business_id,revision)
);
create unique index verification_one_draft on public.verification_applications(business_id) where status='draft';
create index verification_queue on public.verification_applications(status,created_at desc);
create table public.verification_identity (
 application_id uuid primary key references public.verification_applications,
 legal_name text not null default '' check(length(legal_name)<=200),dob date,address text not null default '' check(length(address)<=1000),
 issuing_country text not null default 'Bangladesh' check(length(issuing_country)<=100),
 document_type text not null default 'nid' check(document_type in ('nid','driving_license','passport')),
 document_number text not null default '' check(length(document_number)<=80),issued_on date,expires_on date,no_expiry boolean not null default true
);
create table public.verification_trade_license (
 application_id uuid primary key references public.verification_applications,
 license_number text not null default '' check(length(license_number)<=100),business_name text not null default '' check(length(business_name)<=200),
 owner_name text not null default '' check(length(owner_name)<=200),issuing_authority text not null default '' check(length(issuing_authority)<=200),
 business_address text not null default '' check(length(business_address)<=1000),issued_on date,expires_on date
);
create table public.verification_bank (
 application_id uuid primary key references public.verification_applications,
 bank_name text not null default '' check(length(bank_name)<=200),branch_name text not null default '' check(length(branch_name)<=200),
 account_title text not null default '' check(length(account_title)<=200),account_number text not null default '' check(length(account_number)<=80),
 account_type text not null default 'current' check(account_type in ('current','savings')),
 holder_type text not null default 'business' check(holder_type in ('business','owner')),routing_number text not null default '' check(routing_number='' or routing_number ~ '^[0-9]{9}$')
);
create table public.verification_files (
 id uuid primary key default gen_random_uuid(),application_id uuid not null references public.verification_applications,
 slot text not null check(slot in ('identity_front','identity_back','trade_license','bank_proof')),
 object_path text not null check(length(object_path)<=500),mime_type text not null,file_size bigint not null check(file_size between 1 and 10485760),
 position integer not null default 0,created_at timestamptz not null default now(),unique(application_id,object_path)
);
create index verification_files_object on public.verification_files(object_path);
create table public.verification_reviews (
 id uuid primary key default gen_random_uuid(),application_id uuid not null references public.verification_applications,
 decision text not null check(decision in ('approved','changes_requested','rejected','revoked','expired')),
 sections jsonb not null default '{}',reason text not null default '' check(length(reason)<=2000),
 reviewed_by uuid references public.profiles,created_at timestamptz not null default now()
);
create table private.verification_notices(application_id uuid references public.verification_applications,event text,primary key(application_id,event));
alter table private.verification_notices enable row level security;
revoke all on private.verification_notices from public,anon,authenticated;
alter table public.businesses add column verification_application_id uuid references public.verification_applications;
create function private.verification_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.verification_applications a join public.businesses b on b.id=a.business_id where a.id=target and (b.owner_id=auth.uid() or private.is_super_admin())); $$;
do $$declare t text;begin foreach t in array array['verification_applications','verification_identity','verification_trade_license','verification_bank','verification_files','verification_reviews'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy verification_private_read on public.%I for select to authenticated using(private.verification_access(%s))',t,case when t='verification_applications' then 'id' else 'application_id' end);
 end loop;end $$;
create function private.verification_today() returns date language sql stable set search_path='' as $$select (now() at time zone 'Asia/Dhaka')::date;$$;
create function private.verification_snapshot(b public.businesses) returns jsonb language sql immutable set search_path='' as $$select jsonb_build_object('owner_id',b.owner_id,'name',b.name,'name_bn',b.name_bn,'address',b.address,'division',b.division,'district',b.district,'contact_phone',b.contact_phone);$$;
create function private.supplier_verified(bid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses b join public.verification_applications a on a.id=b.verification_application_id where b.id=bid and b.verified and private.is_active(b.owner_id) and a.status='approved' and a.valid_until>=private.verification_today() and a.business_snapshot=private.verification_snapshot(b)); $$;
create function private.verification_detail(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb;
 begin
 if not private.verification_access(target) then raise exception 'Private verification access denied' using errcode='42501';end if;
 select jsonb_build_object('application',to_jsonb(a)-'business_snapshot'-'declaration_at','business',(to_jsonb(b)-'verified')||jsonb_build_object('verified',private.supplier_verified(b.id)),
 'identity',to_jsonb(i)-'application_id','trade_license',to_jsonb(t)-'application_id','bank',to_jsonb(k)-'application_id',
 'files',coalesce((select jsonb_agg(to_jsonb(f) order by f.slot,f.position,f.created_at) from public.verification_files f where f.application_id=a.id),'[]'),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.verification_reviews r where r.application_id=a.id),'[]')) into result
 from public.verification_applications a join public.businesses b on b.id=a.business_id join public.verification_identity i on i.application_id=a.id join public.verification_trade_license t on t.application_id=a.id join public.verification_bank k on k.application_id=a.id where a.id=target;
 return result;end;$$;
create function public.verification_get(target uuid) returns jsonb language sql stable security definer set search_path='' as $$select private.verification_detail(target);$$;
create function public.verification_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare b public.businesses;a uuid;
 begin
 if not private.is_supplier() then raise exception 'Supplier account required' using errcode='42501';end if;
 select * into b from public.businesses where owner_id=auth.uid();
 if b.id is null then return jsonb_build_object('business',null,'current',null,'history','[]'::jsonb,'legacy','[]'::jsonb);end if;
 select id into a from public.verification_applications where business_id=b.id order by revision desc limit 1;
 return jsonb_build_object('business',jsonb_build_object('id',b.id,'name',b.name,'verified',private.supplier_verified(b.id)),
 'current',case when a is not null then private.verification_detail(a) else null end,
 'history',coalesce((select jsonb_agg(to_jsonb(v)-'business_snapshot'-'declaration_at' order by revision desc) from public.verification_applications v where business_id=b.id),'[]'),
 'legacy',coalesce((select jsonb_agg(to_jsonb(v) order by created_at desc) from public.supplier_verifications v where business_id=b.id),'[]'));
 end;$$;
create function private.verification_audit(target uuid,action text,before_status text,after_status text) returns void language sql security definer set search_path='' as $$
 insert into public.admin_audit_logs(admin_id,action,entity_id,details) values(auth.uid(),'verification.'||action,target,jsonb_build_object('before',jsonb_build_object('status',before_status),'after',jsonb_build_object('status',after_status))); $$;
create function private.verification_notify(target uuid,event text) returns void language plpgsql security definer set search_path='' as $$
 declare recipient uuid;
 begin
 insert into private.verification_notices values(target,event) on conflict do nothing;if not found then return;end if;
 select b.owner_id into recipient from public.verification_applications a join public.businesses b on b.id=a.business_id where a.id=target;
 insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id,actor_id)
 values(recipient,'verification_review',case event when 'renewal_due' then 'Verification renewal due' else 'Supplier verification updated' end,'সরবরাহকারী যাচাই আপডেট',
 'Your verification status has changed. Open your private verification workspace for details.','যাচাইয়ের অবস্থা পরিবর্তিত হয়েছে। বিস্তারিত জানতে ব্যক্তিগত যাচাই পৃষ্ঠা খুলুন।','/dashboard/verification',target,auth.uid());end;$$;
create function public.verification_start() returns jsonb language plpgsql security definer set search_path='' as $$
 declare b public.businesses;previous public.verification_applications;target uuid;
 begin
 if not private.is_supplier() then raise exception 'Supplier account required' using errcode='42501';end if;
 select * into b from public.businesses where owner_id=auth.uid() for update;if b.id is null then raise exception 'Create your business profile first';end if;
 perform pg_advisory_xact_lock(hashtextextended(b.id::text,0));
 select * into previous from public.verification_applications where business_id=b.id order by revision desc limit 1;
 if previous.status='draft' then return private.verification_detail(previous.id);end if;
 if previous.status='submitted' then raise exception 'An application is already awaiting review';end if;
 insert into public.verification_applications(business_id,revision) values(b.id,coalesce(previous.revision,0)+1) returning id into target;
 insert into public.verification_identity(application_id) values(target);insert into public.verification_trade_license(application_id,business_name,business_address) values(target,b.name,b.address);insert into public.verification_bank(application_id) values(target);
 if previous.id is not null then
 update public.verification_identity set (legal_name,dob,address,issuing_country,document_type,document_number,issued_on,expires_on,no_expiry)=(select legal_name,dob,address,issuing_country,document_type,document_number,issued_on,expires_on,no_expiry from public.verification_identity where application_id=previous.id) where application_id=target;
 update public.verification_trade_license set (license_number,business_name,owner_name,issuing_authority,business_address,issued_on,expires_on)=(select license_number,business_name,owner_name,issuing_authority,business_address,issued_on,expires_on from public.verification_trade_license where application_id=previous.id) where application_id=target;
 update public.verification_bank set (bank_name,branch_name,account_title,account_number,account_type,holder_type,routing_number)=(select bank_name,branch_name,account_title,account_number,account_type,holder_type,routing_number from public.verification_bank where application_id=previous.id) where application_id=target;
 insert into public.verification_files(application_id,slot,object_path,mime_type,file_size,position) select target,slot,object_path,mime_type,file_size,position from public.verification_files where application_id=previous.id;
 end if;
 perform private.verification_audit(target,'draft_created',null,'draft');return private.verification_detail(target);end;$$;
create function private.verification_draft(target uuid,expected_version integer) returns public.verification_applications language plpgsql security definer set search_path='' as $$
 declare a public.verification_applications;bid uuid;
 begin
 select business_id into bid from public.verification_applications where id=target;
 if bid is null or not private.owns_business(bid) or not private.is_supplier() then raise exception 'Supplier ownership required' using errcode='42501';end if;
 perform 1 from public.businesses where id=bid for update;perform pg_advisory_xact_lock(hashtextextended(bid::text,0));
 select * into a from public.verification_applications where id=target for update;
 if a.status<>'draft' then raise exception 'Submitted evidence is locked';end if;
 if expected_version is null or a.lock_version<>expected_version then raise exception 'Application changed. Reload before saving.' using errcode='40001';end if;return a;end;$$;
create function public.verification_save_step(target uuid,expected_version integer,step text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a public.verification_applications;i public.verification_identity;t public.verification_trade_license;k public.verification_bank;old_type text;allowed text[];
 begin
 a=private.verification_draft(target,expected_version);
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>12000 then raise exception 'Invalid step information';end if;
 allowed=case step when 'identity' then array['legal_name','dob','address','issuing_country','document_type','document_number','issued_on','expires_on','no_expiry'] when 'trade_license' then array['license_number','business_name','owner_name','issuing_authority','business_address','issued_on','expires_on'] when 'bank' then array['bank_name','branch_name','account_title','account_number','account_type','holder_type','routing_number'] else null end;
 if allowed is null or exists(select 1 from jsonb_object_keys(payload) x where not(x=any(allowed))) then raise exception 'Invalid verification fields';end if;
 if step='identity' then
 select * into i from public.verification_identity where application_id=target;old_type=i.document_type;i=jsonb_populate_record(i,payload);
 if (i.dob is not null and i.dob>=private.verification_today()) or (i.issued_on is not null and i.issued_on>private.verification_today()) then raise exception 'Invalid identity dates';end if;
 if i.document_type<>'nid' then i.no_expiry=false;end if;if i.no_expiry then i.expires_on=null;end if;
 update public.verification_identity set legal_name=trim(i.legal_name),dob=i.dob,address=trim(i.address),issuing_country=trim(i.issuing_country),document_type=i.document_type,document_number=trim(i.document_number),issued_on=i.issued_on,expires_on=i.expires_on,no_expiry=i.no_expiry where application_id=target;
 if old_type<>i.document_type then delete from public.verification_files where application_id=target and slot in ('identity_front','identity_back');end if;
 elsif step='trade_license' then
 select * into t from public.verification_trade_license where application_id=target;t=jsonb_populate_record(t,payload);
 if t.issued_on>private.verification_today() then raise exception 'Invalid trade licence issue date';end if;
 update public.verification_trade_license set license_number=trim(t.license_number),business_name=trim(t.business_name),owner_name=trim(t.owner_name),issuing_authority=trim(t.issuing_authority),business_address=trim(t.business_address),issued_on=t.issued_on,expires_on=t.expires_on where application_id=target;
 else
 select * into k from public.verification_bank where application_id=target;k=jsonb_populate_record(k,payload);
 update public.verification_bank set bank_name=trim(k.bank_name),branch_name=trim(k.branch_name),account_title=trim(k.account_title),account_number=trim(k.account_number),account_type=k.account_type,holder_type=k.holder_type,routing_number=trim(k.routing_number) where application_id=target;
 end if;
 update public.verification_applications set lock_version=lock_version+1,updated_at=now() where id=target;
 perform private.verification_audit(target,'draft_saved','draft','draft');return private.verification_detail(target);end;$$;
create function private.verification_upload_allowed(path text) returns boolean language plpgsql stable security definer set search_path='' as $$
 declare parts text[]=string_to_array(path,'/');
 begin
 if cardinality(parts)<>4 or parts[1]<>auth.uid()::text or parts[3] not in ('identity_front','identity_back','trade_license','bank_proof') or parts[4]!~'^[a-f0-9-]+\.(jpg|jpeg|png|webp|pdf)$' then return false;end if;
 return private.is_supplier() and exists(select 1 from public.verification_applications a join public.businesses b on b.id=a.business_id where a.id=parts[2]::uuid and b.owner_id=auth.uid() and a.status='draft');
 exception when invalid_text_representation then return false;end;$$;
create function public.verification_attach_file(target uuid,expected_version integer,slot text,object_path text) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a public.verification_applications;meta jsonb;mime text;bytes bigint;n integer;
 begin
 a=private.verification_draft(target,expected_version);
 if slot not in ('identity_front','identity_back','trade_license','bank_proof') or object_path not like auth.uid()::text||'/'||target::text||'/'||slot||'/%' or not private.verification_upload_allowed(object_path) then raise exception 'Invalid document path';end if;
 select metadata into meta from storage.objects where bucket_id='business-documents' and name=object_path;
 mime=meta->>'mimetype';bytes=(meta->>'size')::bigint;
 if mime is null or bytes is null or bytes not between 1 and 10485760 or mime not in ('image/jpeg','image/png','image/webp','application/pdf') or (slot<>'trade_license' and mime='application/pdf') then raise exception 'Use an allowed file type, up to 10 MB.';end if;
 select count(*) into n from public.verification_files f where f.application_id=target and f.slot=verification_attach_file.slot;
 if n>=(case when slot='trade_license' then 5 else 1 end) then raise exception 'Document limit reached';end if;
 insert into public.verification_files(application_id,slot,object_path,mime_type,file_size,position) values(target,slot,object_path,mime,bytes,n);
 update public.verification_applications set lock_version=lock_version+1,updated_at=now() where id=target;
 perform private.verification_audit(target,'file_attached','draft','draft');return private.verification_detail(target);end;$$;
create function public.verification_remove_file(target uuid,expected_version integer,file_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 begin
 perform private.verification_draft(target,expected_version);
 delete from public.verification_files where id=file_id and application_id=target;if not found then raise exception 'Document not found';end if;
 update public.verification_applications set lock_version=lock_version+1,updated_at=now() where id=target;perform private.verification_audit(target,'file_detached','draft','draft');return private.verification_detail(target);end;$$;
create function private.verification_complete(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare i public.verification_identity;t public.verification_trade_license;k public.verification_bank;identity_ok boolean;trade_ok boolean;bank_ok boolean;today date=private.verification_today();
 begin
 select * into i from public.verification_identity where application_id=target;select * into t from public.verification_trade_license where application_id=target;select * into k from public.verification_bank where application_id=target;
 identity_ok=length(trim(i.legal_name))>0 and i.dob<today and length(trim(i.address))>0 and length(trim(i.issuing_country))>0 and length(trim(i.document_number))>0 and (i.issued_on is null or (i.issued_on<=today and i.issued_on>=i.dob)) and (i.document_type='nid' or i.issued_on is not null)
 and ((i.document_type='nid' and i.no_expiry and i.expires_on is null) or (not i.no_expiry and i.expires_on>=today and (i.issued_on is null or i.expires_on>=i.issued_on)))
 and exists(select 1 from public.verification_files where application_id=target and slot='identity_front') and (i.document_type='passport' or exists(select 1 from public.verification_files where application_id=target and slot='identity_back'));
 trade_ok=length(trim(t.license_number))>0 and length(trim(t.business_name))>0 and length(trim(t.owner_name))>0 and length(trim(t.issuing_authority))>0 and length(trim(t.business_address))>0 and t.issued_on<=today and t.expires_on>=today and t.expires_on>=t.issued_on and exists(select 1 from public.verification_files where application_id=target and slot='trade_license');
 bank_ok=length(trim(k.bank_name))>0 and length(trim(k.branch_name))>0 and length(trim(k.account_title))>0 and length(trim(k.account_number))>0 and exists(select 1 from public.verification_files where application_id=target and slot='bank_proof');
 return jsonb_build_object('identity',coalesce(identity_ok,false),'trade_license',coalesce(trade_ok,false),'bank',coalesce(bank_ok,false));end;$$;
create function public.verification_submit(target uuid,expected_version integer,declaration boolean) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a public.verification_applications;b public.businesses;complete jsonb;
 begin
 a=private.verification_draft(target,expected_version);complete=private.verification_complete(target);
 if declaration is distinct from true or complete<>'{"identity":true,"trade_license":true,"bank":true}'::jsonb then raise exception 'Complete all three steps, evidence and declaration before submitting';end if;
 if exists(select 1 from public.verification_files f where f.application_id=target and not exists(select 1 from storage.objects o where o.bucket_id='business-documents' and o.name=f.object_path)) then raise exception 'An evidence file is missing. Upload it again.';end if;
 select * into b from public.businesses where id=a.business_id;
 update public.verification_applications set status='submitted',lock_version=lock_version+1,submitted_at=now(),declaration_at=now(),business_snapshot=private.verification_snapshot(b),updated_at=now() where id=target;
 update public.businesses set verified=false where id=a.business_id;
 perform private.verification_audit(target,'submitted','draft','submitted');perform private.verification_notify(target,'submitted');return private.verification_detail(target);end;$$;
create function public.verification_decide(target uuid,expected_version integer,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a public.verification_applications;b public.businesses;decision text;reason text;sections jsonb;s text;until_date date;i public.verification_identity;t public.verification_trade_license;
 begin
 if not private.is_super_admin() then raise exception 'Super admin required' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>10000 then raise exception 'Invalid review';end if;
 select b0.* into b from public.businesses b0 join public.verification_applications a0 on a0.business_id=b0.id where a0.id=target for update of b0;
 if b.id is null then raise exception 'Application not found';end if;perform pg_advisory_xact_lock(hashtextextended(b.id::text,0));
 select * into a from public.verification_applications where id=target for update;
 if expected_version is null or a.lock_version<>expected_version then raise exception 'Application changed. Reload before reviewing.' using errcode='40001';end if;
 decision=payload->>'decision';reason=trim(coalesce(payload->>'reason',''));sections=payload->'sections';
 if decision is null or decision not in ('approved','changes_requested','rejected','revoked') or length(reason)>2000 then raise exception 'Invalid decision';end if;
 if decision='revoked' then
 if a.status<>'approved' or b.verification_application_id is distinct from target or length(reason)<5 then raise exception 'An approved application and reason are required';end if;sections='{}';
 else
 if a.status<>'submitted' then raise exception 'Only submitted applications can be reviewed';end if;
 if a.business_snapshot<>private.verification_snapshot(b) then raise exception 'Business identity changed. Request a corrected application.';end if;
 if jsonb_typeof(sections) is distinct from 'object' or (select count(*) from jsonb_object_keys(sections))<>3 then raise exception 'Review all three sections';end if;
 foreach s in array array['identity','trade_license','bank'] loop
 if jsonb_typeof(sections->s) is distinct from 'object' or (sections->s->>'status') is null or (sections->s->>'status') not in ('approved','changes_requested') or jsonb_typeof(sections->s->'note') is distinct from 'string' or length(sections->s->>'note')>2000 then raise exception 'Invalid section review';end if;
 if sections->s->>'status'='changes_requested' and length(trim(sections->s->>'note'))<5 then raise exception 'Explain corrections for every flagged section';end if;
 if decision='approved' and sections->s->>'status'<>'approved' then raise exception 'All three sections must be approved';end if;
 end loop;
 if decision='changes_requested' and not exists(select 1 from jsonb_each(sections) e where e.value->>'status'='changes_requested') then raise exception 'Select a section requiring corrections';end if;
 if decision='rejected' and length(reason)<5 then raise exception 'A rejection reason is required';end if;
 if decision='approved' then
 if payload->'holder_match_confirmed' is distinct from 'true'::jsonb then raise exception 'Confirm the bank account-holder match';end if;
 if private.verification_complete(target)<>'{"identity":true,"trade_license":true,"bank":true}'::jsonb then raise exception 'Application is incomplete or documents have expired';end if;
 select * into i from public.verification_identity where application_id=target;select * into t from public.verification_trade_license where application_id=target;
 until_date=least(t.expires_on,case when i.no_expiry then null else i.expires_on end);
 end if;end if;
 insert into public.verification_reviews(application_id,decision,sections,reason,reviewed_by) values(target,decision,sections,reason,auth.uid());
 update public.verification_applications set status=decision,lock_version=lock_version+1,reviewed_at=now(),reviewed_by=auth.uid(),valid_until=case when decision='approved' then until_date else valid_until end,updated_at=now() where id=target;
 update public.businesses set verified=(decision='approved'),verification_application_id=case when decision='approved' then target else verification_application_id end where id=b.id;
 perform private.verification_audit(target,'reviewed',a.status,decision);perform private.verification_notify(target,decision);return private.verification_detail(target);end;$$;
create function public.verification_list(filters jsonb default '{}',page integer default 1,page_size integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb;
 begin
 if not private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if page is null or page_size is null or page<1 or page>100000 or page_size<1 or page_size>100 then raise exception 'Invalid pagination';end if;
 with filtered as materialized (
 select a.*,b.name,private.verification_complete(a.id) complete from public.verification_applications a join public.businesses b on b.id=a.business_id
 where (coalesce(filters->>'q','')='' or b.name ilike '%'||left(filters->>'q',200)||'%') and (coalesce(filters->>'status','')='' or a.status=filters->>'status') and (coalesce(filters->>'business_id','')='' or a.business_id::text=filters->>'business_id')
 ),paged as(select * from filtered order by created_at desc,id limit page_size offset (page-1)*page_size)
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(jsonb_build_object('id',id,'business_id',business_id,'name',name,'revision',revision,'lock_version',lock_version,'status',status,'created_at',created_at,'submitted_at',submitted_at,'reviewed_at',reviewed_at,'valid_until',valid_until,'identity_complete',(complete->>'identity')::boolean,'trade_complete',(complete->>'trade_license')::boolean,'bank_complete',(complete->>'bank')::boolean)) from paged),'[]')) into result;
 return result;end;$$;
create function private.verification_delete_allowed(path text) returns boolean language plpgsql volatile security definer set search_path='' as $$
 declare parts text[]=string_to_array(path,'/');bid uuid;
 begin
 if cardinality(parts)<>4 or parts[1]<>auth.uid()::text or not private.is_supplier() then return false;end if;
 select a.business_id into bid from public.verification_applications a join public.businesses b on b.id=a.business_id where a.id=parts[2]::uuid and b.owner_id=auth.uid();if bid is null then return false;end if;
 perform 1 from public.businesses where id=bid for update;perform pg_advisory_xact_lock(hashtextextended(bid::text,0));perform 1 from public.verification_applications where id=parts[2]::uuid for update;
 return not exists(select 1 from public.verification_files f join public.verification_applications a on a.id=f.application_id where f.object_path=path and a.status<>'draft');
 exception when invalid_text_representation then return false;end;$$;
-- Owner and super admin only, including legacy rows and signed-URL creation.
alter policy verifications_read on public.supplier_verifications using(private.owns_business(business_id) or private.is_super_admin());
drop policy verifications_insert on public.supplier_verifications;
revoke insert,update,delete on public.supplier_verifications from authenticated;
create or replace function public.review_verification(target uuid,decision text,note text default '') returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Use the complete verification application review' using errcode='42501';end;$$;
update storage.buckets set allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'] where id='business-documents';
alter policy documents_read on storage.objects using(bucket_id='business-documents' and (private.is_super_admin() or (private.is_supplier() and (storage.foldername(name))[1]=auth.uid()::text)));
alter policy documents_upload on storage.objects with check(bucket_id='business-documents' and private.verification_upload_allowed(name));
create policy verification_documents_delete on storage.objects for delete to authenticated using(bucket_id='business-documents' and private.verification_delete_allowed(name));
create or replace function private.public_business(bid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses b where b.id=bid and private.is_active(b.owner_id) and (private.supplier_verified(b.id) or exists(select 1 from public.products p where p.business_id=b.id and p.status='approved')));$$;
create or replace function public.public_businesses() returns setof public.businesses language sql stable security invoker set search_path='' as $$
 select jsonb_populate_record(null::public.businesses,to_jsonb(b)||jsonb_build_object('verified',private.supplier_verified(b.id),'verification_application_id',null)) from public.businesses b where private.public_business(b.id);$$;
-- Replace only verified projections in existing functions, keeping every original authorization/filter.
do $$declare signature text;definition text;begin
 foreach signature in array array['public.search_products(text,text,text,text,numeric,numeric,integer,boolean)','private.validate_homepage(jsonb,boolean)','public.get_homepage_content()'] loop
 definition=pg_get_functiondef(signature::regprocedure);definition=replace(definition,'b.verified','private.supplier_verified(b.id)');execute definition;end loop;
 definition=pg_get_functiondef('public.admin_supplier_detail(uuid)'::regprocedure);execute replace(definition,'''business'',to_jsonb(b)','''business'',to_jsonb(b)||jsonb_build_object(''verified'',private.supplier_verified(b.id))');
 definition=pg_get_functiondef('public.admin_statistics(integer)'::regprocedure);execute replace(definition,'from public.supplier_verifications where status=''pending''','from public.verification_applications where status=''submitted''');
 definition=pg_get_functiondef('public.admin_list(text,jsonb,integer,integer)'::regprocedure);
 definition=replace(definition,'''verified'',b.verified','''verified'',private.supplier_verified(b.id)');
 definition=replace(definition,'base=$q$select to_jsonb(v)||jsonb_build_object(''name'',b.name,''owner_id'',b.owner_id,''division'',b.division) row from public.supplier_verifications v join public.businesses b on b.id=v.business_id$q$;','return public.verification_list(filters,page,page_size);');
 definition=replace(definition,'a.action not like ''homepage_content.%'' or private.is_super_admin()','private.is_super_admin() or (a.action not like ''homepage_content.%'' and a.action not like ''verification.%'' and a.action not like ''supplier_verifications.%'')');if position('from public.supplier_verifications v' in definition)>0 then raise exception 'Legacy admin verification projection was not replaced';end if;execute definition;
 end;$$;
alter policy audit_read on public.admin_audit_logs using(private.is_admin() and (private.is_super_admin() or (action not like 'homepage_content.%' and action not like 'verification.%' and action not like 'supplier_verifications.%')));
-- Onboarding counts complete, current applications. Product-review states stay unchanged.
create or replace view private.supplier_onboarding as
with progress as (
 select p.id,p.full_name,u.email,p.created_at,b.id as business_id,b.name,b.division,b.district,
 coalesce(s.status,'active') as status,
 (b.id is not null and length(trim(b.address))>=3 and length(trim(b.description))>=20 and length(trim(b.contact_phone))>=8) as profile_complete,
 coalesce(v.approved,0) as approved_documents,coalesce(v.pending,0) as pending_documents,coalesce(v.rejected,0) as rejected_documents,
 coalesce(l.total,0) as products,coalesce(l.approved,0) as approved_products,coalesce(l.pending,0) as pending_products,
 coalesce(l.with_images,0) as products_with_images
 from public.profiles p join public.user_roles r on r.user_id=p.id and r.role='supplier' join auth.users u on u.id=p.id
 left join public.businesses b on b.owner_id=p.id left join public.account_statuses s on s.user_id=p.id
 left join lateral(select count(*) filter(where status='approved' and id=b.verification_application_id and private.supplier_verified(b.id)) approved,count(*) filter(where status='submitted') pending,count(*) filter(where status in ('rejected','changes_requested','revoked','expired')) rejected from public.verification_applications where business_id=b.id) v on true
 left join lateral(select count(*) total,count(*) filter(where status='approved') approved,count(*) filter(where status='pending') pending,count(*) filter(where exists(select 1 from public.product_images i where i.product_id=products.id)) with_images from public.products where business_id=b.id and status<>'archived') l on true
)
select *, ((profile_complete::int+(approved_documents>0)::int+(approved_products>0)::int)*100/3) as completion,
 case when status='suspended' then 'suspended' when not profile_complete then 'profile_missing' when approved_documents=0 and pending_documents>0 then 'documents_pending' when approved_documents=0 and rejected_documents>0 then 'documents_rejected' when approved_documents=0 then 'documents_missing' when products=0 then 'products_missing' when approved_products=0 then 'products_pending' else 'ready' end as stage,
 (select max(created_at) from public.notifications n where n.recipient_id=progress.id and n.kind='onboarding_reminder') as last_reminded_at
from progress;
create function private.verification_business_changed() returns trigger language plpgsql security definer set search_path='' as $$
 declare a record;
 begin
 if private.verification_snapshot(new) is distinct from private.verification_snapshot(old) then
 for a in select * from public.verification_applications where business_id=new.id and status in ('approved','submitted') for update loop
 update public.verification_applications set status=case when a.status='approved' then 'revoked' else 'changes_requested' end,lock_version=lock_version+1,updated_at=now() where id=a.id;
 insert into public.verification_reviews(application_id,decision,reason,reviewed_by) values(a.id,case when a.status='approved' then 'revoked' else 'changes_requested' end,'Business identity changed; submit a new application.',auth.uid());
 perform private.verification_audit(a.id,'business_changed',a.status,case when a.status='approved' then 'revoked' else 'changes_requested' end);perform private.verification_notify(a.id,'business_changed');end loop;
 update public.businesses set verified=false where id=new.id and verified;
 end if;return null;end;$$;
create trigger verification_business_changed after update on public.businesses for each row execute function private.verification_business_changed();
create function private.reconcile_supplier_verifications() returns void language plpgsql security definer set search_path='' as $$
 declare a record;
 begin
 for a in select v.id,v.business_id from public.verification_applications v where v.status='approved' and v.valid_until<private.verification_today() order by v.business_id loop
 perform 1 from public.businesses where id=a.business_id for update;perform pg_advisory_xact_lock(hashtextextended(a.business_id::text,0));
 update public.verification_applications set status='expired',lock_version=lock_version+1,updated_at=now() where id=a.id and status='approved' and valid_until<private.verification_today();
 if found then
 update public.businesses set verified=false where id=a.business_id and verification_application_id=a.id;
 insert into public.verification_reviews(application_id,decision,reason) values(a.id,'expired','A required document expired. Submit renewed evidence.');
 perform private.verification_audit(a.id,'expired','approved','expired');perform private.verification_notify(a.id,'expired');end if;end loop;
 for a in select id from public.verification_applications where status='approved' and valid_until between private.verification_today() and private.verification_today()+7 loop perform private.verification_notify(a.id,'renewal_due');end loop;
 end;$$;
-- Lock down default grants on every new helper and RPC.
do $$declare f record;begin for f in select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='private' and (p.proname like 'verification_%' or p.proname in ('supplier_verified','reconcile_supplier_verifications'))) or (n.nspname='public' and p.proname like 'verification_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.nspname='public' then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;end;$$;
grant execute on function private.verification_access(uuid),private.verification_upload_allowed(text),private.verification_delete_allowed(text) to authenticated;
grant execute on function private.supplier_verified(uuid) to anon,authenticated;
-- Public browsing never treats an old one-document decision as a complete approval.
-- No legacy badges exist in the linked project; preserve any history without converting it.
