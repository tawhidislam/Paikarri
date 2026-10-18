import { expect, it } from 'vitest';
import {
  providerStatus,
  type ProviderCapability,
} from '../supabase/functions/_shared/provider-contracts';
it('never simulates money movement, messages, or bookings before activation', () => {
  for (const capability of [
    'courier',
    'sms',
    'web_push',
    'mfs',
    'escrow',
    'milestones',
  ] as ProviderCapability[]) {
    expect(providerStatus(capability)).toEqual({
      ok: false,
      code: 'NOT_CONFIGURED',
      retryable: false,
    });
  }
});
