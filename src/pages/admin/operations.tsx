import { prepareImageUpload } from '@/lib/image-upload';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useT, useLocale } from '@/lib/i18n';
import { adminDate, adminList } from '@/lib/admin-api';
import {
  defaultHomepage,
  homepageSchema,
  notificationSchema,
  operationsList,
  type HomepageConfig,
} from '@/lib/operations';
import { validateUpload, randomUUID } from '@/lib/utils';
import { SectionTitle, Notice, State, Field } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  ActionDialog,
  AdminFilters,
  AdminPagination,
  SelectFilter,
  useAdminPaging,
} from './console';
import Home from '@/pages/home';
const homepageStateSchema = z.object({
  revision: z.number(),
  draft: z.unknown(),
  published: homepageSchema.nullable(),
  published_at: z.string().nullable(),
});
export function HomepageEditor() {
  const tr = useT();
  const query = useQuery({
    queryKey: ['homepage-admin'],
    queryFn: async () => {
      const { data, error } = await db().rpc('admin_homepage_state');
      if (error) throw error;
      return homepageStateSchema.parse(data);
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Homepage content')}
        description={tr('Save privately, preview, then publish a complete homepage revision.')}
      />
      <Notice error={query.error} />
      {query.data ? (
        <HomepageForm key={query.data.revision} state={query.data} />
      ) : (
        <State title={tr('Loading…')} />
      )}
    </>
  );
}
function HomepageForm({ state }: { state: z.infer<typeof homepageStateSchema> }) {
  const tr = useT();
  const { session } = useAuth();
  const cache = useQueryClient();
  const initial = homepageSchema.safeParse(state.draft);
  const saved = initial.success ? initial.data : defaultHomepage;
  const [form, setForm] = useState(saved);
  const [preview, setPreview] = useState(false);
  const [file, setFile] = useState<File>();
  const dirty = JSON.stringify(form) !== JSON.stringify(saved) || !initial.success;
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['homepage-admin'] }),
      cache.invalidateQueries({ queryKey: ['homepage-published'] }),
    ]);
  };
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('admin_save_homepage', {
        config: homepageSchema.parse(form),
        expected_revision: state.revision,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const publish = useMutation({
    mutationFn: async () => {
      if (dirty) throw new Error('Save your draft before publishing.');
      const { error } = await db().rpc('admin_publish_homepage', {
        expected_revision: state.revision,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose an image.');
      const prepared = await prepareImageUpload(file, 'product-images');
      const ext = validateUpload(prepared, 'product-images');
      const path = `${session!.user.id}/${randomUUID()}.${ext}`;
      const { error } = await db()
        .storage.from('marketing-assets')
        .upload(path, prepared, { upsert: false, contentType: prepared.type });
      if (error) throw error;
      return path;
    },
    onSuccess: (path) => {
      setForm((f) => ({ ...f, hero_image: path }));
      setFile(undefined);
    },
  });
  const field = (key: keyof HomepageConfig, value: HomepageConfig[keyof HomepageConfig]) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <>
      <div className="panel cms-status">
        <div>
          <strong>
            {tr('Draft revision')} {state.revision}
          </strong>
          <p>
            {tr('Last published')}: {adminDate(state.published_at)}
          </p>
          <span className={`status-badge ${dirty ? 'pending' : 'active'}`}>
            {tr(dirty ? 'Unsaved changes' : 'Draft saved')}
          </span>
        </div>
        <div className="table-actions">
          <Button variant="outline" onClick={() => setPreview(!preview)}>
            {tr(preview ? 'Close preview' : 'Preview homepage')}
          </Button>
          <Button
            disabled={save.isPending || upload.isPending || !dirty}
            onClick={() => save.mutate()}
          >
            {tr('Save draft')}
          </Button>
          <ActionDialog
            label="Publish homepage"
            requireReason={false}
            description={tr('Only the saved draft will become visible to everyone.')}
            onConfirm={() => publish.mutateAsync()}
          />
        </div>
      </div>
      <Notice error={save.error ?? publish.error ?? upload.error} />
      {preview && (
        <div className="cms-preview">
          <div className="notice">{tr('Private preview — draft content is not public.')}</div>
          <Home previewConfig={form} />
        </div>
      )}
      <section className="panel form-stack">
        <h3>{tr('Hero banner')}</h3>
        <div className="form-grid">
          {(
            ['hero_eyebrow', 'hero_title', 'hero_body', 'hero_button', 'hero_alt'] as const
          ).flatMap((base) =>
            (['en', 'bn'] as const).map((lang) => {
              const key = `${base}_${lang}` as const;
              const labels = {
                hero_eyebrow: 'Hero eyebrow',
                hero_title: 'Hero title',
                hero_body: 'Hero description',
                hero_button: 'Button label',
                hero_alt: 'Image alternative text',
              };
              return (
                <Field
                  key={key}
                  label={`${tr(labels[base])} (${lang === 'en' ? 'English' : 'বাংলা'})`}
                >
                  {base === 'hero_body' || base === 'hero_title' ? (
                    <textarea
                      value={form[key]}
                      maxLength={base === 'hero_title' ? 160 : 1000}
                      onChange={(e) => field(key, e.target.value)}
                    />
                  ) : (
                    <input
                      value={form[key]}
                      maxLength={base === 'hero_button' ? 60 : 1000}
                      onChange={(e) => field(key, e.target.value)}
                    />
                  )}
                </Field>
              );
            }),
          )}
        </div>
        <Field label={tr('Hero button link')}>
          <input
            value={form.hero_href}
            onChange={(e) => field('hero_href', e.target.value)}
            placeholder="/products"
          />
        </Field>
        <p className="muted">
          {tr('Use marketplace paths such as /products, /suppliers, or /dashboard/business.')}
        </p>
        <p className="muted">
          {tr('Images are automatically compressed before upload. Source images up to 20 MB.')}
        </p>
        <Field label={tr('Hero image (JPEG, PNG or WebP; 5 MB)')}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </Field>
        <div className="table-actions">
          <Button
            variant="outline"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {tr('Upload hero image')}
          </Button>
          {form.hero_image && (
            <Button variant="ghost" onClick={() => field('hero_image', null)}>
              {tr('Use default image')}
            </Button>
          )}
        </div>
        <small>{tr('Uploaded images remain private until the draft is published.')}</small>
      </section>
      <section className="panel form-stack">
        <h3>{tr('Announcement')}</h3>
        <div className="form-grid">
          <Field label={tr('Announcement (English)')}>
            <textarea
              value={form.announcement_en}
              maxLength={1000}
              onChange={(e) => field('announcement_en', e.target.value)}
            />
          </Field>
          <Field label={tr('Announcement (Bangla)')}>
            <textarea
              value={form.announcement_bn}
              maxLength={1000}
              onChange={(e) => field('announcement_bn', e.target.value)}
            />
          </Field>
        </div>
        <Field label={tr('Announcement link (optional)')}>
          <input
            value={form.announcement_href}
            onChange={(e) => field('announcement_href', e.target.value)}
          />
        </Field>
      </section>
      <section className="panel">
        <h3>{tr('Homepage sections')}</h3>
        <div className="cms-toggles">
          {(
            [
              'show_announcement',
              'show_categories',
              'show_products',
              'show_suppliers',
              'show_arrivals',
              'show_deals',
              'show_supplier_cta',
            ] as const
          ).map((k) => (
            <label key={k} className="checkbox-row">
              <input
                type="checkbox"
                checked={form[k]}
                onChange={(e) => field(k, e.target.checked)}
              />
              {tr(
                {
                  show_announcement: 'Announcement',
                  show_categories: 'Featured categories',
                  show_products: 'Featured products',
                  show_suppliers: 'Featured suppliers',
                  show_arrivals: 'New arrivals',
                  show_deals: 'How wholesale sourcing works',
                  show_supplier_cta: 'Supplier registration banner',
                }[k],
              )}
            </label>
          ))}
        </div>
      </section>
      <section className="panel form-stack">
        <h3>{tr('Featured selections')}</h3>
        <p>{tr('Leave a selection empty to use the automatic marketplace section.')}</p>
        <FeaturedPicker
          kind="categories"
          selected={form.category_ids}
          onChange={(ids) => field('category_ids', ids)}
          limit={6}
        />
        <FeaturedPicker
          kind="products"
          selected={form.product_ids}
          onChange={(ids) => field('product_ids', ids)}
          limit={8}
        />
        <FeaturedPicker
          kind="suppliers"
          selected={form.supplier_ids}
          onChange={(ids) => field('supplier_ids', ids)}
          limit={3}
        />
      </section>
      <Button variant="outline" onClick={() => setForm(state.published ?? defaultHomepage)}>
        {tr('Use published content')}
      </Button>
    </>
  );
}
const pickSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  business_id: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});
function FeaturedPicker({
  kind,
  selected,
  onChange,
  limit,
}: {
  kind: 'categories' | 'products' | 'suppliers';
  selected: string[];
  onChange: (ids: string[]) => void;
  limit: number;
}) {
  const tr = useT();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['cms-picker', kind, q, page],
    queryFn: () =>
      adminList(
        kind,
        {
          q,
          ...(kind === 'products'
            ? { status: 'approved' }
            : kind === 'suppliers'
              ? { verified: 'true', status: 'active' }
              : {}),
        },
        page,
        25,
        pickSchema,
      ),
  });
  return (
    <div className="cms-picker">
      <h4>
        {tr(
          kind === 'categories'
            ? 'Featured categories'
            : kind === 'products'
              ? 'Featured products'
              : 'Featured suppliers',
        )}{' '}
        · {selected.length}/{limit}
      </h4>
      <input
        type="search"
        aria-label={tr(`Search ${kind}`)}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder={tr('Search records…')}
      />
      <div className="cms-selected">
        {selected.map((id, index) => (
          <Button
            key={id}
            size="sm"
            variant="outline"
            onClick={() => onChange(selected.filter((i) => i !== id))}
          >
            {index + 1}.{' '}
            {query.data?.rows.find((r) => (kind === 'suppliers' ? r.business_id : r.id) === id)
              ?.name ?? id.slice(0, 8)}{' '}
            ×
          </Button>
        ))}
      </div>
      <Notice error={query.error} />
      {query.isPending ? (
        <p>{tr('Loading…')}</p>
      ) : (
        <div className="cms-options">
          {query.data?.rows.map((row) => {
            const id = kind === 'suppliers' ? row.business_id : row.id;
            if (!id) return null;
            return (
              <label key={id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={selected.includes(id)}
                  disabled={!selected.includes(id) && selected.length >= limit}
                  onChange={(e) =>
                    onChange(
                      e.target.checked ? [...selected, id] : selected.filter((x) => x !== id),
                    )
                  }
                />
                {row.name ?? row.email ?? id}
              </label>
            );
          })}
          {!query.data?.rows.length && <small>{tr('No records found')}</small>}
        </div>
      )}
      <div className="table-actions">
        <Button
          size="sm"
          variant="ghost"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {tr('Previous')}
        </Button>
        <span>{page}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={page * 25 >= (query.data?.total ?? 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          {tr('Next')}
        </Button>
      </div>
    </div>
  );
}
const onboardingSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  business_id: z.string().nullable(),
  name: z.string().nullable(),
  status: z.string(),
  stage: z.string(),
  completion: z.number(),
  profile_complete: z.boolean(),
  approved_documents: z.number(),
  pending_documents: z.number(),
  rejected_documents: z.number(),
  products: z.number(),
  approved_products: z.number(),
  pending_products: z.number(),
  products_with_images: z.number(),
  last_reminded_at: z.string().nullable(),
  created_at: z.string(),
});
export function SupplierOnboarding() {
  const tr = useT();
  const paging = useAdminPaging();
  const cache = useQueryClient();
  const list = useQuery({
    queryKey: ['supplier-onboarding', paging.filters, paging.page, paging.size],
    queryFn: () =>
      operationsList('onboarding', paging.filters, paging.page, paging.size, onboardingSchema),
  });
  return (
    <>
      <SectionTitle
        title={tr('Supplier onboarding')}
        description={tr('Track profile completion, document reviews, and first approved listings.')}
      />
      <AdminFilters paging={paging}>
        <SelectFilter
          label="Onboarding stage"
          name="stage"
          options={[
            'profile_missing',
            'documents_missing',
            'documents_pending',
            'documents_rejected',
            'products_missing',
            'products_pending',
            'ready',
            'suspended',
          ]}
          paging={paging}
        />
      </AdminFilters>
      <Notice error={list.error} />
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Supplier', 'Progress', 'Verification documents', 'Products', 'Actions'].map(
                  (k) => (
                    <th key={k}>{tr(k)}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {list.data?.rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>
                      {s.business_id ? (
                        <Link to={`/admin/suppliers/${s.business_id}`}>{s.name}</Link>
                      ) : (
                        s.full_name || tr('Business profile missing')
                      )}
                    </strong>
                    <small>{s.email}</small>
                    <small>
                      {tr('Last reminder')}: {adminDate(s.last_reminded_at)}
                    </small>
                  </td>
                  <td>
                    <span className="status-badge">{tr(s.stage)}</span>
                    <progress
                      max={100}
                      value={s.completion}
                      aria-label={tr('Onboarding completion')}
                    />
                    <small>
                      {s.completion}% ·{' '}
                      {tr(s.profile_complete ? 'Profile complete' : 'Profile incomplete')}
                    </small>
                  </td>
                  <td>
                    {tr('Approved')}: {s.approved_documents}
                    <small>
                      {tr('Pending')}: {s.pending_documents} · {tr('Rejected')}:{' '}
                      {s.rejected_documents}
                    </small>
                    {s.business_id && (
                      <Link to={`/admin/verifications?business_id=${s.business_id}`}>
                        {tr('Review documents')} ↗
                      </Link>
                    )}
                  </td>
                  <td>
                    {s.products} {tr('listings')}
                    <small>
                      {s.approved_products} {tr('approved')} · {s.products_with_images}{' '}
                      {tr('with images')}
                    </small>
                    {s.business_id && (
                      <Link to={`/admin/products?business_id=${s.business_id}`}>
                        {tr('Review products')} ↗
                      </Link>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      {(
                        [
                          ['profile', !s.profile_complete],
                          ['documents', !s.approved_documents && !s.pending_documents],
                          ['products', !s.products && s.status === 'active'],
                        ] as const
                      )
                        .filter(([, show]) => show)
                        .map(([template]) => (
                          <ActionDialog
                            key={template}
                            label={
                              template === 'profile'
                                ? 'Send profile reminder'
                                : template === 'documents'
                                  ? 'Send document reminder'
                                  : 'Send listing reminder'
                            }
                            requireReason={false}
                            description={tr(
                              'Send a predefined in-app reminder. The same reminder is limited to once per 24 hours.',
                            )}
                            onConfirm={async () => {
                              const { error } = await db().rpc('admin_send_onboarding_reminder', {
                                target: s.id,
                                template,
                              });
                              if (error) throw error;
                              await cache.invalidateQueries({ queryKey: ['supplier-onboarding'] });
                            }}
                          />
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.data?.total && <State title={tr('No records found')} />}
        </div>
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
    </>
  );
}
const deliverySchema = notificationSchema.extend({
  email: z.string().nullable(),
  full_name: z.string(),
  delivery_status: z.string(),
});
export function NotificationDelivery() {
  const tr = useT();
  const { locale } = useLocale();
  const paging = useAdminPaging();
  const list = useQuery({
    queryKey: ['notification-delivery', paging.filters, paging.page, paging.size],
    refetchInterval: 15000,
    queryFn: () =>
      operationsList('notifications', paging.filters, paging.page, paging.size, deliverySchema),
  });
  return (
    <>
      <SectionTitle
        title={tr('Notification delivery')}
        description={tr(
          'In-app delivery records. Delivered means stored in the recipient inbox; read means acknowledged.',
        )}
      />
      <AdminFilters paging={paging}>
        <SelectFilter
          label="Delivery status"
          name="status"
          options={['delivered', 'read']}
          paging={paging}
        />
        <SelectFilter
          label="Event type"
          name="kind"
          options={[
            'product_review',
            'verification_review',
            'account_status',
            'staff_access',
            'quotation',
            'quotation_response',
            'onboarding_reminder',
            'supplier_warning',
            'verification_renewal',
          ]}
          paging={paging}
        />
      </AdminFilters>
      <Notice error={list.error} />
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Recipient', 'Notification', 'Status', 'Time'].map((k) => (
                  <th key={k}>{tr(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.data?.rows.map((n) => (
                <tr key={n.id}>
                  <td>
                    {n.email}
                    <small>{n.full_name}</small>
                  </td>
                  <td>
                    <strong>{locale === 'bn' ? n.title_bn : n.title_en}</strong>
                    <small>{tr(n.kind)}</small>
                    <details>
                      <summary>{tr('Details')}</summary>
                      <p className="preserve-lines">{locale === 'bn' ? n.body_bn : n.body_en}</p>
                    </details>
                  </td>
                  <td>
                    <span className="status-badge">{tr(n.delivery_status)}</span>
                  </td>
                  <td>
                    {adminDate(n.created_at)}
                    <small>
                      {tr('Read at')}: {adminDate(n.read_at)}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.data?.total && <State title={tr('No notifications yet')} />}
        </div>
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
    </>
  );
}
