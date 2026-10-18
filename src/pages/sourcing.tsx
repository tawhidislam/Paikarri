import { BuyerOrganizationSummary } from '@/components/growth/organization';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  getRequest,
  listRequests,
  requestFile,
  saveRequest,
  submitRequest,
  variantLabel,
  type requestDetail,
} from '@/lib/buying';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { db } from '@/lib/supabase';
import { money } from '@/lib/utils';
import { prepareImageUpload } from '@/lib/image-upload';
import { formatOrderDate } from '@/lib/orders';
import { Button } from '@/components/ui/button';
import { Field, Notice, State } from '@/components/shared';
import './product.css';
export function SourcingList() {
  const tr = useT();
  const { role, session } = useAuth();
  const base = role === 'super_admin' ? '/admin/requests' : '/dashboard/requests';
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['sourcing-list', session?.user.id, role, page],
    queryFn: () => listRequests(page),
  });
  return (
    <div className="pd-page">
      <h1>{tr('Sourcing requests')}</h1>
      <Link to={role === 'super_admin' ? '/admin/orders' : '/dashboard/quotations'}>
        {tr('Previous quotation history')}
      </Link>
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : list.error ? (
        <>
          <Notice error={list.error} />
          <Button onClick={() => void list.refetch()}>{tr('Try again')}</Button>
        </>
      ) : !list.data?.rows.length ? (
        <State title={tr('No sourcing requests yet')} />
      ) : (
        <>
          <div className="pd-request-list">
            {list.data.rows.map((r) => (
              <Link key={r.id} to={`${base}/${r.id}`}>
                <span className="eyebrow">
                  {tr(r.kind)} · {tr(r.submitted_at ? 'Submitted' : 'Draft')}
                </span>
                <h3>{r.product_name}</h3>
                <p>
                  {r.supplier_name} · {r.buyer_name}
                </p>
                <small>
                  {tr('Revision')} {r.revision}
                </small>
              </Link>
            ))}
          </div>
          <div className="pd-pagination">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              {tr('Previous')}
            </Button>
            <span>{page}</span>
            <Button
              variant="outline"
              disabled={page * 25 >= list.data.total}
              onClick={() => setPage(page + 1)}
            >
              {tr('Next')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function FilePreview({ id, mime }: { id: string; mime: string }) {
  const tr = useT();
  const [url, setUrl] = useState('');
  const action = useMutation({
    mutationFn: () => requestFile(id, mime === 'application/pdf'),
    onSuccess: setUrl,
  });
  return (
    <div className="pd-request-file">
      <Button
        type="button"
        variant="outline"
        onClick={() => action.mutate()}
        disabled={action.isPending}
      >
        {tr(url ? 'Refresh preview' : 'Open attachment')}
      </Button>
      {url &&
        (mime === 'application/pdf' ? (
          <a href={url} target="_blank" rel="noreferrer" download>
            {tr('Download PDF')}
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={tr('Private request attachment')} onError={() => setUrl('')} />
          </a>
        ))}
      <Notice error={action.error} />
    </div>
  );
}
export function SourcingDetail() {
  const { session, role } = useAuth();
  const { id } = useParams();
  const tr = useT();
  const data = useQuery({
    queryKey: ['sourcing-detail', id, session?.user.id, role],
    queryFn: () => getRequest(id!),
  });
  if (data.isPending) return <State title={tr('Loading…')} />;
  if (data.error)
    return (
      <>
        <Notice error={data.error} />
        <Button onClick={() => void data.refetch()}>{tr('Try again')}</Button>
      </>
    );
  return (
    <SourcingWorkspace
      key={`${id}-${data.data!.revision}-${data.data!.revisions.at(-1)?.version}`}
      value={data.data!}
    />
  );
}
function SourcingWorkspace({ value: r }: { value: z.infer<typeof requestDetail> }) {
  const tr = useT();
  const { locale } = useLocale();
  const { role, session } = useAuth();
  const cache = useQueryClient();
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['sourcing-detail', r.id] });
    void cache.invalidateQueries({ queryKey: ['sourcing-list'] });
  };
  const v = r.revisions.at(-1)!;
  const buyer = session?.user.id === r.buyer_id;
  const base = role === 'super_admin' ? '/admin' : '/dashboard';
  const [requirements, setRequirements] = useState(v.requirements);
  const [branding, setBranding] = useState(v.branding);
  const [packaging, setPackaging] = useState(v.packaging);
  const [specifications, setSpecifications] = useState(v.specifications);
  const [district, setDistrict] = useState(v.district);
  const [date, setDate] = useState(v.desired_date ?? '');
  const [lines, setLines] = useState(
    v.lines.map((l) => ({ sku_id: l.sku_id, quantity: l.quantity })),
  );
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(7);
  const [expiry, setExpiry] = useState('');
  const save = useMutation({
    mutationFn: () =>
      saveRequest(r.id, v.version, {
        product_id: r.product_id,
        kind: r.kind,
        requirements,
        branding,
        packaging,
        specifications,
        district,
        desired_date: date || null,
        lines,
      }),
    onSuccess: refresh,
  });
  const submit = useMutation({
    mutationFn: () => submitRequest(r.id, v.version),
    onSuccess: refresh,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const prepared = await prepareImageUpload(file, 'request-attachments');
      const { data, error } = await db().rpc('sourcing_file_prepare', {
        target: r.id,
        mime: prepared.type,
        size: prepared.size,
      });
      if (error) throw error;
      const f = z.object({ id: z.uuid(), path: z.string() }).parse(data);
      const result = await db()
        .storage.from('request-attachments')
        .upload(f.path, prepared, { contentType: prepared.type, upsert: false });
      if (result.error) throw result.error;
      const check = await db().functions.invoke('request-file-validate', { body: { id: f.id } });
      if (check.error || check.data?.error) throw check.error ?? new Error(check.data.error);
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('sourcing_file_remove', { target: id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const offer = useMutation({
    mutationFn: async () => {
      const payload = {
        lines: lines.map((l) => ({
          ...l,
          unit_price: z.number().positive().parse(prices[l.sku_id]),
        })),
        preparation_min: min,
        preparation_max: max,
        notes,
        expires_at: new Date(expiry).toISOString(),
      };
      const { error } = await db().rpc('sourcing_offer_publish', {
        target: r.id,
        expected_revision: r.revision,
        payload,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const dirty =
    requirements !== v.requirements ||
    branding !== v.branding ||
    packaging !== v.packaging ||
    specifications !== v.specifications ||
    district !== v.district ||
    date !== (v.desired_date ?? '') ||
    lines.some((l) => v.lines.find((x) => x.sku_id === l.sku_id)?.quantity !== l.quantity);
  const editable = buyer && !r.offers.some((o) => o.accepted_order_id);
  return (
    <div className="pd-page pd-sourcing-workspace">
      <Link to={`${base}/requests`}>← {tr('Sourcing requests')}</Link>
      <h1>{r.product_name}</h1>
      {role === 'supplier' && <BuyerOrganizationSummary buyer={r.buyer_id} />}
      <p>
        {tr(r.kind)} · {tr('Revision')} {v.revision} · {tr(v.submitted_at ? 'Submitted' : 'Draft')}
      </p>
      <section className="pd-section">
        <h2>{tr('Requirements')}</h2>
        {editable ? (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field label={tr('Your requirements')}>
              <textarea
                required
                minLength={10}
                maxLength={5000}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </Field>
            {lines.map((line, i) => (
              <Field
                key={line.sku_id}
                label={
                  variantLabel(v.lines.find((l) => l.sku_id === line.sku_id)?.options ?? {}) ||
                  tr('Standard')
                }
              >
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines(
                      lines.map((l, j) =>
                        j === i ? { ...l, quantity: e.target.valueAsNumber } : l,
                      ),
                    )
                  }
                />
              </Field>
            ))}
            <div className="form-grid">
              <Field label={tr('Delivery district')}>
                <input
                  required
                  maxLength={80}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </Field>
              <Field label={tr('Desired date')}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            {r.kind === 'customization' &&
              [
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
            <Button disabled={save.isPending}>
              {tr(v.submitted_at ? 'Create corrected revision' : 'Save draft')}
            </Button>
            <Notice error={save.error} />
          </form>
        ) : (
          <>
            <p className="preserve-lines">{v.requirements}</p>
            <p>
              {tr('Delivery district')}: {tr(v.district)} · {v.desired_date}
            </p>
            {[v.branding, v.packaging, v.specifications].filter(Boolean).map((text, i) => (
              <p key={i} className="preserve-lines">
                {text}
              </p>
            ))}
            <ul>
              {v.lines.map((l) => (
                <li key={l.sku_id}>
                  {variantLabel(l.options) || tr('Standard')} × {l.quantity}
                </li>
              ))}
            </ul>
          </>
        )}
        {r.kind === 'customization' && (
          <>
            <h3>{tr('Private attachments')}</h3>
            <p>{tr('Only you, the supplier and the super admin can access these files.')}</p>
            {buyer && !v.submitted_at && (
              <Field label={tr('Add attachment')}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={upload.isPending || v.files.length >= 5}
                  onChange={(e) => {
                    if (e.target.files?.[0]) upload.mutate(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
              </Field>
            )}
            <Notice error={upload.error ?? remove.error} />
            <div className="pd-files">
              {v.files.map((f) => (
                <div key={f.id}>
                  <FilePreview id={f.id} mime={f.mime} />
                  <small>{tr(f.verified ? 'Validated' : 'Validation incomplete')}</small>
                  {buyer && !v.submitted_at && (
                    <Button
                      variant="outline"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(f.id)}
                    >
                      {tr('Remove')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {buyer && !v.submitted_at && (
          <div className="pd-submit-request">
            <p>
              {tr('Save changes before submitting. Submitted information and files are frozen.')}
            </p>
            <Button
              disabled={submit.isPending || upload.isPending || dirty}
              onClick={() => submit.mutate()}
            >
              {tr('Submit to supplier')}
            </Button>
            <Notice error={submit.error} />
          </div>
        )}
      </section>
      {role === 'supplier' && v.submitted_at && !r.offers.some((o) => o.accepted_order_id) && (
        <section className="pd-section">
          <h2>{tr('Publish supplier offer')}</h2>
          <p>
            {tr(
              'Include customization and setup charges in unit prices. Delivery is confirmed after checkout.',
            )}
          </p>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              offer.mutate();
            }}
          >
            {v.lines.map((l) => (
              <Field
                key={l.sku_id}
                label={`${variantLabel(l.options) || tr('Standard')} × ${l.quantity} · ${tr('Unit price (BDT)')}`}
              >
                <input
                  required
                  type="number"
                  min={0.01}
                  step=".01"
                  value={prices[l.sku_id] ?? ''}
                  onChange={(e) => setPrices({ ...prices, [l.sku_id]: e.target.valueAsNumber })}
                />
              </Field>
            ))}
            <div className="form-grid">
              <Field label={tr('Preparation minimum (days)')}>
                <input
                  type="number"
                  required
                  min={0}
                  max={365}
                  value={min}
                  onChange={(e) => setMin(e.target.valueAsNumber)}
                />
              </Field>
              <Field label={tr('Preparation maximum (days)')}>
                <input
                  type="number"
                  required
                  min={min}
                  max={365}
                  value={max}
                  onChange={(e) => setMax(e.target.valueAsNumber)}
                />
              </Field>
              <Field label={tr('Offer expiry')}>
                <input
                  required
                  type="datetime-local"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </Field>
            </div>
            <Field label={tr('Offer notes')}>
              <textarea maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button disabled={offer.isPending}>{tr('Publish offer')}</Button>
            <Notice error={offer.error} />
          </form>
        </section>
      )}
      <section className="pd-section">
        <h2>{tr('Offers')}</h2>
        {!r.offers.length && <p>{tr('No supplier offer yet')}</p>}
        {r.offers.map((o, i) => (
          <article className="pd-offer" key={o.id}>
            <h3>
              {tr('Offer')} #{o.revision}
            </h3>
            <p>
              {tr('Request revision')}: {o.request_revision}
            </p>
            <p>
              {o.preparation_min}–{o.preparation_max} {tr('days preparation estimate')}
            </p>
            {o.lines.map((l) => (
              <p key={l.sku_id}>
                {variantLabel(
                  r.revisions
                    .find((rv) => rv.revision === o.request_revision)
                    ?.lines.find((x) => x.sku_id === l.sku_id)?.options ?? {},
                ) || tr('Standard')}{' '}
                × {l.quantity} · {money(l.unit_price, locale)} / {tr('unit')}
              </p>
            ))}
            <strong>
              {money(
                o.lines.reduce((n, l) => n + l.quantity * l.unit_price, 0),
                locale,
              )}
            </strong>
            <p className="preserve-lines">{o.notes}</p>
            <p>
              {tr('Expires')}: {formatOrderDate(o.expires_at, locale)}
            </p>
            {o.accepted_order_id ? (
              <Link to={`${base}/orders/${o.accepted_order_id}`}>{tr('View order')} →</Link>
            ) : (
              buyer &&
              i === 0 &&
              o.request_revision === r.revision &&
              Date.parse(o.expires_at) > Date.now() && (
                <Button asChild>
                  <Link to={`/checkout?request=${r.id}&offer=${o.id}`}>
                    {tr('Accept offer & checkout')}
                  </Link>
                </Button>
              )
            )}
          </article>
        ))}
      </section>
      {r.revisions.length > 1 && (
        <section className="pd-section">
          <h2>{tr('Previous revisions')}</h2>
          {r.revisions.slice(0, -1).map((rv) => (
            <details key={rv.revision}>
              <summary>
                {tr('Revision')} {rv.revision}
              </summary>
              <p className="preserve-lines">{rv.requirements}</p>
              <p>{rv.branding}</p>
              <p>{rv.packaging}</p>
              <p>{rv.specifications}</p>
              <p>
                {rv.district} · {rv.desired_date}
              </p>
              {rv.files.map((f) => (
                <FilePreview key={f.id} id={f.id} mime={f.mime} />
              ))}
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
