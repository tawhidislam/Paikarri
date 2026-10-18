import { ShippingCalculator } from '@/components/growth/shipping';
import { ProductTools } from '@/components/growth/product-tools';
import { ProductGallery } from '@/components/product/gallery';
import { CompareButton } from '@/components/product/compare-button';
import { ProductDelivery } from '@/components/product/delivery';
import { ProductReviews } from '@/components/product/reviews';
import { Recommendations } from '@/components/product/recommendations';
import { SaveSupplier } from '@/components/save-supplier';
import { formatQuantity, formatUnit } from '@/lib/units';
import './product.css';
import { OrderPurchase } from '@/components/order-purchase';
import { ChatButton } from '@/components/marketplace-chat';
import { useT } from '@/lib/i18n';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, ShieldCheck, ArrowUpRight, Flag, Check, Package } from 'lucide-react';
import { db, configured } from '@/lib/supabase';
import { hydrate } from '@/lib/catalog';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { money } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Notice, State, useTitle } from '@/components/shared';
export default function ProductPage() {
  const tr = useT();
  const { id } = useParams();
  const { locale, t } = useLocale();
  const { session, role } = useAuth();
  const [shippingSubtotal, setShippingSubtotal] = useState(0);
  const [variantImage, setVariantImage] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState('');
  const item = useQuery({
    queryKey: ['product', id],
    enabled: configured,
    queryFn: async () => {
      const [{ data, error }, images, tiers] = await Promise.all([
        db().rpc('public_products').eq('id', id!).maybeSingle(),
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
      <div className="container page-content pd-page">
        <Notice error={item.error} />
        <Button variant="outline" onClick={() => void item.refetch()}>
          {tr('Try again')}
        </Button>
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
  const { p, images } = item.data;
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
    <div className="container page-content pd-page">
      <script type="application/ld+json">
        {JSON.stringify(structured).replace(/</g, '\\u003c')}
      </script>
      <div className="breadcrumb">
        <Link to="/products">{tr('Products')}</Link>
        <span>/</span>
        <Link to={`/products?category=${p.category?.slug}`}>
          {locale === 'bn' && p.category?.name_bn ? p.category.name_bn : p.category?.name}
        </Link>
        <span>/</span>
        {locale === 'bn' && p.name_bn ? p.name_bn : p.name}
      </div>
      <div className="product-detail">
        <ProductGallery
          key={p.id}
          images={images}
          selectedImage={variantImage}
          name={locale === 'bn' && p.name_bn ? p.name_bn : p.name}
          id={p.id}
        />
        <div className="detail-copy">
          <span className="eyebrow">
            {locale === 'bn' && p.category?.name_bn ? p.category.name_bn : p.category?.name}
          </span>
          <h1>{locale === 'bn' && p.name_bn ? p.name_bn : p.name}</h1>
          {p.business?.verified && (
            <span className="verified-label">
              <ShieldCheck size={15} />
              {t.verifiedBadge}
            </span>
          )}
          <div className="detail-price">
            {money(p.price, locale)}
            <small> / {formatUnit(p.unit, 1, locale)}</small>
            <span>{tr('Wholesale starting price')}</span>
          </div>
          <div className="detail-facts">
            <div>
              <small>{tr('Minimum order')}</small>
              <strong>{formatQuantity(p.moq, p.unit, locale)}</strong>
            </div>
            <div>
              <small>{tr('Available stock')}</small>
              <strong>{formatQuantity(p.stock, p.unit, locale)}</strong>
            </div>
          </div>
          <OrderPurchase
            key={p.id}
            product={p}
            onVariantImage={setVariantImage}
            onSubtotalChange={setShippingSubtotal}
          />
          <div className="detail-actions">
            {!session ? (
              <ChatButton business={p.business_id} product={p.id} />
            ) : canBuy ? (
              <>
                <ChatButton business={p.business_id} product={p.id} />
              </>
            ) : (
              <p className="muted">
                {tr('Contact and quotation tools are available to buyer accounts.')}
              </p>
            )}
          </div>
          <CompareButton id={p.id} />
          <div className="detail-supplier">
            <span className="supplier-avatar">{p.business?.name.slice(0, 2)}</span>
            <div>
              <Link to={`/suppliers/${p.business_id}`}>
                <strong>
                  {locale === 'bn' && p.business?.name_bn ? p.business.name_bn : p.business?.name}
                </strong>
                <ArrowUpRight size={15} />
              </Link>
              <p>
                <MapPin size={13} />
                {tr(p.business?.district ?? '')}
                {','}
                {tr(p.business?.division ?? '')}
              </p>
            </div>
          </div>
          {p.business?.description && <p className="muted">{p.business.description}</p>}
          {p.business?.verified && (
            <p className="pd-verification-note">
              {tr(
                'Owner identity, trade licence and bank details have been reviewed. Confirm product quality and delivery terms directly.',
              )}
            </p>
          )}
          <SaveSupplier id={p.business_id} />
          <span className="sourcing-note">
            <Check size={14} />
            {tr('Order with supplier confirmation · Cash on delivery or bank transfer')}
          </span>
        </div>
      </div>
      <ProductDelivery id={p.id} />
      <section className="pd-section">
        <ShippingCalculator business={p.business_id} subtotal={shippingSubtotal} />
      </section>
      <ProductTools product={p} />
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
      <ProductReviews id={p.id} />
      <Recommendations product={p} />
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
