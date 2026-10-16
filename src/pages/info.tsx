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
    intro: 'Paikari connects local businesses with the products and people that help them grow.',
    sections: [
      [
        'Built for wholesale',
        'Discover manufacturers, wholesalers, and distributors. Compare products, minimum orders, and quantity prices, then contact suppliers directly.',
      ],
      [
        'Direct relationships',
        'Paikari is a discovery and communication marketplace. Buyers and suppliers arrange samples, contracts, delivery, and payment directly. Online checkout is not available.',
      ],
    ],
  },
  trust: {
    title: 'Better business starts with trust.',
    intro: 'Take the time to understand the product and the business behind it.',
    sections: [
      [
        'What verification means',
        'A verified badge means an authorized reviewer has approved a submitted business document. It is not a guarantee of product quality, creditworthiness, delivery, or payment performance.',
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
        'We store account identity, profile contact details, business listings, uploaded documents, saved items, quotation requests, and messages in the connected Supabase Cloud project.',
      ],
      [
        'Public and private information',
        'Approved products and safe business profile details are public. Profile phone numbers, verification documents, quotations, and conversations are restricted by access policies. Authorized reviewers can access documents for verification.',
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
  terms: {
    title: 'Terms of use',
    intro:
      'Launch draft: the marketplace operator must finalize its legal entity, jurisdiction, dispute process, and contact details before public launch.',
    sections: [
      [
        'Your account',
        'Provide accurate business information and protect your password. Suppliers are responsible for their listings, capacity, prices, and the rights to images they upload.',
      ],
      [
        'Direct transactions',
        'This release provides product discovery, inquiries, and communication. Any commercial contract, payment, shipping, inspection, or return is arranged directly between the parties.',
      ],
      [
        'Marketplace standards',
        'Do not post illegal goods, misleading listings, personal data without permission, or abusive content. Administrators may reject, archive, or remove listings and investigate reports.',
      ],
      [
        'Verification and limitations',
        'Document review is a limited verification step, not an endorsement or transaction guarantee. Independently assess each supplier before entering a business relationship.',
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
  const tr = useT();
  const { slug = 'about' } = useParams();
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
        {tr('PAIKARI /')}
        {slug.toUpperCase()}
      </span>
      <h1>{page.title}</h1>
      <p className="info-intro">{page.intro}</p>
      {page.sections.map(([title, body]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      <Link className="text-link" to="/">
        {tr('Back to marketplace \u2197')}
      </Link>
    </article>
  );
}
