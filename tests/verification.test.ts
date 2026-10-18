import { describe, it, expect } from 'vitest';
import {
  bangladeshDate,
  stepErrors,
  emptyIdentity,
  emptyTrade,
  emptyBank,
  identityDraft,
  decisionSchema,
} from '../src/lib/verification-schema';
const identity = {
  ...emptyIdentity,
  legal_name: 'Synthetic owner',
  dob: '1990-01-01',
  address: 'Synthetic address',
  document_number: '000123',
};
const sections = {
  identity: { status: 'approved' as const, note: '' },
  trade_license: { status: 'approved' as const, note: '' },
  bank: { status: 'approved' as const, note: '' },
};
describe('complete supplier verification', () => {
  it('uses Bangladesh midnight, retaining validity through the expiry date', () => {
    expect(bangladeshDate(new Date('2026-10-17T17:59:59Z'))).toBe('2026-10-17');
    expect(bangladeshDate(new Date('2026-10-17T18:00:00Z'))).toBe('2026-10-18');
    expect(
      stepErrors(
        'identity',
        { ...identity, no_expiry: false, expires_on: '2026-10-17' },
        '2026-10-17',
      ),
    ).toEqual([]);
    expect(
      stepErrors(
        'identity',
        { ...identity, no_expiry: false, expires_on: '2026-10-17' },
        '2026-10-18',
      ),
    ).toContain('expires_on');
  });
  it('supports an undated NID and requires passport and driving licence expiry', () => {
    expect(stepErrors('identity', identity, '2026-10-17')).toEqual([]);
    for (const document_type of ['passport', 'driving_license'] as const) {
      expect(stepErrors('identity', { ...identity, document_type }, '2026-10-17')).toContain(
        'expires_on',
      );
    }
    expect(identityDraft.parse(identity).document_number).toBe('000123');
  });
  it('rejects future birth/issue dates and incomplete trade and bank details', () => {
    expect(
      stepErrors(
        'identity',
        { ...identity, dob: '2099-01-01', issued_on: '2099-01-01' },
        '2026-10-17',
      ),
    ).toEqual(['dob', 'issued_on']);
    expect(stepErrors('trade_license', emptyTrade, '2026-10-17')).toContain('expires_on');
    expect(stepErrors('bank', { ...emptyBank, routing_number: '123' })).toContain('routing_number');
  });
  it('requires all sections and account-holder confirmation for approval', () => {
    expect(
      decisionSchema.safeParse({
        decision: 'approved',
        reason: '',
        holder_match_confirmed: true,
        sections,
      }).success,
    ).toBe(true);
    expect(
      decisionSchema.safeParse({
        decision: 'approved',
        reason: '',
        holder_match_confirmed: false,
        sections,
      }).success,
    ).toBe(false);
    expect(
      decisionSchema.safeParse({
        decision: 'approved',
        reason: '',
        holder_match_confirmed: true,
        sections: { ...sections, bank: { status: 'changes_requested', note: 'Bad proof' } },
      }).success,
    ).toBe(false);
  });
  it('requires correction feedback and permits reasoned revocation independently of section decisions', () => {
    expect(
      decisionSchema.safeParse({
        decision: 'changes_requested',
        reason: '',
        holder_match_confirmed: false,
        sections: { ...sections, bank: { status: 'changes_requested', note: '' } },
      }).success,
    ).toBe(false);
    expect(
      decisionSchema.safeParse({
        decision: 'revoked',
        reason: 'Expired evidence',
        holder_match_confirmed: false,
        sections: { ...sections, bank: { status: 'changes_requested', note: '' } },
      }).success,
    ).toBe(true);
  });
});
