import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/supabase';
import { termsSchema, termsStateSchema, validateTerms, type TermsContent } from '@/lib/terms';
import { useT, useLocale } from '@/lib/i18n';
import { adminDate } from '@/lib/admin-api';
import { SectionTitle, Notice, State, Field } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { TermsDocument } from '@/components/terms-document';
import { ActionDialog } from './console';
import type { z } from 'zod';
import { policyConfig, type PolicyKind } from '@/lib/policy-config';

export default function TermsEditor({ kind = 'terms' }: { kind?: PolicyKind }) {
  const policy = policyConfig(kind);
  const tr = useT();
  const state = useQuery({
    queryKey: [`${kind}-admin`],
    queryFn: async () => {
      const { data, error } = await db().rpc(
        kind === 'refund' ? 'admin_refund_state' : 'admin_terms_state',
      );
      if (error) throw error;
      return termsStateSchema.parse(data);
    },
  });
  return (
    <div className="terms-editor">
      <SectionTitle
        title={tr(policy.title)}
        description={tr(
          'Edit privately in English and Bangla. Only a published revision appears on the public page.',
        )}
      />
      <Notice error={state.error} />
      {state.data ? (
        <TermsForm key={`${kind}-${state.data.revision}`} state={state.data} kind={kind} />
      ) : state.isError ? (
        <Button onClick={() => void state.refetch()}>{tr('Try again')}</Button>
      ) : (
        <State title={tr('Loading…')} />
      )}
    </div>
  );
}
function TermsForm({ state, kind }: { state: z.infer<typeof termsStateSchema>; kind: PolicyKind }) {
  const policy = policyConfig(kind);
  const tr = useT();
  const { locale } = useLocale();
  const cache = useQueryClient();
  const parsed = termsSchema.safeParse(state.draft);
  const saved = parsed.success ? parsed.data : policy.defaultContent;
  const [form, setForm] = useState<TermsContent>(saved);
  const [preview, setPreview] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<'en' | 'bn'>(locale);
  const dirty = !parsed.success || JSON.stringify(form) !== JSON.stringify(saved);
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: [`${kind}-admin`] }),
      cache.invalidateQueries({ queryKey: [`${kind}-published`] }),
    ]);
  };
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc(
        kind === 'refund' ? 'admin_save_refund' : 'admin_save_terms',
        {
          config: validateTerms(form),
          expected_revision: state.revision,
        },
      );
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const publish = useMutation({
    mutationFn: async () => {
      if (dirty) throw new Error('Save your draft before publishing.');
      validateTerms(form, true);
      const { error } = await db().rpc(
        kind === 'refund' ? 'admin_publish_refund' : 'admin_publish_terms',
        {
          expected_revision: state.revision,
        },
      );
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const updateSection = (
    index: number,
    key: keyof TermsContent['sections'][number],
    value: string,
  ) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));
  const move = (index: number, direction: number) =>
    setForm((f) => {
      const sections = [...f.sections];
      [sections[index], sections[index + direction]] = [
        sections[index + direction],
        sections[index],
      ];
      return { ...f, sections };
    });
  return (
    <>
      <div className="panel cms-status">
        <div>
          <strong>
            {tr('Draft revision')} {state.revision}
          </strong>
          <p>
            {tr('Last published')}:{' '}
            {state.published_at ? adminDate(state.published_at) : tr('Not published')}
          </p>
          <span className={`status-badge ${dirty ? 'pending' : 'active'}`}>
            {tr(dirty ? 'Unsaved changes' : 'Draft saved')}
          </span>
        </div>
        <div className="table-actions">
          <a className="text-link" href={policy.publicPath} target="_blank" rel="noreferrer">
            {tr(policy.viewLabel)}
          </a>
          <Button variant="outline" onClick={() => setPreview(!preview)}>
            {tr(preview ? 'Close preview' : policy.previewLabel)}
          </Button>
          <Button
            disabled={!dirty || save.isPending || publish.isPending}
            onClick={() => save.mutate()}
          >
            {tr(save.isPending ? 'Saving…' : 'Save draft')}
          </Button>
          <ActionDialog
            label={policy.publishLabel}
            disabled={dirty || save.isPending || publish.isPending}
            requireReason={false}
            description={tr(policy.publishDescription)}
            onConfirm={() => publish.mutateAsync()}
          />
        </div>
      </div>
      <Notice error={save.error ?? publish.error} />
      {preview && (
        <div className="terms-preview">
          <div className="notice">{tr('Private preview — draft content is not public.')}</div>
          <Field label={tr('Preview language')}>
            <select
              value={previewLocale}
              onChange={(e) => setPreviewLocale(e.target.value as 'en' | 'bn')}
            >
              <option value="en">English</option>
              <option value="bn">বাংলা</option>
            </select>
          </Field>
          <TermsDocument
            content={form}
            locale={previewLocale}
            sectionPrefix={`${kind}-preview`}
            label={policy.title}
          />
        </div>
      )}
      <section className="panel form-stack">
        <h3>{tr('Document settings')}</h3>
        <p>{tr('Content is plain text. HTML and scripts are never executed.')}</p>
        <div className="form-grid">
          {(['en', 'bn'] as const).map((lang) => (
            <div key={lang} className="form-stack">
              <Field label={`${tr('Page title')} (${lang === 'en' ? 'English' : 'বাংলা'})`}>
                <input
                  maxLength={160}
                  value={form[`title_${lang}`]}
                  onChange={(e) => setForm((f) => ({ ...f, [`title_${lang}`]: e.target.value }))}
                />
              </Field>
              <Field label={`${tr('Introduction')} (${lang === 'en' ? 'English' : 'বাংলা'})`}>
                <textarea
                  maxLength={2000}
                  value={form[`intro_${lang}`]}
                  onChange={(e) => setForm((f) => ({ ...f, [`intro_${lang}`]: e.target.value }))}
                />
              </Field>
            </div>
          ))}
          <Field label={tr('Effective date')}>
            <input
              type="date"
              value={form.effective_date}
              onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
            />
          </Field>
        </div>
        {form.sections.map((section, index) => (
          <div className="terms-editor-section" key={index}>
            <header>
              <h3>
                {tr('Section')} {index + 1}
              </h3>
              <div className="table-actions">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`${tr('Move section up')} ${index + 1}`}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === form.sections.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`${tr('Move section down')} ${index + 1}`}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== index) }))
                  }
                >
                  {tr('Remove section')}
                </Button>
              </div>
            </header>
            <div className="form-grid">
              {(['en', 'bn'] as const).map((lang) => (
                <div className="form-stack" key={lang}>
                  <Field
                    label={`${tr('Heading')} ${index + 1} (${lang === 'en' ? 'English' : 'বাংলা'})`}
                  >
                    <input
                      maxLength={200}
                      value={section[`heading_${lang}`]}
                      onChange={(e) => updateSection(index, `heading_${lang}`, e.target.value)}
                    />
                  </Field>
                  <Field
                    label={`${tr('Content')} ${index + 1} (${lang === 'en' ? 'English' : 'বাংলা'})`}
                  >
                    <textarea
                      maxLength={8000}
                      value={section[`body_${lang}`]}
                      onChange={(e) => updateSection(index, `body_${lang}`, e.target.value)}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          disabled={form.sections.length >= 30}
          onClick={() =>
            setForm((f) => ({
              ...f,
              sections: [
                ...f.sections,
                { heading_en: '', heading_bn: '', body_en: '', body_bn: '' },
              ],
            }))
          }
        >
          {tr('Add section')}
        </Button>
      </section>
      <section className="panel">
        <h3>{tr('Revision history')}</h3>
        <p>
          {tr(
            'Latest 20 saved and published revisions. Draft history is restricted to the super admin.',
          )}
        </p>
        {!state.history.length && <p>{tr('No revisions yet')}</p>}
        {state.history.map((entry) => (
          <details className="terms-history" key={entry.revision}>
            <summary>
              {tr('Version')} {entry.revision} ·{' '}
              {tr(entry.action === 'published' ? 'Published' : 'Draft saved')} ·{' '}
              {adminDate(entry.created_at)}
            </summary>
            <TermsDocument
              content={entry.after_content}
              locale={locale}
              sectionPrefix={`${kind}-history-${entry.revision}`}
              label={policy.title}
            />
          </details>
        ))}
      </section>
    </>
  );
}
