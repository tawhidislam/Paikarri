import { useT } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, LockKeyhole } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { messageSchema } from '@/lib/validation';
import { State, SectionTitle, Notice, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
export default function Messages() {
  const tr = useT();
  const { session, role } = useAuth();
  const [params, setParams] = useSearchParams();
  const thread = params.get('thread');
  const cache = useQueryClient();
  const [body, setBody] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('Connecting');
  const end = useRef<HTMLDivElement>(null);
  useTitle('Messages');
  const threads = useQuery({
    queryKey: ['conversations', session!.user.id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const b = await db().from('businesses').select('id,name');
      if (b.error) throw b.error;
      return data.map((t) => ({ ...t, business: b.data.find((b) => b.id === t.business_id) }));
    },
  });
  const selected = threads.data?.find((t) => t.id === thread);
  const messages = useQuery({
    queryKey: ['messages', session!.user.id, thread],
    enabled: !!selected,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await db()
        .from('messages')
        .select('*')
        .eq('conversation_id', thread!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data.reverse();
    },
  });
  useEffect(() => {
    if (!selected) return;
    const client = db();
    const channel = client
      .channel(`conversation:${selected.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selected.id}`,
        },
        () => {
          void cache.invalidateQueries({ queryKey: ['messages', session!.user.id, selected.id] });
        },
      )
      .subscribe((status) =>
        setRealtimeStatus(
          status === 'SUBSCRIBED'
            ? 'Live'
            : status === 'CHANNEL_ERROR'
              ? 'Reconnecting'
              : 'Connecting',
        ),
      );
    return () => {
      void client.removeChannel(channel);
    };
  }, [selected?.id, cache, session?.user.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.data?.length]);
  const send = useMutation({
    mutationFn: async () => {
      const text = messageSchema.parse(body);
      const { error } = await db()
        .from('messages')
        .insert({ conversation_id: thread!, sender_id: session!.user.id, body: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody('');
      return cache.invalidateQueries({ queryKey: ['messages', session!.user.id, thread] });
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Good business starts with a conversation.')}
        description={tr('Connect directly. Ask questions. Work out the details.')}
      />
      <Notice error={threads.error} />
      <div className="messaging-layout">
        <aside className="thread-list">
          <h3>
            <MessageSquare size={17} />
            {tr('Your conversations')}
          </h3>
          {threads.isLoading ? (
            <p>{tr('Loading…')}</p>
          ) : threads.data?.length ? (
            threads.data.map((t) => (
              <button
                className={thread === t.id ? 'active' : ''}
                key={t.id}
                onClick={() => setParams({ thread: t.id })}
              >
                <span className="thread-avatar">{t.business?.name.slice(0, 1) ?? 'B'}</span>
                <span>
                  <strong>{t.business?.name ?? tr('SUPPLIER')}</strong>
                  <small>
                    {role === 'supplier'
                      ? `${tr('buyer')} ${t.buyer_id.slice(0, 8)}`
                      : tr('Supplier conversation')}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p>{tr('No conversations yet. Start one from a product page.')}</p>
          )}
        </aside>
        <div className="message-panel">
          {selected ? (
            <>
              <header>
                <strong>{selected.business?.name ?? tr('Conversation')}</strong>
                <span>
                  <i />
                  {tr(realtimeStatus)}
                </span>
              </header>
              <div className="message-history">
                {messages.isLoading ? (
                  <State title={tr('Loading messages…')} />
                ) : messages.data?.length ? (
                  messages.data.map((m) => (
                    <div
                      key={m.id}
                      className={`message ${m.sender_id === session!.user.id ? 'own' : ''}`}
                    >
                      <p>{m.body}</p>
                      <small>
                        {new Date(m.created_at).toLocaleString('en-BD', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </small>
                    </div>
                  ))
                ) : (
                  <div className="conversation-start">
                    <LockKeyhole size={24} />
                    <p>{tr('Only you and the other participant can read this conversation.')}</p>
                    <small>
                      {tr('Confirm specifications, quantities, and delivery terms here.')}
                    </small>
                  </div>
                )}
                <div ref={end} />
              </div>
              <Notice error={messages.error ?? send.error} />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send.mutate();
                }}
              >
                <input
                  aria-label={tr('Message')}
                  placeholder={tr('Write your message…')}
                  maxLength={4000}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label={tr('Send message')}
                  disabled={send.isPending || !body.trim()}
                >
                  <Send size={17} />
                </Button>
              </form>
            </>
          ) : (
            <State
              title={tr('Choose a conversation')}
              description={tr(
                thread
                  ? 'You do not have access to this conversation, or it no longer exists.'
                  : 'Your business connections live here.',
              )}
            />
          )}
        </div>
      </div>
    </>
  );
}
