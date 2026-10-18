-- Protect the current approval pointer and notify only the current revision.
-- Changing a reviewed business identity requires a fresh listing/document review.
create or replace function private.guard_business() returns trigger language plpgsql set search_path='' as $$
 begin
 if current_user in ('postgres','supabase_admin') then return new; end if;
 if TG_OP='INSERT' then new.verified=false;new.verification_application_id=null;
 elsif new.id<>old.id or new.owner_id<>old.owner_id or new.verified<>old.verified or new.verification_application_id is distinct from old.verification_application_id then raise exception 'Protected business fields';
 elsif (new.name,new.name_bn,new.address,new.division,new.district,new.contact_phone) is distinct from (old.name,old.name_bn,old.address,old.division,old.district,old.contact_phone) then new.verified=false;
 end if; return new; end; $$;
create or replace function private.supplier_verified(bid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses b join public.verification_applications a on a.id=b.verification_application_id where b.id=bid and a.business_id=b.id and b.verified and private.is_active(b.owner_id) and a.status='approved' and a.valid_until>=private.verification_today() and a.business_snapshot=private.verification_snapshot(b)); $$;
create or replace function private.reconcile_supplier_verifications() returns void language plpgsql security definer set search_path='' as $$
 declare a record;
 begin
 for a in select v.id,v.business_id from public.verification_applications v where v.status='approved' and v.valid_until<private.verification_today() order by v.business_id loop
 perform 1 from public.businesses where id=a.business_id for update;perform pg_advisory_xact_lock(hashtextextended(a.business_id::text,0));
 update public.verification_applications set status='expired',lock_version=lock_version+1,updated_at=now() where id=a.id and status='approved' and valid_until<private.verification_today();
 if found then
 update public.businesses set verified=false where id=a.business_id and verification_application_id=a.id;
 insert into public.verification_reviews(application_id,decision,reason) values(a.id,'expired','A required document expired. Submit renewed evidence.');
 perform private.verification_audit(a.id,'expired','approved','expired');if exists(select 1 from public.businesses where id=a.business_id and verification_application_id=a.id) then perform private.verification_notify(a.id,'expired');end if;end if;end loop;
 for a in select v.id from public.verification_applications v join public.businesses b on b.verification_application_id=v.id where v.status='approved' and v.valid_until between private.verification_today() and private.verification_today()+7 loop perform private.verification_notify(a.id,'renewal_due');end loop;
 end;$$;
