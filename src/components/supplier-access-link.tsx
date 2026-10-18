import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { usePlatformSettings } from '@/lib/platform';

/** Shared public supplier entry point. Existing suppliers keep workspace access during a pause. */
export function SupplierAccessLink({
  className = '',
  children,
  onClick,
}: {
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  const { role } = useAuth();
  const platform = usePlatformSettings();
  const { t } = useLocale();
  const tr = useT();
  const supplier = role === 'supplier';
  const administrator = role === 'admin' || role === 'super_admin';
  if (!supplier && !administrator && platform.data?.supplier_registration_open === false)
    return (
      <span className={`supplier-access-paused ${className}`} role="status">
        {tr('Supplier applications paused')}
      </span>
    );
  return (
    <Link
      className={className}
      to={administrator ? '/admin/suppliers' : '/dashboard/business'}
      onClick={onClick}
    >
      {supplier
        ? tr('Supplier workspace')
        : administrator
          ? tr('Manage suppliers')
          : (children ?? t.sell)}
    </Link>
  );
}
