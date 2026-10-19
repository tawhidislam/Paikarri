import { storefrontCopy } from './storefront-copy';
import { adminOrdersCopy } from './admin-orders-copy';
import { growthCopy } from './growth-copy';
import { receiptCopy } from './receipt-copy';
import { termsCopy } from './terms-copy';
import { buyerOrdersCopy } from './buyer-orders-copy';
import { searchCopy } from './search-copy';
import { buyingCopy } from './buying-copy';
import { disputesCopy } from './disputes-copy';
// Central interface copy. English source phrases are stable keys; all Bangla
// translations belong here rather than in individual components.
export const banglaCopy: Record<string, string> = {
  ...storefrontCopy,
  ...adminOrdersCopy,
  'Store picture': 'দোকানের ছবি',
  'Store profile picture': 'দোকানের প্রোফাইল ছবি',
  'Store picture removed.': 'দোকানের ছবি সরানো হয়েছে।',
  'Store picture saved.': 'দোকানের ছবি সংরক্ষণ করা হয়েছে।',
  'Upload your store logo or business picture. It appears on your public storefront and supplier cards.':
    'আপনার দোকানের লোগো বা ব্যবসার ছবি আপলোড করুন। এটি দোকানের পাতা ও সরবরাহকারীর কার্ডে দেখা যাবে।',
  'JPEG, PNG or WebP up to 20 MB. Optimized to WebP, at most 512px and 256 KB before upload.':
    'সর্বোচ্চ ২০ এমবি JPEG, PNG বা WebP ছবি দিন। আপলোডের আগে WebP-তে রূপান্তর করে সর্বোচ্চ ৫১২ পিক্সেল ও ২৫৬ কেবি করা হবে।',
  'Optimizing & uploading…': 'ছবি ছোট করে আপলোড করা হচ্ছে…',
  'Replace store picture': 'দোকানের ছবি পরিবর্তন করুন',
  'Upload store picture': 'দোকানের ছবি আপলোড করুন',
  'Choose store picture': 'দোকানের ছবি বেছে নিন',
  'Remove picture': 'ছবি সরান',
  'Upload size': 'আপলোডের আকার',
  'Store pictures must be optimized WebP images up to 256 KB.':
    'দোকানের ছবি সর্বোচ্চ ২৫৬ কেবির অপ্টিমাইজ করা WebP হতে হবে।',
  'Store picture changed. Refresh before trying again.':
    'দোকানের ছবি পরিবর্তিত হয়েছে। আবার চেষ্টা করার আগে রিফ্রেশ করুন।',
  'Supplier name or email…': 'সরবরাহকারীর নাম বা ইমেইল…',
  'Supplier quick filters': 'সরবরাহকারীর দ্রুত ফিল্টার',
  'Needs attention on this page': 'এই পাতায় করণীয় রয়েছে',
  'Showing follow-up needs within the current page. Search and account filters still apply.':
    'বর্তমান পাতার করণীয় দেখানো হচ্ছে। অনুসন্ধান ও অ্যাকাউন্টের ফিল্টারও প্রযোজ্য।',
  'No follow-up needed on this page': 'এই পাতায় কোনো করণীয় নেই',
  Breadcrumb: 'নেভিগেশন পথ',
  'View storefront': 'দোকান দেখুন',
  'Email supplier': 'সরবরাহকারীকে ইমেইল করুন',
  'Call supplier': 'সরবরাহকারীকে কল করুন',
  'Account changes require a reason and are recorded in audit history.':
    'অ্যাকাউন্ট পরিবর্তনের কারণ দিতে হবে এবং তা কার্যক্রমের ইতিহাসে নথিভুক্ত হবে।',
  'Account status updated': 'অ্যাকাউন্টের অবস্থা আপডেট হয়েছে',
  'Overdue corrective actions need attention': 'মেয়াদোত্তীর্ণ সংশোধনের কাজগুলো পর্যালোচনা করুন',
  'Warnings do not suspend accounts automatically.':
    'সতর্কবার্তার কারণে স্বয়ংক্রিয়ভাবে অ্যাকাউন্ট স্থগিত হয় না।',
  'Review warnings': 'সতর্কবার্তা দেখুন',
  'Catalog status': 'ক্যাটালগের অবস্থা',
  'Buyer inquiries': 'ক্রেতার অনুসন্ধান',
  'Compliance health': 'নিয়ম অনুসরণের অবস্থা',
  'Profile health': 'প্রোফাইলের অবস্থা',
  Incomplete: 'অসম্পূর্ণ',
  'Supplier workspace sections': 'সরবরাহকারীর কর্মক্ষেত্রের বিভাগ',
  'Overview & Labels': 'বিবরণ ও লেবেল',
  'Warnings & Sanctions': 'সতর্কবার্তা ও ব্যবস্থা',
  'Internal Notes': 'অভ্যন্তরীণ নোট',
  'Verification & Renewals': 'যাচাই ও নবায়ন',
  'Labels saved.': 'লেবেল সংরক্ষণ করা হয়েছে।',
  'Use up to 10 labels, 2–40 characters each.':
    'সর্বোচ্চ ১০টি লেবেল দিন, প্রতিটিতে ২–৪০টি অক্ষর থাকতে হবে।',
  'Remove label': 'লেবেল সরান',
  'Add tag': 'লেবেল যোগ করুন',
  'Type a label and press Enter': 'লেবেল লিখে এন্টার চাপুন',
  'Quick presets': 'দ্রুত লেবেলসমূহ',
  'VIP Supplier': 'ভিআইপি সরবরাহকারী',
  'High Volume': 'বড় পরিসরে সরবরাহ',
  'Fast Dispatch': 'দ্রুত প্রেরণ',
  'Slow Response': 'উত্তরে বিলম্ব',
  'Catalog Incomplete': 'অসম্পূর্ণ ক্যাটালগ',
  'Edit labels as text': 'লিখে লেবেল সম্পাদনা করুন',
  'Press Ctrl / ⌘ + Enter to add a note.': 'নোট যোগ করতে Ctrl / ⌘ + Enter চাপুন।',
  'Note filters': 'নোটের ফিল্টার',
  'Active notes': 'সক্রিয় নোট',
  'Archived notes': 'আর্কাইভকৃত নোট',
  'No internal notes in this view': 'এখানে কোনো অভ্যন্তরীণ নোট নেই',
  'Note filters apply to the current page.': 'নোটের ফিল্টার বর্তমান পাতায় প্রযোজ্য।',
  'Warning filters': 'সতর্কবার্তার ফিল্টার',
  'Issue supplier warning': 'সরবরাহকারীকে সতর্কবার্তা দিন',
  'Confirm warning': 'সতর্কবার্তা নিশ্চিত করুন',
  'Complete all warning fields and choose a valid deadline.':
    'সতর্কবার্তার সব তথ্য পূরণ করে একটি বৈধ সময়সীমা দিন।',
  'Verification requires an approved, unexpired application and an active account.':
    'যাচাইকৃত হতে অনুমোদিত ও মেয়াদের মধ্যে থাকা আবেদন এবং সক্রিয় অ্যাকাউন্ট প্রয়োজন।',
  'Remaining in the 60-day renewal window': 'নবায়নের ৬০ দিনের সময়সীমায় অবশিষ্ট সময়',
  'No renewal due within 60 days. Open verification review for application details.':
    '৬০ দিনের মধ্যে কোনো নবায়ন বাকি নেই। আবেদনের বিস্তারিত জানতে যাচাই পর্যালোচনা খুলুন।',
  'Due today': 'আজ শেষ দিন',
  'Overdue by': 'সময়সীমা পেরিয়েছে:',
  'Due in': 'সময় বাকি:',
  'Platform review': 'প্ল্যাটফর্ম পর্যালোচনা',
  'No action history yet': 'এখনও কোনো কার্যক্রমের ইতিহাস নেই',
  'Listing review queue': 'পণ্য পর্যালোচনার তালিকা',
  'Starting price': 'প্রারম্ভিক মূল্য',
  'Hide details': 'বিস্তারিত লুকান',
  'Review listing': 'পণ্য পর্যালোচনা করুন',
  'Date created': 'যোগ করার তারিখ',
  'Preview image': 'ছবির প্রিভিউ দেখুন',
  'Product image preview': 'পণ্যের ছবির প্রিভিউ',
  'No product images uploaded.': 'পণ্যের কোনো ছবি আপলোড করা হয়নি।',
  'No specifications provided.': 'কোনো বৈশিষ্ট্য দেওয়া হয়নি।',
  'No quantity tiers. Starting price applies.':
    'পরিমাণভিত্তিক মূল্য নেই। প্রারম্ভিক মূল্য প্রযোজ্য।',
  'Moderation decision': 'পর্যালোচনার সিদ্ধান্ত',
  'Check the photos, product information and pricing, then record your decision.':
    'ছবি, পণ্যের তথ্য ও মূল্য যাচাই করে আপনার সিদ্ধান্ত নথিভুক্ত করুন।',
  'A review note is required for every decision.':
    'প্রতিটি সিদ্ধান্তের জন্য পর্যালোচনার নোট প্রয়োজন।',
  'Listing decision saved.': 'পণ্য পর্যালোচনার সিদ্ধান্ত সংরক্ষণ করা হয়েছে।',
  ...termsCopy,
  ...buyingCopy,
  ...buyerOrdersCopy,
  ...receiptCopy,
  ...searchCopy,
  ...disputesCopy,
  ...growthCopy,
  'Attach image': 'ছবি সংযুক্ত করুন',
  'Choose chat image': 'চ্যাটের ছবি বেছে নিন',
  'Compressing and uploading image…': 'ছবি সংকুচিত করে আপলোড হচ্ছে…',
  'Image preview': 'ছবির প্রিভিউ',
  'Shared chat image': 'চ্যাটে পাঠানো ছবি',
  'Open full image': 'সম্পূর্ণ ছবি খুলুন',
  'Loading image…': 'ছবি লোড হচ্ছে…',
  'Retry image': 'আবার ছবি লোড করুন',
  'Loading quantity prices…': 'পরিমাণভিত্তিক মূল্য লোড হচ্ছে…',
  'Choose a whole quantity between': 'পূর্ণসংখ্যায় পরিমাণ বেছে নিন',
  'Changes were not saved. Retry Update or discard changes.':
    'পরিবর্তন সংরক্ষণ হয়নি। আবার আপডেট করুন অথবা পরিবর্তন বাতিল করুন।',
  'Saving quantity and prices automatically…': 'পরিমাণ ও মূল্য স্বয়ংক্রিয়ভাবে সংরক্ষণ হচ্ছে…',
  'Discard changes': 'পরিবর্তন বাতিল করুন',
  'Checkout is available after quantity changes are saved.':
    'পরিমাণের পরিবর্তন সংরক্ষণের পরে চেকআউট করতে পারবেন।',
  'Select quantity price': 'পরিমাণভিত্তিক মূল্য বেছে নিন',
  'Apply quantity tier': 'মূল্যধাপ প্রয়োগ করুন',
  'Tap a tier to apply its quantity and price.': 'পরিমাণ ও মূল্য প্রয়োগ করতে একটি ধাপে চাপুন।',
  'Quantity prices are unavailable. Your saved unit price is shown above.':
    'পরিমাণভিত্তিক মূল্য পাওয়া যাচ্ছে না। উপরে সংরক্ষিত একক মূল্য দেখানো হয়েছে।',
  'Retry prices': 'আবার মূল্য দেখুন',
  'Applied price': 'প্রযোজ্য মূল্য',
  'Tier based on combined variant quantity': 'সব ভ্যারিয়েন্টের মোট পরিমাণ অনুযায়ী মূল্যধাপ',
  'Prices have changed. Update the cart to refresh your saved price.':
    'মূল্য পরিবর্তিত হয়েছে। নতুন মূল্য পেতে কার্ট আপডেট করুন।',
  'Next lower price': 'পরবর্তী কম মূল্য',
  'Prices have changed. Refresh the cart to see the latest price.':
    'মূল্য পরিবর্তিত হয়েছে। সর্বশেষ মূল্য দেখতে কার্ট রিফ্রেশ করুন।',
  'Refresh prices': 'মূল্য রিফ্রেশ করুন',
  'Remove all variants': 'সব ভ্যারিয়েন্ট সরান',
  'Keep items': 'পণ্য রাখুন',
  'Removing this variant would leave less than the minimum order. Remove all variants of this product instead?':
    'এই ভ্যারিয়েন্ট সরালে মোট পরিমাণ ন্যূনতম অর্ডারের নিচে চলে যাবে। এই পণ্যের সব ভ্যারিয়েন্ট সরাতে চান?',
  'Save your quantity changes before checkout.': 'চেকআউটের আগে পরিবর্তিত পরিমাণ সংরক্ষণ করুন।',
  Per: 'প্রতি',
  Add: 'আরও যোগ করুন',
  Update: 'আপডেট',
  'Saving…': 'সংরক্ষণ হচ্ছে…',
  'Item subtotal': 'পণ্যের উপমোট',
  'Enter a whole quantity within available stock.': 'মজুতের মধ্যে পূর্ণসংখ্যায় পরিমাণ লিখুন।',
  'Tap Update to apply quantity changes.': 'পরিমাণ পরিবর্তন করতে আপডেট চাপুন।',
  'Update or remove unavailable items to continue.':
    'এগিয়ে যেতে অনুপলব্ধ পণ্য আপডেট করুন অথবা সরিয়ে দিন।',
  'Purchasing is unavailable while your account is suspended.':
    'আপনার অ্যাকাউন্ট স্থগিত থাকা অবস্থায় কেনাকাটা করা যাবে না।',
  'Checkout actions': 'চেকআউটের নিয়ন্ত্রণ',
  'Your dashboard': 'আপনার ড্যাশবোর্ড',
  'Manage your purchases and supplier connections.':
    'আপনার কেনাকাটা ও সরবরাহকারীদের সঙ্গে যোগাযোগ পরিচালনা করুন।',
  'Find your next wholesale product.': 'আপনার পরবর্তী পাইকারি পণ্য খুঁজুন।',
  Menu: 'মেনু',
  'Help & support': 'সাহায্য ও সহায়তা',
  'YOUR SUPPLIER INBOX': 'সরবরাহকারীদের সঙ্গে আপনার যোগাযোগ',
  'Conversation access': 'কথোপকথন দেখার অনুমতি',
  'Quick replies': 'দ্রুত উত্তর',
  'Latest messages': 'সর্বশেষ বার্তা',
  'Tap Send to send': 'পাঠাতে পাঠান বাটনে চাপুন',
  'This conversation could not be opened. Return to your inbox or try again.':
    'এই কথোপকথন খোলা যায়নি। ইনবক্সে ফিরে যান অথবা আবার চেষ্টা করুন।',
  'View all': 'সব দেখুন',
  'View all products': 'সব পণ্য দেখুন',
  'Demo catalog': 'ডেমো পণ্যের তালিকা',
  'Listings marked [DEMO] and suppliers marked [TEST] are fictional. Their images are illustrative, and they are not real commercial offers.':
    '[DEMO] চিহ্নিত পণ্য ও [TEST] চিহ্নিত সরবরাহকারী কাল্পনিক। তাদের ছবি কেবল উদাহরণ; এগুলো বাস্তব বাণিজ্যিক প্রস্তাব নয়।',
  'Illustration of a wholesale warehouse, cartons, and a delivery trolley':
    'পাইকারি গুদাম, কার্টন ও পণ্য বহনের ট্রলির চিত্র',
  'Illustration of wholesale packaging cartons': 'পাইকারি প্যাকেজিং কার্টনের চিত্র',
  'Show the exact item buyers will receive. Include a clear main photo, alternate angles, and relevant variant details. Category and lifestyle pictures cannot replace actual product photos.':
    'ক্রেতা যে পণ্য পাবেন তার আসল ছবি দিন। একটি পরিষ্কার প্রধান ছবি, বিভিন্ন দিকের ছবি এবং প্রাসঙ্গিক ভ্যারিয়েন্টের বিবরণ দেখান। বিভাগ বা সাজসজ্জার ছবি আসল পণ্যের ছবির বিকল্প নয়।',
  'Your workspace': 'আপনার কর্মক্ষেত্র',
  'Workspace menu': 'কর্মক্ষেত্রের মেনু',
  'Buyer account': 'ক্রেতার অ্যাকাউন্ট',
  Buying: 'কেনাকাটা',
  'Saved & sourcing': 'সংরক্ষিত পণ্য ও সংগ্রহ',
  'Messages & account': 'বার্তা ও অ্যাকাউন্ট',
  'Signing out…': 'সাইন আউট হচ্ছে…',
  'Buyer dashboard': 'ক্রেতার ড্যাশবোর্ড',
  'All options': 'সব অপশন',
  'Close menu': 'মেনু বন্ধ করুন',
  'View details': 'বিস্তারিত দেখুন',
  'Workspace summary': 'কর্মক্ষেত্রের সারসংক্ষেপ',
  'Quick actions': 'দ্রুত কাজ',
  'Track your purchases': 'আপনার কেনাকাটা অনুসরণ করুন',
  'Review items for checkout': 'অর্ডারের আগে পণ্য দেখুন',
  'LET’S GET TO BUSINESS': 'ব্যবসা শুরু করা যাক',

  'Bank details': 'ব্যাংকের তথ্য',
  'Start exploring': 'খুঁজে দেখুন',
  'LOCAL SOURCING. NEW POSSIBILITIES.': 'দেশীয় পণ্য। নতুন সম্ভাবনা।',
  'Local connections.': 'দেশীয় সংযোগ।',
  'Built for your next chapter.': 'আপনার ব্যবসার পরবর্তী ধাপের জন্য।',
  'FIND YOUR INDUSTRY': 'আপনার ব্যবসার বিভাগ খুঁজুন',
  'FOR YOUR BUSINESS': 'আপনার ব্যবসার জন্য',
  'BUSINESS, WITH CONFIDENCE': 'আস্থার সঙ্গে ব্যবসা',
  'Know the business behind your next order. Review supplier profiles and start a direct conversation.':
    'পরবর্তী অর্ডারের আগে ব্যবসাটিকে জানুন। সরবরাহকারীর প্রোফাইল দেখুন ও সরাসরি কথা বলুন।',
  'JUST ADDED': 'সদ্য যুক্ত হয়েছে',
  'A BETTER WAY TO SOURCE': 'পণ্য সংগ্রহের সহজ পথ',
  'Find your product. Meet your supplier. Make your next move.':
    'পণ্য খুঁজুন। সরবরাহকারীর সঙ্গে পরিচিত হোন। ব্যবসাকে এগিয়ে নিন।',
  'Order with confidence': 'আস্থার সঙ্গে অর্ডার করুন',
  'Review delivery terms, place your order, and follow progress in your workspace.':
    'ডেলিভারির শর্ত দেখুন, অর্ডার দিন এবং আপনার কর্মক্ষেত্রে অগ্রগতি অনুসরণ করুন।',
  'YOUR NEXT CHAPTER': 'আপনার পরবর্তী অধ্যায়',
  'ROOTED HERE. READY FOR WHAT’S NEXT.': 'শেকড় দেশেই। প্রস্তুতি আগামীর।',
  'Good business starts with a connection.': 'সঠিক সংযোগেই ভালো ব্যবসার শুরু।',
  'Find your next supplier': 'আপনার পরবর্তী সরবরাহকারী খুঁজুন',
  Completed: 'সম্পন্ন',
  Cancelled: 'বাতিল',
  Delivery: 'ডেলিভারি',
  'Payment method': 'পেমেন্ট পদ্ধতি',
  Order: 'অর্ডার',
  Placed: 'অর্ডারের সময়',
  Resolved: 'নিষ্পত্তি হয়েছে',
  'Available stock': 'উপলব্ধ মজুত',
  'Refresh order': 'অর্ডার রিফ্রেশ করুন',
  'Refresh cart': 'কার্ট রিফ্রেশ করুন',
  'Return authorized': 'ফেরত অনুমোদিত',
  'Return dispatched': 'ফেরত পাঠানো হয়েছে',
  'Return received': 'ফেরত পণ্য গৃহীত',
  'Authorize full return': 'সম্পূর্ণ ফেরত অনুমোদন করুন',
  'Dispatch return': 'ফেরত পণ্য পাঠান',
  'Confirm return received': 'ফেরত পণ্যপ্রাপ্তি নিশ্চিত করুন',
  'Return shipment': 'ফেরত চালান',
  'Returned units restocked': 'ফেরত পণ্য মজুতে যোগ হয়েছে',
  'Returned units not restocked': 'ফেরত পণ্য মজুতে যোগ হয়নি',
  'Available stock (unreserved units)': 'উপলব্ধ মজুত (সংরক্ষণমুক্ত ইউনিট)',
  'Authorize return of all order items. Agree on the return address in order notes before the buyer dispatches.':
    'অর্ডারের সব পণ্য ফেরত অনুমোদন করুন। ক্রেতা পাঠানোর আগে অর্ডারের নোটে ফেরতের ঠিকানা ঠিক করুন।',
  'I inspected every returned item and want to add all returned units back to available stock. Leave unchecked for damaged or unsellable goods.':
    'আমি সব ফেরত পণ্য পরীক্ষা করে সব ইউনিট মজুতে যোগ করতে চাই। ক্ষতিগ্রস্ত বা বিক্রির অনুপযোগী পণ্যের জন্য এটি নির্বাচন করবেন না।',
  'Paikarii.com supports wholesale discovery, supplier chat, and order requests. Buyers review supplier-confirmed delivery terms before fulfilment. Cash on delivery and bank payments are arranged externally; Paikarii.com records verified payment status.':
    'Paikarii.com-\u098f \u09aa\u09a3\u09cd\u09af \u0996\u09cb\u0981\u099c\u09be, \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0\u09b0 \u09b8\u0999\u09cd\u0997\u09c7 \u099a\u09cd\u09af\u09be\u099f \u0993 \u0985\u09b0\u09cd\u09a1\u09be\u09b0\u09c7\u09b0 \u0985\u09a8\u09c1\u09b0\u09cb\u09a7 \u0995\u09b0\u09be \u09af\u09be\u09af\u09bc\u0964 \u0995\u09be\u099c \u09b6\u09c1\u09b0\u09c1\u09b0 \u0986\u0997\u09c7 \u0995\u09cd\u09b0\u09c7\u09a4\u09be \u09a1\u09c7\u09b2\u09bf\u09ad\u09be\u09b0\u09bf\u09b0 \u09b6\u09b0\u09cd\u09a4 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0995\u09b0\u09c7\u09a8\u0964 \u09aa\u09c7\u09ae\u09c7\u09a8\u09cd\u099f \u09ac\u09be\u0987\u09b0\u09c7 \u09b8\u09ae\u09cd\u09aa\u09a8\u09cd\u09a8 \u09b9\u09af\u09bc; Paikarii.com \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u0985\u09ac\u09b8\u09cd\u09a5\u09be \u09a8\u09a5\u09bf\u09ad\u09c1\u0995\u09cd\u09a4 \u0995\u09b0\u09c7\u0964',
  'We store account identity, profiles, business listings, verification documents, saved items, quotations, messages, orders, delivery addresses, payment references, shipments, and dispute history in the connected Supabase Cloud project.':
    'সংযুক্ত Supabase Cloud প্রকল্পে পরিচয়, প্রোফাইল, ব্যবসার তালিকা, যাচাই নথি, সংরক্ষিত পণ্য, দরপত্র, বার্তা, অর্ডার, ঠিকানা, পেমেন্ট রেফারেন্স, চালান ও বিরোধের ইতিহাস রাখা হয়।',
  'Profile phone numbers, verification documents, quotations, and conversations are restricted by access policies. Order addresses, payment references, and disputes are accessible only to the buyer, the relevant supplier, and the platform super admin. Staff cannot access order records. Verification documents are restricted to their owner and the super admin.':
    'ব্যক্তিগত তথ্য অনুমতির ভিত্তিতে সুরক্ষিত। অর্ডারের ঠিকানা, পেমেন্ট রেফারেন্স ও বিরোধ শুধু ক্রেতা, সংশ্লিষ্ট সরবরাহকারী ও সুপার অ্যাডমিন দেখতে পারেন। স্টাফ অর্ডারের নথি দেখতে পারেন না। যাচাই নথি শুধু মালিক ও সুপার অ্যাডমিনের জন্য।',
  'Orders record agreed product prices, supplier-confirmed delivery charges, delivery details, and fulfilment history. Buyers and suppliers arrange payment and transport externally. Paikarii.com records manual payment verification and provides a dispute and full-order return workflow; it does not collect or hold funds.':
    '\u0985\u09b0\u09cd\u09a1\u09be\u09b0\u09c7 \u09b8\u09ae\u09cd\u09ae\u09a4 \u09a6\u09be\u09ae, \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u09a1\u09c7\u09b2\u09bf\u09ad\u09be\u09b0\u09bf \u099a\u09be\u09b0\u09cd\u099c, \u09a0\u09bf\u0995\u09be\u09a8\u09be \u0993 \u0995\u09be\u099c\u09c7\u09b0 \u0987\u09a4\u09bf\u09b9\u09be\u09b8 \u09a5\u09be\u0995\u09c7\u0964 \u0995\u09cd\u09b0\u09c7\u09a4\u09be \u0993 \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09ac\u09be\u0987\u09b0\u09c7 \u09aa\u09c7\u09ae\u09c7\u09a8\u09cd\u099f \u0993 \u09aa\u09b0\u09bf\u09ac\u09b9\u09a8 \u09a0\u09bf\u0995 \u0995\u09b0\u09c7\u09a8\u0964 Paikarii.com-\u098f \u09ae\u09cd\u09af\u09be\u09a8\u09c1\u09af\u09bc\u09be\u09b2 \u09aa\u09c7\u09ae\u09c7\u09a8\u09cd\u099f \u09af\u09be\u099a\u09be\u0987, \u09ac\u09bf\u09b0\u09cb\u09a7 \u0993 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u0985\u09b0\u09cd\u09a1\u09be\u09b0 \u09ab\u09c7\u09b0\u09a4\u09c7\u09b0 \u09ac\u09cd\u09af\u09ac\u09b8\u09cd\u09a5\u09be \u09b0\u09af\u09bc\u09c7\u099b\u09c7; \u098f\u099f\u09bf \u0985\u09b0\u09cd\u09a5 \u09b8\u0982\u0997\u09cd\u09b0\u09b9 \u09ac\u09be \u09a7\u09b0\u09c7 \u09b0\u09be\u0996\u09c7 \u09a8\u09be\u0964',
  'A verified badge requires an active supplier account and a complete, approved, unexpired application covering owner identity, trade licence, and bank details. Verification does not guarantee product quality, delivery, creditworthiness, or payment performance.':
    'যাচাই ব্যাজের জন্য সক্রিয় সরবরাহকারী অ্যাকাউন্ট এবং পরিচয়, ট্রেড লাইসেন্স ও ব্যাংকের তথ্যসহ সম্পূর্ণ অনুমোদিত ও মেয়াদযুক্ত আবেদন প্রয়োজন। যাচাই পণ্যের মান, ডেলিভারি বা পেমেন্টের নিশ্চয়তা নয়।',
  Cart: 'কার্ট',
  'Your wholesale cart': 'আপনার পাইকারি কার্ট',
  'WHOLESALE ORDERS': 'পাইকারি অর্ডার',
  'WHOLESALE ORDER': 'পাইকারি অর্ডার',
  'Add to cart': 'কার্টে যোগ করুন',
  'Order quantity': 'অর্ডারের পরিমাণ',
  'Product subtotal': 'পণ্যের উপমোট',
  'Delivery charges are confirmed by the supplier before you accept the order.':
    'অর্ডার গ্রহণ করার আগে সরবরাহকারী ডেলিভারি চার্জ নিশ্চিত করবেন।',
  'One checkout. A separate order for each supplier.':
    'একবার চেকআউট করুন। প্রতিটি সরবরাহকারীর জন্য আলাদা অর্ডার।',
  'Loading cart…': 'কার্ট লোড হচ্ছে…',
  'Your cart is empty': 'আপনার কার্ট খালি',
  'Unavailable or insufficient stock. Update or remove this item.':
    'পণ্য অনুপলব্ধ বা মজুত অপর্যাপ্ত। পরিমাণ পরিবর্তন করুন বা পণ্যটি সরান।',
  Remove: 'সরান',
  'Order summary': 'অর্ডারের সারাংশ',
  'Supplier to confirm': 'সরবরাহকারী নিশ্চিত করবেন',
  'Prices and stock are checked again when you place your order.':
    'অর্ডার দেওয়ার সময় দাম ও মজুত আবার যাচাই করা হয়।',
  'Continue to checkout': 'চেকআউটে যান',
  'Continue sourcing': 'আরও পণ্য খুঁজুন',
  'Back to cart': 'কার্টে ফিরুন',
  Checkout: 'চেকআউট',
  'No payment is collected at checkout. Review the final delivery charge before accepting each supplier order.':
    'চেকআউটে কোনো অর্থ নেওয়া হয় না। প্রতিটি অর্ডার গ্রহণের আগে চূড়ান্ত ডেলিভারি চার্জ পর্যালোচনা করুন।',
  'Recipient name': 'প্রাপকের নাম',
  'Mobile number': 'মোবাইল নম্বর',
  'Street address and delivery instructions': 'রাস্তার ঠিকানা ও ডেলিভারির নির্দেশনা',
  'Cash on delivery': 'ক্যাশ অন ডেলিভারি',
  'Bank transfer': 'ব্যাংক ট্রান্সফার',
  'Pay on delivery. Collection is recorded after external verification.':
    'ডেলিভারির সময় অর্থ দিন। বাহ্যিক প্রমাণ যাচাই করে অর্থপ্রাপ্তি নথিভুক্ত করা হয়।',
  'Arrange payment with the supplier after accepting delivery terms. A bank reference does not confirm payment.':
    'ডেলিভারির শর্ত গ্রহণের পর সরবরাহকারীর সঙ্গে পেমেন্টের ব্যবস্থা করুন। শুধু ব্যাংক রেফারেন্স পেমেন্ট নিশ্চিত করে না।',
  'Order note (optional)': 'অর্ডারের নোট (ঐচ্ছিক)',
  'Review your order': 'অর্ডার পর্যালোচনা করুন',
  'I confirm these quantities and delivery details. Each supplier must confirm delivery charges, which I will review before the order proceeds.':
    'আমি এই পরিমাণ ও ডেলিভারির তথ্য নিশ্চিত করছি। প্রতিটি সরবরাহকারী ডেলিভারি চার্জ নিশ্চিত করবেন, যা অর্ডার শুরু হওয়ার আগে আমি পর্যালোচনা করব।',
  'Placing orders…': 'অর্ডার দেওয়া হচ্ছে…',
  'Place order request': 'অর্ডারের অনুরোধ দিন',
  'Stock is reserved for 48 hours while confirmation is pending.':
    'নিশ্চিতকরণের অপেক্ষায় মজুত ৪৮ ঘণ্টার জন্য সংরক্ষিত থাকে।',
  'Confirm the checkout terms': 'চেকআউটের শর্ত নিশ্চিত করুন',
  'Refresh your cart and remove unavailable items': 'কার্ট রিফ্রেশ করে অনুপলব্ধ পণ্য সরান',
  'Search verified Bangladeshi manufacturers and wholesale suppliers to start your order.':
    'অর্ডার শুরু করতে যাচাইকৃত বাংলাদেশি প্রস্তুতকারক ও পাইকারি সরবরাহকারী খুঁজুন।',
  'Popular wholesale categories': 'জনপ্রিয় পাইকারি বিভাগ',
  'Ready-made Garments': 'পোশাক ও তৈরি পোশাক',
  'Fabrics & Textiles': 'কাপড় ও টেক্সটাইল',
  'Jute & Eco Packaging': 'পাট ও পরিবেশবান্ধব প্যাকেজিং',
  'Packaging & Boxes': 'প্যাকেজিং ও কার্টন',
  'Electronics & Accessories': 'ইলেকট্রনিক্স ও যন্ত্রাংশ',
  'Leather Goods': 'চামড়াজাত পণ্য',
  'Separate orders will be created for each supplier so each manufacturer can dispatch independently.':
    'প্রতিটি সরবরাহকারীর জন্য আলাদা অর্ডার তৈরি হবে যাতে প্রস্তুতকারক পৃথকভাবে পণ্য পাঠাতে পারেন।',
  'Cart Review': 'কার্ট পর্যালোচনা',
  'Delivery & Terms': 'ডেলিভারি ও শর্তাবলি',
  'Supplier Confirmation': 'সরবরাহকারীর নিশ্চিতকরণ',
  '11-digit Bangladeshi mobile number e.g. 01712345678':
    '১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর (যেমন: ০১৭১২৩৪৫৬৭৮)',
  'Used by suppliers to calculate commercial freight.':
    'সরবরাহকারীরা বাণিজ্যিক পরিবহন খরচ নির্ধারণে এটি ব্যবহার করেন।',
  'Recommended for wholesale': 'পাইকারির জন্য প্রস্তাবিত',
  'Direct bank transfer / BEFTN. Supplier verified bank routing details will be shown on your order page after delivery charges are confirmed.':
    'সরাসরি ব্যাংক ট্রান্সফার / BEFTN। ডেলিভারি চার্জ নিশ্চিত হওয়ার পর অর্ডারের পৃষ্ঠায় যাচাইকৃত ব্যাংক হিসাবের বিবরণ দেখা যাবে।',
  '{count} separate supplier orders will be placed': '{count}টি পৃথক সরবরাহকারী অর্ডার তৈরি হবে',
  'Verified Bangladeshi suppliers & trade licences':
    'যাচাইকৃত বাংলাদেশি প্রস্তুতকারক ও ট্রেড লাইসেন্স',
  'Approve delivery charges before final payment':
    'চূড়ান্ত পেমেন্টের আগে ডেলিভারি চার্জ নিশ্চিত করুন',
  'Stock & tier prices reserved for 48 hours': '৪৮ ঘণ্টার জন্য মজুত ও পাইকারি দর সংরক্ষিত',
  'Paikarii Escrow': 'পাইকারি এসক্রো',
  '100% Escrow Protection': '১০০% এসক্রো সুরক্ষা',
  'Pay into Paikarii official bank account. Funds are held safely in escrow and only released to the supplier after you receive and confirm your delivery.':
    'পাইকারির নিজস্ব অফিসিয়াল ব্যাংক অ্যাকাউন্টে পেমেন্ট করুন। টাকা পাইকারির হেফাজতে (এসক্রো) সুরক্ষিত থাকে এবং পণ্য বুঝে পাওয়ার পরেই কেবল সরবরাহকারীকে অর্থ প্রদান করা হয়।',
  'Paikarii Safe Escrow Guarantee: You do not pay the merchant directly. Transfer funds to Paikarii official escrow bank account. Your payment is held securely in trust and is only disbursed to the supplier after you inspect and confirm delivery.':
    'পাইকারি নিরাপদ এসক্রো নিশ্চয়তা: আপনি সরবরাহকারীকে সরাসরি পেমেন্ট করবেন না। পাইকারির অফিসিয়াল ব্যাংক অ্যাকাউন্টে টাকা জমা দিন। আপনার অর্থ নিরাপদ থাকবে এবং পণ্য বুঝে পাওয়ার পরেই কেবল সরবরাহকারীকে দেওয়া হবে।',
  'Paikarii Escrow Bank Details': 'পাইকারি এসক্রো ব্যাংক হিসাবের বিবরণ',
  'Account Name': 'হিসাবের নাম',
  'Bank Name': 'ব্যাংকের নাম',
  'Account Number': 'হিসাব নম্বর',
  'Routing Number': 'রাউটিং নম্বর',
  'Deposit Reference': 'জমার রেফারেন্স',
  'Amount to Transfer': 'প্রদেয় টাকার পরিমাণ',
  'Copy account number': 'হিসাব নম্বর কপি করুন',
  'Copy routing number': 'রাউটিং নম্বর কপি করুন',
  'Copy deposit reference': 'রেফারেন্স কপি করুন',
  'How Paikarii Escrow Protects Your Money': 'পাইকারি এসক্রো যেভাবে আপনার অর্থ সুরক্ষিত রাখে',
  'Transfer to Paikarii': 'পাইকারির অ্যাকাউন্টে জমা দিন',
  'Report Payment': 'পেমেন্ট তথ্য জানান',
  'Funds Held in Escrow': 'এসক্রোতে অর্থ সংরক্ষিত',
  'Release upon Delivery': 'ডেলিভারি পেলে অর্থ ছাড়',
  'Merchant Fraud Protection Guarantee: The supplier is NOT paid until you inspect and accept your delivery. If items are defective or not received, your payment remains protected.':
    'প্রতারণা প্রতিরোধ নিশ্চয়তা: পণ্য বুঝে না নেওয়া পর্যন্ত সরবরাহকারী কোনো টাকা পাবেন না। পণ্য ত্রুটিপূর্ণ হলে বা না পৌঁছালে আপনার টাকা সুরক্ষিত থাকবে।',
  'Awaiting deposit into Paikarii Escrow': 'পাইকারি এসক্রোতে টাকা জমা দেওয়ার অপেক্ষায়',
  'Transfer funds to Paikarii Escrow bank account to authorize shipment.':
    'চালান পাঠানোর অনুমতি দিতে পাইকারি এসক্রো ব্যাংক হিসাবে টাকা জমা দিন।',
  'Bank deposit reported. Paikarii finance is verifying the statement credit.':
    'ব্যাংক পেমেন্ট জানানো হয়েছে। পাইকারির হিসাব বিভাগ স্টেটমেন্ট যাচাই করছে।',
  'Funds Secured in Paikarii Escrow': 'পাইকারি এসক্রোতে অর্থ সুরক্ষিত',
  'Your payment of {amount} is safely held in Paikarii Escrow. The supplier is preparing your order for dispatch. Funds will NOT be released to the supplier until you confirm delivery.':
    'আপনার {amount} টাকা পাইকারি এসক্রোতে সুরক্ষিতভাবে জমা আছে। সরবরাহকারী পণ্য পাঠাতে প্রস্তুত করছেন। আপনি পণ্য বুঝে নেওয়ার আগে কোনো অর্থ সরবরাহকারীকে দেওয়া হবে না।',
  'Payment of {amount} is verified and secured in Paikarii Escrow. Please dispatch the shipment. Payout will be transferred to your merchant account upon buyer delivery confirmation.':
    '{amount} টাকা পাইকারি এসক্রোতে যাচাই ও সংরক্ষিত। অনুগ্রহ করে পণ্য পাঠিয়ে দিন। ক্রেতা ডেলিভারি নিশ্চিত করলে আপনার ব্যাংক অ্যাকাউন্টে টাকা পাঠানো হবে।',
  'Escrow Released & Merchant Settled': 'এসক্রো সমাপ্ত ও সরবরাহকারীকে অর্থ প্রদান সম্পন্ন',
  'Buyer confirmed delivery. Paikarii has released the settlement payment to the merchant bank account.':
    'ক্রেতা পণ্য গ্রহণ নিশ্চিত করেছেন। পাইকারি সরবরাহকারীর ব্যাংক হিসাবে অর্থ পাঠিয়ে দিয়েছে।',
  'Deposit payment into Paikarii Escrow bank account. Shipment becomes available after the super admin verifies receipt.':
    'পাইকারি এসক্রো ব্যাংক হিসাবে টাকা জমা দিন। সুপার অ্যাডমিন অর্থপ্রাপ্তি যাচাই করলে চালান পাঠানো যাবে।',
  'Enter your bank deposit slip, transaction ID, or sender account number from your transfer to Paikarii official bank account. Paikarii finance will verify the credit before authorizing supplier dispatch.':
    'পাইকারির অফিসিয়াল ব্যাংক অ্যাকাউন্টে জমার ডিপোজিট স্লিপ, ট্রানজ্যাকশন আইডি বা প্রেরক হিসাব নম্বর লিখুন। চালান পাঠানোর আগে পাইকারির হিসাব বিভাগ এটি যাচাই করবে।',
  'Confirming receipt releases the escrow payment from Paikarii to the supplier. Only confirm after inspecting your delivery.':
    'পণ্যপ্রাপ্তি নিশ্চিত করলে পাইকারি থেকে সরবরাহকারীকে টাকা পাঠিয়ে দেওয়া হবে। পণ্য পুরোপুরি বুঝে নেওয়ার পরেই কেবল নিশ্চিত করুন।',
  'Paid via Paikarii Escrow Bank Account. Funds held securely in trust by Paikarii until buyer delivery confirmation.':
    'পাইকারি এসক্রো ব্যাংক অ্যাকাউন্টের মাধ্যমে পরিশোধিত। ক্রেতা পণ্য বুঝে না নেওয়া পর্যন্ত অর্থ পাইকারির হেফাজতে থাকে।',
  Orders: 'অর্ডার',
  'Order management': 'অর্ডার ব্যবস্থাপনা',
  'PLATFORM OPERATIONS': 'প্ল্যাটফর্ম পরিচালনা',
  'Monitor fulfilment, verify external payments, and resolve order disputes.':
    'ডেলিভারির অগ্রগতি দেখুন, বাহ্যিক পেমেন্ট যাচাই করুন এবং অর্ডারের বিরোধ নিষ্পত্তি করুন।',
  'Follow every supplier order from confirmation to delivery.':
    'নিশ্চিতকরণ থেকে ডেলিভারি পর্যন্ত প্রতিটি অর্ডারের অগ্রগতি দেখুন।',
  'Open orders': 'চলমান অর্ডার',
  Disputes: 'বিরোধ',
  'Refunds to verify': 'ফেরত যাচাই বাকি',
  'Search orders': 'অর্ডার খুঁজুন',
  'Order number, supplier or buyer': 'অর্ডার নম্বর, সরবরাহকারী বা ক্রেতা',
  'Loading orders…': 'অর্ডার লোড হচ্ছে…',
  'No orders found': 'কোনো অর্ডার পাওয়া যায়নি',
  'Orders matching your search will appear here.':
    'আপনার অনুসন্ধানের সঙ্গে মিলে যাওয়া অর্ডার এখানে দেখা যাবে।',
  Payment: 'পেমেন্ট',
  'Total orders': 'মোট অর্ডার',
  'Order pagination': 'অর্ডারের পৃষ্ঠা',
  'Awaiting supplier': 'সরবরাহকারীর অপেক্ষায়',
  'Review delivery terms': 'ডেলিভারির শর্ত দেখুন',
  'Preparing order': 'অর্ডার প্রস্তুত হচ্ছে',
  Shipped: 'পাঠানো হয়েছে',
  'In dispute': 'বিরোধ চলমান',
  Unpaid: 'অপরিশোধিত',
  'Payment reported': 'পেমেন্ট জানানো হয়েছে',
  Paid: 'পরিশোধিত',
  'Refund pending': 'ফেরত বাকি',
  Refunded: 'ফেরত দেওয়া হয়েছে',
  'Order placed': 'অর্ডার দেওয়া হয়েছে',
  'Supplier confirmed': 'সরবরাহকারী নিশ্চিত করেছেন',
  'Delivery terms accepted': 'ডেলিভারির শর্ত গৃহীত',
  'Order cancelled': 'অর্ডার বাতিল হয়েছে',
  'Cancellation requested': 'বাতিলের অনুরোধ এসেছে',
  'Cancellation declined': 'বাতিলের অনুরোধ প্রত্যাখ্যাত',
  'Shipment dispatched': 'চালান পাঠানো হয়েছে',
  'Receipt confirmed': 'পণ্যপ্রাপ্তি নিশ্চিত',
  'Bank payment reported': 'ব্যাংক পেমেন্ট জানানো হয়েছে',
  'Payment verified': 'পেমেন্ট যাচাইকৃত',
  'Refund verified': 'ফেরত যাচাইকৃত',
  'Dispute opened': 'বিরোধ উত্থাপিত',
  'Dispute resolved: cancelled': 'বিরোধ নিষ্পত্তি: বাতিল',
  'Dispute resolved: resumed': 'বিরোধ নিষ্পত্তি: পুনরায় চালু',
  'Dispute resolved: completed': 'বিরোধ নিষ্পত্তি: সম্পন্ন',
  'Order note': 'অর্ডারের নোট',
  'Order expired': 'অর্ডারের সময় শেষ',
  'Confirm availability & delivery': 'মজুত ও ডেলিভারি নিশ্চিত করুন',
  'Accept final total': 'চূড়ান্ত মোট গ্রহণ করুন',
  'Cancel order': 'অর্ডার বাতিল করুন',
  'Request cancellation': 'বাতিলের অনুরোধ করুন',
  'Decline cancellation': 'বাতিলের অনুরোধ প্রত্যাখ্যান করুন',
  'Dispatch shipment': 'চালান পাঠান',
  'Confirm received': 'পণ্যপ্রাপ্তি নিশ্চিত করুন',
  'Report bank payment': 'ব্যাংক পেমেন্ট জানান',
  'Verify external payment': 'বাহ্যিক পেমেন্ট যাচাই করুন',
  'Verify completed refund': 'সম্পন্ন ফেরত যাচাই করুন',
  'Open dispute': 'বিরোধ জানান',
  'Resolve and cancel': 'নিষ্পত্তি করে বাতিল করুন',
  'Resume order': 'অর্ডার পুনরায় চালু করুন',
  'Resolve as delivered': 'ডেলিভারি হিসেবে নিষ্পত্তি করুন',
  'Add order note': 'অর্ডারের নোট যোগ করুন',
  'Final total': 'চূড়ান্ত মোট',
  'This includes the supplier-confirmed delivery charge. Accepting starts fulfilment.':
    'এর মধ্যে সরবরাহকারী নিশ্চিত করা ডেলিভারি চার্জ রয়েছে। গ্রহণ করলে অর্ডারের কাজ শুরু হবে।',
  'Confirm only after you have received and checked the goods.':
    'পণ্য গ্রহণ ও পরীক্ষা করার পরেই নিশ্চিত করুন।',
  'This reports your payment for review. It does not mark the order as paid.':
    'এটি পেমেন্ট পর্যালোচনার অনুরোধ। এতে অর্ডার পরিশোধিত হিসেবে চিহ্নিত হয় না।',
  'This records an externally verified transaction. Paikarii.com does not move money.':
    '\u098f\u099f\u09bf \u09ac\u09be\u09b9\u09cd\u09af\u09bf\u0995\u09ad\u09be\u09ac\u09c7 \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u09b2\u09c7\u09a8\u09a6\u09c7\u09a8 \u09a8\u09a5\u09bf\u09ad\u09c1\u0995\u09cd\u09a4 \u0995\u09b0\u09c7\u0964 Paikarii.com \u0985\u09b0\u09cd\u09a5 \u09b8\u09cd\u09a5\u09be\u09a8\u09be\u09a8\u09cd\u09a4\u09b0 \u0995\u09b0\u09c7 \u09a8\u09be\u0964',
  'Transaction / receipt reference': 'লেনদেন / রসিদের রেফারেন্স',
  'Delivery charge (BDT)': 'ডেলিভারি চার্জ (টাকা)',
  'Carrier / delivery service': 'কুরিয়ার / ডেলিভারি সেবা',
  'Tracking / consignment number': 'ট্র্যাকিং / চালান নম্বর',
  'Confirm only after the shipment has been handed to the carrier.':
    'কুরিয়ারের কাছে চালান হস্তান্তরের পরেই নিশ্চিত করুন।',
  'Reason / decision': 'কারণ / সিদ্ধান্ত',
  'Note (optional)': 'নোট (ঐচ্ছিক)',
  'Order details': 'অর্ডারের বিস্তারিত',
  'Loading order…': 'অর্ডার লোড হচ্ছে…',
  'All orders': 'সব অর্ডার',
  'Print order': 'অর্ডার প্রিন্ট করুন',
  'Order progress': 'অর্ডারের অগ্রগতি',
  'The buyer requested cancellation. Shipment is paused until the supplier responds or the dispute is resolved.':
    'ক্রেতা বাতিলের অনুরোধ করেছেন। সরবরাহকারীর উত্তর বা বিরোধ নিষ্পত্তি পর্যন্ত চালান পাঠানো স্থগিত রয়েছে।',
  'Order items': 'অর্ডারের পণ্য',
  'Delivery & participants': 'ডেলিভারি ও অংশগ্রহণকারী',
  'Tracking reference': 'ট্র্যাকিং রেফারেন্স',
  'Buyer note': 'ক্রেতার নোট',
  'Supplier note': 'সরবরাহকারীর নোট',
  'Disputes & decisions': 'বিরোধ ও সিদ্ধান্ত',
  'Order history': 'অর্ডারের ইতিহাস',
  'Next steps': 'পরবর্তী ধাপ',
  'Confirmation deadline': 'নিশ্চিতকরণের শেষ সময়',
  'The supplier will confirm availability and delivery charges. You will review the final total before fulfilment.':
    'সরবরাহকারী মজুত ও ডেলিভারি চার্জ নিশ্চিত করবেন। কাজ শুরু হওয়ার আগে আপনি চূড়ান্ত মোট পর্যালোচনা করবেন।',
  'Arrange bank payment with the supplier. Shipment becomes available after the super admin verifies receipt.':
    'সরবরাহকারীর সঙ্গে ব্যাংক পেমেন্টের ব্যবস্থা করুন। সুপার অ্যাডমিন অর্থপ্রাপ্তি যাচাই করলে চালান পাঠানো যাবে।',
  'Fulfilment is paused while the super admin reviews the dispute.':
    'সুপার অ্যাডমিন বিরোধ পর্যালোচনা করার সময় অর্ডারের কাজ স্থগিত থাকবে।',
  'Payment record': 'পেমেন্টের নথি',
  'Payments and refunds happen outside Paikarii.com. Only the super admin can mark them verified after checking external evidence.':
    '\u09aa\u09c7\u09ae\u09c7\u09a8\u09cd\u099f \u0993 \u0985\u09b0\u09cd\u09a5 \u09ab\u09c7\u09b0\u09a4 Paikarii.com-\u098f\u09b0 \u09ac\u09be\u0987\u09b0\u09c7 \u09b8\u09ae\u09cd\u09aa\u09a8\u09cd\u09a8 \u09b9\u09af\u09bc\u0964 \u09b6\u09c1\u09a7\u09c1 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u09ac\u09be\u09b9\u09cd\u09af\u09bf\u0995 \u09aa\u09cd\u09b0\u09ae\u09be\u09a3 \u09aa\u09b0\u09c0\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c7 \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u09b9\u09bf\u09b8\u09c7\u09ac\u09c7 \u099a\u09bf\u09b9\u09cd\u09a8\u09bf\u09a4 \u0995\u09b0\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8\u0964',
  System: 'সিস্টেম',
  'Order changed. Refresh before trying again':
    'অর্ডার পরিবর্তিত হয়েছে। আবার চেষ্টা করার আগে রিফ্রেশ করুন',
  'Explain the reason in at least 10 characters': 'অন্তত ১০ অক্ষরে কারণ ব্যাখ্যা করুন',
  'Enter the payment or refund reference': 'পেমেন্ট বা অর্থ ফেরতের রেফারেন্স লিখুন',
  'Select a valid division and district': 'সঠিক বিভাগ ও জেলা নির্বাচন করুন',
  'Enter a valid Bangladesh mobile number': 'বাংলাদেশের সঠিক মোবাইল নম্বর লিখুন',
  'Order with supplier confirmation · Cash on delivery or bank transfer':
    'সরবরাহকারীর নিশ্চিতকরণে অর্ডার · ক্যাশ অন ডেলিভারি বা ব্যাংক ট্রান্সফার',
  order_update: 'অর্ডারের আপডেট',
  Read: 'পড়া হয়েছে',
  Sent: 'পাঠানো হয়েছে',
  'Close chat notice': 'চ্যাটের বিজ্ঞপ্তি বন্ধ করুন',
  'Open messages': 'বার্তা খুলুন',
  'Supplier chat': 'সরবরাহকারীর সঙ্গে চ্যাট',
  'Open full inbox': 'সম্পূর্ণ ইনবক্স খুলুন',
  'Minimize chat': 'চ্যাট ছোট করুন',
  'Close chat': 'চ্যাট বন্ধ করুন',
  'Chat now': 'এখন চ্যাট করুন',
  'Unread messages': 'অপঠিত বার্তা',
  'Check for new messages': 'নতুন বার্তা দেখুন',
  'Remove product context': 'পণ্যের প্রসঙ্গ সরান',
  'Suggested messages': 'প্রস্তাবিত বার্তা',
  'Load more conversations': 'আরও কথোপকথন দেখুন',
  'Please share your wholesale prices.': 'অনুগ্রহ করে পাইকারি দাম জানান।',
  'Is this quantity available?': 'এই পরিমাণ পণ্য কি পাওয়া যাবে?',
  'What are the delivery terms?': 'ডেলিভারির শর্ত কী?',
  'Thank you for your inquiry.': 'আপনার অনুসন্ধানের জন্য ধন্যবাদ।',
  'What quantity do you need?': 'আপনার কত পরিমাণ প্রয়োজন?',
  'Please share your delivery location.': 'অনুগ্রহ করে ডেলিভারির ঠিকানা জানান।',
  'Buyer account required to start supplier chat':
    'সরবরাহকারীর সঙ্গে চ্যাট শুরু করতে ক্রেতার অ্যাকাউন্ট প্রয়োজন',
  'Conversation access denied': 'এই কথোপকথনে প্রবেশের অনুমতি নেই',
  'New conversations are unavailable for this account or supplier':
    'এই অ্যাকাউন্ট বা সরবরাহকারীর জন্য নতুন কথোপকথন চালু করা যাচ্ছে না',
  'Product unavailable for this conversation': 'এই কথোপকথনে পণ্যটি ব্যবহার করা যাচ্ছে না',
  'Supplier labels changed. Reload before saving.':
    'লেবেল পরিবর্তিত হয়েছে। সংরক্ষণের আগে পৃষ্ঠাটি রিফ্রেশ করুন।',
  'Warning changed. Reload before reviewing.':
    'সতর্কবার্তা পরিবর্তিত হয়েছে। পর্যালোচনার আগে পৃষ্ঠাটি রিফ্রেশ করুন।',
  'Warning changed. Reload before responding.':
    'সতর্কবার্তা পরিবর্তিত হয়েছে। উত্তর দেওয়ার আগে পৃষ্ঠাটি রিফ্রেশ করুন।',
  'Warning is already closed': 'সতর্কবার্তাটি ইতোমধ্যে বন্ধ হয়েছে',
  'Choose today or a future correction deadline':
    'সংশোধনের সময়সীমা হিসেবে আজ বা ভবিষ্যতের তারিখ বেছে নিন',
  'A renewal reminder was already sent within 24 hours':
    'গত ২৪ ঘণ্টায় একটি নবায়নের স্মরণবার্তা পাঠানো হয়েছে',
  'A replacement application is already awaiting review':
    'একটি নতুন আবেদন ইতোমধ্যে পর্যালোচনার অপেক্ষায় আছে',
  'Supplier records': 'সরবরাহকারীর তালিকা',
  Retry: 'আবার চেষ্টা করুন',
  Saved: 'সংরক্ষিত',
  Archived: 'আর্কাইভ করা হয়েছে',
  Complete: 'সম্পূর্ণ',
  notice: 'নোটিশ',
  warning: 'সতর্কবার্তা',
  'Last sign-in': 'সর্বশেষ লগইন',
  'Verification renewals': 'যাচাই নবায়ন',
  'Supplier workspace': 'সরবরাহকারীর কর্মক্ষেত্র',
  'Manage supplier': 'সরবরাহকারী পরিচালনা',
  'SUPPLIER OPERATIONS': 'সরবরাহকারী কার্যক্রম',
  'Follow supplier activity, record internal context, and track corrective actions.':
    'সরবরাহকারীর কার্যক্রম দেখুন, অভ্যন্তরীণ নোট রাখুন এবং সংশোধনের অগ্রগতি অনুসরণ করুন।',
  'Follow-up needed': 'অনুসরণ প্রয়োজন',
  Activity: 'কার্যক্রম',
  Warnings: 'সতর্কবার্তা',
  Labels: 'লেবেল',
  Label: 'লেবেল',
  'Approved products': 'অনুমোদিত পণ্য',
  'Unanswered quotations': 'উত্তরহীন দরপত্র',
  'Conversations awaiting supplier reply': 'সরবরাহকারীর উত্তরের অপেক্ষায় কথোপকথন',
  'Active warnings': 'সক্রিয় সতর্কবার্তা',
  Overdue: 'সময়সীমা পার হয়েছে',
  'No suppliers found': 'কোনো সরবরাহকারী পাওয়া যায়নি',
  'Private operational workspace. Notes and labels are visible only to the super admin.':
    'ব্যক্তিগত পরিচালনার কর্মক্ষেত্র। নোট এবং লেবেল কেবল সুপার অ্যাডমিন দেখতে পারেন।',
  'Unverified supplier': 'অযাচাইকৃত সরবরাহকারী',
  'Activity overview': 'কার্যক্রমের সারসংক্ষেপ',
  'Profile completion': 'প্রোফাইলের সম্পূর্ণতা',
  'Needs attention': 'মনোযোগ প্রয়োজন',
  'Last supplier activity': 'সরবরাহকারীর সর্বশেষ কার্যক্রম',
  'Activity includes business edits, product updates, supplier messages, and quotation responses.':
    'ব্যবসার তথ্য সম্পাদনা, পণ্যের আপডেট, সরবরাহকারীর বার্তা ও দরপত্রের উত্তর কার্যক্রমে অন্তর্ভুক্ত।',
  'Internal labels': 'অভ্যন্তরীণ লেবেল',
  'Labels separated by commas': 'কমা দিয়ে পৃথক লেবেল',
  'Up to 10 labels, 2–40 characters each. Super admin only.':
    'সর্বোচ্চ ১০টি লেবেল, প্রতিটি ২–৪০ অক্ষরের। শুধু সুপার অ্যাডমিনের জন্য।',
  'Save labels': 'লেবেল সংরক্ষণ',
  'Internal notes': 'অভ্যন্তরীণ নোট',
  'Keep operational notes here. Do not copy identity or bank details.':
    'পরিচালনার নোট এখানে রাখুন। পরিচয়পত্র বা ব্যাংকের তথ্য লিখবেন না।',
  'New internal note': 'নতুন অভ্যন্তরীণ নোট',
  'Add note': 'নোট যোগ করুন',
  'Archive note': 'নোট আর্কাইভ করুন',
  'No internal notes yet': 'এখনো কোনো অভ্যন্তরীণ নোট নেই',
  'Warnings & corrective actions': 'সতর্কবার্তা ও সংশোধনী পদক্ষেপ',
  'Suppliers can read warnings and respond. Overdue actions never suspend an account automatically.':
    'সরবরাহকারীরা সতর্কবার্তা পড়তে ও উত্তর দিতে পারেন। সময়সীমা পেরোলে অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে স্থগিত হয় না।',
  'Warning status': 'সতর্কবার্তার অবস্থা',
  'Resolve warning': 'সতর্কবার্তা নিষ্পত্তি',
  'Dismiss warning': 'সতর্কবার্তা খারিজ',
  'No warnings found': 'কোনো সতর্কবার্তা পাওয়া যায়নি',
  'Issue warning': 'সতর্কবার্তা দিন',
  'Warning title': 'সতর্কবার্তার শিরোনাম',
  'Warning message': 'সতর্কবার্তার বার্তা',
  'Required corrective action': 'প্রয়োজনীয় সংশোধনী পদক্ষেপ',
  Severity: 'গুরুত্ব',
  'Correction deadline': 'সংশোধনের সময়সীমা',
  'Deadlines end at midnight Bangladesh time. A notification will be sent to the supplier.':
    'বাংলাদেশ সময় দিন শেষে সময়সীমা শেষ হবে। সরবরাহকারীকে একটি বিজ্ঞপ্তি পাঠানো হবে।',
  'Send warning': 'সতর্কবার্তা পাঠান',
  'The supplier will receive this warning. It will be recorded in audit history.':
    'সরবরাহকারী এই সতর্কবার্তা পাবেন। এটি অডিট ইতিহাসে সংরক্ষিত হবে।',
  'Action history': 'পদক্ষেপের ইতিহাস',
  final_warning: 'চূড়ান্ত সতর্কবার্তা',
  response_submitted: 'উত্তর জমা হয়েছে',
  issued: 'জারি করা হয়েছে',
  'Review expired and soon-to-expire approvals. Send a renewal reminder when follow-up is needed.':
    'মেয়াদোত্তীর্ণ ও শীঘ্রই মেয়াদ শেষ হবে এমন অনুমোদন দেখুন। প্রয়োজনে নবায়নের স্মরণবার্তা পাঠান।',
  'Expiry window': 'মেয়াদের সীমা',
  'Earliest expiry first. Expired approvals remain in this queue until renewed. Reminders are limited to one per supplier every 24 hours.':
    'আগে শেষ হওয়া মেয়াদ প্রথমে। নবায়ন না হওয়া পর্যন্ত মেয়াদোত্তীর্ণ অনুমোদন এখানে থাকবে। প্রতি সরবরাহকারীকে ২৪ ঘণ্টায় একবার স্মরণবার্তা পাঠানো যাবে।',
  'Renewal reminder sent': 'নবায়নের স্মরণবার্তা পাঠানো হয়েছে',
  'Renewal status': 'নবায়নের অবস্থা',
  'days remaining': 'দিন বাকি',
  'Send renewal reminder': 'নবায়নের স্মরণবার্তা পাঠান',
  'Send an in-app reminder to prepare renewed verification evidence.':
    'নবায়নের প্রমাণ প্রস্তুত করতে অ্যাপে স্মরণবার্তা পাঠান।',
  'No renewals due': 'এখন কোনো নবায়ন প্রয়োজন নেই',
  'Supplier action centre': 'সরবরাহকারীর করণীয় কেন্দ্র',
  'Read platform feedback, complete corrective actions, and send your response.':
    'প্ল্যাটফর্মের মতামত পড়ুন, সংশোধন সম্পন্ন করুন এবং উত্তর পাঠান।',
  'No actions required': 'কোনো করণীয় নেই',
  'Platform warnings and corrective actions will appear here.':
    'প্ল্যাটফর্মের সতর্কবার্তা ও সংশোধনী পদক্ষেপ এখানে দেখা যাবে।',
  'Your correction response': 'সংশোধন সম্পর্কে আপনার উত্তর',
  'Explain what you corrected. Do not include identity or bank account numbers.':
    'কী সংশোধন করেছেন তা ব্যাখ্যা করুন। পরিচয়পত্র বা ব্যাংক অ্যাকাউন্ট নম্বর লিখবেন না।',
  'Submit response': 'উত্তর জমা দিন',
  supplier_warning: 'সরবরাহকারীর সতর্কবার্তা',
  verification_renewal: 'যাচাই নবায়ন',
  'Privacy policy':
    '\u0997\u09cb\u09aa\u09a8\u09c0\u09af\u09bc\u09a4\u09be \u09a8\u09c0\u09a4\u09bf',
  'Information stored': '\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09a4\u09a5\u09cd\u09af',
  'Public and private information':
    '\u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09cd\u09af \u0993 \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a4\u09a5\u09cd\u09af',
  'Retention and requests':
    '\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0993 \u0985\u09a8\u09c1\u09b0\u09cb\u09a7',
  'Browser storage':
    '\u09ac\u09cd\u09b0\u09be\u0989\u099c\u09be\u09b0\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3',
  'This launch draft describes the application\u2019s data handling. The marketplace operator must add its legal identity and contact details before public launch.':
    '\u098f\u0987 \u09aa\u09cd\u09b0\u09be\u09a5\u09ae\u09bf\u0995 \u0996\u09b8\u09a1\u09bc\u09be\u09af\u09bc \u0985\u09cd\u09af\u09be\u09aa\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af \u09ac\u09cd\u09af\u09ac\u09b8\u09cd\u09a5\u09be\u09aa\u09a8\u09be \u09ac\u09b0\u09cd\u09a3\u09bf\u09a4 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964 \u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09cd\u09af\u09c7 \u099a\u09be\u09b2\u09c1\u09b0 \u0986\u0997\u09c7 \u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8 \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u09a8\u09be\u0995\u09be\u09b0\u09c0\u09b0 \u0986\u0987\u09a8\u0997\u09a4 \u09aa\u09b0\u09bf\u099a\u09af\u09bc \u0993 \u09af\u09cb\u0997\u09be\u09af\u09cb\u0997\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af \u09af\u09cb\u0997 \u0995\u09b0\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
  'We store account identity, profile contact details, business listings, uploaded documents, saved items, quotation requests, and messages in the connected Supabase Cloud project.':
    '\u09b8\u0982\u09af\u09c1\u0995\u09cd\u09a4 Supabase Cloud \u09aa\u09cd\u09b0\u0995\u09b2\u09cd\u09aa\u09c7 \u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f\u09c7\u09b0 \u09aa\u09b0\u09bf\u099a\u09af\u09bc, \u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u09af\u09cb\u0997\u09be\u09af\u09cb\u0997\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af, \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u09a4\u09be\u09b2\u09bf\u0995\u09be, \u0986\u09aa\u09b2\u09cb\u09a1 \u0995\u09b0\u09be \u09a8\u09a5\u09bf, \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09aa\u09a3\u09cd\u09af, \u09a6\u09b0\u09aa\u09a4\u09cd\u09b0\u09c7\u09b0 \u0985\u09a8\u09c1\u09b0\u09cb\u09a7 \u0993 \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09be \u09b9\u09af\u09bc\u0964',
  'Approved products and safe business profile details are public. Profile phone numbers, verification documents, quotations, and conversations are restricted by access policies. Authorized reviewers can access documents for verification.':
    '\u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09bf\u09a4 \u09aa\u09a3\u09cd\u09af \u0993 \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u09a8\u09bf\u09b0\u09be\u09aa\u09a6 \u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af \u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09cd\u09af\u0964 \u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u09ab\u09cb\u09a8 \u09a8\u09ae\u09cd\u09ac\u09b0, \u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u09a8\u09a5\u09bf, \u09a6\u09b0\u09aa\u09a4\u09cd\u09b0 \u0993 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7\u09b0 \u09aa\u09cd\u09b0\u09ac\u09c7\u09b6\u09be\u09a7\u09bf\u0995\u09be\u09b0 \u09b8\u09c0\u09ae\u09bf\u09a4\u0964 \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09bf\u09a4 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u0995 \u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u09a8\u09a5\u09bf \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8\u0964',
  'The operator is responsible for defining retention periods and handling access, correction, and deletion requests. Contact details and the applicable legal basis must be finalized before launch.':
    '\u09a4\u09a5\u09cd\u09af \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3\u09c7\u09b0 \u09b8\u09ae\u09af\u09bc\u09b8\u09c0\u09ae\u09be \u09a8\u09bf\u09b0\u09cd\u09a7\u09be\u09b0\u09a3 \u098f\u09ac\u0982 \u09a4\u09a5\u09cd\u09af \u09a6\u09c7\u0996\u09be, \u09b8\u0982\u09b6\u09cb\u09a7\u09a8 \u0993 \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09be\u09b0 \u0985\u09a8\u09c1\u09b0\u09cb\u09a7 \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u09a8\u09be\u09b0 \u09a6\u09be\u09af\u09bc\u09bf\u09a4\u09cd\u09ac \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u09a8\u09be\u0995\u09be\u09b0\u09c0\u09b0\u0964 \u099a\u09be\u09b2\u09c1\u09b0 \u0986\u0997\u09c7 \u09af\u09cb\u0997\u09be\u09af\u09cb\u0997\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af \u0993 \u09aa\u09cd\u09b0\u09af\u09cb\u099c\u09cd\u09af \u0986\u0987\u09a8\u09bf \u09ad\u09bf\u09a4\u09cd\u09a4\u09bf \u099a\u09c2\u09a1\u09bc\u09be\u09a8\u09cd\u09a4 \u0995\u09b0\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
  'Authentication sessions and language preference are stored in your browser. Signing out clears the active authentication session.':
    '\u09b2\u0997\u0987\u09a8 \u09b8\u09c7\u09b6\u09a8 \u0993 \u09ad\u09be\u09b7\u09be\u09b0 \u09aa\u099b\u09a8\u09cd\u09a6 \u09ac\u09cd\u09b0\u09be\u0989\u099c\u09be\u09b0\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u0964 \u09b8\u09be\u0987\u09a8 \u0986\u0989\u099f \u0995\u09b0\u09b2\u09c7 \u09b8\u0995\u09cd\u09b0\u09bf\u09af\u09bc \u09b2\u0997\u0987\u09a8 \u09b8\u09c7\u09b6\u09a8 \u09ac\u09a8\u09cd\u09a7 \u09b9\u09af\u09bc\u0964',

  'Conversation monitoring':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09aa\u09b0\u09cd\u09af\u09ac\u09c7\u0995\u09cd\u09b7\u09a3',
  'View conversations': '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09a6\u09c7\u0996\u09c1\u09a8',
  'PLATFORM OVERSIGHT':
    '\u09aa\u09cd\u09b2\u09cd\u09af\u09be\u099f\u09ab\u09b0\u09cd\u09ae \u09a4\u09a6\u09be\u09b0\u0995\u09bf',
  'Review supplier\u2013customer conversations. Message content is available only after opening an audited review.':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u0993 \u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09b0 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0995\u09b0\u09c1\u09a8\u0964 \u09a8\u09bf\u09b0\u09c0\u0995\u09cd\u09b7\u09bf\u09a4 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0996\u09c1\u09b2\u09b2\u09c7 \u09ac\u09be\u09b0\u09cd\u09a4\u09be\u09b0 \u09ac\u09bf\u09b7\u09af\u09bc\u09ac\u09b8\u09cd\u09a4\u09c1 \u09a6\u09c7\u0996\u09be \u09af\u09be\u09ac\u09c7\u0964',
  'Read-only monitoring':
    '\u09b6\u09c1\u09a7\u09c1 \u09aa\u09a1\u09bc\u09be\u09b0 \u099c\u09a8\u09cd\u09af \u09aa\u09b0\u09cd\u09af\u09ac\u09c7\u0995\u09cd\u09b7\u09a3',
  Customer: '\u0995\u09cd\u09b0\u09c7\u09a4\u09be',
  'Supplier name or email':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0\u09b0 \u09a8\u09be\u09ae \u09ac\u09be \u0987\u09ae\u09c7\u0987\u09b2',
  'Customer name or email':
    '\u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09b0 \u09a8\u09be\u09ae \u09ac\u09be \u0987\u09ae\u09c7\u0987\u09b2',
  'Last activity from':
    '\u09b8\u09b0\u09cd\u09ac\u09b6\u09c7\u09b7 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae\u09c7\u09b0 \u09b6\u09c1\u09b0\u09c1\u09b0 \u09a4\u09be\u09b0\u09bf\u0996',
  'Last activity to':
    '\u09b8\u09b0\u09cd\u09ac\u09b6\u09c7\u09b7 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae\u09c7\u09b0 \u09b6\u09c7\u09b7 \u09a4\u09be\u09b0\u09bf\u0996',
  'Last activity':
    '\u09b8\u09b0\u09cd\u09ac\u09b6\u09c7\u09b7 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae',
  'Open conversation': '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u0996\u09c1\u09b2\u09c1\u09a8',
  'No conversations found':
    '\u0995\u09cb\u09a8\u09cb \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf',
  'Try different filters or wait for a supplier\u2013customer conversation.':
    '\u0985\u09a8\u09cd\u09af \u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8 \u0985\u09a5\u09ac\u09be \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u0993 \u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09b0 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c1\u09a8\u0964',
  'Every conversation opening is recorded in super admin audit history.':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u0996\u09cb\u09b2\u09be\u09b0 \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u0998\u099f\u09a8\u09be \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8\u09c7\u09b0 \u09a8\u09bf\u09b0\u09c0\u0995\u09cd\u09b7\u09be \u0987\u09a4\u09bf\u09b9\u09be\u09b8\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u0964',
  'Opening audited conversation\u2026':
    '\u09a8\u09bf\u09b0\u09c0\u0995\u09cd\u09b7\u09bf\u09a4 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u0996\u09cb\u09b2\u09be \u09b9\u099a\u09cd\u099b\u09c7\u2026',
  'AUDITED REVIEW':
    '\u09a8\u09bf\u09b0\u09c0\u0995\u09cd\u09b7\u09bf\u09a4 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be',
  'This access has been recorded. You can read the conversation but cannot send, edit, or delete messages.':
    '\u098f\u0987 \u09aa\u09cd\u09b0\u09ac\u09c7\u09b6 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09aa\u09a1\u09bc\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7\u09a8, \u09a4\u09ac\u09c7 \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09aa\u09be\u09a0\u09be\u09a8\u09cb, \u09b8\u09ae\u09cd\u09aa\u09be\u09a6\u09a8\u09be \u09ac\u09be \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09be \u09af\u09be\u09ac\u09c7 \u09a8\u09be\u0964',
  'View access history':
    '\u09aa\u09cd\u09b0\u09ac\u09c7\u09b6\u09c7\u09b0 \u0987\u09a4\u09bf\u09b9\u09be\u09b8 \u09a6\u09c7\u0996\u09c1\u09a8',
  'Conversation history':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7\u09b0 \u0987\u09a4\u09bf\u09b9\u09be\u09b8',
  'Updates every 15 seconds':
    '\u09aa\u09cd\u09b0\u09a4\u09bf \u09e7\u09eb \u09b8\u09c7\u0995\u09c7\u09a8\u09cd\u09a1\u09c7 \u0986\u09aa\u09a1\u09c7\u099f',
  'Monitored conversation messages':
    '\u09aa\u09b0\u09cd\u09af\u09ac\u09c7\u0995\u09cd\u09b7\u09bf\u09a4 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7\u09b0 \u09ac\u09be\u09b0\u09cd\u09a4\u09be',
  'Load older messages':
    '\u0986\u0997\u09c7\u09b0 \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09a6\u09c7\u0996\u09c1\u09a8',
  'No messages in this conversation yet.':
    '\u098f\u0987 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7 \u098f\u0996\u09a8\u0993 \u0995\u09cb\u09a8\u09cb \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09a8\u09c7\u0987\u0964',
  'Last checked':
    '\u09b8\u09b0\u09cd\u09ac\u09b6\u09c7\u09b7 \u09aa\u09b0\u09c0\u0995\u09cd\u09b7\u09be',
  Participants: '\u0985\u0982\u09b6\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0',
  'Conversation details':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af',
  Reference: '\u09b0\u09c7\u09ab\u09be\u09b0\u09c7\u09a8\u09cd\u09b8',
  'Participants and the platform super admin may access this conversation for marketplace oversight.':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8 \u09a4\u09a6\u09be\u09b0\u0995\u09bf\u09b0 \u099c\u09a8\u09cd\u09af \u0985\u0982\u09b6\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0 \u098f\u09ac\u0982 \u09aa\u09cd\u09b2\u09cd\u09af\u09be\u099f\u09ab\u09b0\u09cd\u09ae\u09c7\u09b0 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u098f\u0987 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8\u0964',
  'Participants and the super admin can access messages.':
    '\u0985\u0982\u09b6\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0 \u0993 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8\u0964',
  'Conversation oversight':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7\u09b0 \u09a4\u09a6\u09be\u09b0\u0995\u09bf',
  'Participants and the platform super admin may access supplier\u2013customer conversations for marketplace oversight. Super admin monitoring is read-only, and each conversation opening is recorded in restricted audit history. Staff administrators cannot monitor conversations.':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8 \u09a4\u09a6\u09be\u09b0\u0995\u09bf\u09b0 \u099c\u09a8\u09cd\u09af \u0985\u0982\u09b6\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0 \u0993 \u09aa\u09cd\u09b2\u09cd\u09af\u09be\u099f\u09ab\u09b0\u09cd\u09ae\u09c7\u09b0 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u0993 \u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09b0 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8\u0964 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u09b6\u09c1\u09a7\u09c1 \u09aa\u09a1\u09bc\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8 \u098f\u09ac\u0982 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u0996\u09cb\u09b2\u09be\u09b0 \u0998\u099f\u09a8\u09be \u09b8\u09c0\u09ae\u09bf\u09a4 \u09a8\u09bf\u09b0\u09c0\u0995\u09cd\u09b7\u09be \u0987\u09a4\u09bf\u09b9\u09be\u09b8\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u0964 \u09b8\u09cd\u099f\u09be\u09ab \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09aa\u09b0\u09cd\u09af\u09ac\u09c7\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8 \u09a8\u09be\u0964',

  'BUSINESS MESSAGING':
    '\u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09af\u09bc\u09bf\u0995 \u09ac\u09be\u09b0\u09cd\u09a4\u09be',
  'Turn buyer inquiries into lasting business relationships.':
    '\u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09b0 \u099c\u09bf\u099c\u09cd\u099e\u09be\u09b8\u09be \u09a5\u09c7\u0995\u09c7 \u09a6\u09c0\u09b0\u09cd\u0998\u09b8\u09cd\u09a5\u09be\u09af\u09bc\u09c0 \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09af\u09bc\u09bf\u0995 \u09b8\u09ae\u09cd\u09aa\u09b0\u09cd\u0995 \u0997\u09a1\u09bc\u09c1\u09a8\u0964',
  'Talk to suppliers and work out the details.':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0\u09b0 \u09b8\u0999\u09cd\u0997\u09c7 \u0995\u09a5\u09be \u09ac\u09b2\u09c7 \u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4 \u09a0\u09bf\u0995 \u0995\u09b0\u09c1\u09a8\u0964',
  'Private conversations':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8',
  'Business inbox':
    '\u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09af\u09bc\u09bf\u0995 \u0987\u09a8\u09ac\u0995\u09cd\u09b8',
  'Refresh conversations':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09b0\u09bf\u09ab\u09cd\u09b0\u09c7\u09b6 \u0995\u09b0\u09c1\u09a8',
  'Search conversations':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u0996\u09c1\u0981\u099c\u09c1\u09a8',
  'Search conversations\u2026':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u0996\u09c1\u0981\u099c\u09c1\u09a8\u2026',
  'All conversations': '\u09b8\u09ac \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8',
  'Recent first': '\u09b8\u09b0\u09cd\u09ac\u09b6\u09c7\u09b7 \u0986\u0997\u09c7',
  'Loading conversations\u2026':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09b2\u09cb\u09a1 \u09b9\u099a\u09cd\u099b\u09c7\u2026',
  You: '\u0986\u09aa\u09a8\u09bf',
  'Start the conversation':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8',
  'Buyer inquiry':
    '\u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09b0 \u099c\u09bf\u099c\u09cd\u099e\u09be\u09b8\u09be',
  'No matching conversations':
    '\u09ae\u09bf\u09b2 \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf',
  'No conversations yet':
    '\u098f\u0996\u09a8\u0993 \u0995\u09cb\u09a8\u09cb \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09a8\u09c7\u0987',
  'Try a different name or message.':
    '\u0985\u09a8\u09cd\u09af \u09a8\u09be\u09ae \u09ac\u09be \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09a6\u09bf\u09af\u09bc\u09c7 \u0996\u09c1\u0981\u099c\u09c1\u09a8\u0964',
  'Buyer inquiries will appear here.':
    '\u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09a6\u09c7\u09b0 \u099c\u09bf\u099c\u09cd\u099e\u09be\u09b8\u09be \u098f\u0996\u09be\u09a8\u09c7 \u09a6\u09c7\u0996\u09be \u09af\u09be\u09ac\u09c7\u0964',
  'Start a conversation from a product page.':
    '\u09aa\u09a3\u09cd\u09af\u09c7\u09b0 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be \u09a5\u09c7\u0995\u09c7 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8\u0964',
  'Only participants can read messages.':
    '\u09b6\u09c1\u09a7\u09c1 \u0985\u0982\u09b6\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0\u09b0\u09be \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09aa\u09a1\u09bc\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8\u0964',
  'Back to conversations':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7 \u09ab\u09bf\u09b0\u09c1\u09a8',
  'YOUR BUSINESS, CONNECTED':
    '\u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09af\u09bc\u09bf\u0995 \u09af\u09cb\u0997\u09be\u09af\u09cb\u0997, \u098f\u0995\u09b8\u09be\u09a5\u09c7',
  'Conversation unavailable':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u099a\u09cd\u099b\u09c7 \u09a8\u09be',
  'Choose a conversation to discuss quantities, pricing, and delivery terms.':
    '\u09aa\u09b0\u09bf\u09ae\u09be\u09a3, \u09a6\u09be\u09ae \u0993 \u09a1\u09c7\u09b2\u09bf\u09ad\u09be\u09b0\u09bf\u09b0 \u09b6\u09b0\u09cd\u09a4 \u09a8\u09bf\u09af\u09bc\u09c7 \u0995\u09a5\u09be \u09ac\u09b2\u09a4\u09c7 \u098f\u0995\u099f\u09bf \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8\u0964',
  'Live updates': '\u09b8\u09b0\u09be\u09b8\u09b0\u09bf \u0986\u09aa\u09a1\u09c7\u099f',
  'Refreshing periodically':
    '\u09a8\u09bf\u09af\u09bc\u09ae\u09bf\u09a4 \u0986\u09aa\u09a1\u09c7\u099f \u09b9\u099a\u09cd\u099b\u09c7',
  Private: '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4',
  'Conversation messages':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7\u09b0 \u09ac\u09be\u09b0\u09cd\u09a4\u09be',
  'Showing the latest 200 messages.':
    '\u09b8\u09b0\u09cd\u09ac\u09b6\u09c7\u09b7 \u09e8\u09e6\u09e6\u099f\u09bf \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09a6\u09c7\u0996\u09be\u09a8\u09cb \u09b9\u099a\u09cd\u099b\u09c7\u0964',
  'Sending\u2026': '\u09aa\u09be\u09a0\u09be\u09a8\u09cb \u09b9\u099a\u09cd\u099b\u09c7\u2026',
  Send: '\u09aa\u09be\u09a0\u09be\u09a8',
  'Enter to send \u00b7 Shift + Enter for a new line':
    '\u09aa\u09be\u09a0\u09be\u09a4\u09c7 Enter \u00b7 \u09a8\u09a4\u09c1\u09a8 \u09b2\u09be\u0987\u09a8\u09c7\u09b0 \u099c\u09a8\u09cd\u09af Shift + Enter',
  'Keep business details in this conversation.':
    '\u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4 \u098f\u0987 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8\u09c7 \u09b0\u09be\u0996\u09c1\u09a8\u0964',
  'Conversations could not be loaded.':
    '\u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u09b2\u09cb\u09a1 \u0995\u09b0\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf\u0964',

  'Set all three section decisions to Approved, then confirm the bank account-holder match to enable approval.':
    '\u09a4\u09bf\u09a8\u099f\u09bf \u09ac\u09bf\u09ad\u09be\u0997\u09c7\u09b0 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8, \u09a4\u09be\u09b0\u09aa\u09b0 \u09ac\u09cd\u09af\u09be\u0982\u0995 \u09b9\u09bf\u09b8\u09be\u09ac\u09c7\u09b0 \u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09ae\u09bf\u09b2 \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09b2\u09c7 \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09a8\u09c7\u09b0 \u09ac\u09be\u099f\u09a8 \u099a\u09be\u09b2\u09c1 \u09b9\u09ac\u09c7\u0964',

  Draft: '\u0996\u09b8\u09a1\u09bc\u09be',
  Expired: '\u09ae\u09c7\u09af\u09bc\u09be\u09a6\u09cb\u09a4\u09cd\u09a4\u09c0\u09b0\u09cd\u09a3',
  Revoked: '\u09ac\u09be\u09a4\u09bf\u09b2',
  Created: '\u09a4\u09c8\u09b0\u09bf\u09b0 \u09b8\u09ae\u09af\u09bc',

  'TRUST & VERIFICATION': '\u0986\u09b8\u09cd\u09a5\u09be \u0993 \u09af\u09be\u099a\u09be\u0987',
  'Matching applications':
    '\u09ae\u09bf\u09b2 \u09aa\u09be\u0993\u09af\u09bc\u09be \u0986\u09ac\u09c7\u09a6\u09a8',
  'Private documents. Accountable decisions.':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a8\u09a5\u09bf\u0964 \u09a6\u09be\u09af\u09bc\u09bf\u09a4\u09cd\u09ac\u09b6\u09c0\u09b2 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4\u0964',
  'Every review is recorded.':
    '\u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u0964',
  'Filter verification status':
    '\u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be \u09ac\u09be\u099b\u09be\u0987',
  'All applications': '\u09b8\u09ac \u0986\u09ac\u09c7\u09a6\u09a8',
  'Applications could not be loaded':
    '\u0986\u09ac\u09c7\u09a6\u09a8 \u09b2\u09cb\u09a1 \u0995\u09b0\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf',
  'No applications to show':
    '\u0995\u09cb\u09a8\u09cb \u0986\u09ac\u09c7\u09a6\u09a8 \u09a8\u09c7\u0987',
  'Applications will appear here when suppliers save or submit their verification.':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0\u09b0\u09be \u09af\u09be\u099a\u09be\u0987 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u09ac\u09be \u099c\u09ae\u09be \u09a6\u09bf\u09b2\u09c7 \u0986\u09ac\u09c7\u09a6\u09a8 \u098f\u0996\u09be\u09a8\u09c7 \u09a6\u09c7\u0996\u09be \u09af\u09be\u09ac\u09c7\u0964',
  'Clear filters': '\u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0 \u09ae\u09c1\u099b\u09c1\u09a8',
  'Verification checklist':
    '\u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u09a4\u09be\u09b2\u09bf\u0995\u09be',
  'Compare the account holder with the licensed business or owner.':
    '\u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8\u09c7\u09b0 \u09ac\u09cd\u09af\u09ac\u09b8\u09be \u09ac\u09be \u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09b8\u0999\u09cd\u0997\u09c7 \u09b9\u09bf\u09b8\u09be\u09ac\u09c7\u09b0 \u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af \u09ae\u09bf\u09b2\u09bf\u09af\u09bc\u09c7 \u09a6\u09c7\u0996\u09c1\u09a8\u0964',
  SECTION: '\u09ac\u09bf\u09ad\u09be\u0997',
  'To review':
    '\u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u09ac\u09be\u0995\u09bf',
  'REVIEW WORKSPACE':
    '\u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be\u09b0 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b7\u09c7\u09a4\u09cd\u09b0',
  'Final decision':
    '\u099a\u09c2\u09a1\u09bc\u09be\u09a8\u09cd\u09a4 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4',
  'Review each section before making a decision.':
    '\u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4\u09c7\u09b0 \u0986\u0997\u09c7 \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09ac\u09bf\u09ad\u09be\u0997 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0995\u09b0\u09c1\u09a8\u0964',
  'sections approved':
    '\u09ac\u09bf\u09ad\u09be\u0997 \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09bf\u09a4',
  'Review sections':
    '\u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be\u09b0 \u09ac\u09bf\u09ad\u09be\u0997',
  'Private feedback is visible only to the supplier and super admin.':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09ae\u09a4\u09be\u09ae\u09a4 \u09b6\u09c1\u09a7\u09c1 \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u0993 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7\u09a8\u0964',
  'VERIFICATION APPLICATION':
    '\u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u0986\u09ac\u09c7\u09a6\u09a8',
  'evidence files': '\u09aa\u09cd\u09b0\u09ae\u09be\u09a3\u09c7\u09b0 \u09ab\u09be\u0987\u09b2',
  'No decisions have been recorded yet.':
    '\u098f\u0996\u09a8\u0993 \u0995\u09cb\u09a8\u09cb \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u09a8\u09c7\u0993\u09af\u09bc\u09be \u09b9\u09af\u09bc\u09a8\u09bf\u0964',
  'No evidence uploaded':
    '\u0995\u09cb\u09a8\u09cb \u09aa\u09cd\u09b0\u09ae\u09be\u09a3 \u0986\u09aa\u09b2\u09cb\u09a1 \u0995\u09b0\u09be \u09b9\u09af\u09bc\u09a8\u09bf',
  Image: '\u099b\u09ac\u09bf',

  'Images are compressed automatically. Check that all text remains readable. PDFs are unchanged.':
    '\u099b\u09ac\u09bf \u09b8\u09cd\u09ac\u09af\u09bc\u0982\u0995\u09cd\u09b0\u09bf\u09af\u09bc\u09ad\u09be\u09ac\u09c7 \u0995\u09ae\u09cd\u09aa\u09cd\u09b0\u09c7\u09b8 \u09b9\u09af\u09bc\u0964 \u09b8\u09ac \u09b2\u09c7\u0996\u09be \u09b8\u09cd\u09aa\u09b7\u09cd\u099f\u09ad\u09be\u09ac\u09c7 \u09aa\u09a1\u09bc\u09be \u09af\u09be\u09af\u09bc \u0995\u09bf \u09a8\u09be \u09a6\u09c7\u0996\u09c1\u09a8\u0964 \u09aa\u09bf\u09a1\u09bf\u098f\u09ab \u0985\u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09bf\u09a4 \u09a5\u09be\u0995\u09c7\u0964',
  'Images are automatically compressed before upload. Source images up to 20 MB.':
    '\u0986\u09aa\u09b2\u09cb\u09a1\u09c7\u09b0 \u0986\u0997\u09c7 \u099b\u09ac\u09bf \u09b8\u09cd\u09ac\u09af\u09bc\u0982\u0995\u09cd\u09b0\u09bf\u09af\u09bc\u09ad\u09be\u09ac\u09c7 \u0995\u09ae\u09cd\u09aa\u09cd\u09b0\u09c7\u09b8 \u09b9\u09af\u09bc\u0964 \u09ae\u09c2\u09b2 \u099b\u09ac\u09bf \u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09e8\u09e6 \u098f\u09ae\u09ac\u09bf\u0964',

  Yes: '\u09b9\u09cd\u09af\u09be\u0981',
  No: '\u09a8\u09be',
  Document: '\u09a8\u09a5\u09bf',
  Preview: '\u09aa\u09cd\u09b0\u09bf\u09ad\u09bf\u0989',
  Submitted: '\u099c\u09ae\u09be\u09b0 \u09a4\u09be\u09b0\u09bf\u0996',
  'Supplier verification':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09af\u09be\u099a\u09be\u0987',
  'Verification document':
    '\u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u09a8\u09a5\u09bf',
  'Verification renewal due':
    '\u09af\u09be\u099a\u09be\u0987 \u09a8\u09ac\u09be\u09af\u09bc\u09a8\u09c7\u09b0 \u09b8\u09ae\u09af\u09bc \u09b9\u09af\u09bc\u09c7\u099b\u09c7',

  'Images or PDF. Up to five files, 10 MB each.':
    '\u099b\u09ac\u09bf \u09ac\u09be \u09aa\u09bf\u09a1\u09bf\u098f\u09ab\u0964 \u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09aa\u09be\u0981\u099a\u099f\u09bf \u09ab\u09be\u0987\u09b2, \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09e7\u09e6 \u098f\u09ae\u09ac\u09bf\u0964',
  'JPEG, PNG or WebP. Up to 10 MB.':
    'JPEG, PNG \u09ac\u09be WebP\u0964 \u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09e7\u09e6 \u098f\u09ae\u09ac\u09bf\u0964',
  'Complete the highlighted information before continuing.':
    '\u098f\u0997\u09cb\u09a8\u09cb\u09b0 \u0986\u0997\u09c7 \u099a\u09bf\u09b9\u09cd\u09a8\u09bf\u09a4 \u09a4\u09a5\u09cd\u09af \u09aa\u09c2\u09b0\u09a3 \u0995\u09b0\u09c1\u09a8\u0964',
  'Upload all required evidence before continuing.':
    '\u098f\u0997\u09cb\u09a8\u09cb\u09b0 \u0986\u0997\u09c7 \u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09b8\u09ac \u09a8\u09a5\u09bf \u0986\u09aa\u09b2\u09cb\u09a1 \u0995\u09b0\u09c1\u09a8\u0964',
  'Required information is missing or the date is invalid.':
    '\u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09a4\u09a5\u09cd\u09af \u09a8\u09c7\u0987 \u0985\u09a5\u09ac\u09be \u09a4\u09be\u09b0\u09bf\u0996 \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964',
  'Complete owner identity, trade licence and bank verification. Only you and the super admin can access your documents.':
    '\u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09aa\u09b0\u09bf\u099a\u09af\u09bc, \u099f\u09cd\u09b0\u09c7\u09a1 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8 \u0993 \u09ac\u09cd\u09af\u09be\u0982\u0995 \u09af\u09be\u099a\u09be\u0987 \u09b8\u09ae\u09cd\u09aa\u09a8\u09cd\u09a8 \u0995\u09b0\u09c1\u09a8\u0964 \u09b6\u09c1\u09a7\u09c1 \u0986\u09aa\u09a8\u09bf \u0993 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u0986\u09aa\u09a8\u09be\u09b0 \u09a8\u09a5\u09bf \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7\u09a8\u0964',
  'Prepare your owner ID, trade licence and bank proof before starting.':
    '\u09b6\u09c1\u09b0\u09c1\u09b0 \u0986\u0997\u09c7 \u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0, \u099f\u09cd\u09b0\u09c7\u09a1 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8 \u0993 \u09ac\u09cd\u09af\u09be\u0982\u0995\u09c7\u09b0 \u09aa\u09cd\u09b0\u09ae\u09be\u09a3 \u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4 \u09b0\u09be\u0996\u09c1\u09a8\u0964',
  'Complete all three steps and required evidence before submitting.':
    '\u099c\u09ae\u09be \u09a6\u09c7\u0993\u09af\u09bc\u09be\u09b0 \u0986\u0997\u09c7 \u09a4\u09bf\u09a8\u099f\u09bf \u09a7\u09be\u09aa \u0993 \u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09a8\u09a5\u09bf \u09b8\u09ae\u09cd\u09aa\u09a8\u09cd\u09a8 \u0995\u09b0\u09c1\u09a8\u0964',
  'I am authorized to submit these documents and confirm that the information is accurate.':
    '\u0986\u09ae\u09bf \u098f\u09b8\u09ac \u09a8\u09a5\u09bf \u099c\u09ae\u09be \u09a6\u09c7\u0993\u09af\u09bc\u09be\u09b0 \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09bf\u09a4 \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf \u098f\u09ac\u0982 \u09a4\u09a5\u09cd\u09af\u09c7\u09b0 \u09b8\u09a0\u09bf\u0995\u09a4\u09be \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u099b\u09bf\u0964',
  'Your complete application is awaiting super admin review. Submitted evidence is locked.':
    '\u0986\u09aa\u09a8\u09be\u09b0 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u0986\u09ac\u09c7\u09a6\u09a8 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8\u09c7\u09b0 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be\u09a7\u09c0\u09a8\u0964 \u099c\u09ae\u09be \u09a6\u09c7\u0993\u09af\u09bc\u09be \u09a8\u09a5\u09bf \u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8 \u0995\u09b0\u09be \u09af\u09be\u09ac\u09c7 \u09a8\u09be\u0964',
  'Review the decision below and submit a new revision when corrections or renewal are needed.':
    '\u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u09a6\u09c7\u0996\u09c1\u09a8 \u098f\u09ac\u0982 \u09b8\u0982\u09b6\u09cb\u09a7\u09a8 \u09ac\u09be \u09a8\u09ac\u09be\u09af\u09bc\u09a8\u09c7\u09b0 \u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c7 \u09a8\u09a4\u09c1\u09a8 \u09b8\u0982\u09b8\u09cd\u0995\u09b0\u09a3 \u099c\u09ae\u09be \u09a6\u09bf\u09a8\u0964',
  'Previous single-document submissions are retained as private history and do not grant complete verification.':
    '\u0986\u0997\u09c7\u09b0 \u098f\u0995\u0995 \u09a8\u09a5\u09bf\u09b0 \u0986\u09ac\u09c7\u09a6\u09a8 \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u0987\u09a4\u09bf\u09b9\u09be\u09b8 \u09b9\u09bf\u09b8\u09c7\u09ac\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4; \u098f\u09a4\u09c7 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u09af\u09be\u099a\u09be\u0987 \u09b9\u09af\u09bc \u09a8\u09be\u0964',
  'Review complete identity, trade licence and bank applications.':
    '\u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0, \u099f\u09cd\u09b0\u09c7\u09a1 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8 \u0993 \u09ac\u09cd\u09af\u09be\u0982\u0995\u09c7\u09b0 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u0986\u09ac\u09c7\u09a6\u09a8 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0995\u09b0\u09c1\u09a8\u0964',
  'Verification progress only. Private details are restricted to the supplier and super admin.':
    '\u09b6\u09c1\u09a7\u09c1 \u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u0985\u0997\u09cd\u09b0\u0997\u09a4\u09bf\u0964 \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a4\u09a5\u09cd\u09af \u0995\u09c7\u09ac\u09b2 \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u0993 \u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8\u09c7\u09b0 \u099c\u09a8\u09cd\u09af\u0964',
  'I checked all evidence and confirm the bank account belongs to the business or verified owner.':
    '\u09b8\u09ac \u09a8\u09a5\u09bf \u09aa\u09b0\u09c0\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c7 \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u099b\u09bf \u09af\u09c7 \u09ac\u09cd\u09af\u09be\u0982\u0995 \u09b9\u09bf\u09b8\u09be\u09ac\u099f\u09bf \u09ac\u09cd\u09af\u09ac\u09b8\u09be \u0985\u09a5\u09ac\u09be \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0\u0964',
  'This decision applies to the displayed application revision.':
    '\u098f\u0987 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u09aa\u09cd\u09b0\u09a6\u09b0\u09cd\u09b6\u09bf\u09a4 \u0986\u09ac\u09c7\u09a6\u09a8 \u09b8\u0982\u09b8\u09cd\u0995\u09b0\u09a3\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u09aa\u09cd\u09b0\u09af\u09cb\u099c\u09cd\u09af\u0964',
  'The verified badge will be removed. A reason is required.':
    '\u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u09ac\u09cd\u09af\u09be\u099c \u09b8\u09b0\u09bf\u09af\u09bc\u09c7 \u09a8\u09c7\u0993\u09af\u09bc\u09be \u09b9\u09ac\u09c7\u0964 \u0995\u09be\u09b0\u09a3 \u0986\u09ac\u09b6\u09cd\u09af\u0995\u0964',
  'Use an allowed file type, up to 10 MB.':
    '\u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09bf\u09a4 \u09ab\u09be\u0987\u09b2 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8, \u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09e7\u09e6 \u098f\u09ae\u09ac\u09bf\u0964',
  'Approve all three sections and confirm the account-holder match.':
    '\u09a4\u09bf\u09a8\u099f\u09bf \u09ac\u09bf\u09ad\u09be\u0997 \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09a8 \u0995\u09b0\u09c1\u09a8 \u098f\u09ac\u0982 \u09b9\u09bf\u09b8\u09be\u09ac\u09c7\u09b0 \u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09ae\u09bf\u09b2 \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8\u0964',
  'Select at least one section requiring corrections.':
    '\u09b8\u0982\u09b6\u09cb\u09a7\u09a8\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0985\u09a8\u09cd\u09a4\u09a4 \u098f\u0995\u099f\u09bf \u09ac\u09bf\u09ad\u09be\u0997 \u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09a8 \u0995\u09b0\u09c1\u09a8\u0964',
  'Explain the corrections for every flagged section.':
    '\u099a\u09bf\u09b9\u09cd\u09a8\u09bf\u09a4 \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09ac\u09bf\u09ad\u09be\u0997\u09c7\u09b0 \u09b8\u0982\u09b6\u09cb\u09a7\u09a8\u09c7\u09b0 \u0995\u09be\u09b0\u09a3 \u09b2\u09bf\u0996\u09c1\u09a8\u0964',
  'A reason is required.':
    '\u0995\u09be\u09b0\u09a3 \u09b2\u09bf\u0996\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',

  'Owner identity':
    '\u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09aa\u09b0\u09bf\u099a\u09af\u09bc',
  'Bank account': '\u09ac\u09cd\u09af\u09be\u0982\u0995 \u09b9\u09bf\u09b8\u09be\u09ac',
  'Review and submit':
    '\u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0993 \u099c\u09ae\u09be',
  'Legal name': '\u0986\u0987\u09a8\u0997\u09a4 \u09a8\u09be\u09ae',
  'Date of birth': '\u099c\u09a8\u09cd\u09ae\u09a4\u09be\u09b0\u09bf\u0996',
  'Residential address': '\u09ac\u09be\u09b8\u09be\u09b0 \u09a0\u09bf\u0995\u09be\u09a8\u09be',
  'Issuing country':
    '\u09aa\u09cd\u09b0\u09a6\u09be\u09a8\u0995\u09be\u09b0\u09c0 \u09a6\u09c7\u09b6',
  'Identity document type':
    '\u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0\u09c7\u09b0 \u09a7\u09b0\u09a8',
  'Document number':
    '\u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0 \u09a8\u09ae\u09cd\u09ac\u09b0',
  'Issue date': '\u09aa\u09cd\u09b0\u09a6\u09be\u09a8\u09c7\u09b0 \u09a4\u09be\u09b0\u09bf\u0996',
  'Expiry / valid-until date':
    '\u09ae\u09c7\u09af\u09bc\u09be\u09a6 \u09b6\u09c7\u09b7\u09c7\u09b0 \u09a4\u09be\u09b0\u09bf\u0996',
  'No expiry printed on NID':
    '\u098f\u09a8\u0986\u0987\u09a1\u09bf\u09a4\u09c7 \u09ae\u09c7\u09af\u09bc\u09be\u09a6 \u0989\u09b2\u09cd\u09b2\u09c7\u0996 \u09a8\u09c7\u0987',
  'Trade licence number':
    '\u099f\u09cd\u09b0\u09c7\u09a1 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8 \u09a8\u09ae\u09cd\u09ac\u09b0',
  'Registered business name':
    '\u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09bf\u09a4 \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u09a8\u09be\u09ae',
  'Proprietor / owner name':
    '\u09b8\u09cd\u09ac\u09a4\u09cd\u09ac\u09be\u09a7\u09bf\u0995\u09be\u09b0\u09c0 / \u09ae\u09be\u09b2\u09bf\u0995\u09c7\u09b0 \u09a8\u09be\u09ae',
  'Issuing authority':
    '\u09aa\u09cd\u09b0\u09a6\u09be\u09a8\u0995\u09be\u09b0\u09c0 \u0995\u09b0\u09cd\u09a4\u09c3\u09aa\u0995\u09cd\u09b7',
  'Licensed business address':
    '\u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8\u09c7 \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u09a0\u09bf\u0995\u09be\u09a8\u09be',
  'Bank name': '\u09ac\u09cd\u09af\u09be\u0982\u0995\u09c7\u09b0 \u09a8\u09be\u09ae',
  Branch: '\u09b6\u09be\u0996\u09be',
  'Account title': '\u09b9\u09bf\u09b8\u09be\u09ac\u09c7\u09b0 \u09a8\u09be\u09ae',
  'Account number': '\u09b9\u09bf\u09b8\u09be\u09ac \u09a8\u09ae\u09cd\u09ac\u09b0',
  'Account type': '\u09b9\u09bf\u09b8\u09be\u09ac\u09c7\u09b0 \u09a7\u09b0\u09a8',
  'Account belongs to': '\u09b9\u09bf\u09b8\u09be\u09ac\u09c7\u09b0 \u09ae\u09be\u09b2\u09bf\u0995',
  'Routing number (if applicable)':
    '\u09b0\u09be\u0989\u099f\u09bf\u0982 \u09a8\u09ae\u09cd\u09ac\u09b0 (\u09aa\u09cd\u09b0\u09af\u09cb\u099c\u09cd\u09af \u09b9\u09b2\u09c7)',
  'Identity front / passport identity page':
    '\u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0\u09c7\u09b0 \u09b8\u09be\u09ae\u09a8\u09c7\u09b0 \u0985\u0982\u09b6 / \u09aa\u09be\u09b8\u09aa\u09cb\u09b0\u09cd\u099f\u09c7\u09b0 \u09aa\u09b0\u09bf\u099a\u09bf\u09a4\u09bf \u09aa\u09c3\u09b7\u09cd\u09a0\u09be',
  'Identity back':
    '\u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0\u09c7\u09b0 \u09aa\u09c7\u099b\u09a8\u09c7\u09b0 \u0985\u0982\u09b6',
  'Trade licence':
    '\u099f\u09cd\u09b0\u09c7\u09a1 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8',
  'Chequebook account-information page / unsigned cheque leaf':
    '\u099a\u09c7\u0995\u09ac\u0987\u09af\u09bc\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af\u09c7\u09b0 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be / \u09b8\u09cd\u09ac\u09be\u0995\u09cd\u09b7\u09b0\u09ac\u09bf\u09b9\u09c0\u09a8 \u099a\u09c7\u0995',
  'Not provided': '\u09a6\u09c7\u0993\u09af\u09bc\u09be \u09b9\u09af\u09bc\u09a8\u09bf',
  'Remove document': '\u09a8\u09a5\u09bf \u09b8\u09b0\u09be\u09a8',
  'Upload document': '\u09a8\u09a5\u09bf \u0986\u09aa\u09b2\u09cb\u09a1 \u0995\u09b0\u09c1\u09a8',
  'Private document preview':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a8\u09a5\u09bf\u09b0 \u09aa\u09cd\u09b0\u09bf\u09ad\u09bf\u0989',
  'Private PDF document':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09aa\u09bf\u09a1\u09bf\u098f\u09ab \u09a8\u09a5\u09bf',
  'Open document in a new tab':
    '\u09a8\u09a4\u09c1\u09a8 \u099f\u09cd\u09af\u09be\u09ac\u09c7 \u09a8\u09a5\u09bf \u0996\u09c1\u09b2\u09c1\u09a8',
  'This private link expires after five minutes.':
    '\u098f\u0987 \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09b2\u09bf\u0982\u0995 \u09aa\u09be\u0981\u099a \u09ae\u09bf\u09a8\u09bf\u099f \u09aa\u09b0\u09c7 \u09ae\u09c7\u09af\u09bc\u09be\u09a6\u09cb\u09a4\u09cd\u09a4\u09c0\u09b0\u09cd\u09a3 \u09b9\u09ac\u09c7\u0964',
  'Save these details before uploading documents.':
    '\u09a8\u09a5\u09bf \u0986\u09aa\u09b2\u09cb\u09a1\u09c7\u09b0 \u0986\u0997\u09c7 \u09a4\u09a5\u09cd\u09af \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8\u0964',
  'Review application':
    '\u0986\u09ac\u09c7\u09a6\u09a8 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0995\u09b0\u09c1\u09a8',
  'Save and continue':
    '\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c7 \u098f\u0997\u09bf\u09af\u09bc\u09c7 \u09af\u09be\u09a8',
  'Loading verification\u2026':
    '\u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af \u09b2\u09cb\u09a1 \u09b9\u099a\u09cd\u099b\u09c7\u2026',
  'Start verification':
    '\u09af\u09be\u099a\u09be\u0987 \u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8',
  'Application revision':
    '\u0986\u09ac\u09c7\u09a6\u09a8\u09c7\u09b0 \u09b8\u0982\u09b8\u09cd\u0995\u09b0\u09a3',
  'Valid until': '\u09ae\u09c7\u09af\u09bc\u09be\u09a6',
  'Verification steps':
    '\u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u09a7\u09be\u09aa\u09b8\u09ae\u09c2\u09b9',
  'Submit complete application':
    '\u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u0986\u09ac\u09c7\u09a6\u09a8 \u099c\u09ae\u09be \u09a6\u09bf\u09a8',
  'Prepare renewal':
    '\u09a8\u09ac\u09be\u09af\u09bc\u09a8 \u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4 \u0995\u09b0\u09c1\u09a8',
  'Create corrected revision':
    '\u09b8\u0982\u09b6\u09cb\u09a7\u09bf\u09a4 \u09b8\u0982\u09b8\u09cd\u0995\u09b0\u09a3 \u09a4\u09c8\u09b0\u09bf \u0995\u09b0\u09c1\u09a8',
  'Back to current application':
    '\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u0986\u09ac\u09c7\u09a6\u09a8\u09c7 \u09ab\u09bf\u09b0\u09c1\u09a8',
  'Status only': '\u09b6\u09c1\u09a7\u09c1 \u0985\u09ac\u09b8\u09cd\u09a5\u09be',
  'Business and account-title comparison':
    '\u09ac\u09cd\u09af\u09ac\u09b8\u09be \u0993 \u09ac\u09cd\u09af\u09be\u0982\u0995 \u09b9\u09bf\u09b8\u09be\u09ac\u09c7\u09b0 \u09a8\u09be\u09ae \u09a4\u09c1\u09b2\u09a8\u09be',
  'Mask private numbers':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a8\u09ae\u09cd\u09ac\u09b0 \u0986\u09a1\u09bc\u09be\u09b2 \u0995\u09b0\u09c1\u09a8',
  'Reveal private numbers':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a8\u09ae\u09cd\u09ac\u09b0 \u09a6\u09c7\u0996\u09c1\u09a8',
  'Section decision':
    '\u098f\u0987 \u09ac\u09bf\u09ad\u09be\u0997\u09c7\u09b0 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4',
  'Needs corrections':
    '\u09b8\u0982\u09b6\u09cb\u09a7\u09a8 \u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8',
  'Private feedback to supplier':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0\u0995\u09c7 \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09ae\u09a4\u09be\u09ae\u09a4',
  'Decision reason':
    '\u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4\u09c7\u09b0 \u0995\u09be\u09b0\u09a3',
  'Approve supplier':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09a8 \u0995\u09b0\u09c1\u09a8',
  'Request corrections':
    '\u09b8\u0982\u09b6\u09cb\u09a7\u09a8 \u099a\u09c7\u09af\u09bc\u09c7 \u09aa\u09be\u09a0\u09be\u09a8',
  'Reject application':
    '\u0986\u09ac\u09c7\u09a6\u09a8 \u09aa\u09cd\u09b0\u09a4\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be\u09a8 \u0995\u09b0\u09c1\u09a8',
  'Revoke verification':
    '\u09af\u09be\u099a\u09be\u0987 \u09ac\u09be\u09a4\u09bf\u09b2 \u0995\u09b0\u09c1\u09a8',
  'Verification queue':
    '\u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7\u09b0 \u09a4\u09be\u09b2\u09bf\u0995\u09be',
  submitted: '\u099c\u09ae\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7',
  changes_requested:
    '\u09b8\u0982\u09b6\u09cb\u09a7\u09a8 \u099a\u09be\u0993\u09af\u09bc\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7',
  expired: '\u09ae\u09c7\u09af\u09bc\u09be\u09a6\u09cb\u09a4\u09cd\u09a4\u09c0\u09b0\u09cd\u09a3',
  revoked: '\u09ac\u09be\u09a4\u09bf\u09b2',
  nid: '\u099c\u09be\u09a4\u09c0\u09af\u09bc \u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0',
  driving_license:
    '\u09a1\u09cd\u09b0\u09be\u0987\u09ad\u09bf\u0982 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8',
  passport: '\u09aa\u09be\u09b8\u09aa\u09cb\u09b0\u09cd\u099f',
  current: '\u099a\u09b2\u09a4\u09bf \u09b9\u09bf\u09b8\u09be\u09ac',
  savings: '\u09b8\u099e\u09cd\u099a\u09af\u09bc\u09c0 \u09b9\u09bf\u09b8\u09be\u09ac',
  business: '\u09ac\u09cd\u09af\u09ac\u09b8\u09be',
  owner: '\u09ae\u09be\u09b2\u09bf\u0995',
  Bangladesh: '\u09ac\u09be\u0982\u09b2\u09be\u09a6\u09c7\u09b6',

  onboarding_reminder:
    '\u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8\u09c7\u09b0 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be',
  quotation_response:
    '\u09a6\u09b0\u09aa\u09a4\u09cd\u09b0\u09c7\u09b0 \u0989\u09a4\u09cd\u09a4\u09b0',
  quotation:
    '\u09a6\u09b0\u09aa\u09a4\u09cd\u09b0\u09c7\u09b0 \u0985\u09a8\u09c1\u09b0\u09cb\u09a7',
  staff_access: '\u09b8\u09cd\u099f\u09be\u09ab\u09c7\u09b0 \u0985\u09a7\u09bf\u0995\u09be\u09b0',
  account_status:
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f\u09c7\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be',
  verification_review:
    '\u09ac\u09cd\u09af\u09ac\u09b8\u09be \u09af\u09be\u099a\u09be\u0987\u0995\u09b0\u09a3',
  product_review:
    '\u09aa\u09a3\u09cd\u09af \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be',
  ready: '\u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4',
  products_pending:
    '\u09aa\u09a3\u09cd\u09af \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be\u09a7\u09c0\u09a8',
  products_missing: '\u09aa\u09a3\u09cd\u09af \u09af\u09cb\u0997 \u09b9\u09af\u09bc\u09a8\u09bf',
  documents_rejected:
    '\u09a8\u09a5\u09bf \u09aa\u09cd\u09b0\u09a4\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be\u09a4',
  documents_pending:
    '\u09a8\u09a5\u09bf \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be\u09a7\u09c0\u09a8',
  documents_missing: '\u09a8\u09a5\u09bf \u099c\u09ae\u09be \u09b9\u09af\u09bc\u09a8\u09bf',
  profile_missing:
    '\u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2 \u0985\u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3',
  'Read at': '\u09aa\u09a1\u09bc\u09be\u09b0 \u09b8\u09ae\u09af\u09bc',
  Notification: '\u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf',
  Recipient: '\u09aa\u09cd\u09b0\u09be\u09aa\u0995',
  'Event type': '\u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf\u09b0 \u09a7\u09b0\u09a8',
  'Delivery status':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u09c7\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be',
  'In-app delivery records. Delivered means stored in the recipient inbox; read means acknowledged.':
    '\u0985\u09cd\u09af\u09be\u09aa\u09c7\u09b0 \u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf\u09b0 \u09a4\u09be\u09b2\u09bf\u0995\u09be\u0964 \u09aa\u09cc\u0981\u099b\u09c7\u099b\u09c7 \u09ae\u09be\u09a8\u09c7 \u09aa\u09cd\u09b0\u09be\u09aa\u0995\u09c7\u09b0 \u0987\u09a8\u09ac\u0995\u09cd\u09b8\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4; \u09aa\u09a1\u09bc\u09be \u09ae\u09be\u09a8\u09c7 \u09aa\u09cd\u09b0\u09be\u09aa\u0995 \u09a6\u09c7\u0996\u09c7\u099b\u09c7\u09a8\u0964',
  'Send a predefined in-app reminder. The same reminder is limited to once per 24 hours.':
    '\u0987\u09a8\u09ac\u0995\u09cd\u09b8\u09c7 \u098f\u0995\u099f\u09bf \u09a8\u09bf\u09b0\u09cd\u09a7\u09be\u09b0\u09bf\u09a4 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09aa\u09be\u09a0\u09be\u09a8\u0964 \u098f\u0995\u0987 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09aa\u09cd\u09b0\u09a4\u09bf \u09e8\u09ea \u0998\u09a3\u09cd\u099f\u09be\u09af\u09bc \u098f\u0995\u09ac\u09be\u09b0 \u09aa\u09be\u09a0\u09be\u09a8\u09cb \u09af\u09be\u09af\u09bc\u0964',
  'Send listing reminder':
    '\u09aa\u09a3\u09cd\u09af\u09c7\u09b0 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09aa\u09be\u09a0\u09be\u09a8',
  'Send document reminder':
    '\u09a8\u09a5\u09bf\u09b0 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09aa\u09be\u09a0\u09be\u09a8',
  'Send profile reminder':
    '\u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09aa\u09be\u09a0\u09be\u09a8',
  'with images': '\u099b\u09ac\u09bf\u09b8\u09b9',
  listings: '\u09aa\u09a3\u09cd\u09af',
  'Review documents':
    '\u09a8\u09a5\u09bf \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be',
  'Profile incomplete':
    '\u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2 \u0985\u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3',
  'Profile complete':
    '\u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3',
  'Onboarding completion':
    '\u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8\u09c7\u09b0 \u0985\u0997\u09cd\u09b0\u0997\u09a4\u09bf',
  'Last reminder':
    '\u09b6\u09c7\u09b7 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be',
  'Business profile missing':
    '\u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2 \u09a8\u09c7\u0987',
  Progress: '\u0985\u0997\u09cd\u09b0\u0997\u09a4\u09bf',
  Supplier: '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0',
  'Onboarding stage': '\u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8\u09c7\u09b0 \u09a7\u09be\u09aa',
  'Track profile completion, document reviews, and first approved listings.':
    '\u09aa\u09cd\u09b0\u09cb\u09ab\u09be\u0987\u09b2, \u09a8\u09a5\u09bf \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0993 \u09aa\u09cd\u09b0\u09a5\u09ae \u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09bf\u09a4 \u09aa\u09a3\u09cd\u09af\u09c7\u09b0 \u0985\u0997\u09cd\u09b0\u0997\u09a4\u09bf \u09a6\u09c7\u0996\u09c1\u09a8\u0964',
  'Search categories': '\u09ac\u09bf\u09ad\u09be\u0997 \u0996\u09c1\u0981\u099c\u09c1\u09a8',
  'Use published content':
    '\u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09bf\u09a4 \u09ac\u09bf\u09b7\u09af\u09bc\u09ac\u09b8\u09cd\u09a4\u09c1 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8',
  'Leave a selection empty to use the automatic marketplace section.':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8\u09c7\u09b0 \u09b8\u09cd\u09ac\u09af\u09bc\u0982\u0995\u09cd\u09b0\u09bf\u09af\u09bc \u09a4\u09be\u09b2\u09bf\u0995\u09be \u09a6\u09c7\u0996\u09be\u09a4\u09c7 \u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09a8 \u0996\u09be\u09b2\u09bf \u09b0\u09be\u0996\u09c1\u09a8\u0964',
  'Featured selections':
    '\u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09bf\u09a4 \u09ac\u09bf\u09b7\u09af\u09bc\u09ac\u09b8\u09cd\u09a4\u09c1',
  'Supplier registration banner':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8\u09c7\u09b0 \u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0',
  'Featured suppliers':
    '\u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09bf\u09a4 \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0',
  'Featured products':
    '\u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09bf\u09a4 \u09aa\u09a3\u09cd\u09af',
  'Featured categories':
    '\u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09bf\u09a4 \u09ac\u09bf\u09ad\u09be\u0997',
  'Homepage sections': '\u09b9\u09cb\u09ae\u09aa\u09c7\u099c\u09c7\u09b0 \u0985\u0982\u09b6',
  'Announcement link (optional)':
    '\u0998\u09cb\u09b7\u09a3\u09be\u09b0 \u09b2\u09bf\u0982\u0995 (\u0990\u099a\u09cd\u099b\u09bf\u0995)',
  'Announcement (Bangla)': '\u0998\u09cb\u09b7\u09a3\u09be (\u09ac\u09be\u0982\u09b2\u09be)',
  'Announcement (English)': '\u0998\u09cb\u09b7\u09a3\u09be (\u0987\u0982\u09b0\u09c7\u099c\u09bf)',
  Announcement: '\u0998\u09cb\u09b7\u09a3\u09be',
  'Uploaded images remain private until the draft is published.':
    '\u0996\u09b8\u09a1\u09bc\u09be \u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09c7\u09b0 \u0986\u0997\u09c7 \u0986\u09aa\u09b2\u09cb\u09a1 \u0995\u09b0\u09be \u099b\u09ac\u09bf \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a5\u09be\u0995\u09ac\u09c7\u0964',
  'Use default image':
    '\u0986\u0997\u09c7\u09b0 \u099b\u09ac\u09bf \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8',
  'Upload hero image':
    '\u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0\u09c7\u09b0 \u099b\u09ac\u09bf \u0986\u09aa\u09b2\u09cb\u09a1',
  'Hero image (JPEG, PNG or WebP; 5 MB)':
    '\u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0\u09c7\u09b0 \u099b\u09ac\u09bf (JPEG, PNG \u09ac\u09be WebP; \u09eb \u098f\u09ae\u09ac\u09bf)',
  'Use marketplace paths such as /products, /suppliers, or /dashboard/business.':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8\u09c7\u09b0 /products, /suppliers \u09ac\u09be /dashboard/business \u09b2\u09bf\u0982\u0995 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8\u0964',
  'Hero button link':
    '\u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0\u09c7\u09b0 \u09ac\u09cb\u09a4\u09be\u09ae\u09c7\u09b0 \u09b2\u09bf\u0982\u0995',
  'Image alternative text': '\u099b\u09ac\u09bf\u09b0 \u09ac\u09b0\u09cd\u09a3\u09a8\u09be',
  'Button label': '\u09ac\u09cb\u09a4\u09be\u09ae\u09c7\u09b0 \u09b2\u09c7\u0996\u09be',
  'Hero description':
    '\u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0\u09c7\u09b0 \u09ac\u09bf\u09ac\u09b0\u09a3',
  'Hero title':
    '\u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0\u09c7\u09b0 \u09b6\u09bf\u09b0\u09cb\u09a8\u09be\u09ae',
  'Hero eyebrow':
    '\u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0\u09c7\u09b0 \u09b8\u09c2\u099a\u09a8\u09be',
  'Hero banner': '\u09aa\u09cd\u09b0\u09a7\u09be\u09a8 \u09ac\u09cd\u09af\u09be\u09a8\u09be\u09b0',
  'Private preview \u2014 draft content is not public.':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09aa\u09c2\u09b0\u09cd\u09ac\u09b0\u09c2\u09aa \u2014 \u0996\u09b8\u09a1\u09bc\u09be \u098f\u0996\u09a8\u09cb \u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09bf\u09a4 \u09b9\u09af\u09bc\u09a8\u09bf\u0964',
  'Only the saved draft will become visible to everyone.':
    '\u09b6\u09c1\u09a7\u09c1 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u0996\u09b8\u09a1\u09bc\u09be \u09b8\u09ac\u09be\u09b0 \u0995\u09be\u099b\u09c7 \u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09bf\u09a4 \u09b9\u09ac\u09c7\u0964',
  'Publish homepage': '\u09b9\u09cb\u09ae\u09aa\u09c7\u099c \u09aa\u09cd\u09b0\u0995\u09be\u09b6',
  'Save draft': '\u0996\u09b8\u09a1\u09bc\u09be \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3',
  'Preview homepage':
    '\u09b9\u09cb\u09ae\u09aa\u09c7\u099c\u09c7\u09b0 \u09aa\u09c2\u09b0\u09cd\u09ac\u09b0\u09c2\u09aa',
  'Close preview':
    '\u09aa\u09c2\u09b0\u09cd\u09ac\u09b0\u09c2\u09aa \u09ac\u09a8\u09cd\u09a7 \u0995\u09b0\u09c1\u09a8',
  'Draft saved': '\u0996\u09b8\u09a1\u09bc\u09be \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4',
  'Unsaved changes':
    '\u0985\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8',
  'Last published': '\u09b6\u09c7\u09b7 \u09aa\u09cd\u09b0\u0995\u09be\u09b6',
  'Draft revision': '\u0996\u09b8\u09a1\u09bc\u09be \u09b8\u0982\u09b8\u09cd\u0995\u09b0\u09a3',
  'Save privately, preview, then publish a complete homepage revision.':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4\u09ad\u09be\u09ac\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8, \u09aa\u09c2\u09b0\u09cd\u09ac\u09b0\u09c2\u09aa \u09a6\u09c7\u0996\u09c1\u09a8, \u09a4\u09be\u09b0\u09aa\u09b0 \u09b9\u09cb\u09ae\u09aa\u09c7\u099c \u09aa\u09cd\u09b0\u0995\u09be\u09b6 \u0995\u09b0\u09c1\u09a8\u0964',
  delivered:
    '\u0987\u09a8\u09ac\u0995\u09cd\u09b8\u09c7 \u09aa\u09cc\u0981\u099b\u09c7\u099b\u09c7',
  unread: '\u0985\u09aa\u09a0\u09bf\u09a4',
  read: '\u09aa\u09a1\u09bc\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7',
  'No notifications yet':
    '\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf \u09a8\u09c7\u0987',
  'Mark read': '\u09aa\u09a1\u09bc\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7',
  'Mark unread': '\u0985\u09aa\u09a0\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8',
  'Open details':
    '\u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4 \u0996\u09c1\u09b2\u09c1\u09a8',
  'Mark all as read':
    '\u09b8\u09ac \u09aa\u09a1\u09bc\u09be \u09b9\u09bf\u09b8\u09c7\u09ac\u09c7 \u099a\u09bf\u09b9\u09cd\u09a8\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8',
  'Inbox filter': '\u0987\u09a8\u09ac\u0995\u09cd\u09b8 \u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0',
  'Your marketplace updates, decisions, and reminders.':
    '\u0986\u09aa\u09a8\u09be\u09b0 \u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8\u09c7\u09b0 \u0986\u09aa\u09a1\u09c7\u099f, \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u0993 \u09b8\u09cd\u09ae\u09b0\u09a3\u09ac\u09be\u09b0\u09cd\u09a4\u09be\u0964',
  Notifications: '\u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf',
  'Notification delivery':
    '\u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf \u09b8\u09b0\u09ac\u09b0\u09be\u09b9',
  'Supplier onboarding':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8\u09c7\u09b0 \u0985\u0997\u09cd\u09b0\u0997\u09a4\u09bf',
  'Homepage content':
    '\u09b9\u09cb\u09ae\u09aa\u09c7\u099c\u09c7\u09b0 \u09ac\u09bf\u09b7\u09af\u09bc\u09ac\u09b8\u09cd\u09a4\u09c1',
  false: '\u09a8\u09be',
  true: '\u09b9\u09cd\u09af\u09be\u0981',
  'Confirm this moderation decision.':
    '\u098f\u0987 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be\u09b0 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8\u0964',
  suspended: '\u09b8\u09cd\u09a5\u0997\u09bf\u09a4',
  active: '\u09b8\u0995\u09cd\u09b0\u09bf\u09af\u09bc',
  'Existing conversations and quotation follow-up remain available.':
    '\u0986\u0997\u09c7\u09b0 \u0995\u09a5\u09cb\u09aa\u0995\u09a5\u09a8 \u0993 \u09a6\u09b0\u09aa\u09a4\u09cd\u09b0\u09c7\u09b0 \u0989\u09a4\u09cd\u09a4\u09b0 \u099a\u09be\u09b2\u09c1 \u09a5\u09be\u0995\u09ac\u09c7\u0964',
  'Account suspended':
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f \u09b8\u09cd\u09a5\u0997\u09bf\u09a4',
  'Dismiss report':
    '\u0985\u09ad\u09bf\u09af\u09cb\u0997 \u09ac\u09be\u09a4\u09bf\u09b2 \u0995\u09b0\u09c1\u09a8',
  'Resolve report':
    '\u0985\u09ad\u09bf\u09af\u09cb\u0997 \u09b8\u09ae\u09be\u09a7\u09be\u09a8 \u0995\u09b0\u09c1\u09a8',
  'Inspect reported listings and record moderation decisions.':
    '\u0985\u09ad\u09bf\u09af\u09cb\u0997\u0995\u09c3\u09a4 \u09aa\u09a3\u09cd\u09af \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0995\u09b0\u09c7 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8\u0964',
  'Delete category': '\u09ac\u09bf\u09ad\u09be\u0997 \u09ae\u09c1\u099b\u09c1\u09a8',
  'Read only':
    '\u09b6\u09c1\u09a7\u09c1 \u09a6\u09c7\u0996\u09be\u09b0 \u0985\u09a8\u09c1\u09ae\u09a4\u09bf',
  'Categories are read-only for staff administrators.':
    '\u09b8\u09cd\u099f\u09be\u09ab \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8 \u09b6\u09c1\u09a7\u09c1 \u09ac\u09bf\u09ad\u09be\u0997 \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7\u09a8\u0964',
  'Manage categories and subcategories.':
    '\u09ac\u09bf\u09ad\u09be\u0997 \u0993 \u0989\u09aa\u09ac\u09bf\u09ad\u09be\u0997 \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u09a8\u09be \u0995\u09b0\u09c1\u09a8\u0964',
  'Previous decisions':
    '\u0986\u0997\u09c7\u09b0 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4',
  'Last review': '\u09b6\u09c7\u09b7 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be',
  'Review private documents and previous verification decisions.':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09a8\u09a5\u09bf \u0993 \u0986\u0997\u09c7\u09b0 \u09af\u09be\u099a\u09be\u0987\u0995\u09b0\u09a3 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4 \u09a6\u09c7\u0996\u09c1\u09a8\u0964',
  'Supplier verification review':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09af\u09be\u099a\u09be\u0987\u0995\u09b0\u09a3 \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be',
  'Tiered pricing':
    '\u09aa\u09b0\u09bf\u09ae\u09be\u09a3\u09ad\u09bf\u09a4\u09cd\u09a4\u09bf\u0995 \u09ae\u09c2\u09b2\u09cd\u09af',
  'Inspect every image, specifications, and wholesale pricing before approving.':
    '\u0985\u09a8\u09c1\u09ae\u09cb\u09a6\u09a8\u09c7\u09b0 \u0986\u0997\u09c7 \u09b8\u09ac \u099b\u09ac\u09bf, \u09ac\u09bf\u09ac\u09b0\u09a3 \u0993 \u09aa\u09be\u0987\u0995\u09be\u09b0\u09bf \u09ae\u09c2\u09b2\u09cd\u09af \u09a6\u09c7\u0996\u09c1\u09a8\u0964',
  'View changes': '\u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8 \u09a6\u09c7\u0996\u09c1\u09a8',
  'Project operator':
    '\u09aa\u09cd\u09b0\u0995\u09b2\u09cd\u09aa \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u0995',
  Details: '\u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4',
  Target: '\u09b2\u0995\u09cd\u09b7\u09cd\u09af',
  Actor: '\u09aa\u09b0\u09bf\u099a\u09be\u09b2\u0995',
  'To date': '\u09b6\u09c7\u09b7\u09c7\u09b0 \u09a4\u09be\u09b0\u09bf\u0996',
  'From date': '\u09b6\u09c1\u09b0\u09c1\u09b0 \u09a4\u09be\u09b0\u09bf\u0996',
  'Target ID': '\u09b2\u0995\u09cd\u09b7\u09cd\u09af\u09c7\u09b0 \u0986\u0987\u09a1\u09bf',
  'Actor email':
    '\u09aa\u09b0\u09bf\u099a\u09be\u09b2\u0995\u09c7\u09b0 \u0987\u09ae\u09c7\u0987\u09b2',
  'Administrative decisions with before and after values.':
    '\u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8\u09c7\u09b0 \u09aa\u09c2\u09b0\u09cd\u09ac \u0993 \u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09a4\u09a5\u09cd\u09af\u09b8\u09b9 \u09aa\u09cd\u09b0\u09b6\u09be\u09b8\u09a8\u09bf\u0995 \u09b8\u09bf\u09a6\u09cd\u09a7\u09be\u09a8\u09cd\u09a4\u0964',
  'Save settings':
    '\u09b8\u09c7\u099f\u09bf\u0982\u09b8 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8',
  'Settings saved.':
    '\u09b8\u09c7\u099f\u09bf\u0982\u09b8 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4\u0964',
  'Accept new supplier registrations':
    '\u09a8\u09a4\u09c1\u09a8 \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8 \u0997\u09cd\u09b0\u09b9\u09a3 \u0995\u09b0\u09c1\u09a8',
  'Default language': '\u09aa\u09cd\u09b0\u09be\u09a5\u09ae\u09bf\u0995 \u09ad\u09be\u09b7\u09be',
  'Support phone': '\u09b8\u09b9\u09be\u09af\u09bc\u09a4\u09be\u09b0 \u09ab\u09cb\u09a8',
  'Support email':
    '\u09b8\u09b9\u09be\u09af\u09bc\u09a4\u09be\u09b0 \u0987\u09ae\u09c7\u0987\u09b2',
  'Tagline (Bangla)': '\u09b8\u09cd\u09b2\u09cb\u0997\u09be\u09a8 (\u09ac\u09be\u0982\u09b2\u09be)',
  'Tagline (English)':
    '\u09b8\u09cd\u09b2\u09cb\u0997\u09be\u09a8 (\u0987\u0982\u09b0\u09c7\u099c\u09bf)',
  'Marketplace name (Bangla)':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8\u09c7\u09b0 \u09a8\u09be\u09ae (\u09ac\u09be\u0982\u09b2\u09be)',
  'Marketplace name (English)':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8\u09c7\u09b0 \u09a8\u09be\u09ae (\u0987\u0982\u09b0\u09c7\u099c\u09bf)',
  'Public branding, support details, and supplier onboarding.':
    '\u09ac\u09cd\u09b0\u09cd\u09af\u09be\u09a8\u09cd\u09a1, \u09b8\u09b9\u09be\u09af\u09bc\u09a4\u09be\u09b0 \u09a4\u09a5\u09cd\u09af \u098f\u09ac\u0982 \u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8\u0964',
  'Account audit history':
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f\u09c7\u09b0 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae\u09c7\u09b0 \u0987\u09a4\u09bf\u09b9\u09be\u09b8',
  'Supplier audit history':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0\u09b0 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae\u09c7\u09b0 \u0987\u09a4\u09bf\u09b9\u09be\u09b8',
  'Verification documents': '\u09af\u09be\u099a\u09be\u0987\u0995\u09b0\u09a3 \u09a8\u09a5\u09bf',
  'View products': '\u09aa\u09a3\u09cd\u09af \u09a6\u09c7\u0996\u09c1\u09a8',
  'Supplier details':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0\u09b0 \u09ac\u09bf\u09ac\u09b0\u09a3',
  'Search verified buyer by email or name':
    '\u0987\u09ae\u09c7\u0987\u09b2 \u09ac\u09be \u09a8\u09be\u09ae \u09a6\u09bf\u09af\u09bc\u09c7 \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u0995\u09cd\u09b0\u09c7\u09a4\u09be \u0996\u09c1\u0981\u099c\u09c1\u09a8',
  'Add staff member':
    '\u09b8\u09cd\u099f\u09be\u09ab \u09b8\u09a6\u09b8\u09cd\u09af \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8',
  'No records found':
    '\u0995\u09cb\u09a8\u09cb \u09a4\u09a5\u09cd\u09af \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf',
  'Account details':
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f\u09c7\u09b0 \u09ac\u09bf\u09ac\u09b0\u09a3',
  Unverified: '\u09af\u09be\u099a\u09be\u0987 \u09b9\u09af\u09bc\u09a8\u09bf',
  'Email unverified':
    '\u0987\u09ae\u09c7\u0987\u09b2 \u09af\u09be\u099a\u09be\u0987 \u09b9\u09af\u09bc\u09a8\u09bf',
  'Email verified':
    '\u0987\u09ae\u09c7\u0987\u09b2 \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4',
  'Registration / last sign-in':
    '\u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8 / \u09b6\u09c7\u09b7 \u09b2\u0997\u0987\u09a8',
  Account: '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f',
  Verification: '\u09af\u09be\u099a\u09be\u0987\u0995\u09b0\u09a3',
  'Account status':
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f\u09c7\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be',
  'Review accounts and manage marketplace access.':
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u0993 \u09aa\u09cd\u09b0\u09ac\u09c7\u09b6\u09be\u09a7\u09bf\u0995\u09be\u09b0 \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u09a8\u09be \u0995\u09b0\u09c1\u09a8\u0964',
  'Grant access only to active, verified buyer accounts.':
    '\u09b6\u09c1\u09a7\u09c1 \u09b8\u0995\u09cd\u09b0\u09bf\u09af\u09bc \u0993 \u0987\u09ae\u09c7\u0987\u09b2 \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u0995\u09cd\u09b0\u09c7\u09a4\u09be\u0995\u09c7 \u0985\u09a7\u09bf\u0995\u09be\u09b0 \u09a6\u09bf\u09a8\u0964',
  'Supplier management':
    '\u09b8\u09b0\u09ac\u09b0\u09be\u09b9\u0995\u09be\u09b0\u09c0 \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u09a8\u09be',
  'Grant staff access':
    '\u09b8\u09cd\u099f\u09be\u09ab\u09c7\u09b0 \u0985\u09a7\u09bf\u0995\u09be\u09b0 \u09a6\u09bf\u09a8',
  'Revoke staff access':
    '\u09b8\u09cd\u099f\u09be\u09ab\u09c7\u09b0 \u0985\u09a7\u09bf\u0995\u09be\u09b0 \u09ac\u09be\u09a4\u09bf\u09b2 \u0995\u09b0\u09c1\u09a8',
  'Reactivate account':
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f \u09aa\u09c1\u09a8\u09b0\u09be\u09af\u09bc \u099a\u09be\u09b2\u09c1 \u0995\u09b0\u09c1\u09a8',
  'Suspend account':
    '\u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f \u09b8\u09cd\u09a5\u0997\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8',
  'This action will be recorded in audit history.':
    '\u098f\u0987 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae \u0987\u09a4\u09bf\u09b9\u09be\u09b8\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09be \u09b9\u09ac\u09c7\u0964',
  Confirm: '\u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8',
  Reason: '\u0995\u09be\u09b0\u09a3',
  All: '\u09b8\u09ac',
  records: '\u09b0\u09c7\u0995\u09b0\u09cd\u09a1',
  'Rows per page':
    '\u09aa\u09cd\u09b0\u09a4\u09bf \u09aa\u09be\u09a4\u09be\u09af\u09bc \u09b8\u09be\u09b0\u09bf',
  'Search records\u2026':
    '\u09a4\u09be\u09b2\u09bf\u0995\u09be\u09af\u09bc \u0996\u09c1\u0981\u099c\u09c1\u09a8\u2026',
  Registrations: '\u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8',
  Date: '\u09a4\u09be\u09b0\u09bf\u0996',
  days: '\u09a6\u09bf\u09a8',
  'Daily registration trend':
    '\u09a6\u09c8\u09a8\u09bf\u0995 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8\u09c7\u09b0 \u09aa\u09cd\u09b0\u09ac\u09a3\u09a4\u09be',
  'Trend range': '\u09b8\u09ae\u09af\u09bc\u09b8\u09c0\u09ae\u09be',
  'Daily activity':
    '\u09a6\u09c8\u09a8\u09bf\u0995 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae',
  'Marketplace total':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8\u09c7\u09b0 \u09ae\u09cb\u099f',
  'View records': '\u09a4\u09be\u09b2\u09bf\u0995\u09be \u09a6\u09c7\u0996\u09c1\u09a8',
  'Suspended accounts':
    '\u09b8\u09cd\u09a5\u0997\u09bf\u09a4 \u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f',
  'Open reports':
    '\u0985\u09ae\u09c0\u09ae\u09be\u0982\u09b8\u09bf\u09a4 \u0985\u09ad\u09bf\u09af\u09cb\u0997',
  'Pending verifications':
    '\u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09ae\u09be\u09a3 \u09af\u09be\u099a\u09be\u0987\u0995\u09b0\u09a3',
  'Pending products':
    '\u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09ae\u09be\u09a3 \u09aa\u09a3\u09cd\u09af',
  'Buyers & accounts':
    '\u0995\u09cd\u09b0\u09c7\u09a4\u09be \u0993 \u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f',
  'Audit history':
    '\u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae\u09c7\u09b0 \u0987\u09a4\u09bf\u09b9\u09be\u09b8',
  'Platform settings':
    '\u09aa\u09cd\u09b2\u09cd\u09af\u09be\u099f\u09ab\u09b0\u09cd\u09ae \u09b8\u09c7\u099f\u09bf\u0982\u09b8',
  'Staff access':
    '\u09b8\u09cd\u099f\u09be\u09ab\u09c7\u09b0 \u09aa\u09cd\u09b0\u09ac\u09c7\u09b6\u09be\u09a7\u09bf\u0995\u09be\u09b0',
  'Real activity, review queues, and account health.':
    '\u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae, \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u098f\u09ac\u0982 \u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f\u09c7\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u0964',
  'Your marketplace, at a glance.':
    '\u098f\u0995 \u09a8\u099c\u09b0\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8\u0964',
  'MARKETPLACE OPERATIONS':
    '\u09ae\u09be\u09b0\u09cd\u0995\u09c7\u099f\u09aa\u09cd\u09b2\u09c7\u09b8 \u09aa\u09b0\u09bf\u099a\u09be\u09b2\u09a8\u09be',
  'Bangladesh time (UTC+6)':
    '\u09ac\u09be\u0982\u09b2\u09be\u09a6\u09c7\u09b6 \u09b8\u09ae\u09af\u09bc (\u0987\u0989\u099f\u09bf\u09b8\u09bf+\u09ec)',
  'Private platform workspace':
    '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09aa\u09cd\u09b0\u09b6\u09be\u09b8\u09a8 \u0995\u09b0\u09cd\u09ae\u0995\u09cd\u09b7\u09c7\u09a4\u09cd\u09b0',
  'Paikarii.com control centre':
    'Paikarii.com \u09a8\u09bf\u09af\u09bc\u09a8\u09cd\u09a4\u09cd\u09b0\u09a3 \u0995\u09c7\u09a8\u09cd\u09a6\u09cd\u09b0',
  super_admin: '\u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8',
  'Staff admin': '\u09b8\u09cd\u099f\u09be\u09ab \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8',
  'Super admin': '\u09b8\u09c1\u09aa\u09be\u09b0 \u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8',
  'Admin navigation':
    '\u09aa\u09cd\u09b0\u09b6\u09be\u09b8\u09a8 \u09a8\u09c7\u09ad\u09bf\u0997\u09c7\u09b6\u09a8',
  'PLATFORM ADMINISTRATION':
    '\u09aa\u09cd\u09b2\u09cd\u09af\u09be\u099f\u09ab\u09b0\u09cd\u09ae \u09aa\u09cd\u09b0\u09b6\u09be\u09b8\u09a8',
  'Review moderation': 'রিভিউ নিয়ন্ত্রণ',
  'Sourcing requests': 'সোর্সিং অনুরোধসমূহ',
  Reports: 'অভিযোগ ও রিপোর্ট',
  'Terms & Conditions': 'নিয়ম ও শর্তাবলী',
  'Refund Policy': 'রিফান্ড পলিসি',
  Pending: 'অপেক্ষমাণ',
  Introduction: 'ভূমিকা',
  Heading: 'শিরোনাম',
  Content: 'বিষয়বস্তু',
  Version: 'সংস্করণ',
  'Show password': 'পাসওয়ার্ড দেখুন',
  'Hide password': 'পাসওয়ার্ড লুকান',
  'A fresh start.': 'নতুন শুরু।',
  'A marketplace worth trusting.': 'বিশ্বাসযোগ্য একটি বাজার।',
  'About this product': 'এই পণ্য সম্পর্কে',
  'About your business': 'আপনার ব্যবসা সম্পর্কে',
  'Account settings': 'অ্যাকাউন্ট সেটিংস',
  'Across your workspace': 'আপনার কর্মক্ষেত্রে',
  Action: 'কার্যক্রম',
  Actions: 'কার্যক্রম',
  'Add a product': 'পণ্য যোগ করুন',
  'Add a wholesale product': 'পাইকারি পণ্য যোগ করুন',
  'Add category': 'বিভাগ যোগ করুন',
  'Add pricing tier': 'পরিমাণভিত্তিক মূল্য যোগ করুন',
  'Add product': 'পণ্য যোগ করুন',
  Admin: 'প্রশাসক',
  'All Bangladesh': 'সমগ্র বাংলাদেশ',
  'All across Bangladesh': 'সারা বাংলাদেশে',
  'All categories': 'সব বিভাগ',
  'All districts': 'সব জেলা',
  'All divisions': 'সব বিভাগ',
  'All listings': 'সব তালিকা',
  'All products': 'সব পণ্য',
  'Any quantity': 'যেকোনো পরিমাণ',
  Approve: 'অনুমোদন করুন',
  'Approve verification': 'যাচাই অনুমোদন করুন',
  Approved: 'অনুমোদিত',
  Archive: 'আর্কাইভ করুন',
  'Available stock / capacity': 'মজুত / সরবরাহ ক্ষমতা',
  'Available stock / supply capacity': 'মজুত / সরবরাহ ক্ষমতা',
  'Available to buyer accounts': 'ক্রেতা অ্যাকাউন্টের জন্য উপলব্ধ',
  'BETTER TOGETHER': 'একসাথে আরও ভালো',
  'Back home': 'হোমে ফিরুন',
  'Back to marketplace ↗': 'বাজারে ফিরুন ↗',
  'Bangladesh mobile number': 'বাংলাদেশি মোবাইল নম্বর',
  'Better business starts with trust.': 'আস্থা থেকেই ভালো ব্যবসার শুরু।',
  'Bring your business to Paikarii.com.':
    '\u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09cd\u09af\u09ac\u09b8\u09be \u0986\u09a8\u09c1\u09a8 Paikarii.com-\u098f\u0964',
  'Browse products': 'পণ্য দেখুন',
  'Build a business buyers can trust.': 'ক্রেতাদের আস্থার ব্যবসা গড়ুন।',
  'Build trust. Get verified.': 'আস্থা তৈরি করুন। যাচাই করুন।',
  'Built for wholesale': 'পাইকারি ব্যবসার জন্য',
  'Bulk quantities. Better possibilities.': 'বড় পরিমাণ। বড় সম্ভাবনা।',
  'Business mobile number (public)': 'ব্যবসার মোবাইল নম্বর (প্রকাশ্য)',
  'Business name (English)': 'ব্যবসার নাম (ইংরেজি)',
  'Business name (বাংলা)': 'ব্যবসার নাম (বাংলা)',
  'Business profile': 'ব্যবসার প্রোফাইল',
  'Business profile saved.': 'ব্যবসার প্রোফাইল সংরক্ষিত হয়েছে।',
  'Buy more, source smarter.': 'বেশি কিনুন, সাশ্রয় করুন।',
  'By continuing, you agree to our': 'এগিয়ে গেলে আপনি সম্মত হচ্ছেন আমাদের',
  Cancel: 'বাতিল',
  Category: 'পণ্যের বিভাগ',
  'Choose a category': 'বিভাগ বেছে নিন',
  'Choose a strong password for your account.': 'অ্যাকাউন্টের জন্য শক্তিশালী পাসওয়ার্ড বেছে নিন।',
  'Choose district': 'জেলা বেছে নিন',
  'Clear details and good photos help buyers find the right fit.':
    'স্পষ্ট তথ্য ও ভালো ছবি ক্রেতাকে সঠিক পণ্য খুঁজতে সাহায্য করে।',
  'Complete your profile, submit verification documents, and add your wholesale products.':
    'প্রোফাইল সম্পূর্ণ করুন, যাচাইয়ের কাগজপত্র জমা দিন এবং পাইকারি পণ্য যোগ করুন।',
  'Confidence in every connection': 'প্রতিটি যোগাযোগে আস্থা',
  'Confirm deletion': 'মুছে ফেলা নিশ্চিত করুন',
  'Confirm specifications, request samples, and agree on delivery terms directly with your supplier.':
    'বিবরণ নিশ্চিত করুন, নমুনা চান এবং সরবরাহকারীর সাথে সরাসরি ডেলিভারির শর্ত ঠিক করুন।',
  Connect: 'যোগাযোগ করুন',
  'Connect directly with businesses': 'ব্যবসার সাথে সরাসরি যোগাযোগ',
  'Connect directly. Ask questions. Build lasting partnerships.':
    'সরাসরি যোগাযোগ করুন। প্রশ্ন করুন। দীর্ঘস্থায়ী সম্পর্ক গড়ুন।',
  'Connect directly. Ask questions. Work out the details.':
    'সরাসরি যোগাযোগ করুন। প্রশ্ন করুন। বিস্তারিত ঠিক করুন।',
  'Connecting businesses across Bangladesh': 'বাংলাদেশের ব্যবসাগুলোকে যুক্ত করছি',
  'Create a supplier account and connect with wholesale buyers across Bangladesh.':
    'সরবরাহকারী অ্যাকাউন্ট খুলুন এবং সারা দেশের পাইকারি ক্রেতাদের সাথে যুক্ত হোন।',
  'Create account': 'অ্যাকাউন্ট তৈরি করুন',
  'Create categories and subcategories that help buyers find the right products.':
    'ক্রেতাদের সঠিক পণ্য খুঁজতে বিভাগ ও উপবিভাগ তৈরি করুন।',
  'Create category': 'বিভাগ তৈরি করুন',
  'Create your business profile first': 'আগে ব্যবসার প্রোফাইল তৈরি করুন',
  'Create your free buyer account. You can become a supplier from your dashboard.':
    'বিনামূল্যে ক্রেতা অ্যাকাউন্ট খুলুন। ড্যাশবোর্ড থেকে সরবরাহকারী হতে পারবেন।',
  'Dashboard navigation': 'ড্যাশবোর্ড নেভিগেশন',
  Delete: 'মুছুন',
  'Describe the problem with this listing…': 'এই পণ্যের সমস্যাটি লিখুন…',
  'Direct supplier contact · No online payment required':
    'সরাসরি যোগাযোগ · অনলাইন পেমেন্ট প্রয়োজন নেই',
  Discover: 'খুঁজে নিন',
  'Discover manufacturers, wholesalers, and distributors across Bangladesh.':
    'সারা দেশের উৎপাদক, পাইকার ও পরিবেশকদের খুঁজে নিন।',
  'Discover products from businesses across Bangladesh.': 'বাংলাদেশের ব্যবসাগুলোর পণ্য খুঁজে নিন।',
  'Discover quantity pricing and compare minimum orders.':
    'পরিমাণভিত্তিক মূল্য ও সর্বনিম্ন অর্ডার তুলনা করুন।',
  'Discover verified suppliers': 'যাচাইকৃত সরবরাহকারী খুঁজুন',
  'Discover wholesale products, save your shortlist, and request your first quotation.':
    'পাইকারি পণ্য খুঁজুন, পছন্দের তালিকা করুন এবং দরপত্র অনুরোধ পাঠান।',
  District: 'জেলা',
  Division: 'বিভাগ',
  Edit: 'সম্পাদনা',
  'Edit category': 'বিভাগ সম্পাদনা',
  'Edit your product': 'পণ্য সম্পাদনা করুন',
  'Email address': 'ইমেইল ঠিকানা',
  'English / বাংলা': 'বাংলা / English',
  'English name': 'ইংরেজি নাম',
  Entity: 'বিষয়',
  'Every new or edited listing is reviewed before it becomes public.':
    'নতুন বা সম্পাদিত প্রতিটি পণ্য প্রকাশের আগে পর্যালোচনা করা হয়।',
  'Explain required changes or your decision…': 'প্রয়োজনীয় পরিবর্তন বা সিদ্ধান্ত ব্যাখ্যা করুন…',
  'Explore categories': 'বিভাগ দেখুন',
  'Explore products': 'পণ্য দেখুন',
  'Explore suppliers': 'সরবরাহকারী দেখুন',
  'Explore the latest additions from Bangladesh’s suppliers.':
    'বাংলাদেশের সরবরাহকারীদের নতুন পণ্য দেখুন।',
  'Explore wholesale prices': 'পাইকারি মূল্য দেখুন',
  'Find the people behind the products.': 'পণ্যের পেছনের মানুষদের খুঁজুন।',
  'Find the right fit for your next bulk purchase.':
    'পরবর্তী পাইকারি ক্রয়ের জন্য সঠিক পণ্য খুঁজুন।',
  'Find the right product': 'সঠিক পণ্য খুঁজুন',
  'Find your next business partner.': 'আপনার নতুন ব্যবসার সঙ্গী খুঁজুন।',
  'Find your supplier': 'সরবরাহকারী খুঁজুন',
  'For your next big move.': 'আপনার ব্যবসার পরবর্তী ধাপের জন্য।',
  'Forgot password?': 'পাসওয়ার্ড ভুলে গেছেন?',
  'Forgot your password?': 'পাসওয়ার্ড ভুলে গেছেন?',
  'From quantity': 'যতটি থেকে',
  'From the source.': 'সরাসরি উৎস থেকে।',
  'Full name': 'পুরো নাম',
  'GROW WITH PAIKARII.COM':
    'Paikarii.com-\u098f\u09b0 \u09b8\u09be\u09a5\u09c7 \u098f\u0997\u09bf\u09af\u09bc\u09c7 \u09af\u09be\u09a8',
  'Get to know us': 'আমাদের সম্পর্কে জানুন',
  'Good business starts with a conversation.': 'কথোপকথন থেকেই ভালো ব্যবসার শুরু।',
  'Good connections.': 'ভালো যোগাযোগ।',
  'Good products. Great possibilities.': 'ভালো পণ্য। অসীম সম্ভাবনা।',
  'Great possibilities.': 'অসীম সম্ভাবনা।',
  'Here to help you grow.': 'আপনার ব্যবসার অগ্রযাত্রায় পাশে আছি।',
  'How sourcing works': 'পণ্য সংগ্রহের নিয়ম',
  'Image unavailable': 'ছবি পাওয়া যায়নি',
  'Include specifications, delivery location, and your timeline…':
    'পণ্যের বিবরণ, ডেলিভারির স্থান ও সময় লিখুন…',
  'JPEG, PNG or WebP. Up to 5 MB each. New images submit the product for review.':
    'JPEG, PNG বা WebP; প্রতিটি সর্বোচ্চ ৫ MB। নতুন ছবি যোগ করলে আবার পর্যালোচনা হবে।',
  'Join a marketplace built for Bangladesh’s businesses. Find your products, your suppliers, and your next opportunity.':
    'বাংলাদেশের ব্যবসার বাজারে যোগ দিন। পণ্য, সরবরাহকারী ও পরবর্তী সুযোগ খুঁজে নিন।',
  'Keep the marketplace moving.': 'বাজারের কার্যক্রম সচল রাখুন।',
  'Keep the suppliers you want to work with close at hand.': 'পছন্দের সরবরাহকারীদের কাছে রাখুন।',
  'Keep track of your requirements and supplier responses.':
    'আপনার চাহিদা ও সরবরাহকারীর উত্তর দেখুন।',
  'Keep your business contact information up to date.': 'ব্যবসার যোগাযোগের তথ্য হালনাগাদ রাখুন।',
  'LOCAL CRAFT. GLOBAL POTENTIAL.': 'দেশীয় কারুশিল্প। বিশ্বজোড়া সম্ভাবনা।',
  'Let’s grow your business.': 'চলুন ব্যবসাকে এগিয়ে নিই।',
  Listed: 'প্রকাশিত',
  'Listing status': 'তালিকার অবস্থা',
  'Loading business…': 'ব্যবসার তথ্য আসছে…',
  'Loading editor…': 'সম্পাদনা প্রস্তুত হচ্ছে…',
  'Loading product…': 'পণ্যের তথ্য আসছে…',
  'Local sourcing, nationwide reach': 'স্থানীয় উৎস, দেশব্যাপী যোগাযোগ',
  'Lowest MOQ': 'সর্বনিম্ন অর্ডার',
  'MADE IN BANGLADESH': 'বাংলাদেশে তৈরি',
  'Main navigation': 'মূল নেভিগেশন',
  Marketplace: 'পাইকারি বাজার',
  'Marketplace accounts': 'বাজারের অ্যাকাউন্টসমূহ',
  Max: 'সর্বোচ্চ',
  'Maximum MOQ': 'সর্বোচ্চ ন্যূনতম অর্ডার',
  'Maximum price': 'সর্বোচ্চ মূল্য',
  Min: 'সর্বনিম্ন',
  'Minimum order': 'ন্যূনতম অর্ডার',
  'Minimum order quantity': 'ন্যূনতম অর্ডারের পরিমাণ',
  'Minimum price': 'সর্বনিম্ন মূল্য',
  NEW: 'নতুন',
  'Need help?': 'সাহায্য প্রয়োজন?',
  Negotiate: 'আলোচনা করুন',
  'New inquiries. New possibilities.': 'নতুন জিজ্ঞাসা। নতুন সম্ভাবনা।',
  'Newest arrivals': 'নতুন পণ্য আগে',
  Next: 'পরবর্তী',
  'Open private document ↗': 'ব্যক্তিগত নথি দেখুন ↗',
  'Organize the marketplace.': 'বাজার সাজিয়ে নিন।',
  'PAIKARII.COM /': 'Paikarii.com /',
  Page: 'পৃষ্ঠা',
  'Page not found': 'পৃষ্ঠা পাওয়া যায়নি',
  'Paikarii.com home': 'Paikarii.com \u09b9\u09cb\u09ae',
  'Paikarii.com. All rights reserved.':
    'Paikarii.com\u0964 \u09b8\u09b0\u09cd\u09ac\u09b8\u09cd\u09ac\u09a4\u09cd\u09ac \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4\u0964',
  Parent: 'মূল বিভাগ',
  'Parent category': 'মূল বিভাগ',
  Password: 'পাসওয়ার্ড',
  'Pending review': 'পর্যালোচনাধীন',
  'Please wait…': 'অপেক্ষা করুন…',
  Previous: 'পূর্ববর্তী',
  'Price per unit (৳)': 'প্রতি এককের মূল্য (৳)',
  'Price range (৳)': 'মূল্যসীমা (৳)',
  'Price: high to low': 'মূল্য: বেশি থেকে কম',
  'Price: low to high': 'মূল্য: কম থেকে বেশি',
  'Private documents stay private. Contact suppliers and manage your conversations in your workspace.':
    'আপনার ব্যক্তিগত নথি সুরক্ষিত। কর্মক্ষেত্র থেকে সরবরাহকারীদের সাথে যোগাযোগ করুন।',
  'Product description': 'পণ্যের বিবরণ',
  'Product image': 'পণ্যের ছবি',
  'Product images': 'পণ্যের ছবিসমূহ',
  'Product name (English)': 'পণ্যের নাম (ইংরেজি)',
  'Product name (বাংলা)': 'পণ্যের নাম (বাংলা)',
  'Product not found': 'পণ্য পাওয়া যায়নি',
  'Product or keyword': 'পণ্য বা অনুসন্ধানের শব্দ',
  'Product saved and submitted for review.': 'পণ্য সংরক্ষিত ও পর্যালোচনার জন্য জমা হয়েছে।',
  'Product added successfully.': 'পণ্য সফলভাবে যোগ করা হয়েছে।',
  'Product updated successfully.': 'পণ্য সফলভাবে আপডেট করা হয়েছে।',
  'Your listing is awaiting review. You can upload product photos below.':
    'আপনার পণ্যটি পর্যালোচনার অপেক্ষায় রয়েছে। নিচে পণ্যের ছবি আপলোড করতে পারেন।',
  'Saving product…': 'পণ্য সংরক্ষণ করা হচ্ছে…',
  Products: 'পণ্যসমূহ',
  'Profile image (JPEG, PNG or WebP; 2 MB)': 'প্রোফাইল ছবি (JPEG, PNG বা WebP; ২ MB)',
  'Profile updated.': 'প্রোফাইল হালনাগাদ হয়েছে।',
  'Proudly built for Bangladesh': 'বাংলাদেশের জন্য তৈরি',
  'Public business address': 'প্রকাশ্য ব্যবসার ঠিকানা',
  'Quantity pricing': 'পরিমাণভিত্তিক মূল্য',
  'Quotation requested. Track the response in your dashboard.':
    'দরপত্র অনুরোধ পাঠানো হয়েছে। ড্যাশবোর্ডে উত্তর দেখুন।',
  'Read our sourcing guide ↗': 'পণ্য সংগ্রহের নির্দেশিকা পড়ুন ↗',
  'Recent admin activity': 'সাম্প্রতিক প্রশাসনিক কার্যক্রম',
  Reject: 'প্রত্যাখ্যান',
  'Reject verification': 'যাচাই প্রত্যাখ্যান করুন',
  Rejected: 'প্রত্যাখ্যাত',
  'Remove image': 'ছবি সরান',
  'Remove price tier': 'মূল্যধাপ সরান',
  'Report reason': 'অভিযোগের কারণ',
  'Report submitted for review.': 'অভিযোগ পর্যালোচনার জন্য জমা হয়েছে।',
  'Report this listing': 'এই পণ্যের বিরুদ্ধে অভিযোগ',
  'Reports & accountability': 'অভিযোগ ও জবাবদিহি',
  'Request your bulk price': 'পাইকারি মূল্য জানতে চান',
  'Respond with your best wholesale offer and start a conversation.':
    'সেরা পাইকারি অফার দিয়ে উত্তর দিন এবং কথা শুরু করুন।',
  'Review community reports and recent moderation activity.':
    'অভিযোগ ও সাম্প্রতিক পর্যালোচনার কার্যক্রম দেখুন।',
  'Review note': 'পর্যালোচনার মন্তব্য',
  'Review pending products, verify businesses, and respond to reported content.':
    'অপেক্ষমাণ পণ্য ও ব্যবসা যাচাই করুন এবং অভিযোগ পর্যালোচনা করুন।',
  'Review product information and images before approving public listings.':
    'প্রকাশের অনুমোদনের আগে পণ্যের তথ্য ও ছবি দেখুন।',
  'Review products': 'পণ্য পর্যালোচনা করুন',
  'Review the business behind the badge.': 'যাচাই চিহ্নের পেছনের ব্যবসাটি দেখুন।',
  'Reviewer note': 'পর্যালোচকের মন্তব্য',
  'Roles are stored in protected database records, separate from signup metadata.':
    'অ্যাকাউন্টের ভূমিকা সুরক্ষিত ডেটাবেসে সংরক্ষিত থাকে।',
  'SMART SOURCING': 'স্মার্ট পণ্য সংগ্রহ',
  SUPPLIER: 'সরবরাহকারী',
  'Save & submit for review': 'সংরক্ষণ করে পর্যালোচনায় পাঠান',
  'Save business profile': 'ব্যবসার প্রোফাইল সংরক্ষণ',
  'Save products, compare your options, and connect when you’re ready.':
    'পণ্য সংরক্ষণ ও তুলনা করুন, প্রস্তুত হলে যোগাযোগ করুন।',
  'Save profile': 'প্রোফাইল সংরক্ষণ',
  'Save your product, then upload photos on the next screen.':
    'পণ্য সংরক্ষণ করুন, এরপর ছবি যোগ করুন।',
  'Saving edits submits this listing for review again.':
    'পরিবর্তন সংরক্ষণ করলে পণ্যটি আবার পর্যালোচনায় যাবে।',
  'Search business names…': 'ব্যবসার নাম খুঁজুন…',
  'Search products': 'পণ্য খুঁজুন',
  'Search suppliers': 'সরবরাহকারী খুঁজুন',
  'Secure accounts. Direct connections. Local possibilities.':
    'সুরক্ষিত অ্যাকাউন্ট। সরাসরি যোগাযোগ। দেশীয় সম্ভাবনা।',
  'See what’s new': 'নতুন পণ্য দেখুন',
  'Send a password reset email ↗': 'পাসওয়ার্ড পুনরুদ্ধারের ইমেইল পাঠান ↗',
  'Send request': 'অনুরোধ পাঠান',
  'Send reset link': 'পুনরুদ্ধার লিংক পাঠান',
  'Set up business ↗': 'ব্যবসার প্রোফাইল তৈরি করুন ↗',
  'Sign in': 'লগইন',
  'Sign in to your business opportunities.': 'আপনার ব্যবসার সুযোগে লগইন করুন।',
  'Sign out': 'লগআউট',
  'Skip to content': 'মূল বিষয়বস্তুতে যান',
  Slug: 'ইউআরএল নাম',
  'Sort by': 'সাজান',
  'Source local. Grow together.': 'দেশীয় পণ্য নিন। একসাথে এগিয়ে যান।',
  'Source with confidence, grow with connection.': 'আস্থার সাথে পণ্য নিন, যোগাযোগে এগিয়ে যান।',
  'Source with confidence.': 'আস্থার সাথে পণ্য নিন।',
  Specifications: 'পণ্যের বৈশিষ্ট্য',
  'Specifications (one Key: Value per line)': 'বৈশিষ্ট্য (প্রতি লাইনে নাম: মান)',
  'Straight from the source': 'সরাসরি উৎস থেকে',
  'Submit report': 'অভিযোগ জমা দিন',
  'Supplier division': 'সরবরাহকারীর বিভাগ',
  Suppliers: 'সরবরাহকারী',
  'Talk directly to suppliers': 'সরাসরি সরবরাহকারীর সাথে কথা বলুন',
  'Tell buyers who you are and what makes your business different.':
    'ক্রেতাদের আপনার ব্যবসা সম্পর্কে জানান।',
  'Tell the supplier what you need.': 'আপনার চাহিদা সরবরাহকারীকে জানান।',
  'This listing may be awaiting approval or is no longer available.':
    'এই পণ্যটি অনুমোদনের অপেক্ষায় বা আর উপলব্ধ নেই।',
  Time: 'সময়',
  'Toggle navigation': 'মেনু খুলুন বা বন্ধ করুন',
  'Top level': 'মূল স্তর',
  'Trust & verification': 'আস্থা ও যাচাই',
  'URL slug': 'ইউআরএল নাম',
  Unit: 'একক',
  'Update category': 'বিভাগ হালনাগাদ',
  'Update password': 'পাসওয়ার্ড হালনাগাদ',
  'Upload image': 'ছবি আপলোড',
  'Uploading…': 'আপলোড হচ্ছে…',
  'VERIFIED BUSINESS': 'যাচাইকৃত ব্যবসা',
  'VERIFIED SUPPLIER': 'যাচাইকৃত সরবরাহকারী',
  Verified: 'যাচাইকৃত',
  'Verified only': 'শুধু যাচাইকৃত',
  'Verified suppliers only': 'শুধু যাচাইকৃত সরবরাহকারী',
  'Verify submitted business documents before approving a supplier.':
    'সরবরাহকারী অনুমোদনের আগে ব্যবসার নথি যাচাই করুন।',
  'Visit our help centre ↗': 'সহায়তা কেন্দ্রে যান ↗',
  'WELCOME TO PAIKARII.COM': 'Paikarii.com-\u098f \u09b8\u09cd\u09ac\u09be\u0997\u09a4\u09ae',
  'Website (optional HTTPS)': 'ওয়েবসাইট (ঐচ্ছিক HTTPS)',
  'Welcome back.': 'আবার স্বাগতম।',
  'We’ll send you a link to reset it.': 'পুনরুদ্ধারের লিংক পাঠাব।',
  'Wholesale deals': 'পাইকারি অফার',
  'Wholesale starting price': 'পাইকারি প্রারম্ভিক মূল্য',
  'Wholesale starting price (৳)': 'পাইকারি প্রারম্ভিক মূল্য (৳)',
  'YOUR NEXT BUSINESS CHAPTER': 'ব্যবসার নতুন অধ্যায়',
  'YOUR NEXT STEP': 'আপনার পরবর্তী ধাপ',
  'YOUR WORKSPACE': 'আপনার কর্মক্ষেত্র',
  'Your business connections.': 'আপনার ব্যবসার যোগাযোগ।',
  'Your business profile': 'আপনার ব্যবসার প্রোফাইল',
  'Your business, protected.': 'আপনার ব্যবসা সুরক্ষিত।',
  'Your conversations': 'আপনার কথোপকথন',
  'Your documents are private and accessible only to your account and authorized reviewers.':
    'আপনার নথি শুধু আপনি ও অনুমোদিত পর্যালোচক দেখতে পারবেন।',
  'Your next opportunity is out there.': 'আপনার পরবর্তী সুযোগ অপেক্ষায়।',
  'Your next supplier could be': 'আপনার পরবর্তী সরবরাহকারীই হতে পারেন',
  'Your next-business shortlist.': 'ব্যবসার পছন্দের তালিকা।',
  'Your opportunities, in one place.': 'সব সুযোগ এক জায়গায়।',
  'Your products. A bigger market.': 'আপনার পণ্য। বড় বাজার।',
  'Your quotation requests.': 'আপনার দরপত্র অনুরোধ।',
  'Your requirements': 'আপনার চাহিদা',
  'Your wholesale catalog': 'আপনার পাইকারি পণ্যের তালিকা',
  and: 'ও',
  of: 'এর মধ্যে',
  'piece, kg, carton…': 'পিস, কেজি, কার্টন…',
  'privacy policy': 'গোপনীয়তা নীতি',
  'products found': 'টি পণ্য পাওয়া গেছে',
  terms: 'ব্যবহারের শর্ত',
  'your next great partnership.': 'ব্যবসার নতুন বিশ্বস্ত সঙ্গী।',
  Overview: 'সারসংক্ষেপ',
  Accounts: 'অ্যাকাউন্টসমূহ',
  Verifications: 'যাচাইসমূহ',
  'Product moderation': 'পণ্য পর্যালোচনা',
  Categories: 'বিভাগসমূহ',
  'Reports & audit': 'অভিযোগ ও নিরীক্ষা',
  'My products': 'আমার পণ্য',
  'Get verified': 'যাচাই করুন',
  Quotations: 'দরপত্রসমূহ',
  Messages: 'বার্তাসমূহ',
  'Saved products': 'সংরক্ষিত পণ্য',
  'Saved suppliers': 'সংরক্ষিত সরবরাহকারী',
  'My quotations': 'আমার দরপত্র',
  'Become a supplier': 'সরবরাহকারী হোন',
  buyer: 'ক্রেতা',
  supplier: 'সরবরাহকারী',
  admin: 'প্রশাসক',
  pending: 'অপেক্ষমাণ',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
  archived: 'আর্কাইভ',
  draft: 'খসড়া',
  open: 'উন্মুক্ত',
  resolved: 'সমাধানকৃত',
  dismissed: 'বাতিল',
};
Object.assign(banglaCopy, {
  'About the business': 'ব্যবসা সম্পর্কে',
  'All caught up.': 'সব পর্যালোচনা শেষ।',
  'Already have an account?': 'আগেই অ্যাকাউন্ট আছে?',
  'Approved supplier listings will appear here.': 'অনুমোদিত পণ্য এখানে দেখা যাবে।',
  'Awaiting review': 'পর্যালোচনার অপেক্ষায়',
  'Back to sign in': 'লগইনে ফিরুন',
  'Business documents are reviewed before a verification badge is awarded.':
    'যাচাই চিহ্ন দেওয়ার আগে ব্যবসার নথি পর্যালোচনা করা হয়।',
  'Business registration': 'ব্যবসার নিবন্ধন',
  'Choose a conversation': 'কথোপকথন বেছে নিন',
  'Cloud setup guide': 'ক্লাউড সেটআপ নির্দেশিকা',
  'Confirm specifications, quantities, and delivery terms here.':
    'এখানে পণ্যের বিবরণ, পরিমাণ ও ডেলিভারির শর্ত নিশ্চিত করুন।',
  'Confirming your email…': 'ইমেইল নিশ্চিত করা হচ্ছে…',
  Contact: 'যোগাযোগ',
  'Contact and quotation tools are available to buyer accounts.':
    'যোগাযোগ ও দরপত্র অনুরোধ ক্রেতা অ্যাকাউন্টে উপলব্ধ।',
  Conversation: 'কথোপকথন',
  'Could not confirm sign-in': 'লগইন নিশ্চিত করা যায়নি',
  Dismiss: 'বাতিল করুন',
  'Document (PDF, JPEG or PNG; up to 10 MB)': 'নথি (PDF, JPEG বা PNG; সর্বোচ্চ ১০ MB)',
  'Document submitted for review.': 'নথি পর্যালোচনার জন্য জমা হয়েছে।',
  'Document type': 'নথির ধরন',
  'Explore new arrivals': 'নতুন পণ্য দেখুন',
  'Finding suppliers…': 'সরবরাহকারী খোঁজা হচ্ছে…',
  'Fresh stock, new ideas, more possibilities.': 'নতুন পণ্য, নতুন ভাবনা, আরও সম্ভাবনা।',
  'Join free': 'বিনামূল্যে যোগ দিন',
  Joined: 'যোগদানের তারিখ',
  'Loading accounts…': 'অ্যাকাউন্ট আসছে…',
  'Loading listings…': 'তালিকা আসছে…',
  'Loading messages…': 'বার্তা আসছে…',
  'Loading products…': 'পণ্য আসছে…',
  'Loading profile…': 'প্রোফাইল আসছে…',
  'Loading quotations…': 'দরপত্র আসছে…',
  'Loading saved products…': 'সংরক্ষিত পণ্য আসছে…',
  'Loading submissions…': 'জমা দেওয়া নথি আসছে…',
  'Loading suppliers…': 'সরবরাহকারী আসছে…',
  'Loading…': 'লোড হচ্ছে…',
  Message: 'বার্তা',
  'Name / ID': 'নাম / পরিচিতি',
  'New to Paikarii.com?': 'Paikarii.com-\u098f \u09a8\u09a4\u09c1\u09a8?',
  'No approved products yet': 'এখনো অনুমোদিত পণ্য নেই',
  'No conversations yet. Start one from a product page.':
    'এখনো কথোপকথন নেই। পণ্যের পৃষ্ঠা থেকে শুরু করুন।',
  'No listings match this status.': 'এই অবস্থায় কোনো পণ্য নেই।',
  'No products found': 'কোনো পণ্য পাওয়া যায়নি',
  'No quotations yet': 'এখনো দরপত্র নেই',
  'No reports to review': 'পর্যালোচনার জন্য অভিযোগ নেই',
  'No suppliers saved yet': 'এখনো সরবরাহকারী সংরক্ষিত নেই',
  'No verification requests yet': 'এখনো যাচাইয়ের অনুরোধ নেই',
  'Only you and the other participant can read this conversation.':
    'শুধু আপনি ও অপর অংশগ্রহণকারী এই কথোপকথন পড়তে পারবেন।',
  'Our verification process': 'আমাদের যাচাই প্রক্রিয়া',
  'Price / MOQ': 'মূল্য / ন্যূনতম অর্ডার',
  Product: 'পণ্য',
  'Product no longer public': 'পণ্যটি আর প্রকাশ্য নয়',
  'Products from this supplier': 'এই সরবরাহকারীর পণ্য',
  Quantity: 'পরিমাণ',
  'Quoted unit price (৳)': 'প্রস্তাবিত প্রতি এককের মূল্য (৳)',
  'Ready to reach more buyers?': 'আরও ক্রেতার কাছে পৌঁছাতে প্রস্তুত?',
  Reporter: 'অভিযোগকারী',
  Resolve: 'সমাধান করুন',
  'Respond to inquiry': 'জিজ্ঞাসার উত্তর দিন',
  Role: 'ভূমিকা',
  'SUPPLIER RESPONSE': 'সরবরাহকারীর উত্তর',
  'Send message': 'বার্তা পাঠান',
  'Send response': 'উত্তর পাঠান',
  'Sign in to contact supplier': 'যোগাযোগ করতে লগইন করুন',
  'Sign in to save supplier': 'সংরক্ষণ করতে লগইন করুন',
  'Start your shortlist.': 'পছন্দের তালিকা শুরু করুন।',
  Status: 'অবস্থা',
  Stock: 'মজুত',
  'Submission history': 'জমা দেওয়ার ইতিহাস',
  'Submit for verification': 'যাচাইয়ের জন্য জমা দিন',
  'Supplier conversation': 'সরবরাহকারীর সাথে কথোপকথন',
  'Supplier not found': 'সরবরাহকারী পাওয়া যায়নি',
  'Tax certificate': 'কর সনদ',
  'This switches your account from buyer to supplier. You can list products and respond to inquiries. Use a separate buyer account if you also need to source products.':
    'এটি আপনার ক্রেতা অ্যাকাউন্টকে সরবরাহকারী অ্যাকাউন্টে পরিবর্তন করবে। পণ্য তালিকাভুক্ত ও জিজ্ঞাসার উত্তর দিতে পারবেন। পণ্য কিনতেও চাইলে আলাদা ক্রেতা অ্যাকাউন্ট ব্যবহার করুন।',
  'Trade license': 'ট্রেড লাইসেন্স',
  'Trust starts with a verified business.': 'যাচাইকৃত ব্যবসা থেকেই আস্থার শুরু।',
  'Unnamed account': 'নামহীন অ্যাকাউন্ট',
  'Verified businesses and suppliers with approved products will appear here.':
    'যাচাইকৃত ব্যবসা ও অনুমোদিত পণ্যের সরবরাহকারীরা এখানে দেখা যাবে।',
  'View document': 'নথি দেখুন',
  'Visit website': 'ওয়েবসাইট দেখুন',
  'Welcome to your workspace.': 'আপনার কর্মক্ষেত্রে স্বাগতম।',
  'Write your message…': 'আপনার বার্তা লিখুন…',
  'Your marketplace starts here': 'আপনার বাজারের শুরু এখানেই',
  'Your next bestseller starts here.': 'আপনার পরবর্তী সেরা পণ্যের শুরু এখানেই।',
  'Your offer & delivery terms': 'আপনার প্রস্তাব ও ডেলিভারির শর্ত',
  'Your saved products will appear here. Unpublished listings are hidden.':
    'সংরক্ষিত পণ্য এখানে দেখা যাবে। অপ্রকাশিত পণ্য দেখানো হয় না।',
  'Save supplier': 'সরবরাহকারী সংরক্ষণ',
  'Unsave supplier': 'সরবরাহকারী সরান',
  Responded: 'উত্তর এসেছে',
  'Awaiting response': 'উত্তরের অপেক্ষায়',
  'Buyer quotation requests will appear here.': 'ক্রেতার দরপত্র অনুরোধ এখানে দেখা যাবে।',
  'Request a quotation from any product page.': 'পণ্যের পৃষ্ঠা থেকে দরপত্রের অনুরোধ করুন।',
  Live: 'সরাসরি',
  Connecting: 'সংযোগ হচ্ছে',
  Reconnecting: 'আবার সংযোগ হচ্ছে',
  'You do not have access to this conversation, or it no longer exists.':
    'এই কথোপকথন দেখার অনুমতি নেই বা এটি আর নেই।',
  'Your business connections live here.': 'আপনার ব্যবসার যোগাযোগ এখানে।',
  products: 'পণ্য',
  businesses: 'ব্যবসা',
  profiles: 'প্রোফাইল',
  reports: 'অভিযোগ',
  favorites: 'পছন্দের পণ্য',
  'saved suppliers': 'সংরক্ষিত সরবরাহকারী',
  'quotation requests': 'দরপত্র অনুরোধ',
  conversations: 'কথোপকথন',
  'supplier verifications': 'সরবরাহকারী যাচাই',
  'trade license': 'ট্রেড লাইসেন্স',
  'tax certificate': 'কর সনদ',
  registration: 'নিবন্ধন',
  '/ LOCAL POSSIBILITIES': '/ দেশীয় সম্ভাবনা',
  'বাংলা নাম': 'বাংলা নাম',
  'বাংলাদেশে তৈরি': 'বাংলাদেশে তৈরি',
  '●': '●',
});

