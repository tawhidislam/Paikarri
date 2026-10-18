import type { ChatImageDraft } from '@/lib/chat-images';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, X, Minus, Maximize2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { db } from '@/lib/supabase';
import { chatUnread, startChat, type ChatProduct } from '@/lib/chat';
import { Notice, State } from './shared';
import { Button } from './ui/button';
import { randomUUID } from '@/lib/utils';
import './marketplace-chat.css';
const ChatPanel = lazy(() => import('./chat-panel'));
export type ChatDraft = {
  body: string;
  product: ChatProduct | null;
  nonce: string;
  image?: ChatImageDraft;
};
type Context = {
  start: (business: string, product?: string) => void;
  starting: boolean;
  connection: string;
  drafts: Map<string, ChatDraft>;
};
const ChatContext = createContext<Context | null>(null);
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('Chat provider missing');
  return value;
}
export function MarketplaceChatProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return <ChatSession key={session?.user.id ?? 'guest'}>{children}</ChatSession>;
}
function ChatSession({ children }: { children: ReactNode }) {
  const { session, role } = useAuth();
  const tr = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const drafts = useRef(new Map<string, ChatDraft>()).current;
  const [active, setActive] = useState<{
    id: string;
    product: ChatProduct | null;
    openKey: string;
  } | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [connection, setConnection] = useState('Connecting');
  const intent = useRef('');
  const opener = useRef<HTMLElement | null>(null);
  const close = () => {
    setActive(null);
    if (opener.current?.isConnected) opener.current.focus();
  };
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['chat-list'] });
    void cache.invalidateQueries({ queryKey: ['chat-thread'] });
    void cache.invalidateQueries({ queryKey: ['chat-unread'] });
    void cache.invalidateQueries({ queryKey: ['chat-new'] });
  };
  const start = useMutation({
    mutationFn: ({ business, product }: { business: string; product?: string }) =>
      startChat(business, product),
    onSuccess: (result) => {
      const previous = drafts.get(result.thread.id);
      drafts.set(result.thread.id, {
        body: previous?.body ?? '',
        product: result.product,
        nonce:
          previous && previous.product?.id === result.product?.id ? previous.nonce : randomUUID(),
      });
      setActive({ id: result.thread.id, product: result.product, openKey: randomUUID() });
      setMinimized(false);
      refresh();
    },
  });
  const begin = (business: string, product?: string) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!session) {
      const target = product ? `/products/${product}` : `/suppliers/${business}`;
      const query = new URLSearchParams({
        chat: business,
        ...(product ? { chat_product: product } : {}),
      });
      navigate(`/auth/login?next=${encodeURIComponent(`${target}?${query}`)}`);
      return;
    }
    if (role !== 'buyer') return;
    start.mutate({ business, product });
  };
  const mutate = start.mutate;
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const business = p.get('chat');
    if (!business || !session || role !== 'buyer') return;
    const key = `${business}:${p.get('chat_product') ?? ''}`;
    if (intent.current === key) return;
    intent.current = key;
    mutate({ business, product: p.get('chat_product') ?? undefined });
    p.delete('chat');
    p.delete('chat_product');
    navigate(location.pathname + (p.size ? `?${p}` : ''), { replace: true });
  }, [location.pathname, location.search, mutate, navigate, role, session]);
  useEffect(() => {
    if (!session || !['buyer', 'supplier'].includes(role ?? '')) return;
    const channel = db()
      .channel(`marketplace-chat:${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void cache.invalidateQueries({ queryKey: ['chat-list'] });
        void cache.invalidateQueries({ queryKey: ['chat-thread'] });
        void cache.invalidateQueries({ queryKey: ['chat-unread'] });
        void cache.invalidateQueries({ queryKey: ['chat-new'] });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_read_states' },
        () => {
          void cache.invalidateQueries({ queryKey: ['chat-thread'] });
          void cache.invalidateQueries({ queryKey: ['chat-list'] });
          void cache.invalidateQueries({ queryKey: ['chat-unread'] });
        },
      )
      .subscribe((status) =>
        setConnection(
          status === 'SUBSCRIBED'
            ? 'Live updates'
            : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'
              ? 'Refreshing periodically'
              : 'Connecting',
        ),
      );
    return () => {
      void db().removeChannel(channel);
    };
  }, [cache, role, session]);
  const visible =
    active &&
    ['buyer', 'supplier'].includes(role ?? '') &&
    !location.pathname.startsWith('/admin') &&
    !location.pathname.startsWith('/dashboard/messages');
  return (
    <ChatContext.Provider value={{ start: begin, starting: start.isPending, connection, drafts }}>
      {children}
      {start.error && (
        <div className="chat-start-error">
          <Notice error={start.error} />
          <Button
            variant="ghost"
            aria-label={tr('Close chat notice')}
            onClick={() => start.reset()}
          >
            <X size={18} />
          </Button>
        </div>
      )}
      {!active &&
        session &&
        ['buyer', 'supplier'].includes(role ?? '') &&
        !location.pathname.startsWith('/dashboard/messages') &&
        !location.pathname.startsWith('/admin') && (
          <Link className="chat-launcher" to="/dashboard/messages" aria-label={tr('Open messages')}>
            <MessageSquare size={22} />
            <span>{tr('Messages')}</span>
            <ChatUnreadBadge />
          </Link>
        )}
      {visible && (
        <section
          className={`market-chat-window ${minimized ? 'is-minimized' : ''}`}
          role="region"
          aria-label={tr('Supplier chat')}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="market-chat-bar">
            <button onClick={() => setMinimized(!minimized)}>
              <MessageSquare size={17} />
              {tr('Supplier chat')}
            </button>
            <div>
              <Button size="icon" variant="ghost" asChild>
                <Link
                  to={`/dashboard/messages?thread=${active.id}`}
                  aria-label={tr('Open full inbox')}
                  onClick={() => setActive(null)}
                >
                  <Maximize2 size={16} />
                </Link>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={tr('Minimize chat')}
                onClick={() => setMinimized(!minimized)}
              >
                <Minus size={18} />
              </Button>
              <Button size="icon" variant="ghost" aria-label={tr('Close chat')} onClick={close}>
                <X size={18} />
              </Button>
            </div>
          </div>
          {!minimized && (
            <div className="inbox-page market-chat-body">
              <Suspense fallback={<State title={tr('Loading messages…')} />}>
                <ChatPanel key={active.openKey} id={active.id} initialProduct={active.product} />
              </Suspense>
            </div>
          )}
        </section>
      )}
    </ChatContext.Provider>
  );
}
export function ChatButton({
  business,
  product,
  compact = false,
  iconOnly = false,
}: {
  business: string;
  product?: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const { role, loading } = useAuth();
  const tr = useT();
  const chat = useChat();
  if (role === 'admin' || role === 'super_admin') return null;
  return (
    <Button
      className={`market-chat-button ${iconOnly ? 'is-icon-only' : ''}`}
      type="button"
      variant="outline"
      size={iconOnly ? 'icon' : compact ? 'sm' : 'default'}
      disabled={loading || chat.starting || role === 'supplier'}
      title={role === 'supplier' ? tr('Available to buyer accounts') : tr('Chat now')}
      onClick={() => chat.start(business, product)}
    >
      <MessageSquare size={16} />
      <span className={iconOnly ? 'sr-only' : undefined}>{tr('Chat now')}</span>
    </Button>
  );
}
export function ChatUnreadBadge() {
  const { session, role } = useAuth();
  const tr = useT();
  const query = useQuery({
    queryKey: ['chat-unread', session?.user.id],
    enabled: !!session && ['buyer', 'supplier'].includes(role ?? ''),
    queryFn: chatUnread,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  return query.data ? (
    <span className="chat-unread-badge" aria-label={`${query.data} ${tr('Unread messages')}`}>
      {query.data > 99 ? '99+' : query.data}
    </span>
  ) : null;
}
export function ChatNavigationLink() {
  const { session, role } = useAuth();
  const tr = useT();
  if (!session || !['buyer', 'supplier'].includes(role ?? '')) return null;
  return (
    <Link
      className="chat-navigation-link"
      to="/dashboard/messages"
      aria-label={tr('Messages')}
      title={tr('Messages')}
    >
      <MessageSquare size={20} />
      <ChatUnreadBadge />
    </Link>
  );
}
