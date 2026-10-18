import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useT, useLocale } from '@/lib/i18n';
import { db } from '@/lib/supabase';
import { categories } from '@/lib/catalog';
import { growthDb } from '@/lib/growth';
import { tenderInput, tenderList, tenderRead, type tenderDetail } from '@/lib/tenders';
import { locations } from '@/lib/locations';
import { productOptions, variantLabel } from '@/lib/buying';
import { money } from '@/lib/utils';
import { formatQuantity, formatUnit } from '@/lib/units';
import { SectionTitle, Field, Notice, State } from '@/components/shared';
import { Button } from '@/components/ui/button';
export default function Tenders({ admin = false }: { admin?: boolean }) {
  const tr = useT();
  const { locale } = useLocale();
  const { role, session } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const view = admin ? 'review' : params.get('view') === 'mine' ? 'mine' : 'open';
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const [create, setCreate] = useState(false);
  const cats = useQuery({ queryKey: ['categories'], queryFn: categories });
  const list = useQuery({
    queryKey: ['tenders', view, search, page, category, session?.user.id],
    queryFn: () => tenderList(view, search, page, category || undefined),
  });
  const update = (key: string, value: string) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (value) n.set(key, value);
      else n.delete(key);
      n.delete('page');
      return n;
    });
  return (
    <div className={admin ? 'growth-panel' : 'container page-content'}>
      <SectionTitle
        heading="h1"
        title={tr(admin ? 'Tender moderation' : 'Open sourcing tenders')}
        description={tr(
          'Post requirements, compare sealed supplier bids, and review delivery terms before checkout.',
        )}
      />
      {!admin && (
        <div className="pd-request-buttons">
          <Button asChild variant="outline">
            <Link to="/products">{tr('Browse products')}</Link>
          </Button>
          {role === 'buyer' ? (
            <>
              <Button
                variant="outline"
                onClick={() => update('view', view === 'mine' ? '' : 'mine')}
              >
                {tr(view === 'mine' ? 'Open tenders' : 'My tenders')}
              </Button>
              <Button onClick={() => setCreate(!create)}>{tr('Post a tender')}</Button>
            </>
          ) : role === 'supplier' ? (
            <p>{tr('Open a tender to submit a sealed bid.')}</p>
          ) : !role ? (
            <Link to="/auth/login?next=%2Ftenders">{tr('Sign in to participate')}</Link>
          ) : null}
        </div>
      )}
      {create && <TenderForm categories={cats.data ?? []} onClose={() => setCreate(false)} />}
      <div className="supplier-filters">
        <Field label={tr('Search tenders')}>
          <input
            type="search"
            value={search}
            maxLength={200}
            onChange={(e) => update('q', e.target.value)}
          />
        </Field>
        <Field label={tr('Category')}>
          <select value={category} onChange={(e) => update('category', e.target.value)}>
            <option value="">{tr('All categories')}</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === 'bn' && c.name_bn ? c.name_bn : c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Notice error={list.error ?? cats.error} />
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : list.isError ? (
        <Button onClick={() => void list.refetch()}>{tr('Try again')}</Button>
      ) : !list.data?.rows.length ? (
        <State title={tr('No tenders found')} />
      ) : (
        <div className="pd-request-list">
          {list.data.rows.map((t) => (
            <Link key={t.id} to={`${admin ? '/admin' : ''}/tenders/${t.id}`}>
              <h2>{t.title}</h2>
              <p>
                {formatQuantity(t.quantity, t.unit, locale)} · {tr(t.district)}
              </p>
              <small>
                {tr('Delivery date')}: {t.delivery_date} · {tr(t.moderation)} · {tr(t.status)}
              </small>
            </Link>
          ))}
        </div>
      )}
      <div className="pagination">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() =>
            setParams((p) => {
              p.set('page', String(page - 1));
              return p;
            })
          }
        >
          {tr('Previous')}
        </Button>
        <span>{page}</span>
        <Button
          variant="outline"
          disabled={page * 25 >= (list.data?.total ?? 0)}
          onClick={() =>
            setParams((p) => {
              p.set('page', String(page + 1));
              return p;
            })
          }
        >
          {tr('Next')}
        </Button>
      </div>
    </div>
  );
}
function TenderForm({
  categories: cats,
  onClose,
}: {
  categories: { id: string; name: string; name_bn?: string }[];
  onClose: () => void;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [value, set] = useState({
    title: '',
    requirements: '',
    category_id: '',
    quantity: 100,
    unit: 'piece',
    district: 'Dhaka',
    delivery_date: '',
    expires_at: '',
  });
  const save = useMutation({
    mutationFn: async () => {
      const payload = tenderInput.parse({
        ...value,
        expires_at: new Date(value.expires_at).toISOString(),
      });
      const { data, error } = await growthDb().rpc('tender_create', { payload });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => navigate(`/tenders/${id}`),
  });
  return (
    <form
      className="panel growth-panel form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2>{tr('Post a tender')}</h2>
      <p>
        {tr(
          'Do not include private contact details or documents. Posts require moderation before appearing publicly.',
        )}
      </p>
      <Field label={tr('Title')}>
        <input
          required
          minLength={5}
          maxLength={200}
          value={value.title}
          onChange={(e) => set({ ...value, title: e.target.value })}
        />
      </Field>
      <Field label={tr('Requirements')}>
        <textarea
          required
          minLength={20}
          maxLength={5000}
          value={value.requirements}
          onChange={(e) => set({ ...value, requirements: e.target.value })}
        />
      </Field>
      <div className="form-grid">
        <Field label={tr('Category')}>
          <select
            required
            value={value.category_id}
            onChange={(e) => set({ ...value, category_id: e.target.value })}
          >
            <option value="">{tr('Choose category')}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === 'bn' && c.name_bn ? c.name_bn : c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr('Quantity')}>
          <input
            type="number"
            required
            min="1"
            max="1000000"
            value={value.quantity}
            onChange={(e) => set({ ...value, quantity: e.target.valueAsNumber })}
          />
        </Field>
        <Field label={tr('Unit')}>
          <select value={value.unit} onChange={(e) => set({ ...value, unit: e.target.value })}>
            {['piece', 'kg', 'metre', 'box', 'set', 'pack', 'pair'].map((k) => (
              <option key={k} value={k}>
                {formatUnit(k, 1, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr('Delivery district')}>
          <select
            value={value.district}
            onChange={(e) => set({ ...value, district: e.target.value })}
          >
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
        <Field label={tr('Delivery date')}>
          <input
            type="date"
            required
            value={value.delivery_date}
            onChange={(e) => set({ ...value, delivery_date: e.target.value })}
          />
        </Field>
        <Field label={tr('Tender expiry')}>
          <input
            type="datetime-local"
            required
            value={value.expires_at}
            onChange={(e) => set({ ...value, expires_at: e.target.value })}
          />
        </Field>
      </div>
      <Notice error={save.error} />
      <div className="pd-request-buttons">
        <Button disabled={save.isPending}>{tr('Submit for moderation')}</Button>
        <Button type="button" variant="outline" onClick={onClose}>
          {tr('Cancel')}
        </Button>
      </div>
    </form>
  );
}
export function TenderPage({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  const tr = useT();
  const { session } = useAuth();
  const data = useQuery({
    queryKey: ['tender-detail', id, session?.user.id],
    queryFn: () => tenderRead(id!),
  });
  return (
    <div className={admin ? 'growth-panel' : 'container page-content'}>
      {data.isPending ? (
        <State title={tr('Loading…')} />
      ) : data.error ? (
        <>
          <Notice error={data.error} />
          <Button onClick={() => void data.refetch()}>{tr('Try again')}</Button>
        </>
      ) : (
        data.data && (
          <TenderWorkspace
            key={`${data.data.id}-${data.data.version}-${data.data.bids.map((b) => b.version).join('-')}`}
            tender={data.data}
          />
        )
      )}
    </div>
  );
}
function TenderWorkspace({ tender: t }: { tender: z.infer<typeof tenderDetail> }) {
  const tr = useT();
  const { locale } = useLocale();
  const { role } = useAuth();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['tender-detail', t.id] });
    void cache.invalidateQueries({ queryKey: ['tenders'] });
  };
  const moderate = useMutation({
    mutationFn: async (decision: string) => {
      const { error } = await growthDb().rpc('tender_moderate', {
        target: t.id,
        expected_version: t.version,
        decision,
        note,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const close = useMutation({
    mutationFn: async () => {
      const { error } = await growthDb().rpc('tender_close', {
        target: t.id,
        expected_version: t.version,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const award = useMutation({
    mutationFn: async (bid: (typeof t.bids)[number]) => {
      const { data, error } = await growthDb().rpc('tender_award', {
        target: bid.id,
        expected_version: bid.version,
      });
      if (error) throw error;
      return z.object({ request_id: z.uuid(), offer_id: z.uuid() }).parse(data);
    },
    onSuccess: (r) => navigate(`/checkout?request=${r.request_id}&offer=${r.offer_id}`),
  });
  return (
    <>
      <Link to={role === 'admin' || role === 'super_admin' ? '/admin/tenders' : '/tenders'}>
        ← {tr('Open tenders')}
      </Link>
      <h1>{t.title}</h1>
      <p>
        {formatQuantity(t.quantity, t.unit, locale)} · {tr(t.district)} · {tr('Delivery date')}:{' '}
        {t.delivery_date}
      </p>
      <p className="preserve-lines">{t.requirements}</p>
      <p>
        {tr(t.status)} · {tr(t.moderation)}
      </p>
      {t.is_owner && t.moderation_note && <p>{t.moderation_note}</p>}
      {(role === 'admin' || role === 'super_admin') && (
        <section className="panel growth-panel">
          <Field label={tr('Review feedback')}>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </Field>
          <Button
            disabled={moderate.isPending || note.trim().length < 5}
            onClick={() => moderate.mutate('approved')}
          >
            {tr('Approve')}
          </Button>{' '}
          <Button
            disabled={moderate.isPending || note.trim().length < 5}
            variant="outline"
            onClick={() => moderate.mutate('rejected')}
          >
            {tr('Reject')}
          </Button>
          <Notice error={moderate.error} />
        </section>
      )}
      {t.is_owner && t.status === 'open' && (
        <Button variant="outline" disabled={close.isPending} onClick={() => close.mutate()}>
          {tr('Close tender')}
        </Button>
      )}
      <Notice error={close.error ?? award.error} />
      {role === 'supplier' && t.status === 'open' && t.moderation === 'approved' && (
        <BidComposer tender={t} onSaved={refresh} />
      )}
      {t.bids.length > 0 && (
        <section className="growth-panel">
          <h2>{tr('Sealed bids')}</h2>
          <p>{tr('Bids are visible only to their supplier, the buyer and the super admin.')}</p>
          {t.bids.map((b) => (
            <article className="panel growth-panel" key={b.id}>
              <h3>{b.supplier_name}</h3>
              <p>{b.notes}</p>
              <p>
                {tr('Preparation estimate')}: {b.preparation_min}–{b.preparation_max} {tr('days')}
              </p>
              <strong>
                {money(
                  b.lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0),
                  locale,
                )}
              </strong>
              <p>
                {tr('Expires')}:{' '}
                {new Date(b.expires_at).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD', {
                  timeZone: 'Asia/Dhaka',
                })}
              </p>
              {t.is_owner && (t.status === 'open' || b.offer_id) && (
                <Button
                  disabled={award.isPending || Date.parse(b.expires_at) <= Date.now()}
                  onClick={() => award.mutate(b)}
                >
                  {tr('Select bid & checkout')}
                </Button>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
function BidComposer({
  tender: t,
  onSaved,
}: {
  tender: z.infer<typeof tenderDetail>;
  onSaved: () => void;
}) {
  const tr = useT();
  const { session } = useAuth();
  const [product, setProduct] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(t.quantity);
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [expiry, setExpiry] = useState('');
  const [days, setDays] = useState(7);
  const listings = useQuery({
    queryKey: ['tender-own-products', session?.user.id, t.category_id],
    queryFn: async () => {
      const business = await db()
        .from('businesses')
        .select('id')
        .eq('owner_id', session!.user.id)
        .single();
      if (business.error) throw business.error;
      const { data, error } = await db()
        .from('products')
        .select('id,name')
        .eq('business_id', business.data.id)
        .eq('status', 'approved')
        .eq('category_id', t.category_id)
        .eq('unit', t.unit)
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
  const options = useQuery({
    queryKey: ['product-options', product],
    enabled: !!product,
    queryFn: () => productOptions(product),
  });
  const save = useMutation({
    mutationFn: async () => {
      const payload = z
        .object({
          product_id: z.uuid(),
          notes: z.string().min(5).max(3000),
          preparation_min: z.number().int().min(0),
          preparation_max: z.number().int().max(365),
          expires_at: z.string(),
          lines: z.array(
            z.object({
              sku_id: z.uuid(),
              quantity: z.number().int().positive(),
              unit_price: z.number().positive(),
            }),
          ),
        })
        .parse({
          product_id: product,
          notes,
          preparation_min: 1,
          preparation_max: days,
          expires_at: new Date(expiry).toISOString(),
          lines: [{ sku_id: sku, quantity, unit_price: price }],
        });
      const { error } = await growthDb().rpc('tender_bid_save', {
        target: t.id,
        expected_version: t.bids[0]?.version ?? 0,
        payload,
      });
      if (error) throw error;
    },
    onSuccess: onSaved,
  });
  return (
    <form
      className="panel growth-panel form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2>{tr('Submit sealed bid')}</h2>
      <p>
        {tr(
          'Only currently verified suppliers can bid. Choose your approved product matching the tender category and unit.',
        )}
      </p>
      <Field label={tr('Product')}>
        <select
          required
          value={product}
          onChange={(e) => {
            setProduct(e.target.value);
            setSku('');
          }}
        >
          <option value="">{tr('Choose product')}</option>
          {listings.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr('Variant')}>
        <select required value={sku} onChange={(e) => setSku(e.target.value)}>
          <option value="">{tr('Choose variant')}</option>
          {options.data?.skus
            .filter((s) => s.active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {variantLabel(s.options) || tr('Standard')} · {s.stock}
              </option>
            ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field label={tr('Quantity')}>
          <input
            type="number"
            required
            min={t.quantity}
            max={1000000}
            value={quantity}
            onChange={(e) => setQuantity(e.target.valueAsNumber)}
          />
        </Field>
        <Field label={tr('Unit price (BDT)')}>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.valueAsNumber)}
          />
        </Field>
        <Field label={tr('Preparation days')}>
          <input
            type="number"
            required
            min="1"
            max="365"
            value={days}
            onChange={(e) => setDays(e.target.valueAsNumber)}
          />
        </Field>
        <Field label={tr('Offer expiry')}>
          <input
            type="datetime-local"
            required
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </Field>
      </div>
      <Field label={tr('Notes')}>
        <textarea
          required
          minLength={5}
          maxLength={3000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <Notice error={save.error ?? listings.error ?? options.error} />
      <Button disabled={save.isPending}>{tr('Submit sealed bid')}</Button>
    </form>
  );
}
