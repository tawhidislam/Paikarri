import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  MessageSquare,
  MessagesSquare,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { chatList, threadName } from '@/lib/chat';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { Notice, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import ChatPanel from '@/components/chat-panel';
import './messages.css';
import './inbox-workspace.css';
export default function Messages() {
  const tr = useT();
  const { locale } = useLocale();
  const { session, role } = useAuth();
  const buyer = role === 'buyer';
  const number = (value: number) =>
    new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(value);
  const page = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const threadButtons = useRef(new Map<string, HTMLButtonElement>());
  const previousThread = useRef<string | null>(null);
  const [params, setParams] = useSearchParams();
  const thread = params.get('thread');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    if (!thread) return;
    const viewport = window.visualViewport;
    let frame = 0,
      baselineHeight = viewport?.height ?? innerHeight,
      baselineWidth = innerWidth;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = viewport?.height ?? innerHeight;
        if (Math.abs(innerWidth - baselineWidth) > 100) {
          baselineWidth = innerWidth;
          baselineHeight = height;
        }
        page.current?.style.setProperty('--buyer-chat-height', `${height}px`);
        page.current?.style.setProperty('--buyer-chat-top', `${viewport?.offsetTop ?? 0}px`);
        page.current?.classList.toggle('is-keyboard-open', height < baselineHeight * 0.78);
      });
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      page.current?.classList.remove('is-keyboard-open');
    };
  }, [thread]);
  useLayoutEffect(() => {
    if (previousThread.current && !thread) {
      const target = threadButtons.current.get(previousThread.current) ?? searchInput.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'nearest' });
    }
    previousThread.current = thread;
  }, [thread]);
  useTitle(tr('Messages'));
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const threads = useInfiniteQuery({
    queryKey: ['chat-list', session!.user.id, query, unread],
    queryFn: ({ pageParam }) => chatList(query, unread, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      all.flatMap((x) => x.rows).length < last.total ? all.length + 1 : undefined,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  const rows = [
    ...new Map((threads.data?.pages.flatMap((p) => p.rows) ?? []).map((t) => [t.id, t])).values(),
  ];
  const back = () =>
    setParams((p) => {
      p.delete('thread');
      return p;
    });
  return (
    <div
      ref={page}
      className={`inbox-page workspace-inbox ${buyer ? 'buyer-inbox' : 'supplier-inbox'} ${thread ? 'is-reading-thread' : ''}`}
    >
      <header className="inbox-page-heading">
        <div>
          <span className="inbox-eyebrow">
            <MessagesSquare size={15} />
            {tr(buyer ? 'YOUR SUPPLIER INBOX' : 'BUSINESS MESSAGING')}
          </span>
          <h1>{tr('Messages')}</h1>
          <p>
            {tr(
              role === 'supplier'
                ? 'Turn buyer inquiries into lasting business relationships.'
                : 'Talk to suppliers and work out the details.',
            )}
          </p>
        </div>
        {buyer ? (
          <Link className="buyer-inbox-browse" to="/suppliers">
            <Search size={16} />
            {tr('Find suppliers')}
          </Link>
        ) : (
          <span className="inbox-private">
            <LockKeyhole size={14} />
            {tr('Private conversations')}
          </span>
        )}
      </header>
      <section
        className={`inbox-shell ${thread ? 'has-thread' : ''}`}
        aria-label={tr('Business inbox')}
      >
        <aside className="inbox-list">
          <div className="inbox-list-heading">
            <h2>
              {tr('Your conversations')}
              <span>{threads.data ? number(threads.data.pages[0].total) : '—'}</span>
            </h2>
            <Button
              size="icon"
              variant="ghost"
              aria-label={tr('Refresh conversations')}
              disabled={threads.isFetching}
              onClick={() => threads.refetch()}
            >
              <RefreshCw size={16} />
            </Button>
          </div>
          <label className="inbox-search">
            <Search size={16} />
            <input
              ref={searchInput}
              type="search"
              maxLength={200}
              aria-label={tr('Search conversations')}
              placeholder={tr('Search conversations…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="chat-list-tabs">
            <button aria-pressed={!unread} onClick={() => setUnread(false)}>
              {tr('All conversations')}
            </button>
            <button aria-pressed={unread} onClick={() => setUnread(true)}>
              {tr('Unread messages')}
            </button>
          </div>
          <div className="inbox-threads">
            <Notice error={threads.error} />
            {threads.isPending ? (
              <div
                className="inbox-skeleton"
                role="status"
                aria-label={tr('Loading conversations…')}
              >
                {[0, 1, 2].map((i) => (
                  <div key={i} />
                ))}
              </div>
            ) : threads.isError ? (
              <div className="inbox-list-empty">
                <p>{tr('Conversations could not be loaded.')}</p>
                <Button variant="outline" onClick={() => threads.refetch()}>
                  {tr('Try again')}
                </Button>
              </div>
            ) : rows.length ? (
              rows.map((t) => {
                const name = threadName(t, session!.user.id, locale);
                return (
                  <button
                    key={t.id}
                    className={`inbox-thread ${thread === t.id ? 'is-selected' : ''}`}
                    data-unread={t.unread_count > 0 || undefined}
                    ref={(element) => {
                      if (element) threadButtons.current.set(t.id, element);
                      else threadButtons.current.delete(t.id);
                    }}
                    aria-pressed={thread === t.id}
                    onClick={() =>
                      setParams((p) => {
                        p.set('thread', t.id);
                        return p;
                      })
                    }
                  >
                    <span className="inbox-avatar">{name.slice(0, 2).toUpperCase()}</span>
                    <span className="inbox-thread-copy">
                      <span className="inbox-thread-title">
                        <strong>{name}</strong>
                        <time dateTime={t.latest?.created_at ?? t.created_at}>
                          {new Date(t.latest?.created_at ?? t.created_at).toLocaleDateString(
                            locale === 'bn' ? 'bn-BD' : 'en-BD',
                            { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' },
                          )}
                        </time>
                      </span>
                      <span className="inbox-thread-preview">
                        {t.latest
                          ? `${t.latest.sender_id === session!.user.id ? tr('You') + ': ' : ''}${t.latest.body}`
                          : tr('Start the conversation')}
                      </span>
                      <span className="inbox-thread-type">
                        {buyer && t.verified && <ShieldCheck size={13} aria-hidden="true" />}
                        {tr(
                          buyer && t.verified
                            ? 'Verified supplier'
                            : session!.user.id === t.buyer_id
                              ? 'Supplier conversation'
                              : 'Buyer inquiry',
                        )}
                        {t.unread_count > 0 && (
                          <span className="chat-unread-badge">
                            {t.unread_count > 99 ? `${number(99)}+` : number(t.unread_count)}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="inbox-list-empty">
                <MessageSquare size={27} />
                <h3>
                  {tr(search || unread ? 'No matching conversations' : 'No conversations yet')}
                </h3>
                <p>
                  {tr(
                    role === 'supplier'
                      ? 'Buyer inquiries will appear here.'
                      : 'Start a conversation from a product page.',
                  )}
                </p>
                {buyer && (
                  <Link className="buyer-inbox-browse" to="/products">
                    {tr('Browse products')}
                  </Link>
                )}
              </div>
            )}
            {threads.hasNextPage && (
              <Button
                className="chat-load-older"
                variant="outline"
                disabled={threads.isFetchingNextPage}
                onClick={() => threads.fetchNextPage()}
              >
                {tr('Load more conversations')}
              </Button>
            )}
          </div>
          <footer className="inbox-list-footer">
            <ShieldCheck size={15} />
            {tr('Participants and the super admin can access messages.')}
          </footer>
        </aside>
        <div className="inbox-chat">
          {thread ? (
            <ChatPanel key={thread} id={thread} back={back} workspace />
          ) : (
            <div className="inbox-welcome">
              <MessagesSquare size={42} />
              <span className="inbox-eyebrow">{tr('YOUR BUSINESS, CONNECTED')}</span>
              <h2>{tr('Good business starts with a conversation.')}</h2>
              <p>
                {tr('Choose a conversation to discuss quantities, pricing, and delivery terms.')}
              </p>
              <div className="inbox-welcome-note">
                <LockKeyhole size={14} />
                {tr(
                  'Participants and the platform super admin may access this conversation for marketplace oversight.',
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
