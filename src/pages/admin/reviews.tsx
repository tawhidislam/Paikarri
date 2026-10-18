import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field, Notice, State } from '@/components/shared';
import '../product.css';
const row = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  product_name: z.string(),
  buyer_name: z.string(),
  rating: z.number(),
  body: z.string(),
  status: z.string(),
  version: z.number(),
  eligible: z.boolean(),
  purchase_kind: z.string(),
  reply: z.object({ body: z.string(), status: z.string(), version: z.number() }).nullable(),
  reports: z.array(z.object({ id: z.uuid(), reason: z.string(), status: z.string() })),
});
export default function ReviewModeration() {
  const tr = useT();
  const [page, setPage] = useState(1);
  const [state, setState] = useState('pending');
  const list = useQuery({
    queryKey: ['admin-reviews', page, state],
    queryFn: async () => {
      const { data, error } = await db().rpc('admin_reviews', { page, page_size: 25, state });
      if (error) throw error;
      return z.object({ total: z.number(), rows: z.array(row) }).parse(data);
    },
  });
  return (
    <div className="pd-page">
      <h1>{tr('Review moderation')}</h1>
      <p>{tr('Review eligibility is checked without sharing private order details.')}</p>
      <Field label={tr('Status')}>
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
        >
          {['pending', 'approved', 'rejected', 'hidden', 'withdrawn', ''].map((v) => (
            <option key={v} value={v}>
              {tr(v || 'All')}
            </option>
          ))}
        </select>
      </Field>
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : list.error ? (
        <>
          <Notice error={list.error} />
          <Button onClick={() => void list.refetch()}>{tr('Try again')}</Button>
        </>
      ) : (
        <>
          {!list.data?.rows.length && <State title={tr('No reviews to display')} />}{' '}
          {list.data?.rows.map((r) => (
            <ModerationRow key={`${r.id}-${r.version}-${r.reply?.version}`} value={r} />
          ))}
          <div className="pd-pagination">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              {tr('Previous')}
            </Button>
            <span>{page}</span>
            <Button
              variant="outline"
              disabled={page * 25 >= (list.data?.total ?? 0)}
              onClick={() => setPage(page + 1)}
            >
              {tr('Next')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function ModerationRow({ value: r }: { value: z.infer<typeof row> }) {
  const tr = useT();
  const cache = useQueryClient();
  const [reason, setReason] = useState('');
  const action = useMutation({
    mutationFn: async ({
      kind,
      decision,
      version,
    }: {
      kind: string;
      decision: string;
      version: number;
    }) => {
      const { error } = await db().rpc('admin_review_decide', {
        target: r.id,
        kind,
        decision,
        expected_version: version,
        reason: z.string().trim().min(10).max(2000).parse(reason),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['admin-reviews'] });
      void cache.invalidateQueries({ queryKey: ['product-reviews'] });
    },
  });
  return (
    <section className="pd-section">
      <h2>{r.product_name}</h2>
      <p>
        {r.buyer_name} · {r.rating}/5 ·{' '}
        {tr(r.purchase_kind === 'sample' ? 'Sample purchase' : 'Verified purchase')} ·{' '}
        {tr(r.eligible ? 'Eligible completed purchase' : 'Currently ineligible')}
      </p>
      <p className="preserve-lines">{r.body}</p>
      <small>{tr(r.status)}</small>
      <Field label={tr('Decision reason')}>
        <textarea
          minLength={10}
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <div className="pd-request-buttons">
        {['approved', 'rejected', 'hidden'].map((decision) => (
          <Button
            key={decision}
            variant="outline"
            disabled={
              action.isPending ||
              (decision === 'approved' && !r.eligible) ||
              r.status === 'withdrawn'
            }
            onClick={() => action.mutate({ kind: 'review', decision, version: r.version })}
          >
            {tr(decision)}
          </Button>
        ))}
      </div>
      {r.reply && (
        <>
          <h3>{tr('Supplier reply')}</h3>
          <p>{r.reply.body}</p>
          <small>{tr(r.reply.status)}</small>
          <div className="pd-request-buttons">
            {['approved', 'rejected', 'hidden'].map((decision) => (
              <Button
                key={decision}
                variant="outline"
                disabled={action.isPending || (decision === 'approved' && !r.eligible)}
                onClick={() =>
                  action.mutate({ kind: 'reply', decision, version: r.reply!.version })
                }
              >
                {tr(decision)}
              </Button>
            ))}
          </div>
        </>
      )}
      {!!r.reports.length && (
        <>
          <h3>{tr('Review reports')}</h3>
          {r.reports.map((report) => (
            <p key={report.id}>
              {report.reason} · {tr(report.status)}
            </p>
          ))}
          <div className="pd-request-buttons">
            {['resolved', 'dismissed'].map((decision) => (
              <Button
                key={decision}
                disabled={action.isPending}
                variant="outline"
                onClick={() => action.mutate({ kind: 'reports', decision, version: r.version })}
              >
                {tr(decision)}
              </Button>
            ))}
          </div>
        </>
      )}
      <Notice error={action.error} />
    </section>
  );
}
export function SupplierReviewReplies() {
  const { session } = useAuth();
  const tr = useT();
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['supplier-reviews', session?.user.id, page],
    queryFn: async () => {
      const { data, error } = await db().rpc('supplier_reviews', { page });
      if (error) throw error;
      return z
        .object({
          total: z.number(),
          rows: z.array(
            z.object({
              id: z.uuid(),
              body: z.string(),
              rating: z.number(),
              status: z.string(),
              product_name: z.string(),
              reply: z
                .object({ body: z.string(), status: z.string(), version: z.number() })
                .nullable(),
            }),
          ),
        })
        .parse(data);
    },
  });
  return (
    <div className="pd-page">
      <h1>{tr('Customer reviews')}</h1>
      {list.isPending ? (
        <State title={tr('Loading…')} />
      ) : list.error ? (
        <Notice error={list.error} />
      ) : (
        <>
          {!list.data?.rows.length && <State title={tr('No published reviews yet.')} />}{' '}
          {list.data?.rows.map((r) => (
            <ReplyEditor key={`${r.id}-${r.reply?.version}`} value={r} />
          ))}
          <div className="pd-pagination">
            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
              {tr('Previous')}
            </Button>
            <span>{page}</span>
            <Button
              disabled={page * 25 >= (list.data?.total ?? 0)}
              onClick={() => setPage(page + 1)}
            >
              {tr('Next')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function ReplyEditor({
  value: r,
}: {
  value: {
    id: string;
    body: string;
    rating: number;
    product_name: string;
    reply: { body: string; status: string; version: number } | null;
  };
}) {
  const tr = useT();
  const cache = useQueryClient();
  const [body, setBody] = useState(r.reply?.body ?? '');
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('review_reply', {
        target: r.id,
        expected_version: r.reply?.version ?? 0,
        body: z.string().trim().min(10).max(3000).parse(body),
      });
      if (error) throw error;
    },
    onSuccess: () => void cache.invalidateQueries({ queryKey: ['supplier-reviews'] }),
  });
  return (
    <section className="pd-section">
      <h2>
        {r.product_name} · {r.rating}/5
      </h2>
      <p>{r.body}</p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label={tr('Supplier reply')}>
          <textarea
            required
            minLength={10}
            maxLength={3000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        {r.reply && <small>{tr(r.reply.status)}</small>}
        <Button disabled={save.isPending}>{tr('Submit for moderation')}</Button>
        <Notice error={save.error} />
      </form>
    </section>
  );
}
