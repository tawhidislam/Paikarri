import { z } from 'zod';
export const localLinkSchema = z
  .string()
  .max(500)
  .regex(/^\/(products|suppliers|dashboard\/business|info\/[a-z-]+|auth\/register)(\?.*)?$/)
  .refine((v) => !/[\s\\]/.test(v), 'Choose a marketplace link');
export const homepageSchema = z
  .object({
    hero_eyebrow_en: z.string().max(1000),
    hero_eyebrow_bn: z.string().max(1000),
    hero_title_en: z.string().trim().min(3).max(160),
    hero_title_bn: z.string().trim().min(3).max(160),
    hero_body_en: z.string().max(1000),
    hero_body_bn: z.string().max(1000),
    hero_button_en: z.string().trim().min(1).max(60),
    hero_button_bn: z.string().trim().min(1).max(60),
    hero_href: localLinkSchema,
    hero_alt_en: z.string().max(1000),
    hero_alt_bn: z.string().max(1000),
    hero_image: z.string().nullable(),
    announcement_en: z.string().max(1000),
    announcement_bn: z.string().max(1000),
    announcement_href: z.union([z.literal(''), localLinkSchema]),
    show_announcement: z.boolean(),
    show_categories: z.boolean(),
    show_products: z.boolean(),
    show_suppliers: z.boolean(),
    show_arrivals: z.boolean(),
    show_deals: z.boolean(),
    show_supplier_cta: z.boolean(),
    category_ids: z.array(z.uuid()).max(6),
    product_ids: z.array(z.uuid()).max(8),
    supplier_ids: z.array(z.uuid()).max(3),
  })
  .superRefine((v, c) => {
    for (const key of ['category_ids', 'product_ids', 'supplier_ids'] as const)
      if (new Set(v[key]).size !== v[key].length)
        c.addIssue({ code: 'custom', path: [key], message: 'Duplicate selection' });
    if (v.show_announcement && (!v.announcement_en.trim() || !v.announcement_bn.trim()))
      c.addIssue({ code: 'custom', message: 'Bilingual announcement text required' });
    if (v.hero_image && (!v.hero_alt_en.trim() || !v.hero_alt_bn.trim()))
      c.addIssue({ code: 'custom', message: 'Bilingual alternative text required' });
  });
export type HomepageConfig = z.infer<typeof homepageSchema>;
export const defaultHomepage: HomepageConfig = {
  hero_eyebrow_en: 'LOCAL SOURCING. BIG POSSIBILITIES.',
  hero_eyebrow_bn: 'দেশীয় পণ্য। অসীম সম্ভাবনা।',
  hero_title_en: 'Big business starts\ncloser to home.',
  hero_title_bn: 'বড় ব্যবসার শুরু\nনিজের দেশেই।',
  hero_body_en:
    'Compare wholesale prices and minimum orders. Contact Bangladeshi suppliers directly and request a quotation.',
  hero_body_bn:
    'পাইকারি দাম ও সর্বনিম্ন অর্ডার তুলনা করুন। দেশীয় সরবরাহকারীদের সাথে সরাসরি যোগাযোগ করে দরপত্রের অনুরোধ জানান।',
  hero_button_en: 'Explore the marketplace',
  hero_button_bn: 'পণ্য দেখুন',
  hero_href: '/products',
  hero_alt_en: 'Illustration of a wholesale warehouse, cartons, and a delivery trolley',
  hero_alt_bn: 'পাইকারি গুদাম, কার্টন ও পণ্য বহনের ট্রলির চিত্র',
  hero_image: null,
  announcement_en: '',
  announcement_bn: '',
  announcement_href: '',
  show_announcement: false,
  show_categories: true,
  show_products: true,
  show_suppliers: true,
  show_arrivals: true,
  show_deals: true,
  show_supplier_cta: true,
  category_ids: [],
  product_ids: [],
  supplier_ids: [],
};
