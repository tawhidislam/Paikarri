import { defaultTerms } from './terms-schema';
import { defaultRefundPolicy, unpublishedRefundPolicy } from './refund-policy';
export type PolicyKind = 'terms' | 'refund';
export function policyConfig(kind: PolicyKind) {
  return kind === 'refund'
    ? {
        title: 'Refund Policy',
        defaultContent: defaultRefundPolicy,
        unpublishedContent: unpublishedRefundPolicy,
        publicPath: '/info/refund',
        viewLabel: 'View public refund policy',
        previewLabel: 'Preview refund policy',
        publishLabel: 'Publish refund policy',
        publishDescription:
          'The saved bilingual refund policy will become public immediately. The effective date is displayed to readers; it does not schedule publication.',
      }
    : {
        title: 'Terms & Conditions',
        defaultContent: defaultTerms,
        unpublishedContent: defaultTerms,
        publicPath: '/info/terms',
        viewLabel: 'View public terms',
        previewLabel: 'Preview terms',
        publishLabel: 'Publish terms',
        publishDescription:
          'The saved bilingual terms will become public immediately. The effective date is displayed to readers; it does not schedule publication.',
      };
}
