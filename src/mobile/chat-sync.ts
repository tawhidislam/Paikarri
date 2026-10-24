import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type {
  ChatCursor,
  ChatMessage,
} from '../../supabase/functions/_shared/supplier-api/chat-schema';
import { SupplierApiClient } from './supplier-client';

/** Native adapters call setForeground from their application lifecycle listener. */
export class SupplierConversationSync {
  private channel?: RealtimeChannel;
  private timer?: ReturnType<typeof setInterval>;
  private controller?: AbortController;
  private unsubscribeAuth?: () => void;
  private newest?: ChatCursor;
  private active = false;
  private foreground = true;
  private running = false;
  private pending = false;
  constructor(
    private readonly auth: SupabaseClient,
    private readonly api: SupplierApiClient,
    private readonly options: {
      userId: string;
      conversationId: string;
      onMessages: (messages: ChatMessage[]) => void;
      onReadStateChange: () => void;
      onError: (error: unknown) => void;
    },
  ) {}
  async start() {
    if (this.active) return;
    const { data } = await this.auth.auth.getSession();
    if (data.session?.user.id !== this.options.userId)
      throw new Error('Sign in to this account first.');
    this.active = true;
    this.newest = undefined;
    const { data: subscription } = this.auth.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== this.options.userId) void this.stop();
    });
    this.unsubscribeAuth = () => subscription.subscription.unsubscribe();
    this.channel = this.auth
      .channel(`supplier-conversation-${this.options.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${this.options.conversationId}`,
        },
        () => void this.reconcile(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_read_states',
          filter: `conversation_id=eq.${this.options.conversationId}`,
        },
        () => {
          if (this.active && this.foreground) this.options.onReadStateChange();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void this.reconcile();
      });
    this.startPolling();
    await this.reconcile();
  }
  private startPolling() {
    if (this.timer) clearInterval(this.timer);
    if (this.active && this.foreground) this.timer = setInterval(() => void this.reconcile(), 5000);
  }
  setForeground(value: boolean) {
    this.foreground = value;
    this.startPolling();
    if (value && this.active) {
      this.options.onReadStateChange();
      void this.reconcile();
    }
  }
  async reconcile() {
    if (!this.active || !this.foreground) return;
    if (this.running) {
      this.pending = true;
      return;
    }
    this.running = true;
    this.controller = new AbortController();
    try {
      let more = false;
      do {
        const after = this.newest;
        const response = await this.api.request('messages', {
          params: { id: this.options.conversationId },
          query: after ? { after: JSON.stringify(after) } : {},
          signal: this.controller.signal,
        });
        if (!this.active || !this.foreground) return;
        const page = response.data;
        if (page.rows.length) this.options.onMessages(page.rows);
        if (page.newest) this.newest = page.newest;
        // The initial page's has_more describes older history, not missed newer messages.
        more = !!after && page.has_more && page.rows.length > 0;
      } while (more && this.active && this.foreground);
    } catch (error) {
      if (this.active && !this.controller.signal.aborted) this.options.onError(error);
    } finally {
      this.running = false;
      if (this.pending) {
        this.pending = false;
        void this.reconcile();
      }
    }
  }
  async stop() {
    this.active = false;
    this.pending = false;
    this.controller?.abort();
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = undefined;
    if (this.channel) await this.auth.removeChannel(this.channel);
    this.channel = undefined;
    this.newest = undefined;
  }
}
