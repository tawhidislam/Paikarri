import { LocalPagination } from '@/components/supplier-warning';
import { useT } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { participantContext } from '@/lib/admin-api';
import { useAuth } from '@/lib/auth';
import { hydrate, businesses } from '@/lib/catalog';
import { money } from '@/lib/utils';
import { ProductCard } from '@/components/product-card';
import { SupplierCard } from './home';
import { State, SectionTitle, Notice, Field, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
export function Favorites() {
  const tr = useT();
  const { session } = useAuth();
  useTitle('Saved products');
  const items = useQuery({
    queryKey: ['favorites', session!.user.id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('favorites')
        .select('product_id')
        .eq('user_id', session!.user.id);
      if (error) throw error;
      if (!data.length) return [];
      const result = await db()
        .from('products')
        .select('*')
        .in(
          'id',
          data.map((f) => f.product_id),
        )
        .eq('status', 'approved');
      if (result.error) throw result.error;
      return hydrate(result.data);
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Your next-business shortlist.')}
        description={tr('Save products, compare your options, and connect when you’re ready.')}
      />
      <Notice error={items.error} />
      {items.isLoading ? (
        <State title={tr('Loading saved products…')} />
      ) : items.data?.length ? (
        <div className="product-grid listing-grid">
          {items.data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <State
          title={tr('Start your shortlist.')}
          description={tr('Your saved products will appear here. Unpublished listings are hidden.')}
          action={<Link to="/products">{tr('Explore products')} ↗</Link>}
        />
      )}
    </>
  );
}
export function SavedSuppliers() {
  const tr = useT();
  const { session } = useAuth();
  useTitle('Saved suppliers');
  const saved = useQuery({
    queryKey: ['saved-suppliers', session!.user.id],
    queryFn: async () => {
      const [s, b] = await Promise.all([
        db().from('saved_suppliers').select('business_id').eq('user_id', session!.user.id),
        businesses(),
      ]);
      if (s.error) throw s.error;
      return b.filter((b) => s.data.some((s) => s.business_id === b.id));
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Your business connections.')}
        description={tr('Keep the suppliers you want to work with close at hand.')}
      />
      <Notice error={saved.error} />
      {saved.isLoading ? (
        <State title={tr('Loading suppliers…')} />
      ) : saved.data?.length ? (
        <div className="supplier-grid dashboard-suppliers">
          {saved.data.map((b) => (
            <SupplierCard key={b.id} business={b} />
          ))}
        </div>
      ) : (
        <State
          title={tr('No suppliers saved yet')}
          action={<Link to="/suppliers">{tr('Find your supplier')} ↗</Link>}
        />
      )}
    </>
  );
}
export function Quotations() {
  const tr = useT();
  const { session, role } = useAuth();
  const cache = useQueryClient();
  useTitle('Quotations');
  const [page, setPage] = useState(1);
  const [reply, setReply] = useState<string>();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const list = useQuery({
    queryKey: ['quotations', session!.user.id, page],
    queryFn: async () => {
      const { data, error, count } = await db()
        .from('quotation_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range((page - 1) * 25, page * 25 - 1);
      if (error) throw error;
      const [p, r] = await Promise.all([
        participantContext(),
        data.length
          ? db()
              .from('quotation_responses')
              .select('*')
              .in(
                'request_id',
                data.map((q) => q.id),
              )
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (r.error) throw r.error;
      return {
        total: count ?? data.length,
        rows: data.map((q) => ({
          ...q,
          product: p.products.find((p) => p.id === q.product_id),
          response: r.data.find((r) => r.request_id === q.id),
        })),
      };
    },
  });
  const send = useMutation({
    mutationFn: async () => {
      const v = z
        .object({
          price: z.number().positive(),
          message: z.string().min(5).max(3000),
          request_id: z.uuid(),
        })
        .parse({ price: Number(price), message, request_id: reply });
      const { error } = await db().from('quotation_responses').insert(v);
      if (error) throw error;
    },
    onSuccess: () => {
      setReply(undefined);
      setMessage('');
      setPrice('');
      return cache.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
  return (
    <>
      <Link to="/dashboard/requests">{tr('Sourcing requests')} →</Link>
      <SectionTitle
        title={tr(
          role === 'supplier' ? 'New inquiries. New possibilities.' : 'Your quotation requests.',
        )}
        description={tr(
          role === 'supplier'
            ? 'Respond with your best wholesale offer and start a conversation.'
            : 'Keep track of your requirements and supplier responses.',
        )}
      />
      <Notice error={list.error ?? send.error} />
      {list.isLoading ? (
        <State title={tr('Loading quotations…')} />
      ) : list.data?.rows.length ? (
        list.data.rows.map((q) => (
          <article className="panel quote-card" key={q.id}>
            <div className="quote-card-header">
              <div>
                <span className="eyebrow">
                  {new Date(q.created_at).toLocaleDateString('en-BD')}
                </span>
                <h3>{q.product?.name ?? tr('Product no longer public')}</h3>
              </div>
              <span className={`status-badge ${q.response ? 'approved' : 'pending'}`}>
                {tr(q.response ? 'Responded' : 'Awaiting response')}
              </span>
            </div>
            <p>
              <strong>{tr('Quantity')}:</strong> {q.quantity}
            </p>
            <p className="preserve-lines">{q.message}</p>
            {q.response ? (
              <div className="quote-response">
                <span className="eyebrow">{tr('SUPPLIER RESPONSE')}</span>
                <h3>
                  {money(q.response.price)} / {tr('Unit')}
                </h3>
                <p className="preserve-lines">{q.response.message}</p>
              </div>
            ) : (
              role === 'supplier' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReply(reply === q.id ? undefined : q.id)}
                >
                  {tr('Respond to inquiry')}
                </Button>
              )
            )}
            {reply === q.id && (
              <form
                className="form-stack quote-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  send.mutate();
                }}
              >
                <Field label={tr('Quoted unit price (৳)')}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
                <Field label={tr('Your offer & delivery terms')}>
                  <textarea
                    minLength={5}
                    maxLength={3000}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </Field>
                <Button disabled={send.isPending}>{tr('Send response')}</Button>
              </form>
            )}
          </article>
        ))
      ) : (
        <State
          title={tr('No quotations yet')}
          description={tr(
            role === 'supplier'
              ? 'Buyer quotation requests will appear here.'
              : 'Request a quotation from any product page.',
          )}
          action={role === 'buyer' && <Link to="/products">{tr('Explore products')} ↗</Link>}
        />
      )}
      {list.data && <LocalPagination page={page} setPage={setPage} total={list.data.total} />}
    </>
  );
}
