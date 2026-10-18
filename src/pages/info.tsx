import { PublicTerms } from '@/components/terms-document';
import { useT } from '@/lib/i18n';
import { Link, useParams } from 'react-router-dom';
import { useTitle } from '@/components/shared';
const pages: Record<
  string,
  {
    title: string;
    intro: string;
    sections: [string, string][];
  }
> = {
  about: {
    title: 'Bangladesh, in business.',
    intro:
      'Paikarii.com connects local businesses with the products and people that help them grow.',
    sections: [
      [
        'Built for wholesale',
        'Discover manufacturers, wholesalers, and distributors. Compare products, minimum orders, and quantity prices, then contact suppliers directly.',
      ],
      [
        'Direct relationships',
        'Paikarii.com supports wholesale discovery, supplier chat, and order requests. Buyers review supplier-confirmed delivery terms before fulfilment. Cash on delivery and bank payments are arranged externally; Paikarii.com records verified payment status.',
      ],
    ],
  },
  trust: {
    title: 'Better business starts with trust.',
    intro: 'Take the time to understand the product and the business behind it.',
    sections: [
      [
        'What verification means',
        'A verified badge requires an active supplier account and a complete, approved, unexpired application covering owner identity, trade licence, and bank details. Verification does not guarantee product quality, delivery, creditworthiness, or payment performance.',
      ],
      [
        'Source thoughtfully',
        'Ask for current specifications, samples, a written quotation, business identity, and delivery terms. Independently confirm bank details before transferring funds.',
      ],
      [
        'Report concerns',
        'Use “Report this listing” on a product page to notify marketplace administrators. Private business documents are accessible only to owners and authorized reviewers.',
      ],
    ],
  },
  support: {
    title: 'A little help, a bigger possibility.',
    intro: 'Find your way around the marketplace.',
    sections: [
      [
        'For buyers',
        'Create and verify your email account. Save products and suppliers, request a quotation from a product page, and track replies in your dashboard.',
      ],
      [
        'For suppliers',
        'Choose Become a supplier in your dashboard, complete your business profile, submit verification documents, and add products. Listings are reviewed before they appear publicly.',
      ],
      [
        'Account access',
        'Use Forgot password on the sign-in page to request a reset email. Check your spam folder. If no email arrives, the operator should check Supabase SMTP and Auth logs.',
      ],
      [
        'Marketplace support',
        'Use the report tool for listing issues. The marketplace operator must publish a support contact before launch.',
      ],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro:
      'This launch draft describes the application’s data handling. The marketplace operator must add its legal identity and contact details before public launch.',
    sections: [
      [
        'Information stored',
        'We store account identity, profiles, business listings, verification documents, saved items, quotations, messages, orders, delivery addresses, payment references, shipments, and dispute history in the connected Supabase Cloud project.',
      ],
      [
        'Public and private information',
        'Approved products and safe business profile details are public. Profile phone numbers, verification documents, quotations, and conversations are restricted by access policies. Order addresses, payment references, and disputes are accessible only to the buyer, the relevant supplier, and the platform super admin. Staff cannot access order records. Verification documents are restricted to their owner and the super admin.',
      ],
      [
        'Conversation oversight',
        'Participants and the platform super admin may access supplier–customer conversations for marketplace oversight. Super admin monitoring is read-only, and each conversation opening is recorded in restricted audit history. Staff administrators cannot monitor conversations.',
      ],
      [
        'Retention and requests',
        'The operator is responsible for defining retention periods and handling access, correction, and deletion requests. Contact details and the applicable legal basis must be finalized before launch.',
      ],
      [
        'Browser storage',
        'Authentication sessions and language preference are stored in your browser. Signing out clears the active authentication session.',
      ],
    ],
  },
  setup: {
    title: 'Connect your Supabase Cloud project.',
    intro:
      'This app uses React + Vite with a hosted Supabase backend. Docker and a local database are not required.',
    sections: [
      [
        '1. Configure environment',
        'Copy .env.example to .env.local. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY using the project Connect dialog. Never expose secret keys with a VITE_ prefix.',
      ],
      [
        '2. Link and migrate',
        'Use supabase login, supabase link --project-ref YOUR_REF, supabase db push --linked --dry-run, then supabase db push --linked. Read docs/DEPLOYMENT.md first.',
      ],
      [
        '3. Configure authentication',
        'In the cloud dashboard configure the site URL, redirect allowlist, email confirmation, and custom SMTP. Allow /auth/callback and /auth/reset on your development and production origins.',
      ],
      [
        '4. Start the frontend',
        'Run npm install and npm run dev. Use the test checklist in docs/DEPLOYMENT.md before launching. Never run supabase start or db reset for this project.',
      ],
    ],
  },
};
export default function Info() {
  const { slug = 'about' } = useParams();
  return slug === 'terms' || slug === 'refund' ? (
    <PublicTerms key={slug} kind={slug} />
  ) : (
    <StaticInfo slug={slug} />
  );
}
function StaticInfo({ slug }: { slug: string }) {
  const tr = useT();
  const page = pages[slug];
  useTitle(page?.title ?? 'Page not found');
  if (!page)
    return (
      <div className="container page-content">
        <h1>{tr('Page not found')}</h1>
        <Link to="/">{tr('Back home')}</Link>
      </div>
    );
  return (
    <article className="container info-page">
      <span className="eyebrow">
        {tr('PAIKARII.COM /')}
        {slug.toUpperCase()}
      </span>
      <h1>{tr(page.title)}</h1>
      <p className="info-intro">{tr(page.intro)}</p>
      {page.sections.map(([title, body]) => (
        <section key={title}>
          <h2>{tr(title)}</h2>
          <p>{tr(body)}</p>
        </section>
      ))}
      <Link className="text-link" to="/">
        {tr('Back to marketplace \u2197')}
      </Link>
    </article>
  );
}
