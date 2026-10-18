import { OptionsSummary } from '@/components/product/options-summary';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
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
    <>
      <SectionTitle
        title={tr('Product moderation')}
        description={tr(
          'Inspect every image, specifications, and wholesale pricing before approving.',
        )}
      />
      <AdminFilters paging={paging}>
        <SelectFilter
          name="status"
          label="Listing status"
          options={['pending', 'approved', 'rejected', 'archived', 'draft']}
          paging={paging}
        />
      </AdminFilters>
      <Notice error={list.error} />
      {list.isPending ? (
        <State title={tr('Loading listings…')} />
      ) : list.data?.rows.length ? (
        list.data.rows.map((p) => (
          <article className="panel moderation-card" key={p.id}>
            <div className="admin-section-header">
              <h3>{p.name}</h3>
              <span className={`status-badge ${p.status}`}>{tr(p.status)}</span>
            </div>
            <Link to={`/admin/suppliers/${p.business_id}`}>{p.supplier_name} ↗</Link>
            <p>{p.name_bn}</p>
            <p>
              {money(p.price)} / {p.unit} · MOQ {p.moq} · {tr('Stock')} {p.stock}
            </p>
            <p className="preserve-lines">{p.description}</p>
            <div className="review-image-gallery">
              {p.images.map((i, index) => (
                <ProductImage key={i.id} path={i.path} alt={`${p.name} — ${index + 1}`} />
              ))}
            </div>
            <h4>{tr('Specifications')}</h4>
            <pre className="audit-json">{JSON.stringify(p.specifications, null, 2)}</pre>
            <h4>{tr('Tiered pricing')}</h4>
            {p.tiers.map((t) => (
              <p key={t.min_quantity}>
                {t.min_quantity}+ · {money(t.price)} / {p.unit}
              </p>
            ))}
            <OptionsSummary id={p.id} />
            <ReviewProduct
              product={{ ...p, search_vector: null }}
              onSuccess={() => cache.invalidateQueries()}
            />
          </article>
        ))
      ) : (
        <State title={tr('No records found')} />
      )}
      <AdminPagination paging={paging} total={list.data?.total} />
    </>
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
