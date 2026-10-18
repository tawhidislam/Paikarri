import type { TermsContent } from './terms-schema';

// A private starter draft, not a published promise of eligibility or timing.
export const defaultRefundPolicy: TermsContent = {
  title_en: 'Refund Policy',
  title_bn: 'অর্থ ফেরত নীতিমালা',
  effective_date: '',
  intro_en:
    'Private launch draft for review. Before publishing, the operator must finalize refund eligibility, request deadlines, return shipping responsibility, processing times, and support contact details.',
  intro_bn:
    'পর্যালোচনার জন্য ব্যক্তিগত খসড়া। প্রকাশের আগে পরিচালনাকারীকে অর্থ ফেরতের যোগ্যতা, আবেদনের সময়সীমা, ফেরত পরিবহনের দায়িত্ব, প্রক্রিয়ার সময় ও সহায়তার যোগাযোগ চূড়ান্ত করতে হবে।',
  sections: [
    {
      heading_en: 'Requesting help with an order',
      heading_bn: 'অর্ডার সংক্রান্ত সহায়তার আবেদন',
      body_en:
        'Open the relevant order in your buyer dashboard and contact the supplier. Keep the order number, agreed quotation, payment evidence, and any relevant delivery or product photographs. Available order actions depend on the order status.',
      body_bn:
        'ক্রেতার ড্যাশবোর্ডে সংশ্লিষ্ট অর্ডার খুলে সরবরাহকারীর সঙ্গে যোগাযোগ করুন। অর্ডার নম্বর, সম্মত দরপত্র, অর্থপ্রদানের প্রমাণ এবং প্রাসঙ্গিক ডেলিভারি বা পণ্যের ছবি সংরক্ষণ করুন। উপলব্ধ পদক্ষেপ অর্ডারের অবস্থার ওপর নির্ভর করে।',
    },
    {
      heading_en: 'Eligibility and request deadlines',
      heading_bn: 'যোগ্যতা ও আবেদনের সময়সীমা',
      body_en:
        'Operator to complete before publication: describe eligible situations, applicable request deadlines, required evidence, and how cancellation differs from a return. State any product-specific conditions agreed with the supplier.',
      body_bn:
        'প্রকাশের আগে পরিচালনাকারী পূরণ করবেন: প্রযোজ্য পরিস্থিতি, আবেদনের সময়সীমা, প্রয়োজনীয় প্রমাণ এবং বাতিল ও পণ্য ফেরতের পার্থক্য উল্লেখ করুন। সরবরাহকারীর সঙ্গে সম্মত পণ্যভিত্তিক শর্তগুলো জানান।',
    },
    {
      heading_en: 'Returns and delivery costs',
      heading_bn: 'পণ্য ফেরত ও পরিবহন খরচ',
      body_en:
        'Operator to complete before publication: explain when return authorization is required, the return address and inspection process, packaging requirements, and who pays return delivery or other applicable costs.',
      body_bn:
        'প্রকাশের আগে পরিচালনাকারী পূরণ করবেন: কখন পণ্য ফেরতের অনুমতি প্রয়োজন, ফেরতের ঠিকানা ও পরিদর্শন প্রক্রিয়া, প্যাকেজিংয়ের শর্ত এবং ফেরত পরিবহন বা অন্যান্য প্রযোজ্য খরচ কে বহন করবেন তা জানান।',
    },
    {
      heading_en: 'Refund method and verification',
      heading_bn: 'অর্থ ফেরতের পদ্ধতি ও যাচাই',
      body_en:
        'Payments and refunds take place outside Paikarii.com. The platform records external payment and refund verification; it does not hold funds or automatically transfer refunds. Operator to complete before publication: identify the responsible party, refund method, processing times, and how the buyer receives confirmation.',
      body_bn:
        'অর্থপ্রদান ও অর্থ ফেরত Paikarii.com-এর বাইরে সম্পন্ন হয়। প্ল্যাটফর্ম বাহ্যিক অর্থপ্রদান ও ফেরত যাচাইয়ের তথ্য রাখে; অর্থ জমা রাখে না বা স্বয়ংক্রিয়ভাবে অর্থ ফেরত পাঠায় না। প্রকাশের আগে পরিচালনাকারী দায়িত্বপ্রাপ্ত পক্ষ, ফেরতের পদ্ধতি, প্রক্রিয়ার সময় ও ক্রেতা কীভাবে নিশ্চিতকরণ পাবেন তা পূরণ করবেন।',
    },
    {
      heading_en: 'Disputes and support',
      heading_bn: 'বিরোধ ও সহায়তা',
      body_en:
        'Use the order dispute tools when available and keep communication linked to the order. Operator to complete before publication: provide a support contact and the escalation process for unresolved refund requests.',
      body_bn:
        'উপলব্ধ থাকলে অর্ডারের বিরোধ ব্যবস্থাপনা ব্যবহার করুন এবং অর্ডার সংক্রান্ত যোগাযোগ সংরক্ষণ করুন। প্রকাশের আগে পরিচালনাকারীকে সহায়তার যোগাযোগ ও অমীমাংসিত অর্থ ফেরতের আবেদন পর্যালোচনার প্রক্রিয়া জানাতে হবে।',
    },
  ],
};
export const unpublishedRefundPolicy: TermsContent = {
  title_en: 'Refund Policy',
  title_bn: 'অর্থ ফেরত নীতিমালা',
  effective_date: '',
  sections: [],
  intro_en:
    'The marketplace has not published its refund policy yet. Contact support or your supplier to confirm the applicable terms before placing an order.',
  intro_bn:
    'মার্কেটপ্লেসের অর্থ ফেরত নীতিমালা এখনো প্রকাশিত হয়নি। অর্ডার দেওয়ার আগে প্রযোজ্য শর্ত নিশ্চিত করতে সহায়তা বিভাগ বা সরবরাহকারীর সঙ্গে যোগাযোগ করুন।',
};
