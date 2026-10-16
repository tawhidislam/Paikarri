import { db } from './supabase';
import type { Business, Category, Product, ProductImage } from './models';
export type Listing = Product & {
  business: Business | undefined;
  category: Category | undefined;
  image: ProductImage | undefined;
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
export async function categories() {
  const { data, error } = await db().from('categories').select('*').order('name');
  if (error) throw error;
  return data;
}
export async function businesses() {
  const { data, error } = await db()
    .from('businesses')
    .select('*')
    .order('verified', { ascending: false })
    .order('name');
  if (error) throw error;
  return data;
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
  const [b, c, images] = await Promise.all([
    bs
      ? Promise.resolve(bs)
      : db()
          .from('businesses')
          .select('*')
          .in('id', [...new Set(products.map((p) => p.business_id))])
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
    categories(),
    db()
      .from('product_images')
      .select('*')
      .in(
        'product_id',
        products.map((p) => p.id),
      )
      .order('position'),
  ]);
  if (images.error) throw images.error;
  return products.map((p) => ({
    ...p,
    business: b.find((b) => b.id === p.business_id),
    category: c.find((c) => c.id === p.category_id),
    image: images.data.find((i) => i.product_id === p.id),
  }));
}
export async function signedImage(path: string, bucket = 'product-images') {
  const { data, error } = await db().storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
