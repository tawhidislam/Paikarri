import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { cartQuote } from '@/lib/orders';
import {
  productOptions,
  selectedPrice,
  quantitiesForTier,
  selectionTotal,
  setSkuCart,
  variantLabel,
} from '@/lib/buying';
import { money } from '@/lib/utils';
import { formatQuantity, formatUnit } from '@/lib/units';
import type { Listing } from '@/lib/catalog';
import { Button } from './ui/button';
import { Notice } from './shared';
import { RequestComposer } from './product/request-composer';
import '../pages/orders.css';
export function OrderPurchase({
  product: p,
  onVariantImage,
  onSubtotalChange,
}: {
  product: Listing;
  onVariantImage?: (id: string | null) => void;
  onSubtotalChange?: (value: number) => void;
}) {
  const { session, role, status } = useAuth();
  const tr = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const options = useQuery({
    queryKey: ['product-options', p.id],
    queryFn: () => productOptions(p.id),
  });
  const [quantities, setQuantities] = useState<Record<string, number> | null>(null);
  const skus = options.data?.skus.filter((s) => s.active) ?? [];
  const values = quantities ?? Object.fromEntries(skus.map((s, i) => [s.id, i === 0 ? p.moq : 0]));
  const selections = skus
    .filter((s) => (values[s.id] ?? 0) > 0)
    .map((s) => ({ sku_id: s.id, quantity: values[s.id] }));
  const total = selections.reduce((n, s) => n + s.quantity, 0);
  const subtotal = selectionTotal(skus, selections);
  useEffect(() => {
    onSubtotalChange?.(subtotal);
  }, [subtotal, onSubtotalChange]);
  const invalid =
    total < p.moq ||
    total > 1000000 ||
    skus.some(
      (s) =>
        !Number.isInteger(values[s.id] ?? 0) ||
        (values[s.id] ?? 0) < 0 ||
        (values[s.id] ?? 0) > s.stock,
    ) ||
    !skus.length;
  const add = useMutation({
    mutationFn: () => setSkuCart(p.id, selections),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['cart'] });
      navigate('/cart');
    },
    onError: () => void options.refetch(),
  });
  if (role && role !== 'buyer') return null;
  if (options.isPending)
    return (
      <div className="pd-options-loading" aria-busy="true">
        {tr('Loading buying options…')}
      </div>
    );
  if (options.isError)
    return (
      <>
        <Notice error={options.error} />
        <Button variant="outline" onClick={() => void options.refetch()}>
          {tr('Try again')}
        </Button>
      </>
    );
  const thresholds = [
    ...new Set([
      p.moq,
      ...skus.flatMap((s) => s.prices.map((t) => t.min_quantity)).filter((n) => n >= p.moq),
    ]),
  ].sort((a, b) => a - b);
  const selectTier = (target: number) => {
    const result = quantitiesForTier(skus, selections, target);
    if (result)
      setQuantities(
        Object.fromEntries(
          skus.map((s) => [s.id, result.find((r) => r.sku_id === s.id)?.quantity ?? 0]),
        ),
      );
  };
  const next = thresholds.find(
    (t) =>
      t > total &&
      selections.length > 0 &&
      selections.reduce(
        (sum, r) =>
          sum +
          Math.round(
            selectedPrice(
              skus.find((s) => s.id === r.sku_id)!,
              t,
            ) *
              r.quantity *
              100,
          ),
        0,
      ) < Math.round(subtotal * 100),
  );
  const buy = () =>
    session
      ? add.mutate()
      : navigate(`/auth/login?next=${encodeURIComponent(`/products/${p.id}`)}`);
  return (
    <>
      <div className="pd-buy-panel">
        <h3>{tr(skus.length > 1 ? 'Choose variants' : 'Order quantity')}</h3>
        <p className="muted">
          {tr(skus.length > 1 ? 'Mix variants to meet the minimum order.' : 'Minimum order')}{' '}
          {formatQuantity(p.moq, p.unit, locale)}
        </p>
        <div className="pd-sku-list">
          {skus.map((s) => (
            <div className="pd-sku" key={s.id}>
              <div>
                <strong>{variantLabel(s.options) || tr('Standard')}</strong>
                <small>
                  {money(selectedPrice(s, total), locale)} / {formatUnit(p.unit, 1, locale)} ·{' '}
                  {formatQuantity(s.stock, p.unit, locale)} {tr('available')}
                </small>
              </div>
              <div className="pd-sku-quantity">
                <div className="pd-quantity-control">
                  <button
                    type="button"
                    aria-label={`${tr('Decrease quantity')}: ${variantLabel(s.options) || tr('Standard')}`}
                    disabled={(values[s.id] ?? 0) <= (skus.length === 1 ? p.moq : 0)}
                    onClick={() =>
                      setQuantities({
                        ...values,
                        [s.id]: Math.max(
                          skus.length === 1 ? p.moq : 0,
                          (Number.isFinite(values[s.id]) ? values[s.id] : 0) - 1,
                        ),
                      })
                    }
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    aria-label={variantLabel(s.options) || tr('Order quantity')}
                    onFocus={() => onVariantImage?.(s.image_id)}
                    type="number"
                    min={skus.length === 1 ? p.moq : 0}
                    max={Math.min(s.stock, 1000000)}
                    step={1}
                    value={Number.isFinite(values[s.id] ?? 0) ? (values[s.id] ?? 0) : ''}
                    onChange={(e) => setQuantities({ ...values, [s.id]: e.target.valueAsNumber })}
                  />
                  <button
                    type="button"
                    aria-label={`${tr('Increase quantity')}: ${variantLabel(s.options) || tr('Standard')}`}
                    disabled={(values[s.id] ?? 0) >= Math.min(s.stock, 1000000)}
                    onClick={() =>
                      setQuantities({
                        ...values,
                        [s.id]: Math.min(
                          s.stock,
                          Math.max(
                            skus.length === 1 ? p.moq : 0,
                            (Number.isFinite(values[s.id]) ? values[s.id] : 0) + 1,
                          ),
                        ),
                      })
                    }
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pd-tier-list">
          {thresholds.map((n) => (
            <button
              type="button"
              aria-label={`${tr('Order')} ${formatQuantity(n, p.unit, locale)}`}
              aria-pressed={n === [...thresholds].reverse().find((t) => t <= total)}
              disabled={!quantitiesForTier(skus, selections, n)}
              onClick={() => selectTier(n)}
              key={n}
              className={n === [...thresholds].reverse().find((t) => t <= total) ? 'active' : ''}
            >
              <small>{formatQuantity(n, p.unit, locale)}+</small>
              <strong>
                {money(Math.min(...skus.map((s) => selectedPrice(s, n))), locale)}
                {Math.max(...skus.map((s) => selectedPrice(s, n))) >
                Math.min(...skus.map((s) => selectedPrice(s, n)))
                  ? ` – ${money(Math.max(...skus.map((s) => selectedPrice(s, n))), locale)}`
                  : ''}
              </strong>
            </button>
          ))}
        </div>
        <p className="pd-tier-help">
          {tr(
            'Select a price tier to update your quantity. For variants, only your selected options are adjusted.',
          )}
        </p>
        {invalid && (
          <p className="pd-quantity-warning" role="status">
            {tr(
              total < p.moq
                ? 'Quantity must meet the minimum order.'
                : 'Choose whole quantities within available stock.',
            )}
          </p>
        )}
        {next && (
          <p className="pd-next-tier">
            {tr('Next lower-price threshold')}: {formatQuantity(next, p.unit, locale)}
          </p>
        )}
        <div className="pd-buy-total">
          <span>
            {tr('Product subtotal')}
            <small>{formatQuantity(total, p.unit, locale)}</small>
          </span>
          <strong>{Number.isFinite(subtotal) ? money(subtotal, locale) : '—'}</strong>
        </div>
        <Button
          className="pd-main-buy"
          disabled={invalid || add.isPending || status?.status === 'suspended'}
          onClick={buy}
        >
          <ShoppingBag size={18} />
          {tr('Add to cart')}
        </Button>
        <p className="muted">
          {tr('Delivery charges are confirmed by the supplier before you accept the order.')}
        </p>
        <Notice error={add.error} />
      </div>
      <div className="pd-mobile-buy">
        <div>
          <small>{tr('Product subtotal')}</small>
          <strong>{money(subtotal, locale)}</strong>
        </div>
        <Button disabled={invalid || add.isPending || status?.status === 'suspended'} onClick={buy}>
          <ShoppingBag size={17} />
          {tr('Add to cart')}
        </Button>
      </div>
      <RequestComposer product={p} options={options.data} selections={selections} />
    </>
  );
}
export function CartNavigationLink() {
  const { session, role } = useAuth();
  const tr = useT();
  const cart = useQuery({
    queryKey: ['cart', session?.user.id],
    queryFn: cartQuote,
    enabled: !!session && role === 'buyer',
  });
  if (role && role !== 'buyer') return null;
  return (
    <Link
      className="order-cart-link"
      to="/cart"
      aria-label={`${tr('Cart')}${cart.data?.rows.length ? ` (${cart.data.rows.length})` : ''}`}
    >
      <ShoppingBag size={19} />
      {!!cart.data?.rows.length && <span>{cart.data.rows.length}</span>}
    </Link>
  );
}
