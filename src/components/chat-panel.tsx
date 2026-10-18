import { ChatImage } from './chat-image';
import { uploadChatImage, discardChatImage } from '@/lib/chat-images';
import { sendChatImage } from '@/lib/chat';
import { ImagePlus } from 'lucide-react';
import { BuyerOrganizationSummary } from './growth/organization';
import { useEffect, useLayoutEffect, useRef, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  Send,
  ArrowLeft,
  ArrowDown,
  ShieldCheck,
  LockKeyhole,
  X,
  Package,
  CheckCheck,
  MessageSquare,
} from 'lucide-react';
import {
  chatMessages,
  chatThread,
  sendChat,
  markChatRead,
  mergeChat,
  compareChat,
  threadName,
  type ChatCursor,
  type ChatProduct,
} from '@/lib/chat';
import { useChat, type ChatDraft } from './marketplace-chat';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { money, randomUUID } from '@/lib/utils';
import { formatQuantity } from '@/lib/units';
import { Notice, State } from './shared';
import { Button } from './ui/button';
import '@/pages/messages.css';
export function SharedProduct({ product }: { product: ChatProduct }) {
  const { locale } = useLocale();
  const tr = useT();
  return (
    <Link className="chat-product-card" to={`/products/${product.id}`}>
      <Package size={25} />
      <span>
        <strong>{locale === 'bn' && product.name_bn ? product.name_bn : product.name}</strong>
        <small>
          {money(product.price, locale)} · {tr('Minimum order')}:{' '}
          {formatQuantity(product.moq, product.unit, locale)}
        </small>
      </span>
    </Link>
  );
}
export default function ChatPanel({
  id,
  initialProduct = null,
  back,
  workspace = false,
}: {
  id: string;
  initialProduct?: ChatProduct | null;
  back?: () => void;
  workspace?: boolean;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const { session, role } = useAuth();
  const { drafts, connection } = useChat();
  const cache = useQueryClient();
  const key = ['chat-history', session!.user.id, id];
  const [draft, setDraft] = useState<ChatDraft>(
    () => drafts.get(id) ?? { body: '', product: initialProduct, nonce: randomUUID() },
  );
  const [attaching, setAttaching] = useState(false);
  const [imageError, setImageError] = useState<unknown>();
  const [preview, setPreview] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!draft.image) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(draft.image.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.image]);
  const [visible, setVisible] = useState(!document.hidden);
  const [scrolledAway, setScrolledAway] = useState(false);
  const history = useRef<HTMLDivElement>(null),
    stick = useRef(true),
    anchor = useRef<{ height: number; top: number } | null>(null),
    input = useRef<HTMLTextAreaElement>(null),
    lastRead = useRef('');
  const detail = useQuery({
    queryKey: ['chat-thread', session!.user.id, id],
    queryFn: () => chatThread(id),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  useLayoutEffect(() => {
    if (!workspace || !input.current) return;
    input.current.style.height = 'auto';
    input.current.style.height = `${Math.max(46, Math.min(120, input.current.scrollHeight))}px`;
  }, [workspace, draft.body, detail.data?.id]);
  useEffect(() => {
    if (detail.data && !back) input.current?.focus({ preventScroll: true });
  }, [detail.data?.id, back]);
  const messages = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => chatMessages(id, pageParam ?? undefined),
    initialPageParam: null as ChatCursor | null,
    getNextPageParam: (last) => (last.has_more ? last.oldest : undefined),
    enabled: !!detail.data,
    retry: 1,
  });
  const rows = mergeChat([], messages.data?.pages.flatMap((p) => p.rows) ?? []);
  const newest = rows.at(-1);
  const name = detail.data
    ? threadName(detail.data, session!.user.id, locale)
    : tr('Supplier conversation');
  const updates = useQuery({
    queryKey: ['chat-new', session!.user.id, id],
    enabled: !!messages.data && visible,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    gcTime: 30000,
    queryFn: async () => {
      let cursor = newest ? { id: newest.id, created_at: newest.created_at } : undefined;
      let incoming: Awaited<ReturnType<typeof chatMessages>> | undefined;
      for (let n = 0; n < 10; n++) {
        incoming = await chatMessages(id, undefined, cursor);
        const batch = incoming;
        cache.setQueryData<
          InfiniteData<Awaited<ReturnType<typeof chatMessages>>, ChatCursor | null>
        >(key, (current) => {
          if (!current) return current;
          const first = current.pages[0],
            merged = mergeChat(first.rows, batch.rows);
          return {
            ...current,
            pages: [
              {
                ...first,
                rows: merged,
                oldest: first.oldest ?? batch.oldest,
                newest: merged.length
                  ? { id: merged.at(-1)!.id, created_at: merged.at(-1)!.created_at }
                  : null,
                has_more: first.has_more || (!cursor && batch.has_more),
              },
              ...current.pages.slice(1),
            ],
          };
        });
        if (!cursor || !batch.has_more || !batch.newest) break;
        cursor = batch.newest;
      }
      return incoming ?? null;
    },
  });
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['chat-list'] });
    void cache.invalidateQueries({ queryKey: ['chat-thread'] });
    void cache.invalidateQueries({ queryKey: ['chat-unread'] });
  };
  const read = useMutation({
    mutationFn: (message: string) => markChatRead(id, message),
    onSuccess: refresh,
    onError: () => {
      lastRead.current = '';
    },
  });
  const mark = read.mutate;
  useEffect(() => {
    const listener = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }, []);
  useEffect(() => {
    const el = history.current;
    if (!el) return;
    if (anchor.current) {
      el.scrollTop = anchor.current.top + el.scrollHeight - anchor.current.height;
      anchor.current = null;
    } else if (stick.current) el.scrollTop = el.scrollHeight;
  }, [rows.length]);
  useEffect(() => {
    if (visible && stick.current && newest && newest.id !== lastRead.current) {
      lastRead.current = newest.id;
      mark(newest.id);
    }
  }, [newest?.id, visible, mark]);
  const update = (body: string, product = draft.product) => {
    const next = { ...draft, body, product, nonce: randomUUID() };
    drafts.set(id, next);
    setDraft(next);
  };
  const send = useMutation({
    mutationFn: (value: ChatDraft) =>
      value.image
        ? sendChatImage(id, value.body, value.nonce, value.image.id, value.product?.id)
        : sendChat(id, value.body, value.nonce, value.product?.id),
    onSuccess: (message, value) => {
      cache.setQueryData<InfiniteData<Awaited<ReturnType<typeof chatMessages>>, ChatCursor | null>>(
        key,
        (current) =>
          current
            ? {
                ...current,
                pages: [
                  {
                    ...current.pages[0],
                    rows: mergeChat(current.pages[0].rows, [message]),
                    newest: { id: message.id, created_at: message.created_at },
                  },
                  ...current.pages.slice(1),
                ],
              }
            : current,
      );
      if (drafts.get(id)?.nonce === value.nonce) {
        const next = { body: '', product: null, nonce: randomUUID() };
        drafts.set(id, next);
        setDraft(next);
      } else if (value.image && drafts.get(id)?.image?.id === value.image.id) {
        const next = { ...drafts.get(id)!, image: undefined, nonce: randomUUID() };
        drafts.set(id, next);
        setDraft(next);
      }
      stick.current = true;
      input.current?.focus();
      refresh();
    },
  });
  const submit = () => {
    if (!send.isPending && !attaching && (draft.body.trim() || draft.image))
      send.mutate({ ...draft });
  };
  const day = (date: string) =>
    new Date(date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-BD', {
      timeZone: 'Asia/Dhaka',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  if (detail.isPending)
    return workspace && back ? (
      <div className="buyer-chat-loading">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft size={18} />
          {tr('Back to conversations')}
        </Button>
        <State title={tr('Loading messages…')} />
      </div>
    ) : (
      <State title={tr('Loading messages…')} />
    );
  if (detail.isError)
    return (
      <div className="inbox-welcome">
        <h2>{tr('Conversation unavailable')}</h2>
        {workspace ? (
          <p>{tr('This conversation could not be opened. Return to your inbox or try again.')}</p>
        ) : (
          <Notice error={detail.error} />
        )}
        <Button variant="outline" onClick={() => detail.refetch()}>
          {tr('Try again')}
        </Button>
        {back && (
          <Button variant="ghost" onClick={back}>
            {tr('Back to conversations')}
          </Button>
        )}
      </div>
    );
  const quickReplies = (
    <div className="chat-quick-replies" aria-label={tr('Suggested messages')}>
      {(session!.user.id === detail.data!.buyer_id
        ? [
            'Please share your wholesale prices.',
            'Is this quantity available?',
            'What are the delivery terms?',
          ]
        : [
            'Thank you for your inquiry.',
            'What quantity do you need?',
            'Please share your delivery location.',
          ]
      ).map((text) => (
        <button
          key={text}
          type="button"
          disabled={workspace && draft.body.length >= 4000}
          title={tr(text)}
          onClick={() => {
            update(
              workspace
                ? `${draft.body}${draft.body ? '\n' : ''}${tr(text)}`.slice(0, 4000)
                : tr(text),
            );
            input.current?.focus();
          }}
        >
          {tr(text)}
        </button>
      ))}
    </div>
  );
  return (
    <>
      <header className="inbox-chat-header">
        {back && (
          <Button
            className="inbox-mobile-back"
            size="icon"
            variant="ghost"
            aria-label={tr('Back to conversations')}
            onClick={back}
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        <span className="inbox-avatar">{name.slice(0, 2).toUpperCase()}</span>
        <div>
          <h2 title={name}>{name}</h2>
          {role === 'supplier' && <BuyerOrganizationSummary buyer={detail.data!.buyer_id} />}
          <p>
            {role === 'supplier' ? (
              <span>{tr('Buyer inquiry')}</span>
            ) : (
              <>
                {detail.data?.verified && <ShieldCheck size={12} />}
                <Link to={`/suppliers/${detail.data!.business_id}`}>{tr('Business profile')}</Link>
              </>
            )}
          </p>
        </div>
        <span className={`inbox-connection ${connection === 'Live updates' ? 'is-live' : ''}`}>
          <i />
          {tr(connection)}
        </span>
      </header>
      {workspace ? (
        <details className="buyer-chat-privacy">
          <summary>
            <ShieldCheck size={14} />
            {tr('Conversation access')}
          </summary>
          <p>
            {tr(
              'Participants and the platform super admin may access this conversation for marketplace oversight.',
            )}
          </p>
        </details>
      ) : (
        <div className="inbox-security">
          <LockKeyhole size={12} />
          {tr(
            'Participants and the platform super admin may access this conversation for marketplace oversight.',
          )}
        </div>
      )}
      <div
        ref={history}
        className="inbox-history"
        role="log"
        aria-label={tr('Conversation messages')}
        aria-live="polite"
        onScroll={(e) => {
          const t = e.currentTarget;
          stick.current = t.scrollHeight - t.scrollTop - t.clientHeight < 80;
          if (workspace) setScrolledAway(!stick.current);
          if (stick.current && visible && newest && lastRead.current !== newest.id) {
            lastRead.current = newest.id;
            mark(newest.id);
          }
        }}
      >
        {messages.isPending ? (
          <State title={tr('Loading messages…')} />
        ) : messages.isError ? (
          <>
            <Notice error={messages.error} />
            <Button onClick={() => messages.refetch()}>{tr('Try again')}</Button>
          </>
        ) : (
          <>
            {messages.hasNextPage && (
              <Button
                className="chat-load-older"
                variant="outline"
                disabled={messages.isFetchingNextPage}
                onClick={() => {
                  if (history.current)
                    anchor.current = {
                      height: history.current.scrollHeight,
                      top: history.current.scrollTop,
                    };
                  void messages.fetchNextPage();
                }}
              >
                {tr(messages.isFetchingNextPage ? 'Loading…' : 'Load older messages')}
              </Button>
            )}
            {rows.length ? (
              rows.map((m, i) => {
                const own = m.sender_id === session!.user.id;
                const readByPeer =
                  own &&
                  detail.data!.peer_read_at &&
                  detail.data!.peer_read_id &&
                  compareChat(m, {
                    created_at: detail.data!.peer_read_at,
                    id: detail.data!.peer_read_id,
                  }) <= 0;
                return (
                  <Fragment key={m.id}>
                    {(!i || day(rows[i - 1].created_at) !== day(m.created_at)) && (
                      <div className="inbox-date-divider">
                        <span>{day(m.created_at)}</span>
                      </div>
                    )}
                    <div className={`inbox-message-row ${own ? 'is-own' : ''}`}>
                      <div className="inbox-bubble">
                        {m.product_snapshot && <SharedProduct product={m.product_snapshot} />}
                        {m.image_id && <ChatImage id={m.image_id} />}
                        {(!m.image_id || m.body !== 'Image') && <p>{m.body}</p>}
                        <time dateTime={m.created_at}>
                          {new Date(m.created_at).toLocaleTimeString(
                            locale === 'bn' ? 'bn-BD' : 'en-BD',
                            { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' },
                          )}
                          {own && (
                            <span className={`chat-receipt ${readByPeer ? 'is-read' : ''}`}>
                              <CheckCheck size={13} />
                              {tr(readByPeer ? 'Read' : 'Sent')}
                            </span>
                          )}
                        </time>
                      </div>
                    </div>
                  </Fragment>
                );
              })
            ) : (
              <div className="inbox-chat-empty">
                <MessageSquarePlaceholder />
                <h3>{tr('Start the conversation')}</h3>
                <p>{tr('Confirm specifications, quantities, and delivery terms here.')}</p>
              </div>
            )}
          </>
        )}
      </div>
      {workspace && scrolledAway && (
        <button
          className="buyer-jump-latest"
          type="button"
          onClick={() => {
            stick.current = true;
            setScrolledAway(false);
            history.current?.scrollTo({ top: history.current.scrollHeight });
          }}
        >
          <ArrowDown size={15} />
          {tr('Latest messages')}
        </button>
      )}
      <div className="inbox-compose">
        <Notice error={updates.error} />
        {updates.error && (
          <Button variant="ghost" onClick={() => updates.refetch()}>
            {tr('Check for new messages')}
          </Button>
        )}
        <Notice error={send.error ?? imageError} />
        {attaching && <p role="status">{tr('Compressing and uploading image…')}</p>}
        {draft.image && (
          <div className="chat-image-draft">
            {preview && <img src={preview} alt={tr('Image preview')} />}
            <span>{Math.ceil(draft.image.file.size / 1024)} KB · WebP</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={tr('Remove image')}
              disabled={attaching || send.isPending}
              onClick={async () => {
                setAttaching(true);
                setImageError(undefined);
                try {
                  await discardChatImage(draft.image!.id);
                  const next = {
                    ...(drafts.get(id) ?? draft),
                    image: undefined,
                    nonce: randomUUID(),
                  };
                  drafts.set(id, next);
                  setDraft(next);
                } catch (error) {
                  setImageError(error);
                } finally {
                  setAttaching(false);
                }
              }}
            >
              <X size={16} />
            </Button>
          </div>
        )}
        <input
          ref={imageInput}
          disabled={attaching || send.isPending || !!draft.image}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={tr('Choose chat image')}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setAttaching(true);
            setImageError(undefined);
            try {
              const image = await uploadChatImage(id, file);
              const next = { ...(drafts.get(id) ?? draft), image, nonce: randomUUID() };
              drafts.set(id, next);
              setDraft(next);
            } catch (error) {
              setImageError(error);
            } finally {
              setAttaching(false);
            }
          }}
        />
        {draft.product && (
          <div className="chat-product-draft">
            <SharedProduct product={draft.product} />
            <Button
              size="icon"
              variant="ghost"
              aria-label={tr('Remove product context')}
              onClick={() => update(draft.body, null)}
            >
              <X size={16} />
            </Button>
          </div>
        )}
        {workspace ? (
          <details className="buyer-chat-prompts">
            <summary>
              <MessageSquare size={14} />
              {tr('Quick replies')}
            </summary>
            {quickReplies}
          </details>
        ) : (
          quickReplies
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Button
            aria-label={tr('Attach image')}
            title={tr('Attach image')}
            className="chat-attach-button"
            type="button"
            variant="ghost"
            disabled={attaching || send.isPending || !!draft.image}
            onClick={() => imageInput.current?.click()}
          >
            <ImagePlus size={18} />
            <span>{tr('Attach image')}</span>
          </Button>
          <textarea
            ref={input}
            aria-label={tr('Message')}
            placeholder={tr('Write your message…')}
            rows={workspace ? 1 : 2}
            maxLength={4000}
            value={draft.body}
            onChange={(e) => update(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                if (
                  workspace &&
                  window.matchMedia(
                    '(max-width: 800px), (max-width: 1000px) and (max-height: 500px)',
                  ).matches
                )
                  return;
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            type="submit"
            aria-label={tr('Send message')}
            disabled={send.isPending || attaching || (!draft.body.trim() && !draft.image)}
          >
            <Send size={17} />
            <span>{tr(send.isPending ? 'Sending…' : 'Send')}</span>
          </Button>
        </form>
        <div className="inbox-compose-footer">
          <span className="chat-desktop-hint">
            {tr('Enter to send · Shift + Enter for a new line')}
          </span>
          {workspace && <span className="buyer-mobile-send-hint">{tr('Tap Send to send')}</span>}
          <span>{draft.body.length}/4000</span>
        </div>
      </div>
      <footer className="inbox-chat-footer">
        <ShieldCheck size={13} />
        {tr('Keep business details in this conversation.')}
      </footer>
    </>
  );
}
function MessageSquarePlaceholder() {
  return <Package size={28} />;
}
