import { useT } from '@/lib/i18n';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, ShieldCheck, Package } from 'lucide-react';
import { signedImage, type Listing } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { db, configured } from '@/lib/supabase';
import { money } from '@/lib/utils';
import { Notice } from './shared';
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
  const image = useQuery({
    queryKey: ['image', path],
    enabled: !!path,
    queryFn: () => signedImage(path!),
    staleTime: 240000,
  });
  return path && image.data ? (
    <img className={className} src={image.data} alt={alt} loading="lazy" />
  ) : (
    <div className={`image-placeholder ${className}`} aria-label={alt}>
      <Package size={40} strokeWidth={1} />
      <span>{tr(image.isError ? 'Image unavailable' : 'Product image')}</span>
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
        disabled={mutate.isPending || !!(role && role !== 'buyer')}
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
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/products/${p.id}`}>
          <ProductImage path={p.image?.path} alt={p.name} />
        </Link>
        <SaveProduct id={p.id} />
        {p.business?.verified && (
          <span className="image-badge">
            <ShieldCheck size={11} />
            {tr('Verified')}
          </span>
        )}
      </div>
      <div className="product-info">
        <span className="product-category">
          {locale === 'bn' ? p.category?.name_bn : p.category?.name}
        </span>
        <Link to={`/products/${p.id}`}>
          <h3>{locale === 'bn' && p.name_bn ? p.name_bn : p.name}</h3>
        </Link>
        <div className="price">
          {money(p.price, locale)}
          <span> / {p.unit}</span>
        </div>
        <p className="moq">
          {t.moq}:{' '}
          <strong>
            {p.moq} {p.unit}
            {'s'}
          </strong>
        </p>
        <div className="product-supplier">
          <span>{p.business?.name}</span>
          <small>
            <MapPin size={11} />
            {p.business?.district}
          </small>
        </div>
      </div>
    </article>
  );
}
