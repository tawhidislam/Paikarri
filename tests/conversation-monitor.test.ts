import { describe, it, expect } from 'vitest';
import {
  mergeMonitorMessages,
  monitorCursorSchema,
  monitorRowSchema,
  type MonitorMessage,
} from '../src/lib/conversation-monitor';
const message = (n: number, time = '2026-10-17T03:00:00Z'): MonitorMessage => ({
  id: `c5000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  conversation_id: 'c4000000-0000-4000-8000-000000000001',
  sender_id: 'c1000000-0000-4000-8000-000000000004',
  body: `Synthetic ${n}`,
  created_at: time,
});
describe('read-only monitor pagination', () => {
  it('merges older and newer pages by timestamp and UUID with no duplicates', () => {
    const current = [message(3), message(4)];
    const merged = mergeMonitorMessages(current, [message(1), message(2), message(3)]);
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3, 4].map((n) => message(n).id));
    expect(current).toEqual([message(3), message(4)]);
  });
  it('compares equivalent timestamps by instant rather than textual timezone', () => {
    expect(
      mergeMonitorMessages([message(2, '2026-10-17T09:00:00+06:00')], [message(1)]).map(
        (m) => m.id,
      ),
    ).toEqual([message(1).id, message(2).id]);
  });
  it('preserves PostgreSQL microsecond order within one millisecond', () => {
    const earlier = message(2, '2026-10-17T03:00:00.123001Z');
    const later = message(1, '2026-10-17T03:00:00.123002Z');
    expect(mergeMonitorMessages([later], [earlier]).map((m) => m.id)).toEqual([
      earlier.id,
      later.id,
    ]);
  });
  it('validates cursor UUIDs and strips message bodies from list summaries', () => {
    expect(
      monitorCursorSchema.safeParse({ created_at: '2026-10-17T03:00:00Z', id: 'not-a-uuid' })
        .success,
    ).toBe(false);
    const row = monitorRowSchema.parse({
      id: message(1).conversation_id,
      business_id: message(1).conversation_id,
      supplier_id: message(1).sender_id,
      supplier_name: 'Synthetic',
      supplier_status: 'suspended',
      customer_id: message(1).sender_id,
      customer_name: 'Synthetic customer',
      customer_email: null,
      created_at: '2026-10-17T03:00:00Z',
      last_activity: '2026-10-17T03:00:00Z',
      message_count: 0,
      body: 'Private contents',
    });
    expect(row).not.toHaveProperty('body');
  });
});
