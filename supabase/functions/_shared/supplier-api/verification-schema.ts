import { z } from 'zod';
const text = (max = 200) => z.string().trim().max(max);
const date = z.union([z.literal(''), z.iso.date()]);
export const identityDraft = z.object({
  legal_name: text(),
  dob: date,
  address: text(1000),
  issuing_country: text(100),
  document_type: z.enum(['nid', 'driving_license', 'passport']),
  document_number: text(80),
  issued_on: date,
  expires_on: date,
  no_expiry: z.boolean(),
});
export const tradeDraft = z.object({
  license_number: text(100),
  business_name: text(),
  owner_name: text(),
  issuing_authority: text(),
  business_address: text(1000),
  issued_on: date,
  expires_on: date,
});
export const bankDraft = z.object({
  bank_name: text(),
  branch_name: text(),
  account_title: text(),
  account_number: text(80),
  account_type: z.enum(['current', 'savings']),
  holder_type: z.enum(['business', 'owner']),
  routing_number: text(20),
});
export type IdentityDetails = z.infer<typeof identityDraft>;
export type TradeDetails = z.infer<typeof tradeDraft>;
export type BankDetails = z.infer<typeof bankDraft>;
export type VerificationStep = 'identity' | 'trade_license' | 'bank';
export const emptyIdentity: IdentityDetails = {
  legal_name: '',
  dob: '',
  address: '',
  issuing_country: 'Bangladesh',
  document_type: 'nid',
  document_number: '',
  issued_on: '',
  expires_on: '',
  no_expiry: true,
};
export const emptyTrade: TradeDetails = {
  license_number: '',
  business_name: '',
  owner_name: '',
  issuing_authority: '',
  business_address: '',
  issued_on: '',
  expires_on: '',
};
export const emptyBank: BankDetails = {
  bank_name: '',
  branch_name: '',
  account_title: '',
  account_number: '',
  account_type: 'current',
  holder_type: 'business',
  routing_number: '',
};
export function bangladeshDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`;
}
export function stepErrors(
  step: VerificationStep,
  value: IdentityDetails | TradeDetails | BankDetails,
  today = bangladeshDate(),
): string[] {
  const errors: string[] = [];
  const required = (names: string[]) => {
    for (const name of names)
      if (!String((value as Record<string, unknown>)[name] ?? '').trim()) errors.push(name);
  };
  if (step === 'identity') {
    const v = value as IdentityDetails;
    required(['legal_name', 'dob', 'address', 'issuing_country', 'document_number']);
    if (v.dob && v.dob >= today) errors.push('dob');
    if (
      (v.document_type !== 'nid' && !v.issued_on) ||
      (v.issued_on && (v.issued_on > today || (v.dob && v.issued_on < v.dob)))
    )
      errors.push('issued_on');
    if (v.document_type !== 'nid' || !v.no_expiry) {
      if (!v.expires_on || v.expires_on < today || (v.issued_on && v.expires_on < v.issued_on))
        errors.push('expires_on');
    }
  } else if (step === 'trade_license') {
    const v = value as TradeDetails;
    required([
      'license_number',
      'business_name',
      'owner_name',
      'issuing_authority',
      'business_address',
      'issued_on',
      'expires_on',
    ]);
    if (v.issued_on > today) errors.push('issued_on');
    if (v.expires_on && (v.expires_on < today || v.expires_on < v.issued_on))
      errors.push('expires_on');
  } else {
    const v = value as BankDetails;
    required(['bank_name', 'branch_name', 'account_title', 'account_number']);
    if (v.routing_number && !/^\d{9}$/.test(v.routing_number)) errors.push('routing_number');
  }
  return [...new Set(errors)];
}
export const decisionSchema = z
  .object({
    decision: z.enum(['approved', 'changes_requested', 'rejected', 'revoked']),
    reason: z.string().trim().max(2000),
    holder_match_confirmed: z.boolean(),
    sections: z.object({
      identity: z.object({
        status: z.enum(['approved', 'changes_requested']),
        note: z.string().trim().max(2000),
      }),
      trade_license: z.object({
        status: z.enum(['approved', 'changes_requested']),
        note: z.string().trim().max(2000),
      }),
      bank: z.object({
        status: z.enum(['approved', 'changes_requested']),
        note: z.string().trim().max(2000),
      }),
    }),
  })
  .superRefine((v, c) => {
    const entries = Object.values(v.sections);
    if (
      v.decision === 'approved' &&
      (!v.holder_match_confirmed || entries.some((s) => s.status !== 'approved'))
    )
      c.addIssue({
        code: 'custom',
        message: 'Approve all three sections and confirm the account-holder match.',
      });
    if (
      v.decision === 'changes_requested' &&
      !entries.some((s) => s.status === 'changes_requested')
    )
      c.addIssue({ code: 'custom', message: 'Select at least one section requiring corrections.' });
    if (
      v.decision !== 'revoked' &&
      v.decision !== 'approved' &&
      entries.some((s) => s.status === 'changes_requested' && s.note.length < 5)
    )
      c.addIssue({ code: 'custom', message: 'Explain the corrections for every flagged section.' });
    if (['rejected', 'revoked'].includes(v.decision) && v.reason.length < 5)
      c.addIssue({ code: 'custom', message: 'A reason is required.' });
  });
export const applicationSummarySchema = z.object({
  id: z.string(),
  business_id: z.string(),
  revision: z.number(),
  lock_version: z.number(),
  status: z.string(),
  created_at: z.string(),
  submitted_at: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  valid_until: z.string().nullable(),
});
const nullableDate = z
  .string()
  .nullable()
  .transform((v) => v ?? '');
export const detailSchema = z.object({
  application: applicationSummarySchema,
  business: z.object({
    id: z.string(),
    name: z.string(),
    name_bn: z.string(),
    owner_id: z.string(),
    verified: z.boolean(),
    verification_application_id: z.string().nullable().default(null),
    address: z.string(),
    contact_phone: z.string(),
  }),
  identity: identityDraft.extend({
    dob: nullableDate,
    issued_on: nullableDate,
    expires_on: nullableDate,
  }),
  trade_license: tradeDraft.extend({ issued_on: nullableDate, expires_on: nullableDate }),
  bank: bankDraft,
  files: z.array(
    z.object({
      id: z.string(),
      slot: z.string(),
      object_path: z.string(),
      mime_type: z.string(),
      file_size: z.number(),
      position: z.number(),
    }),
  ),
  reviews: z.array(
    z.object({
      id: z.string(),
      decision: z.string(),
      reason: z.string(),
      sections: z.record(z.string(), z.object({ status: z.string(), note: z.string() })),
      created_at: z.string(),
      reviewed_by: z.string().nullable(),
    }),
  ),
});
export type VerificationDetail = z.infer<typeof detailSchema>;
export const stateSchema = z.object({
  business: z.object({ id: z.string(), name: z.string(), verified: z.boolean() }).nullable(),
  history: z.array(applicationSummarySchema),
  current: detailSchema.nullable(),
  legacy: z.array(
    z.object({
      id: z.string(),
      document_type: z.string(),
      status: z.string(),
      created_at: z.string(),
      document_path: z.string(),
      review_note: z.string(),
    }),
  ),
});
export const progressSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  name: z.string(),
  revision: z.number(),
  lock_version: z.number(),
  status: z.string(),
  created_at: z.string(),
  submitted_at: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  valid_until: z.string().nullable(),
  identity_complete: z.boolean(),
  trade_complete: z.boolean(),
  bank_complete: z.boolean(),
});
