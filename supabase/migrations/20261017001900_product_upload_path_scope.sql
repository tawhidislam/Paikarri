-- Qualify the outer Storage object path: unqualified name inside the subquery
-- resolves to products.name and incorrectly denies valid supplier image uploads.
alter policy product_assets_upload on storage.objects with check (
 bucket_id='product-images'
 and private.is_active(auth.uid())
 and (storage.foldername(storage.objects.name))[1]=auth.uid()::text
 and exists (
  select 1 from public.products p
  where p.id::text=(storage.foldername(storage.objects.name))[2]
  and private.owns_business(p.business_id)
 )
);