Object.assign(banglaCopy, {
  'Close categories': 'বিভাগের তালিকা বন্ধ করুন',
  'Categories are temporarily unavailable.': 'বিভাগগুলো সাময়িকভাবে দেখা যাচ্ছে না।',
  'Explore all products while categories are being updated.':
    'বিভাগ হালনাগাদের সময় সব পণ্য দেখতে পারেন।',
  'Wholesale prices': 'পাইকারি দাম',
  'Supplier applications paused': 'নতুন সরবরাহকারীর আবেদন আপাতত বন্ধ',
  'Supplier workspace': 'সরবরাহকারীর কর্মক্ষেত্র',
  'Manage suppliers': 'সরবরাহকারী পরিচালনা',
  'Existing suppliers can continue using their workspace.':
    'বর্তমান সরবরাহকারীরা তাদের কর্মক্ষেত্র ব্যবহার করতে পারবেন।',
  'Quantity pricing available': 'বড় অর্ডারের জন্য আলাদা দাম রয়েছে',
  'Quick searches': 'দ্রুত অনুসন্ধান',
  'T-shirts': 'টি শার্ট',
  'Jute bags': 'পাটের ব্যাগ',
  Rice: 'চাল',
  'Cotton garments on a clothing rail': 'রেলে সাজানো সুতির পোশাক',
  'Verified business profiles': 'যাচাইকৃত ব্যবসার প্রোফাইল',
  '{count}+ verified suppliers': '{count}+ যাচাইকৃত সরবরাহকারী',
  'Direct supplier connections': 'সরবরাহকারীর সাথে সরাসরি যোগাযোগ',
  '{count}+ wholesale products': '{count}+ পাইকারি পণ্য',
  'Across Bangladesh': 'সারা বাংলাদেশে',
  'Browse wholesale categories': 'পাইকারি পণ্যের বিভাগ দেখুন',
  'Find products for your business, by industry.': 'আপনার ব্যবসার জন্য বিভাগ অনুযায়ী পণ্য খুঁজুন।',
  'Categories will appear here as the marketplace grows.':
    'বাজারে নতুন বিভাগ যোগ হলে এখানে দেখা যাবে।',
  'Featured wholesale products': 'বাছাইকৃত পাইকারি পণ্য',
  'Compare prices, minimum orders, and suppliers.':
    'দাম, সর্বনিম্ন অর্ডার ও সরবরাহকারী তুলনা করুন।',
  'Browse products by category': 'বিভাগ অনুযায়ী পণ্য দেখুন',
  'New products are on the way': 'নতুন পণ্য আসছে',
  'Browse categories or connect with suppliers while approved listings are added.':
    'নতুন পণ্য অনুমোদনের অপেক্ষায় বিভাগ দেখুন অথবা সরবরাহকারীর সাথে যোগাযোগ করুন।',
  'Verified suppliers': 'যাচাইকৃত সরবরাহকারী',
  'Meet businesses whose documents have been reviewed.':
    'যেসব ব্যবসার নথি পর্যালোচনা করা হয়েছে তাদের সাথে পরিচিত হোন।',
  'Meet our supplier community': 'আমাদের সরবরাহকারীদের সাথে পরিচিত হোন',
  'Verified suppliers will appear here as businesses complete their reviews.':
    'ব্যবসার যাচাই সম্পন্ন হলে যাচাইকৃত সরবরাহকারীদের এখানে দেখা যাবে।',
  'How verification works': 'যাচাই প্রক্রিয়া জানুন',
  'The latest approved products from active suppliers.':
    'সক্রিয় সরবরাহকারীদের সর্বশেষ অনুমোদিত পণ্য।',
  'How wholesale sourcing works': 'পাইকারি পণ্য সংগ্রহের পদ্ধতি',
  'From finding a product to discussing your bulk requirements.':
    'পণ্য খোঁজা থেকে শুরু করে বড় অর্ডারের চাহিদা নিয়ে আলোচনা।',
  'Find the right product': 'সঠিক পণ্য খুঁজুন',
  'Compare wholesale prices, order quantities, and locations.':
    'পাইকারি দাম, অর্ডারের পরিমাণ ও অবস্থান তুলনা করুন।',
  'Browse products': 'পণ্য দেখুন',
  'Choose your supplier': 'সরবরাহকারী বেছে নিন',
  'Review business profiles, verification, and product details.':
    'ব্যবসার প্রোফাইল, যাচাই ও পণ্যের বিবরণ দেখুন।',
  'Find suppliers': 'সরবরাহকারী খুঁজুন',
  'Discuss your requirements': 'আপনার চাহিদা নিয়ে আলোচনা করুন',
  'Send a quotation request and agree details directly with your supplier.':
    'দরপত্রের অনুরোধ পাঠিয়ে সরবরাহকারীর সাথে সরাসরি বিস্তারিত ঠিক করুন।',
  'Start sourcing': 'পণ্য সংগ্রহ শুরু করুন',
  'View supplier': 'সরবরাহকারী দেখুন',
  'Loading marketplace content': 'বাজারের তথ্য লোড হচ্ছে',
  'Loading image': 'ছবি লোড হচ্ছে',
  'Natural textiles and handcrafted furniture in a warm interior':
    'ঘরের ভেতর সাজানো কাপড় ও হস্তনির্মিত আসবাব',
  'We couldn’t load products': 'পণ্য লোড করা যায়নি',
  'We couldn’t load categories': 'বিভাগ লোড করা যায়নি',
  'We couldn’t load suppliers': 'সরবরাহকারী লোড করা যায়নি',
  'Please check your connection and try again.': 'ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
  'Try again': 'আবার চেষ্টা করুন',
  Dhaka: 'ঢাকা',
  Faridpur: 'ফরিদপুর',
  Gazipur: 'গাজীপুর',
  Gopalganj: 'গোপালগঞ্জ',
  Kishoreganj: 'কিশোরগঞ্জ',
  Madaripur: 'মাদারীপুর',
  Manikganj: 'মানিকগঞ্জ',
  Munshiganj: 'মুন্সিগঞ্জ',
  Narayanganj: 'নারায়ণগঞ্জ',
  Narsingdi: 'নরসিংদী',
  Rajbari: 'রাজবাড়ী',
  Shariatpur: 'শরীয়তপুর',
  Tangail: 'টাঙ্গাইল',
  Chattogram: 'চট্টগ্রাম',
  Bandarban: 'বান্দরবান',
  Brahmanbaria: 'ব্রাহ্মণবাড়িয়া',
  Chandpur: 'চাঁদপুর',
  Cumilla: 'কুমিল্লা',
  'Cox’s Bazar': 'কক্সবাজার',
  Feni: 'ফেনী',
  Khagrachhari: 'খাগড়াছড়ি',
  Lakshmipur: 'লক্ষ্মীপুর',
  Noakhali: 'নোয়াখালী',
  Rangamati: 'রাঙামাটি',
  Rajshahi: 'রাজশাহী',
  Bogura: 'বগুড়া',
  Chapainawabganj: 'চাঁপাইনবাবগঞ্জ',
  Joypurhat: 'জয়পুরহাট',
  Naogaon: 'নওগাঁ',
  Natore: 'নাটোর',
  Pabna: 'পাবনা',
  Sirajganj: 'সিরাজগঞ্জ',
  Khulna: 'খুলনা',
  Bagerhat: 'বাগেরহাট',
  Chuadanga: 'চুয়াডাঙ্গা',
  Jashore: 'যশোর',
  Jhenaidah: 'ঝিনাইদহ',
  Kushtia: 'কুষ্টিয়া',
  Magura: 'মাগুরা',
  Meherpur: 'মেহেরপুর',
  Narail: 'নড়াইল',
  Satkhira: 'সাতক্ষীরা',
  Barishal: 'বরিশাল',
  Barguna: 'বরগুনা',
  Bhola: 'ভোলা',
  Jhalokathi: 'ঝালকাঠি',
  Patuakhali: 'পটুয়াখালী',
  Pirojpur: 'পিরোজপুর',
  Sylhet: 'সিলেট',
  Habiganj: 'হবিগঞ্জ',
  Moulvibazar: 'মৌলভীবাজার',
  Sunamganj: 'সুনামগঞ্জ',
  Rangpur: 'রংপুর',
  Dinajpur: 'দিনাজপুর',
  Gaibandha: 'গাইবান্ধা',
  Kurigram: 'কুড়িগ্রাম',
  Lalmonirhat: 'লালমনিরহাট',
  Nilphamari: 'নীলফামারী',
  Panchagarh: 'পঞ্চগড়',
  Thakurgaon: 'ঠাকুরগাঁও',
  Mymensingh: 'ময়মনসিংহ',
  Jamalpur: 'জামালপুর',
  Netrokona: 'নেত্রকোনা',
  Sherpur: 'শেরপুর',
});
