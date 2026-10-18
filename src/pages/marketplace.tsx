import { growthDb } from '@/lib/growth';
import { z } from 'zod';
import { SaveSupplier } from '@/components/save-supplier';
import { ChatButton } from '@/components/marketplace-chat';
import { useT } from '@/lib/i18n';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import { catalog, categories, businesses } from '@/lib/catalog';
import { configured, db } from '@/lib/supabase';
import { useLocale } from '@/lib/i18n';
import { locations } from '@/lib/locations';
import { money } from '@/lib/utils';
import { ProductCard } from '@/components/product-card';
import { SectionTitle, State, Notice, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { SupplierCard } from './home';
export default function Marketplace() {
  const tr = useT();
  const [params, setParams] = useSearchParams();
  const { t, locale } = useLocale();
  useTitle(params.get('q') ? `Search: ${params.get('q')}` : 'Wholesale products');
  const filters = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    division: params.get('division') ?? '',
    district: params.get('district') ?? '',
    min: params.get('min') ?? '',
    max: params.get('max') ?? '',
    moq: params.get('moq') ?? '',
    verified: params.get('verified') === 'true',
    sort: params.get('sort') ?? 'newest',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
  const list = useQuery({
    queryKey: ['catalog', filters],
    queryFn: () => catalog(filters),
    enabled: configured,
  });
  const facets = useQuery({
    queryKey: [
      'catalog-facets',
      filters.q,
      filters.category,
      filters.division,
      filters.district,
      filters.min,
      filters.max,
      filters.moq,
      filters.verified,
    ],
    enabled: configured,
    queryFn: async () => {
      const { data, error } = await growthDb().rpc('catalog_facets', {
        keyword: filters.q || undefined,
        category_slug: filters.category || undefined,
        division_filter: filters.division || undefined,
        district_filter: filters.district || undefined,
        min_price: filters.min ? Number(filters.min) : undefined,
        max_price: filters.max ? Number(filters.max) : undefined,
        max_moq: filters.moq ? Number(filters.moq) : undefined,
        verified_only: filters.verified,
      });
      if (error) throw error;
      return z
        .object({
          categories: z.record(z.string(), z.number()),
          divisions: z.record(z.string(), z.number()),
          districts: z.record(z.string(), z.number()),
          price_max: z.number(),
        })
        .parse(data);
    },
  });
  const count = (group: 'categories' | 'divisions' | 'districts', key: string) =>
    facets.data
      ? ` (${new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(facets.data[group][key] ?? 0)})`
      : '';
  const cats = useQuery({ queryKey: ['categories'], queryFn: categories, enabled: configured });
  function update(key: string, value: string) {
    setParams((prev) => {
      const n = new URLSearchParams(prev);
      if (value) n.set(key, value);
      else n.delete(key);
      n.delete('page');
      if (key === 'division') n.delete('district');
      return n;
    });
  }
  return (
    <div className="container page-content">
      <div className="breadcrumb">
        <Link to="/">{t.home}</Link>
        <span>/</span>
        {t.products}
      </div>
      <SectionTitle
        eyebrow="THE WHOLESALE MARKETPLACE"
        title={filters.q ? `Results for “${filters.q}”` : tr('Good products. Great possibilities.')}
        description={tr('Discover products from businesses across Bangladesh.')}
      />
      <div className="marketplace-layout">
        <aside className="filter-panel">
          <h3>
            <SlidersHorizontal size={17} />
            {t.filters}
            <button onClick={() => setParams({})}>{t.clear}</button>
          </h3>
          <label className="field">
            <span>{tr('Search products')}</span>
            <div className="filter-search">
              <Search size={16} />
              <input
                value={filters.q}
                onChange={(e) => update('q', e.target.value)}
                placeholder={tr('Product or keyword')}
              />
            </div>
          </label>
          <label className="field">
            <span>{tr('Category')}</span>
            <select value={filters.category} onChange={(e) => update('category', e.target.value)}>
              <option value="">{tr('All categories')}</option>
              {cats.data?.map((c) => (
                <option key={c.id} value={c.slug}>
                  {locale === 'bn' ? c.name_bn : c.name}
                  {count('categories', c.slug)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tr('Division')}</span>
            <select value={filters.division} onChange={(e) => update('division', e.target.value)}>
              <option value="">{tr('All Bangladesh')}</option>
              {Object.keys(locations).map((d) => (
                <option key={d} value={d}>
                  {tr(d)}
                  {count('divisions', d)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tr('District')}</span>
            <select value={filters.district} onChange={(e) => update('district', e.target.value)}>
              <option value="">{tr('All districts')}</option>
              {(filters.division
                ? locations[filters.division]
                : Object.values(locations).flat()
              ).map((d) => (
                <option key={d} value={d}>
                  {tr(d)}
                  {count('districts', d)}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>{tr('Price range (\u09F3)')}</span>
            <div className="range-inputs">
              <input
                aria-label={tr('Minimum price')}
                type="number"
                min="0"
                placeholder={tr('Min')}
                value={filters.min}
                onChange={(e) => update('min', e.target.value)}
              />
              <span>{'\u2013'}</span>
              <input
                aria-label={tr('Maximum price')}
                type="number"
                min="0"
                placeholder={tr('Max')}
                value={filters.max}
                onChange={(e) => update('max', e.target.value)}
              />
            </div>
          </div>
          {facets.data && facets.data.price_max > 0 && (
            <label className="field">
              <span>{tr('Maximum price')}</span>
              <input
                type="range"
                min="0"
                max={Math.ceil(facets.data.price_max)}
                value={Math.min(
                  Number(filters.max || facets.data.price_max),
                  facets.data.price_max,
                )}
                onChange={(e) => update('max', e.target.value)}
              />
              <output>{money(Number(filters.max || facets.data.price_max), locale)}</output>
            </label>
          )}
          {facets.isError && (
            <p role="status">
              {tr('Filter counts unavailable')}{' '}
              <button onClick={() => void facets.refetch()}>{tr('Try again')}</button>
            </p>
          )}
          <label className="field">
            <span>{tr('Maximum MOQ')}</span>
            <input
              type="number"
              min="1"
              placeholder={tr('Any quantity')}
              value={filters.moq}
              onChange={(e) => update('moq', e.target.value)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={filters.verified}
              onChange={(e) => update('verified', e.target.checked ? 'true' : '')}
            />
            <ShieldCheck size={16} />
            {tr('Verified suppliers only')}
          </label>
        </aside>
        <div>
          <div className="results-toolbar">
            <span>
              <strong>{list.data?.count ?? 0}</strong> {tr('products found')}
            </span>
            <label>
              {tr('Sort by')}{' '}
              <select value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
                <option value="newest">{tr('Newest arrivals')}</option>
                <option value="price-asc">{tr('Price: low to high')}</option>
                <option value="price-desc">{tr('Price: high to low')}</option>
                <option value="moq">{tr('Lowest MOQ')}</option>
              </select>
            </label>
          </div>
          <Notice error={list.error ?? cats.error} />
          {!configured ? (
            <State
              title={tr('Connect your cloud marketplace')}
              description={tr('Add your Supabase URL and publishable key to .env.local.')}
              action={
                <Link to="/info/setup">
                  {tr('Setup instructions')}
                  <ArrowRight size={15} />
                </Link>
              }
            />
          ) : list.isLoading ? (
            <State title={t.loading} />
          ) : list.data?.items.length ? (
            <div className="product-grid listing-grid">
              {list.data.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            !list.isError && <State title={tr('No products found')} description={t.emptyProducts} />
          )}{' '}
          <div className="pagination">
            <Button
              variant="outline"
              disabled={filters.page <= 1}
              onClick={() =>
                setParams((prev) => {
                  prev.set('page', String(filters.page - 1));
                  return prev;
                })
              }
            >
              {tr('Previous')}
            </Button>
            <span>
              {`${tr('Page')} ${filters.page} ${tr('of')} ${Math.max(1, Math.ceil((list.data?.count ?? 0) / 12))}`}
            </span>
            <Button
              variant="outline"
              disabled={filters.page * 12 >= (list.data?.count ?? 0)}
              onClick={() =>
                setParams((prev) => {
                  prev.set('page', String(filters.page + 1));
                  return prev;
                })
              }
            >
              {tr('Next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function Suppliers() {
  const tr = useT();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  useTitle('Find wholesale suppliers');
  const list = useQuery({ queryKey: ['businesses'], queryFn: businesses, enabled: configured });
  const business = list.data?.find((b) => b.id === id);
  const products = useQuery({
    queryKey: ['supplier-products', id],
    enabled: configured && !!id,
    queryFn: async () => {
      const { data, error } = await db()
        .rpc('public_products')
        .select('id')
        .eq('business_id', id!)
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
  if (id)
    return (
      <div className="container page-content">
        <div className="breadcrumb">
          <Link to="/suppliers">{tr('Suppliers')}</Link>
          <span>/</span>
          {tr('Business profile')}
        </div>
        <Notice error={list.error ?? products.error} />
        {business ? (
          <>
            <div className="business-hero">
              <div className="business-avatar">{business.name.slice(0, 2)}</div>
              <div>
                {business.verified && (
                  <span className="verified-label">
                    <ShieldCheck size={16} />
                    {tr('VERIFIED SUPPLIER')}
                  </span>
                )}
                <h1>{business.name}</h1>
                <p>
                  <MapPin size={15} />
                  {business.district}, {business.division}
                </p>
              </div>
            </div>
            <div className="business-detail">
              <div>
                <h2>{tr('About the business')}</h2>
                <p className="preserve-lines">{business.description}</p>
                <p>{business.address}</p>
                {business.contact_phone && (
                  <p>
                    <a href={`tel:${business.contact_phone}`}>{business.contact_phone}</a>
                  </p>
                )}
                {business.website.startsWith('https://') && (
                  <a href={business.website} target="_blank" rel="noreferrer">
                    {tr('Visit website')} ↗
                  </a>
                )}
              </div>
              <div className="form-stack">
                <ChatButton business={business.id} />
                <SaveSupplier id={business.id} />
              </div>
            </div>
            <SectionTitle title={tr('Products from this supplier')} />
            {products.data?.length ? (
              <div className="product-grid">
                {products.data.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <State title={tr('No approved products yet')} />
            )}
          </>
        ) : (
          !list.isLoading && <State title={tr('Supplier not found')} />
        )}{' '}
      </div>
    );
  return (
    <div className="container page-content">
      <SectionTitle
        eyebrow="BUSINESS IS BETTER TOGETHER"
        title={tr('Find your next business partner.')}
        description={tr('Discover manufacturers, wholesalers, and distributors across Bangladesh.')}
      />
      <div className="supplier-filters">
        <input
          aria-label={tr('Search suppliers')}
          placeholder={tr('Search business names\u2026')}
          value={params.get('q') ?? ''}
          onChange={(e) =>
            setParams((p) => {
              p.set('q', e.target.value);
              return p;
            })
          }
        />
        <select
          aria-label={tr('Supplier division')}
          value={params.get('division') ?? ''}
          onChange={(e) =>
            setParams((p) => {
              p.set('division', e.target.value);
              return p;
            })
          }
        >
          <option value="">{tr('All divisions')}</option>
          {Object.keys(locations).map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <label className="check-label">
          <input
            type="checkbox"
            checked={params.get('verified') === 'true'}
            onChange={(e) =>
              setParams((p) => {
                p.set('verified', String(e.target.checked));
                return p;
              })
            }
          />
          {tr('Verified only')}
        </label>
      </div>
      <Notice error={list.error} />
      {list.isLoading ? (
        <State title={tr('Finding suppliers…')} />
      ) : list.data?.length ? (
        <div className="supplier-grid">
          {list.data
            .filter(
              (b) =>
                b.name.toLowerCase().includes((params.get('q') ?? '').toLowerCase()) &&
                (!params.get('division') || b.division === params.get('division')) &&
                (params.get('verified') !== 'true' || b.verified),
            )
            .map((b) => (
              <SupplierCard key={b.id} business={b} />
            ))}
        </div>
      ) : (
        <State
          title={tr(configured ? 'No public suppliers yet' : 'Connect your Supabase Cloud project')}
          description={tr(
            'Verified businesses and suppliers with approved products will appear here.',
          )}
        />
      )}{' '}
    </div>
  );
}
