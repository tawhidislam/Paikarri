import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, FileText, Upload, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { signedImage } from '@/lib/catalog';
import { uploadVerificationFile, removeVerificationFile } from '@/lib/verification';
import type { VerificationDetail, VerificationStep } from '@/lib/verification-schema';
import { Button } from './ui/button';
import { Notice } from './shared';
export const verificationLabels: Record<string, string> = {
  legal_name: 'Legal name',
  dob: 'Date of birth',
  address: 'Residential address',
  issuing_country: 'Issuing country',
  document_type: 'Identity document type',
  document_number: 'Document number',
  issued_on: 'Issue date',
  expires_on: 'Expiry / valid-until date',
  no_expiry: 'No expiry printed on NID',
  license_number: 'Trade licence number',
  business_name: 'Registered business name',
  owner_name: 'Proprietor / owner name',
  issuing_authority: 'Issuing authority',
  business_address: 'Licensed business address',
  bank_name: 'Bank name',
  branch_name: 'Branch',
  account_title: 'Account title',
  account_number: 'Account number',
  account_type: 'Account type',
  holder_type: 'Account belongs to',
  routing_number: 'Routing number (if applicable)',
  identity_front: 'Identity front / passport identity page',
  identity_back: 'Identity back',
  trade_license: 'Trade licence',
  bank_proof: 'Chequebook account-information page / unsigned cheque leaf',
};
export function evidenceComplete(detail: VerificationDetail, step: VerificationStep) {
  const count = (slot: string) => detail.files.filter((f) => f.slot === slot).length;
  return step === 'identity'
    ? count('identity_front') === 1 &&
        (detail.identity.document_type === 'passport' || count('identity_back') === 1)
    : step === 'trade_license'
      ? count('trade_license') >= 1
      : count('bank_proof') === 1;
}
export function VerificationValues({
  detail,
  step,
  masked = false,
}: {
  detail: VerificationDetail;
  step: VerificationStep;
  masked?: boolean;
}) {
  const tr = useT();
  return (
    <dl className="verification-values">
      {Object.entries(detail[step])
        .filter(([k]) => k !== 'application_id')
        .map(([key, value]) => (
          <div key={key}>
            <dt>{tr(verificationLabels[key] ?? key)}</dt>
            <dd>
              {typeof value === 'boolean'
                ? tr(value ? 'Yes' : 'No')
                : value
                  ? masked && ['document_number', 'account_number'].includes(key)
                    ? `•••• ${String(value).slice(-4)}`
                    : tr(String(value))
                  : tr('Not provided')}
            </dd>
          </div>
        ))}
    </dl>
  );
}
function PrivateThumbnail({ file }: { file: VerificationDetail['files'][number] }) {
  const tr = useT();
  const preview = useQuery({
    queryKey: ['verification-thumbnail', file.id],
    queryFn: () => signedImage(file.object_path, 'business-documents'),
    enabled: file.mime_type !== 'application/pdf',
    gcTime: 0,
    staleTime: 0,
    refetchInterval: 240000,
    refetchOnWindowFocus: 'always',
  });
  const [failed, setFailed] = useState(false);
  return (
    <span className="av-document-thumbnail">
      {file.mime_type === 'application/pdf' ? (
        <FileText size={28} />
      ) : preview.data && !failed ? (
        <img
          loading="lazy"
          src={preview.data}
          alt={tr(verificationLabels[file.slot] ?? 'Verification document')}
          onError={() => setFailed(true)}
        />
      ) : (
        <FileText size={25} />
      )}
      <span>{file.mime_type === 'application/pdf' ? 'PDF' : tr('Image')}</span>
    </span>
  );
}
export function VerificationEvidence({
  detail,
  step,
  onChange,
  disabled = false,
  compact = false,
}: {
  detail: VerificationDetail;
  step: VerificationStep;
  onChange?: (detail: VerificationDetail) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const tr = useT();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [selected, setSelected] = useState<VerificationDetail['files'][number]>();
  const cache = useQueryClient();
  const image = useQuery({
    queryKey: ['verification-preview', selected?.id],
    enabled: !!selected,
    queryFn: () => signedImage(selected!.object_path, 'business-documents'),
    gcTime: 0,
    staleTime: 0,
    refetchInterval: 240000,
    refetchOnWindowFocus: 'always',
  });
  const dialog = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = opener.current;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelected(undefined);
      }
      if (event.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          'button,a[href],iframe,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [selected]);
  const editable = detail.application.status === 'draft' && !!onChange;
  const slots =
    step === 'identity'
      ? [
          'identity_front',
          ...(detail.identity.document_type === 'passport' ? [] : ['identity_back']),
        ]
      : step === 'trade_license'
        ? ['trade_license']
        : ['bank_proof'];
  return (
    <div className={`verification-evidence ${compact ? 'av-evidence' : ''}`}>
      {!compact && (
        <p className="muted">
          {tr(
            'Images are compressed automatically. Check that all text remains readable. PDFs are unchanged.',
          )}
        </p>
      )}
      <Notice error={error} />
      {slots.map((slot) => {
        const files = detail.files.filter((f) => f.slot === slot);
        const max = slot === 'trade_license' ? 5 : 1;
        return (
          <section key={slot} className="verification-file-slot">
            <h4>{tr(verificationLabels[slot])}</h4>
            {!compact && (
              <p className="muted">
                {tr(
                  slot === 'trade_license'
                    ? 'Images or PDF. Up to five files, 10 MB each.'
                    : 'JPEG, PNG or WebP. Up to 10 MB.',
                )}
              </p>
            )}
            {compact && files.length === 0 && (
              <p className="av-missing-evidence">{tr('No evidence uploaded')}</p>
            )}
            {files.map((file, index) => (
              <div className="verification-file-row" key={file.id}>
                {compact ? <PrivateThumbnail file={file} /> : <FileText size={18} />}
                <span className="av-document-description">
                  {tr('Document')} {index + 1} · {(file.file_size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(event) => {
                    opener.current = event.currentTarget;
                    setSelected(file);
                  }}
                >
                  {tr('Preview')}
                </Button>
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={tr('Remove document')}
                    disabled={busy || disabled}
                    onClick={async () => {
                      setBusy(true);
                      setError(undefined);
                      try {
                        onChange?.(await removeVerificationFile(detail, file.id));
                      } catch (e) {
                        setError(e);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
            {editable && files.length < max && (
              <label className="verification-upload">
                <Upload size={17} />
                {tr(busy ? 'Uploading…' : 'Upload document')}
                <input
                  aria-label={tr(verificationLabels[slot])}
                  disabled={busy || disabled}
                  type="file"
                  multiple={max > 1}
                  accept={
                    slot === 'trade_license'
                      ? 'image/jpeg,image/png,image/webp,application/pdf'
                      : 'image/jpeg,image/png,image/webp'
                  }
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (!files.length) return;
                    setBusy(true);
                    setError(undefined);
                    try {
                      let latest = detail;
                      for (const file of files)
                        latest = await uploadVerificationFile(latest, slot, file, session!.user.id);
                      onChange?.(latest);
                    } catch (e) {
                      setError(e);
                      void cache.invalidateQueries({ queryKey: ['verification-state'] });
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
            )}
          </section>
        );
      })}
      {selected && (
        <div className="verification-dialog-backdrop">
          <section
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={tr('Private document preview')}
            className="verification-preview"
          >
            <header>
              <h3>{tr('Private document preview')}</h3>
              <Button
                type="button"
                variant="ghost"
                aria-label={tr('Close preview')}
                autoFocus
                onClick={() => setSelected(undefined)}
              >
                <X />
              </Button>
            </header>
            <Notice error={image.error} />
            {image.isPending ? (
              <p role="status">{tr('Loading image')}</p>
            ) : image.data ? (
              <>
                {selected.mime_type === 'application/pdf' ? (
                  <iframe title={tr('Private PDF document')} sandbox="" src={image.data} />
                ) : (
                  <img
                    src={image.data}
                    alt={tr(verificationLabels[selected.slot] ?? 'Verification document')}
                  />
                )}
                <a href={image.data} target="_blank" rel="noopener noreferrer">
                  {tr('Open document in a new tab')}
                </a>
                <p className="muted">{tr('This private link expires after five minutes.')}</p>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
