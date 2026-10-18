import { ShippingCalculator } from '@/components/growth/shipping';
import { OrderReceipt } from '@/components/order/receipt';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueries,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Printer,
  Clock,
  MapPin,
  X,
  PackageCheck,
  PackageOpen,
  Store,
  CircleCheck,
  SlidersHorizontal,
  ChevronDown,
  Search,
  Minus,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  Scale,
} from 'lucide-react';
import { EscrowAppealRoom } from '@/components/order/escrow-appeal-room';
import { BUYER_DISPUTE_CATEGORIES, DESIRED_OUTCOMES, formatDisputeClaim } from '@/lib/disputes';
import { ChatButton } from '@/components/marketplace-chat';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import {
  cartQuote,
  setCart,
  checkout,
  listOrders,
  getOrder,
  actOnOrder,
  formatOrderDate,
} from '@/lib/orders';
import {
  cartSubtotal,
  checkoutSchema,
  orderStates,
  paymentStates,
  orderLabels,
  type CartRow,
  type OrderDetail,
  type OrderAction,
} from '@/lib/order-schema';
import {
  getRequest,
  productOptions,
  setSkuCart,
  variantLabel,
  type ProductOptions,
} from '@/lib/buying';
import { previewCartRows } from '@/lib/cart-pricing';
import { ProductImage } from '@/components/product-card';
import { CartPriceTiers } from '@/components/order/cart-price-tiers';
import { locations } from '@/lib/locations';
import { money, randomUUID } from '@/lib/utils';
import { formatQuantity, formatUnit } from '@/lib/units';
import { Button } from '@/components/ui/button';
import { Field, Notice, SectionTitle, State, useTitle } from '@/components/shared';
import './orders.css';
import './buyer-orders.css';
import './buyer-orders-phone.css';
import './buyer-order-detail-phone.css';
import './cart-mobile.css';
const inventoryKeys = new Set([
  'product',
  'catalog',
  'supplier-products',
  'own-products',
  'edit-product',
  'homepage-featured',
  'homepage-arrivals',
]);
const refreshInventory = (cache: QueryClient) =>
  cache.invalidateQueries({ predicate: (q) => inventoryKeys.has(String(q.queryKey[0])) });
