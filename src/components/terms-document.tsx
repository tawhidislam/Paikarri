import { Link } from 'react-router-dom';
import { useLocale, useT } from '@/lib/i18n';
import type { TermsContent } from '@/lib/terms';
import { useTerms } from '@/lib/terms';
import { termsCopy } from '@/lib/terms-copy';
import { Notice, State, useTitle } from './shared';
import { Button } from './ui/button';
import './terms-document.css';
import { policyConfig, type PolicyKind } from '@/lib/policy-config';

export function TermsDocument({
  content,
  locale,
  version,
  sectionPrefix = 'terms',
  label = 'Terms & Conditions',
}: {
  content: TermsContent;
  locale: 'en' | 'bn';
  version?: number;
  sectionPrefix?: string;
  label?: string;
}) {
  const tr = (value: string) => (locale === 'bn' ? (termsCopy[value] ?? value) : value);
  const title = locale === 'bn' ? content.title_bn : content.title_en;
  return (
    <article className="terms-document" lang={locale}>
      <header className="terms-document-header">
        <span className="eyebrow">PAIKARII.COM / {tr(label)}</span>
        <h1>{title}</h1>
        {content.effective_date && (
          <p className="terms-effective">
            {tr('Effective date')}:{' '}
            <time dateTime={content.effective_date}>
              {new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
                dateStyle: 'long',
                timeZone: 'Asia/Dhaka',
              }).format(new Date(`${content.effective_date}T00:00:00+06:00`))}
            </time>
            {version !== undefined && (
              <span>
                {' '}
                · {tr('Version')} {version}
              </span>
            )}
          </p>
        )}
        <p className="terms-intro">{locale === 'bn' ? content.intro_bn : content.intro_en}</p>
      </header>
      {content.sections.length > 1 && (
        <nav aria-label={tr('On this page')} className="terms-contents">
          <strong>{tr('On this page')}</strong>
          <ol>
            {content.sections.map((section, index) => (
              <li key={index}>
                <a href={`#${sectionPrefix}-section-${index + 1}`}>
                  {locale === 'bn' ? section.heading_bn : section.heading_en}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {content.sections.map((section, index) => (
        <section key={index} id={`${sectionPrefix}-section-${index + 1}`} className="terms-section">
          <h2>
            {index + 1}. {locale === 'bn' ? section.heading_bn : section.heading_en}
          </h2>
          <p>{locale === 'bn' ? section.body_bn : section.body_en}</p>
        </section>
      ))}
    </article>
  );
}
export function PublicTerms({ kind = 'terms' }: { kind?: PolicyKind }) {
  const policy = policyConfig(kind);
  const { locale } = useLocale();
  const tr = useT();
  const query = useTerms(kind);
  const content = query.data?.content ?? policy.unpublishedContent;
  useTitle(locale === 'bn' ? content.title_bn : content.title_en);
  return (
    <div className="container terms-page">
      {query.isPending && query.fetchStatus !== 'idle' ? (
        <State title={tr('Loading…')} />
      ) : query.isError ? (
        <>
          <Notice error={query.error} />
          <Button onClick={() => void query.refetch()}>{tr('Try again')}</Button>
        </>
      ) : (
        <TermsDocument
          content={content}
          locale={locale}
          version={query.data?.version}
          label={policy.title}
          sectionPrefix={kind}
        />
      )}
      {kind === 'refund' && !query.isPending && !query.isError && query.data === null && (
        <Link className="terms-back" to="/info/support">
          {tr('Contact support')}
        </Link>
      )}
      <Link className="terms-back" to="/">
        {tr('Back to marketplace ↗')}
      </Link>
    </div>
  );
}
