import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PackageCheck,
  AlertTriangle,
  Landmark,
  Scale,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Copy,
  Check,
  Printer,
  Phone,
  MessageCircle,
  Truck,
  Clock,
  ShieldCheck,
  UserRound,
  Store,
  Search,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useT, useLocale } from '@/lib/i18n';
import {
  adminOrders,
  adminOrderCounts,
  adminOrderQueues,
  bangladeshContact,
} from '@/lib/admin-orders';
import {
  orderLabels,
  orderStates,
  paymentStates,
  type OrderDetail,
  type OrderAction,
} from '@/lib/order-schema';
import { formatOrderDate } from '@/lib/orders';
import { adminList } from '@/lib/admin-api';
import { db } from '@/lib/supabase';
import { money } from '@/lib/utils';
import { formatQuantity } from '@/lib/units';
import { variantLabel } from '@/lib/buying';
import { Button } from '@/components/ui/button';
import { Field, Notice, State, useTitle } from '@/components/shared';
import { OrderReceipt } from '@/components/order/receipt';
import { EscrowAppealRoom } from '@/components/order/escrow-appeal-room';
import './order-management.css';
const polling = () => (document.visibilityState === 'visible' ? 15000 : false);
function Status({ value }: { value: string }) {
  const tr = useT();
  return <span className={`order-status status-${value}`}>{tr(orderLabels[value] ?? value)}</span>;
}
function orderNumber(number: number) {
  return `PK-${String(number).padStart(6, '0')}`;
}
function initial(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
function Retry({ error, retry }: { error: unknown; retry: () => unknown }) {
  const tr = useT();
  return (
    <div>
      <Notice error={error} />
      <Button variant="outline" onClick={retry}>
        {tr('Try again')}
      </Button>
    </div>
  );
}
export function AdminOrdersHub() {
  const tr = useT();
  const { locale } = useLocale();
  const { role, session } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '',
    state = params.get('state') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1),
    size = [25, 50, 100].includes(Number(params.get('size'))) ? Number(params.get('size')) : 25;
  const [draft, setDraft] = useState(search);
  useEffect(() => {
    setDraft(search);
  }, [search]);
  const list = useQuery({
    queryKey: ['orders', 'admin', session?.user.id, search, state, page, size],
    enabled: role === 'super_admin',
    queryFn: () => adminOrders(search, state, page, size),
    retry: false, // PostgREST already retries transient GET failures.
    refetchInterval: polling,
  });
  const counts = useQuery({
    queryKey: ['orders', 'admin-counts', session?.user.id],
    enabled: role === 'super_admin',
    queryFn: adminOrderCounts,
    retry: false,
    refetchInterval: polling,
  });
  useTitle(tr('Order management'));
  const update = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (key !== 'page') {
        if (draft) next.set('search', draft);
        else next.delete('search');
        next.delete('page');
      }
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  return (
    <section className="orders-page admin-orders-shell">
      <header className="ao-heading">
        <span className="ao-heading-icon">
          <PackageCheck size={26} />
        </span>
        <div>
          <span className="eyebrow">{tr('PLATFORM OPERATIONS')}</span>
          <h1>{tr('Platform Order Operations')}</h1>
          <p>{tr('Supervise fulfilment, manual bank payments, disputes and refunds.')}</p>
        </div>
      </header>
      <div className="admin-order-kpi-ribbon">
        {(
          [
            ['open', 'Open orders', PackageCheck],
            ['action_required', 'Action Required', AlertTriangle],
            ['reported', 'Bank payments to verify', Landmark],
            ['disputed', 'Active Disputes', Scale],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            aria-pressed={state === key}
            onClick={() => update('state', key)}
            className={`ao-kpi ao-kpi-${key}`}
          >
            <span>
              <Icon size={20} />
              <ArrowUpRight size={15} />
            </span>
            <strong>
              {counts.data
                ? new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
                    counts.data[key],
                  )
                : '—'}
            </strong>
            <small>{tr(label)}</small>
          </button>
        ))}
      </div>
      {counts.error && <Retry error={counts.error} retry={() => counts.refetch()} />}
      <p className="ao-scope">
        {tr('Platform-wide totals. Search and status filters apply to the queue below.')}
      </p>
      <nav className="admin-order-tabs" aria-label={tr('Order operation queues')}>
        {adminOrderQueues.map(([value, label]) => (
          <button key={value} aria-pressed={state === value} onClick={() => update('state', value)}>
            {tr(label)}
            {counts.data &&
              ['action_required', 'reported', 'disputed', 'refund_pending'].includes(value) && (
                <span>{counts.data[value]}</span>
              )}
          </button>
        ))}
      </nav>
      <form
        className="order-filters ao-filters"
        onSubmit={(event) => {
          event.preventDefault();
          update('search', draft);
        }}
      >
        <Field label={tr('Search orders')}>
          <input
            type="search"
            aria-label={tr('Search orders')}
            maxLength={200}
            placeholder={tr('Order number, supplier or buyer')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </Field>
        <Field label={tr('Status')}>
          <select value={state} onChange={(event) => update('state', event.target.value)}>
            <option value="">{tr('All statuses')}</option>
            <option value="action_required">{tr('Action Required')}</option>
            <option value="open">{tr('Open orders')}</option>
            <option value="fulfilment">{tr('In Fulfilment')}</option>
            {[...orderStates, ...paymentStates].map((value) => (
              <option key={value} value={value}>
                {tr(orderLabels[value])}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="outline" aria-label={tr('Search')}>
          <Search size={16} />
          {tr('Search')}
        </Button>
        <Field label={tr('Rows per page')}>
          <select value={size} onChange={(event) => update('size', event.target.value)}>
            {[25, 50, 100].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
      </form>
      {list.isPending ? (
        <State title={tr('Loading orders…')} />
      ) : list.error ? (
        <Retry error={list.error} retry={() => list.refetch()} />
      ) : !list.data?.rows.length ? (
        <State
          title={tr('No orders found')}
          description={tr('Orders matching your search will appear here.')}
        />
      ) : (
        <>
          <div
            className="order-table-wrap ao-table-wrap"
            role="region"
            aria-label={tr('Order operations records')}
            tabIndex={0}
          >
            <table className="order-table admin-order-table">
              <thead>
                <tr>
                  {['Order', 'Participants', 'Financials', 'Fulfilment', 'Supervisor Actions'].map(
                    (label) => (
                      <th key={label}>{tr(label)}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {list.data.rows.map((order) => {
                  const shortcut =
                    order.payment_status === 'reported'
                      ? ['payment-verification', 'Verify bank payment']
                      : order.payment_status === 'refund_pending'
                        ? ['refund-verification', 'Verify refund']
                        : order.status === 'disputed'
                          ? ['dispute-review', 'Review Dispute']
                          : ['', 'View details'];
                  return (
                    <tr key={order.id}>
                      <td data-label={tr('Order')}>
                        <Link className="ao-order-number" to={`/admin/orders/${order.id}`}>
                          {orderNumber(order.number)}
                        </Link>
                        <time>{formatOrderDate(order.created_at, locale)}</time>
                        {order.cancellation_requested && (
                          <span className="ao-attention-label">{tr('Cancellation requested')}</span>
                        )}
                        {(order.order_shipments[0]?.count ?? 0) > 0 && (
                          <small className="ao-record-marker">
                            <Truck size={13} />
                            {tr('Shipment recorded')}
                          </small>
                        )}
                      </td>
                      <td data-label={tr('Participants')}>
                        <div className="ao-participant-row">
                          <span className="ao-avatar">{initial(order.supplier_name)}</span>
                          <div>
                            <small>{tr('Supplier')}</small>
                            <Link to={`/admin/supplier-management/${order.business_id}`}>
                              {order.supplier_name}
                              <ArrowUpRight size={12} />
                            </Link>
                          </div>
                        </div>
                        <div className="ao-participant-row">
                          <span className="ao-avatar buyer">
                            <UserRound size={15} />
                          </span>
                          <div>
                            <small>{tr('Buyer')}</small>
                            <Link to={`/admin/accounts?id=${order.buyer_id}`}>
                              {order.buyer_name}
                              <ArrowUpRight size={12} />
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td data-label={tr('Financials')}>
                        <strong className="ao-price">{money(order.total, locale)}</strong>
                        <small>{tr(orderLabels[order.payment_method])}</small>
                        <Status value={order.payment_status} />
                        {(order.order_payments[0]?.count ?? 0) > 0 && (
                          <small>
                            {tr('Payment records')}: {order.order_payments[0].count}
                          </small>
                        )}
                      </td>
                      <td data-label={tr('Fulfilment')}>
                        <Status value={order.status} />
                        <small>{tr(order.purchase_kind ?? 'wholesale')}</small>
                      </td>
                      <td data-label={tr('Supervisor Actions')}>
                        <Button asChild variant={shortcut[0] ? 'default' : 'outline'} size="sm">
                          <Link
                            to={`/admin/orders/${order.id}${shortcut[0] ? `#${shortcut[0]}` : ''}`}
                          >
                            {tr(shortcut[1])}
                            <ArrowRight size={14} />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="order-pagination" aria-label={tr('Order pagination')}>
            <span>
              {tr('Total orders')}: {list.data.total}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => update('page', String(page - 1))}
            >
              {tr('Previous')}
            </Button>
            <span>
              {page} / {Math.max(1, Math.ceil(list.data.total / size))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * size >= list.data.total}
              onClick={() => update('page', String(page + 1))}
            >
              {tr('Next')}
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}
function AdminCopy({ text, label }: { text: string; label: string }) {
  const tr = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ao-copy"
      aria-label={tr(copied ? 'Copied!' : label)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}
function ContactLinks({ phone }: { phone: string }) {
  const tr = useT();
  const contact = bangladeshContact(phone);
  return contact ? (
    <div className="ao-contact-links">
      <a href={`tel:${contact.tel}`}>
        <Phone size={14} />
        {phone}
      </a>
      <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={14} />
        {tr('WhatsApp')}
      </a>
    </div>
  ) : (
    <p>{phone || '—'}</p>
  );
}
const accountSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
});
export function AdminOrderCommand({
  order: o,
  actions,
  onAction,
  actionLabels,
  dialog,
}: {
  order: OrderDetail;
  actions: OrderAction[];
  onAction: (action: OrderAction, note?: string) => void;
  actionLabels: Record<OrderAction, string>;
  dialog: ReactNode;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const location = useLocation();
  const [actor, setActor] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const contact = useQuery({
    queryKey: ['order-admin-contact', o.business_id],
    queryFn: async () => {
      const result = await db().rpc('admin_supplier_detail', { target: o.business_id });
      if (result.error) throw result.error;
      return z
        .object({
          business: z.object({
            owner_id: z.string(),
            name: z.string(),
            contact_phone: z.string(),
            district: z.string(),
            division: z.string(),
          }),
        })
        .nullable()
        .parse(result.data);
    },
  });
  const buyer = useQuery({
    queryKey: ['order-admin-account', o.buyer_id],
    queryFn: () => adminList('accounts', { id: o.buyer_id }, 1, 25, accountSchema),
  });
  const supplier = useQuery({
    queryKey: ['order-admin-account', contact.data?.business.owner_id],
    enabled: !!contact.data?.business.owner_id,
    queryFn: () =>
      adminList('accounts', { id: contact.data!.business.owner_id }, 1, 25, accountSchema),
  });
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) {
      const panel = document.getElementById(id);
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ block: 'start' });
    }
  }, [location.hash, o.id]);
  const report = [...o.payments]
    .filter((payment) => payment.kind === 'payment_report')
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .at(-1);
  const bankBanner = o.payment_status === 'reported';
  const refundBanner = o.payment_status === 'refund_pending';
  const otherActions = actions.filter(
    (action) =>
      !(bankBanner && action === 'confirm_payment') &&
      !(refundBanner && action === 'confirm_refund'),
  );
  const history = [...o.events]
    .filter(
      (event) =>
        (!actor || event.actor_role === actor) &&
        (!historySearch ||
          `${event.note} ${event.action}`.toLowerCase().includes(historySearch.toLowerCase())),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const showAction = (action: OrderAction) =>
    actions.includes(action) && (
      <Button
        key={action}
        data-order-action={action}
        variant={
          ['note', 'resolve_cancel', 'resolve_resume', 'authorize_return'].includes(action)
            ? 'outline'
            : 'default'
        }
        onClick={() => onAction(action)}
      >
        {tr(actionLabels[action])}
      </Button>
    );
  return (
    <div className="orders-page order-detail admin-orders-shell admin-order-command">
      <nav className="ao-breadcrumb" aria-label={tr('Breadcrumb')}>
        <Link to="/admin">{tr('Overview')}</Link>
        <ChevronRight size={13} />
        <Link to="/admin/orders">{tr('Order management')}</Link>
        <ChevronRight size={13} />
        <span>{orderNumber(o.number)}</span>
      </nav>
      <header className="order-detail-heading ao-command-heading">
        <div>
          <span className="eyebrow">{tr('ORDER SUPERVISION')}</span>
          <div className="ao-number-row">
            <h1>{orderNumber(o.number)}</h1>
            <AdminCopy text={orderNumber(o.number)} label="Copy order number" />
          </div>
          <p>
            {tr('Placed')} {formatOrderDate(o.created_at, locale)}
          </p>
          <div className="ao-heading-statuses">
            <Status value={o.status} />
            <Status value={o.payment_status} />
            <span>{tr(o.purchase_kind)}</span>
          </div>
        </div>
        <div className="ao-header-total">
          <span>{tr('Order total')}</span>
          <strong>{money(o.total, locale)}</strong>
          <Button
            className="order-print"
            variant="outline"
            aria-label={tr('Print order')}
            onClick={async () => {
              await document.fonts.ready;
              window.print();
            }}
          >
            <Printer size={16} />
            {tr('Print order')}
          </Button>
        </div>
      </header>
      <nav className="ao-cross-links" aria-label={tr('Supervisor shortcuts')}>
        <Link to={`/admin/accounts?id=${o.buyer_id}`}>
          {tr('Buyer Account')}
          <ArrowUpRight size={14} />
        </Link>
        <Link to={`/admin/supplier-management/${o.business_id}`}>
          {tr('Supplier Workspace')}
          <ArrowUpRight size={14} />
        </Link>
        <Link to={`/admin/audit?target=${o.id}`}>
          {tr('Audit Trail')}
          <ArrowUpRight size={14} />
        </Link>
      </nav>
      {bankBanner && (
        <section
          id="payment-verification"
          tabIndex={-1}
          className="admin-order-supervisor-banner ao-bank-banner"
          aria-label={tr('Bank payment verification')}
        >
          <span className="ao-banner-icon">
            <Landmark size={25} />
          </span>
          <div>
            <span className="eyebrow">{tr('SUPERVISOR CHECKPOINT')}</span>
            <h2>{tr('Bank payment verification')}</h2>
            <p>
              {tr(
                'Check the external bank record and reported reference before confirming payment.',
              )}
            </p>
            <dl>
              <div>
                <dt>{tr('Order total')}</dt>
                <dd>{money(o.total, locale)}</dd>
              </div>
              <div>
                <dt>{tr('Latest reported amount')}</dt>
                <dd>{report ? money(report.amount, locale) : tr('No payment report recorded')}</dd>
              </div>
              <div>
                <dt>{tr('Transaction / receipt reference')}</dt>
                <dd>
                  {report?.reference || '—'}
                  {report?.reference && (
                    <AdminCopy text={report.reference} label="Copy transaction reference" />
                  )}
                </dd>
              </div>
            </dl>
            {showAction('confirm_payment')}
            <small>
              {tr('Manual verification only. Paikarii.com does not hold or transfer funds.')}
            </small>
          </div>
        </section>
      )}
      {refundBanner && (
        <section
          id="refund-verification"
          tabIndex={-1}
          className="admin-order-supervisor-banner ao-refund-banner"
          aria-label={tr('Refund verification')}
        >
          <span className="ao-banner-icon">
            <Landmark size={25} />
          </span>
          <div>
            <span className="eyebrow">{tr('SUPERVISOR CHECKPOINT')}</span>
            <h2>{tr('Refund verification')}</h2>
            <p>
              {tr(
                'Verify the completed external refund and its receipt before updating this order.',
              )}
            </p>
            <strong className="ao-refund-amount">{money(o.total, locale)}</strong>
            {showAction('confirm_refund')}
          </div>
        </section>
      )}
      {o.cancellation_requested && (
        <div className="ao-cancellation">
          <AlertTriangle size={18} />
          {tr(
            'Cancellation requested. Shipment remains paused pending supplier response or dispute resolution.',
          )}
        </div>
      )}
      {o.disputes.length > 0 && (
        <div id="dispute-review" tabIndex={-1} className="ao-dispute-hub">
          <EscrowAppealRoom
            order={o}
            buyer={false}
            seller={false}
            admin
            allowedActions={actions}
            onAction={(action, note) => {
              if (actions.includes(action)) onAction(action, note);
            }}
          />
        </div>
      )}
      <div className="ao-detail-grid">
        <div className="ao-detail-main">
          <section className="order-panel">
            <header>
              <UserRound size={19} />
              <h2>{tr('Participants')}</h2>
            </header>
            <Notice error={contact.error ?? buyer.error ?? supplier.error} />
            <div className="admin-order-participants-grid">
              <article>
                <div className="ao-person-heading">
                  <UserRound size={20} />
                  <div>
                    <small>{tr('Buyer')}</small>
                    <h3>{buyer.data?.rows[0]?.full_name || o.buyer_name}</h3>
                  </div>
                </div>
                {buyer.data?.rows[0]?.phone && <ContactLinks phone={buyer.data.rows[0].phone} />}
                <small>{tr('Delivery recipient')}</small>
                <address>
                  <strong>{o.shipping_address.name}</strong>
                  <ContactLinks phone={o.shipping_address.phone} />
                  <p>{o.shipping_address.address}</p>
                  <p>
                    {tr(o.shipping_address.district)}, {tr(o.shipping_address.division)}
                  </p>
                </address>
                <Link to={`/admin/accounts?id=${o.buyer_id}`}>{tr('Buyer Account')} ↗</Link>
              </article>
              <article>
                <div className="ao-person-heading">
                  <Store size={20} />
                  <div>
                    <small>{tr('Supplier')}</small>
                    <h3>{o.supplier_name}</h3>
                  </div>
                </div>
                {supplier.data?.rows[0]?.full_name && (
                  <p>
                    <small>{tr('Business owner')}</small>
                    {supplier.data.rows[0].full_name}
                  </p>
                )}
                {contact.data?.business.contact_phone && (
                  <ContactLinks phone={contact.data.business.contact_phone} />
                )}
                <p>
                  {contact.data
                    ? `${tr(contact.data.business.district)}, ${tr(contact.data.business.division)}`
                    : tr('Supplier contact details unavailable')}
                </p>
                <Link to={`/admin/supplier-management/${o.business_id}`}>
                  {tr('Supplier Workspace')} ↗
                </Link>
              </article>
            </div>
          </section>
          <section className="order-panel">
            <header>
              <PackageCheck size={19} />
              <h2>{tr('Order items')}</h2>
            </header>
            <div className="ao-items">
              {o.items.map((item) => (
                <div className="ao-item" key={item.id}>
                  <div>
                    <h3>{locale === 'bn' && item.name_bn ? item.name_bn : item.name}</h3>
                    {Object.keys(item.variant_snapshot ?? {}).length > 0 && (
                      <span className="ao-variant">
                        {variantLabel(item.variant_snapshot ?? {})}
                      </span>
                    )}
                    <small>
                      {formatQuantity(item.quantity, item.unit, locale)} ×{' '}
                      {money(item.unit_price, locale)}
                    </small>
                  </div>
                  <strong>{money(item.line_total, locale)}</strong>
                </div>
              ))}
            </div>
            <dl className="order-totals">
              <div>
                <dt>{tr('Product subtotal')}</dt>
                <dd>{money(o.subtotal, locale)}</dd>
              </div>
              <div>
                <dt>{tr('Delivery')}</dt>
                <dd>
                  {o.status === 'pending_confirmation'
                    ? tr('Supplier to confirm')
                    : money(o.shipping_fee, locale)}
                </dd>
              </div>
              <div>
                <dt>{tr('Total')}</dt>
                <dd>{money(o.total, locale)}</dd>
              </div>
            </dl>
          </section>
          <section className="order-panel">
            <header>
              <Truck size={19} />
              <h2>{tr('Shipment & logistics')}</h2>
            </header>
            {o.shipments.length ? (
              o.shipments.map((shipment) => (
                <div className="order-tracking" key={shipment.id}>
                  <Truck size={20} />
                  <div>
                    <strong>{shipment.carrier}</strong>
                    <span className="ao-tracking-value">
                      {shipment.tracking_number}
                      <AdminCopy text={shipment.tracking_number} label="Copy tracking reference" />
                    </span>
                    <small>{formatOrderDate(shipment.shipped_at, locale)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="ao-empty">{tr('No shipment recorded')}</p>
            )}
            {o.returns.length > 0 && (
              <div className="ao-return-history">
                <h3>{tr('Return shipment')}</h3>
                {o.returns.map((returned) => (
                  <div key={returned.id}>
                    <Status value={returned.status} />
                    <p>
                      {returned.carrier} {returned.tracking_number}
                    </p>
                    <small>{formatOrderDate(returned.authorized_at, locale)}</small>
                    {returned.received_at && (
                      <p>
                        {tr(
                          returned.restocked
                            ? 'Returned units restocked'
                            : 'Returned units not restocked',
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {o.buyer_note && (
              <div className="ao-order-note">
                <strong>{tr('Buyer note')}</strong>
                <p>{o.buyer_note}</p>
              </div>
            )}
            {o.supplier_note && (
              <div className="ao-order-note">
                <strong>{tr('Supplier note')}</strong>
                <p>{o.supplier_note}</p>
              </div>
            )}
          </section>
          <section className="order-panel ao-history-panel">
            <header>
              <Clock size={19} />
              <h2>{tr('Order history')}</h2>
            </header>
            <div className="ao-history-filters">
              <Field label={tr('Filter history by actor')}>
                <select value={actor} onChange={(event) => setActor(event.target.value)}>
                  <option value="">{tr('All')}</option>
                  {['buyer', 'supplier', 'super_admin', 'system'].map((value) => (
                    <option key={value} value={value}>
                      {tr(
                        value === 'super_admin'
                          ? 'Super admin'
                          : value === 'buyer'
                            ? 'Buyer'
                            : value === 'supplier'
                              ? 'Supplier'
                              : 'System',
                      )}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tr('Search history')}>
                <input
                  type="search"
                  maxLength={200}
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                />
              </Field>
            </div>
            <ol className="order-history">
              {history.map((event) => (
                <li key={event.id}>
                  <span className="order-timeline-dot" />
                  <div>
                    <strong>{tr(orderLabels[event.action] ?? event.action)}</strong>
                    <small>
                      <span className={`ao-actor actor-${event.actor_role}`}>
                        {tr(
                          event.actor_role === 'super_admin'
                            ? 'Super admin'
                            : event.actor_role === 'supplier'
                              ? 'Supplier'
                              : event.actor_role === 'system'
                                ? 'System'
                                : 'Buyer',
                        )}
                      </span>{' '}
                      · {formatOrderDate(event.created_at, locale)}
                    </small>
                    {event.note && <p className="preserve-lines">{event.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {!history.length && <p className="ao-empty">{tr('No events match these filters')}</p>}
          </section>
        </div>
        <aside className="ao-supervisor-aside">
          <section className="order-panel order-actions-panel">
            <header>
              <ShieldCheck size={19} />
              <h2>{tr('Supervisor Actions')}</h2>
            </header>
            <p>
              {tr('Decisions use the current order version and are recorded in order history.')}
            </p>
            {o.status === 'disputed' && (
              <p className="ao-warning-copy">
                {tr('Review both parties and any active return before resolving the dispute.')}
              </p>
            )}
            <div className="order-action-buttons">
              {otherActions.map((action) => showAction(action))}
            </div>
          </section>
          <section className="order-panel">
            <header>
              <Landmark size={19} />
              <h2>{tr('Payment record')}</h2>
            </header>
            <p>{tr(orderLabels[o.payment_method])}</p>
            <Status value={o.payment_status} />
            <p className="ao-scope">
              {tr(
                'External payment records, not an escrow balance. Paikarii.com does not move money.',
              )}
            </p>
            {o.payments.length ? (
              o.payments.map((payment) => (
                <article className="order-payment-record" key={payment.id}>
                  <strong>
                    {tr(
                      orderLabels[
                        payment.kind === 'payment_report'
                          ? 'report_payment'
                          : payment.kind === 'payment_confirmed'
                            ? 'confirm_payment'
                            : 'confirm_refund'
                      ],
                    )}
                  </strong>
                  <span>{money(payment.amount, locale)}</span>
                  <span className="ao-payment-ref">
                    {payment.reference}
                    <AdminCopy text={payment.reference} label="Copy transaction reference" />
                  </span>
                  <small>{formatOrderDate(payment.created_at, locale)}</small>
                </article>
              ))
            ) : (
              <p className="ao-empty">{tr('No payment records yet')}</p>
            )}
          </section>
        </aside>
      </div>
      <OrderReceipt order={o} />
      {dialog}
    </div>
  );
}
