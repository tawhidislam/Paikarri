import { z } from 'zod';
export const notificationSchema = z.object({
  id: z.string(),
  recipient_id: z.string(),
  kind: z.string(),
  title_en: z.string(),
  title_bn: z.string(),
  body_en: z.string(),
  body_bn: z.string(),
  href: z.string().regex(/^\/(dashboard|admin)(\/|$)/),
  entity_id: z.string().nullable(),
  actor_id: z.string().nullable(),
  created_at: z.string(),
  read_at: z.string().nullable(),
});
