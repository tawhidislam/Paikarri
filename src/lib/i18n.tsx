import { usePlatformSettings } from './platform';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
const en = {
  tagline: 'Bangladesh, in business.',
  search: 'What are you sourcing today?',
  searchButton: 'Search',
  products: 'Products',
  suppliers: 'Suppliers',
  categories: 'All categories',
  signin: 'Sign in',
  join: 'Join free',
  sell: 'Become a supplier',
  heroEyebrow: 'LOCAL SOURCING. BIG POSSIBILITIES.',
  heroTitle: 'Big business starts\ncloser to home.',
  heroBody:
    'Discover wholesale products and connect directly with suppliers across Bangladesh. Your next business opportunity is right here.',
  explore: 'Explore the marketplace',
  findSuppliers: 'Find suppliers',
  popular: 'Popular searches',
  featured: 'Explore by category',
  featuredSub: 'Find the right products for your business.',
  trending: 'Featured wholesale products',
  trendingSub: 'Compare prices, minimum orders, and suppliers for your business.',
  viewAll: 'View all products',
  verified: 'Meet your next business partner',
  verifiedSub: 'Connect with verified businesses across Bangladesh.',
  newArrivals: 'New arrivals',
  deals: 'More value in every order',
  save: 'Save product',
  moq: 'Min. order',
  verifiedBadge: 'Verified supplier',
  dashboard: 'Dashboard',
  logout: 'Sign out',
  noProducts: 'New opportunities are on their way',
  emptyProducts: 'No products match your search. Try a different category or fewer filters.',
  language: 'বাংলা',
  ctaTitle: 'Made in Bangladesh.\nReady for your business.',
  ctaBody:
    'Put your business in front of bulk buyers. Create your supplier profile and start building new connections.',
  ctaButton: 'Start selling on Paikarii.com',
  footer: 'Connecting Bangladesh’s businesses, one opportunity at a time.',
  loading: 'Loading…',
  contact: 'Contact supplier',
  quote: 'Request quotation',
  location: 'Location',
  filters: 'Filters',
  clear: 'Clear filters',
  home: 'Home',
  about: 'About Paikarii.com',
  support: 'Help & support',
  privacy: 'Privacy policy',
  terms: 'Terms & Conditions',
};
const bn: typeof en = {
  tagline: 'বাংলাদেশের ব্যবসার সঙ্গী।',
  search: 'আজ কী পণ্য খুঁজছেন?',
  searchButton: 'খুঁজুন',
  products: 'পণ্য',
  suppliers: 'সরবরাহকারী',
  categories: 'সব বিভাগ',
  signin: 'লগইন',
  join: 'যোগ দিন',
  sell: 'সরবরাহকারী হোন',
  heroEyebrow: 'দেশীয় পণ্য। অসীম সম্ভাবনা।',
  heroTitle: 'বড় ব্যবসার শুরু\nনিজের দেশেই।',
  heroBody:
    'বাংলাদেশের পাইকারি পণ্য খুঁজুন এবং সরবরাহকারীদের সাথে সরাসরি যোগাযোগ করুন। আপনার পরবর্তী ব্যবসার সুযোগ এখানেই।',
  explore: 'পণ্য দেখুন',
  findSuppliers: 'সরবরাহকারী খুঁজুন',
  popular: 'জনপ্রিয় অনুসন্ধান',
  featured: 'বিভাগ অনুযায়ী খুঁজুন',
  featuredSub: 'আপনার ব্যবসার জন্য সঠিক পণ্য খুঁজে নিন।',
  trending: 'বাছাইকৃত পাইকারি পণ্য',
  trendingSub: 'আপনার ব্যবসার জন্য দাম, সর্বনিম্ন অর্ডার ও সরবরাহকারী তুলনা করুন।',
  viewAll: 'সব পণ্য দেখুন',
  verified: 'আপনার ব্যবসার নতুন সঙ্গী',
  verifiedSub: 'বাংলাদেশের যাচাইকৃত ব্যবসার সাথে যুক্ত হোন।',
  newArrivals: 'নতুন পণ্যসমূহ',
  deals: 'প্রতি অর্ডারে আরও সাশ্রয়',
  save: 'পণ্য সংরক্ষণ',
  moq: 'সর্বনিম্ন অর্ডার',
  verifiedBadge: 'যাচাইকৃত সরবরাহকারী',
  dashboard: 'ড্যাশবোর্ড',
  logout: 'লগআউট',
  noProducts: 'নতুন পণ্য শীঘ্রই আসছে',
  emptyProducts: 'কোনো পণ্য পাওয়া যায়নি। অন্য বিভাগ বা কম ফিল্টার দিয়ে চেষ্টা করুন।',
  language: 'English',
  ctaTitle: 'বাংলাদেশে তৈরি।\nআপনার ব্যবসার জন্য।',
  ctaBody:
    'পাইকারি ক্রেতাদের কাছে আপনার ব্যবসা তুলে ধরুন। সরবরাহকারী প্রোফাইল তৈরি করে নতুন যোগাযোগ শুরু করুন।',
  ctaButton: 'Paikarii.com-এ বিক্রি শুরু করুন',
  footer: 'বাংলাদেশের ব্যবসাগুলোকে যুক্ত করছি, এক সুযোগ থেকে আরেক সুযোগে।',
  loading: 'লোড হচ্ছে…',
  contact: 'যোগাযোগ করুন',
  quote: 'দরপত্র অনুরোধ',
  location: 'অবস্থান',
  filters: 'ফিল্টার',
  clear: 'ফিল্টার মুছুন',
  home: 'হোম',
  about: 'Paikarii.com সম্পর্কে',
  support: 'সাহায্য ও সহায়তা',
  privacy: 'গোপনীয়তা নীতি',
  terms: 'ব্যবহারের শর্ত',
};
const LocaleContext = createContext({ locale: 'en' as 'en' | 'bn', t: en, toggle: () => {} });
export function LocaleProvider({ children }: { children: ReactNode }) {
  const platform = usePlatformSettings();
  const [preferred, setLocale] = useState<'en' | 'bn' | null>(() => {
    const stored = localStorage.getItem('paikari-locale');
    return stored === 'en' || stored === 'bn' ? stored : null;
  });
  const locale = preferred ?? platform.data?.default_locale ?? 'en';
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <LocaleContext.Provider
      value={{
        locale,
        t: {
          ...(locale === 'bn' ? bn : en),
          tagline:
            (locale === 'bn' ? platform.data?.tagline_bn : platform.data?.tagline_en) ??
            (locale === 'bn' ? bn.tagline : en.tagline),
        },
        toggle: () =>
          setLocale(() => {
            const next = locale === 'en' ? 'bn' : 'en';
            localStorage.setItem('paikari-locale', next);
            document.documentElement.lang = next;
            return next;
          }),
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
export const useLocale = () => useContext(LocaleContext);

import { banglaCopy } from './copy';
export function useT() {
  const { locale } = useLocale();
  return (value: string) => (locale === 'bn' ? (banglaCopy[value] ?? value) : value);
}
