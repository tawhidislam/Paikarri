import { z } from 'zod';
import { db } from './supabase';
import type { Json } from './models';
export const accountSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string(),
  status: z.string(),
  reason: z.string(),
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
  email_confirmed_at: z.string().nullable(),
  business_id: z.string().nullable(),
  name: z.string().nullable(),
  division: z.string().nullable(),
  district: z.string().nullable(),
  verified: z.boolean().nullable(),
});
export type AdminAccount = z.infer<typeof accountSchema>;
export const settingsSchema = z.object({
  name_en: z.string().min(2).max(100),
  name_bn: z.string().min(2).max(100),
  tagline_en: z.string().max(200),
  tagline_bn: z.string().max(200),
  support_email: z.union([z.literal(''), z.email()]),
  support_phone: z.string().max(30),
  default_locale: z.enum(['en', 'bn']),
  supplier_registration_open: z.boolean(),
});
export type PlatformSettings = z.infer<typeof settingsSchema>;
export async function adminList<T>(
  kind: string,
  filters: Record<string, string>,
  page: number,
  size: number,
  schema: z.ZodType<T>,
) {
  const { data, error } = await db().rpc('admin_list', { kind, filters, page, page_size: size });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(schema) }).parse(data);
}
export async function settings() {
  const { data, error } = await db().rpc('get_platform_settings');
  if (error) throw error;
  return settingsSchema.parse(data);
}
export async function participantContext() {
  const { data, error } = await db().rpc('participant_context');
  if (error) throw error;
  return z
    .object({
      businesses: z.array(z.object({ id: z.string(), name: z.string() })),
      products: z.array(z.object({ id: z.string(), name: z.string() })),
    })
    .parse(data);
}
export async function adminAction(
  action: 'status' | 'staff' | 'settings',
  payload: {
    target?: string;
    status?: string;
    grant?: boolean;
    reason?: string;
    settings?: PlatformSettings;
  },
) {
  const result =
    action === 'status'
      ? await db().rpc('admin_set_account_status', {
          target: z.uuid().parse(payload.target),
          new_status: z.enum(['active', 'suspended']).parse(payload.status),
          reason: z.string().trim().min(5).max(2000).parse(payload.reason),
        })
      : action === 'staff'
        ? await db().rpc('admin_set_staff', {
            target: z.uuid().parse(payload.target),
            grant_access: !!payload.grant,
            reason: z.string().trim().min(5).max(2000).parse(payload.reason),
          })
        : await db().rpc('admin_update_settings', {
            payload: settingsSchema.parse(payload.settings) as Json,
          });
  if (result.error) throw result.error;
}
export const adminDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-BD', {
        timeZone: 'Asia/Dhaka',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';
