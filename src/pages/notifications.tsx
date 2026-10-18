import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { notificationSchema } from '@/lib/operations';
import { adminDate } from '@/lib/admin-api';
import { State, Notice, SectionTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { AdminPagination, useAdminPaging, SelectFilter } from './admin/console';
export default function Notifications() {
  const tr = useT();
  const { locale } = useLocale();
  const { session } = useAuth();
  const paging = useAdminPaging();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: [
      'notification-inbox',
      session?.user.id,
      paging.page,
      paging.size,
      paging.filters.status,
    ],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await db().rpc('get_notification_inbox', {
        unread_only: paging.filters.status === 'unread',
        page: paging.page,
        page_size: paging.size,
      });
      if (error) throw error;
      return z.object({ total: z.number(), rows: z.array(notificationSchema) }).parse(data);
    },
  });
  const read = useMutation({
    mutationFn: async ({ id, state }: { id?: string; state?: boolean }) => {
      const { error } = id
        ? await db().rpc('mark_notification', { target: id, is_read: state })
        : await db().rpc('mark_all_notifications_read');
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['notification-inbox'] }),
        cache.invalidateQueries({ queryKey: ['notification-unread'] }),
      ]);
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Notifications')}
        description={tr('Your marketplace updates, decisions, and reminders.')}
      />
      <div className="admin-section-header">
        <SelectFilter label="Inbox filter" name="status" options={['unread']} paging={paging} />
        <Button
          variant="outline"
          size="sm"
          disabled={read.isPending}
          onClick={() => read.mutate({})}
        >
          {tr('Mark all as read')}
        </Button>
      </div>
      <Notice error={query.error ?? read.error} />
      {query.isPending ? (
        <State title={tr('Loading…')} />
      ) : query.data?.rows.length ? (
        query.data.rows.map((n) => (
          <article className={`panel notification-card ${n.read_at ? '' : 'unread'}`} key={n.id}>
            <div className="admin-section-header">
              <h3>{locale === 'bn' ? n.title_bn : n.title_en}</h3>
              <span className="status-badge">{tr(n.read_at ? 'read' : 'unread')}</span>
            </div>
            <p className="preserve-lines">{locale === 'bn' ? n.body_bn : n.body_en}</p>
            <small>{adminDate(n.created_at)}</small>
            <div className="table-actions">
              <Button asChild variant="outline" size="sm">
                <Link
                  to={n.href}
                  onClick={() => {
                    if (!n.read_at) read.mutate({ id: n.id, state: true });
                  }}
                >
                  {tr('Open details')} ↗
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={read.isPending}
                onClick={() => read.mutate({ id: n.id, state: !n.read_at })}
              >
                {tr(n.read_at ? 'Mark unread' : 'Mark read')}
              </Button>
            </div>
          </article>
        ))
      ) : (
        <State title={tr('No notifications yet')} />
      )}
      <AdminPagination paging={paging} total={query.data?.total} />
    </>
  );
}
