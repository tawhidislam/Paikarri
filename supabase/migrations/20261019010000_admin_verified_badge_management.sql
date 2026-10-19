-- Verified Badge Management for Suppliers with Super Admin Management Panel
-- Enables direct badge granting and revocation with audit justifications, method tags, and validity periods.

create or replace function public.admin_supplier_operations_list(
  kind text,
  filters jsonb default '{}',
  page integer default 1,
  page_size integer default 25
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  result jsonb;
  base text;
  window_days integer;
begin
  if not private.is_super_admin() then
    raise exception 'Super admin required' using errcode='42501';
  end if;

  if page is null or page_size is null or page < 1 or page > 100000 or page_size < 1 or page_size > 100 or jsonb_typeof(filters) is distinct from 'object' then
    raise exception 'Invalid pagination';
  end if;

  if kind = 'suppliers' then
    base = 'select to_jsonb(v) || jsonb_build_object(''created_at'', v.last_activity, ''status'', v.account_status) row from private.supplier_management_overview v';
  elsif kind = 'renewals' then
    window_days = coalesce(nullif(filters->>'days', '')::integer, 30);
    if window_days not in (7, 30, 60) then
      raise exception 'Choose 7, 30 or 60 days';
    end if;
    base = 'select jsonb_build_object(''id'', b.id, ''business_id'', b.id, ''name'', b.name, ''owner_id'', b.owner_id, ''account_status'', coalesce(s.status, ''active''), ''valid_until'', a.valid_until, ''days_remaining'', a.valid_until - private.verification_today(), ''revision'', a.revision, ''latest_status'', (select status from public.verification_applications x where x.business_id = b.id order by revision desc limit 1), ''last_reminded_at'', (select max(created_at) from public.notifications n where n.kind = ''verification_renewal'' and n.recipient_id = b.owner_id), ''created_at'', a.valid_until) row from public.businesses b join public.verification_applications a on a.id = b.verification_application_id left join public.account_statuses s on s.user_id = b.owner_id where a.status in (''approved'', ''expired'') and a.valid_until <= private.verification_today() + ' || window_days;
  elsif kind = 'notes' then
    base = 'select to_jsonb(n) || jsonb_build_object(''author'', p.full_name) row from public.supplier_internal_notes n join public.profiles p on p.id = n.created_by';
  elsif kind = 'warnings' then
    base = 'select to_jsonb(w) || jsonb_build_object(''overdue'', w.status in (''open'', ''response_submitted'') and w.due_on < private.verification_today(), ''events'', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at, e.id) from public.supplier_warning_events e where e.warning_id = w.id), ''[]''::jsonb)) row from public.supplier_warnings w';
  else
    raise exception 'Unknown supplier operations list';
  end if;

  execute 'with filtered as materialized(
    select row from (' || base || ') x where
      (coalesce($1->>''q'', '''') = '''' or concat_ws('' '', row->>''name'', row->>''email'', row->>''title'') ilike ''%'' || left($1->>''q'', 200) || ''%'')
      and (coalesce($1->>''business_id'', '''') = '''' or coalesce(row->>''business_id'', row->>''id'') = $1->>''business_id'')
      and (coalesce($1->>''status'', '''') = '''' or row->>''status'' = $1->>''status'')
      and (coalesce($1->>''verified'', '''') = '''' or (row->>''verified'')::boolean = ($1->>''verified'')::boolean)
      and (coalesce($1->>''label'', '''') = '''' or exists(select 1 from jsonb_array_elements_text(row->''labels'') a where lower(a) = lower($1->>''label'')))
  ),
  paged as (
    select row from filtered order by row->>''created_at'' ' || case when kind = 'renewals' then 'asc' else 'desc' end || ', row->>''id'' limit $2 offset $3
  )
  select jsonb_build_object(''total'', (select count(*) from filtered), ''rows'', coalesce((select jsonb_agg(row) from paged), ''[]''::jsonb))'
  into result using filters, page_size, (page - 1) * page_size;

  return result;
end;
$$;

create or replace function public.admin_set_supplier_verified(
  target uuid,
  grant_badge boolean,
  reason text,
  method text default 'direct_admin_grant',
  valid_until date default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  b public.businesses;
  app_id uuid;
  next_rev integer;
  until_date date;
  clean_reason text;
  clean_method text;
begin
  if not private.is_super_admin() then
    raise exception 'Super admin required' using errcode='42501';
  end if;

  clean_reason := trim(coalesce(reason, ''));
  if length(clean_reason) not between 5 and 2000 then
    raise exception 'Reason required (5–2000 characters)';
  end if;

  clean_method := trim(coalesce(method, 'direct_admin_grant'));
  if length(clean_method) > 100 then
    clean_method := left(clean_method, 100);
  end if;

  select * into b from public.businesses where id = target for update;
  if b.id is null then
    raise exception 'Supplier business not found' using errcode='P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(b.id::text, 0));

  if not private.is_active(b.owner_id) then
    raise exception 'Supplier account is suspended or inactive';
  end if;

  if grant_badge then
    until_date := coalesce(valid_until, private.verification_today() + 365);
    if until_date <= private.verification_today() then
      raise exception 'Badge validity must be in the future';
    end if;

    select coalesce(max(revision), 0) + 1 into next_rev
    from public.verification_applications
    where business_id = b.id;

    -- Create or link an approved verification application
    insert into public.verification_applications(
      business_id, revision, status, business_snapshot, declaration_at, submitted_at,
      reviewed_at, reviewed_by, valid_until
    ) values (
      b.id, next_rev, 'approved', private.verification_snapshot(b), now(), now(),
      now(), auth.uid(), until_date
    ) returning id into app_id;

    -- Insert placeholder evidence records if not existing for this app
    insert into public.verification_identity(application_id, legal_name, address, issuing_country, document_type, document_number, no_expiry)
    values (app_id, coalesce(nullif(b.name, ''), 'Verified Business'), coalesce(nullif(b.address, ''), 'Verified Address'), 'Bangladesh', 'nid', 'ADMIN-DIRECT-GRANT', true);

    insert into public.verification_trade_license(application_id, license_number, business_name, owner_name, issuing_authority, business_address, expires_on)
    values (app_id, 'ADMIN-DIRECT-GRANT', b.name, b.name, 'Paikarii Super Admin Operations', b.address, until_date);

    insert into public.verification_bank(application_id, bank_name, branch_name, account_title, account_number, account_type, holder_type, routing_number)
    values (app_id, 'Paikarii Verified Partner', 'Corporate', b.name, 'VERIFIED-ACCOUNT', 'current', 'company', '000000000');

    -- Record verification review with method
    insert into public.verification_reviews(application_id, decision, sections, reason, reviewed_by)
    values (
      app_id,
      'approved',
      jsonb_build_object(
        'method', clean_method,
        'identity', jsonb_build_object('status', 'approved', 'note', 'Direct verification by Super Admin: ' || clean_method),
        'trade_license', jsonb_build_object('status', 'approved', 'note', 'Direct verification by Super Admin: ' || clean_method),
        'bank', jsonb_build_object('status', 'approved', 'note', 'Direct verification by Super Admin: ' || clean_method)
      ),
      clean_reason,
      auth.uid()
    );

    -- Update business verified status and application pointer
    update public.businesses
    set verified = true, verification_application_id = app_id, updated_at = now()
    where id = b.id;

    -- Audit trail
    insert into public.admin_audit_logs(admin_id, action, entity_id, details)
    values (
      auth.uid(),
      'supplier.verified_badge_grant',
      b.id,
      jsonb_build_object(
        'business_id', b.id,
        'application_id', app_id,
        'method', clean_method,
        'valid_until', until_date,
        'reason', clean_reason
      )
    );

    -- Send notification to supplier owner
    insert into public.notifications(recipient_id, kind, title, body, payload)
    values (
      b.owner_id,
      'verification_review',
      'Verified Supplier Badge Granted',
      'Congratulations! Your business is now a Verified Supplier on Paikarii. ' || clean_reason,
      jsonb_build_object('business_id', b.id, 'decision', 'approved', 'valid_until', until_date)
    );

  else
    -- Revoking the badge
    update public.businesses
    set verified = false, updated_at = now()
    where id = b.id;

    if b.verification_application_id is not null then
      update public.verification_applications
      set status = 'revoked', updated_at = now(), lock_version = lock_version + 1
      where id = b.verification_application_id and business_id = b.id;

      insert into public.verification_reviews(application_id, decision, reason, reviewed_by)
      values (b.verification_application_id, 'revoked', clean_reason, auth.uid());
    end if;

    -- Audit trail
    insert into public.admin_audit_logs(admin_id, action, entity_id, details)
    values (
      auth.uid(),
      'supplier.verified_badge_revoke',
      b.id,
      jsonb_build_object(
        'business_id', b.id,
        'previous_application_id', b.verification_application_id,
        'reason', clean_reason
      )
    );

    -- Send notification to supplier owner
    insert into public.notifications(recipient_id, kind, title, body, payload)
    values (
      b.owner_id,
      'verification_review',
      'Verified Supplier Badge Revoked',
      'The Verified Supplier Badge for your business was revoked by administration. Reason: ' || clean_reason,
      jsonb_build_object('business_id', b.id, 'decision', 'revoked', 'reason', clean_reason)
    );
  end if;

  return public.admin_supplier_workspace(b.id);
end;
$$;

revoke all on function public.admin_set_supplier_verified(uuid, boolean, text, text, date) from public, anon, authenticated;
grant execute on function public.admin_set_supplier_verified(uuid, boolean, text, text, date) to authenticated;
grant execute on function public.admin_supplier_operations_list(text, jsonb, integer, integer) to authenticated;

