import { useT } from '@/lib/i18n';
import { SectionTitle } from '@/components/shared';
export default function Integrations() {
  const tr = useT();
  return (
    <>
      <SectionTitle
        heading="h1"
        title={tr('External integrations')}
        description={tr(
          'Provider activation is deferred. COD and manual bank payment remain active.',
        )}
      />
      <div className="panel growth-panel">
        <h2>{tr('Not configured')}</h2>
        <ul>
          <li>
            {tr('Courier booking and tracking: Pathao or Steadfast merchant credentials required.')}
          </li>
          <li>
            {tr(
              'SMS and Web Push: provider credentials, sender approval and delivery configuration required.',
            )}
          </li>
          <li>
            {tr('bKash / Nagad: approved merchant account and sandbox verification required.')}
          </li>
          <li>
            {tr(
              'Escrow and staged collections: an approved operating agreement and reconciliation workflow are required before activation.',
            )}
          </li>
        </ul>
        <p>
          {tr(
            'No automatic collection, payout, pickup booking or external notifications are performed by this release.',
          )}
        </p>
        <p>
          {tr(
            'In-app order and sourcing notifications remain available. Never enter provider secrets into browser settings.',
          )}
        </p>
      </div>
    </>
  );
}
