import './product-moderation.css';
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  PackageCheck,
  X,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { OptionsSummary } from '@/components/product/options-summary';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { formatQuantity, formatUnit } from '@/lib/units';
import { db } from '@/lib/supabase';
import { adminDate, adminList } from '@/lib/admin-api';
import { categories } from '@/lib/catalog';
import type { Json, Category } from '@/lib/models';
import { money } from '@/lib/utils';
import { ProductImage } from '@/components/product-card';
import { SectionTitle, Notice, State } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ReviewProduct, CategoryForm } from '@/pages/admin';
import {
  ActionDialog,
  AdminFilters,
  AdminPagination,
  SelectFilter,
  useAdminPaging,
} from './console';
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);
const productSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  category_id: z.string(),
  name: z.string(),
  name_bn: z.string(),
  description: z.string(),
  price: z.number(),
  moq: z.number(),
  stock: z.number(),
  unit: z.string(),
  specifications: jsonSchema,
  status: z.string(),
  moderation_note: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  supplier_name: z.string(),
  images: z.array(
    z.object({ id: z.string(), path: z.string(), position: z.number(), product_id: z.string() }),
  ),
  tiers: z.array(z.object({ min_quantity: z.number(), price: z.number() })),
});
const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  name_bn: z.string(),
  slug: z.string(),
  parent_id: z.string().nullable(),
  icon: z.string(),
  parent_name: z.string().nullable(),
});
const reportSchema = z.object({
  id: z.string(),
  name: z.string(),
  reason: z.string(),
  product_id: z.string(),
  reporter_id: z.string(),
  status: z.string(),
  created_at: z.string(),
});
export function ConsoleProducts() {
  const tr = useT();
  const paging = useAdminPaging();
  const list = useQuery({
    queryKey: ['admin-products', paging.filters, paging.page, paging.size],
    queryFn: () => adminList('products', paging.filters, paging.page, paging.size, productSchema),
  });
  const cache = useQueryClient();
  return (
    <section className="pm-page">
      <div className="pm-heading">
        <div className="pm-heading-icon">
          <PackageCheck size={24} />
        </div>
        <SectionTitle
          title={tr('Product moderation')}
          description={tr(
            'Inspect every image, specifications, and wholesale pricing before approving.',
          )}
        />
      </div>
      <AdminFilters paging={paging}>
        <SelectFilter
          name="status"
          label="Listing status"
          options={['pending', 'approved', 'rejected', 'archived', 'draft']}
          paging={paging}
        />
      </AdminFilters>
      <div className="pm-queue-heading">
        <h3>{tr('Listing review queue')}</h3>
        <span aria-live="polite">
          {list.data ? `${list.data.total} ${tr('records')}` : tr('Loading listings…')}
        </span>
      </div>
      <Notice error={list.error} />
      {list.isError ? (
        <Button variant="outline" onClick={() => void list.refetch()}>
          {tr('Try again')}
        </Button>
      ) : list.isPending ? (
        <State title={tr('Loading listings…')} />
      ) : list.data?.rows.length ? (
        <div className="pm-list">
          {list.data.rows.map((p, index) => (
            <ModerationCard
              key={p.id}
              product={p}
              initiallyOpen={index === 0}
              onSuccess={() => cache.invalidateQueries()}
            />
          ))}
        </div>
      ) : (
        <State title={tr('No records found')} />
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
    </section>
  );
}
function ModerationCard({
  product: p,
  initiallyOpen,
  onSuccess,
}: {
  product: z.infer<typeof productSchema>;
  initiallyOpen: boolean;
  onSuccess: () => Promise<unknown>;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const [expanded, setExpanded] = useState(initiallyOpen);
  const [preview, setPreview] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const images = [...p.images].sort((a, b) => a.position - b.position);
  const specifications =
    p.specifications && typeof p.specifications === 'object' && !Array.isArray(p.specifications)
      ? Object.entries(p.specifications)
      : [];
  const specValue = (value: Json | undefined): string =>
    value === null || value === undefined
      ? '—'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return (
    <article className={`pm-card ${expanded ? 'is-expanded' : ''}`}>
      <div className="pm-card-summary">
        <ProductImage path={images[0]?.path} alt={p.name} className="pm-thumbnail" />
        <div className="pm-identity">
          <span className={`status-badge ${p.status}`}>{tr(p.status)}</span>
          <h3>{p.name}</h3>
          {p.name_bn && <p lang="bn">{p.name_bn}</p>}
          <Link to={`/admin/suppliers/${p.business_id}`}>
            {p.supplier_name} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="pm-summary-price">
          <span>{tr('Starting price')}</span>
          <strong>{money(p.price, locale)}</strong>
          <small>/ {formatUnit(p.unit, 1, locale)}</small>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="pm-expand"
          aria-expanded={expanded}
          aria-controls={`review-${p.id}`}
          onClick={() => setExpanded(!expanded)}
        >
          {tr(expanded ? 'Hide details' : 'Review listing')}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>
      {expanded && (
        <div id={`review-${p.id}`} className="pm-review">
          <div className="pm-information">
            <dl className="pm-facts">
              <div>
                <dt>{tr('Minimum order quantity')}</dt>
                <dd>{formatQuantity(p.moq, p.unit, locale)}</dd>
              </div>
              <div>
                <dt>{tr('Available stock')}</dt>
                <dd>{formatQuantity(p.stock, p.unit, locale)}</dd>
              </div>
              <div>
                <dt>{tr('Date created')}</dt>
                <dd>{adminDate(p.created_at)}</dd>
              </div>
            </dl>
            <section className="pm-section">
              <div className="pm-section-heading">
                <h4>{tr('Product images')}</h4>
                <span>
                  <ImageIcon size={14} /> {images.length}
                </span>
              </div>
              {images.length ? (
                <div className="review-image-gallery pm-gallery">
                  {images.map((image, index) => (
                    <button
                      type="button"
                      key={image.id}
                      aria-label={`${tr('Preview image')} ${index + 1}`}
                      onClick={() => {
                        setPreview(index);
                        dialog.current?.showModal();
                      }}
                    >
                      <ProductImage path={image.path} alt={`${p.name} — ${index + 1}`} />
                      <span>{index + 1}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="pm-empty">{tr('No product images uploaded.')}</p>
              )}
            </section>
            <section className="pm-section">
              <h4>{tr('Product description')}</h4>
              <p className="preserve-lines">{p.description || '—'}</p>
            </section>
            <section className="pm-section">
              <h4>{tr('Specifications')}</h4>
              {specifications.length ? (
                <dl className="pm-specifications">
                  {specifications.map(([name, value]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>{specValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="pm-empty">{tr('No specifications provided.')}</p>
              )}
            </section>
            <section className="pm-section">
              <h4>{tr('Tiered pricing')}</h4>
              {p.tiers.length ? (
                <div className="pm-tiers">
                  {[...p.tiers]
                    .sort((a, b) => a.min_quantity - b.min_quantity)
                    .map((tier) => (
                      <div key={tier.min_quantity}>
                        <span>{formatQuantity(tier.min_quantity, p.unit, locale)}+</span>
                        <strong>{money(tier.price, locale)}</strong>
                        <small>/ {formatUnit(p.unit, 1, locale)}</small>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="pm-empty">{tr('No quantity tiers. Starting price applies.')}</p>
              )}
            </section>
            <section className="pm-section pm-options">
              <OptionsSummary id={p.id} />
            </section>
          </div>
          <aside className="pm-decision">
            <div className="pm-decision-heading">
              <PackageCheck size={20} />
              <h4>{tr('Moderation decision')}</h4>
            </div>
            <p>
              {tr('Check the photos, product information and pricing, then record your decision.')}
            </p>
            <ReviewProduct product={{ ...p, search_vector: null }} onSuccess={onSuccess} />
          </aside>
        </div>
      )}
      <dialog
        ref={dialog}
        className="pm-image-dialog"
        aria-label={tr('Product image preview')}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="pm-preview-toolbar">
          <strong>
            {tr('Product images')} · {preview + 1} / {images.length}
          </strong>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tr('Close preview')}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </Button>
        </div>
        {images[preview] && (
          <ProductImage path={images[preview].path} alt={`${p.name} — ${preview + 1}`} />
        )}
        {images.length > 1 && (
          <div className="pm-preview-navigation">
            <Button
              variant="outline"
              disabled={preview === 0}
              onClick={() => setPreview(preview - 1)}
            >
              <ArrowLeft size={16} />
              {tr('Previous')}
            </Button>
            <Button
              variant="outline"
              disabled={preview === images.length - 1}
              onClick={() => setPreview(preview + 1)}
            >
              {tr('Next')}
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </dialog>
    </article>
  );
}

export function ConsoleCategories() {
  const tr = useT();
  const { role } = useAuth();
  const paging = useAdminPaging();
  const cache = useQueryClient();
  const [editing, setEditing] = useState<Category>();
  const [add, setAdd] = useState(false);
  const list = useQuery({
    queryKey: ['admin-categories', paging.filters, paging.page, paging.size],
    queryFn: () =>
      adminList('categories', paging.filters, paging.page, paging.size, categorySchema),
  });
  const parents = useQuery({
    queryKey: ['categories'],
    queryFn: categories,
    enabled: role === 'super_admin',
  });
  return (
    <>
      <SectionTitle
        title={tr('Marketplace categories')}
        description={tr(
          role === 'super_admin'
            ? 'Manage categories and subcategories.'
            : 'Categories are read-only for staff administrators.',
        )}
      />
      {role === 'super_admin' && (
        <Button
          onClick={() => {
            setEditing(undefined);
            setAdd(!add);
          }}
        >
          {tr('Add category')}
        </Button>
      )}
      {(add || editing) && role === 'super_admin' && (
        <CategoryForm
          key={editing?.id ?? 'new'}
          category={editing}
          categories={parents.data ?? []}
          onSuccess={async () => {
            setEditing(undefined);
            setAdd(false);
            await cache.invalidateQueries();
          }}
        />
      )}
      <AdminFilters paging={paging} />
      <Notice error={list.error ?? parents.error} />
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Category', 'Slug', 'Parent', 'Actions'].map((s) => (
                  <th key={s}>{tr(s)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.data?.rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.name}
                    <small>{c.name_bn}</small>
                  </td>
                  <td>{c.slug}</td>
                  <td>{c.parent_name ?? tr('Top level')}</td>
                  <td>
                    {role === 'super_admin' ? (
                      <div className="table-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(c);
                            setAdd(false);
                          }}
                        >
                          {tr('Edit')}
                        </Button>
                        <ActionDialog
                          label="Delete category"
                          requireReason={false}
                          description={c.name}
                          onConfirm={async () => {
                            const { error } = await db().from('categories').delete().eq('id', c.id);
                            if (error) throw error;
                            await cache.invalidateQueries();
                          }}
                        />
                      </div>
                    ) : (
                      tr('Read only')
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
    </>
  );
}
export function ConsoleReports() {
  const tr = useT();
  const paging = useAdminPaging();
  const cache = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-reports', paging.filters, paging.page, paging.size],
    queryFn: () => adminList('reports', paging.filters, paging.page, paging.size, reportSchema),
  });
  return (
    <>
      <SectionTitle
        title={tr('Reports')}
        description={tr('Inspect reported listings and record moderation decisions.')}
      />
      <AdminFilters paging={paging}>
        <SelectFilter
          label="Status"
          name="status"
          options={['open', 'resolved', 'dismissed']}
          paging={paging}
        />
      </AdminFilters>
      <Notice error={list.error} />
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : list.data?.rows.length ? (
        list.data.rows.map((r) => (
          <article key={r.id} className="panel">
            <span className={`status-badge ${r.status}`}>{tr(r.status)}</span>
            <h3>
              <Link to={`/admin/products?id=${r.product_id}`}>{r.name} ↗</Link>
            </h3>
            <p className="preserve-lines">{r.reason}</p>
            <small>
              {tr('Reporter')}: {r.reporter_id} · {adminDate(r.created_at)}
            </small>
            {r.status === 'open' && (
              <div className="table-actions">
                {['resolved', 'dismissed'].map((decision) => (
                  <ActionDialog
                    key={decision}
                    label={decision === 'resolved' ? 'Resolve report' : 'Dismiss report'}
                    onConfirm={async (reason) => {
                      const { error } = await db().rpc('admin_resolve_report', {
                        target: r.id,
                        decision,
                        note: reason,
                      });
                      if (error) throw error;
                      await cache.invalidateQueries();
                    }}
                  />
                ))}
              </div>
            )}
          </article>
        ))
      ) : (
        <State title={tr('No reports to review')} />
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
    </>
  );
}