function Retry({ error, retry }: { error: unknown; retry: () => void }) {
  const tr = useT();
  return (
    <div>
      <Notice error={error} />
      <Button variant="outline" onClick={retry}>
        {tr('Try again')}
      </Button>
    </div>
  );
}
export function OrderStatus({ value }: { value: string }) {
  const tr = useT();
  return <span className={`order-status status-${value}`}>{tr(orderLabels[value] ?? value)}</span>;
}
function CartLine({
  row,
  rows,
  onEditingChange,
  previewRows,
  imagePath,
}: {
  row: CartRow;
  rows: CartRow[];
  imagePath?: string;
  previewRows: CartRow[];
  onEditingChange: (id: string, quantity: number | null) => void;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const cache = useQueryClient();
  const [draft, setDraft] = useState({ quantity: row.quantity, revision: 0 });
  const quantity = draft.quantity;
  const [acknowledgedRevision, setAcknowledgedRevision] = useState(0);
  const [previousSavedQuantity, setPreviousSavedQuantity] = useState(row.quantity);
  if (previousSavedQuantity !== row.quantity) {
    setPreviousSavedQuantity(row.quantity);
    if (draft.revision === acknowledgedRevision) setDraft({ ...draft, quantity: row.quantity });
  }
  const changeQuantity = (next: number) =>
    setDraft({ quantity: next, revision: draft.revision + 1 });
  const discard = () => {
    const revision = draft.revision + 1;
    setDraft({ quantity: row.quantity, revision });
    setAcknowledgedRevision(revision);
    save.reset();
  };
  const lineId = row.sku_id ?? row.product_id;
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const remainingQuantity = rows
    .filter((r) => r.product_id === row.product_id && (r.sku_id ?? r.product_id) !== lineId)
    .reduce((sum, r) => sum + r.quantity, 0);
  useEffect(() => {
    onEditingChange(lineId, quantity !== row.quantity ? quantity : null);
    return () => onEditingChange(lineId, null);
  }, [lineId, quantity, row.quantity, onEditingChange]);
  const updating = useIsMutating({ mutationKey: ['cart-update'] }) > 0;
  const minimumQuantity = Math.max(1, row.moq - remainingQuantity);
  const maximumQuantity = Math.min(row.stock, 1000000 - remainingQuantity);
  const validQuantity =
    Number.isInteger(quantity) && quantity >= minimumQuantity && quantity <= maximumQuantity;
  const preview = previewRows.find((r) => (r.sku_id ?? r.product_id) === lineId) ?? row;
  const save = useMutation({
    mutationKey: ['cart-update'],
    mutationFn: ({ quantity: n }: { quantity: number | 'all'; revision: number }) =>
      row.sku_id
        ? setSkuCart(
            row.product_id,
            n === 'all'
              ? []
              : rows
                  .filter((r) => r.product_id === row.product_id)
                  .map((r) => ({
                    sku_id: r.sku_id!,
                    quantity: r.sku_id === row.sku_id ? n : r.quantity,
                  }))
                  .filter((r) => r.quantity > 0),
          )
        : setCart(row.product_id, n === 'all' ? 0 : n),
    onSuccess: async (_data, variables) => {
      setAcknowledgedRevision(variables.revision);
      await cache.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      void cache.invalidateQueries({ queryKey: ['product-options', row.product_id] });
    },
  });
  const mutateQuantity = save.mutate;
  useEffect(() => {
    if (
      !validQuantity ||
      quantity === row.quantity ||
      updating ||
      (save.isError && save.variables?.quantity === quantity)
    )
      return;
    const timer = window.setTimeout(() => {
      if (!cache.isMutating({ mutationKey: ['cart-update'] }))
        mutateQuantity({ quantity, revision: draft.revision });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    quantity,
    draft.revision,
    row.quantity,
    validQuantity,
    updating,
    save.isError,
    save.variables,
    mutateQuantity,
    cache,
  ]);
  return (
    <article className={`order-cart-item ${!row.available ? 'is-unavailable' : ''}`}>
      <div className="cart-item-information">
        <Link
          className="cart-item-thumbnail"
          to={`/products/${row.product_id}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <ProductImage path={imagePath} alt="" />
        </Link>
        <div className="cart-item-description">
          <Link to={`/products/${row.product_id}`}>
            <h3>{locale === 'bn' && row.name_bn ? row.name_bn : row.name}</h3>
          </Link>
          <p>
            {money(preview.unit_price, locale)} / {formatUnit(row.unit, 1, locale)}
          </p>
          {variantLabel(row.variant_snapshot ?? {}) && (
            <p className="cart-item-variant">{variantLabel(row.variant_snapshot ?? {})}</p>
          )}
          <small>
            {tr('Minimum order')}: {formatQuantity(row.moq, row.unit, locale)}
          </small>
          {!row.available && (
            <p role="alert">
              {tr('Unavailable or insufficient stock. Update or remove this item.')}
            </p>
          )}
        </div>
      </div>
      <CartPriceTiers
        row={preview}
        rows={previewRows}
        savedRows={rows}
        selectedQuantity={quantity}
        pending={updating}
        onSelectQuantity={(next) => {
          changeQuantity(next);
          save.mutate({ quantity: next, revision: draft.revision + 1 });
        }}
      />
      <div className="order-cart-quantity">
        <Field label={tr('Quantity')}>
          <span className="cart-quantity-stepper">
            <button
              type="button"
              aria-label={tr('Decrease quantity')}
              disabled={updating || !Number.isFinite(quantity) || quantity <= minimumQuantity}
              onClick={() => changeQuantity(Math.max(minimumQuantity, quantity - 1))}
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              aria-label={tr('Quantity')}
              inputMode="numeric"
              min={minimumQuantity}
              max={maximumQuantity}
              step="1"
              aria-busy={updating}
              aria-invalid={!validQuantity}
              value={Number.isNaN(quantity) ? '' : quantity}
              onChange={(e) => changeQuantity(e.target.valueAsNumber)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && validQuantity && !updating && quantity !== row.quantity) {
                  e.preventDefault();
                  save.mutate({ quantity, revision: draft.revision });
                }
                if (e.key === 'Escape' && !updating) discard();
              }}
            />
            <button
              type="button"
              aria-label={tr('Increase quantity')}
              disabled={updating || !Number.isFinite(quantity) || quantity >= maximumQuantity}
              onClick={() => changeQuantity(Math.min(maximumQuantity, quantity + 1))}
            >
              <Plus size={16} />
            </button>
          </span>
        </Field>
        <Button
          size="sm"
          variant="outline"
          disabled={updating || !validQuantity || quantity === row.quantity}
          onClick={() => save.mutate({ quantity, revision: draft.revision })}
        >
          {save.isPending ? tr('Saving…') : tr('Update')}
        </Button>
        <button
          type="button"
          className="cart-remove"
          onClick={() => {
            if (remainingQuantity > 0 && remainingQuantity < row.moq) setConfirmRemoval(true);
            else save.mutate({ quantity: 0, revision: draft.revision });
          }}
          disabled={updating}
        >
          <Trash2 size={16} aria-hidden="true" />
          {tr('Remove')}
        </button>
        {confirmRemoval && (
          <div className="cart-remove-confirm" role="group" aria-label={tr('Remove all variants')}>
            <p>
              {tr(
                'Removing this variant would leave less than the minimum order. Remove all variants of this product instead?',
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={updating}
              onClick={() => save.mutate({ quantity: 'all', revision: draft.revision })}
            >
              {tr('Remove all variants')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={updating}
              onClick={() => setConfirmRemoval(false)}
            >
              {tr('Keep items')}
            </Button>
          </div>
        )}
        {!validQuantity && (
          <p className="cart-quantity-help" role="status">
            {tr('Choose a whole quantity between')}{' '}
            {new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(minimumQuantity)}–
            {new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(maximumQuantity)}.
          </p>
        )}
        {quantity !== row.quantity && (
          <div className="cart-quantity-help" role="status">
            {validQuantity && (
              <p>
                {tr(
                  save.isError
                    ? 'Changes were not saved. Retry Update or discard changes.'
                    : 'Saving quantity and prices automatically…',
                )}
              </p>
            )}
            <button type="button" disabled={updating} onClick={discard}>
              {tr('Discard changes')}
            </button>
          </div>
        )}
      </div>
      <div className="cart-line-total">
        <span>{tr('Item subtotal')}</span>
        <strong>{money(preview.unit_price * preview.quantity, locale)}</strong>
      </div>
      <Notice error={save.error} />
    </article>
  );
}
export function CartPage() {
  const tr = useT();
  const { locale } = useLocale();
  const { session, status } = useAuth();
  const cart = useQuery({ queryKey: ['cart', session?.user.id], queryFn: cartQuote });
  const updating = useIsMutating({ mutationKey: ['cart-update'] }) > 0;
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const onEditingChange = useCallback((id: string, quantity: number | null) => {
    setDrafts((previous) => {
      if (quantity === null && !(id in previous)) return previous;
      if (quantity !== null && Object.is(previous[id], quantity)) return previous;
      const next = { ...previous };
      if (quantity === null) delete next[id];
      else next[id] = quantity;
      return next;
    });
  }, []);
  const productIds = [
    ...new Set(cart.data?.rows.filter((row) => row.available).map((row) => row.product_id) ?? []),
  ];
  const pricing = useQueries({
    queries: productIds.map((id) => ({
      queryKey: ['product-options', id],
      queryFn: () => productOptions(id),
    })),
  });
  const options = new Map<string, ProductOptions>();
  pricing.forEach((query, index) => {
    if (query.data) options.set(productIds[index], query.data);
  });
  const images = useQuery({
    queryKey: ['cart-product-images', productIds.join(',')],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db()
        .from('product_images')
        .select('id,product_id,path,position')
        .in('product_id', productIds)
        .order('position');
      if (error) throw error;
      return data;
    },
  });
  const previewRows = previewCartRows(cart.data?.rows ?? [], drafts, options);
  const editing = Object.keys(drafts).length;
  const blocked =
    !cart.data?.rows.every((r) => r.available) ||
    status?.status === 'suspended' ||
    updating ||
    editing > 0;
  useTitle(tr('Your wholesale cart'));
  return (
    <div
      className={`container page-content orders-page cart-page ${cart.data?.rows.length ? 'has-items' : ''}`}
    >
      <SectionTitle
        heading="h1"
        eyebrow={tr('WHOLESALE ORDERS')}
        title={tr('Your wholesale cart')}
        description={tr('One checkout. A separate order for each supplier.')}
      />
      {cart.isPending ? (
        <State title={tr('Loading cart…')} />
      ) : cart.isError ? (
        <Retry error={cart.error} retry={() => void cart.refetch()} />
      ) : !cart.data.rows.length ? (
        <div className="cart-empty-wrapper">
          <State
            title={tr('Your cart is empty')}
            description={tr(
              'Search verified Bangladeshi manufacturers and wholesale suppliers to start your order.',
            )}
            action={<Link to="/products">{tr('Browse products')}</Link>}
          />
          <div className="cart-empty-categories">
            <h3>{tr('Popular wholesale categories')}</h3>
            <div className="cart-category-chips">
              <Link to="/products?category=garments" className="cart-category-chip">
                {tr('Ready-made Garments')}
              </Link>
              <Link to="/products?category=textiles" className="cart-category-chip">
                {tr('Fabrics & Textiles')}
              </Link>
              <Link to="/products?category=jute" className="cart-category-chip">
                {tr('Jute & Eco Packaging')}
              </Link>
              <Link to="/products?category=packaging" className="cart-category-chip">
                {tr('Packaging & Boxes')}
              </Link>
              <Link to="/products?category=electronics" className="cart-category-chip">
                {tr('Electronics & Accessories')}
              </Link>
              <Link to="/products?category=leather" className="cart-category-chip">
                {tr('Leather Goods')}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="order-checkout-grid">
          <div className="cart-suppliers">
            {[...new Set(cart.data.rows.map((r) => r.business_id))].map((bid) => (
              <section className="order-panel cart-supplier-group" key={bid}>
                <header>
                  <Store size={20} aria-hidden="true" />
                  <h2>{cart.data.rows.find((r) => r.business_id === bid)!.supplier_name}</h2>
                </header>
                {cart.data.rows
                  .filter((r) => r.business_id === bid)
                  .map((row) => (
                    <CartLine
                      key={row.sku_id ?? row.product_id}
                      row={row}
                      rows={cart.data.rows}
                      previewRows={previewRows}
                      imagePath={
                        images.data?.find(
                          (image) =>
                            image.product_id === row.product_id &&
                            image.id ===
                              options.get(row.product_id)?.skus.find((sku) => sku.id === row.sku_id)
                                ?.image_id,
                        )?.path ??
                        images.data?.find((image) => image.product_id === row.product_id)?.path
                      }
                      onEditingChange={onEditingChange}
                    />
                  ))}
              </section>
            ))}
          </div>
          <aside className="order-panel order-summary">
            <h2>{tr('Order summary')}</h2>
            <dl>
              <div>
                <dt>{tr('Products')}</dt>
                <dd>
                  {new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
                    new Set(cart.data.rows.map((row) => row.product_id)).size,
                  )}
                </dd>
              </div>
              <div>
                <dt>{tr('Suppliers')}</dt>
                <dd>
                  {new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
                    new Set(cart.data.rows.map((r) => r.business_id)).size,
                  )}
                </dd>
              </div>
              <div className="cart-summary-subtotal">
                <dt>{tr('Product subtotal')}</dt>
                <dd>{money(cartSubtotal(previewRows), locale)}</dd>
              </div>
              <div>
                <dt>{tr('Delivery')}</dt>
                <dd>{tr('Supplier to confirm')}</dd>
              </div>
            </dl>
            {new Set(cart.data.rows.map((r) => r.business_id)).size > 1 && (
              <div className="cart-multi-supplier-callout">
                <PackageCheck size={16} aria-hidden="true" />
                <p>
                  {tr(
                    'Separate orders will be created for each supplier so each manufacturer can dispatch independently.',
                  )}
                </p>
              </div>
            )}
            <p>{tr('Prices and stock are checked again when you place your order.')}</p>
            {cart.data.rows.some((r) => !r.available) && (
              <p className="cart-checkout-warning" role="status">
                {tr('Update or remove unavailable items to continue.')}
              </p>
            )}
            {status?.status === 'suspended' && (
              <p className="cart-checkout-warning" role="status">
                {tr('Purchasing is unavailable while your account is suspended.')}
              </p>
            )}
            {editing > 0 && (
              <p className="cart-checkout-warning" role="status">
                {tr('Checkout is available after quantity changes are saved.')}
              </p>
            )}
            <div className="cart-checkout-actions" aria-label={tr('Checkout actions')}>
              <div className="cart-mobile-subtotal">
                <span>{tr('Product subtotal')}</span>
                <strong>{money(cartSubtotal(previewRows), locale)}</strong>
              </div>
              <Button asChild disabled={blocked}>
                <Link
                  to="/checkout"
                  aria-disabled={blocked}
                  onClick={(e) => {
                    if (blocked) e.preventDefault();
                  }}
                >
                  <span className="cart-checkout-desktop-label">{tr('Continue to checkout')}</span>
                  <span className="cart-checkout-mobile-label">{tr('Checkout')}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <Link to="/products">{tr('Continue sourcing')}</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
export function CheckoutPage() {
  const tr = useT();
  const { locale } = useLocale();
  const { session, status } = useAuth();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [checkoutParams] = useSearchParams();
  const requestId = checkoutParams.get('request');
  const offerId = checkoutParams.get('offer');
  const negotiated = useQuery({
    queryKey: ['checkout-offer', requestId, offerId, session?.user.id],
    enabled: !!requestId && !!offerId,
    queryFn: async () => {
      const r = await getRequest(requestId!);
      const offer = r.offers.find((o) => o.id === offerId);
      if (!offer) throw new Error('Offer unavailable');
      return { request: r, offer };
    },
  });
  const cart = useQuery({
    queryKey: ['cart', session?.user.id, requestId, offerId],
    enabled: !offerId || !!negotiated.data,
    queryFn: async () => {
      if (!offerId) return cartQuote();
      const r = negotiated.data!.request;
      const o = negotiated.data!.offer;
      const { data: p, error } = await db().rpc('public_products').eq('id', r.product_id).single();
      if (error) throw error;
      return {
        rows: o.lines.map((l) => ({
          product_id: p.id,
          sku_id: l.sku_id,
          business_id: p.business_id,
          supplier_name: tr('Supplier offer'),
          variant_snapshot:
            r.revisions
              .find((rv) => rv.revision === o.request_revision)
              ?.lines.find((x) => x.sku_id === l.sku_id)?.options ?? {},
          name: p.name,
          name_bn: p.name_bn,
          unit: p.unit,
          quantity: l.quantity,
          moq: r.kind === 'sample' ? 1 : p.moq,
          stock: l.quantity,
          unit_price: l.unit_price,
          available:
            !o.accepted_order_id &&
            Date.parse(o.expires_at) > Date.now() &&
            o.request_revision === r.revision &&
            o.revision === r.offers[0]?.revision,
        })),
      };
    },
  });
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    division: 'Dhaka',
    district: 'Dhaka',
    address: '',
  });
  const [method, setMethod] = useState<'cod' | 'bank_transfer'>('cod');
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const retry = useRef<{ signature: string; nonce: string } | null>(null);
  const place = useMutation({
    mutationFn: async () => {
      if (!agree) throw new Error('Confirm the checkout terms');
      if (!cart.data?.rows.length || cart.data.rows.some((r) => !r.available))
        throw new Error('Refresh your cart and remove unavailable items');
      const value = checkoutSchema.parse({ address, method, note });
      const signature = JSON.stringify({ value, rows: cart.data.rows });
      if (retry.current?.signature !== signature)
        retry.current = { signature, nonce: randomUUID() };
      if (offerId) {
        const { data, error } = await db().rpc('sourcing_offer_checkout', {
          target: offerId,
          expected_revision: negotiated.data!.offer.revision,
          nonce: retry.current.nonce,
          ...value,
        });
        if (error) throw error;
        return z.object({ ids: z.array(z.uuid()) }).parse(data);
      }
      return checkout(retry.current.nonce, value, cart.data.rows);
    },
    onSuccess: async (data) => {
      await cache.invalidateQueries({ queryKey: ['cart'] });
      await cache.invalidateQueries({ queryKey: ['orders'] });
      void refreshInventory(cache);
      navigate(data.ids.length === 1 ? `/dashboard/orders/${data.ids[0]}` : '/dashboard/orders');
    },
  });
  useTitle(tr('Checkout'));
  if (offerId && !requestId) return <State title={tr('Offer unavailable')} />;
  if (negotiated.error)
    return <Retry error={negotiated.error} retry={() => void negotiated.refetch()} />;
  if (cart.isPending) return <State title={tr('Loading cart…')} />;
  if (cart.isError) return <Retry error={cart.error} retry={() => void cart.refetch()} />;
  if (!cart.data.rows.length)
    return (
      <State
        title={tr('Your cart is empty')}
        action={<Link to="/products">{tr('Browse products')}</Link>}
      />
    );
  return (
    <div className="container page-content orders-page checkout-page">
      <Link className="order-back" to="/cart">
        <ArrowLeft size={16} />
        {tr('Back to cart')}
      </Link>
      <div className="checkout-stepper" aria-label={tr('Order progress')}>
        <div className="checkout-step is-complete">
          <span className="step-badge">
            <Check size={14} aria-hidden="true" />
          </span>
          <span className="step-text">{tr('Cart Review')}</span>
        </div>
        <div className="step-line is-complete" aria-hidden="true" />
        <div className="checkout-step is-active" aria-current="step">
          <span className="step-badge">2</span>
          <span className="step-text">{tr('Delivery & Terms')}</span>
        </div>
        <div className="step-line" aria-hidden="true" />
        <div className="checkout-step is-upcoming">
          <span className="step-badge">3</span>
          <span className="step-text">{tr('Supplier Confirmation')}</span>
        </div>
      </div>
      <SectionTitle
        heading="h1"
        eyebrow={tr('WHOLESALE ORDERS')}
        title={tr('Checkout')}
        description={tr(
          'No payment is collected at checkout. Review the final delivery charge before accepting each supplier order.',
        )}
      />
      <form
        className="order-checkout-grid"
        onSubmit={(e) => {
          e.preventDefault();
          place.mutate();
        }}
      >
        <div>
          <section className="order-panel">
            <header>
              <MapPin size={20} />
              <h2>{tr('Delivery address')}</h2>
            </header>
            <div className="form-grid">
              <Field label={tr('Recipient name')}>
                <input
                  required
                  maxLength={120}
                  autoComplete="shipping name"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                />
              </Field>
              <Field label={tr('Mobile number')}>
                <input
                  type="tel"
                  aria-label={tr('Mobile number')}
                  aria-describedby="checkout-phone-help"
                  required
                  autoComplete="shipping tel"
                  placeholder="01XXXXXXXXX"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                />
                <small id="checkout-phone-help" className="field-hint">
                  {tr('11-digit Bangladeshi mobile number e.g. 01712345678')}
                </small>
              </Field>
              <Field label={tr('Division')}>
                <select
                  value={address.division}
                  onChange={(e) =>
                    setAddress({
                      ...address,
                      division: e.target.value,
                      district: locations[e.target.value][0],
                    })
                  }
                >
                  {Object.keys(locations).map((v) => (
                    <option key={v} value={v}>
                      {tr(v)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tr('District')}>
                <select
                  value={address.district}
                  onChange={(e) => setAddress({ ...address, district: e.target.value })}
                >
                  {locations[address.division].map((v) => (
                    <option key={v} value={v}>
                      {tr(v)}
                    </option>
                  ))}
                </select>
                <small className="field-hint">
                  {tr('Used by suppliers to calculate commercial freight.')}
                </small>
              </Field>
            </div>
            <Field label={tr('Street address and delivery instructions')}>
              <textarea
                required
                minLength={10}
                maxLength={500}
                aria-label={tr('Street address and delivery instructions')}
                autoComplete="shipping street-address"
                value={address.address}
                onChange={(e) => setAddress({ ...address, address: e.target.value })}
              />
              <span className="field-char-count">{address.address.length} / 500</span>
            </Field>
          </section>
          <section className="order-panel">
            <header>
              <ShieldCheck size={20} />
              <h2>{tr('Payment method')}</h2>
            </header>
            <fieldset className="order-payment-options">
              <legend className="sr-only">{tr('Payment method')}</legend>
              {(['cod', 'bank_transfer'] as const).map((v) => (
                <label
                  key={v}
                  className={`payment-option-card ${method === v ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={method === v}
                    onChange={() => setMethod(v)}
                  />
                  <span className="payment-option-body">
                    <span className="payment-option-title-row">
                      <strong>
                        {tr(orderLabels[v])}
                        {v === 'bank_transfer' && (
                          <span className="escrow-sublabel"> ({tr('Manual bank payment')})</span>
                        )}
                      </strong>
                      {v === 'bank_transfer' && (
                        <span className="payment-badge">{tr('Manual payment verification')}</span>
                      )}
                    </span>
                    <small>
                      {tr(
                        v === 'cod'
                          ? 'Pay on delivery. Collection is recorded after external verification.'
                          : 'Confirm payment instructions with the supplier. Bank payments are verified manually; no escrow service is active.',
                      )}
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>
            {method === 'bank_transfer' && (
              <div className="bank-transfer-guidance" role="note">
                <ShieldCheck size={18} aria-hidden="true" />
                <div>
                  <strong>{tr('Manual payment verification')}</strong>
                  <p>
                    {tr(
                      'COD and manually confirmed bank payments are available. Confirm bank instructions with the supplier before paying. Paikarii.com does not hold funds or guarantee refunds.',
                    )}
                  </p>
                </div>
              </div>
            )}
            <Field label={tr('Order note (optional)')}>
              <textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </section>
        </div>
        <aside className="order-panel order-summary">
          <h2>{tr('Review your order')}</h2>
          {[...new Set(cart.data.rows.map((r) => r.business_id))].map((bid) => {
            const supplierRows = cart.data.rows.filter((r) => r.business_id === bid);
            const supplierName = supplierRows[0]?.supplier_name;
            return (
              <div className="checkout-supplier-group" key={bid}>
                <div className="checkout-supplier-header">
                  <Store size={14} aria-hidden="true" />
                  <strong>{supplierName}</strong>
                </div>
                {supplierRows.map((r) => (
                  <div className="checkout-line" key={r.sku_id ?? r.product_id}>
                    <span>
                      {locale === 'bn' && r.name_bn ? r.name_bn : r.name}
                      <small>{formatQuantity(r.quantity, r.unit, locale)}</small>
                    </span>
                    <strong>{money(r.quantity * r.unit_price, locale)}</strong>
                  </div>
                ))}
              </div>
            );
          })}
          <dl>
            <div>
              <dt>{tr('Product subtotal')}</dt>
              <dd>{money(cartSubtotal(cart.data.rows), locale)}</dd>
            </div>
            <div>
              <dt>{tr('Delivery')}</dt>
              <dd>{tr('Supplier to confirm')}</dd>
            </div>
          </dl>
          {new Set(cart.data.rows.map((r) => r.business_id)).size > 1 && (
            <div className="checkout-multi-supplier-badge">
              <PackageCheck size={16} aria-hidden="true" />
              <span>
                {tr('{count} separate supplier orders will be placed').replace(
                  '{count}',
                  new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
                    new Set(cart.data.rows.map((r) => r.business_id)).size,
                  ),
                )}
              </span>
            </div>
          )}
          {[...new Set(cart.data.rows.map((row) => row.business_id))].map((business) => (
            <div key={business}>
              <h3>{cart.data.rows.find((row) => row.business_id === business)?.supplier_name}</h3>
              <ShippingCalculator
                business={business}
                district={address.district}
                subtotal={cartSubtotal(
                  cart.data.rows.filter((row) => row.business_id === business),
                )}
              />
            </div>
          ))}
          <label className="order-declaration">
            <input
              required
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>
              {tr(
                'I confirm these quantities and delivery details. Each supplier must confirm delivery charges, which I will review before the order proceeds.',
              )}
            </span>
          </label>
          <Notice error={place.error} />
          {place.error && (
            <Button type="button" variant="outline" onClick={() => void cart.refetch()}>
              {tr('Refresh cart')}
            </Button>
          )}
          <Button
            disabled={
              !agree ||
              place.isPending ||
              status?.status === 'suspended' ||
              cart.data.rows.some((r) => !r.available)
            }
          >
            {place.isPending ? tr('Placing orders…') : tr('Place order request')}
            <ArrowRight size={16} />
          </Button>
          <small>{tr('Stock is reserved for 48 hours while confirmation is pending.')}</small>
          <div className="checkout-trust-strip">
            <div className="trust-item">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>{tr('Verified Bangladeshi suppliers & trade licences')}</span>
            </div>
            <div className="trust-item">
              <Truck size={14} aria-hidden="true" />
              <span>{tr('Approve delivery charges before final payment')}</span>
            </div>
            <div className="trust-item">
              <Clock size={14} aria-hidden="true" />
              <span>{tr('Stock & tier prices reserved for 48 hours')}</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
function buyerOrderMessage(
  order: Pick<
    OrderDetail,
    'status' | 'payment_method' | 'payment_status' | 'cancellation_requested'
  >,
) {
  if (order.cancellation_requested)
    return 'Cancellation requested. Waiting for the supplier response.';
  if (order.status === 'pending_confirmation')
    return 'Your supplier is checking availability and delivery charges.';
  if (order.status === 'awaiting_acceptance')
    return 'Your final total is ready. Review it before the order proceeds.';
  if (
    order.status === 'processing' &&
    order.payment_method === 'bank_transfer' &&
    order.payment_status === 'unpaid'
  )
    return 'Confirm supplier bank instructions before paying, then report your payment for manual verification.';
  if (
    order.status === 'processing' &&
    order.payment_method === 'bank_transfer' &&
    order.payment_status === 'reported'
  )
    return 'Bank deposit reported. Paikarii finance is verifying the statement credit.';
  if (order.status === 'processing') return 'Your supplier is preparing your order.';
  if (order.status === 'shipped')
    return 'Your order is on its way. Confirm receipt after delivery.';
  if (order.status === 'completed')
    return 'Delivery complete. Thank you for sourcing with Paikarii.com.';
  if (order.status === 'disputed') return 'Your dispute is under review. Fulfilment is paused.';
  return 'This order is cancelled. Review its payment and refund details.';
}
export function OrdersPage({ admin = false }: { admin?: boolean }) {
  const tr = useT();
  const { locale } = useLocale();
  const { session, role } = useAuth();
  const buyerView = !admin && role === 'buyer';
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '',
    state = params.get('state') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const size = [25, 50, 100].includes(Number(params.get('size'))) ? Number(params.get('size')) : 25;
  const [draft, setDraft] = useState(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const orderSearch = useRef<HTMLInputElement>(null);
  const query = useQuery({
    queryKey: ['orders', session?.user.id, search, state, page, size],
    queryFn: () => listOrders(search, state, page, size),
    refetchInterval: () => (document.visibilityState === 'visible' ? 15000 : false),
  });
  const base = admin ? '/admin/orders' : '/dashboard/orders';
  const update = (key: string, value: string) => {
    // Read committed browser navigation so rapid filter changes compose correctly.
    const n = new URLSearchParams(window.location.search);
    if (key === 'state' || key === 'size') {
      if (draft) n.set('search', draft);
      else n.delete('search');
    }
    if (value) n.set(key, value);
    else n.delete(key);
    if (key !== 'page') n.delete('page');
    setParams(n);
  };
  useTitle(tr(admin ? 'Order management' : 'Orders'));
  return (
    <div className={`orders-page ${buyerView ? 'bo-page bo-list' : ''}`}>
      {buyerView ? (
        <div className="bo-heading">
          <div>
            <span className="bo-eyebrow">{tr('YOUR BUYING WORKSPACE')}</span>
            <h1>
              <span className="bo-desktop-title">{tr('Your orders, all in one place.')}</span>
              <span className="bo-mobile-title">{tr('My orders')}</span>
            </h1>
            <p>{tr('Keep track of your suppliers, delivery updates and next steps.')}</p>
          </div>
          <Link to="/products" className="bo-browse">
            {tr('Find your next product')}
            <ArrowRight size={17} />
          </Link>
          {buyerView && (
            <button
              type="button"
              className="bo-filter-toggle"
              aria-label={tr('Order filters')}
              aria-expanded={filtersOpen}
              aria-controls="bo-status-filter bo-size-filter"
              data-active={!!state || size !== 25}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={20} />
              <span>{tr('Filters')}</span>
            </button>
          )}
          <span className="bo-heading-art" aria-hidden="true">
            <PackageCheck size={68} strokeWidth={1.2} />
          </span>
        </div>
      ) : (
        <SectionTitle
          eyebrow={tr(admin ? 'PLATFORM OPERATIONS' : 'WHOLESALE ORDERS')}
          title={tr(admin ? 'Order management' : 'Orders')}
          description={tr(
            admin
              ? 'Monitor fulfilment, verify external payments, and resolve order disputes.'
              : 'Follow every supplier order from confirmation to delivery.',
          )}
        />
      )}
      {query.data && (
        <div className="order-metrics">
          {(
            [
              ['Open orders', query.data.counts.open],
              ['Disputes', query.data.counts.disputed],
              ['Refunds to verify', query.data.counts.refund_pending],
            ] as const
          ).map(([label, count]) => (
            <div key={label}>
              <small>{tr(label)}</small>
              <strong>{count.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}</strong>
            </div>
          ))}
        </div>
      )}
      {buyerView && (
        <nav className="bo-tabs" aria-label={tr('Filter orders by status')}>
          {[
            ['', 'All orders'],
            ['pending_confirmation', 'Awaiting supplier'],
            ['awaiting_acceptance', 'Review delivery terms'],
            ['processing', 'Preparing order'],
            ['shipped', 'Shipped'],
            ['completed', 'Completed'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={
                ['pending_confirmation', 'processing'].includes(value)
                  ? 'bo-tab-secondary'
                  : undefined
              }
              aria-pressed={state === value}
              onClick={() => update('state', value)}
            >
              <span className="bo-tab-wide">{tr(label)}</span>
              <span className="bo-tab-short">
                {tr(value === 'awaiting_acceptance' ? 'To review' : label)}
              </span>
            </button>
          ))}
        </nav>
      )}
      <form
        className={`order-filters${filtersOpen ? ' bo-filters-open' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          update('search', draft);
        }}
      >
        <Field label={tr('Search orders')}>
          <input
            ref={orderSearch}
            type="search"
            maxLength={200}
            value={draft}
            placeholder={tr(
              buyerView ? 'Order number or supplier' : 'Order number, supplier or buyer',
            )}
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
        <Field label={tr('Status')}>
          <select
            id="bo-status-filter"
            value={state}
            onChange={(e) => update('state', e.target.value)}
          >
            <option value="">{tr('All statuses')}</option>
            {[...orderStates, ...paymentStates].map((v) => (
              <option key={v} value={v}>
                {tr(orderLabels[v])}
              </option>
            ))}
          </select>
        </Field>
        <Button
          variant="outline"
          className={buyerView ? 'bo-search-submit' : undefined}
          aria-label={tr('Search')}
        >
          {buyerView && <Search size={19} aria-hidden="true" />}
          <span>{tr('Search')}</span>
        </Button>
        <Field label={tr('Rows per page')}>
          <select id="bo-size-filter" value={size} onChange={(e) => update('size', e.target.value)}>
            {[25, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
      </form>
      {buyerView && (state || search || size !== 25) && (
        <div className="bo-applied-filters" aria-label={tr('Applied order filters')}>
          <div>
            {state && <span>{tr(orderLabels[state] ?? state)}</span>}
            {search && (
              <span className="bo-query-summary" title={search}>
                “{search}”
              </span>
            )}
            {size !== 25 && (
              <span>
                {tr('Rows per page')}: {size.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              setParams({});
              orderSearch.current?.focus();
            }}
          >
            {tr('Clear filters')}
          </button>
        </div>
      )}
      {query.isPending ? (
        buyerView ? (
          <div
            className="bo-order-list bo-skeleton-list"
            role="status"
            aria-label={tr('Loading orders…')}
          >
            <span className="sr-only">{tr('Loading orders…')}</span>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bo-order-card bo-order-skeleton" aria-hidden="true">
                <header>
                  <span className="bo-skeleton-line bo-sk-number" />
                  <span className="bo-skeleton-line bo-sk-date" />
                  <span className="bo-skeleton-line bo-sk-status" />
                </header>
                <div className="bo-card-main">
                  <span className="bo-skeleton-circle bo-sk-icon" />
                  <div className="bo-supplier">
                    <span className="bo-skeleton-line bo-sk-label" />
                    <span className="bo-skeleton-line bo-sk-name" />
                    <span className="bo-skeleton-line bo-sk-type" />
                  </div>
                  <div className="bo-card-total">
                    <span className="bo-skeleton-line bo-sk-label" />
                    <span className="bo-skeleton-line bo-sk-price" />
                    <span className="bo-skeleton-line bo-sk-badge" />
                  </div>
                </div>
                <footer>
                  <span className="bo-skeleton-line bo-sk-footer-msg" />
                  <span className="bo-skeleton-line bo-sk-footer-btn" />
                </footer>
              </div>
            ))}
          </div>
        ) : (
          <State title={tr('Loading orders…')} />
        )
      ) : query.isError ? (
        <Retry error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.rows.length ? (
        <State
          title={tr('No orders found')}
          description={tr('Orders matching your search will appear here.')}
          action={!admin ? <Link to="/products">{tr('Browse products')}</Link> : undefined}
        />
      ) : (
        <>
          {buyerView ? (
            <div className="bo-order-list">
              {query.data.rows.map((o) => (
                <article className="bo-order-card" key={o.id}>
                  <header>
                    <Link className="bo-order-number" to={`${base}/${o.id}`}>
                      PK-{o.number.toString().padStart(6, '0')}
                      <ArrowRight size={15} />
                    </Link>
                    <time dateTime={o.created_at}>{formatOrderDate(o.created_at, locale)}</time>
                    <OrderStatus value={o.status} />
                  </header>
                  <div className="bo-card-main">
                    <span className="bo-supplier-icon" aria-hidden="true">
                      <Store size={27} strokeWidth={1.5} />
                    </span>
                    <div className="bo-supplier">
                      <small>{tr('Supplier')}</small>
                      <h2>{o.supplier_name}</h2>
                      <span>
                        {tr(o.purchase_kind ?? 'wholesale')}
                        <span aria-hidden="true"> · </span>
                        {tr(orderLabels[o.payment_method])}
                      </span>
                    </div>
                    <div className="bo-card-total">
                      <small>{tr('Current total')}</small>
                      <strong>{money(o.total, locale)}</strong>
                      <OrderStatus value={o.payment_status} />
                    </div>
                  </div>
                  <footer>
                    <p>
                      <span className={`bo-state-dot state-${o.status}`} aria-hidden="true" />
                      {tr(buyerOrderMessage(o))}
                    </p>
                    <Link className="bo-view-order" to={`${base}/${o.id}`}>
                      {tr(o.status === 'awaiting_acceptance' ? 'Review order' : 'View order')}
                      <ArrowRight size={16} />
                    </Link>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="order-table-wrap">
              <table className="order-table">
                <thead>
                  <tr>
                    {['Order', 'Participants', 'Status', 'Payment', 'Total', 'Placed'].map((h) => (
                      <th key={h}>{tr(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.rows.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`${base}/${o.id}`}>
                          PK-{o.number.toString().padStart(6, '0')}
                          <ArrowRight size={14} />
                        </Link>
                        {o.cancellation_requested && <small>{tr('Cancellation requested')}</small>}
                      </td>
                      <td>
                        <strong>{o.supplier_name}</strong>
                        <small>{o.buyer_name}</small>
                      </td>
                      <td>
                        <span className="order-status">{tr(o.purchase_kind ?? 'wholesale')}</span>
                        <OrderStatus value={o.status} />
                      </td>
                      <td>
                        <OrderStatus value={o.payment_status} />
                        <small>{tr(orderLabels[o.payment_method])}</small>
                      </td>
                      <td>{money(o.total, locale)}</td>
                      <td>{formatOrderDate(o.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav className="order-pagination" aria-label={tr('Order pagination')}>
            <span>
              {tr('Total orders')}: {query.data.total}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => update('page', String(page - 1))}
            >
              {tr('Previous')}
            </Button>
            <span>
              {page} / {Math.max(1, Math.ceil(query.data.total / size))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * size >= query.data.total}
              onClick={() => update('page', String(page + 1))}
            >
              {tr('Next')}
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
const actionLabels: Record<OrderAction, string> = {
  confirm: 'Confirm availability & delivery',
  accept: 'Accept final total',
  cancel: 'Cancel order',
  request_cancel: 'Request cancellation',
  decline_cancel: 'Decline cancellation',
  authorize_return: 'Authorize full return',
  return_ship: 'Dispatch return',
  return_received: 'Confirm return received',
  ship: 'Dispatch shipment',
  receive: 'Confirm received',
  report_payment: 'Report bank payment',
  confirm_payment: 'Verify external payment',
  confirm_refund: 'Verify completed refund',
  dispute: 'Open dispute',
  resolve_cancel: 'Resolve and cancel',
  resolve_resume: 'Resume order',
  resolve_complete: 'Resolve as delivered',
  note: 'Add order note',
};
function OrderActionDialog({
  order,
  action,
  presetNote,
  onClose,
  onDone,
}: {
  order: OrderDetail;
  action: OrderAction;
  presetNote?: string;
  onClose: () => void;
  onDone: (data: OrderDetail) => void;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const { role } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);
  const cache = useQueryClient();
  const [note, setNote] = useState(presetNote ?? '');
  const [reference, setReference] = useState('');
  const [fee, setFee] = useState(0);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [restock, setRestock] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState('damaged_goods');
  const [desiredOutcome, setDesiredOutcome] = useState('full_refund');
  const [evidenceUrls, setEvidenceUrls] = useState('');
  const needsReason = [
    'cancel',
    'request_cancel',
    'decline_cancel',
    'authorize_return',
    'return_received',
    'dispute',
    'resolve_cancel',
    'resolve_resume',
    'resolve_complete',
  ].includes(action);
  const needsReference = ['report_payment', 'confirm_payment', 'confirm_refund'].includes(action);

  const computePayloadNote = () => {
    if (action === 'dispute') {
      if (note.startsWith('[CLAIM:')) return note;
      return formatDisputeClaim({
        category: disputeCategory,
        desiredOutcome,
        details: note,
        evidenceUrls: evidenceUrls
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    }
    return note;
  };

  const mutate = useMutation({
    mutationFn: () =>
      actOnOrder(order.id, order.version, action, {
        note: computePayloadNote(),
        reference,
        shipping_fee: fee,
        carrier,
        tracking_number: tracking,
        restock,
      }),
    onSuccess: onDone,
  });
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`order-dialog${role === 'buyer' ? ' bo-action-dialog' : ''}`}
      aria-labelledby="order-action-title"
      onCancel={(e) => {
        if (mutate.isPending) e.preventDefault();
        else onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate.mutate();
        }}
      >
        <header>
          <h2 id="order-action-title">{tr(actionLabels[action])}</h2>
          <button
            type="button"
            disabled={mutate.isPending}
            aria-label={tr('Close')}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <p>
          PK-{order.number.toString().padStart(6, '0')} · {money(order.total, locale)}
        </p>
        {action === 'accept' && (
          <div className="order-action-notice">
            <strong>
              {tr('Final total')}: {money(order.total, locale)}
            </strong>
            <p>
              {tr(
                'This includes the supplier-confirmed delivery charge. Accepting starts fulfilment.',
              )}
            </p>
          </div>
        )}
        {action === 'receive' && (
          <div className="order-action-notice">
            <p>{tr('Confirm only after you have received and checked the goods.')}</p>
            {order.payment_method === 'bank_transfer' && (
              <p>
                <strong>
                  {tr(
                    'Only confirm delivery after inspecting the goods. This records acceptance; it does not automatically transfer money.',
                  )}
                </strong>
              </p>
            )}
          </div>
        )}
        {needsReference && (
          <>
            <p>
              {tr(
                action === 'report_payment'
                  ? 'Enter your bank deposit slip, transaction ID, or sender account number from your transfer to Paikarii official bank account. Paikarii finance will verify the credit before authorizing supplier dispatch.'
                  : 'This records an externally verified transaction. Paikarii.com does not move money.',
              )}
            </p>
            <Field label={tr('Transaction / receipt reference')}>
              <input
                required
                minLength={3}
                maxLength={200}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
          </>
        )}
        {action === 'confirm' && (
          <>
            <Field label={tr('Delivery charge (BDT)')}>
              <input
                type="number"
                required
                min="0"
                max="1000000"
                step="0.01"
                value={Number.isNaN(fee) ? '' : fee}
                onChange={(e) => setFee(e.target.valueAsNumber)}
              />
            </Field>
            <p>
              {tr('Final total')}:{' '}
              {Number.isFinite(fee) ? money(order.subtotal + fee, locale) : '—'}
            </p>
          </>
        )}
        {(action === 'ship' || action === 'return_ship') && (
          <>
            <Field label={tr('Carrier / delivery service')}>
              <input
                required
                minLength={2}
                maxLength={100}
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </Field>
            <Field label={tr('Tracking / consignment number')}>
              <input
                required
                minLength={2}
                maxLength={120}
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
              />
            </Field>
            <p>{tr('Confirm only after the shipment has been handed to the carrier.')}</p>
          </>
        )}
        {action === 'authorize_return' && (
          <p>
            {tr(
              'Authorize return of all order items. Agree on the return address in order notes before the buyer dispatches.',
            )}
          </p>
        )}
        {action === 'return_received' && (
          <label className="order-declaration">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
            />
            <span>
              {tr(
                'I inspected every returned item and want to add all returned units back to available stock. Leave unchecked for damaged or unsellable goods.',
              )}
            </span>
          </label>
        )}
        {action === 'dispute' && (
          <div className="order-dispute-helper">
            <div className="dispute-helper-header">
              <Scale size={16} aria-hidden="true" />
              <strong>{tr('Open dispute')}</strong>
            </div>
            <p>
              {tr(
                'Submit your claim and evidence for review. Dispute decisions and any external refunds require manual follow-up.',
              )}
            </p>
            <div className="dispute-quick-categories">
              <span className="order-dialog-hint">{tr('Dispute Category')}:</span>
              <div className="category-pill-row">
                {BUYER_DISPUTE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-pill ${disputeCategory === cat.id ? 'is-selected' : ''}`}
                    onClick={() => setDisputeCategory(cat.id)}
                  >
                    {locale === 'bn' ? cat.label_bn : cat.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label={tr('Desired outcome')}>
              <select value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)}>
                {DESIRED_OUTCOMES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {locale === 'bn' ? o.label_bn : o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr('Supporting Evidence URLs or References')}>
              <input
                placeholder="https://... | https://..."
                value={evidenceUrls}
                onChange={(e) => setEvidenceUrls(e.target.value)}
              />
              <small className="order-dialog-hint">
                {tr(
                  'Separate multiple URLs or document references with a vertical bar (|). Include links to photos, unboxing videos, weighment slips, or courier consignment numbers.',
                )}
              </small>
            </Field>
          </div>
        )}
        {action === 'note' && note.includes('[SELLER DEFENSE') && (
          <div className="order-action-notice">
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <strong>{tr('Seller Defense & Counter-Evidence')}</strong>
              <p>
                {tr(
                  'State your defense clearly. Include links to delivery challan photos, weighment records, or communication evidence.',
                )}
              </p>
            </div>
          </div>
        )}
        {action === 'note' && note.includes('[PAIKARII SUPERVISOR') && (
          <div className="order-action-notice">
            <Scale size={18} aria-hidden="true" />
            <div>
              <strong>{tr('Official Paikarii Supervision Notice')}</strong>
              <p>
                {tr(
                  'Enter instructions, requests for evidence, or deadlines for either party to submit.',
                )}
              </p>
            </div>
          </div>
        )}
        {action === 'resolve_cancel' && (
          <div className="order-action-notice">
            <strong>{tr('Record buyer refund decision')}</strong>
            <p>
              {tr(
                'This ruling cancels the order. Any refund of {amount} must be arranged externally and recorded after it is confirmed.',
              ).replace('{amount}', money(order.total, locale))}
            </p>
          </div>
        )}
        {action === 'resolve_complete' && (
          <div className="order-action-notice">
            <strong>{tr('Resolve in supplier favour')}</strong>
            <p>
              {tr(
                'This ruling records the decision for an order of {amount}. It does not initiate an automatic payout.',
              ).replace('{amount}', money(order.total, locale))}
            </p>
          </div>
        )}
        {action === 'resolve_resume' && (
          <div className="order-action-notice">
            <strong>{tr('Resume Fulfillment')}</strong>
            <p>
              {tr(
                'This decision clears the dispute and restores the order to its pre-dispute status so fulfilment can proceed normally.',
              )}
            </p>
          </div>
        )}
        <Field label={tr(needsReason ? 'Reason / decision' : 'Note (optional)')}>
          <textarea
            required={needsReason || action === 'note'}
            minLength={needsReason ? 10 : action === 'note' ? 2 : 0}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Notice error={mutate.error} />
        {mutate.error && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void cache.invalidateQueries({ queryKey: ['order'] });
              onClose();
            }}
          >
            {tr('Refresh order')}
          </Button>
        )}
        <footer>
          <Button variant="outline" type="button" disabled={mutate.isPending} onClick={onClose}>
            {tr('Back')}
          </Button>
          <Button disabled={mutate.isPending}>
            {mutate.isPending ? tr('Saving…') : tr(actionLabels[action])}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
function CopyButton({ text, label }: { text: string; label: string }) {
  const tr = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      className="order-copy-btn"
      onClick={copy}
      title={copied ? tr('Copied!') : tr(label)}
      aria-label={copied ? tr('Copied!') : tr(label)}
    >
      {copied ? <Check size={14} className="is-copied" /> : <Copy size={14} />}
      <span className="order-copy-tooltip" role="status" aria-live="polite">
        {copied ? tr('Copied!') : tr(label)}
      </span>
    </button>
  );
}
function PaikariiEscrowCard({ order }: { order: OrderDetail; role: string | null }) {
  const tr = useT();
  const { locale } = useLocale();
  return (
    <section className="order-panel paikarii-escrow-card" aria-label={tr('Manual bank payment')}>
      <h2>{tr('Manual bank payment')}</h2>
      <p>
        {tr(
          'Confirm bank instructions directly with the supplier before transferring money. Payments and refunds are verified manually; Paikarii.com does not hold funds in escrow.',
        )}
      </p>
      <dl className="order-facts">
        <div>
          <dt>{tr('Order total')}</dt>
          <dd>{money(order.total, locale)}</dd>
        </div>
        <div>
          <dt>{tr('Payment status')}</dt>
          <dd>{tr(order.payment_status)}</dd>
        </div>
      </dl>
    </section>
  );
}
export function OrderDetailPage({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  const { session, role } = useAuth();
  const { locale } = useLocale();
  const tr = useT();
  const cache = useQueryClient();
  const [action, setAction] = useState<OrderAction | null>(null);
  const [actionPresetNote, setActionPresetNote] = useState<string | undefined>(undefined);
  const [progressFor, setProgressFor] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['order', session?.user.id, id],
    queryFn: () => getOrder(id!),
    refetchInterval: () => (document.visibilityState === 'visible' && !action ? 15000 : false),
  });
  useTitle(tr('Order details'));
  const base = admin ? '/admin/orders' : '/dashboard/orders';
  const pendingLayout =
    !admin && role === 'buyer' ? 'orders-page bo-page bo-detail bo-detail-pending' : undefined;
  if (query.isPending)
    return (
      <div className={pendingLayout}>
        <State title={tr('Loading order…')} />
      </div>
    );
  if (query.isError)
    return (
      <div className={pendingLayout}>
        <Retry error={query.error} retry={() => void query.refetch()} />
      </div>
    );
  const o = query.data;
  const buyer = o.buyer_id === session?.user.id;
  const seller = role === 'supplier' && !buyer;
  const owner = role === 'super_admin';
  const actions: OrderAction[] = [];
  if (seller && o.status === 'pending_confirmation') actions.push('confirm');
  if (buyer && o.status === 'awaiting_acceptance') actions.push('accept');
  if (buyer && o.status === 'shipped') actions.push('receive');
  if (
    seller &&
    o.status === 'processing' &&
    !o.cancellation_requested &&
    (o.payment_method === 'cod' || o.payment_status === 'paid')
  )
    actions.push('ship');
  if (
    buyer &&
    o.status === 'processing' &&
    o.payment_method === 'bank_transfer' &&
    ['unpaid', 'reported'].includes(o.payment_status)
  )
    actions.push('report_payment');
  if (
    owner &&
    ['processing', 'shipped', 'completed', 'disputed', 'cancelled'].includes(o.status) &&
    ['unpaid', 'reported'].includes(o.payment_status)
  )
    actions.push('confirm_payment');
  if (owner && o.payment_status === 'refund_pending') actions.push('confirm_refund');
  if (owner && o.status === 'disputed')
    actions.push('resolve_resume', 'resolve_cancel', 'resolve_complete');
  if (
    (buyer && ['pending_confirmation', 'awaiting_acceptance'].includes(o.status)) ||
    (seller && ['pending_confirmation', 'awaiting_acceptance', 'processing'].includes(o.status))
  )
    actions.push('cancel');
  if (seller && o.status === 'processing' && o.cancellation_requested)
    actions.push('decline_cancel');
  if (buyer && o.status === 'processing' && !o.cancellation_requested)
    actions.push('request_cancel');
  if (
    buyer &&
    ['processing', 'shipped', 'completed'].includes(o.status) &&
    (!o.completed_at || Date.now() - Date.parse(o.completed_at) < 30 * 86400000)
  )
    actions.push('dispute');
  const openDispute = o.disputes.find((d) => !d.resolved_at);
  const activeReturn = o.returns.at(-1);
  if (
    owner &&
    o.status === 'disputed' &&
    openDispute &&
    ['shipped', 'completed'].includes(openDispute.previous_status) &&
    !activeReturn
  )
    actions.push('authorize_return');
  if (buyer && o.status === 'disputed' && activeReturn?.status === 'authorized')
    actions.push('return_ship');
  if (seller && o.status === 'disputed' && activeReturn?.status === 'in_transit')
    actions.push('return_received');
  if (activeReturn && activeReturn.status !== 'received' && o.status === 'disputed') {
    for (let i = actions.length - 1; i >= 0; i--)
      if (['resolve_resume', 'resolve_cancel', 'resolve_complete'].includes(actions[i]))
        actions.splice(i, 1);
  }
  actions.push('note');
  const progress = [
    'pending_confirmation',
    'awaiting_acceptance',
    'processing',
    'shipped',
    'completed',
  ];
  return (
    <div className={`orders-page order-detail ${buyer && !admin ? 'bo-page bo-detail' : ''}`}>
      <Link className="order-back" to={base}>
        <ArrowLeft size={16} />
        {tr('All orders')}
      </Link>
      <div className="order-detail-heading">
        <div>
          <span className="eyebrow">{tr('WHOLESALE ORDER')}</span>
          <div className="order-number-row">
            <h1>PK-{o.number.toString().padStart(6, '0')}</h1>
            <CopyButton
              text={`PK-${o.number.toString().padStart(6, '0')}`}
              label="Copy order number"
            />
          </div>
          <p>
            {tr('Placed')} {formatOrderDate(o.created_at, locale)}
          </p>
        </div>
        <div>
          <span className="order-status">{tr(o.purchase_kind ?? 'wholesale')}</span>
          <OrderStatus value={o.status} />
          <OrderStatus value={o.payment_status} />
          <Button
            className="order-print"
            aria-label={tr('Print order')}
            title={tr('Print order')}
            variant="outline"
            onClick={async () => {
              await document.fonts.ready;
              window.print();
            }}
          >
            <Printer size={16} />
            <span>{tr('Print order')}</span>
          </Button>
        </div>
      </div>
      {buyer && !admin && (
        <section
          className={`bo-status-banner bo-status-${o.status}`}
          aria-label={tr('Current order status')}
        >
          <span className="bo-banner-icon" aria-hidden="true">
            {o.status === 'completed' ? (
              <CircleCheck size={30} />
            ) : o.status === 'shipped' ? (
              <Truck size={30} />
            ) : (
              <PackageOpen size={30} />
            )}
          </span>
          <div>
            <span className="bo-eyebrow">{tr('WHERE YOUR ORDER STANDS')}</span>
            <h2>{tr(orderLabels[o.status])}</h2>
            <p>{tr(buyerOrderMessage(o))}</p>
          </div>
        </section>
      )}
      {!['cancelled', 'disputed'].includes(o.status) ? (
        <div
          className={
            buyer && !admin
              ? `bo-progress-wrap${progressFor === id ? ' is-expanded' : ''}`
              : undefined
          }
        >
          {buyer && !admin && (
            <button
              className="bo-progress-toggle"
              type="button"
              aria-expanded={progressFor === id}
              aria-controls="buyer-order-progress"
              onClick={() => setProgressFor(progressFor === id ? null : id!)}
            >
              <span>{tr('Order progress')}</span>
              <small>
                {(progress.indexOf(o.status) + 1).toLocaleString(
                  locale === 'bn' ? 'bn-BD' : 'en-BD',
                )}{' '}
                / {progress.length.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}
              </small>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          )}
          <ol
            id={buyer && !admin ? 'buyer-order-progress' : undefined}
            className="order-progress"
            aria-label={tr('Order progress')}
          >
            {progress.map((s, i) => (
              <li
                key={s}
                aria-current={s === o.status ? 'step' : undefined}
                className={i <= progress.indexOf(o.status) ? 'is-done' : ''}
              >
                <span>{i + 1}</span>
                {tr(orderLabels[s])}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div
          className={`order-terminal-status is-${o.status}`}
          role="status"
          aria-label={tr(o.status === 'cancelled' ? 'Order cancelled' : 'Dispute in review')}
        >
          <span className="order-terminal-icon" aria-hidden="true">
            {o.status === 'cancelled' ? <XCircle size={22} /> : <AlertTriangle size={22} />}
          </span>
          <div>
            <strong>
              {tr(o.status === 'cancelled' ? 'Order cancelled' : 'Order processing paused')}
            </strong>
            <p>
              {tr(
                o.status === 'cancelled'
                  ? 'This order has been cancelled and is no longer being fulfilled.'
                  : 'Fulfilment is paused while the dispute is being reviewed.',
              )}
            </p>
          </div>
        </div>
      )}
      {o.cancellation_requested && (
        <div className="order-action-notice">
          {tr(
            'The buyer requested cancellation. Shipment is paused until the supplier responds or the dispute is resolved.',
          )}
        </div>
      )}
      {(o.status === 'disputed' || o.disputes.length > 0) && (
        <EscrowAppealRoom
          order={o}
          buyer={buyer}
          seller={seller}
          admin={admin}
          onAction={(act, preset) => {
            setAction(act);
            setActionPresetNote(preset);
          }}
        />
      )}
      <div className="order-detail-grid">
        <div>
          <section className="order-panel">
            <header>
              <ShoppingBag size={20} />
              <h2>{tr('Order items')}</h2>
            </header>
            {o.items.map((i) => (
              <div className="order-item-line" key={i.id}>
                <div>
                  {i.product_id ? (
                    <Link to={`/products/${i.product_id}`}>
                      <h3>
                        {locale === 'bn' && i.name_bn ? i.name_bn : i.name}
                        <small>{variantLabel(i.variant_snapshot ?? {})}</small>
                      </h3>
                    </Link>
                  ) : (
                    <h3>
                      {locale === 'bn' && i.name_bn ? i.name_bn : i.name}
                      <small>{variantLabel(i.variant_snapshot ?? {})}</small>
                    </h3>
                  )}
                  <small>
                    {formatQuantity(i.quantity, i.unit, locale)} × {money(i.unit_price, locale)}
                  </small>
                </div>
                <strong>{money(i.line_total, locale)}</strong>
              </div>
            ))}
            <dl className="order-totals">
              <div>
                <dt>{tr('Product subtotal')}</dt>
                <dd>{money(o.subtotal, locale)}</dd>
              </div>
              <div>
                <dt>{tr('Delivery')}</dt>
                <dd>
                  {o.status === 'pending_confirmation' ? (
                    <span className="order-pending-delivery">
                      {tr('Supplier to confirm')}
                      <small className="order-delivery-note">
                        {tr('Supplier will calculate transport charges for your district')}
                      </small>
                    </span>
                  ) : (
                    money(o.shipping_fee, locale)
                  )}
                </dd>
              </div>
              <div>
                <dt>{tr('Total')}</dt>
                <dd>{money(o.total, locale)}</dd>
              </div>
            </dl>
            {buyer && !admin && o.status === 'completed' && (
              <div className="bo-reorder-banner">
                <div>
                  <strong>{tr('Order completed')}</strong>
                  <p>{tr('Need more stock? Browse your items to place a new wholesale order.')}</p>
                </div>
                {o.items[0]?.product_id && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/products/${o.items[0].product_id}`}>
                      <RefreshCw size={14} aria-hidden="true" />
                      {tr('Buy again')}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </section>
          {o.payment_method === 'bank_transfer' && <PaikariiEscrowCard order={o} role={role} />}
          <section className="order-panel">
            <header>
              <Truck size={20} />
              <h2>{tr('Delivery & participants')}</h2>
            </header>
            <div className="order-contact-grid">
              <div>
                <small>{tr('Supplier')}</small>
                <div className="bo-supplier-contact-row">
                  <Link to={`/suppliers/${o.business_id}`}>
                    <strong>{o.supplier_name}</strong>
                  </Link>
                  {buyer && !admin && (
                    <ChatButton
                      business={o.business_id}
                      product={o.items[0]?.product_id ?? undefined}
                      compact
                    />
                  )}
                </div>
                <small>{tr('Buyer')}</small>
                <strong>{o.buyer_name}</strong>
              </div>
              <address>
                <strong>{o.shipping_address.name}</strong>
                <span>{o.shipping_address.phone}</span>
                <span>{o.shipping_address.address}</span>
                <span>
                  {tr(o.shipping_address.district)}, {tr(o.shipping_address.division)}
                </span>
              </address>
            </div>
            {o.shipments.map((s) => (
              <div className="order-tracking" key={s.id}>
                <Truck size={20} />
                <div>
                  <strong>{s.carrier}</strong>
                  <span className="order-tracking-ref">
                    {tr('Tracking reference')}: {s.tracking_number}
                    <CopyButton text={s.tracking_number} label="Copy tracking reference" />
                  </span>
                  <small>{formatOrderDate(s.shipped_at, locale)}</small>
                  <span className="order-delivery-estimate">
                    <Clock size={13} aria-hidden="true" />
                    {tr('Estimated delivery: 2–4 business days via courier')}
                  </span>
                </div>
              </div>
            ))}
            {o.buyer_note && (
              <p className="preserve-lines">
                <b>{tr('Buyer note')}: </b>
                {o.buyer_note}
              </p>
            )}
            {o.supplier_note && (
              <p className="preserve-lines">
                <b>{tr('Supplier note')}: </b>
                {o.supplier_note}
              </p>
            )}
          </section>
          {o.returns.length > 0 && (
            <section className="order-panel">
              <header>
                <Truck size={20} />
                <h2>{tr('Return shipment')}</h2>
              </header>
              {o.returns.map((r) => (
                <div className="order-history-entry" key={r.id}>
                  <strong>
                    {tr(
                      r.status === 'authorized'
                        ? 'Return authorized'
                        : r.status === 'in_transit'
                          ? 'Return dispatched'
                          : 'Return received',
                    )}
                  </strong>
                  <small>{formatOrderDate(r.authorized_at, locale)}</small>
                  {r.carrier && (
                    <p>
                      {r.carrier} · {r.tracking_number}
                    </p>
                  )}
                  {r.received_at && (
                    <p>
                      {tr(
                        r.restocked ? 'Returned units restocked' : 'Returned units not restocked',
                      )}{' '}
                      · {formatOrderDate(r.received_at, locale)}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
          {o.disputes.length > 0 && (
            <section className="order-panel">
              <header>
                <ShieldCheck size={20} />
                <h2>{tr('Disputes & decisions')}</h2>
              </header>
              {o.disputes.map((d) => (
                <div className="order-history-entry" key={d.id}>
                  <strong>{d.resolved_at ? tr('Resolved') : tr('Open dispute')}</strong>
                  <small>{formatOrderDate(d.opened_at, locale)}</small>
                  <p className="preserve-lines">{d.reason}</p>
                  {d.resolution_note && <p className="preserve-lines">{d.resolution_note}</p>}
                </div>
              ))}
            </section>
          )}
          <section className="order-panel">
            <header>
              <Clock size={20} />
              <h2>{tr('Order history')}</h2>
            </header>
            <ol className="order-history">
              {o.events.map((e) => (
                <li key={e.id}>
                  <span className="order-timeline-dot" />
                  <div>
                    <strong>{tr(orderLabels[e.action] ?? e.action)}</strong>
                    <small>
                      {tr(
                        e.actor_role === 'system'
                          ? 'System'
                          : e.actor_role === 'super_admin'
                            ? 'Super admin'
                            : e.actor_role === 'supplier'
                              ? 'Supplier'
                              : 'Buyer',
                      )}{' '}
                      · {formatOrderDate(e.created_at, locale)}
                    </small>
                    {e.note && <p className="preserve-lines">{e.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <section className="order-panel order-summary order-actions-panel">
            {buyer && !admin && (
              <div className="bo-action-total">
                <span>{tr('Current total')}</span>
                <strong>{money(o.total, locale)}</strong>
                {o.status === 'pending_confirmation' && (
                  <small>{tr('Delivery charge to be confirmed')}</small>
                )}
              </div>
            )}
            <h2>{tr('Next steps')}</h2>
            {o.expires_at &&
              (!buyer ||
                admin ||
                ['pending_confirmation', 'awaiting_acceptance'].includes(o.status)) && (
                <p className="order-confirmation-deadline">
                  <Clock size={14} /> {tr('Confirmation deadline')}:{' '}
                  {formatOrderDate(o.expires_at, locale)}
                </p>
              )}
            {o.status === 'pending_confirmation' && (
              <p>
                {tr(
                  'The supplier will confirm availability and delivery charges. You will review the final total before fulfilment.',
                )}
              </p>
            )}
            {o.status === 'processing' &&
              o.payment_method === 'bank_transfer' &&
              o.payment_status !== 'paid' && (
                <p>
                  {tr(
                    'Confirm supplier bank instructions before paying. Shipment becomes available after the super admin verifies receipt.',
                  )}
                </p>
              )}
            {o.status === 'disputed' && (
              <p>{tr('Fulfilment is paused while the super admin reviews the dispute.')}</p>
            )}
            <div className="order-action-buttons">
              {actions.map((a) => (
                <Button
                  key={a}
                  data-order-action={a}
                  variant={
                    ['cancel', 'dispute', 'request_cancel', 'note', 'resolve_cancel'].includes(a)
                      ? 'outline'
                      : 'default'
                  }
                  onClick={() => setAction(a)}
                >
                  {tr(actionLabels[a])}
                </Button>
              ))}
            </div>
          </section>
          <section className="order-panel">
            <h2>{tr('Payment record')}</h2>
            <p>{tr(orderLabels[o.payment_method])}</p>
            <OrderStatus value={o.payment_status} />
            <p className="muted">
              {tr(
                'Payments and refunds happen outside Paikarii.com. Only the super admin can mark them verified after checking external evidence.',
              )}
            </p>
            {o.payments.map((p) => (
              <div className="order-payment-record" key={p.id}>
                <strong>
                  {tr(
                    p.kind === 'payment_report'
                      ? 'Bank payment reported'
                      : p.kind === 'payment_confirmed'
                        ? 'Payment verified'
                        : 'Refund verified',
                  )}
                </strong>
                <span>{money(p.amount, locale)}</span>
                <span className="order-payment-ref">
                  {p.reference}
                  {p.reference && (
                    <CopyButton text={p.reference} label="Copy transaction reference" />
                  )}
                </span>
                <small>{formatOrderDate(p.created_at, locale)}</small>
              </div>
            ))}
          </section>
        </aside>
      </div>
      <OrderReceipt order={o} />
      {action && (
        <OrderActionDialog
          key={`${action}-${o.version}`}
          order={o}
          action={action}
          presetNote={actionPresetNote}
          onClose={() => {
            setAction(null);
            setActionPresetNote(undefined);
          }}
          onDone={(data) => {
            cache.setQueryData(['order', session?.user.id, id], data);
            void cache.invalidateQueries({ queryKey: ['orders'] });
            void cache.invalidateQueries({ queryKey: ['cart'] });
            void refreshInventory(cache);
            setAction(null);
            setActionPresetNote(undefined);
          }}
        />
      )}
    </div>
  );
}
