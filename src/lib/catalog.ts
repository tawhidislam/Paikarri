import { db } from './supabase';
import type { Business, Category, Product, ProductImage, PriceTier } from './models';
export type Listing = Product & {
  business: Business | undefined;
  category: Category | undefined;
  image: ProductImage | undefined;
  priceTiers: Pick<PriceTier, 'product_id' | 'min_quantity' | 'price'>[];
};
export type Filters = {
  q?: string;
  category?: string;
  division?: string;
  district?: string;
  min?: string;
  max?: string;
  moq?: string;
  verified?: boolean;
  sort?: string;
  page?: number;
};
// Identify only the explicitly seeded fixture dataset, never a category or supplier role.
export function isDemoListing(product: Pick<Product, 'specifications'>) {
  const spec = product.specifications;
  return (
    !!spec &&
    typeof spec === 'object' &&
    !Array.isArray(spec) &&
    spec.Dataset === 'paikari-demo-20261017'
  );
}
export async function categories() {
  const { data, error } = await db().from('categories').select('*').order('name');
  if (error) throw error;
  return data;
}
export async function businesses() {
  const { data, error } = await db()
    .rpc('public_businesses')
    .order('verified', { ascending: false })
    .order('name');
  if (error) throw error;
  return data;
}
export async function marketplaceStats() {
  const [products, suppliers] = await Promise.all([
    db().rpc('public_products', undefined, { count: 'exact', head: true }),
    db().rpc('public_businesses', undefined, { count: 'exact', head: true }),
  ]);
  return {
    productCount: products.count ?? 0,
    supplierCount: suppliers.count ?? 0,
  };
}
// Keep homepage reads bounded and use the public projections even for administrators.
export async function homepageProducts(excludeIds: string[] = [], limit = 8) {
  let query = db().rpc('public_products');
  if (excludeIds.length) query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .limit(Math.min(12, Math.max(1, limit)));
  if (error) throw error;
  return hydrate(data);
}
export async function homepageSuppliers(ids: string[] = [], limit = 3) {
  let query = db().rpc('public_businesses').eq('verified', true);
  if (ids.length) query = query.in('id', ids);
  const { data, error } = await query
    .order('name')
    .order('id')
    .limit(Math.min(3, Math.max(1, limit)));
  if (error) throw error;
  return ids.length ? ids.flatMap((id) => data.filter((business) => business.id === id)) : data;
}
export async function catalog(filters: Filters = {}) {
  const numeric = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  let query = db().rpc(
    'search_products',
    {
      keyword: filters.q || undefined,
      category_slug: filters.category || undefined,
      division_filter: filters.division || undefined,
      district_filter: filters.district || undefined,
      min_price: numeric(filters.min),
      max_price: numeric(filters.max),
      max_moq: numeric(filters.moq),
      verified_only: filters.verified ?? false,
    },
    { count: 'exact' },
  );
  query =
    filters.sort === 'price-asc'
      ? query.order('price')
      : filters.sort === 'price-desc'
        ? query.order('price', { ascending: false })
        : filters.sort === 'moq'
          ? query.order('moq')
          : query.order('created_at', { ascending: false });
  const start = ((filters.page ?? 1) - 1) * 12;
  const { data, error, count } = await query.order('id').range(start, start + 11);
  if (error) throw error;
  return { items: await hydrate(data), count: count ?? 0 };
}
export async function hydrate(products: Product[], bs?: Business[]): Promise<Listing[]> {
  if (!products.length) return [];
  const ids = products.map((p) => p.id);
  const [b, c, images, tiers] = await Promise.all([
    bs
      ? Promise.resolve(bs)
      : db()
          .rpc('public_businesses')
          .in('id', [...new Set(products.map((p) => p.business_id))])
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
    categories(),
    db().from('product_images').select('*').in('product_id', ids).order('position'),
    db()
      .from('product_price_tiers')
      .select('product_id,min_quantity,price')
      .in('product_id', ids)
      .order('min_quantity'),
  ]);
  if (images.error) throw images.error;
  if (tiers.error) throw tiers.error;
  return products.map((p) => ({
    ...p,
    business: b.find((b) => b.id === p.business_id),
    category: c.find((c) => c.id === p.category_id),
    image: images.data.find((i) => i.product_id === p.id),
    priceTiers: tiers.data.filter((tier) => tier.product_id === p.id),
  }));
}
export async function signedImage(path: string, bucket = 'product-images') {
  const { data, error } = await db().storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
