import { useT } from '@/lib/i18n';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import type { Product, Category } from '@/lib/models';
import { Notice, Field } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ActionDialog } from '@/pages/admin/console';
export function ReviewProduct({
  product,
  onSuccess,
}: {
  product: Product;
  onSuccess: () => Promise<unknown>;
}) {
  const tr = useT();
  const [note, setNote] = useState(product.moderation_note);
  const action = useMutation({
    mutationFn: async (decision: string) => {
      const { error } = await db().rpc('moderate_product', { target: product.id, decision, note });
      if (error) throw error;
    },
    onSuccess,
  });
  return (
    <div className="review-controls">
      <Field label={tr('Review note')}>
        <textarea
          rows={4}
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          placeholder={tr('Explain required changes or your decision\u2026')}
        />
      </Field>
      <p className="review-note-help">{tr('A review note is required for every decision.')}</p>
      <div className="review-decision-actions">
        {['approved', 'rejected', 'archived'].map((decision) => (
          <ActionDialog
            key={decision}
            label={
              decision === 'approved' ? 'Approve' : decision === 'rejected' ? 'Reject' : 'Archive'
            }
            requireReason={false}
            disabled={action.isPending}
            description={note || tr('Confirm this moderation decision.')}
            onConfirm={async () => {
              if (!note.trim()) throw new Error('Review note is required.');
              await action.mutateAsync(decision);
            }}
          />
        ))}
      </div>
      <Notice
        error={action.error}
        success={action.isSuccess ? tr('Listing decision saved.') : undefined}
      />
    </div>
  );
}

export function CategoryForm({
  category,
  categories,
  onSuccess,
}: {
  category?: Category;
  categories: Category[];
  onSuccess: () => Promise<void>;
}) {
  const tr = useT();
  const [name, setName] = useState(category?.name ?? '');
  const [bn, setBn] = useState(category?.name_bn ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [parent, setParent] = useState(category?.parent_id ?? '');
  const save = useMutation({
    mutationFn: async () => {
      const v = z
        .object({
          name: z.string().min(2).max(100),
          name_bn: z.string().min(2).max(100),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          parent_id: z.uuid().nullable(),
        })
        .parse({ name, name_bn: bn, slug, parent_id: parent || null });
      const res = category
        ? await db().from('categories').update(v).eq('id', category.id)
        : await db().from('categories').insert(v);
      if (res.error) throw res.error;
    },
    onSuccess,
  });
  return (
    <form
      className="panel form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h3>{tr(category ? 'Edit category' : 'Add category')}</h3>
      <div className="form-grid">
        <Field label={tr('English name')}>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={tr('\u09AC\u09BE\u0982\u09B2\u09BE \u09A8\u09BE\u09AE')}>
          <input required value={bn} onChange={(e) => setBn(e.target.value)} />
        </Field>
        <Field label={tr('URL slug')}>
          <input
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>
        <Field label={tr('Parent category')}>
          <select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">{tr('Top level')}</option>
            {categories
              .filter((c) => c.id !== category?.id && !c.parent_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <Notice error={save.error} />
      <Button disabled={save.isPending}>
        {tr(category ? 'Update category' : 'Create category')}
      </Button>
    </form>
  );
}
