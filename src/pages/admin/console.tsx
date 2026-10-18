import { NotificationLink } from '@/components/notification-link';
import { useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  LayoutDashboard,
  MessagesSquare,
  FileText,
  Image,
  ClipboardList,
  Bell,
  Building2,
  Users,
  ShieldCheck,
  Package,
  Tags,
  Flag,
  UserCog,
  Settings,
  History,
  Menu,
  LogOut,
  ArrowUpRight,
  Globe2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { db } from '@/lib/supabase';
import { Brand } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Field, Notice, State, SectionTitle, useTitle } from '@/components/shared';
import {
  accountSchema,
  adminAction,
  adminDate,
  adminList,
  settings,
  settingsSchema,
  type AdminAccount,
  type PlatformSettings,
} from '@/lib/admin-api';
import { locations } from '@/lib/locations';
const divisions = Object.keys(locations);

const links = [
  ['', 'Overview', LayoutDashboard],
  ['suppliers', 'Suppliers', Building2],
  ['supplier-management', 'Supplier management', ClipboardList],
  ['supplier-renewals', 'Verification renewals', ShieldCheck],
  ['accounts', 'Buyers & accounts', Users],
  ['verifications', 'Verifications', ShieldCheck],
  ['products', 'Product moderation', Package],
  ['reviews', 'Review moderation', ShieldCheck],
  ['requests', 'Sourcing requests', FileText],
  ['orders', 'Order management', FileText],
  ['tenders', 'Tender moderation', FileText],
  ['financial-reports', 'Financial reconciliation', FileText],
  ['integrations', 'External integrations', Settings],
  ['categories', 'Categories', Tags],
  ['reports', 'Reports', Flag],
  ['conversations', 'Conversation monitoring', MessagesSquare],
  ['staff', 'Staff access', UserCog],
  ['settings', 'Platform settings', Settings],
  ['homepage', 'Homepage content', Image],
  ['terms', 'Terms & Conditions', FileText],
  ['refund-policy', 'Refund Policy', FileText],
  ['onboarding', 'Supplier onboarding', ClipboardList],
  ['notifications', 'Notification delivery', Bell],
  ['audit', 'Audit history', History],
] as const;
export default function AdminConsole() {
  const tr = useT();
  const { role, session } = useAuth();
  const { t, toggle } = useLocale();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useTitle('Platform administration');
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        {tr('Skip to content')}
      </a>
      <aside className={`admin-sidebar ${menu ? 'open' : ''}`}>
        <Brand />
        <span className="eyebrow">{tr('PLATFORM ADMINISTRATION')}</span>
        <nav aria-label={tr('Admin navigation')}>
          {links
            .filter(
              ([path]) =>
                role === 'super_admin' ||
                ![
                  'financial-reports',
                  'integrations',
                  'staff',
                  'orders',
                  'requests',
                  'settings',
                  'homepage',
                  'terms',
                  'refund-policy',
                  'conversations',
                  'supplier-management',
                  'supplier-renewals',
                ].includes(path),
            )
            .map(([path, label, Icon]) => (
              <NavLink
                key={path}
                end={!path}
                to={path ? `/admin/${path}` : '/admin'}
                onClick={() => setMenu(false)}
              >
                <Icon size={18} />
                {tr(label)}
              </NavLink>
            ))}
        </nav>
        <div className="admin-identity">
          <ShieldCheck size={20} />
          <strong>{tr(role === 'super_admin' ? 'Super admin' : 'Staff admin')}</strong>
          <small>{session?.user.email}</small>
          <button onClick={() => void db().auth.signOut()}>
            <LogOut size={16} />
            {tr('Sign out')}
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-header">
          <button
            className="admin-menu"
            aria-label={tr('Toggle navigation')}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span>
            {tr('Paikarii.com control centre')}{' '}
            <small>
              /{' '}
              {tr(
                links.find(([p]) => p === (location.pathname.split('/')[2] ?? ''))?.[1] ??
                  'Suppliers',
              )}
            </small>
          </span>
          <div>
            <NotificationLink />
            <button onClick={toggle} aria-label={t.language}>
              <Globe2 size={16} />
              {t.language}
            </button>
            <Link to="/">
              {tr('Marketplace')}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>
        <main id="admin-main" className="admin-main">
          <Outlet />
        </main>
        <footer className="admin-footer">
          {tr('Private platform workspace')} · {tr('Bangladesh time (UTC+6)')}
        </footer>
      </div>
    </div>
  );
}
export function useAdminPaging() {
  const [params, set] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const size = [25, 50, 100].includes(Number(params.get('size'))) ? Number(params.get('size')) : 25;
  const filters = Object.fromEntries(
    [...params].filter(([key]) => !['page', 'size'].includes(key)),
  );
  function update(key: string, value: string) {
    set((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  }
  return { page, size, filters, update, set };
}
export function AdminFilters({
  paging,
  children,
}: {
  paging: ReturnType<typeof useAdminPaging>;
  children?: ReactNode;
}) {
  const tr = useT();
  return (
    <div className="admin-filters">
      <Field label={tr('Search')}>
        <input
          type="search"
          maxLength={200}
          placeholder={tr('Search records…')}
          value={paging.filters.q ?? ''}
          onChange={(e) => paging.update('q', e.target.value)}
        />
      </Field>
      {children}
      <Field label={tr('Rows per page')}>
        <select value={paging.size} onChange={(e) => paging.update('size', e.target.value)}>
          {[25, 50, 100].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}
export function AdminPagination({
  paging,
  total = 0,
}: {
  paging: ReturnType<typeof useAdminPaging>;
  total?: number;
}) {
  const tr = useT();
  return (
    <div className="admin-pagination">
      <span>
        {total} {tr('records')} · {tr('Page')} {paging.page} /{' '}
        {Math.max(1, Math.ceil(total / paging.size))}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={paging.page <= 1}
        onClick={() =>
          paging.set((p) => {
            p.set('page', String(paging.page - 1));
            return p;
          })
        }
      >
        {tr('Previous')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={paging.page * paging.size >= total}
        onClick={() =>
          paging.set((p) => {
            p.set('page', String(paging.page + 1));
            return p;
          })
        }
      >
        {tr('Next')}
      </Button>
    </div>
  );
}
export function SelectFilter({
  label,
  options,
  paging,
  name,
}: {
  label: string;
  options: readonly string[];
  paging: ReturnType<typeof useAdminPaging>;
  name: string;
}) {
  const tr = useT();
  return (
    <Field label={tr(label)}>
      <select
        value={paging.filters[name] ?? ''}
        onChange={(e) => paging.update(name, e.target.value)}
      >
        <option value="">{tr('All')}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {tr(o)}
          </option>
        ))}
      </select>
    </Field>
  );
}
const statsSchema = z.object({
  counts: z.record(z.string(), z.number()),
  trends: z.array(
    z.object({
      date: z.string(),
      registrations: z.number(),
      suppliers: z.number(),
      products: z.number(),
      quotations: z.number(),
    }),
  ),
});
export function AdminOverview() {
  const tr = useT();
  const [days, setDays] = useState(30);
  const stats = useQuery({
    queryKey: ['admin-stats', days],
    queryFn: async () => {
      const { data, error } = await db().rpc('admin_statistics', { days });
      if (error) throw error;
      return statsSchema.parse(data);
    },
  });
  const queues: Record<string, string> = {
    'Pending products': 'products?status=pending',
    'Pending verifications': 'verifications?status=submitted',
    'Open reports': 'reports?status=open',
    Accounts: 'accounts',
    Suppliers: 'suppliers',
    Products: 'products',
    'Suspended accounts': 'accounts?status=suspended',
  };
  return (
    <>
      <SectionTitle
        eyebrow={tr('MARKETPLACE OPERATIONS')}
        title={tr('Your marketplace, at a glance.')}
        description={tr('Real activity, review queues, and account health.')}
      />
      <Notice error={stats.error} />
      {stats.isPending ? (
        <State title={tr('Loading…')} />
      ) : (
        <>
          <div className="admin-stats">
            {Object.entries(stats.data?.counts ?? {}).map(([label, n]) => (
              <Link className="stat-card" to={`/admin/${queues[label] ?? ''}`} key={label}>
                <span>{tr(label)}</span>
                <strong>{n.toLocaleString('en-BD')}</strong>
                <small>{tr(queues[label] ? 'View records' : 'Marketplace total')} ↗</small>
              </Link>
            ))}
          </div>
          <section className="panel">
            <div className="admin-section-header">
              <h3>{tr('Daily activity')}</h3>
              <select
                aria-label={tr('Trend range')}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[7, 30, 90].map((n) => (
                  <option value={n} key={n}>
                    {n} {tr('days')}
                  </option>
                ))}
              </select>
            </div>
            <p>{tr('Bangladesh time (UTC+6)')}</p>
            <div className="trend-chart" role="img" aria-label={tr('Daily registration trend')}>
              {stats.data?.trends.map((d) => (
                <div key={d.date} title={`${d.date}: ${d.registrations}`}>
                  <i
                    style={{
                      height: `${Math.max(2, (100 * d.registrations) / Math.max(1, ...stats.data.trends.map((r) => r.registrations)))}%`,
                    }}
                  />
                  <small>{d.date.slice(5)}</small>
                </div>
              ))}
            </div>
            <div className="table-wrap trend-table">
              <table>
                <thead>
                  <tr>
                    {['Date', 'Registrations', 'Suppliers', 'Products', 'Quotations'].map((s) => (
                      <th key={s}>{tr(s)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...(stats.data?.trends ?? [])].reverse().map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.registrations}</td>
                      <td>{d.suppliers}</td>
                      <td>{d.products}</td>
                      <td>{d.quotations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
// Native modal supplies focus containment, Escape dismissal and restores focus to the trigger.
export function ActionDialog({
  label,
  description,
  onConfirm,
  requireReason = true,
  disabled = false,
}: {
  label: string;
  description?: string;
  onConfirm: (reason: string) => Promise<unknown>;
  requireReason?: boolean;
  disabled?: boolean;
}) {
  const tr = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => onConfirm(reason),
    onSuccess: () => {
      ref.current?.close();
      setReason('');
    },
  });
  return (
    <>
      <Button
        disabled={disabled}
        size="sm"
        variant="outline"
        onClick={() => {
          mutation.reset();
          if (!ref.current?.open) {
            ref.current?.showModal();
          }
        }}
      >
        {tr(label)}
      </Button>
      <dialog
        ref={ref}
        className="admin-dialog"
        aria-label={tr(label)}
        onCancel={(e) => {
          if (mutation.isPending) e.preventDefault();
        }}
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <h3>{tr(label)}</h3>
          <p>{description ?? tr('This action will be recorded in audit history.')}</p>
          {requireReason && (
            <Field label={tr('Reason')}>
              <textarea
                required
                autoFocus
                minLength={5}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          )}
          <Notice error={mutation.error} />
          <div className="table-actions">
            <Button disabled={mutation.isPending}>{tr('Confirm')}</Button>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => ref.current?.close()}
            >
              {tr('Cancel')}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
function AccountControls({ account, staff = false }: { account: AdminAccount; staff?: boolean }) {
  const { role } = useAuth();
  const cache = useQueryClient();
  if (role !== 'super_admin' || account.role === 'super_admin') return null;
  const refresh = () => cache.invalidateQueries();
  return (
    <div className="table-actions">
      {['buyer', 'supplier'].includes(account.role) && (
        <ActionDialog
          label={account.status === 'active' ? 'Suspend account' : 'Reactivate account'}
          description={account.email ?? account.full_name}
          onConfirm={async (reason) => {
            await adminAction('status', {
              target: account.id,
              status: account.status === 'active' ? 'suspended' : 'active',
              reason,
            });
            await refresh();
          }}
        />
      )}
      {staff && ['buyer', 'admin'].includes(account.role) && (
        <ActionDialog
          label={account.role === 'admin' ? 'Revoke staff access' : 'Grant staff access'}
          description={account.email ?? account.full_name}
          onConfirm={async (reason) => {
            await adminAction('staff', {
              target: account.id,
              grant: account.role === 'buyer',
              reason,
            });
            await refresh();
          }}
        />
      )}
    </div>
  );
}
export function AdminAccounts({
  kind = 'accounts',
}: {
  kind?: 'accounts' | 'suppliers' | 'staff';
}) {
  const tr = useT();
  const paging = useAdminPaging();
  const [grantSearch, setGrantSearch] = useState('');
  const list = useQuery({
    queryKey: ['admin-list', kind, paging.filters, paging.page, paging.size],
    queryFn: () => adminList(kind, paging.filters, paging.page, paging.size, accountSchema),
  });
  const candidates = useQuery({
    queryKey: ['admin-candidates', grantSearch],
    enabled: kind === 'staff' && grantSearch.length >= 3,
    queryFn: () => adminList('accounts', { q: grantSearch, role: 'buyer' }, 1, 25, accountSchema),
  });
  return (
    <>
      <SectionTitle
        title={tr(
          kind === 'suppliers'
            ? 'Supplier management'
            : kind === 'staff'
              ? 'Staff access'
              : 'Buyers & accounts',
        )}
        description={tr(
          kind === 'staff'
            ? 'Grant access only to active, verified buyer accounts.'
            : 'Review accounts and manage marketplace access.',
        )}
      />
      <AdminFilters paging={paging}>
        <SelectFilter
          label="Account status"
          name="status"
          options={['active', 'suspended']}
          paging={paging}
        />
        {kind === 'suppliers' ? (
          <>
            <SelectFilter label="Division" name="division" options={divisions} paging={paging} />
            <SelectFilter
              label="Verification"
              name="verified"
              options={['true', 'false']}
              paging={paging}
            />
          </>
        ) : (
          <SelectFilter
            label="Role"
            name="role"
            options={['buyer', 'supplier', 'admin', 'super_admin']}
            paging={paging}
          />
        )}
      </AdminFilters>
      <Notice error={list.error} />
      {list.isPending ? (
        <State title={tr('Loading accounts…')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Account', 'Role', 'Status', 'Registration / last sign-in', 'Actions'].map(
                  (s) => (
                    <th key={s}>{tr(s)}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {list.data?.rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>
                      {a.business_id ? (
                        <Link to={`/admin/suppliers/${a.business_id}`}>{a.name}</Link>
                      ) : (
                        a.full_name
                      )}
                    </strong>
                    <small>{a.email}</small>
                    <small>
                      {tr(a.email_confirmed_at ? 'Email verified' : 'Email unverified')} ·{' '}
                      {a.phone ?? '—'}
                    </small>
                    {a.division && (
                      <small>
                        {a.district}, {a.division} · {tr(a.verified ? 'Verified' : 'Unverified')}
                      </small>
                    )}
                    <details>
                      <summary>{tr('Account details')}</summary>
                      <small>{a.id}</small>
                      <p>{a.reason}</p>
                    </details>
                  </td>
                  <td>{tr(a.role)}</td>
                  <td>
                    <span className={`status-badge ${a.status}`}>{tr(a.status)}</span>
                  </td>
                  <td>
                    {adminDate(a.created_at)}
                    <small>{adminDate(a.last_sign_in_at)}</small>
                  </td>
                  <td>
                    <AccountControls account={a} staff={kind === 'staff'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.data?.rows.length && <State title={tr('No records found')} />}
        </div>
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
      {kind === 'staff' && (
        <section className="panel form-stack">
          <h3>{tr('Add staff member')}</h3>
          <Field label={tr('Search verified buyer by email or name')}>
            <input
              value={grantSearch}
              onChange={(e) => setGrantSearch(e.target.value)}
              minLength={3}
            />
          </Field>
          <Notice error={candidates.error} />
          {candidates.data?.rows
            .filter((a) => a.email_confirmed_at && a.status === 'active')
            .map((a) => (
              <div key={a.id} className="admin-section-header">
                <span>
                  {a.email} · {a.full_name}
                </span>
                <AccountControls account={a} staff />
              </div>
            ))}
        </section>
      )}
    </>
  );
}
const detailSchema = z.object({
  business: z.object({
    id: z.string(),
    owner_id: z.string(),
    name: z.string(),
    name_bn: z.string(),
    description: z.string(),
    address: z.string(),
    division: z.string(),
    district: z.string(),
    contact_phone: z.string(),
    website: z.string(),
    verified: z.boolean(),
  }),
  products: z.number(),
  quotations: z.number(),
  conversations: z.number(),
});
export function AdminSupplierDetail() {
  const tr = useT();
  const { role } = useAuth();
  const { id } = useParams();
  const detail = useQuery({
    queryKey: ['admin-supplier', id],
    queryFn: async () => {
      const { data, error } = await db().rpc('admin_supplier_detail', {
        target: z.uuid().parse(id),
      });
      if (error) throw error;
      return detailSchema.nullable().parse(data);
    },
  });
  const account = useQuery({
    queryKey: ['admin-supplier-account', id],
    queryFn: () => adminList('suppliers', { business_id: id! }, 1, 25, accountSchema),
  });
  const b = detail.data?.business;
  return (
    <>
      <SectionTitle title={b?.name ?? tr('Supplier details')} />
      <Notice error={detail.error ?? account.error} />
      {detail.isPending ? (
        <State title={tr('Loading…')} />
      ) : !b ? (
        <State title={tr('Supplier not found')} />
      ) : (
        <>
          <div className="panel">
            <h3>{b.name_bn}</h3>
            <p>{b.description}</p>
            <p>
              {b.address}, {b.district}, {b.division}
            </p>
            <p>
              {b.contact_phone} · {b.website}
            </p>
            <span className="status-badge">{tr(b.verified ? 'Verified' : 'Unverified')}</span>
            <p>
              {account.data?.rows[0]?.email} · {tr(account.data?.rows[0]?.status ?? 'active')}
            </p>
            <p>{account.data?.rows[0]?.reason}</p>
            {account.data?.rows[0] && <AccountControls account={account.data.rows[0]} />}
          </div>
          <div className="stat-grid">
            {(['products', 'quotations', 'conversations'] as const).map((k) => (
              <div className="stat-card" key={k}>
                <span>{tr(k)}</span>
                <strong>{detail.data?.[k]}</strong>
              </div>
            ))}
          </div>
          <div className="admin-quick-links">
            {role === 'super_admin' && (
              <Link to={`/admin/supplier-management/${id}`}>{tr('Manage supplier')} →</Link>
            )}
            {role === 'super_admin' && (
              <Link to={`/admin/conversations?business_id=${id}`}>
                {tr('View conversations')} ↗
              </Link>
            )}
            <Link to={`/admin/products?business_id=${id}`}>{tr('View products')} ↗</Link>
            <Link to={`/admin/verifications?business_id=${id}`}>
              {tr('Verification documents')} ↗
            </Link>
            <Link to={`/admin/audit?target=${id}`}>{tr('Supplier audit history')} ↗</Link>
            <Link to={`/admin/audit?target=${b.owner_id}`}>{tr('Account audit history')} ↗</Link>
          </div>
        </>
      )}
    </>
  );
}
export function AdminSettings() {
  const tr = useT();
  const query = useQuery({ queryKey: ['platform-settings'], queryFn: settings });
  return (
    <>
      <SectionTitle
        title={tr('Platform settings')}
        description={tr('Public branding, support details, and supplier onboarding.')}
      />
      <Notice error={query.error} />
      {query.data ? <SettingsForm value={query.data} /> : <State title={tr('Loading…')} />}
    </>
  );
}
function SettingsForm({ value }: { value: PlatformSettings }) {
  const tr = useT();
  const [form, setForm] = useState(value);
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: () => adminAction('settings', { settings: settingsSchema.parse(form) }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['platform-settings'] }),
  });
  return (
    <section className="panel form-stack max-form">
      {(
        [
          'name_en',
          'name_bn',
          'tagline_en',
          'tagline_bn',
          'support_email',
          'support_phone',
        ] as const
      ).map((k) => (
        <Field
          key={k}
          label={tr(
            {
              name_en: 'Marketplace name (English)',
              name_bn: 'Marketplace name (Bangla)',
              tagline_en: 'Tagline (English)',
              tagline_bn: 'Tagline (Bangla)',
              support_email: 'Support email',
              support_phone: 'Support phone',
            }[k],
          )}
        >
          <input
            type={k === 'support_email' ? 'email' : 'text'}
            required={k.startsWith('name')}
            maxLength={k.startsWith('name') ? 100 : k === 'support_phone' ? 30 : 200}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          />
        </Field>
      ))}
      <Field label={tr('Default language')}>
        <select
          value={form.default_locale}
          onChange={(e) => setForm({ ...form, default_locale: e.target.value as 'en' | 'bn' })}
        >
          <option value="en">English</option>
          <option value="bn">বাংলা</option>
        </select>
      </Field>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.supplier_registration_open}
          onChange={(e) => setForm({ ...form, supplier_registration_open: e.target.checked })}
        />
        {tr('Accept new supplier registrations')}
      </label>
      <Notice error={save.error} success={save.isSuccess ? tr('Settings saved.') : undefined} />
      <ActionDialog
        label="Save settings"
        requireReason={false}
        onConfirm={() => save.mutateAsync()}
      />
    </section>
  );
}
const auditSchema = z.object({
  id: z.string(),
  admin_id: z.string().nullable(),
  actor: z.string().nullable(),
  action: z.string(),
  entity_id: z.string(),
  details: z.unknown(),
  created_at: z.string(),
});
export function AdminAudit() {
  const tr = useT();
  const paging = useAdminPaging();
  const list = useQuery({
    queryKey: ['admin-list', 'audit', paging.filters, paging.page, paging.size],
    queryFn: () => adminList('audit', paging.filters, paging.page, paging.size, auditSchema),
  });
  return (
    <>
      <SectionTitle
        title={tr('Audit history')}
        description={tr('Administrative decisions with before and after values.')}
      />
      <AdminFilters paging={paging}>
        {['actor', 'action', 'target', 'from', 'to'].map((k) => (
          <Field
            key={k}
            label={tr(
              {
                actor: 'Actor email',
                action: 'Action',
                target: 'Target ID',
                from: 'From date',
                to: 'To date',
              }[k]!,
            )}
          >
            <input
              type={['from', 'to'].includes(k) ? 'date' : 'text'}
              value={paging.filters[k] ?? ''}
              onChange={(e) => paging.update(k, e.target.value)}
            />
          </Field>
        ))}
      </AdminFilters>
      <Notice error={list.error} />
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Action', 'Actor', 'Target', 'Time', 'Details'].map((s) => (
                  <th key={s}>{tr(s)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.data?.rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.action}</td>
                  <td>{a.actor ?? tr('Project operator')}</td>
                  <td>
                    <small>{a.entity_id}</small>
                  </td>
                  <td>{adminDate(a.created_at)}</td>
                  <td>
                    <details>
                      <summary>{tr('View changes')}</summary>
                      <pre className="audit-json">{JSON.stringify(a.details, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.data?.total && <State title={tr('No records found')} />}
        </div>
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
    </>
  );
}
