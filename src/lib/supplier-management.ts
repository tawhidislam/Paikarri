import { z } from 'zod';
import { db } from './supabase';
export const workspaceSchema = z.object({
  id: z.uuid(),
  owner_id: z.uuid(),
  name: z.string(),
  email: z.string().nullable(),
  division: z.string(),
  district: z.string(),
  account_status: z.string(),
  verified: z.boolean(),
  profile_complete: z.boolean(),
  last_sign_in_at: z.string().nullable(),
  last_activity: z.string(),
  approved_products: z.number(),
  pending_products: z.number(),
  unanswered_quotations: z.number(),
  unanswered_conversations: z.number(),
  active_warnings: z.number(),
  overdue_warnings: z.number(),
  labels: z.array(z.string()),
  labels_version: z.number(),
});
export const noteSchema = z.object({
  id: z.uuid(),
  business_id: z.uuid(),
  body: z.string(),
  author: z.string(),
  created_at: z.string(),
  archived_at: z.string().nullable(),
  archive_reason: z.string(),
});
export const warningSchema = z.object({
  id: z.uuid(),
  business_id: z.uuid(),
  title: z.string(),
  message: z.string(),
  corrective_action: z.string(),
  severity: z.enum(['notice', 'warning', 'final_warning']),
  due_on: z.iso.date(),
  status: z.enum(['open', 'response_submitted', 'resolved', 'dismissed']),
  version: z.number(),
  created_at: z.string(),
  overdue: z.boolean(),
  events: z.array(
    z.object({
      id: z.uuid(),
      event: z.string(),
      body: z.string(),
      actor_id: z.uuid(),
      created_at: z.string(),
    }),
  ),
});
export type SupplierWarning = z.infer<typeof warningSchema>;
export const renewalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  account_status: z.string(),
  valid_until: z.iso.date(),
  days_remaining: z.number(),
  revision: z.number(),
  latest_status: z.string(),
  last_reminded_at: z.string().nullable(),
});
export const labelsSchema = z.array(z.string().trim().min(2).max(40)).max(10);
export const noteInput = z.string().trim().min(5).max(3000);
export const warningInput = z.object({
  title: z.string().trim().min(5).max(160),
  message: z.string().trim().min(10).max(3000),
  corrective_action: z.string().trim().min(10).max(2000),
  severity: z.enum(['notice', 'warning', 'final_warning']),
  due_on: z.iso.date(),
});
export function dhakaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function dateOnly(value: string, locale = 'en') {
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00+06:00`));
}
export async function managementList<T>(
  kind: string,
  filters: Record<string, string>,
  page: number,
  page_size: number,
  schema: z.ZodType<T>,
) {
  const { data, error } = await db().rpc('admin_supplier_operations_list', {
    kind,
    filters,
    page,
    page_size,
  });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(schema) }).parse(data);
}
export async function supplierWorkspace(target: string) {
  const { data, error } = await db().rpc('admin_supplier_workspace', { target });
  if (error) throw error;
  return workspaceSchema.parse(data);
}
export async function saveLabels(target: string, expected_version: number, labels: string[]) {
  const { error } = await db().rpc('admin_supplier_labels', {
    target,
    expected_version,
    labels: labelsSchema.parse(labels),
  });
  if (error) throw error;
}
export async function addNote(target: string, body: string) {
  const { error } = await db().rpc('admin_supplier_note', {
    target,
    body: noteInput.parse(body),
  });
  if (error) throw error;
}
export async function archiveNote(target: string, reason: string) {
  const { error } = await db().rpc('admin_supplier_archive_note', {
    target,
    reason: noteInput.max(1000).parse(reason),
  });
  if (error) throw error;
}
export async function issueWarning(target: string, payload: z.infer<typeof warningInput>) {
  const value = warningInput.parse(payload);
  if (value.due_on < dhakaToday()) throw new Error('Choose today or a future correction deadline');
  const { error } = await db().rpc('admin_supplier_issue_warning', { target, payload: value });
  if (error) throw error;
}
export async function decideWarning(
  warning: SupplierWarning,
  decision: 'resolved' | 'dismissed',
  reason: string,
) {
  const { error } = await db().rpc('admin_supplier_warning_decide', {
    target: warning.id,
    expected_version: warning.version,
    decision,
    reason: noteInput.parse(reason),
  });
  if (error) throw error;
}
export async function renewalReminder(target: string) {
  const { error } = await db().rpc('admin_supplier_renewal_reminder', { target });
  if (error) throw error;
}
export async function supplierActions(page: number, page_size: number) {
  const { data, error } = await db().rpc('supplier_action_list', { page, page_size });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(warningSchema) }).parse(data);
}
export async function respondWarning(warning: SupplierWarning, response: string) {
  const { error } = await db().rpc('supplier_warning_respond', {
    target: warning.id,
    expected_version: warning.version,
    response: noteInput.parse(response),
  });
  if (error) throw error;
}
