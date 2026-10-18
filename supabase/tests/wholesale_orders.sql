-- Synthetic orders only; no real messages, orders, payments or user changes survive.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
create function pg_temp.denied(q text) returns void language plpgsql as $$begin begin execute q;exception when insufficient_privilege or raise_exception or invalid_parameter_value or check_violation or serialization_failure then return;end;raise exception 'UNEXPECTEDLY ALLOWED: %',q;end$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('e1000000-0000-4000-8000-000000000001','buyer@orders.invalid',now(),'{"full_name":"Order Buyer"}'),
('e1000000-0000-4000-8000-000000000002','supplier@orders.invalid',now(),'{}'),
('e1000000-0000-4000-8000-000000000003','supplier2@orders.invalid',now(),'{}'),
('e1000000-0000-4000-8000-000000000004','super@orders.invalid',now(),'{}'),
('e1000000-0000-4000-8000-000000000005','staff@orders.invalid',now(),'{}'),
('e1000000-0000-4000-8000-000000000006','other@orders.invalid',now(),'{}');
update public.user_roles set role=case user_id when 'e1000000-0000-4000-8000-000000000004' then 'super_admin' when 'e1000000-0000-4000-8000-000000000005' then 'admin' else 'supplier' end where user_id in('e1000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000004','e1000000-0000-4000-8000-000000000005');
insert into public.businesses(id,owner_id,name,division,district) values
('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002','Synthetic Order Supplier','Dhaka','Dhaka'),
('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000003','Synthetic Second Supplier','Dhaka','Dhaka');
insert into public.products(id,business_id,category_id,name,name_bn,description,price,moq,stock,status) values
('e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001',(select id from public.categories limit 1),'Synthetic Order Product','','Synthetic order tests only',100,5,100,'approved'),
('e3000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000002',(select id from public.categories limit 1),'Synthetic Second Product','','Synthetic order tests only',50,2,20,'approved');
insert into public.product_price_tiers(product_id,min_quantity,price) values('e3000000-0000-4000-8000-000000000001',10,90);
update public.products set status='approved' where id='e3000000-0000-4000-8000-000000000001';
create temp table fixture(first_id uuid,second_id uuid,expected jsonb,address jsonb,result jsonb);grant all on fixture to authenticated;
insert into fixture(address) values('{"name":"Synthetic Buyer","phone":"01712345678","address":"10 Synthetic Road Dhaka","district":"Dhaka","division":"Dhaka"}');
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';set local role authenticated;
select pg_temp.denied($$select public.cart_set('e3000000-0000-4000-8000-000000000001',1)$$);
select pg_temp.denied($$select public.cart_set('e3000000-0000-4000-8000-000000000001',101)$$);
select public.cart_set('e3000000-0000-4000-8000-000000000001',10),public.cart_set('e3000000-0000-4000-8000-000000000002',2);
select pg_temp.ok((public.cart_quote()->'rows'->0->>'unit_price')::numeric=90,'highest eligible quantity price selected on server');
update fixture set expected=(select jsonb_agg(jsonb_build_object('product_id',r->>'product_id','quantity',(r->>'quantity')::integer,'unit_price',(r->>'unit_price')::numeric) order by r->>'product_id') from jsonb_array_elements(public.cart_quote()->'rows') r);
select pg_temp.denied(format('select public.order_checkout(''e4000000-0000-4000-8000-000000000001'',%L,''bank_transfer'','''',''[]'')',address::text)) from fixture;
select pg_temp.denied(format('select public.order_checkout(''e4000000-0000-4000-8000-000000000001'',%L,''bank_transfer'','''',%L)',jsonb_set(address,'{district}','"Sylhet"')::text,expected::text)) from fixture;
update fixture set result=public.order_checkout('e4000000-0000-4000-8000-000000000001',address,'bank_transfer','Synthetic order',expected);
select pg_temp.ok(jsonb_array_length(result->'ids')=2,'multi supplier checkout split into separate orders') from fixture;
update fixture set first_id=(select o.id from public.orders o where o.business_id='e2000000-0000-4000-8000-000000000001'),second_id=(select o.id from public.orders o where o.business_id='e2000000-0000-4000-8000-000000000002');
select pg_temp.ok((public.order_checkout('e4000000-0000-4000-8000-000000000001',address,'bank_transfer','Synthetic order',expected))=result,'retry creates no duplicates even with an emptied cart') from fixture;
select pg_temp.denied(format('select public.order_checkout(''e4000000-0000-4000-8000-000000000001'',%L,''cod'',''Synthetic order'',%L)',address::text,expected::text)) from fixture;
select pg_temp.ok(public.cart_quote()->'rows'='[]'::jsonb,'checkout clears cart atomically');
select pg_temp.ok((select stock=90 and status='approved' from public.products where id='e3000000-0000-4000-8000-000000000001'),'stock reserved without changing listing approval');
select pg_temp.ok((public.order_detail(first_id)->>'subtotal')::numeric=900,'immutable tier-priced item subtotal') from fixture;
select pg_temp.denied(format('update public.orders set subtotal=1 where id=%L',first_id)) from fixture;
select pg_temp.denied(format('select public.order_action(%L,1,''confirm'',''{"shipping_fee":0}'')',first_id)) from fixture;
-- Staff, unrelated buyers, and the other supplier cannot read or mutate orders.
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000005","role":"authenticated"}';
select pg_temp.denied($$select public.order_list()$$);
select pg_temp.denied(format('select public.order_detail(%L)',first_id)) from fixture;
select pg_temp.ok((select count(*)=0 from public.orders),'staff direct table privacy');
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000006","role":"authenticated"}';
select pg_temp.ok(public.order_list()->>'total'='0','unrelated buyer sees no orders');
select pg_temp.denied(format('select public.order_detail(%L)',first_id)) from fixture;
select pg_temp.ok((select count(*)=0 from public.order_items) and (select count(*)=0 from public.order_payments),'order items and bank references private');
select pg_temp.denied($$select public.order_list('','',1,101)$$);
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.denied(format('select public.order_action(%L,1,''confirm'',''{"shipping_fee":25}'')',first_id)) from fixture;
-- Supplier confirms delivery terms, buyer accepts total, bank reports are untrusted.
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.order_action(first_id,1,'confirm','{"shipping_fee":25,"note":"Dispatch in two days"}') from fixture;
select pg_temp.denied(format('select public.order_action(%L,1,''confirm'',''{"shipping_fee":25}'')',first_id)) from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.ok((public.order_action(first_id,2,'accept')->>'total')::numeric=925,'buyer explicitly accepts supplier confirmed final total') from fixture;
select public.order_action(first_id,3,'report_payment','{"reference":"SYNTHETIC-NOT-A-PAYMENT"}') from fixture;
select pg_temp.ok(public.order_detail(first_id)->>'payment_status'='reported','report does not mark payment paid') from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.denied(format('select public.order_action(%L,4,''ship'',''{"carrier":"Synthetic","tracking_number":"NOTREAL"}'')',first_id)) from fixture;
select pg_temp.denied(format('select public.order_action(%L,4,''confirm_payment'',''{"reference":"FORGED"}'')',first_id)) from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.order_action(first_id,4,'confirm_payment','{"reference":"SYNTHETIC VERIFIED RECEIPT"}') from fixture;
select pg_temp.ok((select count(*)=1 from public.admin_audit_logs a,fixture f where a.entity_id=f.first_id and a.action='order.confirm_payment' and a.details->'before'->>'payment_status'='reported' and a.details->'after'->>'payment_status'='paid'),'privileged payment mutation audited transactionally');
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.order_action(first_id,5,'ship','{"carrier":"Synthetic Courier","tracking_number":"SYNTHETIC-123"}') from fixture;
select pg_temp.denied(format('select public.order_action(%L,6,''cancel'',''{"note":"Cannot cancel shipped order"}'')',first_id)) from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.order_action(first_id,6,'receive') from fixture;
select public.order_action(first_id,7,'dispute','{"note":"Synthetic damage dispute for testing"}') from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.order_action(first_id,8,'authorize_return','{"note":"Synthetic return authorization for full order"}') from fixture;
select pg_temp.denied(format('select public.order_action(%L,9,''resolve_cancel'',''{"note":"Cannot resolve before receiving return"}'')',first_id)) from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.order_action(first_id,9,'return_ship','{"carrier":"Synthetic Return Courier","tracking_number":"SYNTHETIC-RETURN-123"}') from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.order_action(first_id,10,'return_received','{"note":"All returned items inspected; damaged goods not restocked","restock":false}') from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.order_action(first_id,11,'resolve_cancel','{"note":"Synthetic full refund resolution"}') from fixture;
select pg_temp.ok(public.order_detail(first_id)->>'payment_status'='refund_pending','refund decision does not claim money was returned') from fixture;
select public.order_action(first_id,12,'confirm_refund','{"reference":"SYNTHETIC EXTERNAL REFUND"}') from fixture;
select pg_temp.ok((select stock=90 from public.products where id='e3000000-0000-4000-8000-000000000001'),'shipped goods are not automatically restocked after dispute');
-- Cancellation under suspension preserves follow-up and restores stock once.
reset role;
update public.account_statuses set status='suspended',reason='Synthetic order suspension' where user_id in('e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000003');
set local role authenticated;set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select pg_temp.denied($$select public.cart_set('e3000000-0000-4000-8000-000000000001',5)$$);
select public.order_action(second_id,1,'cancel','{"note":"Synthetic cancellation before confirmation"}') from fixture;
select pg_temp.denied(format('select public.order_action(%L,2,''cancel'',''{"note":"Cannot release stock twice"}'')',second_id)) from fixture;
reset role;
select pg_temp.ok((select stock=20 from public.products where id='e3000000-0000-4000-8000-000000000002'),'pre shipment cancellation restores reserved stock under suspension');
update public.account_statuses set status='active',reason='' where user_id in('e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000003');
-- A late external payment after cancellation creates an explicit refund obligation.
set local role authenticated;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.order_action(second_id,2,'confirm_payment','{"reference":"SYNTHETIC LATE BANK RECEIPT"}') from fixture;
select pg_temp.ok(public.order_detail(second_id)->>'payment_status'='refund_pending','late payment after cancellation requires an external refund') from fixture;
select public.order_action(second_id,3,'confirm_refund','{"reference":"SYNTHETIC LATE PAYMENT REFUNDED"}') from fixture;
reset role;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
-- COD, cancellation request/decline and expiry lifecycle.
set local role authenticated;
select public.cart_set('e3000000-0000-4000-8000-000000000002',2);
update fixture set expected=(select jsonb_agg(jsonb_build_object('product_id',r->>'product_id','quantity',(r->>'quantity')::integer,'unit_price',(r->>'unit_price')::numeric) order by r->>'product_id') from jsonb_array_elements(public.cart_quote()->'rows') r);
update fixture set result=public.order_checkout('e4000000-0000-4000-8000-000000000002',address,'cod','',expected);
update fixture set second_id=(result->'ids'->>0)::uuid;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.order_action(second_id,1,'confirm','{"shipping_fee":0}') from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.order_action(second_id,2,'accept') from fixture;
select public.order_action(second_id,3,'request_cancel','{"note":"Synthetic cancellation request"}') from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select pg_temp.denied(format('select public.order_action(%L,4,''ship'',''{"carrier":"Synthetic","tracking_number":"TEST"}'')',second_id)) from fixture;
select public.order_action(second_id,4,'decline_cancel','{"note":"Synthetic agreed preparation already complete"}') from fixture;
select public.order_action(second_id,5,'ship','{"carrier":"Synthetic","tracking_number":"COD-TEST"}') from fixture;
select pg_temp.ok(public.order_detail(second_id)->>'payment_status'='unpaid','COD dispatch does not forge collection') from fixture;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.cart_set('e3000000-0000-4000-8000-000000000002',2);
update fixture set result=public.order_checkout('e4000000-0000-4000-8000-000000000003',address,'cod','',expected);
reset role;
update public.orders set expires_at=now()-interval '1 second' where id=(select (result->'ids'->>0)::uuid from fixture);
select set_config('request.jwt.claims','{}',true);
select private.expire_orders();
select pg_temp.ok((select status='cancelled' from public.orders where id=(select (result->'ids'->>0)::uuid from fixture)),'abandoned order auto expires');
select pg_temp.ok((select stock=18 from public.products where id='e3000000-0000-4000-8000-000000000002'),'expired order restores only its own units');
select pg_temp.ok((select count(*)=9 from pg_tables where schemaname='public' and tablename in('cart_items','checkout_batches','orders','order_items','order_events','order_shipments','order_payments','order_disputes','order_returns') and rowsecurity),'RLS enabled on every order table');
set local role anon;
select pg_temp.denied($$select public.order_list()$$);select pg_temp.denied($$select public.cart_quote()$$);select pg_temp.denied($$select * from public.orders$$);
reset role;
select 'wholesale order security and lifecycle checks passed' as result;
rollback;
