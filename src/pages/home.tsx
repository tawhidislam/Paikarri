import { StoreAvatar } from '@/components/store-picture';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Factory,
  MapPin,
  Package,
  Search,
  RefreshCw,
  MoveUpRight,
  ShoppingBag,
  IdCard,
  Building2,
  Landmark,
  Truck,
} from 'lucide-react';
import { defaultHomepage, useHomepage, type HomepageConfig } from '@/lib/operations';
import { useLocale, useT } from '@/lib/i18n';
import { searchHref } from '@/lib/search';
import {
  categories,
  hydrate,
  signedImage,
  homepageProducts,
  homepageSuppliers,
  isDemoListing,
  marketplaceStats,
} from '@/lib/catalog';
import type { Business } from '@/lib/models';
import { configured, db } from '@/lib/supabase';
import { ProductCard } from '@/components/product-card';
import { SupplierAccessLink } from '@/components/supplier-access-link';
import { useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import './home.css';

const defaultHeroImage = 'wholesale-sourcing.svg';
const mobileImagePlaceholder = '/images/mobile-empty.svg';

const trendingTags = [
  { en: 'Cotton Yarn', bn: 'কটন সুতা', query: 'cotton yarn' },
  { en: 'Corrugated Cartons', bn: 'কার্টন বক্স', query: 'corrugated carton' },
  { en: 'Denim Fabric', bn: 'ডেনিম ফেব্রিক', query: 'denim fabric' },
  { en: 'Jute Bags', bn: 'পাটের ব্যাগ', query: 'jute bags' },
  { en: 'Garment Accessories', bn: 'গার্মেন্টস এক্সেসরিজ', query: 'garment accessories' },
];

/** WebP variants keep source photography intact; originals remain the browser fallback. */
function LocalPhoto({
  filename,
  alt,
  sizes,
  hero = false,
  category = false,
}: {
  filename: string;
  alt: string;
  sizes: string;
  hero?: boolean;
  category?: boolean;
}) {
  const tr = useT();
  const [failed, setFailed] = useState(0);
  const raster = filename.endsWith('.jpg');
  const name = filename.replace(/\.jpg$/, '');
  const dimensions =
    filename === defaultHeroImage || filename.includes('1542838132')
      ? { width: 800, height: 600 }
      : { width: 800, height: filename.includes('1494438639946') ? 536 : 533 };
  if (failed > 1)
    return category ? (
      <img src="/images/packaging.svg" alt="" width="240" height="150" loading="lazy" />
    ) : (
      <div className="home-photo-placeholder" role="img" aria-label={alt}>
        <Package size={30} />
        <span>{tr('Image unavailable')}</span>
      </div>
    );
  return (
    <picture>
      {hero && <source media="(max-width: 700px)" srcSet={mobileImagePlaceholder} />}
      {raster && failed === 0 && (
        <source
          type="image/webp"
          srcSet={[320, 640, 800]
            .map((width) => `/images/${name}-${width}.webp ${width}w`)
            .join(', ')}
          sizes={sizes}
        />
      )}
      <img
        src={`/images/${filename}`}
        alt={alt}
        {...(raster || hero ? dimensions : { width: 240, height: 150 })}
        loading={hero ? 'eager' : 'lazy'}
        fetchPriority={hero ? 'high' : 'auto'}
        onError={(event) => setFailed(event.currentTarget.currentSrc.endsWith('.webp') ? 1 : 2)}
      />
    </picture>
  );
}

// Static assets describe an industry; live category records determine every link and label.
export const categoryTiles = [
  {
    slug: 'apparel-textiles',
    image: 'photo-1489987707025-afc232f7ea0f.jpg',
    color: '#f1e7dc',
  },
  {
    slug: 'food-agriculture',
    image: 'photo-1542838132-92c53300491e.jpg',
    color: '#e7eddb',
  },
  {
    slug: 'home-living',
    image: 'photo-1494438639946-1ebd1d20bf85.jpg',
    color: '#eae4dc',
  },
  { slug: 'packaging-supplies', image: 'packaging.svg', color: '#eadfd3' },
  {
    slug: 'electronics',
    image: 'photo-1498049794561-7780e7231661.jpg',
    color: '#e3e8eb',
  },
  { slug: 'jute-handicrafts', image: 'jute.svg', color: '#ede5da' },
];

export function SupplierCard({ business: b }: { business: Business }) {
  const tr = useT();
  const { locale } = useLocale();
  const name = locale === 'bn' && b.name_bn ? b.name_bn : b.name;
  return (
    <Link className="supplier-card home-supplier-card" to={`/suppliers/${b.id}`}>
      <StoreAvatar business={b} name={name} className="supplier-avatar" />
      <div className="home-supplier-copy">
        <span className="verified-label">
          {b.verified && <ShieldCheck size={13} />}
          {tr(b.verified ? 'VERIFIED SUPPLIER' : 'SUPPLIER')}
        </span>
        <h3>{name}</h3>
        <p className="home-supplier-location">
          <MapPin size={13} />
          {tr(b.district)}, {tr(b.division)}
        </p>
        {b.description && <p className="home-supplier-description">{b.description}</p>}
        <span className="home-supplier-view">
          {tr('View supplier')} <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function Heading({
  title,
  description,
  href,
  label,
  eyebrow,
}: {
  title: string;
  description?: string;
  href?: string;
  label?: string;
  eyebrow?: string;
}) {
  const tr = useT();
  return (
    <div className="home-section-heading">
      <div>
        {eyebrow && <span className="home-section-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link className="home-section-link" to={href} aria-label={label}>
          <span className="home-section-link-full">{label}</span>
          <span className="home-section-link-short" aria-hidden="true">
            {tr('View all')}
          </span>
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

function LoadingCards({
  kind,
  count,
}: {
  kind: 'products' | 'categories' | 'suppliers';
  count: number;
}) {
  const tr = useT();
  return (
    <div
      className={`home-${kind}-grid home-skeleton-grid`}
      role="status"
      aria-label={tr('Loading marketplace content')}
    >
      <span className="sr-only">{tr('Loading marketplace content')}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`home-skeleton home-skeleton-${kind}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function LoadError({
  kind,
  retry,
}: {
  kind: 'products' | 'categories' | 'suppliers';
  retry: () => void;
}) {
  const tr = useT();
  const title = {
    products: 'We couldn’t load products',
    categories: 'We couldn’t load categories',
    suppliers: 'We couldn’t load suppliers',
  }[kind];
  return (
    <div className="home-load-error" role="alert">
      <div>
        <h3>{tr(title)}</h3>
        <p>{tr('Please check your connection and try again.')}</p>
      </div>
      <Button variant="outline" onClick={retry}>
        <RefreshCw size={15} />
        {tr('Try again')}
      </Button>
    </div>
  );
}

export default function Home({ previewConfig }: { previewConfig?: HomepageConfig } = {}) {
  const tr = useT();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [heroSearch, setHeroSearch] = useState('');
  useTitle(t.tagline);
  const published = useHomepage();
  const config = previewConfig ?? published.data ?? defaultHomepage;
  const text = (en: string, bn: string) => (locale === 'bn' ? bn : en);
  const categoryList = useQuery({
    queryKey: ['categories'],
    queryFn: categories,
    enabled: configured,
  });
  const featured = useQuery({
    queryKey: ['homepage-featured', config.product_ids],
    enabled: configured && config.show_products,
    queryFn: async () => {
      if (!config.product_ids.length) return homepageProducts([], 8);
      const { data, error } = await db().rpc('public_products').in('id', config.product_ids);
      if (error) throw error;
      const listings = await hydrate(data);
      return config.product_ids.flatMap((id) => listings.filter((p) => p.id === id)).slice(0, 8);
    },
  });
  const featuredIds = (config.show_products ? (featured.data ?? []) : []).map((p) => p.id);
  const arrivals = useQuery({
    queryKey: ['homepage-arrivals', featuredIds],
    enabled: configured && config.show_arrivals && (!config.show_products || !featured.isLoading),
    queryFn: () => homepageProducts(featuredIds, 4),
  });
  const suppliers = useQuery({
    queryKey: ['homepage-suppliers', config.supplier_ids],
    enabled: configured && config.show_suppliers,
    queryFn: () => homepageSuppliers(config.supplier_ids, 3),
  });
  const heroImage = useQuery({
    queryKey: ['marketing-image', config.hero_image],
    enabled: configured && !!config.hero_image,
    staleTime: 240000,
    refetchInterval: 240000,
    refetchOnWindowFocus: 'always',
    queryFn: () => signedImage(config.hero_image!, 'marketing-assets'),
  });
  const stats = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: marketplaceStats,
    enabled: configured,
    staleTime: 300000,
  });
  const [failedHeroUrl, setFailedHeroUrl] = useState<string | null>(null);
  const [loadedHeroUrl, setLoadedHeroUrl] = useState<string | null>(null);
  const signedHeroUrl = heroImage.data;
  const useCustomImage = !!config.hero_image && !!signedHeroUrl && failedHeroUrl !== signedHeroUrl;
  const awaitingHeroImage =
    !!config.hero_image &&
    ((heroImage.isPending && configured) || (useCustomImage && loadedHeroUrl !== signedHeroUrl));
  const fallbackHeroAlt = tr(
    'Illustration of a wholesale warehouse, cartons, and a delivery trolley',
  );
  const displayedCategories = config.category_ids.length
    ? config.category_ids.flatMap((id) => categoryList.data?.filter((c) => c.id === id) ?? [])
    : (categoryList.data?.filter((c) => !c.parent_id).slice(0, 6) ?? []);
  const featureBusy = featured.isLoading;
  const arrivalBusy = arrivals.isLoading || (config.show_products && featured.isLoading);

  return (
    <div className="marketplace-home">
      {config.show_announcement && (
        <div className="home-announcement">
          {config.announcement_href ? (
            <Link to={config.announcement_href}>
              {text(config.announcement_en, config.announcement_bn)}
              <ArrowUpRight size={15} />
            </Link>
          ) : (
            text(config.announcement_en, config.announcement_bn)
          )}
        </div>
      )}
      <section className="home-hero-wrap">
        <div className="container">
          <div className="home-hero">
            <div className="home-hero-copy">
              <span className="home-eyebrow">
                <span />
                {text(config.hero_eyebrow_en, config.hero_eyebrow_bn)}
              </span>
              <h1>
                {text(config.hero_title_en, config.hero_title_bn)
                  .split('\n')
                  .map((line, i) => (
                    <span key={`${i}-${line}`}>{i === 1 ? <em>{line}</em> : line}</span>
                  ))}
              </h1>
              <p className="home-hero-desc">{text(config.hero_body_en, config.hero_body_bn)}</p>
              <div className="home-hero-search-console">
                <form
                  className="home-hero-search"
                  role="search"
                  aria-label={tr('Search products')}
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate(searchHref(heroSearch));
                  }}
                >
                  <div className="home-search-badge" aria-hidden="true">
                    <Factory size={14} />
                    <span>{tr('Wholesale')}</span>
                  </div>
                  <Search size={18} aria-hidden="true" className="home-search-icon" />
                  <input
                    type="search"
                    placeholder={tr('Search wholesale products, factories, yarn, cartons…')}
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    aria-label={t.search}
                  />
                  <button type="submit">{t.searchButton}</button>
                </form>
                <div className="home-hero-trending" aria-label={tr('Trending wholesale searches')}>
                  <span className="home-trending-label">{tr('Trending:')}</span>
                  {trendingTags.map((tag) => (
                    <button
                      key={tag.en}
                      type="button"
                      className="home-hero-chip"
                      onClick={() => {
                        const label = locale === 'bn' ? tag.bn : tag.en;
                        setHeroSearch(label);
                        navigate(searchHref(tag.query));
                      }}
                    >
                      {locale === 'bn' ? tag.bn : tag.en}
                    </button>
                  ))}
                </div>
              </div>
              <div className="home-hero-actions">
                <Button asChild variant="accent">
                  <Link to={config.hero_href}>
                    {text(config.hero_button_en, config.hero_button_bn)}
                    <ArrowUpRight size={17} />
                  </Link>
                </Button>
                <Link className="home-secondary-action" to="/suppliers">
                  {t.findSuppliers}
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="home-hero-mobile-badges" aria-hidden="true">
                <span>
                  <ShieldCheck size={14} />
                  {tr('Verified Manufacturer')}
                </span>
                <span>
                  <Landmark size={14} />
                  {tr('BRAC Bank Escrow')}
                </span>
                <span>
                  <Truck size={14} />
                  {tr('Across 64 Districts')}
                </span>
              </div>
            </div>
            <div className="home-hero-art">
              <div className="home-main-photo">
                {useCustomImage ? (
                  <picture>
                    <source media="(max-width: 700px)" srcSet={mobileImagePlaceholder} />
                    <img
                      src={signedHeroUrl}
                      alt={text(config.hero_alt_en, config.hero_alt_bn)}
                      width="800"
                      height="600"
                      loading="eager"
                      fetchPriority="high"
                      className={awaitingHeroImage ? 'home-photo-pending' : ''}
                      onLoad={() => setLoadedHeroUrl(signedHeroUrl)}
                      onError={() => setFailedHeroUrl(signedHeroUrl)}
                    />
                  </picture>
                ) : (
                  !awaitingHeroImage && (
                    <LocalPhoto
                      key={defaultHeroImage}
                      filename={defaultHeroImage}
                      alt={fallbackHeroAlt}
                      sizes="(min-width: 1400px) 560px, (min-width: 701px) 42vw, 1px"
                      hero
                    />
                  )
                )}
                {awaitingHeroImage && (
                  <div
                    className="home-photo-placeholder"
                    role="status"
                    aria-label={tr('Loading image')}
                  >
                    <Package size={30} />
                    <span>{tr('Loading image')}</span>
                  </div>
                )}
                <span>{tr('LOCAL SOURCING. NEW POSSIBILITIES.')}</span>
              </div>
              <div className="home-hero-badge-float home-hero-badge-top">
                <div className="badge-icon-wrap verified">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong>{tr('Verified Manufacturer')}</strong>
                  <span>{tr('Direct Factory Rate')}</span>
                </div>
              </div>
              <div className="home-hero-badge-float home-hero-badge-bottom">
                <div className="badge-icon-wrap escrow">
                  <Landmark size={18} />
                </div>
                <div>
                  <strong>{tr('BRAC Bank Escrow Protected')}</strong>
                  <span>{tr('100% Payout Security')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="home-trust-strip">
            <div>
              <ShieldCheck size={20} />
              <span>
                {stats.data
                  ? tr('{count}+ verified suppliers').replace(
                      '{count}',
                      new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
                        stats.data.supplierCount,
                      ),
                    )
                  : tr('Verified business profiles')}
              </span>
            </div>
            <div>
              <Factory size={20} />
              <span>
                {stats.data
                  ? tr('{count}+ wholesale products').replace(
                      '{count}',
                      new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
                        stats.data.productCount,
                      ),
                    )
                  : tr('Direct wholesale MOQs')}
              </span>
            </div>
            <div>
              <Landmark size={20} />
              <span>{tr('BRAC Bank Escrow Protected')}</span>
            </div>
            <div>
              <Truck size={20} />
              <span>{tr('Nationwide Delivery (64 Districts)')}</span>
            </div>
          </div>
        </div>
      </section>

      {config.show_categories && (
        <section className="container home-section" data-testid="home-categories">
          <Heading
            eyebrow={tr('FIND YOUR INDUSTRY')}
            title={t.featured}
            href="/products"
            label={tr('View all products')}
          />
          {categoryList.isLoading ? (
            <LoadingCards kind="categories" count={6} />
          ) : categoryList.isError ? (
            <LoadError kind="categories" retry={() => void categoryList.refetch()} />
          ) : displayedCategories.length ? (
            <div className="home-categories-grid">
              {displayedCategories.map((c) => {
                const asset = categoryTiles.find((tile) => tile.slug === c.slug) ?? {
                  image: 'packaging.svg',
                  color: '#edf1e5',
                };
                return (
                  <Link
                    className="home-category"
                    to={`/products?category=${encodeURIComponent(c.slug)}`}
                    key={c.id}
                  >
                    <div className="home-category-image" style={{ backgroundColor: asset.color }}>
                      <LocalPhoto
                        key={asset.image}
                        filename={asset.image}
                        alt=""
                        sizes="(min-width: 1400px) 200px, (min-width: 701px) 16vw, 30vw"
                        category
                      />
                    </div>
                    <h3>{locale === 'bn' ? c.name_bn : c.name}</h3>
                    <ArrowUpRight className="home-category-arrow" size={16} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="home-subtle-empty">
              {tr('Categories will appear here as the marketplace grows.')}
            </p>
          )}
        </section>
      )}

      {config.show_products && (
        <section className="container home-section" data-testid="home-featured">
          <Heading
            title={tr('Featured wholesale products')}
            description={tr('Compare prices, minimum orders, and suppliers.')}
            href="/products"
            label={tr('View all products')}
          />
          {!featureBusy && !featured.isError && featured.data?.some(isDemoListing) && (
            <aside className="home-demo-notice" aria-label={tr('Demo catalog')}>
              <Package size={20} aria-hidden="true" />
              <div>
                <strong>{tr('Demo catalog')}</strong>
                <p>
                  {tr(
                    'Listings marked [DEMO] and suppliers marked [TEST] are fictional. Their images are illustrative, and they are not real commercial offers.',
                  )}
                </p>
              </div>
            </aside>
          )}
          {featureBusy ? (
            <LoadingCards kind="products" count={4} />
          ) : featured.isError ? (
            <LoadError kind="products" retry={() => void featured.refetch()} />
          ) : featured.data?.length ? (
            <div className="home-products-grid">
              {featured.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="home-discovery-empty">
              <Package size={30} strokeWidth={1.4} />
              <div>
                <h3>{tr('New products are on the way')}</h3>
                <p>
                  {tr(
                    'Browse categories or connect with suppliers while approved listings are added.',
                  )}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/suppliers">
                  {tr('Explore suppliers')}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {config.show_suppliers && (
        <section
          className="container home-section home-supplier-section"
          data-testid="home-suppliers"
        >
          <div className="home-supplier-intro">
            <span className="home-assurance-mark">
              <ShieldCheck size={27} strokeWidth={1.4} />
              {tr('BUSINESS, WITH CONFIDENCE')}
            </span>
            <Heading
              title={tr('Verified suppliers')}
              description={tr('Meet businesses whose documents have been reviewed.')}
            />
            <p>
              {tr(
                'Know the business behind your next order. Review supplier profiles and start a direct conversation.',
              )}
            </p>
            <div className="home-verification-checks">
              {[
                [IdCard, 'Owner identity'],
                [Building2, 'Trade licence'],
                [Landmark, 'Bank details'],
              ].map(([Icon, label]) => {
                const Mark = Icon as typeof IdCard;
                return (
                  <span key={String(label)}>
                    <Mark size={16} />
                    {tr(String(label))}
                  </span>
                );
              })}
            </div>
            <Link className="home-section-link" to="/suppliers?verified=true">
              {tr('Explore suppliers')}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="home-supplier-results">
            {suppliers.isLoading ? (
              <LoadingCards kind="suppliers" count={3} />
            ) : suppliers.isError ? (
              <LoadError kind="suppliers" retry={() => void suppliers.refetch()} />
            ) : suppliers.data?.length ? (
              <div className="home-suppliers-grid">
                {suppliers.data.map((b) => (
                  <SupplierCard key={b.id} business={b} />
                ))}
              </div>
            ) : (
              <div className="home-supplier-invite">
                <ShieldCheck size={30} strokeWidth={1.4} />
                <div>
                  <h3>{tr('Meet our supplier community')}</h3>
                  <p>
                    {tr(
                      'Verified suppliers will appear here as businesses complete their reviews.',
                    )}
                  </p>
                </div>
                <Link className="home-section-link" to="/info/trust">
                  {tr('How verification works')}
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {config.show_arrivals && (arrivalBusy || arrivals.isError || !!arrivals.data?.length) && (
        <section className="container home-section" data-testid="home-arrivals">
          <Heading
            title={tr('New arrivals')}
            description={tr('The latest approved products from active suppliers.')}
            href="/products?sort=newest"
            label={tr('See what’s new')}
          />
          {arrivalBusy ? (
            <LoadingCards kind="products" count={4} />
          ) : arrivals.isError ? (
            <LoadError kind="products" retry={() => void arrivals.refetch()} />
          ) : (
            <div className="home-products-grid">
              {arrivals.data?.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {config.show_deals && (
        <section className="container home-section home-sourcing-guide">
          <Heading
            eyebrow={tr('A BETTER WAY TO SOURCE')}
            title={tr('How wholesale sourcing works')}
            description={tr('Find your product. Meet your supplier. Make your next move.')}
          />
          <div className="home-guide-grid">
            {[
              {
                icon: Search,
                title: 'Find the right product',
                body: 'Compare wholesale prices, order quantities, and locations.',
                href: '/products',
                link: 'Browse products',
              },
              {
                icon: Factory,
                title: 'Choose your supplier',
                body: 'Review business profiles, verification, and product details.',
                href: '/suppliers',
                link: 'Find suppliers',
              },
              {
                icon: ShoppingBag,
                title: 'Order with confidence',
                body: 'Review delivery terms, place your order, and follow progress in your workspace.',
                href: '/products',
                link: 'Start sourcing',
              },
            ].map((step, i) => (
              <div className="home-guide-step" key={step.title}>
                <div className="home-guide-icon">
                  <step.icon size={22} />
                  <span>
                    {new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
                      minimumIntegerDigits: 2,
                    }).format(i + 1)}
                  </span>
                </div>
                <h3>{tr(step.title)}</h3>
                <p>{tr(step.body)}</p>
                <Link className="home-section-link" to={step.href}>
                  {tr(step.link)}
                  <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {config.show_supplier_cta && (
        <section className="container home-section home-supplier-cta">
          <div>
            <span className="home-eyebrow">{tr('GROW WITH PAIKARII.COM')}</span>
            <h2>{t.ctaTitle.split('\n').join(' ')}</h2>
            <p>{t.ctaBody}</p>
            <Button asChild variant="accent">
              <SupplierAccessLink>
                {t.ctaButton}
                <ArrowUpRight size={17} />
              </SupplierAccessLink>
            </Button>
          </div>
          <div className="home-cta-art" aria-hidden="true">
            <MoveUpRight size={100} strokeWidth={1.2} />
            <span>{tr('YOUR NEXT CHAPTER')}</span>
          </div>
        </section>
      )}
    </div>
  );
}
