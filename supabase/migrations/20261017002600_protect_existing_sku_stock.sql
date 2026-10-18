-- Editing an old product form must never restore stock reserved after the form loaded.
-- Existing inventory is edited only by version-checked SKU controls.
do $$declare definition text;begin
 definition=pg_get_functiondef('public.save_product(jsonb)'::regprocedure);
 if position('update public.product_skus set stock=(payload->>''stock'')::int,version=version+1 where product_id=pid;' in definition)=0 then raise exception 'Expected SKU stock compatibility code not found';end if;
 definition=replace(definition,'update public.product_skus set stock=(payload->>''stock'')::int,version=version+1 where product_id=pid;','update public.product_skus set version=version+1 where product_id=pid;');execute definition;
end$$;
