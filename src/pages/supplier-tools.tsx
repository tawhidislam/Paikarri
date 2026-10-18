import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { categories } from '@/lib/catalog';
import { growthDb } from '@/lib/growth';
import { downloadCsv, productColumns, validateProductCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Notice, SectionTitle } from '@/components/shared';
export default function SupplierTools() {
  const tr = useT();
  const { session } = useAuth();
  const cache = useQueryClient();
  const cats = useQuery({ queryKey: ['categories'], queryFn: categories });
  const [rows, setRows] = useState<ReturnType<typeof validateProductCsv>>([]);
  const [error, setError] = useState<unknown>();
  const performance = useQuery({
    queryKey: ['supplier-performance', session?.user.id],
    queryFn: async () => {
      const { data, error } = await growthDb().rpc('supplier_performance');
      if (error) throw error;
      return z
        .object({
          inquiries: z.number(),
          responded: z.number(),
          responded_within_two_hours: z.number(),
          orders: z.number(),
          completed: z.number(),
          average_delivery_days: z.number().nullable(),
        })
        .parse(data);
    },
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!rows.length || rows.some((r) => r.error))
        throw new Error('Correct all CSV errors first.');
      const { data, error } = await growthDb().rpc('supplier_bulk_products', {
        payload: rows.map((r) => r.product!),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setRows([]);
      return cache.invalidateQueries({ queryKey: ['own-products'] });
    },
  });
  const exportProducts = useMutation({
    mutationFn: async () => {
      const business = await db()
        .from('businesses')
        .select('id')
        .eq('owner_id', session!.user.id)
        .single();
      if (business.error) throw business.error;
      const { data, error, count } = await db()
        .from('products')
        .select('*', { count: 'exact' })
        .eq('business_id', business.data.id)
        .order('created_at')
        .limit(500);
      if (error) throw error;
      if ((count ?? 0) > 500)
        throw new Error(
          'This export supports up to 500 products. Contact support for a complete larger catalog export.',
        );
      const tiers = await db()
        .from('product_price_tiers')
        .select('*')
        .in(
          'product_id',
          data.map((p) => p.id),
        );
      if (tiers.error) throw tiers.error;
      downloadCsv('supplier-products.csv', [
        [...productColumns],
        ...data.map((p) => [
          p.name,
          p.name_bn,
          p.description,
          cats.data?.find((c) => c.id === p.category_id)?.slug ?? '',
          p.price,
          p.moq,
          p.stock,
          p.unit,
          JSON.stringify(p.specifications),
          JSON.stringify(
            tiers.data
              .filter((t) => t.product_id === p.id)
              .map((t) => ({ min_quantity: t.min_quantity, price: t.price })),
          ),
        ]),
      ]);
    },
  });
  return (
    <div className="growth-tools">
      <SectionTitle
        heading="h1"
        title={tr('Supplier tools')}
        description={tr(
          'Import up to 100 products per CSV. Every listing still requires moderation.',
        )}
      />
      <section className="panel growth-panel">
        <h2>{tr('Operational performance')}</h2>
        <Notice error={performance.error} />
        {performance.data && (
          <dl className="pd-delivery-facts">
            {Object.entries(performance.data).map(([label, value]) => (
              <div key={label}>
                <dt>{tr(label)}</dt>
                <dd>{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        )}
        <p>
          {tr(
            'Response and completion counts are based on actual marketplace records; no performance badge is awarded automatically.',
          )}
        </p>
      </section>
      <section className="panel growth-panel">
        <h2>{tr('Bulk product import')}</h2>
        <p>
          {tr(
            'UTF-8 CSV, maximum 2 MB. Category slugs must match the downloadable reference. No images are imported; add them in the product editor.',
          )}
        </p>
        <div className="pd-request-buttons">
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv('product-template.csv', [
                [...productColumns],
                [
                  'Example product',
                  '',
                  'Describe the real product here',
                  cats.data?.[0]?.slug ?? '',
                  100,
                  10,
                  100,
                  'piece',
                  '{}',
                  '[]',
                ],
              ])
            }
          >
            {tr('Download template')}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv('category-reference.csv', [
                ['slug', 'name', 'name_bn'],
                ...(cats.data ?? []).map((c) => [c.slug, c.name, c.name_bn]),
              ])
            }
          >
            {tr('Category reference')}
          </Button>
          <Button
            variant="outline"
            disabled={exportProducts.isPending || !cats.data}
            onClick={() => exportProducts.mutate()}
          >
            {tr('Export products')}
          </Button>
        </div>
        <label className="field">
          <span>{tr('CSV file')}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={!cats.data || upload.isPending}
            onChange={async (e) => {
              try {
                setError(undefined);
                setRows([]);
                upload.reset();
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2097152) throw new Error('CSV must be at most 2 MB.');
                setRows(validateProductCsv(await file.text(), cats.data ?? []));
              } catch (error) {
                setError(error);
              }
            }}
          />
        </label>
        <Notice
          error={error ?? upload.error ?? exportProducts.error ?? cats.error}
          success={upload.isSuccess ? tr('Products imported for review') : undefined}
        />
        {rows.length > 0 && (
          <>
            <p>
              {rows.filter((r) => !r.error).length} / {rows.length} {tr('valid rows')}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tr('Row')}</th>
                    <th>{tr('Product')}</th>
                    <th>{tr('Validation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.product?.name ?? '—'}</td>
                      <td>{r.error ?? tr('Ready')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              disabled={upload.isPending || rows.some((r) => r.error)}
              onClick={() => upload.mutate()}
            >
              {tr('Import validated products')}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
