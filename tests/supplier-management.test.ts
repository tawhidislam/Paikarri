import { describe, it, expect } from 'vitest';
import {
  dhakaToday,
  labelsSchema,
  warningInput,
  noteInput,
  dateOnly,
  correctionDays,
} from '../src/lib/supplier-management';
describe('supplier management boundaries', () => {
  it('uses Bangladesh midnight for due dates regardless of browser timezone', () => {
    expect(dhakaToday(new Date('2026-10-17T17:59:59Z'))).toBe('2026-10-17');
    expect(dhakaToday(new Date('2026-10-17T18:00:00Z'))).toBe('2026-10-18');
    expect(dateOnly('2026-10-18')).toContain('18');
  });
  it('counts correction days across Bangladesh midnight without partial-day rounding', () => {
    expect(correctionDays('2026-10-18', new Date('2026-10-17T17:59:59Z'))).toBe(1);
    expect(correctionDays('2026-10-18', new Date('2026-10-17T18:00:00Z'))).toBe(0);
    expect(correctionDays('2026-10-18', new Date('2026-10-18T18:00:00Z'))).toBe(-1);
  });
  it('rejects invalid dates, unrecognized severity, and missing corrective action', () => {
    const valid = {
      title: 'Correct product',
      message: 'Correct product details please',
      corrective_action: 'Update all product specifications',
      severity: 'warning',
      due_on: '2026-10-18',
    };
    expect(warningInput.safeParse(valid).success).toBe(true);
    for (const patch of [
      { due_on: '2026-02-30' },
      { severity: 'suspend' },
      { corrective_action: '' },
      { message: 'tiny' },
    ])
      expect(warningInput.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it('limits private notes and labels before sending', () => {
    expect(labelsSchema.parse([' Priority '])).toEqual(['Priority']);
    expect(labelsSchema.safeParse(Array(11).fill('Priority')).success).toBe(false);
    expect(labelsSchema.safeParse(['x']).success).toBe(false);
    expect(noteInput.safeParse('    ').success).toBe(false);
    expect(noteInput.safeParse('x'.repeat(3001)).success).toBe(false);
  });

  it('validates verified badge inputs, reasons, and calculated validity dates', async () => {
    const { verifiedBadgeInputSchema, addDaysToDate, verificationMethods } = await import(
      '../src/lib/supplier-management'
    );
    const { storefrontCopy } = await import('../src/lib/storefront-copy');

    // Date addition calculations
    expect(addDaysToDate(365, '2026-10-19')).toBe('2027-10-19');
    expect(addDaysToDate(180, '2026-10-19')).toBe('2027-04-17');
    expect(addDaysToDate(1, '2026-10-19')).toBe('2026-10-20');

    // Valid grant input
    const validGrant = {
      grant: true,
      reason: 'On-site factory inspection completed and trade license verified.',
      method: 'factory_audit',
      valid_until: '2027-10-19',
    };
    expect(verifiedBadgeInputSchema.safeParse(validGrant).success).toBe(true);

    // Valid revoke input
    const validRevoke = {
      grant: false,
      reason: 'Dispute investigation pending and trade license renewal overdue.',
    };
    expect(verifiedBadgeInputSchema.safeParse(validRevoke).success).toBe(true);

    // Rejects too-short reason (< 5 characters)
    expect(verifiedBadgeInputSchema.safeParse({ ...validGrant, reason: 'ok' }).success).toBe(false);

    // Rejects invalid date format
    expect(
      verifiedBadgeInputSchema.safeParse({ ...validGrant, valid_until: '2026-99-99' }).success,
    ).toBe(false);

    // Verification methods count
    expect(verificationMethods.length).toBeGreaterThanOrEqual(4);

    // Translation checks
    expect(storefrontCopy['Grant verified badge']).toBe('ভেরিফায়েড ব্যাজ প্রদান করুন');
    expect(storefrontCopy['Revoke verified badge']).toBe('ভেরিফায়েড ব্যাজ প্রত্যাহার করুন');
    expect(storefrontCopy['Official Verified Supplier']).toBe('অফিসিয়াল ভেরিফায়েড সরবরাহকারী');
    expect(storefrontCopy['Verified only']).toBe('শুধুমাত্র ভেরিফায়েড');
    expect(storefrontCopy['Unverified only']).toBe('শুধুমাত্র আনভেরিফায়েড');
  });
});
