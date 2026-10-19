import { WarningCard, LocalPagination } from '@/components/supplier-warning';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  LockKeyhole,
  Package,
  MessagesSquare,
  ClipboardCheck,
  MapPin,
  Mail,
  Phone,
  Store,
  Plus,
  X,
  ChevronRight,
  NotebookPen,
  CalendarClock,
} from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n';
import { Field, Notice, State, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { adminAction, adminDate } from '@/lib/admin-api';
import {
  managementList,
  workspaceSchema,
  noteSchema,
  renewalSchema,
  warningSchema,
  supplierWorkspace,
  saveLabels,
  addNote,
  archiveNote,
  issueWarning,
  decideWarning,
  renewalReminder,
  dhakaToday,
  dateOnly,
  addDaysToDate,
  labelsSchema,
  warningInput,
  adminSetSupplierVerified,
  verificationMethods,
} from '@/lib/supplier-management';
import {
  AdminFilters,
  AdminPagination,
  SelectFilter,
  useAdminPaging,
  ActionDialog,
} from './console';
import './supplier-management.css';

function QueryState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: unknown;
  retry: () => unknown;
}) {
  const tr = useT();
  return pending ? (
    <State title="Loading…" />
  ) : error ? (
    <>
      <Notice error={error} />
      <Button variant="outline" onClick={retry}>
        {tr('Retry')}
      </Button>
    </>
  ) : null;
}
function Heading({ title, description }: { title: string; description: string }) {
  const tr = useT();
  return (
    <header className="sm-heading">
      <span className="eyebrow">
        <Activity size={15} />
        {tr('SUPPLIER OPERATIONS')}
      </span>
      <h1>{tr(title)}</h1>
      <p>{tr(description)}</p>
    </header>
  );
}
function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'S'
  );
}
function needsAttention(row: z.infer<typeof workspaceSchema>) {
  return (
    row.overdue_warnings > 0 ||
    row.active_warnings > 0 ||
    row.unanswered_quotations > 0 ||
    row.unanswered_conversations > 0 ||
    !row.profile_complete ||
    row.pending_products > 0
  );
}
function SupplierSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const tr = useT();
  const [draft, setDraft] = useState(value);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => {
    setDraft(value);
  }, [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => latest.current(draft), 300);
    return () => window.clearTimeout(timer);
  }, [draft, value]);
  return (
    <Field label={tr('Search suppliers')}>
      <input
        type="search"
        maxLength={200}
        placeholder={tr('Supplier name or email…')}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </Field>
  );
}
export function VerifiedBadgeDialog({
  businessId,
  businessName,
  verified,
  onSuccess,
}: {
  businessId: string;
  businessName: string;
  verified: boolean;
  onSuccess: (message: string) => Promise<void> | void;
}) {
  const tr = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<string>('direct_admin_grant');
  const [validitySpan, setValiditySpan] = useState<'365' | '180' | '730' | 'custom'>('365');
  const [customDate, setCustomDate] = useState('');
  const [error, setError] = useState<unknown>();

  const mutation = useMutation({
    mutationFn: async () => {
      let validUntil: string | undefined = undefined;
      if (!verified) {
        if (validitySpan === 'custom') {
          if (!customDate || customDate <= dhakaToday()) {
            throw new Error(tr('Choose a future validity date'));
          }
          validUntil = customDate;
        } else {
          validUntil = addDaysToDate(Number(validitySpan));
        }
      }
      return adminSetSupplierVerified(businessId, {
        grant: !verified,
        reason,
        method: !verified ? method : undefined,
        valid_until: validUntil,
      });
    },
    onSuccess: async () => {
      dialog.current?.close();
      const msg = tr(
        !verified
          ? 'Verified badge granted successfully'
          : 'Verified badge revoked successfully',
      );
      await onSuccess(msg);
      setReason('');
      setError(undefined);
    },
    onError: (err) => {
      setError(err);
    },
  });

  const openModal = () => {
    setError(undefined);
    setReason('');
    setMethod('direct_admin_grant');
    setValiditySpan('365');
    setCustomDate(addDaysToDate(365));
    mutation.reset();
    dialog.current?.showModal();
  };

  return (
    <>
      <Button
        variant={verified ? 'outline' : 'default'}
        className={verified ? 'sm-btn-revoke' : 'sm-btn-grant'}
        onClick={openModal}
      >
        {verified ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
        {tr(verified ? 'Revoke verified badge' : 'Grant verified badge')}
      </Button>

      <dialog
        ref={dialog}
        className="admin-dialog sm-badge-dialog"
        aria-label={tr(verified ? 'Revoke verified badge' : 'Grant verified badge')}
        onCancel={(e) => {
          if (mutation.isPending) e.preventDefault();
        }}
      >
        <header>
          <div>
            <span className="eyebrow">{tr('SUPPLIER OPERATIONS')}</span>
            <h2>{tr(verified ? 'Revoke verified badge' : 'Grant verified badge')}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tr('Close')}
            disabled={mutation.isPending}
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </Button>
        </header>

        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length < 5) {
              setError(new Error(tr('Reason required (5–2000 characters)')));
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="sm-badge-info-banner">
            <ShieldCheck size={20} className={verified ? 'sm-text-danger' : 'sm-text-success'} />
            <div>
              <strong>{businessName}</strong>
              <p>
                {tr(
                  verified
                    ? 'Revoking the verified badge will immediately remove the trust seal, badge icon, and priority wholesale ranking from all storefront and catalog views.'
                    : 'Granting the verified badge activates the official trust seal, verified icon in chat and RFQs, and grants priority ranking across wholesale search.',
                )}
              </p>
            </div>
          </div>

          <Notice error={error} />

          {!verified && (
            <>
              <Field label={tr('Verification method')}>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {verificationMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {tr(m.labelEn)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={tr('Badge validity period')}>
                <select
                  value={validitySpan}
                  onChange={(e) => {
                    const val = e.target.value as '365' | '180' | '730' | 'custom';
                    setValiditySpan(val);
                    if (val !== 'custom') {
                      setCustomDate(addDaysToDate(Number(val)));
                    }
                  }}
                >
                  <option value="365">{tr('1 Year (Recommended)')}</option>
                  <option value="180">{tr('6 Months')}</option>
                  <option value="730">{tr('2 Years')}</option>
                  <option value="custom">{tr('Custom date')}</option>
                </select>
              </Field>

              {validitySpan === 'custom' && (
                <Field label={tr('Custom date')}>
                  <input
                    type="date"
                    min={addDaysToDate(1)}
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    required
                  />
                </Field>
              )}
            </>
          )}

          <Field label={tr('Justification / Audit reason')}>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={3}
              placeholder={tr(
                'Provide a detailed reason for this verified badge action (min 5 chars)…',
              )}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <footer className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => dialog.current?.close()}
            >
              {tr('Cancel')}
            </Button>
            <Button
              type="submit"
              variant="default"
              className={verified ? 'bg-red-700 hover:bg-red-800' : undefined}
              disabled={mutation.isPending || reason.trim().length < 5}
            >
              {mutation.isPending
                ? tr('Processing…')
                : tr(verified ? 'Revoke verified badge' : 'Grant verified badge')}
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

export function SupplierManagement() {
  const tr = useT();
  useTitle(tr('Supplier management'));
  const paging = useAdminPaging();
  const [attention, setAttention] = useState(false);
  const query = useQuery({
    queryKey: ['supplier-management', 'list', paging.filters, paging.page, paging.size],
    queryFn: () =>
      managementList('suppliers', paging.filters, paging.page, paging.size, workspaceSchema),
  });
  return (
    <div className="supplier-management">
      <Heading
        title="Supplier management"
        description="Follow supplier activity, record internal context, and track corrective actions."
      />
      <div className="sm-list-filters">
        <SupplierSearch
          value={paging.filters.q ?? ''}
          onChange={(value) => paging.update('q', value)}
        />
        <Field label={tr('Rows per page')}>
          <select
            value={paging.size}
            onChange={(event) => paging.update('size', event.target.value)}
          >
            {[25, 50, 100].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </Field>
        <SelectFilter
          label="Account status"
          name="status"
          options={['active', 'suspended']}
          paging={paging}
        />
        <SelectFilter
          label="Verification"
          name="verified"
          options={['true', 'false']}
          paging={paging}
        />
        <Field label={tr('Label')}>
          <input
            maxLength={40}
            value={paging.filters.label ?? ''}
            onChange={(e) => paging.update('label', e.target.value)}
          />
        </Field>
      </div>
      <div className="sm-filter-tabs" role="group" aria-label={tr('Supplier quick filters')}>
        {['', 'active', 'suspended'].map((status) => (
          <button
            key={status}
            aria-pressed={!attention && !paging.filters.verified && (paging.filters.status ?? '') === status}
            onClick={() => {
              setAttention(false);
              paging.update('verified', '');
              paging.update('status', status);
            }}
          >
            {tr(status === '' ? 'All' : status === 'active' ? 'Active' : 'Suspended')}
          </button>
        ))}
        <button
          aria-pressed={!attention && paging.filters.verified === 'true'}
          onClick={() => {
            setAttention(false);
            paging.update('verified', 'true');
          }}
        >
          <ShieldCheck size={14} />
          {tr('Verified only')}
        </button>
        <button
          aria-pressed={!attention && paging.filters.verified === 'false'}
          onClick={() => {
            setAttention(false);
            paging.update('verified', 'false');
          }}
        >
          {tr('Unverified only')}
        </button>
        <button aria-pressed={attention} onClick={() => setAttention(!attention)}>
          <AlertTriangle size={15} />
          {tr('Needs attention on this page')}
        </button>
      </div>
      {attention && (
        <p className="sm-muted" role="status">
          {tr(
            'Showing follow-up needs within the current page. Search and account filters still apply.',
          )}
        </p>
      )}
      <QueryState pending={query.isPending} error={query.error} retry={() => query.refetch()} />
      {query.data && (
        <>
          <div
            className="table-wrap"
            role="region"
            aria-label={tr('Supplier records')}
            tabIndex={0}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  {[
                    'Supplier',
                    'Activity',
                    'Follow-up needed',
                    'Warnings',
                    'Labels',
                    'Actions',
                  ].map((x) => (
                    <th key={x}>{tr(x)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.rows
                  .filter((row) => !attention || needsAttention(row))
                  .map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="sm-list-identity">
                          <span className="sm-avatar sm-avatar-small" aria-hidden="true">
                            {initials(row.name)}
                          </span>
                          <div>
                            <strong>
                              {row.name}{' '}
                              {row.verified && (
                                <ShieldCheck size={15} aria-label={tr('Verified supplier')} />
                              )}
                            </strong>
                            <small>{row.email}</small>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className={`sm-status ${row.account_status}`}>
                                {tr(row.account_status)}
                              </span>
                              <span className={`sm-status ${row.verified ? 'verified' : 'neutral'}`}>
                                <ShieldCheck size={12} />
                                {tr(row.verified ? 'Verified' : 'Unverified')}
                              </span>
                            </div>
                            <small>
                              <MapPin size={12} />
                              {tr(row.division)} · {tr(row.district)}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span>{adminDate(row.last_activity)}</span>
                        <small>
                          {tr('Approved products')}: {row.approved_products}
                        </small>
                      </td>
                      <td>
                        {row.unanswered_quotations} {tr('Unanswered quotations')}
                        <small>
                          {row.unanswered_conversations}{' '}
                          {tr('Conversations awaiting supplier reply')}
                        </small>
                      </td>
                      <td>
                        {row.active_warnings} {tr('Active warnings')}
                        <small className={row.overdue_warnings ? 'sm-danger' : ''}>
                          {row.overdue_warnings} {tr('Overdue')}
                        </small>
                      </td>
                      <td>
                        <div className="sm-tags">
                          {row.labels.map((x) => (
                            <span key={x}>{x}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/supplier-management/${row.id}`}>
                            {tr('Manage supplier')}
                            <ArrowUpRight size={14} />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!query.data.rows.filter((row) => !attention || needsAttention(row)).length && (
            <State
              title={tr(attention ? 'No follow-up needed on this page' : 'No suppliers found')}
            />
          )}
          <AdminPagination paging={paging} total={query.data.total} />
        </>
      )}
    </div>
  );
}
const workspaceTabs = [
  ['overview', 'Overview & Labels'],
  ['warnings', 'Warnings & Sanctions'],
  ['notes', 'Internal Notes'],
  ['verification', 'Verification & Renewals'],
] as const;
export function SupplierWorkspace() {
  const { id = '' } = useParams();
  const tr = useT();
  const [params, setParams] = useSearchParams();
  const selected = workspaceTabs.some(([key]) => key === params.get('tab'))
    ? params.get('tab')!
    : 'overview';
  const tabList = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState('');
  useTitle(tr('Supplier workspace'));
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['supplier-management', 'workspace', id],
    queryFn: () => supplierWorkspace(id),
  });
  const contact = useQuery({
    queryKey: ['supplier-management', 'contact', id],
    enabled: !!query.data,
    queryFn: async () => {
      const result = await db().rpc('admin_supplier_detail', { target: id });
      if (result.error) throw result.error;
      return z
        .object({ business: z.object({ name_bn: z.string(), contact_phone: z.string() }) })
        .nullable()
        .parse(result.data);
    },
  });
  const notes = useQuery({
    queryKey: ['supplier-management', 'note-count', id],
    enabled: !!query.data,
    queryFn: () => managementList('notes', { business_id: id }, 1, 1, noteSchema),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['supplier-management'] });
    await qc.invalidateQueries({ queryKey: ['admin-supplier-account', id] });
  };
  const choose = (tab: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  const keyboardTabs = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = workspaceTabs.findIndex(([key]) => key === selected);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? workspaceTabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + workspaceTabs.length) %
            workspaceTabs.length;
    choose(workspaceTabs[next][0]);
    tabList.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  const row = query.data;
  const phone = contact.data?.business.contact_phone;
  return (
    <div className="supplier-management sm-workspace">
      <nav className="sm-breadcrumb" aria-label={tr('Breadcrumb')}>
        <Link to="/admin">{tr('Overview')}</Link>
        <ChevronRight size={13} />
        <Link to="/admin/supplier-management">{tr('Supplier management')}</Link>
        <ChevronRight size={13} />
        <span>{row?.name ?? tr('Supplier workspace')}</span>
      </nav>
      <QueryState pending={query.isPending} error={query.error} retry={() => query.refetch()} />
      {row && (
        <>
          <header className="sm-hero">
            <div className="sm-hero-main">
              <div className="sm-avatar">
                {initials(row.name)}
                {row.verified && <ShieldCheck size={22} />}
              </div>
              <div className="sm-hero-identity">
                <span className="eyebrow">{tr('SUPPLIER OPERATIONS')}</span>
                <h1>{row.name}</h1>
                {contact.data?.business.name_bn && <p lang="bn">{contact.data.business.name_bn}</p>}
                <div className="sm-profile">
                  <span className={`sm-status ${row.account_status}`}>
                    {tr(row.account_status)}
                  </span>
                  <span className={`sm-status ${row.verified ? 'verified' : 'neutral'}`}>
                    <ShieldCheck size={14} />
                    {tr(row.verified ? 'Verified supplier' : 'Unverified supplier')}
                  </span>
                  <span>
                    <MapPin size={14} />
                    {tr(row.division)} · {tr(row.district)}
                  </span>
                </div>
              </div>
            </div>
            <div className="sm-hero-meta">
              <span>
                <Mail size={15} />
                {row.email ?? '—'}
              </span>
              {phone && (
                <span>
                  <Phone size={15} />
                  {phone}
                </span>
              )}
              <span>
                <CalendarClock size={15} />
                {tr('Last sign-in')}: {adminDate(row.last_sign_in_at)}
              </span>
              <span>
                <Activity size={15} />
                {tr('Last supplier activity')}: {adminDate(row.last_activity)}
              </span>
            </div>
            <Notice error={contact.error} />
            <div className="sm-action-bar">
              <Button asChild variant="outline">
                <Link to={`/suppliers/${row.id}`} target="_blank" rel="noopener noreferrer">
                  <Store size={16} />
                  {tr('View storefront')}
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
              {row.email && (
                <Button asChild variant="outline">
                  <a href={`mailto:${encodeURIComponent(row.email)}`}>
                    <Mail size={16} />
                    {tr('Email supplier')}
                  </a>
                </Button>
              )}
              {phone && /^\+?[0-9 ()-]+$/.test(phone) && (
                <Button asChild variant="outline">
                  <a href={`tel:${phone.replace(/[^+0-9]/g, '')}`}>
                    <Phone size={16} />
                    {tr('Call supplier')}
                  </a>
                </Button>
              )}
              <VerifiedBadgeDialog
                businessId={row.id}
                businessName={row.name}
                verified={row.verified}
                onSuccess={async (msg) => {
                  await refresh();
                  setSaved(msg);
                }}
              />
              <ActionDialog
                label={
                  row.account_status === 'suspended' ? 'Reactivate account' : 'Suspend account'
                }
                description={tr(
                  'Account changes require a reason and are recorded in audit history.',
                )}
                onConfirm={async (reason) => {
                  await adminAction('status', {
                    target: row.owner_id,
                    status: row.account_status === 'suspended' ? 'active' : 'suspended',
                    reason,
                  });
                  await refresh();
                  setSaved(tr('Account status updated'));
                }}
              />
            </div>
            <p className="sm-private">
              <LockKeyhole size={13} />
              {tr(
                'Private operational workspace. Notes and labels are visible only to the super admin.',
              )}
            </p>
          </header>
          {saved && <Notice success={saved} />}
          {row.overdue_warnings > 0 && (
            <div className="sm-alert">
              <AlertTriangle size={20} />
              <div>
                <strong>{tr('Overdue corrective actions need attention')}</strong>
                <p>
                  {row.overdue_warnings} {tr('Overdue')} ·{' '}
                  {tr('Warnings do not suspend accounts automatically.')}
                </p>
              </div>
              <button onClick={() => choose('warnings')}>
                {tr('Review warnings')}
                <ChevronRight size={15} />
              </button>
            </div>
          )}
          <div className="sm-kpi-ribbon">
            <Link className="sm-kpi" to={`/admin/products?business_id=${id}`}>
              <Package size={20} />
              <span>{tr('Catalog status')}</span>
              <strong>
                {row.approved_products}
                <small>{tr('Approved products')}</small>
              </strong>
              <p>
                {row.pending_products} {tr('Pending products')}
              </p>
              <ArrowUpRight className="sm-kpi-arrow" size={16} />
            </Link>
            <button
              className={`sm-kpi ${row.unanswered_quotations + row.unanswered_conversations > 0 ? 'sm-kpi-amber' : ''}`}
              onClick={() => choose('overview')}
            >
              <MessagesSquare size={20} />
              <span>{tr('Buyer inquiries')}</span>
              <strong>
                {row.unanswered_quotations + row.unanswered_conversations}
                <small>{tr('Follow-up needed')}</small>
              </strong>
              <p>
                {row.unanswered_quotations} {tr('Unanswered quotations')} ·{' '}
                {row.unanswered_conversations} {tr('Conversations awaiting supplier reply')}
              </p>
            </button>
            <button
              className={`sm-kpi ${row.overdue_warnings > 0 ? 'sm-kpi-red' : ''}`}
              onClick={() => choose('warnings')}
            >
              <AlertTriangle size={20} />
              <span>{tr('Compliance health')}</span>
              <strong>
                {row.active_warnings}
                <small>{tr('Active warnings')}</small>
              </strong>
              <p>
                {row.overdue_warnings} {tr('Overdue')}
              </p>
            </button>
            <button className="sm-kpi" onClick={() => choose('verification')}>
              <ClipboardCheck size={20} />
              <span>{tr('Profile health')}</span>
              <strong className="sm-kpi-text">
                {tr(row.profile_complete ? 'Complete' : 'Incomplete')}
              </strong>
              <p>{tr(row.verified ? 'Verified supplier' : 'Unverified supplier')}</p>
            </button>
          </div>
          <div
            className="sm-tabs"
            role="tablist"
            aria-label={tr('Supplier workspace sections')}
            ref={tabList}
            onKeyDown={keyboardTabs}
          >
            {workspaceTabs.map(([key, label]) => (
              <button
                key={key}
                id={`tab-${key}`}
                role="tab"
                aria-selected={selected === key}
                aria-controls={`panel-${key}`}
                tabIndex={selected === key ? 0 : -1}
                onClick={() => choose(key)}
              >
                {tr(label)}
                {key === 'warnings' && <span>{row.active_warnings}</span>}
                {key === 'notes' && notes.data && <span>{notes.data.total}</span>}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            hidden={selected !== 'overview'}
          >
            <div className="sm-overview-grid">
              <section className="sm-panel">
                <div className="sm-section-title">
                  <h2>
                    <Activity size={18} />
                    {tr('Activity overview')}
                  </h2>
                  <Link to={`/admin/suppliers/${id}`}>{tr('Account details')} ↗</Link>
                </div>
                <dl className="sm-facts">
                  <div>
                    <dt>{tr('Profile completion')}</dt>
                    <dd>{tr(row.profile_complete ? 'Complete' : 'Needs attention')}</dd>
                  </div>
                  <div>
                    <dt>{tr('Last supplier activity')}</dt>
                    <dd>{adminDate(row.last_activity)}</dd>
                  </div>
                  <div>
                    <dt>{tr('Last sign-in')}</dt>
                    <dd>{adminDate(row.last_sign_in_at)}</dd>
                  </div>
                </dl>
                <p className="sm-muted">
                  {tr(
                    'Activity includes business edits, product updates, supplier messages, and quotation responses.',
                  )}
                </p>
                <div className="sm-shortcuts">
                  <Link to={`/admin/products?business_id=${id}`}>
                    <Package size={16} />
                    {tr('View products')}
                    <ArrowUpRight size={14} />
                  </Link>
                  <Link to={`/admin/conversations?business_id=${id}`}>
                    <MessagesSquare size={16} />
                    {tr('View conversations')}
                    <ArrowUpRight size={14} />
                  </Link>
                  <Link to={`/admin/verifications?business_id=${id}`}>
                    <ShieldCheck size={16} />
                    {tr('Verifications')}
                    <ArrowUpRight size={14} />
                  </Link>
                  <Link to={`/admin/audit?target=${id}`}>
                    <Activity size={16} />
                    {tr('Supplier audit history')}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </section>
              <Labels
                key={`${id}:${row.labels_version}`}
                id={id}
                labels={row.labels}
                version={row.labels_version}
                refresh={refresh}
                onSaved={() => setSaved(tr('Labels saved.'))}
              />
            </div>
          </div>
          <div
            role="tabpanel"
            id="panel-warnings"
            aria-labelledby="tab-warnings"
            hidden={selected !== 'warnings'}
          >
            <Warnings id={id} refresh={refresh} />
          </div>
          <div
            role="tabpanel"
            id="panel-notes"
            aria-labelledby="tab-notes"
            hidden={selected !== 'notes'}
          >
            <Notes id={id} refresh={refresh} />
          </div>
          <div
            role="tabpanel"
            id="panel-verification"
            aria-labelledby="tab-verification"
            hidden={selected !== 'verification'}
          >
            <WorkspaceRenewal
              id={id}
              businessName={row.name}
              verified={row.verified}
              refresh={refresh}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Labels({
  id,
  labels,
  version,
  refresh,
  onSaved,
}: {
  id: string;
  labels: string[];
  version: number;
  refresh: () => Promise<void>;
  onSaved: () => void;
}) {
  const tr = useT();
  const [value, setValue] = useState(labels.join(', '));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<unknown>();
  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const append = (candidate: string) => {
    try {
      const tag = candidate.trim();
      if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
        setDraft('');
        return;
      }
      const next = labelsSchema.parse([...tags, tag]);
      setValue(next.join(', '));
      setDraft('');
      setError(undefined);
    } catch {
      setError(new Error(tr('Use up to 10 labels, 2–40 characters each.')));
    }
  };
  const mutation = useMutation({
    mutationFn: () => saveLabels(id, version, tags),
    onSuccess: async () => {
      await refresh();
      onSaved();
    },
  });
  return (
    <section className="sm-panel sm-chip-manager">
      <h2>
        <LockKeyhole size={18} />
        {tr('Internal labels')}
      </h2>
      <p className="sm-muted">{tr('Up to 10 labels, 2–40 characters each. Super admin only.')}</p>
      <div className="sm-tags sm-editable-tags">
        {tags.map((tag, index) => (
          <span key={`${tag}-${index}`}>
            {tag}
            <button
              type="button"
              aria-label={`${tr('Remove label')}: ${tag}`}
              onClick={() => setValue(tags.filter((_, i) => i !== index).join(', '))}
            >
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <form
        className="sm-tag-add"
        onSubmit={(event) => {
          event.preventDefault();
          append(draft);
        }}
      >
        <Field label={tr('Add tag')}>
          <input
            maxLength={40}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={tr('Type a label and press Enter')}
          />
        </Field>
        <Button variant="outline" disabled={!draft.trim() || mutation.isPending}>
          <Plus size={15} />
          {tr('Add')}
        </Button>
      </form>
      <h3>{tr('Quick presets')}</h3>
      <div className="sm-presets">
        {[
          'VIP Supplier',
          'High Volume',
          'Fast Dispatch',
          'Slow Response',
          'Catalog Incomplete',
        ].map((preset) => (
          <button
            type="button"
            key={preset}
            disabled={
              tags.some((tag) => tag.toLowerCase() === preset.toLowerCase()) ||
              tags.length >= 10 ||
              mutation.isPending
            }
            onClick={() => append(preset)}
          >
            <Plus size={12} />
            {tr(preset)}
          </button>
        ))}
      </div>
      <details className="sm-advanced-labels">
        <summary>{tr('Edit labels as text')}</summary>
        <Field label={tr('Labels separated by commas')}>
          <input
            aria-label={tr('Labels separated by commas')}
            maxLength={420}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      </details>
      <Notice error={error ?? mutation.error} />
      <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {tr('Save labels')}
      </Button>
    </section>
  );
}

function Notes({ id, refresh }: { id: string; refresh: () => Promise<void> }) {
  const tr = useT();
  const [body, setBody] = useState('');
  const [view, setView] = useState('all');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['supplier-management', 'notes', id, page],
    queryFn: () => managementList('notes', { business_id: id }, page, 25, noteSchema),
  });
  const mutation = useMutation({
    mutationFn: () => addNote(id, body),
    onSuccess: async () => {
      setBody('');
      await refresh();
    },
  });
  return (
    <section className="sm-panel">
      <h2>
        <LockKeyhole size={18} />
        {tr('Internal notes')}
      </h2>
      <p className="sm-muted">
        {tr('Keep operational notes here. Do not copy identity or bank details.')}
      </p>
      <form
        className="form-stack sm-note-composer"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            if (!mutation.isPending) event.currentTarget.requestSubmit();
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!mutation.isPending) mutation.mutate();
        }}
      >
        <Field label={tr('New internal note')}>
          <textarea
            required
            minLength={5}
            maxLength={3000}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <Notice error={mutation.error} />
        <Button disabled={mutation.isPending}>{tr('Add note')}</Button>
      </form>
      <QueryState pending={query.isPending} error={query.error} retry={() => query.refetch()} />
      <p className="sm-muted">{tr('Press Ctrl / ⌘ + Enter to add a note.')}</p>
      <div className="sm-filter-tabs" role="group" aria-label={tr('Note filters')}>
        {['all', 'active', 'archived'].map((filter) => (
          <button key={filter} aria-pressed={view === filter} onClick={() => setView(filter)}>
            {tr(filter === 'all' ? 'All' : filter === 'active' ? 'Active notes' : 'Archived notes')}
          </button>
        ))}
      </div>
      {query.data?.rows
        .filter(
          (note) =>
            view === 'all' || (view === 'archived' ? !!note.archived_at : !note.archived_at),
        )
        .map((note) => (
          <article className={`sm-note ${note.archived_at ? 'sm-archived' : ''}`} key={note.id}>
            <header className="sm-note-meta">
              <span className="sm-avatar sm-avatar-small" aria-hidden="true">
                {initials(note.author)}
              </span>
              <div>
                <strong>{note.author}</strong>
                <time>{adminDate(note.created_at)}</time>
              </div>
              <NotebookPen size={17} />
            </header>
            <p>{note.body}</p>
            {note.archived_at ? (
              <p className="sm-archive-reason">
                <strong>{tr('Archived')}</strong> · {note.archive_reason}
              </p>
            ) : (
              <ActionDialog
                label="Archive note"
                onConfirm={async (reason) => {
                  await archiveNote(note.id, reason);
                  await refresh();
                }}
              />
            )}
          </article>
        ))}
      {query.data &&
        !query.data.rows.filter(
          (note) =>
            view === 'all' || (view === 'archived' ? !!note.archived_at : !note.archived_at),
        ).length && <p className="sm-empty">{tr('No internal notes in this view')}</p>}
      {view !== 'all' && (
        <p className="sm-muted">{tr('Note filters apply to the current page.')}</p>
      )}
      <LocalPagination page={page} setPage={setPage} total={query.data?.total ?? 0} />
    </section>
  );
}
function Warnings({ id, refresh }: { id: string; refresh: () => Promise<void> }) {
  const tr = useT();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const query = useQuery({
    queryKey: ['supplier-management', 'warnings', id, page, status],
    queryFn: () => managementList('warnings', { business_id: id, status }, page, 25, warningSchema),
  });
  return (
    <section className="sm-panel">
      <h2>
        <AlertTriangle size={18} />
        {tr('Warnings & corrective actions')}
      </h2>
      <p className="sm-muted">
        {tr(
          'Suppliers can read warnings and respond. Overdue actions never suspend an account automatically.',
        )}
      </p>
      <WarningForm id={id} refresh={refresh} />
      <Field label={tr('Warning status')}>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{tr('All')}</option>
          {['open', 'response_submitted', 'resolved', 'dismissed'].map((s) => (
            <option value={s} key={s}>
              {tr(s)}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm-filter-tabs" role="group" aria-label={tr('Warning filters')}>
        {['', 'open', 'response_submitted', 'resolved', 'dismissed'].map((filter) => (
          <button
            key={filter}
            aria-pressed={status === filter}
            onClick={() => {
              setStatus(filter);
              setPage(1);
            }}
          >
            {tr(filter || 'All')}
          </button>
        ))}
      </div>
      <QueryState pending={query.isPending} error={query.error} retry={() => query.refetch()} />
      {query.data?.rows.map((warning) => (
        <WarningCard key={`${warning.id}:${warning.version}`} warning={warning}>
          <div className="sm-links">
            {['open', 'response_submitted'].includes(warning.status) && (
              <>
                <ActionDialog
                  label="Resolve warning"
                  onConfirm={async (reason) => {
                    await decideWarning(warning, 'resolved', reason);
                    await refresh();
                  }}
                />
                <ActionDialog
                  label="Dismiss warning"
                  onConfirm={async (reason) => {
                    await decideWarning(warning, 'dismissed', reason);
                    await refresh();
                  }}
                />
              </>
            )}
          </div>
        </WarningCard>
      ))}
      {query.data && !query.data.rows.length && (
        <p className="sm-empty">{tr('No warnings found')}</p>
      )}
      <LocalPagination page={page} setPage={setPage} total={query.data?.total ?? 0} />
    </section>
  );
}
function WarningForm({ id, refresh }: { id: string; refresh: () => Promise<void> }) {
  const tr = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirm, setConfirm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState<'notice' | 'warning' | 'final_warning'>('warning');
  const [due, setDue] = useState('');
  const [validation, setValidation] = useState<unknown>();
  const mutation = useMutation({
    mutationFn: () =>
      issueWarning(id, { title, message, corrective_action: action, severity, due_on: due }),
    onSuccess: async () => {
      await refresh();
      dialog.current?.close();
      setConfirm(false);
      setTitle('');
      setMessage('');
      setAction('');
      setDue('');
    },
  });
  return (
    <div className="sm-warning-composer">
      <Button
        onClick={() => {
          setValidation(undefined);
          mutation.reset();
          setConfirm(false);
          dialog.current?.showModal();
        }}
      >
        <Plus size={16} />
        {tr('Issue warning')}
      </Button>
      <dialog
        ref={dialog}
        className="admin-dialog sm-warning-dialog"
        aria-label={tr('Issue supplier warning')}
        onCancel={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        <header>
          <div>
            <span className="eyebrow">{tr('SUPPLIER OPERATIONS')}</span>
            <h2>{tr(confirm ? 'Confirm warning' : 'Issue supplier warning')}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tr('Close')}
            disabled={mutation.isPending}
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </Button>
        </header>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (mutation.isPending) return;
            if (confirm) {
              mutation.mutate();
              return;
            }
            const parsed = warningInput.safeParse({
              title,
              message,
              corrective_action: action,
              severity,
              due_on: due,
            });
            if (!parsed.success || due < dhakaToday()) {
              setValidation(
                new Error(tr('Complete all warning fields and choose a valid deadline.')),
              );
              return;
            }
            setValidation(undefined);
            setConfirm(true);
          }}
        >
          {confirm ? (
            <div className="sm-warning-confirm">
              <h3>{title}</h3>
              <span className={`sm-severity ${severity}`}>{tr(severity)}</span>
              <p>{message}</p>
              <strong>{tr('Required corrective action')}</strong>
              <p>{action}</p>
              <p>
                {tr('Correction deadline')}: {dateOnly(due)}
              </p>
              <p className="sm-muted">
                {tr(
                  'The supplier will receive this warning. It will be recorded in audit history.',
                )}
              </p>
            </div>
          ) : (
            <>
              <Field label={tr('Warning title')}>
                <input
                  required
                  minLength={5}
                  maxLength={160}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field label={tr('Warning message')}>
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </Field>
              <Field label={tr('Required corrective action')}>
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                />
              </Field>
              <div className="sm-form-row">
                <Field label={tr('Severity')}>
                  <select
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value as typeof severity)}
                  >
                    {['notice', 'warning', 'final_warning'].map((value) => (
                      <option key={value} value={value}>
                        {tr(value)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tr('Correction deadline')}>
                  <input
                    required
                    type="date"
                    min={dhakaToday()}
                    value={due}
                    onChange={(event) => setDue(event.target.value)}
                  />
                </Field>
              </div>
              <p className="sm-muted">
                {tr(
                  'Deadlines end at midnight Bangladesh time. A notification will be sent to the supplier.',
                )}
              </p>
            </>
          )}
          <Notice error={validation ?? mutation.error} />
          <div className="sm-dialog-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {tr(confirm ? 'Confirm' : 'Send warning')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => (confirm ? setConfirm(false) : dialog.current?.close())}
            >
              {tr(confirm ? 'Back' : 'Cancel')}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
function WorkspaceRenewal({
  id,
  businessName,
  verified,
  refresh,
}: {
  id: string;
  businessName: string;
  verified: boolean;
  refresh: () => Promise<void>;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);
  const [badgeMsg, setBadgeMsg] = useState('');
  const query = useQuery({
    queryKey: ['supplier-management', 'workspace-renewal', id],
    queryFn: () =>
      managementList('renewals', { business_id: id, days: '60' }, 1, 25, renewalSchema),
  });
  const renewal = query.data?.rows.find((row) => row.id === id);
  return (
    <section className="sm-panel sm-renewal-panel">
      <h2>
        <ShieldCheck size={19} />
        {tr('Verification & Renewals')}
      </h2>

      <div className="sm-verified-control-card">
        <div className="sm-verified-control-header">
          <div className="sm-verified-badge-icon-box">
            <ShieldCheck
              size={28}
              className={verified ? 'sm-verified-icon-active' : 'sm-verified-icon-inactive'}
            />
          </div>
          <div className="sm-verified-control-details">
            <span className="eyebrow">{tr('VERIFIED BADGE STATUS')}</span>
            <h3>{tr(verified ? 'Official Verified Supplier' : 'Unverified Supplier')}</h3>
            <p className="sm-muted">
              {tr(
                verified
                  ? 'This supplier holds the official Paikarii Verified badge. Trust seal and priority listing are active.'
                  : 'This supplier does not have the verified badge. Buyers will see them as an unverified business.',
              )}
            </p>
          </div>
          <div className="sm-verified-control-action">
            <VerifiedBadgeDialog
              businessId={id}
              businessName={businessName}
              verified={verified}
              onSuccess={async (msg) => {
                await refresh();
                setBadgeMsg(msg);
              }}
            />
          </div>
        </div>
      </div>
      {badgeMsg && <Notice success={badgeMsg} />}

      <span className={`sm-status ${verified ? 'verified' : 'neutral'}`}>
        {tr(verified ? 'Verified supplier' : 'Unverified supplier')}
      </span>
      <p className="sm-muted">
        {tr('Verification requires an approved, unexpired application and an active account.')}
      </p>
      <QueryState pending={query.isPending} error={query.error} retry={() => query.refetch()} />
      {renewal ? (
        <>
          <dl className="sm-facts">
            <div>
              <dt>{tr('Valid until')}</dt>
              <dd>{dateOnly(renewal.valid_until, locale)}</dd>
            </div>
            <div>
              <dt>{tr('Renewal status')}</dt>
              <dd>{tr(renewal.latest_status)}</dd>
            </div>
            <div>
              <dt>{tr('Last reminder')}</dt>
              <dd>{adminDate(renewal.last_reminded_at)}</dd>
            </div>
          </dl>
          <p className={renewal.days_remaining < 0 ? 'sm-danger' : 'sm-muted'}>
            {renewal.days_remaining < 0
              ? tr('Expired')
              : `${renewal.days_remaining} ${tr('days remaining')}`}
          </p>
          <label className="sm-validity">
            {tr('Remaining in the 60-day renewal window')}
            <progress max={60} value={Math.max(0, Math.min(60, renewal.days_remaining))} />
          </label>
          <ActionDialog
            label="Send renewal reminder"
            requireReason={false}
            disabled={
              renewal.latest_status === 'submitted' ||
              (!!renewal.last_reminded_at &&
                Date.now() - new Date(renewal.last_reminded_at).getTime() < 86400000)
            }
            description={tr('Send an in-app reminder to prepare renewed verification evidence.')}
            onConfirm={async () => {
              await renewalReminder(id);
              setSent(true);
              await qc.invalidateQueries({ queryKey: ['supplier-management'] });
            }}
          />
        </>
      ) : (
        query.data && (
          <p className="sm-empty">
            {tr('No renewal due within 60 days. Open verification review for application details.')}
          </p>
        )
      )}
      {sent && <Notice success={tr('Renewal reminder sent')} />}
      <div className="sm-links">
        <Link to={`/admin/verifications?business_id=${id}`}>
          {tr('Verification documents')}
          <ArrowUpRight size={15} />
        </Link>
        <Link to="/admin/supplier-renewals">
          {tr('Verification renewals')}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
export function SupplierRenewals() {
  const tr = useT();
  const { locale } = useLocale();
  useTitle(tr('Verification renewals'));
  const paging = useAdminPaging();
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);
  const query = useQuery({
    queryKey: ['supplier-management', 'renewals', paging.filters, paging.page, paging.size],
    queryFn: () =>
      managementList('renewals', paging.filters, paging.page, paging.size, renewalSchema),
  });
  return (
    <div className="supplier-management">
      <Heading
        title="Verification renewals"
        description="Review expired and soon-to-expire approvals. Send a renewal reminder when follow-up is needed."
      />
      <AdminFilters paging={paging}>
        <Field label={tr('Expiry window')}>
          <select
            value={paging.filters.days ?? '30'}
            onChange={(e) => paging.update('days', e.target.value)}
          >
            {[7, 30, 60].map((n) => (
              <option key={n} value={n}>
                {n} {tr('days')}
              </option>
            ))}
          </select>
        </Field>
      </AdminFilters>
      <p className="sm-muted">
        {tr(
          'Earliest expiry first. Expired approvals remain in this queue until renewed. Reminders are limited to one per supplier every 24 hours.',
        )}
      </p>
      {sent && <p role="status">{tr('Renewal reminder sent')}</p>}
      <QueryState pending={query.isPending} error={query.error} retry={() => query.refetch()} />
      {query.data && (
        <>
          <div
            className="table-wrap"
            role="region"
            aria-label={tr('Supplier records')}
            tabIndex={0}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  {['Supplier', 'Valid until', 'Renewal status', 'Last reminder', 'Actions'].map(
                    (x) => (
                      <th key={x}>{tr(x)}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/admin/supplier-management/${row.id}`}>{row.name}</Link>
                      <small>{tr(row.account_status)}</small>
                    </td>
                    <td className={row.days_remaining < 0 ? 'sm-danger' : ''}>
                      {dateOnly(row.valid_until, locale)}
                      <small>
                        {row.days_remaining < 0
                          ? tr('Expired')
                          : `${row.days_remaining} ${tr('days remaining')}`}
                      </small>
                    </td>
                    <td>{tr(row.latest_status)}</td>
                    <td>{adminDate(row.last_reminded_at)}</td>
                    <td>
                      <ActionDialog
                        label="Send renewal reminder"
                        requireReason={false}
                        disabled={
                          row.latest_status === 'submitted' ||
                          (!!row.last_reminded_at &&
                            Date.now() - new Date(row.last_reminded_at).getTime() < 86400000)
                        }
                        description={tr(
                          'Send an in-app reminder to prepare renewed verification evidence.',
                        )}
                        onConfirm={async () => {
                          await renewalReminder(row.id);
                          setSent(true);
                          await qc.invalidateQueries({
                            queryKey: ['supplier-management', 'renewals'],
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.rows.length && <State title="No renewals due" />}
          <AdminPagination paging={paging} total={query.data.total} />
        </>
      )}
    </div>
  );
}
