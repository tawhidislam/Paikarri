import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  FileText,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  Lock,
  MessageSquare,
  Undo2,
} from 'lucide-react';
import type { OrderDetail, OrderAction } from '@/lib/order-schema';
import { useT, useLocale } from '@/lib/i18n';
import { money } from '@/lib/utils';
import { formatOrderDate } from '@/lib/orders';
import {
  BUYER_DISPUTE_CATEGORIES,
  SELLER_DEFENSE_CATEGORIES,
  DESIRED_OUTCOMES,
  parseDisputeClaim,
  parseDefenseNote,
  parseSupervisorDirective,
} from '@/lib/disputes';
import { Button } from '@/components/ui/button';

interface EscrowAppealRoomProps {
  order: OrderDetail;
  buyer: boolean;
  seller: boolean;
  admin: boolean;
  allowedActions?: readonly OrderAction[];
  onAction: (action: OrderAction, presetNote?: string) => void;
}

export function EscrowAppealRoom({
  order,
  buyer,
  seller,
  admin,
  allowedActions,
  onAction,
}: EscrowAppealRoomProps) {
  const tr = useT();
  const { locale } = useLocale();

  const openDispute = order.disputes.find((d) => !d.resolved_at);
  const lastDispute = order.disputes[order.disputes.length - 1];
  const dispute = openDispute ?? lastDispute;

  if (!dispute) return null;

  const isResolved = Boolean(dispute.resolved_at);
  const claim = parseDisputeClaim(dispute.reason);
  const activeReturn = order.returns.at(-1);

  // Extract seller defense notes from events
  const sellerDefenses = order.events
    .filter((e) => e.actor_role === 'supplier' && e.note)
    .map((e) => ({
      event: e,
      parsed: parseDefenseNote(e.note),
    }));

  // Extract supervisor notes/directives from events
  const supervisorDirectives = order.events
    .filter((e) => e.actor_role === 'super_admin' && e.note)
    .map((e) => ({
      event: e,
      parsed: parseSupervisorDirective(e.note),
    }));

  // Determine stage label
  let stageLabel: string;
  let stageColorClass: string;
  if (isResolved) {
    stageLabel = tr('Case Resolved');
    stageColorClass = 'is-resolved';
  } else if (sellerDefenses.length === 0) {
    stageLabel = tr('Awaiting Seller Response');
    stageColorClass = 'is-awaiting';
  } else {
    stageLabel = tr('Ready for Adjudication');
    stageColorClass = 'is-adjudicating';
  }

  // Localized dispute category
  const buyerCategory = BUYER_DISPUTE_CATEGORIES.find((c) => c.id === claim.category);
  const categoryLabel = buyerCategory
    ? locale === 'bn'
      ? buyerCategory.label_bn
      : buyerCategory.label
    : claim.categoryLabel;

  // Localized outcome
  const outcomeObj = DESIRED_OUTCOMES.find((o) => o.id === claim.desiredOutcome);
  const outcomeLabel = outcomeObj
    ? locale === 'bn'
      ? outcomeObj.label_bn
      : outcomeObj.label
    : claim.outcomeLabel;

  const totalFormatted = money(order.total, locale);

  return (
    <section className="escrow-appeal-room" aria-labelledby="escrow-appeal-title">
      {/* 1. Header & Stage Tracker */}
      <header className="appeal-header">
        <div className="appeal-header-left">
          <div className="appeal-icon-box" aria-hidden="true">
            <Scale size={24} />
          </div>
          <div>
            <span className="appeal-eyebrow">
              {tr(admin ? 'ORDER DISPUTE REVIEW' : 'PAIKARII ESCROW APPEAL ROOM')}
            </span>
            <h2 id="escrow-appeal-title">{tr('Dispute Resolution Center')}</h2>
          </div>
        </div>
        <div className="appeal-header-right">
          <span className={`appeal-stage-badge ${stageColorClass}`}>
            {isResolved ? (
              <CheckCircle2 size={15} aria-hidden="true" />
            ) : (
              <Clock size={15} aria-hidden="true" />
            )}
            <span>{stageLabel}</span>
          </span>
        </div>
      </header>

      <div className="appeal-escrow-pledge">
        <div className="pledge-lock">
          <Lock size={18} aria-hidden="true" />
        </div>
        <div className="pledge-content">
          <strong>
            {tr('Order total')}: {totalFormatted}
          </strong>
          <p>
            {tr(
              'Payments and refunds are verified manually. Opening a dispute does not place funds in escrow or guarantee a refund.',
            )}
          </p>
        </div>
      </div>

      {/* 3. Dual-Dossier Grid: Buyer Claim vs Seller Defense */}
      <div className="appeal-dossier-grid">
        {/* Buyer Dossier */}
        <div className="appeal-dossier-card buyer-dossier">
          <div className="dossier-badge-row">
            <span className="dossier-tag buyer-tag">
              <ShieldAlert size={14} aria-hidden="true" />
              <span>{tr('Buyer Claim & Evidence')}</span>
            </span>
            <span className="dossier-timestamp">{formatOrderDate(dispute.opened_at, locale)}</span>
          </div>

          <div className="dossier-field">
            <span className="field-label">{tr('Dispute Category')}</span>
            <strong className="field-value highlight">{categoryLabel}</strong>
          </div>

          {outcomeLabel && (
            <div className="dossier-field">
              <span className="field-label">{tr('Desired outcome')}</span>
              <span className="field-value outcome-tag">{outcomeLabel}</span>
            </div>
          )}

          <div className="dossier-field">
            <span className="field-label">{tr('Describe the issue in detail')}</span>
            <p className="preserve-lines claim-narrative">{claim.details}</p>
          </div>

          <div className="dossier-field">
            <span className="field-label">{tr('Evidence & Document Links')}</span>
            {claim.evidenceUrls.length > 0 ? (
              <ul className="evidence-link-list">
                {claim.evidenceUrls.map((url, idx) => (
                  <li key={idx}>
                    {url.startsWith('http') ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="evidence-link"
                      >
                        <FileText size={14} aria-hidden="true" />
                        <span className="evidence-url-text">{url}</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="evidence-ref-tag">
                        <FileText size={14} aria-hidden="true" />
                        <span>{url}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="no-evidence-text">{tr('No evidence links provided.')}</span>
            )}
          </div>

          {buyer && !isResolved && (
            <div className="dossier-action-footer">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction('note', '[BUYER ADDITIONAL EVIDENCE]\n')}
              >
                <MessageSquare size={14} aria-hidden="true" />
                <span>{tr('Submit Additional Evidence')}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Seller Dossier */}
        <div className="appeal-dossier-card seller-dossier">
          <div className="dossier-badge-row">
            <span className="dossier-tag seller-tag">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>{tr('Seller Defense & Counter-Evidence')}</span>
            </span>
            {sellerDefenses.length > 0 && (
              <span className="dossier-timestamp">
                {formatOrderDate(
                  sellerDefenses[sellerDefenses.length - 1].event.created_at,
                  locale,
                )}
              </span>
            )}
          </div>

          {sellerDefenses.length > 0 ? (
            <div className="seller-defense-list">
              {sellerDefenses.map((sd, i) => {
                const catDef = SELLER_DEFENSE_CATEGORIES.find((c) => c.id === sd.parsed.category);
                const defenseCatLabel = catDef
                  ? locale === 'bn'
                    ? catDef.label_bn
                    : catDef.label
                  : sd.parsed.categoryLabel;

                return (
                  <div key={sd.event.id} className="defense-entry">
                    {i > 0 && <hr className="defense-separator" />}
                    <div className="dossier-field">
                      <span className="field-label">{tr('Defense Category')}</span>
                      <strong className="field-value highlight">{defenseCatLabel}</strong>
                    </div>

                    <div className="dossier-field">
                      <span className="field-label">{tr('State your defense and facts')}</span>
                      <p className="preserve-lines claim-narrative">{sd.parsed.statement}</p>
                    </div>

                    {sd.parsed.evidenceUrls.length > 0 && (
                      <div className="dossier-field">
                        <span className="field-label">{tr('Evidence & Document Links')}</span>
                        <ul className="evidence-link-list">
                          {sd.parsed.evidenceUrls.map((url, uidx) => (
                            <li key={uidx}>
                              {url.startsWith('http') ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="evidence-link"
                                >
                                  <FileText size={14} aria-hidden="true" />
                                  <span className="evidence-url-text">{url}</span>
                                  <ExternalLink size={12} aria-hidden="true" />
                                </a>
                              ) : (
                                <span className="evidence-ref-tag">
                                  <FileText size={14} aria-hidden="true" />
                                  <span>{url}</span>
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-defense-box">
              <AlertTriangle size={24} className="warning-icon" aria-hidden="true" />
              <p>{tr('No counter-evidence submitted yet by seller.')}</p>
              <small>{tr('Fulfilment is paused while the dispute is being reviewed.')}</small>
            </div>
          )}

          {seller && !isResolved && (
            <div className="dossier-action-footer">
              <Button
                variant={sellerDefenses.length === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  onAction('note', '[SELLER DEFENSE: signed_pod]\nStatement: \nEvidence: ')
                }
              >
                <ShieldCheck size={14} aria-hidden="true" />
                <span>{tr('Submit Defense & Evidence')}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Active Return Sub-flow (if authorized) */}
      {activeReturn && (
        <div className="appeal-return-banner">
          <div className="return-header">
            <Undo2 size={18} aria-hidden="true" />
            <strong>{tr('Merchandise Return Authorized')}</strong>
            <span className="return-status-pill">{activeReturn.status}</span>
          </div>
          <p>
            {activeReturn.status === 'authorized'
              ? tr('Buyer must dispatch return items with registered courier tracking.')
              : activeReturn.status === 'in_transit'
                ? tr('Return is in transit to supplier. Supplier must inspect goods upon delivery.')
                : tr('Return received and inspected by supplier.')}
          </p>
          {activeReturn.tracking_number && (
            <div className="return-meta">
              <span>
                {tr('Carrier')}: {activeReturn.carrier}
              </span>
              <span>
                {tr('Tracking')}: {activeReturn.tracking_number}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 5. Supervisor Directives Timeline */}
      {supervisorDirectives.length > 0 && (
        <div className="appeal-directives-box">
          <div className="directives-header">
            <Scale size={16} aria-hidden="true" />
            <h3>{tr('Official Paikarii Supervision Notice')}</h3>
          </div>
          <ul className="directives-list">
            {supervisorDirectives.map((sd) => (
              <li key={sd.event.id} className="directive-item">
                <div className="directive-meta">
                  <span>{formatOrderDate(sd.event.created_at, locale)}</span>
                </div>
                <p className="preserve-lines">{sd.parsed.directive}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Adjudication Status / Final Verdict (if resolved) */}
      {isResolved && (
        <div className="appeal-verdict-banner">
          <div className="verdict-icon">
            <CheckCircle2 size={24} aria-hidden="true" />
          </div>
          <div className="verdict-content">
            <h3>
              {tr('Platform Adjudication')} · {dispute.resolution?.toUpperCase()}
            </h3>
            <small>{formatOrderDate(dispute.resolved_at!, locale)}</small>
            {dispute.resolution_note && (
              <p className="preserve-lines verdict-rationale">{dispute.resolution_note}</p>
            )}
          </div>
        </div>
      )}

      {/* 7. Super Admin Supervision & Adjudication Console */}
      {admin && !isResolved && (
        <div className="appeal-admin-console">
          <div className="admin-console-header">
            <Scale size={18} aria-hidden="true" />
            <h3>
              {tr('Adjudicate Case')} · {tr('Super Admin')}
            </h3>
          </div>
          <p className="admin-console-desc">
            {tr(
              admin
                ? 'Review statements, record decisions and verify any external refund separately.'
                : 'Supervise evidence, request clarifying documentation from either party, or execute a binding financial resolution.',
            )}
          </p>

          <div className="admin-actions-bar">
            <Button
              variant="outline"
              size="sm"
              disabled={allowedActions && !allowedActions.includes('note')}
              onClick={() => onAction('note', '[PAIKARII SUPERVISOR DIRECTIVE]\n')}
            >
              <MessageSquare size={14} aria-hidden="true" />
              <span>{tr('Post Supervisor Directive')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={allowedActions && !allowedActions.includes('resolve_cancel')}
              onClick={() => onAction('resolve_cancel')}
            >
              <span>{tr('Record buyer refund decision')}</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              disabled={allowedActions && !allowedActions.includes('resolve_complete')}
              onClick={() => onAction('resolve_complete')}
            >
              <span>{tr('Resolve in supplier favour')}</span>
            </Button>

            {['shipped', 'completed'].includes(dispute.previous_status) && !activeReturn && (
              <Button
                variant="outline"
                size="sm"
                disabled={allowedActions && !allowedActions.includes('authorize_return')}
                onClick={() => onAction('authorize_return')}
              >
                <span>{tr('Authorize Merchandise Return')}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={allowedActions && !allowedActions.includes('resolve_resume')}
              onClick={() => onAction('resolve_resume')}
            >
              <span>{tr('Resume Fulfillment')}</span>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
