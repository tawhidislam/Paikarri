import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useT } from '@/lib/i18n';
import {
  verificationState,
  startVerification,
  saveVerificationStep,
  submitVerification,
  verificationGet,
} from '@/lib/verification';
import {
  identityDraft,
  tradeDraft,
  bankDraft,
  stepErrors,
  type VerificationDetail,
  type VerificationStep,
} from '@/lib/verification-schema';
import {
  VerificationEvidence,
  VerificationValues,
  verificationLabels,
  evidenceComplete,
} from '@/components/verification-details';
import { Button } from '@/components/ui/button';
import { Field, Notice, State, useTitle } from '@/components/shared';
import './verification.css';
const steps: VerificationStep[] = ['identity', 'trade_license', 'bank'];
const stepNames = ['Owner identity', 'Trade licence', 'Bank account', 'Review and submit'];
const fields: Record<VerificationStep, string[]> = {
  identity: [
    'legal_name',
    'dob',
    'address',
    'issuing_country',
    'document_type',
    'document_number',
    'issued_on',
    'no_expiry',
    'expires_on',
  ],
  trade_license: [
    'license_number',
    'business_name',
    'owner_name',
    'issuing_authority',
    'business_address',
    'issued_on',
    'expires_on',
  ],
  bank: [
    'bank_name',
    'branch_name',
    'account_title',
    'account_number',
    'account_type',
    'holder_type',
    'routing_number',
  ],
};
const options: Record<string, string[]> = {
  document_type: ['nid', 'driving_license', 'passport'],
  account_type: ['current', 'savings'],
  holder_type: ['business', 'owner'],
};
function StepEditor({
  detail,
  step,
  onChange,
  next,
}: {
  detail: VerificationDetail;
  step: VerificationStep;
  onChange: (d: VerificationDetail) => void;
  next: () => void;
}) {
  const tr = useT();
  const form = useForm<Record<string, string | boolean>>({
    defaultValues: detail[step] as unknown as Record<string, string | boolean>,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [missing, setMissing] = useState<string[]>([]);
  const schema =
    step === 'identity' ? identityDraft : step === 'trade_license' ? tradeDraft : bankDraft;
  const save = async (continueNext = false) => {
    setBusy(true);
    setError(undefined);
    setMissing([]);
    try {
      const values = form.getValues();
      if (step === 'identity' && values.document_type !== 'nid') values.no_expiry = false;
      if (step === 'identity' && values.no_expiry) values.expires_on = '';
      const parsed = schema.parse(values);
      const saved = await saveVerificationStep(detail, step, parsed);
      onChange(saved);
      form.reset(saved[step] as unknown as Record<string, string | boolean>);
      if (continueNext) {
        const problems = stepErrors(step, parsed);
        setMissing(problems);
        if (problems.length)
          throw new Error(tr('Complete the highlighted information before continuing.'));
        if (!evidenceComplete(saved, step))
          throw new Error(tr('Upload all required evidence before continuing.'));
        next();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel verification-step">
      <h3>{tr(stepNames[steps.indexOf(step)])}</h3>
      <form onSubmit={form.handleSubmit(() => save())}>
        <div className="form-grid">
          {fields[step].map((key) => {
            if (key === 'no_expiry' && form.watch('document_type') !== 'nid') return null;
            if (
              key === 'expires_on' &&
              step === 'identity' &&
              form.watch('document_type') === 'nid' &&
              form.watch('no_expiry')
            )
              return null;
            return (
              <Field
                key={key}
                label={tr(verificationLabels[key])}
                error={
                  missing.includes(key)
                    ? tr('Required information is missing or the date is invalid.')
                    : undefined
                }
              >
                {key === 'no_expiry' ? (
                  <input type="checkbox" {...form.register(key)} />
                ) : options[key] ? (
                  <select {...form.register(key)}>
                    {options[key].map((v) => (
                      <option value={v} key={v}>
                        {tr(v)}
                      </option>
                    ))}
                  </select>
                ) : ['address', 'business_address'].includes(key) ? (
                  <textarea rows={3} maxLength={1000} {...form.register(key)} />
                ) : (
                  <input
                    type={['dob', 'issued_on', 'expires_on'].includes(key) ? 'date' : 'text'}
                    maxLength={key === 'document_number' || key === 'account_number' ? 80 : 200}
                    autoComplete="off"
                    {...form.register(key)}
                  />
                )}
              </Field>
            );
          })}
        </div>
        <Notice error={error} />
        <Button type="submit" disabled={busy}>
          {tr(busy ? 'Saving…' : 'Save draft')}
        </Button>
      </form>
      {form.formState.isDirty && (
        <p className="verification-hint" role="status">
          {tr('Save these details before uploading documents.')}
        </p>
      )}
      <VerificationEvidence
        detail={detail}
        step={step}
        onChange={onChange}
        disabled={busy || form.formState.isDirty}
      />
      <div className="verification-actions">
        <Button type="button" disabled={busy} onClick={() => void save(true)}>
          {tr(step === 'bank' ? 'Review application' : 'Save and continue')}
        </Button>
      </div>
    </div>
  );
}
export default function SupplierVerification() {
  const tr = useT();
  useTitle('Supplier verification');
  const cache = useQueryClient();
  const state = useQuery({
    queryKey: ['verification-state'],
    queryFn: verificationState,
    refetchOnWindowFocus: true,
  });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [declaration, setDeclaration] = useState(false);
  const [history, setHistory] = useState<VerificationDetail>();
  const detail = history ?? state.data?.current;
  const changed = (current: VerificationDetail) => {
    cache.setQueryData(['verification-state'], (old: typeof state.data) =>
      old
        ? {
            ...old,
            current,
            history: old.history.map((a) =>
              a.id === current.application.id ? current.application : a,
            ),
          }
        : old,
    );
  };
  const start = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const current = await startVerification();
      setHistory(undefined);
      setStep(0);
      setDeclaration(false);
      await cache.invalidateQueries({ queryKey: ['verification-state'] });
      changed(current);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  if (state.isPending) return <State title={tr('Loading verification…')} />;
  if (state.isError)
    return (
      <div className="verification-workflow">
        <Notice error={state.error} />
        <Button onClick={() => void state.refetch()}>{tr('Try again')}</Button>
      </div>
    );
  if (!state.data.business)
    return (
      <State
        title={tr('Create your business profile first')}
        action={<Link to="/dashboard/business">{tr('Set up business ↗')}</Link>}
      />
    );
  const editable = detail?.application.status === 'draft' && !history;
  const complete =
    detail &&
    steps.every((s) => stepErrors(s, detail[s]).length === 0 && evidenceComplete(detail, s));
  // Only saved, valid details with all required evidence unlock the next step.
  const firstIncomplete = detail
    ? steps.findIndex((s) => stepErrors(s, detail[s]).length > 0 || !evidenceComplete(detail, s))
    : 0;
  const unlockedStep = firstIncomplete === -1 ? 3 : firstIncomplete;
  const activeStep = Math.min(step, unlockedStep);
  return (
    <div className="verification-workflow">
      <header className="verification-heading">
        <div>
          <h1>{tr('Supplier verification')}</h1>
          <p>
            {tr(
              'Complete owner identity, trade licence and bank verification. Only you and the super admin can access your documents.',
            )}
          </p>
        </div>
        <span className={`status-badge ${detail?.application.status ?? ''}`}>
          {tr(detail?.application.status ?? 'Not started')}
        </span>
      </header>
      <Notice error={error} />
      {!detail ? (
        <div className="panel">
          <p>{tr('Prepare your owner ID, trade licence and bank proof before starting.')}</p>
          <Button onClick={() => void start()} disabled={busy}>
            {tr('Start verification')}
          </Button>
        </div>
      ) : (
        <>
          <p>
            {tr('Application revision')} {detail.application.revision}
            {detail.application.valid_until
              ? ` · ${tr('Valid until')}: ${detail.application.valid_until}`
              : ''}
          </p>
          {detail.reviews.map((review) => (
            <section className="panel verification-feedback" key={review.id}>
              <h3>{tr(review.decision)}</h3>
              {review.reason && <p>{review.reason}</p>}
              {Object.entries(review.sections).map(([s, v]) => (
                <p key={s}>
                  <strong>
                    {tr(stepNames[steps.indexOf(s as VerificationStep)] ?? s)}: {tr(v.status)}
                  </strong>
                  {v.note && ` — ${v.note}`}
                </p>
              ))}
            </section>
          ))}
          {editable ? (
            <>
              <nav className="verification-stepper" aria-label={tr('Verification steps')}>
                {stepNames.map((name, i) => (
                  <button
                    key={name}
                    aria-current={activeStep === i ? 'step' : undefined}
                    disabled={i > unlockedStep}
                    onClick={() => setStep(i)}
                  >
                    {i + 1}. {tr(name)}
                  </button>
                ))}
              </nav>
              {activeStep < 3 ? (
                <StepEditor
                  key={`${detail.application.id}-${activeStep}`}
                  detail={detail}
                  step={steps[activeStep]}
                  onChange={changed}
                  next={() => setStep(activeStep + 1)}
                />
              ) : (
                <section className="panel">
                  <h2>{tr('Review and submit')}</h2>
                  {steps.map((s) => (
                    <section key={s} className="verification-review-section">
                      <h3>{tr(stepNames[steps.indexOf(s)])}</h3>
                      <VerificationValues detail={detail} step={s} />
                      <VerificationEvidence detail={detail} step={s} />
                    </section>
                  ))}
                  {!complete && (
                    <p role="alert">
                      {tr('Complete all three steps and required evidence before submitting.')}
                    </p>
                  )}
                  <label className="verification-declaration">
                    <input
                      type="checkbox"
                      checked={declaration}
                      onChange={(e) => setDeclaration(e.target.checked)}
                    />
                    {tr(
                      'I am authorized to submit these documents and confirm that the information is accurate.',
                    )}
                  </label>
                  <Button
                    disabled={busy || !complete || !declaration}
                    onClick={async () => {
                      setBusy(true);
                      setError(undefined);
                      try {
                        changed(await submitVerification(detail, declaration));
                        setDeclaration(false);
                        await cache.invalidateQueries({ queryKey: ['verification-state'] });
                      } catch (e) {
                        setError(e);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {tr('Submit complete application')}
                  </Button>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="panel">
                <p>
                  {tr(
                    detail.application.status === 'submitted'
                      ? 'Your complete application is awaiting super admin review. Submitted evidence is locked.'
                      : 'Review the decision below and submit a new revision when corrections or renewal are needed.',
                  )}
                </p>
                {!history && detail.application.status !== 'submitted' && (
                  <Button onClick={() => void start()} disabled={busy}>
                    {tr(
                      detail.application.status === 'approved'
                        ? 'Prepare renewal'
                        : 'Create corrected revision',
                    )}
                  </Button>
                )}
                {history && (
                  <Button variant="outline" onClick={() => setHistory(undefined)}>
                    {tr('Back to current application')}
                  </Button>
                )}
              </div>
              {steps.map((s) => (
                <section key={s} className="panel verification-review-section">
                  <h3>{tr(stepNames[steps.indexOf(s)])}</h3>
                  <VerificationValues detail={detail} step={s} masked />
                  <VerificationEvidence detail={detail} step={s} />
                </section>
              ))}
            </>
          )}
        </>
      )}
      <section className="panel">
        <h2>{tr('Submission history')}</h2>
        {state.data.history.map((a) => (
          <button
            type="button"
            className="verification-history-link"
            key={a.id}
            onClick={async () => {
              setError(undefined);
              try {
                setHistory(await verificationGet(a.id));
              } catch (e) {
                setError(e);
              }
            }}
          >
            {tr('Application revision')} {a.revision} · {tr(a.status)} · {a.created_at.slice(0, 10)}
          </button>
        ))}
        {state.data.legacy.length > 0 && (
          <p>
            {tr(
              'Previous single-document submissions are retained as private history and do not grant complete verification.',
            )}
          </p>
        )}
      </section>
    </div>
  );
}
