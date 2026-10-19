import type { ReactNode } from 'react';
import { Clock, ShieldAlert, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n';
import { adminDate } from '@/lib/admin-api';
import { correctionDays, dateOnly, type SupplierWarning } from '@/lib/supplier-management';
import { Button } from '@/components/ui/button';
import '@/pages/admin/supplier-management.css';
export function WarningCard({
  warning,
  children,
}: {
  warning: SupplierWarning;
  children?: ReactNode;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const remaining = correctionDays(warning.due_on);
  const active = ['open', 'response_submitted'].includes(warning.status);
  const days = new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
    Math.abs(remaining),
  );
  return (
    <article
      className={`sm-warning sm-severity-${warning.severity} ${warning.overdue ? 'sm-warning-overdue' : ''}`}
    >
      <div className="sm-warning-top">
        <span className={`sm-severity ${warning.severity}`}>
          <ShieldAlert size={14} />
          {tr(warning.severity)}
        </span>
        <span className="status-badge">{tr(warning.status)}</span>
        {warning.overdue && <span className="sm-danger">{tr('Overdue')}</span>}
      </div>
      <h3>{warning.title}</h3>
      <p>{warning.message}</p>
      <div className="sm-correction">
        <strong>{tr('Required corrective action')}</strong>
        <p>{warning.corrective_action}</p>
      </div>
      <p className="sm-deadline">
        <Clock size={14} />
        {tr('Correction deadline')}: {dateOnly(warning.due_on, locale)}
      </p>
      {active && (
        <span className={`sm-countdown ${remaining < 0 ? 'overdue' : ''}`}>
          {remaining === 0
            ? tr('Due today')
            : `${tr(remaining < 0 ? 'Overdue by' : 'Due in')} ${days} ${tr('days')}`}
        </span>
      )}
      <details>
        <summary>
          {tr('Action history')} ({warning.events.length})
        </summary>
        <ol className="sm-history">
          {warning.events.map((event) => (
            <li key={event.id}>
              <span className="sm-history-icon" aria-hidden="true">
                {event.event === 'response_submitted' ? (
                  <MessageSquare size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
              </span>
              <div className="sm-event-heading">
                <strong>{tr(event.event)}</strong>
                <span>
                  {tr(event.event === 'response_submitted' ? 'Supplier' : 'Platform review')}
                </span>
              </div>
              <time>{adminDate(event.created_at)}</time>
              <p>{event.body}</p>
            </li>
          ))}
          {!warning.events.length && <li>{tr('No action history yet')}</li>}
        </ol>
      </details>
      {children}
    </article>
  );
}
export function LocalPagination({
  page,
  setPage,
  total,
}: {
  page: number;
  setPage: (page: number) => void;
  total: number;
}) {
  const tr = useT();
  return (
    <div className="sm-pagination">
      <span>
        {total} {tr('records')} · {tr('Page')} {page}
      </span>
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        {tr('Previous')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={page * 25 >= total}
        onClick={() => setPage(page + 1)}
      >
        {tr('Next')}
      </Button>
    </div>
  );
}
