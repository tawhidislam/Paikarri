import { StorePictureEditor } from '@/components/store-picture';
import { ShippingSettings } from '@/components/growth/shipping';
import { SupplierOptions } from '@/components/product/supplier-options';
import { prepareImageUpload } from '@/lib/image-upload';
import { useT } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Plus, Trash2, Upload, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { usePlatformSettings } from '@/lib/platform';
import { businessSchema, productSchema } from '@/lib/validation';
import { locations } from '@/lib/locations';
import { categories } from '@/lib/catalog';
import { money, validateUpload, randomUUID } from '@/lib/utils';
import type { Business, Product, PriceTier, Json } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Field, Notice, State, SectionTitle, ConfirmButton, useTitle } from '@/components/shared';
import { ProductImage } from '@/components/product-card';
export function useBusiness() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['own-business', session!.user.id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('businesses')
        .select('*')
        .eq('owner_id', session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
export function BusinessPage() {
  const tr = useT();
  const { session, role } = useAuth();
  const platform = usePlatformSettings();
  const registrationPaused = platform.data?.supplier_registration_open === false;
  const cache = useQueryClient();
  const own = useBusiness();
  useTitle('Your business');
  const register = useMutation({
    mutationFn: async () => {
      if (registrationPaused) throw new Error(tr('Supplier applications paused'));
      const { error } = await db().rpc('register_supplier');
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['role', session!.user.id] }),
  });
  return (
    <>
      <SectionTitle
        title={tr(
          role === 'buyer' ? 'Bring your business to Paikarii.com.' : 'Your business profile',
        )}
        description={tr(
          role === 'buyer'
            ? 'Create a supplier account and connect with wholesale buyers across Bangladesh.'
            : 'Tell buyers who you are and what makes your business different.',
        )}
      />
      {role === 'buyer' ? (
        <div className="panel onboarding-panel">
          <ShieldCheck size={40} />
          <h2>{tr('Ready to reach more buyers?')}</h2>
          <p>
            {tr(
              'This switches your account from buyer to supplier. You can list products and respond to inquiries. Use a separate buyer account if you also need to source products.',
            )}
          </p>
          <Notice error={register.error} />
          {registrationPaused && (
            <p role="status">
              {tr('Supplier applications paused')}.{' '}
              {tr('Existing suppliers can continue using their workspace.')}
            </p>
          )}
          <Notice error={platform.error} />
          <Button
            disabled={
              register.isPending || registrationPaused || platform.isLoading || platform.isError
            }
            onClick={() => register.mutate()}
          >
            {tr('Become a supplier')}
          </Button>
        </div>
      ) : (
        <>
          <Notice error={own.error} />
          {own.isLoading ? (
            <State title={tr('Loading business…')} />
          ) : (
            <>
              {own.data && <StorePictureEditor business={own.data} />}
              <BusinessForm key={own.data?.id ?? 'new'} business={own.data ?? null} />
              {own.data && <ShippingSettings business={own.data.id} />}
            </>
          )}
        </>
      )}
    </>
  );
}
function BusinessForm({ business }: { business: Business | null }) {
  const tr = useT();
  const { session } = useAuth();
  const cache = useQueryClient();
  const form = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: business ?? {
      name: '',
      name_bn: '',
      description: '',
      division: 'Dhaka',
      district: 'Dhaka',
      address: '',
      contact_phone: '',
      website: '',
    },
  });
  const division = form.watch('division');
  const save = useMutation({
    mutationFn: async (v: z.infer<typeof businessSchema>) => {
      const response = business
        ? await db()
            .from('businesses')
            .update(v)
            .eq('id', business.id)
            .eq('owner_id', session!.user.id)
        : await db()
            .from('businesses')
            .insert({ ...v, owner_id: session!.user.id });
      if (response.error) throw response.error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['own-business'] }),
  });
  return (
    <form className="panel form-stack" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      {business?.verified ? (
        <div
          className="supplier-verified-perks-card"
          style={{
            background: 'linear-gradient(135deg, #f0f7f3 0%, #e6f2eb 100%)',
            border: '1px solid #b5d5c5',
            borderRadius: '12px',
            padding: '18px 20px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span className="verified-label" style={{ margin: 0 }}>
              <ShieldCheck size={16} />
              {tr('Official Verified Supplier')}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: '#17483b',
                fontWeight: 600,
                background: '#d7ecdf',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {tr('Badge active')}
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#2e4e3f', lineHeight: 1.5 }}>
            {tr(
              'Your business holds the official Paikarii Verified Badge. Enjoy priority wholesale search ranking, trusted buyer inquiries, and verified storefront branding.',
            )}
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '18px',
              fontSize: '12px',
              color: '#3d6150',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '6px',
            }}
          >
            <li>✓ {tr('Verified Trust Seal active on storefront')}</li>
            <li>✓ {tr('Priority wholesale search ranking')}</li>
            <li>✓ {tr('Verified badge shown to wholesale buyers in chat & quotes')}</li>
          </ul>
        </div>
      ) : business ? (
        <div
          className="supplier-unverified-prompt-card"
          style={{
            background: '#fcfdfd',
            border: '1px dashed #c4d7cd',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <ShieldCheck size={18} style={{ color: '#52796f' }} />
              <strong style={{ fontSize: '14px', color: '#1f3b2f' }}>
                {tr('Get your verified supplier badge')}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#576f63' }}>
              {tr(
                'Build buyer confidence with verified documents and unlock higher visibility in the wholesale marketplace.',
              )}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/verification">
              <ShieldCheck size={14} />
              {tr('Get verified')}
            </Link>
          </Button>
        </div>
      ) : null}
      <div className="form-grid">
        <Field label={tr('Business name (English)')} error={form.formState.errors.name?.message}>
          <input {...form.register('name')} />
        </Field>
        <Field
          label={tr('Business name (\u09AC\u09BE\u0982\u09B2\u09BE)')}
          error={form.formState.errors.name_bn?.message}
        >
          <input {...form.register('name_bn')} />
        </Field>
      </div>
      <Field label={tr('About your business')} error={form.formState.errors.description?.message}>
        <textarea rows={5} {...form.register('description')} />
      </Field>
      <div className="form-grid">
        <Field label={tr('Division')}>
          <select {...form.register('division', { onChange: () => form.setValue('district', '') })}>
            {Object.keys(locations).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label={tr('District')} error={form.formState.errors.district?.message}>
          <select {...form.register('district')}>
            <option value="">{tr('Choose district')}</option>
            {locations[division]?.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field
          label={tr('Business mobile number (public)')}
          error={form.formState.errors.contact_phone?.message}
        >
          <input type="tel" placeholder={'+8801712345678'} {...form.register('contact_phone')} />
        </Field>
        <Field
          label={tr('Website (optional HTTPS)')}
          error={form.formState.errors.website?.message}
        >
          <input type="url" {...form.register('website')} />
        </Field>
      </div>
      <Field label={tr('Public business address')}>
        <textarea {...form.register('address')} />
      </Field>
      <Notice
        error={save.error}
        success={save.isSuccess ? tr('Business profile saved.') : undefined}
      />
      <Button disabled={save.isPending}>{tr('Save business profile')}</Button>
    </form>
  );
}
export function SupplierProducts() {
  const tr = useT();
  const own = useBusiness();
  const cache = useQueryClient();
  useTitle('Manage products');
  const products = useQuery({
    queryKey: ['own-products', own.data?.id],
    enabled: !!own.data,
    queryFn: async () => {
      const { data, error } = await db()
        .from('products')
        .select('*')
        .eq('business_id', own.data!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const notes = await db().from('product_moderation_notes').select('*');
      if (notes.error) throw notes.error;
      return data.map((p) => ({
        ...p,
        moderation_note: notes.data.find((n) => n.product_id === p.id)?.note ?? '',
      }));
    },
  });
  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('products').update({ status: 'archived' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['own-products'] }),
  });
  return (
    <>
      <SectionTitle
        title={tr('Your wholesale catalog')}
        description={tr('Every new or edited listing is reviewed before it becomes public.')}
        to="/dashboard/products/new"
        label={tr('Add product')}
      />
      <Notice error={products.error ?? own.error ?? archive.error} />
      {own.data === null ? (
        <State
          title={tr('Create your business profile first')}
          action={<Link to="/dashboard/business">{tr('Set up business ↗')}</Link>}
        />
      ) : products.isLoading ? (
        <State title={tr('Loading products…')} />
      ) : products.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr('Products')}</th>
                <th>{tr('Price / MOQ')}</th>
                <th>{tr('Status')}</th>
                <th>{tr('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>
                      {p.stock} {p.unit}
                    </small>
                    {p.moderation_note && (
                      <small className="field-error">{p.moderation_note}</small>
                    )}
                  </td>
                  <td>
                    {money(p.price)}
                    <small>
                      MOQ: {p.moq} {p.unit}
                    </small>
                  </td>
                  <td>
                    <span className={`status-badge ${p.status}`}>{tr(p.status)}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/dashboard/products/${p.id}`}>{tr('Edit')}</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={archive.isPending || p.status === 'archived'}
                        onClick={() => archive.mutate(p.id)}
                      >
                        {tr('Archive')}
                      </Button>
                      <ConfirmButton
                        onConfirm={async () => {
                          const { error } = await db().from('products').delete().eq('id', p.id);
                          if (error) throw error;
                          await cache.invalidateQueries({ queryKey: ['own-products'] });
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
      ) : (
        <State
          title={tr('Your next bestseller starts here.')}
          action={
            <Button asChild>
              <Link to="/dashboard/products/new">
                <Plus size={16} />
                {tr('Add product')}
              </Link>
            </Button>
          }
        />
      )}
    </>
  );
}
export function ProductEditor() {
  const tr = useT();
  const { id } = useParams();
  const location = useLocation();
  const own = useBusiness();
  useTitle(id ? 'Edit product' : 'Add product');
  const record = useQuery({
    queryKey: ['edit-product', id],
    enabled: !!id && !!own.data,
    queryFn: async () => {
      const [p, t] = await Promise.all([
        db().from('products').select('*').eq('id', id!).eq('business_id', own.data!.id).single(),
        db().from('product_price_tiers').select('*').eq('product_id', id!).order('min_quantity'),
      ]);
      if (p.error || t.error) throw p.error ?? t.error;
      return { product: p.data, tiers: t.data };
    },
  });
  if (own.isLoading || (id && record.isLoading))
    return <State title={tr('Loading editor\u2026')} />;
  if (own.error || record.error) return <Notice error={own.error ?? record.error} />;
  if (!own.data)
    return (
      <State
        title={tr('Create your business profile first')}
        action={<Link to="/dashboard/business">{tr('Set up business \u2197')}</Link>}
      />
    );
  return (
    <>
      <SectionTitle
        title={tr(id ? 'Edit your product' : 'Add a wholesale product')}
        description={tr('Clear details and good photos help buyers find the right fit.')}
      />
      {id && location.state?.productSaved === id && (
        <ProductSaveConfirmation
          key={location.key}
          created={location.state.productCreated === true}
        />
      )}
      <ProductForm
        key={id ? `${id}-${record.data?.product.updated_at}` : 'new'}
        product={record.data?.product}
        tiers={record.data?.tiers ?? []}
      />
      {id && (
        <>
          <ImageManager productId={id} />
          <SupplierOptions id={id} />
        </>
      )}
    </>
  );
}
function ProductSaveConfirmation({ created }: { created: boolean }) {
  const tr = useT();
  const banner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    banner.current?.focus({ preventScroll: true });
    banner.current?.scrollIntoView({ block: 'center' });
  }, []);
  return (
    <div ref={banner} tabIndex={-1} className="product-save-confirmation">
      <Notice
        success={tr(created ? 'Product added successfully.' : 'Product updated successfully.')}
      />
      <p>{tr('Your listing is awaiting review. You can upload product photos below.')}</p>
    </div>
  );
}
function ProductForm({ product, tiers }: { product?: Product; tiers: PriceTier[] }) {
  const tr = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useQueryClient();
  const [spec, setSpec] = useState(
    Object.entries(product?.specifications ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n'),
  );
  const cats = useQuery({ queryKey: ['categories'], queryFn: categories });
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      name_bn: product?.name_bn ?? '',
      description: product?.description ?? '',
      category_id: product?.category_id ?? '',
      price: product?.price ?? 0,
      moq: product?.moq ?? 1,
      stock: product?.stock ?? 0,
      unit: product?.unit ?? 'piece',
      specifications: {},
      tiers: tiers.map((t) => ({ min_quantity: t.min_quantity, price: t.price })),
    },
  });
  const rows = form.watch('tiers');
  const save = useMutation({
    onMutate: () => {
      if (location.state?.productSaved) navigate(location.pathname, { replace: true, state: null });
    },
    mutationFn: async (v: z.infer<typeof productSchema>) => {
      const specifications: Record<string, string> = {};
      for (const line of spec.split('\n').filter((x) => x.trim())) {
        const i = line.indexOf(':');
        if (i < 1) throw new Error('Use “Key: Value” for each specification.');
        specifications[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
      const { data, error } = await db().rpc('save_product', {
        payload: { ...v, specifications, ...(product ? { id: product.id } : {}) } as Json,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => {
      void cache.invalidateQueries({ queryKey: ['own-products'] });
      void cache.invalidateQueries({ queryKey: ['edit-product'] });
      navigate(`/dashboard/products/${id}`, {
        replace: !!product,
        state: { productSaved: id, productCreated: !product },
      });
    },
  });
  return (
    <form className="panel form-stack" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      <div className="form-grid">
        <Field label={tr('Product name (English)')} error={form.formState.errors.name?.message}>
          <input {...form.register('name')} />
        </Field>
        <Field
          label={tr('Product name (\u09AC\u09BE\u0982\u09B2\u09BE)')}
          error={form.formState.errors.name_bn?.message}
        >
          <input {...form.register('name_bn')} />
        </Field>
        <Field label={tr('Category')} error={form.formState.errors.category_id?.message}>
          <select {...form.register('category_id')}>
            <option value="">{tr('Choose a category')}</option>
            {cats.data?.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr('Unit')} error={form.formState.errors.unit?.message}>
          <input placeholder={tr('piece, kg, carton\u2026')} {...form.register('unit')} />
        </Field>
        <Field
          label={tr('Wholesale starting price (\u09F3)')}
          error={form.formState.errors.price?.message}
        >
          <input
            type="number"
            step="0.01"
            min="0.01"
            {...form.register('price', { valueAsNumber: true })}
          />
        </Field>
        <Field label={tr('Minimum order quantity')} error={form.formState.errors.moq?.message}>
          <input type="number" min="1" {...form.register('moq', { valueAsNumber: true })} />
        </Field>
        <Field
          label={tr('Available stock (unreserved units)')}
          error={form.formState.errors.stock?.message}
        >
          <input
            type="number"
            min="0"
            aria-label={tr('Available stock (unreserved units)')}
            aria-describedby={product ? 'product-stock-help' : undefined}
            readOnly={!!product}
            {...form.register('stock', { valueAsNumber: true })}
          />
          {product && (
            <small id="product-stock-help">
              {tr('Manage existing stock with the SKU controls below.')}
            </small>
          )}
        </Field>
      </div>
      <Field label={tr('Product description')} error={form.formState.errors.description?.message}>
        <textarea rows={6} {...form.register('description')} />
      </Field>
      <Field label={tr('Specifications (one Key: Value per line)')}>
        <textarea
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          placeholder={'Material: Cotton\nOrigin: Bangladesh'}
        />
      </Field>
      <div className="tier-editor">
        <h3>{tr('Quantity pricing')}</h3>
        {rows.map((_, i) => (
          <div className="tier-row" key={i}>
            <Field
              label={tr('From quantity')}
              error={form.formState.errors.tiers?.[i]?.min_quantity?.message}
            >
              <input
                type="number"
                min="1"
                {...form.register(`tiers.${i}.min_quantity`, { valueAsNumber: true })}
              />
            </Field>
            <Field
              label={tr('Price per unit (\u09F3)')}
              error={form.formState.errors.tiers?.[i]?.price?.message}
            >
              <input
                type="number"
                min="0.01"
                step="0.01"
                {...form.register(`tiers.${i}.price`, { valueAsNumber: true })}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tr('Remove price tier')}
              onClick={() =>
                form.setValue(
                  'tiers',
                  rows.filter((_, n) => n !== i),
                )
              }
            >
              <Trash2 size={17} />
            </Button>
          </div>
        ))}
        <p className="field-error">
          {form.formState.errors.tiers?.root?.message ?? form.formState.errors.tiers?.message}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={rows.length >= 20}
          onClick={() => form.setValue('tiers', [...rows, { min_quantity: 1, price: 1 }])}
        >
          <Plus size={15} />
          {tr('Add pricing tier')}
        </Button>
      </div>
      <Notice error={save.error ?? cats.error} />
      <p className="muted">
        {tr(
          product
            ? 'Saving edits submits this listing for review again.'
            : 'Save your product, then upload photos on the next screen.',
        )}
      </p>
      <Button type="submit" disabled={save.isPending}>
        {tr(save.isPending ? 'Saving product…' : 'Save & submit for review')}
      </Button>
    </form>
  );
}
function ImageManager({ productId }: { productId: string }) {
  const tr = useT();
  const { session } = useAuth();
  const cache = useQueryClient();
  const images = useQuery({
    queryKey: ['own-images', productId],
    queryFn: async () => {
      const { data, error } = await db()
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('position');
      if (error) throw error;
      return data;
    },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if ((images.data?.length ?? 0) >= 10) throw new Error('Use up to 10 product images.');
      const prepared = await prepareImageUpload(file, 'product-images');
      const ext = validateUpload(prepared, 'product-images');
      const path = `${session!.user.id}/${productId}/${randomUUID()}.${ext}`;
      const { error } = await db()
        .storage.from('product-images')
        .upload(path, prepared, { contentType: prepared.type, upsert: false });
      if (error) throw error;
      const res = await db()
        .from('product_images')
        .insert({ product_id: productId, path, position: images.data?.length ?? 0 });
      if (res.error) {
        await db().storage.from('product-images').remove([path]);
        throw res.error;
      }
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['own-images', productId] }),
  });
  return (
    <div className="panel image-manager">
      <h3>{tr('Product images')}</h3>
      <p>
        {tr(
          'Show the exact item buyers will receive. Include a clear main photo, alternate angles, and relevant variant details. Category and lifestyle pictures cannot replace actual product photos.',
        )}
      </p>
      <p>{tr('JPEG, PNG or WebP. Up to 5 MB each. New images submit the product for review.')}</p>
      <Notice error={upload.error ?? images.error} />
      <div className="upload-grid">
        {images.data?.map((i) => (
          <div key={i.id}>
            <ProductImage path={i.path} alt="Product upload" />
            <ConfirmButton
              onConfirm={async () => {
                const { error } = await db().from('product_images').delete().eq('id', i.id);
                if (error) throw error;
                const removed = await db().storage.from('product-images').remove([i.path]);
                if (removed.error) throw removed.error;
                await cache.invalidateQueries({ queryKey: ['own-images', productId] });
              }}
            >
              {tr('Remove image')}
            </ConfirmButton>
          </div>
        ))}
      </div>
      <p className="muted">
        {tr('Images are automatically compressed before upload. Source images up to 20 MB.')}
      </p>
      <label className="upload-input">
        <Upload size={18} />
        {tr(upload.isPending ? 'Uploading…' : 'Upload image')}
        <input
          disabled={upload.isPending}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files?.[0]) upload.mutate(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
