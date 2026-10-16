-- Keep moderator feedback separate from the publicly readable product record.
create table public.product_moderation_notes (
 product_id uuid primary key references public.products on delete cascade,
 note text not null check(length(note)<=2000), updated_at timestamptz not null default now()
);
alter table public.product_moderation_notes enable row level security;
revoke all on public.product_moderation_notes from public,anon,authenticated;
grant select on public.product_moderation_notes to authenticated;
grant all on public.product_moderation_notes to service_role;
create policy private_listing_feedback on public.product_moderation_notes for select to authenticated using(private.owns_product(product_id) or private.is_admin());
insert into public.product_moderation_notes(product_id,note) select id,left(moderation_note,2000) from public.products where moderation_note<>'';
update public.products set moderation_note='' where moderation_note<>'';
create function private.separate_listing_feedback() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if new.moderation_note<>'' then
 insert into public.product_moderation_notes(product_id,note) values(new.id,left(new.moderation_note,2000))
 on conflict(product_id) do update set note=excluded.note,updated_at=now();
 new.moderation_note='';
 end if;return new;
 end; $$;
revoke all on function private.separate_listing_feedback() from public,anon,authenticated;
-- Products already exist for moderation updates; this is an UPDATE-only trigger.
create trigger z_separate_listing_feedback before update on public.products for each row execute function private.separate_listing_feedback();
