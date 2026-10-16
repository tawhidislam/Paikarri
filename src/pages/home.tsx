import { useT } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Handshake,
  Factory,
  MapPin,
  Shirt,
  ShoppingBasket,
  Armchair,
  Package,
  Plug,
  Paintbrush,
  Check,
  MoveUpRight,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { catalog, businesses } from '@/lib/catalog';
import { configured } from '@/lib/supabase';
import { ProductCard } from '@/components/product-card';
import { SectionTitle, State, Notice, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
export const categoryTiles = [
  {
    name: 'Apparel & Textiles',
    bn: 'পোশাক ও বস্ত্র',
    slug: 'apparel-textiles',
    icon: Shirt,
    image: 'photo-1489987707025-afc232f7ea0f',
    color: '#f1e7dc',
  },
  {
    name: 'Food & Agriculture',
    bn: 'খাদ্য ও কৃষি',
    slug: 'food-agriculture',
    icon: ShoppingBasket,
    image: 'photo-1542838132-92c53300491e',
    color: '#e7eddb',
  },
  {
    name: 'Home & Living',
    bn: 'ঘর ও জীবনযাপন',
    slug: 'home-living',
    icon: Armchair,
    image: 'photo-1494438639946-1ebd1d20bf85',
    color: '#eae4dc',
  },
  {
    name: 'Packaging & Supplies',
    bn: 'প্যাকেজিং সামগ্রী',
    slug: 'packaging-supplies',
    icon: Package,
    image: 'photo-1607082349566-187342175e2f',
    color: '#eadfd3',
  },
  {
    name: 'Electronics',
    bn: 'ইলেকট্রনিক্স',
    slug: 'electronics',
    icon: Plug,
    image: 'photo-1498049794561-7780e7231661',
    color: '#e3e8eb',
  },
  {
    name: 'Jute & Handicrafts',
    bn: 'পাট ও হস্তশিল্প',
    slug: 'jute-handicrafts',
    icon: Paintbrush,
    image: 'photo-1600210492486-724fe5c67fb0',
    color: '#ede5da',
  },
];
export function SupplierCard({
  business: b,
}: {
  business: Awaited<ReturnType<typeof businesses>>[number];
}) {
  const tr = useT();
  return (
    <Link className="supplier-card" to={`/suppliers/${b.id}`}>
      <div className="supplier-avatar">
        {b.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')}
      </div>
      <div>
        <span className="verified-label">
          <ShieldCheck size={13} />
          {tr(b.verified ? 'VERIFIED SUPPLIER' : 'SUPPLIER')}
        </span>
        <h3>{b.name}</h3>
        <p>
          <MapPin size={13} />
          {b.district}
          {','}
          {b.division}
        </p>
      </div>
      <ArrowUpRight size={19} />
    </Link>
  );
}
export default function Home() {
  const tr = useT();
  const { t, locale } = useLocale();
  useTitle(t.tagline);
  const products = useQuery({
    queryKey: ['catalog', 'home'],
    queryFn: () => catalog(),
    enabled: configured,
  });
  const suppliers = useQuery({
    queryKey: ['businesses'],
    queryFn: businesses,
    enabled: configured,
  });
  return (
    <>
      <section className="hero-wrap">
        <div className="container">
          <div className="hero">
            <div className="hero-copy">
              <span className="hero-eyebrow">
                <span />
                {t.heroEyebrow}
              </span>
              <h1>
                {t.heroTitle.split('\n').map((s, i) => (
                  <span key={s}>
                    {i === 1 ? <em>{s}</em> : s}
                    <br />
                  </span>
                ))}
              </h1>
              <p>{t.heroBody}</p>
              <div className="hero-buttons">
                <Button asChild variant="accent">
                  <Link to="/products">
                    {t.explore}
                    <ArrowUpRight size={17} />
                  </Link>
                </Button>
                <Link to="/suppliers" className="hero-secondary">
                  {t.findSuppliers}
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="hero-popular">
                <span>{t.popular}:</span>
                {['T-shirts', 'Jute bags', 'Rice'].map((x) => (
                  <Link key={x} to={`/products?q=${encodeURIComponent(x)}`}>
                    {x}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-photo hero-photo-main">
                <img
                  src="/images/photo-1600210492486-724fe5c67fb0.jpg"
                  alt="Natural textiles and handcrafted furniture in a warm interior"
                />
                <span className="photo-caption">{tr('LOCAL CRAFT. GLOBAL POTENTIAL.')}</span>
              </div>
              <div className="hero-photo hero-photo-small">
                <img
                  src="/images/photo-1489987707025-afc232f7ea0f.jpg"
                  alt="Cotton garments on a clothing rail"
                />
              </div>
              <div className="source-card">
                <span className="source-icon">
                  <ShieldCheck size={24} />
                </span>
                <div>
                  <strong>{tr('From the source.')}</strong>
                  <span>{tr('For your next big move.')}</span>
                </div>
                <span className="source-dot" />
              </div>
              <span className="hero-orbit">
                {tr(
                  '\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7 \u09A4\u09C8\u09B0\u09BF',
                )}
                <span>✳</span>
                {tr('MADE IN BANGLADESH')}
              </span>
              <div className="hero-corner">
                01 <span>{tr('/ LOCAL POSSIBILITIES')}</span>
              </div>
            </div>
          </div>
          <div className="trust-strip">
            <div>
              <ShieldCheck />
              <span>
                <strong>{tr('Confidence in every connection')}</strong>
                <small>{tr('Discover verified suppliers')}</small>
              </span>
            </div>
            <div>
              <Factory />
              <span>
                <strong>{tr('Straight from the source')}</strong>
                <small>{tr('Connect directly with businesses')}</small>
              </span>
            </div>
            <div>
              <Handshake />
              <span>
                <strong>{tr('Built for wholesale')}</strong>
                <small>{tr('Bulk quantities. Better possibilities.')}</small>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <strong>{tr('All across Bangladesh')}</strong>
                <small>{tr('Local sourcing, nationwide reach')}</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="container section">
        <SectionTitle
          eyebrow="FIND YOUR INDUSTRY"
          title={t.featured}
          description={t.featuredSub}
          to="/products"
          label={tr('Explore categories')}
        />
        <div className="category-grid">
          {categoryTiles.map((c) => (
            <Link className="category-tile" to={`/products?category=${c.slug}`} key={c.slug}>
              <div className="category-photo" style={{ backgroundColor: c.color }}>
                <img
                  src={
                    c.slug === 'packaging-supplies'
                      ? '/images/packaging.svg'
                      : c.slug === 'jute-handicrafts'
                        ? '/images/jute.svg'
                        : `/images/${c.image}.jpg`
                  }
                  alt=""
                  loading="lazy"
                />
                <span>
                  <c.icon size={23} />
                </span>
              </div>
              <h3>{locale === 'bn' ? c.bn : c.name}</h3>
              <span>
                {tr('Explore products')}
                <ArrowUpRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="container section catalog-section">
        <SectionTitle
          eyebrow="SOURCED FOR YOUR BUSINESS"
          title={t.trending}
          description={t.trendingSub}
          to="/products"
          label={t.viewAll}
        />
        <div className="catalog-tabs">
          <Link className="active" to="/products">
            {tr('All products')}
          </Link>
          {categoryTiles.slice(0, 4).map((c) => (
            <Link key={c.slug} to={`/products?category=${c.slug}`}>
              {locale === 'bn' ? c.bn : c.name}
            </Link>
          ))}
        </div>
        <Notice error={products.error} />
        {products.isLoading ? (
          <State title={t.loading} />
        ) : products.data?.items.length ? (
          <div className="product-grid">
            {products.data.items.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <State
            title={configured ? t.noProducts : tr('Your marketplace starts here')}
            description={
              configured
                ? tr('Approved supplier listings will appear here.')
                : tr('Connect your Supabase Cloud project to discover live products and suppliers.')
            }
            action={
              <Button asChild variant="outline">
                <Link to={configured ? '/dashboard/business' : '/info/setup'}>
                  {configured ? t.sell : tr('Cloud setup guide')}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            }
          />
        )}
      </section>
      <section className="sourcing-banner container">
        <div className="sourcing-symbol">✳</div>
        <div>
          <span className="eyebrow">{tr('BETTER TOGETHER')}</span>
          <h2>
            {tr('Your next supplier could be')}
            <br />
            {tr('your next great partnership.')}
          </h2>
        </div>
        <div>
          <p>
            {tr('Find the people behind the products.')}
            <br />
            {tr('Source with confidence, grow with connection.')}
          </p>
          <Button asChild variant="outline">
            <Link to="/suppliers">
              {tr('Explore suppliers')}
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      </section>
      <section className="container section">
        <SectionTitle
          eyebrow="REAL BUSINESSES. NEW CONNECTIONS."
          title={t.verified}
          description={t.verifiedSub}
          to="/suppliers"
          label={tr('Find your supplier')}
        />
        <Notice error={suppliers.error} />
        {suppliers.data?.some((b) => b.verified) ? (
          <div className="supplier-grid">
            {suppliers.data
              .filter((b) => b.verified)
              .slice(0, 3)
              .map((b) => (
                <SupplierCard key={b.id} business={b} />
              ))}
          </div>
        ) : (
          <div className="supplier-invite">
            <ShieldCheck size={34} />
            <div>
              <h3>{tr('Trust starts with a verified business.')}</h3>
              <p>{tr('Business documents are reviewed before a verification badge is awarded.')}</p>
            </div>
            <Link className="text-link" to="/info/trust">
              {tr('Our verification process')}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <section className="container section fresh-section">
        <SectionTitle
          eyebrow="KEEP YOUR BUSINESS MOVING"
          title={t.newArrivals}
          description={tr('Explore the latest additions from Bangladesh\u2019s suppliers.')}
          to="/products?sort=newest"
          label={tr('See what’s new')}
        />
        {products.data?.items.length ? (
          <div className="product-grid">
            {products.data.items.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="fresh-empty">
            <Package size={25} />
            <p>
              {tr('Fresh stock, new ideas, more possibilities.')}{' '}
              <Link to="/products?sort=newest">
                {tr('Explore new arrivals')}
                <ArrowRight size={15} />
              </Link>
            </p>
          </div>
        )}
      </section>
      <section className="container deals-panel">
        <div>
          <span className="eyebrow">{tr('SMART SOURCING')}</span>
          <h2>{t.deals}</h2>
          <p>
            {tr('Discover quantity pricing and compare minimum orders.')}
            <br />
            {tr('Find the right fit for your next bulk purchase.')}
          </p>
          <Link to="/products?sort=price-asc" className="text-link">
            {tr('Explore wholesale prices')}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="deal-steps">
          <span>
            01 <strong>{tr('Discover')}</strong>
            <small>{tr('Find the right product')}</small>
          </span>
          <span>
            02 <strong>{tr('Connect')}</strong>
            <small>{tr('Talk directly to suppliers')}</small>
          </span>
          <span>
            03 <strong>{tr('Negotiate')}</strong>
            <small>{tr('Request your bulk price')}</small>
          </span>
        </div>
      </section>
      <section className="container supplier-cta">
        <div>
          <span className="eyebrow">{tr('GROW WITH PAIKARI')}</span>
          <h2>
            {t.ctaTitle.split('\n').map((s) => (
              <span key={s}>
                {s}
                <br />
              </span>
            ))}
          </h2>
          <p>{t.ctaBody}</p>
          <Button asChild variant="accent">
            <Link to="/dashboard/business">
              {t.ctaButton}
              <ArrowUpRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="cta-graphic">
          <div className="cta-ring">
            <MoveUpRight size={100} strokeWidth={1.2} />
          </div>
          <span className="cta-chip">
            <Check size={15} />
            {tr('Your products. A bigger market.')}
          </span>
        </div>
      </section>
    </>
  );
}
