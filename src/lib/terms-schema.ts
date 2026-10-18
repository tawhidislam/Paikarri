import { z } from 'zod';

export const termsSchema = z
  .object({
    title_en: z.string().max(160),
    title_bn: z.string().max(160),
    intro_en: z.string().max(2000),
    intro_bn: z.string().max(2000),
    effective_date: z.union([z.literal(''), z.iso.date()]),
    sections: z
      .array(
        z.object({
          heading_en: z.string().max(200),
          heading_bn: z.string().max(200),
          body_en: z.string().max(8000),
          body_bn: z.string().max(8000),
        }),
      )
      .max(30),
  })
  .refine(
    (value) => new TextEncoder().encode(JSON.stringify(value)).length <= 100000,
    'Terms content is too large.',
  );
export type TermsContent = z.infer<typeof termsSchema>;
export function validateTerms(content: TermsContent, publishing = false) {
  const parsed = termsSchema.parse(content);
  if (
    publishing &&
    (!parsed.effective_date ||
      !parsed.sections.length ||
      [
        parsed.title_en,
        parsed.title_bn,
        parsed.intro_en,
        parsed.intro_bn,
        ...parsed.sections.flatMap((s) => [s.heading_en, s.heading_bn, s.body_en, s.body_bn]),
      ].some((v) => !v.trim()))
  ) {
    throw new Error('Complete both languages and choose an effective date before publishing');
  }
  return parsed;
}
export const defaultTerms: TermsContent = {
  title_en: 'Terms & Conditions',
  title_bn: 'শর্তাবলি',
  effective_date: '',
  intro_en:
    'Launch draft: the marketplace operator must finalize its legal entity, jurisdiction, dispute process, and contact details before public launch.',
  intro_bn:
    'প্রকাশের পূর্ববর্তী খসড়া: জনসাধারণের জন্য চালুর আগে প্ল্যাটফর্ম পরিচালনাকারীকে আইনি পরিচয়, প্রযোজ্য এখতিয়ার, বিরোধ নিষ্পত্তির পদ্ধতি ও যোগাযোগের তথ্য চূড়ান্ত করতে হবে।',
  sections: [
    {
      heading_en: 'Your account',
      heading_bn: 'আপনার অ্যাকাউন্ট',
      body_en:
        'Provide accurate business information and protect your password. Suppliers are responsible for their listings, capacity, prices, and the rights to images they upload.',
      body_bn:
        'সঠিক ব্যবসায়িক তথ্য দিন এবং আপনার পাসওয়ার্ড সুরক্ষিত রাখুন। সরবরাহকারীরা তাদের পণ্যের তালিকা, সরবরাহক্ষমতা, মূল্য ও আপলোড করা ছবির ব্যবহারের অধিকারের জন্য দায়ী।',
    },
    {
      heading_en: 'Direct transactions',
      heading_bn: 'সরাসরি লেনদেন',
      body_en:
        'Orders record agreed product prices, supplier-confirmed delivery charges, delivery details, and fulfilment history. Buyers and suppliers arrange payment and transport externally. Paikarii.com records manual payment verification and provides a dispute and full-order return workflow; it does not collect or hold funds.',
      body_bn:
        'অর্ডারে সম্মত পণ্যমূল্য, সরবরাহকারী নিশ্চিত করা ডেলিভারি চার্জ, ডেলিভারির তথ্য ও সরবরাহের ইতিহাস সংরক্ষিত হয়। ক্রেতা ও সরবরাহকারী নিজ উদ্যোগে অর্থপ্রদান ও পরিবহনের ব্যবস্থা করেন। Paikarii.com ম্যানুয়াল পেমেন্ট যাচাইয়ের তথ্য রাখে এবং বিরোধ ও সম্পূর্ণ অর্ডার ফেরতের প্রক্রিয়া দেয়; এটি অর্থ সংগ্রহ বা জমা রাখে না।',
    },
    {
      heading_en: 'Marketplace standards',
      heading_bn: 'মার্কেটপ্লেসের নীতিমালা',
      body_en:
        'Do not post illegal goods, misleading listings, personal data without permission, or abusive content. Administrators may reject, archive, or remove listings and investigate reports.',
      body_bn:
        'অবৈধ পণ্য, বিভ্রান্তিকর তালিকা, অনুমতি ছাড়া ব্যক্তিগত তথ্য বা আপত্তিকর বিষয়বস্তু প্রকাশ করবেন না। প্রশাসকরা তালিকা প্রত্যাখ্যান, আর্কাইভ বা অপসারণ করতে এবং অভিযোগ তদন্ত করতে পারেন।',
    },
    {
      heading_en: 'Verification and limitations',
      heading_bn: 'যাচাই ও সীমাবদ্ধতা',
      body_en:
        'Document review is a limited verification step, not an endorsement or transaction guarantee. Independently assess each supplier before entering a business relationship.',
      body_bn:
        'নথি পর্যালোচনা একটি সীমিত যাচাই প্রক্রিয়া; এটি কোনো অনুমোদন বা লেনদেনের নিশ্চয়তা নয়। ব্যবসায়িক সম্পর্ক স্থাপনের আগে প্রতিটি সরবরাহকারীকে স্বাধীনভাবে মূল্যায়ন করুন।',
    },
  ],
};
export const publishedTermsSchema = z.object({
  content: termsSchema,
  version: z.number(),
  published_at: z.string(),
});
export const termsStateSchema = z.object({
  draft: z.unknown(),
  published: termsSchema.nullable(),
  revision: z.number(),
  published_revision: z.number().nullable(),
  published_at: z.string().nullable(),
  history: z.array(
    z.object({
      revision: z.number(),
      action: z.enum(['saved', 'published']),
      after_content: termsSchema,
      created_at: z.string(),
    }),
  ),
});
