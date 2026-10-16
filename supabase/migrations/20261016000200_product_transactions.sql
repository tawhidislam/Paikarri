-- An invoker RPC keeps product + tier writes atomic and preserves all RLS checks.
create function public.save_product(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
 declare pid uuid; bid uuid; tier jsonb;
 begin
 if not private.is_supplier() then raise exception 'Supplier account required' using errcode='42501'; end if;
 select id into bid from public.businesses where owner_id=auth.uid();
 if bid is null then raise exception 'Create your business profile first'; end if;
 if coalesce(jsonb_typeof(payload->'tiers'),'array') <> 'array' or jsonb_array_length(coalesce(payload->'tiers','[]'))>20 then raise exception 'Invalid pricing tiers'; end if;
 if payload->>'id' is not null then
 pid=(payload->>'id')::uuid;
 perform 1 from public.products where id=pid and business_id=bid for update;
 if not found then raise exception 'Product not found or access denied' using errcode='42501'; end if;
 update public.products set name=payload->>'name',name_bn=coalesce(payload->>'name_bn',''),description=payload->>'description',category_id=(payload->>'category_id')::uuid,
 price=(payload->>'price')::numeric,moq=(payload->>'moq')::integer,stock=(payload->>'stock')::integer,unit=payload->>'unit',specifications=coalesce(payload->'specifications','{}'),status='pending' where id=pid;
 else
 insert into public.products(business_id,category_id,name,name_bn,description,price,moq,stock,unit,specifications)
 values(bid,(payload->>'category_id')::uuid,payload->>'name',coalesce(payload->>'name_bn',''),payload->>'description',(payload->>'price')::numeric,(payload->>'moq')::integer,(payload->>'stock')::integer,payload->>'unit',coalesce(payload->'specifications','{}')) returning id into pid;
 end if;
 delete from public.product_price_tiers where product_id=pid;
 for tier in select * from jsonb_array_elements(coalesce(payload->'tiers','[]')) loop
 insert into public.product_price_tiers(product_id,min_quantity,price) values(pid,(tier->>'min_quantity')::integer,(tier->>'price')::numeric);
 end loop;
 return pid;
 end; $$;
revoke all on function public.save_product(jsonb) from public;
grant execute on function public.save_product(jsonb) to authenticated;
