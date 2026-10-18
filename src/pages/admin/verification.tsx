import { useState } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowUpRight,
  FileCheck2,
  Fingerprint,
  Building2,
  Landmark,
  LockKeyhole,
  Clock3,
  Check,
  History,
  Eye,
  EyeOff,
  Inbox,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { verificationGet, listVerifications, decideVerification } from '@/lib/verification';
import {
  decisionSchema,
  type VerificationDetail,
  type VerificationStep,
} from '@/lib/verification-schema';
import type { z } from 'zod';
import { VerificationValues, VerificationEvidence } from '@/components/verification-details';
import { Button } from '@/components/ui/button';
import { Field, Notice, State } from '@/components/shared';
import { ActionDialog, AdminFilters, AdminPagination, useAdminPaging } from './console';
import { adminDate } from '@/lib/admin-api';
import '../verification.css';
import './verification-console.css';
const names = { identity: 'Owner identity', trade_license: 'Trade licence', bank: 'Bank account' };
const stepIcons = { identity: Fingerprint, trade_license: Building2, bank: Landmark };
const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Awaiting review',
  changes_requested: 'Needs corrections',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  revoked: 'Revoked',
};
function Status({ value }: { value: string }) {
  const tr = useT();
  return (
    <span className={`av-status av-status--${value}`}>
      <span />
      {tr(statusLabels[value] ?? value)}
    </span>
  );
}
export function VerificationQueue() {
  const tr = useT();
  const { role } = useAuth();
  const paging = useAdminPaging();
  const list = useQuery({
    queryKey: ['verification-list', paging.filters, paging.page, paging.size],
    queryFn: () => listVerifications(paging.filters, paging.page, paging.size),
  });
  return (
    <div className="verification-workflow av-console">
      <header className="av-page-heading">
        <div>
          <span className="av-eyebrow">
            <ShieldCheck size={15} />
            {tr('TRUST & VERIFICATION')}
          </span>
          <h1>{tr('Supplier verification review')}</h1>
          <p>
            {tr(
              role === 'super_admin'
                ? 'Review complete identity, trade licence and bank applications.'
                : 'Verification progress only. Private details are restricted to the supplier and super admin.',
            )}
          </p>
        </div>
        <div className="av-total">
          <strong>{list.data?.total ?? '—'}</strong>
          <span>{tr('Matching applications')}</span>
        </div>
      </header>
      <div className="av-privacy">
        <LockKeyhole size={16} />
        <span>{tr('Private documents. Accountable decisions.')}</span>
        <span>{tr('Every review is recorded.')}</span>
      </div>
      <section className="av-card av-queue-card">
        <div className="av-queue-tabs" aria-label={tr('Filter verification status')}>
          {[
            ['', 'All applications'],
            ['submitted', 'Awaiting review'],
            ['changes_requested', 'Needs corrections'],
            ['approved', 'Approved'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={(paging.filters.status ?? '') === value}
              onClick={() => paging.update('status', value)}
            >
              {tr(label)}
            </button>
          ))}
        </div>
        <AdminFilters paging={paging}>
          <Field label={tr('Status')}>
            <select
              value={paging.filters.status ?? ''}
              onChange={(event) => paging.update('status', event.target.value)}
            >
              <option value="">{tr('All applications')}</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {tr(label)}
                </option>
              ))}
            </select>
          </Field>
        </AdminFilters>
        <Notice error={list.error} />
        {list.isError ? (
          <div className="av-empty">
            <Inbox size={32} />
            <h2>{tr('Applications could not be loaded')}</h2>
            <Button variant="outline" onClick={() => void list.refetch()}>
              <RefreshCw size={15} />
              {tr('Try again')}
            </Button>
          </div>
        ) : list.isPending ? (
          <div className="av-skeleton" aria-label={tr('Loading submissions…')} role="status">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} />
            ))}
          </div>
        ) : !list.data?.rows.length ? (
          <div className="av-empty">
            <div className="av-empty-icon">
              <FileCheck2 size={30} />
            </div>
            <h2>{tr('No applications to show')}</h2>
            <p>
              {tr(
                'Applications will appear here when suppliers save or submit their verification.',
              )}
            </p>
            {Object.values(paging.filters).some(Boolean) && (
              <Button variant="outline" onClick={() => paging.set({})}>
                {tr('Clear filters')}
              </Button>
            )}
          </div>
        ) : (
          <div className="av-table-scroll">
            <table className="av-table">
              <thead>
                <tr>
                  {['Supplier', 'Status', 'Verification checklist', 'Submitted', 'Actions'].map(
                    (label) => (
                      <th key={label}>{tr(label)}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {list.data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="av-supplier-cell">
                        <span className="av-avatar">
                          {row.name.trim().slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <Link to={`/admin/suppliers/${row.business_id}`}>{row.name}</Link>
                          <small>
                            {tr('Application revision')} {row.revision}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Status value={row.status} />
                    </td>
                    <td>
                      <div className="av-checklist">
                        {[row.identity_complete, row.trade_complete, row.bank_complete].map(
                          (done, i) => (
                            <span
                              className={done ? 'is-complete' : ''}
                              title={tr(Object.values(names)[i])}
                              key={i}
                            >
                              {done ? <Check size={12} /> : <span />}
                              {tr(Object.values(names)[i])}
                            </span>
                          ),
                        )}
                      </div>
                    </td>
                    <td className="av-date">
                      {adminDate(row.submitted_at)}
                      <small>
                        {tr('Created')}: {adminDate(row.created_at)}
                      </small>
                    </td>
                    <td>
                      {role === 'super_admin' ? (
                        <Link className="av-review-link" to={`/admin/verifications/${row.id}`}>
                          {tr('Review application')}
                          <ArrowUpRight size={15} />
                        </Link>
                      ) : (
                        <span className="av-readonly">
                          <LockKeyhole size={13} />
                          {tr('Status only')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination paging={paging} total={list.data?.total} />
      </section>
    </div>
  );
}
function ReviewForm({
  detail,
  onChange,
}: {
  detail: VerificationDetail;
  onChange: (d: VerificationDetail) => void;
}) {
  const tr = useT();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<unknown>();
  const [reason, setReason] = useState('');
  const [match, setMatch] = useState(false);
  const [sections, setSections] = useState<z.infer<typeof decisionSchema>['sections']>({
    identity: {
      status: detail.application.status === 'approved' ? 'approved' : 'changes_requested',
      note: '',
    },
    trade_license: {
      status: detail.application.status === 'approved' ? 'approved' : 'changes_requested',
      note: '',
    },
    bank: {
      status: detail.application.status === 'approved' ? 'approved' : 'changes_requested',
      note: '',
    },
  });
  const decide = async (decision: z.infer<typeof decisionSchema>['decision']) => {
    setError(undefined);
    try {
      onChange(
        await decideVerification(detail, {
          decision,
          reason,
          sections,
          holder_match_confirmed: match,
        }),
      );
    } catch (e) {
      setError(e);
      throw e;
    }
  };
  const approvalReady =
    match && Object.values(sections).every((section) => section.status === 'approved');
  const reviewable = detail.application.status === 'submitted';
  const revocable =
    detail.application.status === 'approved' &&
    detail.business.verification_application_id === detail.application.id;
  return (
    <div
      className={`av-review-layout ${!reviewable && !revocable ? 'av-review-layout--readonly' : ''}`}
    >
      <div className="av-review-main">
        <section className="av-card av-comparison">
          <div className="av-card-heading">
            <span className="av-icon">
              <Building2 size={19} />
            </span>
            <div>
              <h3>{tr('Business and account-title comparison')}</h3>
              <p>{tr('Compare the account holder with the licensed business or owner.')}</p>
            </div>
          </div>
          <dl className="verification-values">
            <div>
              <dt>{tr('Business profile')}</dt>
              <dd>{detail.business.name}</dd>
            </div>
            <div>
              <dt>{tr('Registered business name')}</dt>
              <dd>{detail.trade_license.business_name}</dd>
            </div>
            <div>
              <dt>{tr('Legal name')}</dt>
              <dd>{detail.identity.legal_name}</dd>
            </div>
            <div>
              <dt>{tr('Account title')}</dt>
              <dd>{detail.bank.account_title}</dd>
            </div>
            <div>
              <dt>{tr('Account belongs to')}</dt>
              <dd>{tr(detail.bank.holder_type)}</dd>
            </div>
          </dl>
          <Button
            className="av-reveal"
            variant="ghost"
            onClick={() => setShow(!show)}
            aria-pressed={show}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
            {tr(show ? 'Mask private numbers' : 'Reveal private numbers')}
          </Button>
        </section>
        {(Object.keys(names) as VerificationStep[]).map((step, index) => {
          const Icon = stepIcons[step];
          return (
            <section className="av-card av-section" id={`review-${step}`} key={step}>
              <header className="av-section-header">
                <span className="av-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <span className="av-section-number">
                    {tr('SECTION')} 0{index + 1}
                  </span>
                  <h2>{tr(names[step])}</h2>
                </div>
                <span className="av-section-state">
                  {reviewable ? (
                    sections[step].status === 'approved' ? (
                      <>
                        <Check size={14} />
                        {tr('Approved')}
                      </>
                    ) : (
                      <>
                        <Clock3 size={14} />
                        {tr('To review')}
                      </>
                    )
                  ) : (
                    tr(detail.application.status)
                  )}
                </span>
              </header>
              <div className="av-section-body">
                <VerificationValues detail={detail} step={step} masked={!show} />
                <VerificationEvidence detail={detail} step={step} compact />
              </div>
              {reviewable && (
                <div className="av-section-feedback">
                  <Field label={tr('Section decision')}>
                    <select
                      value={sections[step].status}
                      onChange={(e) =>
                        setSections({
                          ...sections,
                          [step]: {
                            ...sections[step],
                            status: e.target.value as 'approved' | 'changes_requested',
                          },
                        })
                      }
                    >
                      <option value="changes_requested">{tr('Needs corrections')}</option>
                      <option value="approved">{tr('Approved')}</option>
                    </select>
                  </Field>
                  <Field label={tr('Private feedback to supplier')}>
                    <textarea
                      value={sections[step].note}
                      maxLength={2000}
                      onChange={(e) =>
                        setSections({
                          ...sections,
                          [step]: { ...sections[step], note: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {(reviewable || revocable) && (
        <aside className="av-decision-rail">
          <section className="av-card av-decision-card">
            <span className="av-eyebrow">{tr('REVIEW WORKSPACE')}</span>
            <h2>{tr('Final decision')}</h2>
            <p className="av-supporting">{tr('Review each section before making a decision.')}</p>
            <div className="av-decision-progress">
              <strong>
                {Object.values(sections).filter((s) => s.status === 'approved').length}
                <span> / 3 {tr('sections approved')}</span>
              </strong>
              <progress
                max={3}
                value={Object.values(sections).filter((s) => s.status === 'approved').length}
              />
            </div>
            <nav className="av-section-links" aria-label={tr('Review sections')}>
              {(Object.keys(names) as VerificationStep[]).map((step) => (
                <a href={`#review-${step}`} key={step}>
                  {sections[step].status === 'approved' ? (
                    <Check size={16} />
                  ) : (
                    <span className="av-empty-dot" />
                  )}
                  {tr(names[step])}
                  <ChevronRight size={14} />
                </a>
              ))}
            </nav>
            <Field label={tr('Decision reason')}>
              <textarea
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            {reviewable && (
              <label className="verification-declaration">
                <input
                  type="checkbox"
                  checked={match}
                  onChange={(e) => setMatch(e.target.checked)}
                />
                {tr(
                  'I checked all evidence and confirm the bank account belongs to the business or verified owner.',
                )}
              </label>
            )}
            {reviewable && !approvalReady && (
              <p className="av-approval-guidance" role="status">
                {tr(
                  'Set all three section decisions to Approved, then confirm the bank account-holder match to enable approval.',
                )}
              </p>
            )}
            <Notice error={error} />
            <div className="verification-actions av-decision-actions">
              {reviewable ? (
                <>
                  {['approved', 'changes_requested', 'rejected'].map((d) => (
                    <ActionDialog
                      key={d}
                      disabled={d === 'approved' && !approvalReady}
                      label={
                        d === 'approved'
                          ? 'Approve supplier'
                          : d === 'changes_requested'
                            ? 'Request corrections'
                            : 'Reject application'
                      }
                      requireReason={false}
                      description={tr(
                        'This decision applies to the displayed application revision.',
                      )}
                      onConfirm={() => decide(d as 'approved' | 'changes_requested' | 'rejected')}
                    />
                  ))}
                </>
              ) : (
                <ActionDialog
                  label="Revoke verification"
                  requireReason={false}
                  description={tr('The verified badge will be removed. A reason is required.')}
                  onConfirm={() => decide('revoked')}
                />
              )}
            </div>
          </section>
          <div className="av-rail-note">
            <LockKeyhole size={15} />
            <p>{tr('Private feedback is visible only to the supplier and super admin.')}</p>
          </div>
        </aside>
      )}
    </div>
  );
}
export function VerificationApplication() {
  const tr = useT();
  const { id } = useParams();
  const cache = useQueryClient();
  const detail = useQuery({
    queryKey: ['verification-application', id],
    queryFn: () => verificationGet(id!),
  });
  const related = useQuery({
    queryKey: ['verification-related', detail.data?.business.id],
    enabled: !!detail.data,
    queryFn: () => listVerifications({ business_id: detail.data!.business.id }, 1, 100),
  });
  if (detail.isPending) return <State title={tr('Loading verification…')} />;
  if (detail.error) return <Notice error={detail.error} />;
  const value = detail.data!;
  return (
    <div className="verification-workflow av-console">
      <Link className="av-back" to="/admin/verifications">
        <ArrowLeft size={15} />
        {tr('Verification queue')}
      </Link>
      <header className="av-page-heading av-application-heading">
        <div>
          <span className="av-eyebrow">
            <ShieldCheck size={15} />
            {tr('VERIFICATION APPLICATION')}
          </span>
          <h1>{value.business.name}</h1>
          <p>
            {tr('Application revision')} {value.application.revision}{' '}
            <span className="av-inline-separator">/</span>{' '}
            <Status value={value.application.status} />
          </p>
        </div>
        <Link className="av-profile-link" to={`/admin/suppliers/${value.business.id}`}>
          {tr('Supplier details')}
          <ArrowUpRight size={15} />
        </Link>
      </header>
      <div className="av-application-meta">
        <span>
          <Clock3 size={15} />
          {tr('Submitted')}: <strong>{adminDate(value.application.submitted_at)}</strong>
        </span>
        <span>
          <FileCheck2 size={15} />
          {value.files.length} {tr('evidence files')}
        </span>
        <span>
          <ShieldCheck size={15} />
          {tr('Valid until')}: <strong>{value.application.valid_until ?? '—'}</strong>
        </span>
      </div>
      <ReviewForm
        key={`${value.application.id}-${value.application.lock_version}`}
        detail={value}
        onChange={(current) => {
          cache.setQueryData(['verification-application', id], current);
          void cache.invalidateQueries({ queryKey: ['verification-list'] });
          void cache.invalidateQueries({ queryKey: ['verification-related'] });
        }}
      />
      <div className="av-history-grid">
        <section className="av-card av-history">
          <div className="av-card-heading">
            <History size={18} />
            <h2>{tr('Previous decisions')}</h2>
          </div>
          {!value.reviews.length && (
            <p className="av-history-empty">{tr('No decisions have been recorded yet.')}</p>
          )}
          {value.reviews.map((r) => (
            <article key={r.id} className="verification-feedback">
              <strong>
                {tr(r.decision)} · {adminDate(r.created_at)}
              </strong>
              <p>{r.reason}</p>
              {Object.entries(r.sections).map(([key, section]) => (
                <p key={key}>
                  {tr(names[key as VerificationStep] ?? key)}: {tr(section.status)} — {section.note}
                </p>
              ))}
            </article>
          ))}
        </section>
        <section className="av-card av-history">
          <div className="av-card-heading">
            <FileCheck2 size={18} />
            <h2>{tr('Submission history')}</h2>
          </div>
          <Notice error={related.error} />
          {related.data?.rows.map((row) => (
            <Link
              className="verification-history-link"
              key={row.id}
              to={`/admin/verifications/${row.id}`}
            >
              {tr('Application revision')} {row.revision} · {tr(row.status)}
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
