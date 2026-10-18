import { CompareButton } from './product/compare-button';
import { ChatButton } from './marketplace-chat';
import { useT } from '@/lib/i18n';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, ShieldCheck, Package, MapPin, Layers3 } from 'lucide-react';
import { signedImage, type Listing } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { db, configured } from '@/lib/supabase';
import { money } from '@/lib/utils';
import { formatQuantity, formatUnit } from '@/lib/units';
import { Notice } from './shared';
import './product-card.css';
export function ProductImage({
  path,
  alt,
  className = '',
}: {
  path?: string;
  alt: string;
  className?: string;
}) {
  const tr = useT();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const image = useQuery({
    queryKey: ['image', path],
    enabled: !!path,
    queryFn: () => signedImage(path!),
    staleTime: 240000,
    refetchInterval: 240000,
    refetchOnWindowFocus: 'always',
  });
  const unavailable = image.isError || (!!image.data && failedUrl === image.data);
  return path && image.data && !unavailable ? (
    <img
      className={className}
      src={image.data}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(image.data!)}
    />
  ) : (
    <div
      className={`image-placeholder ${className}`}
      role="img"
      aria-label={unavailable ? `${tr('Image unavailable')}: ${alt}` : alt}
    >
      <Package size={40} strokeWidth={1} />
      <span>{tr(unavailable ? 'Image unavailable' : 'Product image')}</span>
    </div>
  );
}
export function SaveProduct({ id }: { id: string }) {
  const tr = useT();
  const { session, role } = useAuth();
  const { t } = useLocale();
  const nav = useNavigate();
  const cache = useQueryClient();
  const key = ['favorite', session?.user.id, id];
  const saved = useQuery({
    queryKey: key,
    enabled: configured && !!session && role === 'buyer',
    queryFn: async () => {
      const { data, error } = await db()
        .from('favorites')
        .select('product_id')
        .eq('user_id', session!.user.id)
        .eq('product_id', id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const mutate = useMutation({
    mutationFn: async () => {
      if (saved.data) {
        const { error } = await db()
          .from('favorites')
          .delete()
          .eq('user_id', session!.user.id)
          .eq('product_id', id);
        if (error) throw error;
      } else {
        const { error } = await db()
          .from('favorites')
          .insert({ user_id: session!.user.id, product_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: key });
      void cache.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
  return (
    <>
      <button
        className={`save-product ${saved.data ? 'saved' : ''}`}
        title={role && role !== 'buyer' ? tr('Available to buyer accounts') : t.save}
        aria-label={t.save}
        aria-pressed={!!saved.data}
        disabled={mutate.isPending || saved.isLoading || !!(role && role !== 'buyer')}
        onClick={() => (session ? mutate.mutate() : nav('/auth/login'))}
      >
        <Heart size={17} fill={saved.data ? 'currentColor' : 'none'} />
      </button>
      {mutate.error && <Notice error={mutate.error} />}
    </>
  );
}
export function ProductCard({ product: p }: { product: Listing }) {
  const tr = useT();
  const { locale, t } = useLocale();
  const name = locale === 'bn' && p.name_bn ? p.name_bn : p.name;
  const supplierName =
    locale === 'bn' && p.business?.name_bn ? p.business.name_bn : p.business?.name;
  const supplierInitial = supplierName?.match(/[\p{L}\p{N}]/u)?.[0];
  return (
    <article className="product-card wholesale-product-card" data-product-id={p.id}>
      <div className="product-image">
        <Link to={`/products/${p.id}`}>
          <ProductImage path={p.image?.path} alt={name} />
        </Link>
        <SaveProduct id={p.id} />
        <CompareButton id={p.id} compact />
        {p.stock === 0 && <span className="product-stock-label">{tr('Out of stock')}</span>}
      </div>
      <div className="product-info">
        <span className="product-category-label">
          {locale === 'bn' && p.category?.name_bn
            ? p.category.name_bn
            : (p.category?.name ?? t.products)}
        </span>
        <Link to={`/products/${p.id}`}>
          <h3>{name}</h3>
        </Link>
        <div className="price">
          {money(p.price, locale)}
          <span> / {formatUnit(p.unit, 1, locale)}</span>
        </div>
        <p className="moq">
          {t.moq}: <strong>{formatQuantity(p.moq, p.unit, locale)}</strong>
        </p>
        {!!p.priceTiers?.length && (
          <p className="quantity-pricing">
            <Layers3 size={13} aria-hidden="true" />
            {tr('Quantity pricing available')}
          </p>
        )}
      </div>
      <div className="product-card-footer">
        {supplierInitial && (
          <span className="product-supplier-avatar" aria-hidden="true">
            {supplierInitial}
          </span>
        )}
        <div className="product-supplier">
          <div className="product-supplier-name">
            {p.business && (
              <Link to={`/suppliers/${p.business.id}`} title={supplierName}>
                <span className="product-supplier-label">{supplierName}</span>
              </Link>
            )}
            {p.business?.verified && (
              <span className="product-verified" title={t.verifiedBadge}>
                <ShieldCheck size={14} aria-hidden="true" />
                <span className="sr-only">{t.verifiedBadge}</span>
              </span>
            )}
          </div>
          {p.business?.district && (
            <small>
              <MapPin size={11} aria-hidden="true" />
              {tr(p.business.district)}
            </small>
          )}
        </div>
        <ChatButton business={p.business_id} product={p.id} iconOnly />
      </div>
    </article>
  );
}
