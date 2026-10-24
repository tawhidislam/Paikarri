import { afterEach, describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupplierConversationSync } from '../src/mobile/chat-sync';
import { SupplierApiClient } from '../src/mobile/supplier-client';
const uid = '10000000-0000-4000-8000-000000000001',
  cid = '20000000-0000-4000-8000-000000000001';
const message = (n: number) => ({
  id: `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  conversation_id: cid,
  sender_id: uid,
  body: `Synthetic ${n}`,
  created_at: `2026-10-24T00:00:0${n}Z`,
});
const cursor = (n: number) => ({ id: message(n).id, created_at: message(n).created_at });
function fixture(pages: unknown[]) {
  let authChanged: ((event: string, session: { user: { id: string } } | null) => void) | undefined;
  const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
  const auth = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: uid } } } })),
      onAuthStateChange: vi.fn((callback) => {
        authChanged = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => {}),
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () =>
      Response.json({
        data: pages.shift() ?? { rows: [], has_more: false, oldest: null, newest: null },
        meta: { request_id: cid },
      }),
    );
  const api = new SupplierApiClient({
    baseUrl: 'https://example.invalid/v1',
    getAccessToken: async () => 'synthetic',
    fetch: fetcher,
  });
  const onMessages = vi.fn(),
    onError = vi.fn();
  const sync = new SupplierConversationSync(auth as unknown as SupabaseClient, api, {
    userId: uid,
    conversationId: cid,
    onMessages,
    onReadStateChange: vi.fn(),
    onError,
  });
  return {
    sync,
    auth,
    fetcher,
    onMessages,
    onError,
    logout: () => authChanged?.('SIGNED_OUT', null),
  };
}
afterEach(() => vi.useRealTimers());
describe('native chat reconciliation', () => {
  it('loads the latest page then drains missed forward pages on reconnect', async () => {
    vi.useFakeTimers();
    const f = fixture([
      { rows: [message(1)], has_more: true, oldest: cursor(1), newest: cursor(1) },
      { rows: [message(2)], has_more: true, oldest: cursor(2), newest: cursor(2) },
      { rows: [message(3)], has_more: false, oldest: cursor(3), newest: cursor(3) },
    ]);
    await f.sync.start();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    await f.sync.reconcile();
    expect(f.fetcher).toHaveBeenCalledTimes(3);
    const after = new URL(String(f.fetcher.mock.calls[2][0])).searchParams.get('after');
    expect(JSON.parse(after!)).toEqual(cursor(2));
    expect(f.onMessages.mock.calls.map(([messages]) => messages[0].body)).toEqual([
      'Synthetic 1',
      'Synthetic 2',
      'Synthetic 3',
    ]);
    await f.sync.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('pauses background polling and stops subscriptions on sign-out', async () => {
    vi.useFakeTimers();
    const f = fixture([]);
    await f.sync.start();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    f.sync.setForeground(false);
    await vi.advanceTimersByTimeAsync(20000);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    f.sync.setForeground(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    f.logout();
    await vi.advanceTimersByTimeAsync(20000);
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(f.auth.removeChannel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('refuses to start a session belonging to another account', async () => {
    const f = fixture([]);
    f.auth.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: cid } } } });
    await expect(f.sync.start()).rejects.toThrow('Sign in to this account first');
    expect(f.fetcher).not.toHaveBeenCalled();
  });
});
