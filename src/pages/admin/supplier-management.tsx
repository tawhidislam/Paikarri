import { WarningCard, LocalPagination } from '@/components/supplier-warning';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowUpRight, ShieldCheck, AlertTriangle, LockKeyhole } from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n';
import { Field, Notice, State, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { adminDate } from '@/lib/admin-api';
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
export function SupplierManagement() {
  const tr = useT();
  useTitle(tr('Supplier management'));
  const paging = useAdminPaging();
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
      <AdminFilters paging={paging}>
        <SelectFilter
          label="Account status"
          name="status"
          options={['active', 'suspended']}
          paging={paging}
        />
        <Field label={tr('Label')}>
          <input
            maxLength={40}
            value={paging.filters.label ?? ''}
            onChange={(e) => paging.update('label', e.target.value)}
          />
        </Field>
      </AdminFilters>
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
                {query.data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.email}</small>
                      <span className="status-badge">{tr(row.account_status)}</span>
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
                        {row.unanswered_conversations} {tr('Conversations awaiting supplier reply')}
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
          {!query.data.rows.length && <State title="No suppliers found" />}
          <AdminPagination paging={paging} total={query.data.total} />
        </>
      )}
    </div>
  );
}
export function SupplierWorkspace() {
  const { id = '' } = useParams();
  const tr = useT();
  useTitle(tr('Supplier workspace'));
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['supplier-management', 'workspace', id],
    queryFn: () => supplierWorkspace(id),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['supplier-management'] });
  };
  const row = query.data;
  return (
    <div className="supplier-management">
      <Link className="sm-back" to="/admin/supplier-management">
        ← {tr('Supplier management')}
      </Link>
      <QueryState pending={query.isPending} error={query.error} retry={() => query.refetch()} />
      {row && (
        <>
          <Heading
            title={row.name}
            description="Private operational workspace. Notes and labels are visible only to the super admin."
          />
          <div className="sm-profile">
            <span className="status-badge">{tr(row.account_status)}</span>
            <span>
              <ShieldCheck size={16} />
              {tr(row.verified ? 'Verified supplier' : 'Unverified supplier')}
            </span>
            <span>
              {row.division} · {row.district}
            </span>
            <span>{row.email}</span>
          </div>
          <div className="sm-stats">
            {[
              ['Approved products', row.approved_products],
              ['Pending products', row.pending_products],
              ['Unanswered quotations', row.unanswered_quotations],
              ['Conversations awaiting supplier reply', row.unanswered_conversations],
              ['Active warnings', row.active_warnings],
              ['Overdue', row.overdue_warnings],
            ].map(([label, count]) => (
              <article key={label}>
                <span>{tr(String(label))}</span>
                <strong>{count}</strong>
              </article>
            ))}
          </div>
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
            <div className="sm-links">
              <Link to={`/admin/conversations?business_id=${row.id}`}>
                {tr('View conversations')} ↗
              </Link>
              <Link to={`/admin/verifications?q=${encodeURIComponent(row.name)}`}>
                {tr('Verifications')} ↗
              </Link>
            </div>
          </section>
          <div className="sm-columns">
            <div>
              <Labels
                key={`${id}:${row.labels_version}`}
                id={id}
                labels={row.labels}
                version={row.labels_version}
                refresh={refresh}
              />
              <Notes id={id} refresh={refresh} />
            </div>
            <Warnings id={id} refresh={refresh} />
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
}: {
  id: string;
  labels: string[];
  version: number;
  refresh: () => Promise<void>;
}) {
  const tr = useT();
  const [value, setValue] = useState(labels.join(', '));
  const mutation = useMutation({
    mutationFn: () =>
      saveLabels(id, version, value.trim() ? value.split(',').map((x) => x.trim()) : []),
    onSuccess: refresh,
  });
  return (
    <section className="sm-panel">
      <h2>
        <LockKeyhole size={18} />
        {tr('Internal labels')}
      </h2>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Field label={tr('Labels separated by commas')}>
          <input maxLength={420} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <p className="sm-muted">{tr('Up to 10 labels, 2–40 characters each. Super admin only.')}</p>
        <Notice error={mutation.error} />
        {mutation.isSuccess && <p role="status">{tr('Saved')}</p>}
        <Button disabled={mutation.isPending}>{tr('Save labels')}</Button>
      </form>
    </section>
  );
}
function Notes({ id, refresh }: { id: string; refresh: () => Promise<void> }) {
  const tr = useT();
  const [body, setBody] = useState('');
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
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
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
      {query.data?.rows.map((note) => (
        <article className={`sm-note ${note.archived_at ? 'sm-archived' : ''}`} key={note.id}>
          <p>{note.body}</p>
          <small>
            {note.author} · {adminDate(note.created_at)}
          </small>
          {note.archived_at ? (
            <p>
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
      {query.data && !query.data.rows.length && (
        <p className="sm-empty">{tr('No internal notes yet')}</p>
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
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState<'notice' | 'warning' | 'final_warning'>('warning');
  const [due, setDue] = useState('');
  return (
    <details className="sm-compose">
      <summary>{tr('Issue warning')}</summary>
      <div className="form-stack">
        <Field label={tr('Warning title')}>
          <input
            minLength={5}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label={tr('Warning message')}>
          <textarea
            minLength={10}
            maxLength={3000}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
        <Field label={tr('Required corrective action')}>
          <textarea
            minLength={10}
            maxLength={2000}
            rows={3}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </Field>
        <div className="sm-form-row">
          <Field label={tr('Severity')}>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
            >
              {['notice', 'warning', 'final_warning'].map((s) => (
                <option value={s} key={s}>
                  {tr(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr('Correction deadline')}>
            <input
              type="date"
              min={dhakaToday()}
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </Field>
        </div>
        <p className="sm-muted">
          {tr(
            'Deadlines end at midnight Bangladesh time. A notification will be sent to the supplier.',
          )}
        </p>
        <ActionDialog
          label="Send warning"
          requireReason={false}
          disabled={!title.trim() || !message.trim() || !action.trim() || !due}
          description={tr(
            'The supplier will receive this warning. It will be recorded in audit history.',
          )}
          onConfirm={async () => {
            await issueWarning(id, {
              title,
              message,
              corrective_action: action,
              severity,
              due_on: due,
            });
            setTitle('');
            setMessage('');
            setAction('');
            setDue('');
            await refresh();
          }}
        />
      </div>
    </details>
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
