import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productOptions } from '@/lib/buying';
import type { CartRow } from '@/lib/order-schema';
import { useLocale, useT } from '@/lib/i18n';
import { money } from '@/lib/utils';
import { formatQuantity, formatUnit } from '@/lib/units';

/** Price schedules are informational; saved cart quotes remain authoritative. */
export function CartPriceTiers({
  row,
  rows,
  savedRows,
  selectedQuantity,
  pending,
  onSelectQuantity,
}: {
  row: CartRow;
  rows: CartRow[];
  savedRows: CartRow[];
  selectedQuantity: number;
  pending: boolean;
  onSelectQuantity: (quantity: number) => void;
}) {
  const tr = useT();
  const cache = useQueryClient();
  const { locale } = useLocale();
  const options = useQuery({
    queryKey: ['product-options', row.product_id],
    queryFn: () => productOptions(row.product_id),
    enabled: row.available,
  });
  const productRows = rows.filter((r) => r.product_id === row.product_id);
  const total = productRows.reduce((sum, r) => sum + r.quantity, 0);
  const activeSkus = options.data?.skus.filter((s) => s.active) ?? [];
  const sku = row.sku_id
    ? activeSkus.find((s) => s.id === row.sku_id)
    : activeSkus.length === 1 && !options.data?.attributes.length
      ? activeSkus[0]
      : undefined;
  const prices = [...(sku?.prices ?? [])].sort((a, b) => a.min_quantity - b.min_quantity);
  const tiers = [
    ...new Set([row.moq, ...prices.map((p) => p.min_quantity).filter((n) => n >= row.moq)]),
  ]
    .sort((a, b) => a - b)
    .flatMap((min_quantity) => {
      const price = prices.filter((p) => p.min_quantity <= min_quantity).at(-1)?.price;
      return price ? [{ min_quantity, price }] : [];
    });
  const applied = tiers.filter((p) => p.min_quantity <= total).at(-1);
  const otherQuantity = savedRows
    .filter(
      (r) =>
        r.product_id === row.product_id &&
        (r.sku_id ?? r.product_id) !== (row.sku_id ?? row.product_id),
    )
    .reduce((sum, r) => sum + r.quantity, 0);
  const matches = applied?.price === row.unit_price;
  const next = matches
    ? tiers.find((p) => p.min_quantity > total && p.price < row.unit_price)
    : undefined;
  if (!row.available) return null;
  return (
    <section className="cart-price-tiers" aria-label={tr('Quantity pricing')}>
      <div className="cart-price-tiers-heading">
        <h4>{tr('Quantity pricing')}</h4>
        <span>
          {tr('Per')} {formatUnit(row.unit, 1, locale)}
        </span>
      </div>
      {options.isPending ? (
        <p role="status">{tr('Loading quantity prices…')}</p>
      ) : options.isError || !prices.length ? (
        <div className="cart-price-tiers-error">
          <p>{tr('Quantity prices are unavailable. Your saved unit price is shown above.')}</p>
          <button type="button" onClick={() => void options.refetch()}>
            {tr('Retry prices')}
          </button>
        </div>
      ) : (
        <>
          <div className="cart-tier-grid" role="group" aria-label={tr('Select quantity price')}>
            {tiers.map((tier) => {
              const targetQuantity = tier.min_quantity - otherQuantity;
              return (
                <button
                  type="button"
                  key={tier.min_quantity}
                  aria-label={`${tr('Apply quantity tier')}: ${formatQuantity(tier.min_quantity, row.unit, locale)}`}
                  aria-pressed={matches && tier === applied}
                  disabled={
                    pending ||
                    targetQuantity < 1 ||
                    targetQuantity > row.stock ||
                    tier.min_quantity > 1000000 ||
                    targetQuantity === selectedQuantity
                  }
                  className={matches && tier === applied ? 'is-applied' : ''}
                  onClick={() => onSelectQuantity(targetQuantity)}
                >
                  <span className="cart-tier-quantity">
                    {formatQuantity(tier.min_quantity, row.unit, locale)}+
                  </span>
                  <strong>{money(tier.price, locale)}</strong>
                  {matches && tier === applied && (
                    <span className="cart-tier-applied">{tr('Applied price')}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="cart-tier-help">{tr('Tap a tier to apply its quantity and price.')}</p>
          {productRows.length > 1 && (
            <p className="cart-combined-quantity">
              {tr('Tier based on combined variant quantity')}:{' '}
              <strong>{formatQuantity(total, row.unit, locale)}</strong>
            </p>
          )}
          {!matches && (
            <div className="cart-price-tiers-error">
              <p>{tr('Prices have changed. Refresh the cart to see the latest price.')}</p>
              <button
                type="button"
                disabled={options.isFetching}
                onClick={() => {
                  void cache.invalidateQueries({ queryKey: ['cart'] });
                  void options.refetch();
                }}
              >
                {tr('Refresh prices')}
              </button>
            </div>
          )}
          {next && (
            <p className="cart-next-price">
              {tr('Next lower price')}: <strong>{money(next.price, locale)}</strong> /{' '}
              {formatUnit(row.unit, 1, locale)} · {tr('Add')}{' '}
              <strong>{formatQuantity(next.min_quantity - total, row.unit, locale)}</strong>
            </p>
          )}
        </>
      )}
    </section>
  );
}
