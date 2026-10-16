import { useT } from '@/lib/i18n';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { categories, signedImage } from '@/lib/catalog';
import { money } from '@/lib/utils';
import type { Product, Verification, Category } from '@/lib/models';
import { SectionTitle, State, Notice, Field, ConfirmButton, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/product-card';
export function AdminUsers() {
  const tr = useT();
  useTitle('Manage accounts');
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        db().from('profiles').select('*').order('created_at', { ascending: false }),
        db().from('user_roles').select('*'),
      ]);
      if (p.error || r.error) throw p.error ?? r.error;
      return p.data.map((p) => ({ ...p, role: r.data.find((r) => r.user_id === p.id)?.role }));
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Marketplace accounts')}
        description={tr(
          'Roles are stored in protected database records, separate from signup metadata.',
        )}
      />
      <Notice error={users.error} />
      {users.isLoading ? (
        <State title={tr('Loading accounts…')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr('Name / ID')}</th>
                <th>{tr('Role')}</th>
                <th>{tr('Contact')}</th>
                <th>{tr('Joined')}</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name || tr('Unnamed account')}</strong>
                    <small>{u.id}</small>
                  </td>
                  <td>
                    <span className="status-badge">{tr(u.role ?? 'buyer')}</span>
                  </td>
                  <td>{u.phone || '—'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString('en-BD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export function Moderation() {
  const tr = useT();
  const cache = useQueryClient();
  const [filter, setFilter] = useState('pending');
  useTitle('Product moderation');
  const products = useQuery({
    queryKey: ['admin-products', filter],
    queryFn: async () => {
      let q = db().from('products').select('*').order('created_at', { ascending: false });
      if (filter) q = q.eq('status', filter as Product['status']);
      const { data, error } = await q;
      if (error) throw error;
      const images = await db().from('product_images').select('*');
      if (images.error) throw images.error;
      const notes = await db().from('product_moderation_notes').select('*');
      if (notes.error) throw notes.error;
      return data.map((p) => ({
        ...p,
        moderation_note: notes.data.find((n) => n.product_id === p.id)?.note ?? '',
        image: images.data.find((i) => i.product_id === p.id),
        images: images.data.filter((i) => i.product_id === p.id),
      }));
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('A marketplace worth trusting.')}
        description={tr('Review product information and images before approving public listings.')}
      />
      <label className="field compact-field">
        <span>{tr('Listing status')}</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">{tr('Pending review')}</option>
          <option value="approved">{tr('Approved')}</option>
          <option value="rejected">{tr('Rejected')}</option>
          <option value="">{tr('All listings')}</option>
        </select>
      </label>
      <Notice error={products.error} />
      {products.isLoading ? (
        <State title={tr('Loading listings…')} />
      ) : products.data?.length ? (
        products.data.map((p) => (
          <div className="panel moderation-card" key={p.id}>
            <div className="moderation-product">
              <ProductImage path={p.image?.path} alt={p.name} />
              <div>
                <span className={`status-badge ${p.status}`}>{tr(p.status)}</span>
                <h3>{p.name}</h3>
                <p>{p.name_bn}</p>
                <p>
                  {money(p.price)} / {p.unit} · MOQ {p.moq} · {tr('Stock')} {p.stock}
                </p>
                <p className="preserve-lines">{p.description}</p>
                <small>{p.business_id}</small>
              </div>
            </div>
            {p.images.length > 1 && (
              <div className="review-image-gallery">
                {p.images.slice(1).map((image, i) => (
                  <ProductImage key={image.id} path={image.path} alt={`${p.name} — ${i + 2}`} />
                ))}
              </div>
            )}
            <ReviewProduct
              product={p}
              onSuccess={() => cache.invalidateQueries({ queryKey: ['admin-products'] })}
            />
          </div>
        ))
      ) : (
        <State title={tr('All caught up.')} description={tr('No listings match this status.')} />
      )}
    </>
  );
}
function ReviewProduct({
  product,
  onSuccess,
}: {
  product: Product;
  onSuccess: () => Promise<unknown>;
}) {
  const tr = useT();
  const [note, setNote] = useState(product.moderation_note);
  const action = useMutation({
    mutationFn: async (decision: string) => {
      const { error } = await db().rpc('moderate_product', { target: product.id, decision, note });
      if (error) throw error;
    },
    onSuccess,
  });
  return (
    <div className="review-controls">
      <Field label={tr('Review note')}>
        <input
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          placeholder={tr('Explain required changes or your decision\u2026')}
        />
      </Field>
      <div>
        <Button size="sm" disabled={action.isPending} onClick={() => action.mutate('approved')}>
          {tr('Approve')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={action.isPending}
          onClick={() => action.mutate('rejected')}
        >
          {tr('Reject')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={action.isPending}
          onClick={() => action.mutate('archived')}
        >
          {tr('Archive')}
        </Button>
      </div>
      <Notice error={action.error} />
    </div>
  );
}
export function AdminVerifications() {
  const tr = useT();
  const cache = useQueryClient();
  useTitle('Supplier verification review');
  const list = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      const [r, b] = await Promise.all([
        db().from('supplier_verifications').select('*').order('created_at', { ascending: false }),
        db().from('businesses').select('*'),
      ]);
      if (r.error || b.error) throw r.error ?? b.error;
      return r.data.map((r) => ({ ...r, business: b.data.find((b) => b.id === r.business_id) }));
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Review the business behind the badge.')}
        description={tr('Verify submitted business documents before approving a supplier.')}
      />
      <Notice error={list.error} />
      {list.isLoading ? (
        <State title={tr('Loading submissions…')} />
      ) : list.data?.length ? (
        list.data.map((v) => (
          <div className="panel" key={v.id}>
            <h3>{v.business?.name}</h3>
            <p>
              {v.business?.district} · {v.business?.contact_phone}
            </p>
            <VerificationReview
              verification={v}
              onSuccess={() => cache.invalidateQueries({ queryKey: ['admin-verifications'] })}
            />
          </div>
        ))
      ) : (
        <State title={tr('No verification requests yet')} />
      )}
    </>
  );
}
function VerificationReview({
  verification: v,
  onSuccess,
}: {
  verification: Verification;
  onSuccess: () => Promise<unknown>;
}) {
  const tr = useT();
  const [note, setNote] = useState(v.review_note);
  const open = useMutation({
    mutationFn: async () => {
      const url = await signedImage(v.document_path, 'business-documents');
      const preview = window.open(url, '_blank');
      if (preview) preview.opener = null;
      else window.location.assign(url);
    },
  });
  const action = useMutation({
    mutationFn: async (decision: string) => {
      const { error } = await db().rpc('review_verification', { target: v.id, decision, note });
      if (error) throw error;
    },
    onSuccess,
  });
  return (
    <div className="review-controls">
      <div>
        <span className={`status-badge ${v.status}`}>{v.status}</span>
        <strong>{v.document_type.replaceAll('_', ' ')}</strong>
        <Button size="sm" variant="outline" disabled={open.isPending} onClick={() => open.mutate()}>
          {tr('Open private document \u2197')}
        </Button>
      </div>
      <Field label={tr('Reviewer note')}>
        <input maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div>
        <Button size="sm" disabled={action.isPending} onClick={() => action.mutate('approved')}>
          {tr('Approve verification')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={action.isPending}
          onClick={() => action.mutate('rejected')}
        >
          {tr('Reject verification')}
        </Button>
      </div>
      <Notice error={open.error ?? action.error} />
    </div>
  );
}
export function AdminCategories() {
  const tr = useT();
  const cache = useQueryClient();
  const [editing, setEditing] = useState<Category>();
  useTitle('Marketplace categories');
  const list = useQuery({ queryKey: ['categories'], queryFn: categories });
  return (
    <>
      <SectionTitle
        title={tr('Organize the marketplace.')}
        description={tr(
          'Create categories and subcategories that help buyers find the right products.',
        )}
      />
      <CategoryForm
        key={editing?.id ?? 'new'}
        category={editing}
        categories={list.data ?? []}
        onSuccess={async () => {
          setEditing(undefined);
          await cache.invalidateQueries({ queryKey: ['categories'] });
        }}
      />
      <Notice error={list.error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tr('Category')}</th>
              <th>{tr('Slug')}</th>
              <th>{tr('Parent')}</th>
              <th>{tr('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.name}
                  <small>{c.name_bn}</small>
                </td>
                <td>{c.slug}</td>
                <td>{list.data.find((p) => p.id === c.parent_id)?.name ?? 'Top level'}</td>
                <td>
                  <div className="table-actions">
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                      {tr('Edit')}
                    </Button>
                    <ConfirmButton
                      onConfirm={async () => {
                        const { error } = await db().from('categories').delete().eq('id', c.id);
                        if (error) throw error;
                        await cache.invalidateQueries({ queryKey: ['categories'] });
                      }}
                    >
                      {tr('Delete')}
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function CategoryForm({
  category,
  categories,
  onSuccess,
}: {
  category?: Category;
  categories: Category[];
  onSuccess: () => Promise<void>;
}) {
  const tr = useT();
  const [name, setName] = useState(category?.name ?? '');
  const [bn, setBn] = useState(category?.name_bn ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [parent, setParent] = useState(category?.parent_id ?? '');
  const save = useMutation({
    mutationFn: async () => {
      const v = z
        .object({
          name: z.string().min(2).max(100),
          name_bn: z.string().min(2).max(100),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          parent_id: z.uuid().nullable(),
        })
        .parse({ name, name_bn: bn, slug, parent_id: parent || null });
      const res = category
        ? await db().from('categories').update(v).eq('id', category.id)
        : await db().from('categories').insert(v);
      if (res.error) throw res.error;
    },
    onSuccess,
  });
  return (
    <form
      className="panel form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h3>{tr(category ? 'Edit category' : 'Add category')}</h3>
      <div className="form-grid">
        <Field label={tr('English name')}>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={tr('\u09AC\u09BE\u0982\u09B2\u09BE \u09A8\u09BE\u09AE')}>
          <input required value={bn} onChange={(e) => setBn(e.target.value)} />
        </Field>
        <Field label={tr('URL slug')}>
          <input
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>
        <Field label={tr('Parent category')}>
          <select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">{tr('Top level')}</option>
            {categories
              .filter((c) => c.id !== category?.id && !c.parent_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <Notice error={save.error} />
      <Button disabled={save.isPending}>
        {tr(category ? 'Update category' : 'Create category')}
      </Button>
    </form>
  );
}
export function AdminReports() {
  const tr = useT();
  const cache = useQueryClient();
  useTitle('Reports and audit');
  const list = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const [r, a] = await Promise.all([
        db().from('reports').select('*').order('created_at', { ascending: false }),
        db()
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      if (r.error || a.error) throw r.error ?? a.error;
      return { reports: r.data, audit: a.data };
    },
  });
  const resolve = useMutation({
    mutationFn: async ({ target, decision }: { target: string; decision: string }) => {
      const { error } = await db().rpc('resolve_report', { target, decision });
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['admin-reports'] }),
  });
  return (
    <>
      <SectionTitle
        title={tr('Reports & accountability')}
        description={tr('Review community reports and recent moderation activity.')}
      />
      <Notice error={list.error ?? resolve.error} />
      {list.data?.reports.length ? (
        list.data.reports.map((r) => (
          <div className="panel" key={r.id}>
            <span className={`status-badge ${r.status}`}>{tr(r.status)}</span>
            <p className="preserve-lines">{r.reason}</p>
            <small>
              {tr('Product')}: {r.product_id} · {tr('Reporter')}: {r.reporter_id}
            </small>
            {r.status === 'open' && (
              <div className="table-actions">
                <Button
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ target: r.id, decision: 'resolved' })}
                >
                  {tr('Resolve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ target: r.id, decision: 'dismissed' })}
                >
                  {tr('Dismiss')}
                </Button>
              </div>
            )}
          </div>
        ))
      ) : (
        <State title={tr('No reports to review')} />
      )}

      <h3 className="subheading">{tr('Recent admin activity')}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tr('Action')}</th>
              <th>{tr('Entity')}</th>
              <th>{tr('Admin')}</th>
              <th>{tr('Time')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.audit.map((a) => (
              <tr key={a.id}>
                <td>{a.action}</td>
                <td>{a.entity_id}</td>
                <td>{a.admin_id?.slice(0, 8)}</td>
                <td>{new Date(a.created_at).toLocaleString('en-BD')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
