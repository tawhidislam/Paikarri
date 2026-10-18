import { describe, it, expect } from 'vitest';
import { compareChat, mergeChat, chatProductSchema, type ChatMessage } from '../src/lib/chat';
const message = (n: number, time = '2026-10-17T03:00:00.123456Z'): ChatMessage => ({
  id: `65000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  conversation_id: '63000000-0000-4000-8000-000000000001',
  sender_id: '190b6f2a-5dd6-44f3-ae10-3a9a567d7fb5',
  body: 'Synthetic',
  created_at: time,
});
describe('marketplace chat cursors and product privacy', () => {
  it('keeps equal-timestamp pages in UUID order without duplicate messages', () => {
    expect(mergeChat([message(2), message(3)], [message(1), message(2)]).map((m) => m.id)).toEqual([
      message(1).id,
      message(2).id,
      message(3).id,
    ]);
  });
  it('uses PostgreSQL microseconds and equivalent timezones for read receipts', () => {
    expect(
      compareChat(
        message(2, '2026-10-17T03:00:00.123001Z'),
        message(1, '2026-10-17T09:00:00.123002+06:00'),
      ),
    ).toBeLessThan(0);
  });
  it('only retains public product fields in shared context', () => {
    const parsed = chatProductSchema.parse({
      id: message(1).id,
      name: 'Synthetic',
      name_bn: '',
      price: 185,
      moq: 100,
      unit: 'piece',
      document_number: 'PRIVATE',
      account_number: 'PRIVATE',
    });
    expect(parsed).not.toHaveProperty('document_number');
    expect(parsed).not.toHaveProperty('account_number');
  });
});
