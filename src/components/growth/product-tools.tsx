import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/supabase';
import { hydrate, type Listing } from '@/lib/catalog';
import { useLocale, useT } from '@/lib/i18n';
import { Button } from '../ui/button';
import { money } from '@/lib/utils';
const key = 'paikarii-recent-products';
export function ProductTools({ product }: { product: Listing }) {
  const tr = useT();
  const { locale } = useLocale();
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
      const clean = (Array.isArray(raw) ? raw : []).filter(
        (id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id),
      );
      const next = [product.id, ...clean.filter((id) => id !== product.id)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
      setIds(next.filter((id) => id !== product.id));
    } catch {
      setIds([]);
    }
  }, [product.id]);
  const recent = useQuery({
    queryKey: ['recent-public-products', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await db().rpc('public_products').in('id', ids).limit(12);
      if (error) throw error;
      return hydrate(data);
    },
  });
  const download = () => {
    const safe = JSON.stringify(
      {
        name: product.name,
        name_bn: product.name_bn,
        unit: product.unit,
        moq: product.moq,
        specifications: product.specifications,
        supplier: product.business?.name,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([safe], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `product-${product.id}-specifications.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="pd-section">
      <Button variant="outline" onClick={download}>
        {tr('Download specifications')}
      </Button>
      {recent.data?.length ? (
        <>
          <h2>{tr('Recently viewed')}</h2>
          <div className="recent-product-dock">
            {ids
              .flatMap((id) => recent.data.filter((p) => p.id === id))
              .slice(0, 4)
              .map((p) => (
                <Link key={p.id} to={`/products/${p.id}`}>
                  <strong>{locale === 'bn' && p.name_bn ? p.name_bn : p.name}</strong>
                  <span>{money(p.price, locale)}</span>
                </Link>
              ))}
            <Link to="/compare">{tr('Compare products')}</Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
