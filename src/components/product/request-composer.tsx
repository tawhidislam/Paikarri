import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { locations } from '@/lib/locations';
import { saveRequest, variantLabel, type ProductOptions, type Selection } from '@/lib/buying';
import type { Listing } from '@/lib/catalog';
import { Button } from '../ui/button';
import { Field, Notice } from '../shared';
export function RequestComposer({
  product: p,
  options,
  selections,
}: {
  product: Listing;
  options: ProductOptions;
  selections: Selection[];
}) {
  const tr = useT();
  const { session, role, status } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState<'wholesale' | 'sample' | 'customization' | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (kind && !modal.current?.open) modal.current?.showModal();
    if (!kind && modal.current?.open) modal.current.close();
  }, [kind]);
  const [requirements, setRequirements] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [date, setDate] = useState('');
  const [branding, setBranding] = useState('');
  const [packaging, setPackaging] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const start = (value: NonNullable<typeof kind>) => {
    if (!session) {
      navigate(`/auth/login?next=${encodeURIComponent(`/products/${p.id}`)}`);
      return;
    }
    save.reset();
    setKind(value);
    setRequirements(`${p.name}: ${p.description}`.slice(0, 5000));
    setSpecifications(JSON.stringify(p.specifications ?? {}, null, 2).slice(0, 2000));
    setQuantities(
      Object.fromEntries(
        options.skus
          .filter((s) => s.active)
          .map((s, i) => [
            s.id,
            value === 'sample'
              ? i === 0
                ? 1
                : 0
              : (selections.find((r) => r.sku_id === s.id)?.quantity ??
                (i === 0
                  ? value === 'customization'
                    ? Math.max(p.moq, options.sourcing.customization_moq)
                    : p.moq
                  : 0)),
          ]),
      ),
    );
  };
  const save = useMutation({
    mutationFn: () =>
      saveRequest(null, 0, {
        product_id: p.id,
        kind: kind!,
        requirements,
        district,
        desired_date: date || null,
        branding,
        packaging,
        specifications,
        lines: Object.entries(quantities)
          .filter(([, n]) => n > 0)
          .map(([sku_id, quantity]) => ({ sku_id, quantity })),
      }),
    onSuccess: (id) => navigate(`/dashboard/requests/${id}`),
  });
  if (role && role !== 'buyer') return null;
  return (
    <div className="pd-request">
      <div className="pd-request-buttons">
        <Button
          variant="outline"
          disabled={status?.status === 'suspended'}
          onClick={() => start('wholesale')}
        >
          {tr('Request quotation')}
        </Button>
        {options.sourcing.samples_enabled && (
          <Button
            variant="outline"
            disabled={status?.status === 'suspended'}
            onClick={() => start('sample')}
          >
            {tr('Request sample')}
          </Button>
        )}
        {options.sourcing.customization_enabled && (
          <Button
            variant="outline"
            disabled={status?.status === 'suspended'}
            onClick={() => start('customization')}
          >
            {tr('Request customization')}
          </Button>
        )}
      </div>
      <dialog
        ref={modal}
        className="growth-request-dialog"
        onCancel={() => setKind(null)}
        aria-labelledby="quick-request-title"
      >
        {kind && (
          <form
            className="form-stack pd-request-form"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <h3 id="quick-request-title">
              {tr(
                kind === 'sample'
                  ? 'Request sample'
                  : kind === 'customization'
                    ? 'Request customization'
                    : 'Request quotation',
              )}
            </h3>
            <div className="pd-request-buttons">
              {(['wholesale', 'sample', 'customization'] as const)
                .filter(
                  (k) =>
                    k === 'wholesale' ||
                    (k === 'sample'
                      ? options.sourcing.samples_enabled
                      : options.sourcing.customization_enabled),
                )
                .map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={kind === k ? 'default' : 'outline'}
                    aria-pressed={kind === k}
                    onClick={() => start(k)}
                  >
                    {tr(
                      k === 'wholesale'
                        ? 'Request quotation'
                        : k === 'sample'
                          ? 'Request sample'
                          : 'Request customization',
                    )}
                  </Button>
                ))}
            </div>
            <p className="muted">
              {tr('Supplier approval is required. No stock is reserved until offer checkout.')}
            </p>
            {options.skus
              .filter((s) => s.active)
              .map((s) => (
                <Field key={s.id} label={variantLabel(s.options) || tr('Standard')}>
                  <input
                    type="number"
                    min={0}
                    max={kind === 'sample' ? options.sourcing.sample_limit : 1000000}
                    value={quantities[s.id] ?? 0}
                    onChange={(e) =>
                      setQuantities({ ...quantities, [s.id]: e.target.valueAsNumber })
                    }
                  />
                </Field>
              ))}
            <Field label={tr('Your requirements')}>
              <textarea
                required
                minLength={10}
                maxLength={5000}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label={tr('Delivery district')}>
                <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                  {Object.values(locations)
                    .flat()
                    .sort()
                    .map((d) => (
                      <option key={d} value={d}>
                        {tr(d)}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={tr('Desired date')}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            {kind === 'customization' && (
              <>
                {[
                  [tr('Branding requirements'), branding, setBranding],
                  [tr('Packaging requirements'), packaging, setPackaging],
                  [tr('Specification requirements'), specifications, setSpecifications],
                ].map(([label, value, set]) => (
                  <Field key={String(label)} label={String(label)}>
                    <textarea
                      maxLength={2000}
                      value={String(value)}
                      onChange={(e) => (set as (v: string) => void)(e.target.value)}
                    />
                  </Field>
                ))}
                <p>
                  {tr('Save the draft to add private attachments and review before submitting.')}
                </p>
              </>
            )}
            <Notice error={save.error} />
            <div className="pd-request-buttons">
              <Button disabled={save.isPending}>{tr('Continue request')}</Button>
              <Button type="button" variant="outline" onClick={() => setKind(null)}>
                {tr('Cancel')}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
