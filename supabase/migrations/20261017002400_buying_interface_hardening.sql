-- Preserve purchase kind in list projections as well as immutable order details.
do $$declare definition text;begin definition=pg_get_functiondef('public.order_list(text,text,integer,integer)'::regprocedure);definition=replace(definition,'o.payment_method,o.total','o.payment_method,o.purchase_kind,o.total');execute definition;end$$;
-- Serialize file removal with draft submission, so frozen evidence cannot lose its record.
create or replace function public.sourcing_file_remove(target uuid) returns void language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;begin
 select sr.* into r from public.sourcing_requests sr join public.sourcing_files f on f.request_id=sr.id where f.id=target and sr.buyer_id=auth.uid() for update of sr;
 if r.id is null then raise exception 'Editable attachment required' using errcode='42501';end if;
 delete from public.sourcing_files f using public.sourcing_request_revisions v where f.id=target and v.request_id=f.request_id and v.revision=f.revision and v.submitted_at is null;
 if not found then raise exception 'Editable attachment required' using errcode='42501';end if;
end$$;
create function private.notify_sourcing() returns trigger language plpgsql security definer set search_path='' as $$declare r public.sourcing_requests;recipient uuid;begin
 if TG_TABLE_NAME='sourcing_request_revisions' then
 if new.submitted_at is null or old.submitted_at is not null then return new;end if;
 select * into r from public.sourcing_requests where id=new.request_id;select owner_id into recipient from public.businesses where id=r.business_id;
 else select * into r from public.sourcing_requests where id=new.request_id;recipient=r.buyer_id;end if;
 insert into public.notifications(recipient_id,kind,title_en,title_bn,body_en,body_bn,href,entity_id,actor_id) values(recipient,'quotation','Sourcing request updated','পণ্য সংগ্রহের অনুরোধ আপডেট হয়েছে','Open the request to review its latest submission or supplier offer.','সর্বশেষ অনুরোধ বা সরবরাহকারীর অফার দেখতে খুলুন।','/dashboard/requests/'||r.id,r.id,auth.uid());return new;
end$$;
create trigger sourcing_submitted after update of submitted_at on public.sourcing_request_revisions for each row execute function private.notify_sourcing();
create trigger sourcing_offered after insert on public.sourcing_offers for each row execute function private.notify_sourcing();
revoke all on function private.notify_sourcing() from public,anon,authenticated;
-- Bound supplier offer payloads before materializing lines, including empty offers.
do $$declare definition text;begin
 definition=pg_get_functiondef('public.sourcing_offer_publish(uuid,integer,jsonb)'::regprocedure);
 definition=replace(definition,'jsonb_typeof(payload->''lines'') is distinct from ''array'' or','jsonb_typeof(payload->''lines'') is distinct from ''array'' or jsonb_array_length(payload->''lines'') not between 1 and 100 or');execute definition;
end$$;

create function private.valid_sourcing_district(target text) returns boolean language sql immutable set search_path='' as $$select target=any(array['Dhaka','Faridpur','Gazipur','Gopalganj','Kishoreganj','Madaripur','Manikganj','Munshiganj','Narayanganj','Narsingdi','Rajbari','Shariatpur','Tangail','Bandarban','Brahmanbaria','Chandpur','Chattogram','Cumilla','Cox’s Bazar','Feni','Khagrachhari','Lakshmipur','Noakhali','Rangamati','Bogura','Chapainawabganj','Joypurhat','Naogaon','Natore','Pabna','Rajshahi','Sirajganj','Bagerhat','Chuadanga','Jashore','Jhenaidah','Khulna','Kushtia','Magura','Meherpur','Narail','Satkhira','Barguna','Barishal','Bhola','Jhalokathi','Patuakhali','Pirojpur','Habiganj','Moulvibazar','Sunamganj','Sylhet','Dinajpur','Gaibandha','Kurigram','Lalmonirhat','Nilphamari','Panchagarh','Rangpur','Thakurgaon','Jamalpur','Mymensingh','Netrokona','Sherpur']);$$;
revoke all on function private.valid_sourcing_district(text) from public,anon,authenticated;
do $$declare definition text;begin
 definition=pg_get_functiondef('public.sourcing_submit(uuid,integer)'::regprocedure);
 definition=replace(definition,'v.district=''''','not private.valid_sourcing_district(v.district)');execute definition;
 definition=pg_get_functiondef('public.sourcing_offer_publish(uuid,integer,jsonb)'::regprocedure);
 definition=replace(definition,'select * into r from public.sourcing_requests','perform private.consume_limit(''sourcing_offer'',20,3600); select * into r from public.sourcing_requests');execute definition;
 definition=pg_get_functiondef('public.sourcing_offer_checkout(uuid,integer,uuid,jsonb,text,text)'::regprocedure);
 definition=replace(definition,'select * into p from public.products','perform private.consume_limit(''sourcing_checkout'',10,60); select * into p from public.products');execute definition;
end$$;
