import { useT } from '@/lib/i18n';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  MapPin,
  ShieldCheck,
  ArrowUpRight,
  MessageSquare,
  Flag,
  Check,
  Package,
} from 'lucide-react';
import { db, configured } from '@/lib/supabase';
import { hydrate } from '@/lib/catalog';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { quoteSchema } from '@/lib/validation';
import { money } from '@/lib/utils';
import { ProductImage, SaveProduct } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Field, Notice, State, useTitle } from '@/components/shared';
export default function ProductPage() {
  const tr = useT();
  const { id } = useParams();
  const { locale, t } = useLocale();
  const { session, role } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState('');
  const item = useQuery({
    queryKey: ['product', id],
    enabled: configured,
    queryFn: async () => {
      const [{ data, error }, images, tiers] = await Promise.all([
        db().from('products').select('*').eq('id', id!).eq('status', 'approved').maybeSingle(),
        db().from('product_images').select('*').eq('product_id', id!).order('position'),
        db().from('product_price_tiers').select('*').eq('product_id', id!).order('min_quantity'),
      ]);
      if (error || images.error || tiers.error) throw error ?? images.error ?? tiers.error;
      if (!data) return null;
      const [p] = await hydrate([data]);
      return { p, images: images.data, tiers: tiers.data };
    },
  });
  useTitle(item.data?.p.name ?? 'Product');
  const form = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { quantity: 1, message: '' },
  });
  const sendQuote = useMutation({
    mutationFn: async (v: z.infer<typeof quoteSchema>) => {
      if (v.quantity < item.data!.p.moq) throw new Error(`Minimum order is ${item.data!.p.moq}.`);
      const { error } = await db()
        .from('quotation_requests')
        .insert({
          ...v,
          buyer_id: session!.user.id,
          business_id: item.data!.p.business_id,
          product_id: id!,
        });
      if (error) throw error;
    },
  });
  const contact = useMutation({
    mutationFn: async () => {
      const bid = item.data!.p.business_id;
      let { data, error } = await db()
        .from('conversations')
        .select('id')
        .eq('buyer_id', session!.user.id)
        .eq('business_id', bid)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const result = await db()
          .from('conversations')
          .insert({ buyer_id: session!.user.id, business_id: bid })
          .select('id')
          .single();
        if (result.error?.code === '23505') {
          const existing = await db()
            .from('conversations')
            .select('id')
            .eq('buyer_id', session!.user.id)
            .eq('business_id', bid)
            .single();
          data = existing.data;
          error = existing.error;
        } else {
          data = result.data;
          error = result.error;
        }
        if (error) throw error;
      }
      navigate(`/dashboard/messages?thread=${data!.id}`);
    },
  });
  const sendReport = useMutation({
    mutationFn: async () => {
      if (report.trim().length < 10 || report.length > 2000)
        throw new Error('Describe the issue in 10–2,000 characters.');
      const { error } = await db()
        .from('reports')
        .insert({ reporter_id: session!.user.id, product_id: id!, reason: report.trim() });
      if (error) throw error;
    },
  });
  if (item.isLoading) return <State title={tr('Loading product\u2026')} />;
  if (item.error)
    return (
      <div className="container page-content">
        <Notice error={item.error} />
      </div>
    );
  if (!item.data)
    return (
      <State
        title={tr('Product not found')}
        description={tr('This listing may be awaiting approval or is no longer available.')}
        action={<Link to="/products">{tr('Browse products')}</Link>}
      />
    );
  const { p, images, tiers } = item.data;
  const canBuy = role === 'buyer';
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.id,
    brand: { '@type': 'Brand', name: p.business?.name },
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'BDT',
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      url: window.location.href,
    },
  };
  return (
    <div className="container page-content">
      <script type="application/ld+json">
        {JSON.stringify(structured).replace(/</g, '\\u003c')}
      </script>
      <div className="breadcrumb">
        <Link to="/products">{tr('Products')}</Link>
        <span>/</span>
        <Link to={`/products?category=${p.category?.slug}`}>{p.category?.name}</Link>
        <span>/</span>
        {p.name}
      </div>
      <div className="product-detail">
        <div>
          <div className="detail-image">
            <ProductImage path={images[active]?.path} alt={p.name} />
            <SaveProduct id={p.id} />
          </div>
          <div className="image-thumbs">
            {images.map((image, i) => (
              <button
                key={image.id}
                className={i === active ? 'active' : ''}
                onClick={() => setActive(i)}
                aria-label={`View product image ${i + 1}`}
              >
                <ProductImage path={image.path} alt={`${p.name} view ${i + 1}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{p.category?.name}</span>
          <h1>{locale === 'bn' && p.name_bn ? p.name_bn : p.name}</h1>
          {p.business?.verified && (
            <span className="verified-label">
              <ShieldCheck size={15} />
              {t.verifiedBadge}
            </span>
          )}
          <div className="detail-price">
            {money(p.price, locale)}
            <small> / {p.unit}</small>
            <span>{tr('Wholesale starting price')}</span>
          </div>
          <div className="detail-facts">
            <div>
              <small>{tr('Minimum order')}</small>
              <strong>
                {p.moq} {p.unit}
                {'s'}
              </strong>
            </div>
            <div>
              <small>{tr('Available stock / capacity')}</small>
              <strong>
                {p.stock.toLocaleString()} {p.unit}
                {'s'}
              </strong>
            </div>
          </div>
          {tiers.length > 0 && (
            <div className="tier-table">
              <h3>{tr('Buy more, source smarter.')}</h3>
              <div>
                {tiers.map((t) => (
                  <span key={t.id}>
                    <small>
                      {t.min_quantity}
                      {'+'}
                      {p.unit}
                      {'s'}
                    </small>
                    <strong>{money(t.price, locale)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="detail-actions">
            {!session ? (
              <Button asChild>
                <Link to={`/auth/login?next=/products/${p.id}`}>
                  {tr('Sign in to contact supplier')}
                  <ArrowUpRight size={16} />
                </Link>
              </Button>
            ) : canBuy ? (
              <>
                <Button
                  variant="accent"
                  onClick={() => {
                    setQuoteOpen(!quoteOpen);
                    form.setValue('quantity', p.moq);
                  }}
                >
                  {t.quote}
                  <ArrowUpRight size={16} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => contact.mutate()}
                  disabled={contact.isPending}
                >
                  <MessageSquare size={17} />
                  {t.contact}
                </Button>
              </>
            ) : (
              <p className="muted">
                {tr('Contact and quotation tools are available to buyer accounts.')}
              </p>
            )}
          </div>
          <Notice error={contact.error} />
          {quoteOpen && (
            <form
              className="form-stack quote-form"
              onSubmit={form.handleSubmit((v) => sendQuote.mutate(v))}
            >
              <h3>{tr('Tell the supplier what you need.')}</h3>
              <Field
                label={`Quantity (minimum ${p.moq})`}
                error={form.formState.errors.quantity?.message}
              >
                <input
                  type="number"
                  min={p.moq}
                  {...form.register('quantity', { valueAsNumber: true })}
                />
              </Field>
              <Field label={tr('Your requirements')} error={form.formState.errors.message?.message}>
                <textarea
                  placeholder={tr(
                    'Include specifications, delivery location, and your timeline\u2026',
                  )}
                  {...form.register('message')}
                />
              </Field>
              <Notice
                error={sendQuote.error}
                success={
                  sendQuote.isSuccess
                    ? tr('Quotation requested. Track the response in your dashboard.')
                    : undefined
                }
              />
              <Button disabled={sendQuote.isPending || sendQuote.isSuccess}>
                {tr('Send request')}
              </Button>
            </form>
          )}
          <div className="detail-supplier">
            <span className="supplier-avatar">{p.business?.name.slice(0, 2)}</span>
            <div>
              <Link to={`/suppliers/${p.business_id}`}>
                <strong>{p.business?.name}</strong>
                <ArrowUpRight size={15} />
              </Link>
              <p>
                <MapPin size={13} />
                {p.business?.district}
                {','}
                {p.business?.division}
              </p>
            </div>
          </div>
          <span className="sourcing-note">
            <Check size={14} />
            {tr('Direct supplier contact \u00B7 No online payment required')}
          </span>
        </div>
      </div>
      <div className="product-description">
        <div>
          <h2>{tr('About this product')}</h2>
          <p className="preserve-lines">{p.description}</p>
          <h3>{tr('Specifications')}</h3>
          <dl>
            {Object.entries(p.specifications ?? {}).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
          <small>
            {tr('Listed')}
            {new Date(p.created_at).toLocaleDateString('en-BD')}
          </small>
        </div>
        <aside>
          <Package size={30} />
          <h3>{tr('Source with confidence.')}</h3>
          <p>
            {tr(
              'Confirm specifications, request samples, and agree on delivery terms directly with your supplier.',
            )}
          </p>
          <Link to="/info/trust">{tr('Read our sourcing guide \u2197')}</Link>
        </aside>
      </div>
      {session && (
        <div className="report-area">
          <button onClick={() => setReportOpen(!reportOpen)}>
            <Flag size={14} />
            {tr('Report this listing')}
          </button>
          {reportOpen && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                sendReport.mutate();
              }}
            >
              <textarea
                aria-label={tr('Report reason')}
                minLength={10}
                maxLength={2000}
                required
                value={report}
                onChange={(e) => setReport(e.target.value)}
                placeholder={tr('Describe the problem with this listing\u2026')}
              />
              <Notice
                error={sendReport.error}
                success={sendReport.isSuccess ? tr('Report submitted for review.') : undefined}
              />
              <Button size="sm" disabled={sendReport.isPending || sendReport.isSuccess}>
                {tr('Submit report')}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
