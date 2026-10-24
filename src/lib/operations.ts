import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { db, configured } from './supabase';
import { useAuth } from './auth';
import { homepageSchema } from './operations-schema';
export { homepageSchema, defaultHomepage, localLinkSchema } from './operations-schema';
export type { HomepageConfig } from './operations-schema';
export const useHomepage = () =>
  useQuery({
    queryKey: ['homepage-published'],
    enabled: configured,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await db().rpc('get_homepage_content');
      if (error) throw error;
      return data === null ? null : homepageSchema.parse(data);
    },
  });
export async function operationsList<T>(
  kind: 'onboarding' | 'notifications',
  filters: Record<string, string>,
  page: number,
  page_size: number,
  schema: z.ZodType<T>,
) {
  const { data, error } = await db().rpc('admin_operations_list', {
    kind,
    filters,
    page,
    page_size,
  });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(schema) }).parse(data);
}
export { notificationSchema } from '../../supabase/functions/_shared/supplier-api/notification-schema';
export const useUnreadNotifications = () => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['notification-unread', session?.user.id],
    enabled: !!session,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await db().rpc('notification_unread_count');
      if (error) throw error;
      return z.number().parse(data);
    },
  });
};
