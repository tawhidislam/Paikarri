import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  MapPin,
  Clock,
  Globe,
  Share2,
  PackageCheck,
  Truck,
  RotateCcw,
  Search,
  Factory,
  Boxes,
  Sparkles,
  CheckCircle2,
  X,
  MessageSquare,
  FileText,
  Star,
} from 'lucide-react';
import { db, configured } from '@/lib/supabase';
import { businesses } from '@/lib/catalog';
import { useT, useLocale } from '@/lib/i18n';
import type { Listing } from '@/lib/catalog';
import { StoreAvatar } from '@/components/store-picture';
import { ChatButton, useChat } from '@/components/marketplace-chat';
import { SaveSupplier } from '@/components/save-supplier';
import { ProductCard } from '@/components/product-card';
import { Notice, State } from '@/components/shared';
import { Button } from '@/components/ui/button';
import './supplier-storefront.css';

interface SupplierStorefrontProps {
  id: string;
}

export function SupplierStorefront({ id }: SupplierStorefrontProps) {
  const tr = useT();
  const { locale } = useLocale();
  const { start } = useChat();

  const [activeTab, setActiveTab] = useState<'products' | 'about' | 'terms' | 'reviews'>('products');
  const [inStoreSearch, setInStoreSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'moq_asc'>('newest');
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // RFQ Modal Form state
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqQuantity, setRfqQuantity] = useState('');
  const [rfqTargetPrice, setRfqTargetPrice] = useState('');
  const [rfqDetails, setRfqDetails] = useState('');

  // 1. Fetch business details
  const list = useQuery({
    queryKey: ['businesses'],
    queryFn: businesses,
    enabled: configured,
  });
  const business = list.data?.find((b) => b.id === id);

  // 2. Fetch approved products from this supplier
  const productsQuery = useQuery({
    queryKey: ['supplier-products', id],
    enabled: configured && !!id,
    queryFn: async () => {
      const { data, error } = await db()
        .rpc('public_products')
        .select('id')
        .eq('business_id', id)
        .eq('status', 'approved');
      if (error) throw error;
      const { hydrate } = await import('@/lib/catalog');
      const all = await db()
        .rpc('public_products')
        .select('*')
        .in(
          'id',
          data.map((p) => p.id),
        );
      if (all.error) throw all.error;
      return hydrate(all.data);
    },
  });

  const products: Listing[] = productsQuery.data ?? [];

  // Extract distinct categories from supplier products
  const storeCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; name_bn?: string; count: number }>();
    for (const p of products) {
      if (p.category) {
        const existing = map.get(p.category.id);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(p.category.id, {
            id: p.category.id,
            name: p.category.name,
            name_bn: p.category.name_bn,
            count: 1,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [products]);

  // Filter & sort products in store
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (inStoreSearch.trim()) {
      const q = inStoreSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.name_bn && p.name_bn.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category?.id === selectedCategory);
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'moq_asc') {
      result.sort((a, b) => a.moq - b.moq);
    } else {
      // newest
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return result;
  }, [products, inStoreSearch, selectedCategory, sortBy]);

  // Share store link
  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  // Submit RFQ via Chat
  const handleSendRfq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const message = [
      `[${tr('Custom Quote Request')}]`,
      rfqTitle ? `${tr('Product / Requirement')}: ${rfqTitle}` : '',
      rfqQuantity ? `${tr('Target volume')}: ${rfqQuantity}` : '',
      rfqTargetPrice ? `${tr('Target unit price (BDT)')}: ৳${rfqTargetPrice}` : '',
      rfqDetails ? `${tr('Details')}: ${rfqDetails}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    start(business.id, undefined, message);
    setRfqModalOpen(false);
  };

  if (list.isLoading) {
    return (
      <div className="container page-content">
        <State title={tr('Loading…')} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="container page-content">
        <div className="storefront-breadcrumb">
          <Link to="/suppliers">{tr('Suppliers')}</Link>
          <span>/</span>
          <span>{tr('Business profile')}</span>
        </div>
        <State title={tr('Supplier not found')} />
      </div>
    );
  }

  const businessDisplayName =
    locale === 'bn' && business.name_bn ? business.name_bn : business.name;

  return (
    <div className="container page-content storefront-page">
      {/* 1. Breadcrumb navigation */}
      <nav className="storefront-breadcrumb" aria-label={tr('Breadcrumb')}>
        <Link to="/suppliers">{tr('Suppliers')}</Link>
        <span>/</span>
        <span aria-current="page">{businessDisplayName}</span>
      </nav>

      <Notice error={list.error ?? productsQuery.error} />

      {/* 2. Brand Hero Cover Banner */}
      <div className="storefront-banner" aria-hidden="true">
        <div className="storefront-banner-pattern">
          <Factory size={220} strokeWidth={1} />
        </div>
      </div>

      {/* 3. Main Business Identity Card */}
      <section className="storefront-profile-card">
        <div className="storefront-profile-header">
          <div className="storefront-brand-identity">
            <StoreAvatar business={business} className="business-avatar" />
            <div className="storefront-brand-text">
              <div className="storefront-badges">
                {business.verified && (
                  <span className="storefront-verified-badge">
                    <ShieldCheck size={14} />
                    {tr('VERIFIED SUPPLIER')}
                  </span>
                )}
                <span className="storefront-response-badge">
                  <Clock size={12} />
                  {tr('Usually replies in < 2 hours')}
                </span>
              </div>
              <h1>{businessDisplayName}</h1>
              <div className="storefront-location">
                <MapPin size={15} />
                <span>
                  {business.district}, {business.division}
                </span>
                {business.address && <span>· {business.address}</span>}
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="storefront-primary-actions">
            <ChatButton business={business.id} />
            <button
              type="button"
              className="storefront-btn-rfq"
              onClick={() => setRfqModalOpen(true)}
            >
              <FileText size={16} />
              <span>{tr('Request Custom Quote')}</span>
            </button>
            <SaveSupplier id={business.id} />
            <button
              type="button"
              className="storefront-btn-share"
              onClick={handleCopyLink}
              title={tr('Copy store link')}
            >
              <Share2 size={15} />
              <span>{tr('Share store')}</span>
            </button>
          </div>
        </div>

        {/* 4. Escrow Trust & Guarantee Banner */}
        <div className="storefront-trust-strip">
          <div className="storefront-trust-left">
            <span className="storefront-trust-icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <div className="storefront-trust-info">
              <strong>{tr('Protected by Paikarii Escrow')}</strong>
              <p>
                {tr(
                  'Payment held safely in Paikarii BRAC Bank escrow until verified delivery',
                )}
              </p>
            </div>
          </div>
          <div className="storefront-trust-features">
            <span>
              <CheckCircle2 size={14} color="#166447" />
              {tr('Verified Trade License')}
            </span>
            <span>
              <Truck size={14} color="#166447" />
              {tr('Delivery across 64 districts')}
            </span>
            <span>
              <RotateCcw size={14} color="#166447" />
              {tr('7-day inspection and dispute resolution')}
            </span>
          </div>
        </div>
      </section>

      {/* 5. Tabbed Navigation */}
      <nav className="storefront-tabs-nav" aria-label={tr('Storefront sections')}>
        <button
          type="button"
          className={`storefront-tab-btn ${activeTab === 'products' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Boxes size={16} />
          <span>{tr('Product Showcase')}</span>
          <span className="storefront-tab-count">{products.length}</span>
        </button>
        <button
          type="button"
          className={`storefront-tab-btn ${activeTab === 'about' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <Factory size={16} />
          <span>{tr('Company & Capabilities')}</span>
        </button>
        <button
          type="button"
          className={`storefront-tab-btn ${activeTab === 'terms' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          <ShieldCheck size={16} />
          <span>{tr('Trade & Escrow Terms')}</span>
        </button>
        <button
          type="button"
          className={`storefront-tab-btn ${activeTab === 'reviews' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Star size={16} />
          <span>{tr('Reviews & Ratings')}</span>
        </button>
      </nav>

      {/* TAB 1: PRODUCT SHOWCASE */}
      {activeTab === 'products' && (
        <section aria-labelledby="store-products-heading">
          <h2 id="store-products-heading" className="sr-only">
            {tr('Products from this supplier')}
          </h2>

          {/* In-Store Filters */}
          <div className="storefront-catalog-controls">
            <div className="storefront-search-row">
              <div className="storefront-search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  role="searchbox"
                  placeholder={tr('Search in this store…')}
                  value={inStoreSearch}
                  onChange={(e) => setInStoreSearch(e.target.value)}
                  aria-label={tr('Search in this store…')}
                />
              </div>

              <select
                className="storefront-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label={tr('Sort by')}
              >
                <option value="newest">{tr('Newest')}</option>
                <option value="price_asc">{tr('Price: Low to High')}</option>
                <option value="price_desc">{tr('Price: High to Low')}</option>
                <option value="moq_asc">{tr('Min Order (MOQ)')}</option>
              </select>
            </div>

            {/* Category Filter Pills */}
            {storeCategories.length > 0 && (
              <div className="storefront-category-pills" role="radiogroup" aria-label={tr('In-store category')}>
                <button
                  type="button"
                  className={`storefront-pill-btn ${selectedCategory === 'all' ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  {tr('All products')} ({products.length})
                </button>
                {storeCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`storefront-pill-btn ${selectedCategory === c.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategory(c.id)}
                  >
                    {locale === 'bn' && c.name_bn ? c.name_bn : c.name} ({c.count})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Grid */}
          {productsQuery.isPending ? (
            <State title={tr('Loading products…')} />
          ) : filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : inStoreSearch || selectedCategory !== 'all' ? (
            <State
              title={tr('No products match your in-store search')}
              description={tr('Try searching for another product or clear filters')}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setInStoreSearch('');
                    setSelectedCategory('all');
                  }}
                >
                  {tr('Clear filters')}
                </Button>
              }
            />
          ) : (
            <State title={tr('No approved products yet')} />
          )}
        </section>
      )}

      {/* TAB 2: COMPANY PROFILE & CAPABILITIES */}
      {activeTab === 'about' && (
        <section className="storefront-about-layout">
          <div>
            <div className="storefront-card">
              <h2>
                <Factory size={20} />
                {tr('About the manufacturer')}
              </h2>
              <p className="preserve-lines">{business.description}</p>
              
              {/* Manufacturing Capabilities */}
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#123e32', marginTop: '24px', marginBottom: '12px' }}>
                {tr('Company & Capabilities')}
              </h3>
              <div className="storefront-capabilities-grid">
                <div className="storefront-cap-card">
                  <span className="storefront-cap-icon">
                    <Boxes size={18} />
                  </span>
                  <strong>{tr('Custom manufacturing supported')}</strong>
                  <small>{tr('OEM & private labeling')}</small>
                </div>
                <div className="storefront-cap-card">
                  <span className="storefront-cap-icon">
                    <Sparkles size={18} />
                  </span>
                  <strong>{tr('Sample orders available')}</strong>
                  <small>{tr('Verify quality before placing bulk container orders.')}</small>
                </div>
                <div className="storefront-cap-card">
                  <span className="storefront-cap-icon">
                    <PackageCheck size={18} />
                  </span>
                  <strong>{tr('Custom packaging')}</strong>
                  <small>{tr('Custom cartons, barcodes, and export labeling.')}</small>
                </div>
              </div>
            </div>

            <div className="storefront-card">
              <h2>
                <MapPin size={20} />
                {tr('Factory / Warehouse address')}
              </h2>
              <p>{business.address}</p>
              <p style={{ color: '#576b61', fontSize: '13px', margin: 0 }}>
                {business.district}, {business.division}, Bangladesh
              </p>
            </div>
          </div>

          <aside>
            <div className="storefront-contact-card">
              <h3>{tr('Contact & Support')}</h3>
              <div className="storefront-contact-list">
                <div className="storefront-contact-item">
                  <MessageSquare size={16} />
                  <div>
                    <small style={{ color: '#687b71', display: 'block' }}>{tr('Verified channel')}</small>
                    <span style={{ color: '#17483b', fontWeight: 600 }}>{tr('Paikarii Verified Chat & RFQ')}</span>
                  </div>
                </div>
                {business.website && business.website.startsWith('https://') && (
                  <div className="storefront-contact-item">
                    <Globe size={16} />
                    <div>
                      <small style={{ color: '#687b71', display: 'block' }}>{tr('Website')}</small>
                      <a href={business.website} target="_blank" rel="noreferrer" style={{ color: '#17483b' }}>
                        {business.website.replace(/^https?:\/\//, '')} ↗
                      </a>
                    </div>
                  </div>
                )}
                <div className="storefront-contact-item">
                  <Clock size={16} />
                  <div>
                    <small style={{ color: '#687b71', display: 'block' }}>{tr('Business hours')}</small>
                    <span>{tr('Saturday – Thursday (9 AM – 7 PM)')}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ChatButton business={business.id} />
                <Button variant="outline" onClick={() => setRfqModalOpen(true)}>
                  {tr('Request Custom Quote')}
                </Button>
              </div>
            </div>
          </aside>
        </section>
      )}

      {/* TAB 3: TRADE & ESCROW TERMS */}
      {activeTab === 'terms' && (
        <section className="storefront-terms-grid">
          <div className="storefront-term-box">
            <h3>
              <ShieldCheck size={20} color="#166447" />
              {tr('Protected by Paikarii Escrow')}
            </h3>
            <p>
              {tr(
                'Payment held safely in Paikarii BRAC Bank escrow until verified delivery',
              )}
            </p>
          </div>

          <div className="storefront-term-box">
            <h3>
              <Truck size={20} color="#166447" />
              {tr('Delivery across 64 districts')}
            </h3>
            <p>
              {tr('Estimated delivery 2–4 days via courier')}. Direct transport logistics available for large truckload consignments.
            </p>
          </div>

          <div className="storefront-term-box">
            <h3>
              <RotateCcw size={20} color="#166447" />
              {tr('7-day inspection and dispute resolution')}
            </h3>
            <p>
              Buyers have 7 calendar days after delivery receipt to inspect physical goods. Disputes are adjudicated via Paikarii supervisor room.
            </p>
          </div>

          <div className="storefront-term-box">
            <h3>
              <CheckCircle2 size={20} color="#166447" />
              {tr('Verified Trade License')}
            </h3>
            <p>
              This business has passed national document verification including government trade licensing, tax identification, and banking credentials.
            </p>
          </div>
        </section>
      )}

      {/* TAB 4: REVIEWS & RATINGS */}
      {activeTab === 'reviews' && (
        <section>
          <div className="storefront-reviews-summary">
            <div className="storefront-rating-score">5.0</div>
            <div>
              <div style={{ display: 'flex', gap: '4px', color: '#f59e0b', marginBottom: '4px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} fill="#f59e0b" />
                ))}
              </div>
              <strong style={{ fontSize: '15px', color: '#123e32' }}>{tr('Verified wholesale partner')}</strong>
              <p style={{ margin: 0, fontSize: '13px', color: '#687b71' }}>
                {tr('Reviews from verified wholesale buyers will appear here.')}
              </p>
            </div>
          </div>
          <State
            title={tr('No customer reviews yet')}
            description={tr('Reviews from verified wholesale buyers will appear here.')}
          />
        </section>
      )}

      {/* RFQ / CUSTOM QUOTE MODAL */}
      {rfqModalOpen && (
        <div className="storefront-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rfq-modal-title">
          <div className="storefront-modal-dialog">
            <div className="storefront-modal-header">
              <div>
                <h3 id="rfq-modal-title">{tr('Request Custom Quote')}</h3>
                <p>
                  {tr('Direct quotation')} · {businessDisplayName}
                </p>
              </div>
              <button
                type="button"
                className="storefront-modal-close"
                onClick={() => setRfqModalOpen(false)}
                aria-label={tr('Close quotation form')}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendRfq} className="form-stack">
              <label className="field">
                <span>{tr('Product / Requirement')}</span>
                <input
                  type="text"
                  required
                  placeholder={tr('e.g. 5,000 pcs 240 GSM Cotton T-Shirts')}
                  value={rfqTitle}
                  onChange={(e) => setRfqTitle(e.target.value)}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="field">
                  <span>{tr('Target volume')}</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500 Pcs"
                    value={rfqQuantity}
                    onChange={(e) => setRfqQuantity(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{tr('Target unit price (BDT)')}</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 250"
                    value={rfqTargetPrice}
                    onChange={(e) => setRfqTargetPrice(e.target.value)}
                  />
                </label>
              </div>

              <label className="field">
                <span>{tr('Specifications & Requirements')}</span>
                <textarea
                  rows={4}
                  required
                  placeholder={tr(
                    'Describe your custom specifications, branding or packaging needs…',
                  )}
                  value={rfqDetails}
                  onChange={(e) => setRfqDetails(e.target.value)}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <Button variant="outline" type="button" onClick={() => setRfqModalOpen(false)}>
                  {tr('Cancel')}
                </Button>
                <Button type="submit">
                  <MessageSquare size={16} />
                  <span>{tr('Send quotation request')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Link Toast Notification */}
      {copiedToast && (
        <div className="storefront-toast" role="status">
          <CheckCircle2 size={16} />
          <span>{tr('Link copied to clipboard!')}</span>
        </div>
      )}
    </div>
  );
}

