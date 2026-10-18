import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { growthDb } from '@/lib/growth';
import { downloadCsv } from '@/lib/csv';
import { useT, useLocale } from '@/lib/i18n';
import { money } from '@/lib/utils';
import { Field, Notice, SectionTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
const reportRow = z.object({
  id: z.uuid(),
  number: z.number(),
  created_at: z.string(),
  supplier_name: z.string(),
  status: z.string(),
  payment_method: z.string(),
  payment_status: z.string(),
  subtotal: z.number(),
  shipping_fee: z.number(),
  total: z.number(),
  confirmed_payments: z.number(),
  confirmed_refunds: z.number(),
});
export default function FinancialReports() {
  const tr = useT();
  const { locale } = useLocale();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const [from, setFrom] = useState(today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [range, setRange] = useState({ from, to });
  const report = useMutation({
    mutationFn: async () => {
      const { data, error } = await growthDb().rpc('admin_financial_report', {
        from_date: from,
        to_date: to,
      });
      if (error) throw error;
      setRange({ from, to });
      return z.object({ rows: z.array(reportRow) }).parse(data);
    },
  });
  const rows = report.data?.rows ?? [];
  const fields = [
    'number',
    'created_at',
    'supplier_name',
    'status',
    'payment_method',
    'payment_status',
    'subtotal',
    'shipping_fee',
    'total',
    'confirmed_payments',
    'confirmed_refunds',
  ] as const;
  return (
    <div className="financial-report">
      <SectionTitle
        heading="h1"
        title={tr('Financial reconciliation')}
        description={tr(
          'Order totals and manually confirmed external payments. This is not an escrow balance or bank statement.',
        )}
      />
      <form
        className="form-grid no-print"
        onSubmit={(e) => {
          e.preventDefault();
          report.mutate();
        }}
      >
        <Field label={tr('From date')}>
          <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={tr('To date')}>
          <input type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Button disabled={report.isPending}>{tr('Generate report')}</Button>
      </form>
      <Notice error={report.error} />
      {report.data && (
        <>
          <p>
            {range.from}–{range.to} · {tr('Bangladesh time')} · {rows.length} {tr('orders')}
          </p>
          <dl className="pd-delivery-facts">
            {(['total', 'confirmed_payments', 'confirmed_refunds'] as const).map((field) => (
              <div key={field}>
                <dt>{tr(field)}</dt>
                <dd>
                  {money(
                    rows.reduce((sum, row) => sum + row[field], 0),
                    locale,
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="pd-request-buttons no-print">
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(`financial-${range.from}-${range.to}.csv`, [
                  [...fields],
                  ...rows.map((row) => fields.map((field) => row[field])),
                ])
              }
            >
              {tr('Download CSV')}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              {tr('Print / save PDF')}
            </Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {fields.map((field) => (
                    <th key={field}>{tr(field)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {fields.map((field) => (
                      <td key={field}>
                        {typeof row[field] === 'number' && field !== 'number'
                          ? money(row[field] as number, locale)
                          : String(row[field])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
