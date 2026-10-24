import { z } from 'zod';
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
