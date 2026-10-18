import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUnreadNotifications } from '@/lib/operations';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
export function NotificationLink() {
  const { session, role } = useAuth();
  const count = useUnreadNotifications();
  const tr = useT();
  if (!session) return null;
  return (
    <Link
      className="notification-link"
      to={role === 'admin' || role === 'super_admin' ? '/admin/inbox' : '/dashboard/notifications'}
      aria-label={`${tr('Notifications')}${count.data ? ` (${count.data})` : ''}`}
    >
      <Bell size={18} />
      {!!count.data && <span>{count.data > 99 ? '99+' : count.data}</span>}
    </Link>
  );
}
