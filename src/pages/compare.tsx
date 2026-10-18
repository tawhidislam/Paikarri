import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useComparison } from '@/lib/comparison';
import { db } from '@/lib/supabase';
import { productOptions, type ProductOptions } from '@/lib/buying';
import { hydrate, type Listing } from '@/lib/catalog';
import { useLocale, useT } from '@/lib/i18n';
import { money } from '@/lib/utils';
import { formatQuantity, formatUnit } from '@/lib/units';
import { ProductImage } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Notice, State, useTitle } from '@/components/shared';
import './product.css';
type Compared = Listing & { buying: ProductOptions };
export default function ComparePage() {
  const tr = useT();
  const { locale } = useLocale();
  const { ids, toggle } = useComparison();
  useTitle(tr('Compare products'));
  const items = useQuery({
    queryKey: ['compare', ids],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data, error } = await db().rpc('public_products').in('id', ids);
      if (error) throw error;
      const rows = await hydrate(data);
      return Promise.all(
        ids
          .flatMap((id) => rows.filter((p) => p.id === id))
          .map(async (p) => ({ ...p, buying: await productOptions(p.id) })),
      );
    },
    refetchOnWindowFocus: 'always',
  });
  return (
    <div className="container page-content pd-page">
      <h1>{tr('Compare products')}</h1>
      <p className="muted">{tr('Compare up to four products. Remove one to add another.')}</p>
      <Link to="/products">{tr('Browse products')} →</Link>
      {items.isPending ? (
        <State title={tr('Loading…')} />
      ) : items.error ? (
        <>
          <Notice error={items.error} />
          <Button onClick={() => void items.refetch()}>{tr('Try again')}</Button>
        </>
      ) : (
        <>
          {ids
            .filter((id) => !items.data?.some((p) => p.id === id))
            .map((id) => (
              <div key={id} className="pd-unavailable">
                {tr('Product unavailable')}{' '}
                <Button variant="outline" onClick={() => toggle(id)}>
                  {tr('Remove')}
                </Button>
              </div>
            ))}
          {!ids.length ? (
            <State title={tr('Choose products to compare')} />
          ) : (
            !!items.data?.length && (
              <div className="pd-compare-scroll">
                <table className="pd-compare-table">
                  <caption className="sr-only">{tr('Product comparison')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{tr('Product')}</th>
                      {items.data.map((p) => (
                        <th scope="col" key={p.id}>
                          <ProductImage path={p.image?.path} alt={p.name} />
                          <Link to={`/products/${p.id}`}>
                            {locale === 'bn' && p.name_bn ? p.name_bn : p.name}
                          </Link>
                          <Button variant="outline" onClick={() => toggle(p.id)}>
                            {tr('Remove')}
                          </Button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        'Wholesale starting price',
                        (p: Compared) =>
                          `${money(p.price, locale)} / ${formatUnit(p.unit, 1, locale)}`,
                      ],
                      [
                        'SKU price range',
                        (p: Compared) => {
                          const prices = p.buying.skus
                            .filter((s) => s.active)
                            .flatMap((s) => s.prices.map((t) => t.price));
                          return `${money(Math.min(...prices), locale)} – ${money(Math.max(...prices), locale)} / ${formatUnit(p.unit, 1, locale)}`;
                        },
                      ],
                      [
                        'Preparation estimate',
                        (p: Compared) =>
                          p.buying.sourcing.estimates_updated_at
                            ? `${p.buying.sourcing.preparation_min}–${p.buying.sourcing.preparation_max} ${tr('days')}`
                            : tr('Confirm with supplier'),
                      ],
                      ['Minimum order', (p: Compared) => formatQuantity(p.moq, p.unit, locale)],
                      [
                        'Quantity pricing',
                        (p: Compared) =>
                          p.priceTiers
                            .map(
                              (t) =>
                                `${formatQuantity(t.min_quantity, p.unit, locale)}+: ${money(t.price, locale)}`,
                            )
                            .join(' · ') || '—',
                      ],
                      [
                        'Supplier',
                        (p: Compared) =>
                          locale === 'bn' && p.business?.name_bn
                            ? p.business.name_bn
                            : (p.business?.name ?? '—'),
                      ],
                      [
                        'Verification',
                        (p: Compared) =>
                          p.business?.verified ? tr('Verified supplier') : tr('Not verified'),
                      ],
                      [
                        'Location',
                        (p: Compared) =>
                          [tr(p.business?.district ?? ''), tr(p.business?.division ?? '')].join(
                            ', ',
                          ),
                      ],
                      [
                        'Specifications',
                        (p: Compared) =>
                          Object.entries(p.specifications ?? {})
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ') || '—',
                      ],
                    ].map(([label, render]) => (
                      <tr key={String(label)}>
                        <th scope="row">{tr(String(label))}</th>
                        {items.data.map((p) => (
                          <td key={p.id}>{(render as (p: Compared) => string)(p)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
