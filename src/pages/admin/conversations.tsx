import { ChatImage } from '@/components/chat-image';
import { SharedProduct } from '@/components/chat-panel';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  Eye,
  LockKeyhole,
  MessagesSquare,
  ArrowLeft,
  ArrowUpRight,
  RefreshCw,
  History,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import {
  monitorList,
  monitorOpen,
  monitorMessages,
  mergeMonitorMessages,
  type MonitorOpen,
  type MonitorMessage,
  type MonitorCursor,
} from '@/lib/conversation-monitor';
import { Button } from '@/components/ui/button';
import { randomUUID } from '@/lib/utils';
import { Field, Notice, State } from '@/components/shared';
import { AdminFilters, AdminPagination, useAdminPaging } from './console';
import './conversations.css';
function useMonitorDate() {
  const { locale } = useLocale();
  return (value: string) =>
    new Date(value).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD', {
      timeZone: 'Asia/Dhaka',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
}
export function ConversationMonitoring() {
  const tr = useT();
  const paging = useAdminPaging();
  const date = useMonitorDate();
  const list = useQuery({
    queryKey: ['admin-monitor-list', paging.filters, paging.page, paging.size],
    queryFn: () => monitorList(paging.filters, paging.page, paging.size),
    refetchInterval: 15000,
  });
  return (
    <div className="monitor-page">
      <header className="monitor-heading">
        <div>
          <span className="monitor-eyebrow">
            <Eye size={15} />
            {tr('PLATFORM OVERSIGHT')}
          </span>
          <h1>{tr('Conversation monitoring')}</h1>
          <p>
            {tr(
              'Review supplier–customer conversations. Message content is available only after opening an audited review.',
            )}
          </p>
        </div>
        <span className="monitor-readonly">
          <LockKeyhole size={14} />
          {tr('Read-only monitoring')}
        </span>
      </header>
      <section className="monitor-card">
        <AdminFilters paging={paging}>
          <Field label={tr('Supplier')}>
            <input
              value={paging.filters.supplier ?? ''}
              maxLength={200}
              onChange={(e) => paging.update('supplier', e.target.value)}
              placeholder={tr('Supplier name or email')}
            />
          </Field>
          <Field label={tr('Customer')}>
            <input
              value={paging.filters.customer ?? ''}
              maxLength={200}
              onChange={(e) => paging.update('customer', e.target.value)}
              placeholder={tr('Customer name or email')}
            />
          </Field>
          <Field label={tr('Last activity from')}>
            <input
              type="date"
              value={paging.filters.from ?? ''}
              onChange={(e) => paging.update('from', e.target.value)}
            />
          </Field>
          <Field label={tr('Last activity to')}>
            <input
              type="date"
              value={paging.filters.to ?? ''}
              onChange={(e) => paging.update('to', e.target.value)}
            />
          </Field>
        </AdminFilters>
        <Notice error={list.error} />
        {list.isPending ? (
          <State title={tr('Loading conversations…')} />
        ) : list.isError ? (
          <div className="monitor-empty">
            <Button variant="outline" onClick={() => void list.refetch()}>
              <RefreshCw size={15} />
              {tr('Try again')}
            </Button>
          </div>
        ) : list.data?.rows.length ? (
          <div className="monitor-table-wrap">
            <table>
              <thead>
                <tr>
                  {['Supplier', 'Customer', 'Messages', 'Last activity', 'Actions'].map((label) => (
                    <th key={label}>{tr(label)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/admin/suppliers/${row.business_id}`}>{row.supplier_name}</Link>
                      <small
                        className={row.supplier_status === 'suspended' ? 'monitor-suspended' : ''}
                      >
                        {tr(row.supplier_status)}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {row.customer_name || `${tr('Customer')} #${row.customer_id.slice(0, 8)}`}
                      </strong>
                      <small>#{row.customer_id.slice(0, 8).toUpperCase()}</small>
                    </td>
                    <td data-label={tr('Messages')}>{row.message_count}</td>
                    <td data-label={tr('Last activity')}>{date(row.last_activity)}</td>
                    <td>
                      <Link className="monitor-open-link" to={`/admin/conversations/${row.id}`}>
                        <Eye size={15} />
                        {tr('Open conversation')}
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="monitor-empty">
            <MessagesSquare size={34} />
            <h2>{tr('No conversations found')}</h2>
            <p>{tr('Try different filters or wait for a supplier–customer conversation.')}</p>
          </div>
        )}
        <AdminPagination paging={paging} total={list.data?.total} />
      </section>
      <p className="monitor-footnote">
        <History size={14} />
        {tr('Every conversation opening is recorded in super admin audit history.')}
      </p>
    </div>
  );
}
export function ConversationMonitoringDetail() {
  const tr = useT();
  const { id } = useParams();
  const { session } = useAuth();
  const [visit] = useState(() => randomUUID());
  const opened = useQuery({
    queryKey: ['admin-monitor-open', session!.user.id, id, visit],
    queryFn: () => monitorOpen(id!),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (opened.isPending) return <State title={tr('Opening audited conversation…')} />;
  if (opened.isError)
    return (
      <div className="monitor-page">
        <Link className="monitor-back" to="/admin/conversations">
          <ArrowLeft size={15} />
          {tr('Conversation monitoring')}
        </Link>
        <Notice error={opened.error} />
        <Button variant="outline" onClick={() => void opened.refetch()}>
          {tr('Try again')}
        </Button>
      </div>
    );
  return <MonitoringReader key={id} detail={opened.data} />;
}
function MonitoringReader({ detail }: { detail: MonitorOpen }) {
  const tr = useT();
  const date = useMonitorDate();
  const { locale } = useLocale();
  const [rows, setRows] = useState<MonitorMessage[]>(detail.messages.rows);
  const [hasOlder, setHasOlder] = useState(detail.messages.has_more);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<string>();
  const oldest = useRef(detail.messages.oldest);
  const newest = useRef<MonitorCursor>(
    detail.messages.newest ?? {
      created_at: '0001-01-01T00:00:00Z',
      id: '00000000-0000-0000-0000-000000000000',
    },
  );
  const log = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const prepend = useRef<{ id: string; top: number }>(null);
  const polling = useRef(false);
  useLayoutEffect(() => {
    const element = log.current;
    if (!element) return;
    if (prepend.current) {
      const anchor = element.querySelector<HTMLElement>(
        `[data-monitor-message="${prepend.current.id}"]`,
      );
      if (anchor) element.scrollTop += anchor.getBoundingClientRect().top - prepend.current.top;
      prepend.current = null;
    } else if (stick.current) element.scrollTop = element.scrollHeight;
  }, [rows]);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      if (document.visibilityState !== 'visible' || polling.current) return;
      polling.current = true;
      setRefreshing(true);
      try {
        let more = true;
        while (alive && more && document.visibilityState === 'visible') {
          const page = await monitorMessages(
            detail.conversation.id,
            detail.access_id,
            'after',
            newest.current,
          );
          if (!alive) return;
          if (page.newest) newest.current = page.newest;
          if (page.rows.length) setRows((current) => mergeMonitorMessages(current, page.rows));
          more = page.has_more;
        }
        if (alive) {
          setUpdated(new Date().toISOString());
          setError(undefined);
        }
      } catch (e) {
        if (alive) setError(e);
      } finally {
        polling.current = false;
        if (alive) setRefreshing(false);
      }
    };
    const interval = setInterval(() => void poll(), 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [detail.conversation.id, detail.access_id]);
  const loadOlder = async () => {
    if (!oldest.current || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const page = await monitorMessages(
        detail.conversation.id,
        detail.access_id,
        'before',
        oldest.current,
      );
      const anchor = log.current?.querySelector<HTMLElement>('[data-monitor-message]');
      if (anchor?.dataset.monitorMessage)
        prepend.current = {
          id: anchor.dataset.monitorMessage,
          top: anchor.getBoundingClientRect().top,
        };
      if (page.oldest) oldest.current = page.oldest;
      setRows((current) => mergeMonitorMessages(current, page.rows));
      setHasOlder(page.has_more);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const supplier = (message: MonitorMessage) => message.sender_id === detail.supplier.id;
  const day = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-BD', {
      timeZone: 'Asia/Dhaka',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  return (
    <div className="monitor-page">
      <Link className="monitor-back" to="/admin/conversations">
        <ArrowLeft size={15} />
        {tr('Conversation monitoring')}
      </Link>
      <header className="monitor-heading">
        <div>
          <span className="monitor-eyebrow">
            <Eye size={15} />
            {tr('AUDITED REVIEW')}
          </span>
          <h1>{detail.supplier.name}</h1>
          <p>
            {tr('Customer')}: {detail.customer.name || `#${detail.customer.id.slice(0, 8)}`}
          </p>
        </div>
        <span className="monitor-readonly">
          <LockKeyhole size={14} />
          {tr('Read-only monitoring')}
        </span>
      </header>
      <div className="monitor-banner">
        <LockKeyhole size={16} />
        <p>
          {tr(
            'This access has been recorded. You can read the conversation but cannot send, edit, or delete messages.',
          )}
        </p>
        <Link
          to={`/admin/audit?action=conversation_monitor.opened&target=${detail.conversation.id}`}
        >
          {tr('View access history')}
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="monitor-detail-grid">
        <section className="monitor-card monitor-chat">
          <header>
            <h2>{tr('Conversation history')}</h2>
            <span>{tr(refreshing ? 'Refreshing…' : 'Updates every 15 seconds')}</span>
          </header>
          <Notice error={error} />
          <div
            ref={log}
            role="log"
            aria-label={tr('Monitored conversation messages')}
            className="monitor-message-log"
            onScroll={(e) => {
              stick.current =
                e.currentTarget.scrollHeight -
                  e.currentTarget.scrollTop -
                  e.currentTarget.clientHeight <
                80;
            }}
          >
            {hasOlder && (
              <Button
                className="monitor-load-older"
                variant="outline"
                disabled={busy}
                onClick={() => void loadOlder()}
              >
                {tr(busy ? 'Loading…' : 'Load older messages')}
              </Button>
            )}
            {!rows.length ? (
              <div className="monitor-empty">
                <MessagesSquare size={30} />
                <p>{tr('No messages in this conversation yet.')}</p>
              </div>
            ) : (
              rows.map((message, index) => (
                <div key={message.id} data-monitor-message={message.id}>
                  {(index === 0 || day(rows[index - 1].created_at) !== day(message.created_at)) && (
                    <div className="monitor-day">{day(message.created_at)}</div>
                  )}
                  <article
                    className={`monitor-message ${supplier(message) ? 'from-supplier' : ''}`}
                  >
                    <span>
                      {supplier(message)
                        ? detail.supplier.name
                        : detail.customer.name || tr('Customer')}{' '}
                      · {tr(supplier(message) ? 'Supplier' : 'Customer')}
                    </span>
                    {message.product_snapshot && (
                      <SharedProduct product={message.product_snapshot} />
                    )}
                    {message.image_id && (
                      <ChatImage id={message.image_id} monitorAccess={detail.access_id} />
                    )}
                    <p>{message.body}</p>
                    <time dateTime={message.created_at}>
                      {new Date(message.created_at).toLocaleTimeString(
                        locale === 'bn' ? 'bn-BD' : 'en-BD',
                        { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' },
                      )}
                    </time>
                  </article>
                </div>
              ))
            )}
          </div>
          <footer>
            <Eye size={14} />
            {tr('Read-only monitoring')}
            {updated && (
              <span>
                {tr('Last checked')}: {date(updated)}
              </span>
            )}
          </footer>
        </section>
        <aside className="monitor-participants">
          <section className="monitor-card">
            <h2>{tr('Participants')}</h2>
            {[
              { label: 'Supplier', participant: detail.supplier },
              { label: 'Customer', participant: detail.customer },
            ].map(({ label, participant }) => {
              return (
                <div className="monitor-person" key={label}>
                  <span>{tr(label)}</span>
                  <h3>{participant.name || `#${participant.id.slice(0, 8)}`}</h3>
                  <p>{participant.email ?? '—'}</p>
                  <small className={participant.status === 'suspended' ? 'monitor-suspended' : ''}>
                    {tr(participant.status)}
                  </small>
                  <small>#{participant.id.slice(0, 8).toUpperCase()}</small>
                </div>
              );
            })}
            <Link
              className="monitor-open-link"
              to={`/admin/suppliers/${detail.supplier.business_id}`}
            >
              {tr('Supplier details')}
              <ArrowUpRight size={13} />
            </Link>
          </section>
          <section className="monitor-card">
            <h2>{tr('Conversation details')}</h2>
            <p>
              {tr('Created')}: {date(detail.conversation.created_at)}
            </p>
            <p className="monitor-reference">
              {tr('Reference')}: {detail.conversation.id}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
