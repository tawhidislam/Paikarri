// Server-only contracts. No adapter may infer successful collection from a browser callback.
export type ProviderCapability = 'courier' | 'sms' | 'web_push' | 'mfs' | 'escrow' | 'milestones';
export type ProviderResult<T> = { ok: true; externalId: string; value: T } | { ok: false; code: 'NOT_CONFIGURED' | 'RETRYABLE' | 'REJECTED'; retryable: boolean };
export type Booking = { orderId: string; expectedVersion: number; idempotencyKey: string; weightKg: number };
export interface CourierAdapter {
  book(booking: Booking): Promise<ProviderResult<{ trackingNumber: string; labelUrl: string }>>;
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<{ eventId: string; trackingNumber: string; state: 'in_transit' | 'delivered' | 'returned' } | null>;
}
export interface PaymentAdapter {
  initiate(input: { orderId: string; expectedVersion: number; idempotencyKey: string }): Promise<ProviderResult<{ redirectUrl: string }>>;
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<{ eventId: string; externalId: string; amountMinor: number; currency: 'BDT'; state: 'paid' | 'failed' | 'refunded' } | null>;
}
export interface NotificationAdapter {
  deliver(input: { notificationId: string; recipientId: string; idempotencyKey: string }): Promise<ProviderResult<{ delivered: boolean }>>;
}
// Hard-disabled until merchant contracts, sandbox verification, and transactional
// event-deduplication adapters are implemented. Setting a secret cannot activate it.
export function providerStatus(_capability: ProviderCapability): ProviderResult<never> {
  return { ok: false, code: 'NOT_CONFIGURED', retryable: false };
}
