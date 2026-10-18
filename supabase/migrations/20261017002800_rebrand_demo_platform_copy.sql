-- Update only the platform reference in explicitly fictional demo listing descriptions.
-- Supplier business identities and Auth account addresses are independent records.
with changed as (
 update public.products set description=replace(description,'for testing Paikari only','for testing Paikarii.com only')
 where name like '[DEMO]%' and description like '%for testing Paikari only%'
 returning id
)
insert into public.admin_audit_logs(admin_id,action,entity_id,details)
select null,'product.platform_brand_copy',id,jsonb_build_object('operator','owner-requested linked-project migration','before','for testing Paikari only','after','for testing Paikarii.com only') from changed;
