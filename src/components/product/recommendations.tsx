import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/supabase';
import { hydrate, type Listing } from '@/lib/catalog';
import { useT } from '@/lib/i18n';
import { ProductCard } from '../product-card';
import { Button } from '../ui/button';
import { Notice } from '../shared';
export function Recommendations({ product: p }: { product: Listing }) {
  const tr = useT();
  const data = useQuery({
    queryKey: ['product-recommendations', p.id],
    queryFn: async () => {
      const own = await db()
        .rpc('public_products')
        .eq('business_id', p.business_id)
        .neq('id', p.id)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .order('id')
        .limit(4);
      if (own.error) throw own.error;
      const ownRows = own.data
        .filter(
          (row, i, all) =>
            row.id !== p.id &&
            row.business_id === p.business_id &&
            all.findIndex((x) => x.id === row.id) === i,
        )
        .slice(0, 4);
      const related = await db()
        .rpc('public_products')
        .eq('category_id', p.category_id)
        .gt('stock', 0)
        .not('id', 'in', `(${[p.id, ...ownRows.map((r) => r.id)].join(',')})`)
        .order('created_at', { ascending: false })
        .order('id')
        .limit(8);
      if (related.error) throw related.error;
      const relatedRows = related.data
        .filter(
          (row, i, all) =>
            row.id !== p.id &&
            !ownRows.some((x) => x.id === row.id) &&
            row.category_id === p.category_id &&
            all.findIndex((x) => x.id === row.id) === i,
        )
        .slice(0, 8);
      const hydrated = await hydrate([...ownRows, ...relatedRows]);
      return { own: hydrated.slice(0, ownRows.length), related: hydrated.slice(ownRows.length) };
    },
    refetchOnWindowFocus: 'always',
  });
  if (data.isPending)
    return (
      <div className="pd-section" aria-busy="true">
        {tr('Finding related products…')}
      </div>
    );
  if (data.error)
    return (
      <div className="pd-section">
        <Notice error={data.error} />
        <Button variant="outline" onClick={() => void data.refetch()}>
          {tr('Try again')}
        </Button>
      </div>
    );
  return (
    <>
      {[
        [tr('More from this supplier'), data.data!.own],
        [tr('Related products'), data.data!.related],
      ].map(
        ([label, rows]) =>
          (rows as Listing[]).length > 0 && (
            <section className="pd-section" key={String(label)}>
              <h2>{String(label)}</h2>
              <div className="pd-related-grid">
                {(rows as Listing[]).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ),
      )}
    </>
  );
}
