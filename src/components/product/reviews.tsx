import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Star } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { Field, Notice } from '../shared';
import { Button } from '../ui/button';
export const publicReview = z.object({
  id: z.uuid(),
  rating: z.number(),
  body: z.string(),
  buyer_name: z.string(),
  created_at: z.string(),
  purchase_kind: z.string(),
  supplier_reply: z.string().nullable(),
});
export const myReview = z.object({
  review: z
    .object({
      id: z.uuid(),
      order_id: z.uuid(),
      rating: z.number(),
      body: z.string(),
      status: z.string(),
      version: z.number(),
    })
    .nullable(),
  orders: z.array(z.object({ id: z.uuid(), number: z.number(), purchase_kind: z.string() })),
});
export function ProductReviews({ id }: { id: string }) {
  const tr = useT();
  const { locale } = useLocale();
  const { session, role } = useAuth();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [reportId, setReportId] = useState('');
  const [reason, setReason] = useState('');
  const reviews = useQuery({
    queryKey: ['product-reviews', id, page],
    queryFn: async () => {
      const { data, error } = await db().rpc('product_reviews_read', {
        target: id,
        page,
        page_size: 25,
      });
      if (error) throw error;
      return z
        .object({
          total: z.number(),
          rating: z.number().nullable(),
          count: z.number(),
          sample_count: z.number(),
          rows: z.array(publicReview),
        })
        .parse(data);
    },
  });
  const mine = useQuery({
    queryKey: ['my-product-review', id, session?.user.id],
    enabled: !!session && role === 'buyer',
    queryFn: async () => {
      const { data, error } = await db().rpc('my_product_review', { target: id });
      if (error) throw error;
      return myReview.parse(data);
    },
  });
  const report = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('review_report', {
        target: reportId,
        reason: z.string().trim().min(10).max(2000).parse(reason),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReportId('');
      setReason('');
    },
  });
  return (
    <section className="pd-section pd-reviews" id="reviews">
      <h2>{tr('Verified-purchase reviews')}</h2>
      {reviews.isPending ? (
        <p aria-busy="true">{tr('Loading reviews…')}</p>
      ) : reviews.error ? (
        <>
          <Notice error={reviews.error} />
          <Button onClick={() => void reviews.refetch()}>{tr('Try again')}</Button>
        </>
      ) : (
        <>
          <div className="pd-rating-summary">
            <Star size={24} />
            <strong>{reviews.data!.rating ?? '—'}</strong>
            <span>
              {reviews.data!.count} {tr('wholesale / custom reviews')} ·{' '}
              {reviews.data!.sample_count} {tr('sample reviews')}
            </span>
          </div>
          {!reviews.data!.total && (
            <p>{tr('No published reviews yet. Ratings come from completed purchases.')}</p>
          )}
          {reviews.data!.rows.map((r) => (
            <article key={r.id} className="pd-review">
              <div>
                <strong>{r.buyer_name}</strong>
                <span aria-label={`${r.rating} / 5`}>
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </span>
              </div>
              <small>
                {tr(r.purchase_kind === 'sample' ? 'Sample purchase' : 'Verified purchase')} ·{' '}
                {new Date(r.created_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-BD')}
              </small>
              <p className="preserve-lines">{r.body}</p>
              {r.supplier_reply && (
                <blockquote>
                  <strong>{tr('Supplier reply')}</strong>
                  <p>{r.supplier_reply}</p>
                </blockquote>
              )}
              {session && <button onClick={() => setReportId(r.id)}>{tr('Report review')}</button>}
            </article>
          ))}
          {reviews.data!.total > 25 && (
            <div className="pd-pagination">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                {tr('Previous')}
              </Button>
              <span>{page}</span>
              <Button
                variant="outline"
                disabled={page * 25 >= reviews.data!.total}
                onClick={() => setPage(page + 1)}
              >
                {tr('Next')}
              </Button>
            </div>
          )}
        </>
      )}
      {reportId && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            report.mutate();
          }}
        >
          <Field label={tr('Report reason')}>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Notice error={report.error} />
          <Button disabled={report.isPending}>{tr('Submit report')}</Button>
          <Button type="button" variant="outline" onClick={() => setReportId('')}>
            {tr('Cancel')}
          </Button>
        </form>
      )}
      {mine.data && (mine.data.orders.length > 0 || mine.data.review) && (
        <ReviewForm
          key={`${id}-${mine.data.review?.version ?? 0}`}
          id={id}
          data={mine.data}
          done={() => {
            void cache.invalidateQueries({ queryKey: ['my-product-review', id] });
            void cache.invalidateQueries({ queryKey: ['product-reviews', id] });
          }}
        />
      )}
      <Notice error={mine.error} />
    </section>
  );
}
function ReviewForm({
  id,
  data,
  done,
}: {
  id: string;
  data: z.infer<typeof myReview>;
  done: () => void;
}) {
  const tr = useT();
  const [body, setBody] = useState(data.review?.body ?? '');
  const [rating, setRating] = useState(data.review?.rating ?? 5);
  const [order, setOrder] = useState(data.review?.order_id ?? data.orders[0]?.id ?? '');
  const save = useMutation({
    mutationFn: async () => {
      z.object({
        body: z.string().trim().min(10).max(3000),
        rating: z.number().int().min(1).max(5),
        order: z.uuid(),
      }).parse({ body, rating, order });
      const { error } = await db().rpc('review_save', {
        product: id,
        order_ref: order,
        rating,
        body,
        expected_version: data.review?.version ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: done,
  });
  const withdraw = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('review_withdraw', {
        target: data.review!.id,
        expected_version: data.review!.version,
      });
      if (error) throw error;
    },
    onSuccess: done,
  });
  return (
    <form
      className="form-stack pd-review-form"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h3>{tr(data.review ? 'Edit your review' : 'Review your purchase')}</h3>
      <p>
        {tr('Reviews and edits are checked before publication.')}
        {data.review && ` · ${tr(data.review.status)}`}
      </p>
      {!!data.orders.length && (
        <Field label={tr('Completed order')}>
          <select value={order} disabled={!!data.review} onChange={(e) => setOrder(e.target.value)}>
            {data.orders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.number} · {tr(o.purchase_kind)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={tr('Rating')}>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr('Your review')}>
        <textarea
          required
          minLength={10}
          maxLength={3000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <Button disabled={save.isPending || !data.orders.length}>
        {tr('Submit for moderation')}
      </Button>
      {data.review && data.review.status !== 'withdrawn' && (
        <Button
          type="button"
          variant="outline"
          disabled={withdraw.isPending}
          onClick={() => withdraw.mutate()}
        >
          {tr('Withdraw review')}
        </Button>
      )}
      <Notice error={save.error ?? withdraw.error} />
    </form>
  );
}
