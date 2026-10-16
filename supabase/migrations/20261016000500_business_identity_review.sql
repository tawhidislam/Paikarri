-- Changing a reviewed business identity requires a fresh listing/document review.
create or replace function private.guard_business() returns trigger language plpgsql set search_path='' as $$
 begin
 if current_user in ('postgres','supabase_admin') then return new; end if;
 if TG_OP='INSERT' then new.verified=false;
 elsif new.id<>old.id or new.owner_id<>old.owner_id or new.verified<>old.verified then raise exception 'Protected business fields';
 elsif (new.name,new.name_bn,new.address,new.division,new.district,new.contact_phone) is distinct from (old.name,old.name_bn,old.address,old.division,old.district,old.contact_phone) then new.verified=false;
 end if; return new; end; $$;
create function private.review_identity_change() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if (new.name,new.name_bn,new.address,new.division,new.district,new.contact_phone) is distinct from (old.name,old.name_bn,old.address,old.division,old.district,old.contact_phone) then
 update public.products set status='pending',moderation_note='Business identity changed; review required.' where business_id=new.id and status='approved';
 update public.supplier_verifications set status='pending',review_note='Business identity changed; review required.',reviewed_by=null,reviewed_at=null where business_id=new.id and status='approved';
 end if;return null;
 end; $$;
revoke all on function private.review_identity_change() from public;
create trigger review_identity_change after update on public.businesses for each row execute function private.review_identity_change();
alter table public.categories add constraint category_name_length check(length(name) between 2 and 100 and length(name_bn) between 2 and 100);
create function private.guard_category_tree() returns trigger language plpgsql set search_path='' as $$
 begin
 if new.parent_id is not null and exists(select 1 from public.categories where id=new.parent_id and parent_id is not null) then raise exception 'Only categories and one level of subcategories are supported'; end if;
 if new.parent_id is not null and exists(select 1 from public.categories where parent_id=new.id) then raise exception 'A category with children cannot become a subcategory'; end if;
 return new;end; $$;
revoke all on function private.guard_category_tree() from public;
create trigger guard_category_tree before insert or update on public.categories for each row execute function private.guard_category_tree();
grant all on public.profiles,public.user_roles,public.businesses,public.categories,public.products,public.product_images,public.product_price_tiers,public.supplier_verifications,public.favorites,public.saved_suppliers,public.quotation_requests,public.quotation_responses,public.conversations,public.messages,public.reports,public.admin_audit_logs to service_role;
