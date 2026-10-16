import { useT } from '@/lib/i18n';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowRight, PackageOpen, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { errorMessage } from '@/lib/utils';
export function State({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <PackageOpen size={38} strokeWidth={1.3} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Notice({ error, success }: { error?: unknown; success?: string }) {
  return error ? (
    <div role="alert" className="notice error">
      <AlertCircle size={18} />
      {errorMessage(error)}
    </div>
  ) : success ? (
    <div role="status" className="notice success">
      <CheckCircle2 size={18} />
      {success}
    </div>
  ) : null;
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  to,
  label = 'View all',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {to && (
        <Link to={to} className="text-link">
          {label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Paikari`;
  }, [title]);
}
export function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
export function ConfirmButton({
  onConfirm,
  children,
}: {
  onConfirm: () => Promise<void>;
  children: ReactNode;
}) {
  const tr = useT();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          setBusy(true);
          try {
            await onConfirm();
            setConfirm(false);
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        {confirm ? tr('Confirm deletion') : children}
      </Button>
      {confirm && (
        <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
          {tr('Cancel')}
        </Button>
      )}
      <Notice error={error} />
    </div>
  );
}
