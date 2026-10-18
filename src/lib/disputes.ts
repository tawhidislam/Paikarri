export interface BuyerDisputeCategory {
  id: string;
  label: string;
  label_bn: string;
  description: string;
}

export interface SellerDefenseCategory {
  id: string;
  label: string;
  label_bn: string;
  description: string;
}

export interface DisputeOutcome {
  id: string;
  label: string;
  label_bn: string;
}

export const BUYER_DISPUTE_CATEGORIES: BuyerDisputeCategory[] = [
  {
    id: 'damaged_goods',
    label: 'Damaged or Defective Wholesale Goods',
    label_bn: 'ক্ষতিগ্রস্ত বা ত্রুটিযুক্ত পাইকারি পণ্য',
    description: 'Products arrived damaged, broken, or in substandard unusable condition.',
  },
  {
    id: 'short_or_wrong_items',
    label: 'Incorrect Items or Short Quantity',
    label_bn: 'ভুল পণ্য বা পরিমাণে কম সরবরাহ',
    description: 'The received shipment is missing items or contains wrong SKU/specifications.',
  },
  {
    id: 'non_delivery',
    label: 'Goods Not Received / Non-Delivery',
    label_bn: 'পণ্য পৌঁছায়নি / সরবরাহ ব্যর্থতা',
    description: 'Consignment never arrived or courier failed to deliver goods.',
  },
  {
    id: 'quality_mismatch',
    label: 'Quality Mismatch vs Approved Sample / Spec',
    label_bn: 'অনুমোদিত নমুনা বা স্পেকের সাথে মানের অমিল',
    description: 'Bulk production does not conform to agreed sample specifications.',
  },
  {
    id: 'unauthorized_delay',
    label: 'Excessive Unauthorized Delay',
    label_bn: 'অতিরিক্ত অননুমোদিত ডেলিভারি বিলম্ব',
    description: 'Supplier exceeded delivery deadlines without buyer consent.',
  },
  {
    id: 'other',
    label: 'Other Dispute Issue',
    label_bn: 'অন্যান্য সমস্যা',
    description: 'Other commercial or fulfillment conflict requiring arbitration.',
  },
];

export const SELLER_DEFENSE_CATEGORIES: SellerDefenseCategory[] = [
  {
    id: 'signed_pod',
    label: 'Signed Delivery Challan / Proof of Delivery (POD)',
    label_bn: 'স্বাক্ষরিত ডেলিভারি চালান ও প্রমাণ (POD)',
    description: 'Valid receiver signature on courier or carrier consignment receipt.',
  },
  {
    id: 'dispatch_weighment',
    label: 'Factory Packing & Weighment Verification',
    label_bn: 'কারখানা প্যাকিং ও ওজন যাচাই স্লিপ',
    description: 'Scale weighment slip and sealed carton photographs prior to handover.',
  },
  {
    id: 'quality_inspection',
    label: 'Pre-dispatch Quality Inspection Certificate',
    label_bn: 'শিপমেন্ট পূর্ববর্তী মান সনদ ও ছবি',
    description: 'Quality check logs and inspection photos verifying specs before dispatch.',
  },
  {
    id: 'buyer_communication',
    label: 'Proof of Buyer Acceptance / Mutual Consent',
    label_bn: 'ক্রেতার সম্মতি ও যোগাযোগের প্রমাণ',
    description: 'Chat confirmation, specification waivers, or written approvals.',
  },
  {
    id: 'resolution_offer',
    label: 'Replacement or Partial Compensation Offer',
    label_bn: 'প্রতিস্থাপন বা ক্ষতিপূরণ সমন্বয় প্রস্তাব',
    description: 'Supplier proposes reshipping replacement stock or reimbursing damages.',
  },
  {
    id: 'other_defense',
    label: 'Other Rebuttal & Evidence',
    label_bn: 'অন্যান্য ব্যাখ্যা ও যুক্তি',
    description: 'Additional commercial facts and counter-documentation.',
  },
];

export const DESIRED_OUTCOMES: DisputeOutcome[] = [
  {
    id: 'full_refund',
    label: 'Full Escrow Refund',
    label_bn: 'সম্পূর্ণ এসক্রো রিফান্ড',
  },
  {
    id: 'return_and_refund',
    label: 'Return Merchandise & Full Refund',
    label_bn: 'পণ্য ফেরত ও সম্পূর্ণ রিফান্ড',
  },
  {
    id: 'replacement',
    label: 'Reshipment / Replacement of Defective Stock',
    label_bn: 'ত্রুটিযুক্ত পণ্যের পুনঃসরবরাহ / প্রতিস্থাপন',
  },
  {
    id: 'partial_adjustment',
    label: 'Partial Escrow Adjustment / Compensation',
    label_bn: 'আংশিক মূল্য সমন্বয় / ক্ষতিপূরণ',
  },
];

export interface StructuredDisputeClaim {
  category: string;
  desiredOutcome: string;
  details: string;
  evidenceUrls: string[];
}

export function formatDisputeClaim(claim: StructuredDisputeClaim): string {
  const parts: string[] = [];
  parts.push(`[CLAIM: ${claim.category}]`);
  if (claim.desiredOutcome) {
    parts.push(`Outcome: ${claim.desiredOutcome}`);
  }
  parts.push(`Details: ${claim.details.trim()}`);
  if (claim.evidenceUrls && claim.evidenceUrls.length > 0) {
    const urls = claim.evidenceUrls.filter((u) => u.trim().length > 0);
    if (urls.length > 0) {
      parts.push(`Evidence: ${urls.join(' | ')}`);
    }
  }
  return parts.join('\n');
}

export function parseDisputeClaim(rawText: string): {
  isStructured: boolean;
  category?: string;
  categoryLabel: string;
  desiredOutcome?: string;
  outcomeLabel?: string;
  details: string;
  evidenceUrls: string[];
} {
  if (!rawText) {
    return {
      isStructured: false,
      categoryLabel: 'General Dispute',
      details: '',
      evidenceUrls: [],
    };
  }

  const claimMatch = rawText.match(/\[CLAIM:\s*([a-zA-Z0-9_-]+)\]/i);
  if (!claimMatch) {
    // Extract any URLs present in freeform text
    const urlMatches = rawText.match(/https?:\/\/[^\s]+/g) || [];
    return {
      isStructured: false,
      categoryLabel: 'General Dispute',
      details: rawText.trim(),
      evidenceUrls: urlMatches,
    };
  }

  const categoryId = claimMatch[1];
  const foundCat = BUYER_DISPUTE_CATEGORIES.find((c) => c.id === categoryId);

  const outcomeMatch = rawText.match(/Outcome:\s*([a-zA-Z0-9_-]+)/i);
  const outcomeId = outcomeMatch ? outcomeMatch[1] : undefined;
  const foundOutcome = DESIRED_OUTCOMES.find((o) => o.id === outcomeId);

  const evidenceMatch = rawText.match(/Evidence:\s*([^\n]+)/i);
  const evidenceUrls: string[] = evidenceMatch
    ? evidenceMatch[1]
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
    : rawText.match(/https?:\/\/[^\s]+/g) || [];

  const details = rawText
    .replace(/\[CLAIM:[^\]]+\]/i, '')
    .replace(/Outcome:[^\n]+/i, '')
    .replace(/Evidence:[^\n]+/i, '')
    .trim()
    .replace(/^Details:\s*/i, '')
    .trim();

  return {
    isStructured: true,
    category: categoryId,
    categoryLabel: foundCat?.label || categoryId,
    desiredOutcome: outcomeId,
    outcomeLabel: foundOutcome?.label,
    details: details || rawText.trim(),
    evidenceUrls,
  };
}

export interface StructuredDefenseNote {
  category: string;
  statement: string;
  evidenceUrls: string[];
}

export function formatDefenseNote(defense: StructuredDefenseNote): string {
  const parts: string[] = [];
  parts.push(`[SELLER DEFENSE: ${defense.category}]`);
  parts.push(`Statement: ${defense.statement.trim()}`);
  if (defense.evidenceUrls && defense.evidenceUrls.length > 0) {
    const urls = defense.evidenceUrls.filter((u) => u.trim().length > 0);
    if (urls.length > 0) {
      parts.push(`Evidence: ${urls.join(' | ')}`);
    }
  }
  return parts.join('\n');
}

export function parseDefenseNote(rawText: string): {
  isDefense: boolean;
  category?: string;
  categoryLabel: string;
  statement: string;
  evidenceUrls: string[];
} {
  if (!rawText) {
    return {
      isDefense: false,
      categoryLabel: 'General Note',
      statement: '',
      evidenceUrls: [],
    };
  }

  const defenseMatch = rawText.match(/\[SELLER DEFENSE:\s*([a-zA-Z0-9_-]+)\]/i);
  if (!defenseMatch) {
    const urlMatches = rawText.match(/https?:\/\/[^\s]+/g) || [];
    return {
      isDefense: false,
      categoryLabel: 'General Note',
      statement: rawText.trim(),
      evidenceUrls: urlMatches,
    };
  }

  const categoryId = defenseMatch[1];
  const foundCat = SELLER_DEFENSE_CATEGORIES.find((c) => c.id === categoryId);

  const evidenceMatch = rawText.match(/Evidence:\s*([^\n]+)/i);
  const evidenceUrls: string[] = evidenceMatch
    ? evidenceMatch[1]
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
    : rawText.match(/https?:\/\/[^\s]+/g) || [];

  const statement = rawText
    .replace(/\[SELLER DEFENSE:[^\]]+\]/i, '')
    .replace(/Evidence:[^\n]+/i, '')
    .trim()
    .replace(/^Statement:\s*/i, '')
    .trim();

  return {
    isDefense: true,
    category: categoryId,
    categoryLabel: foundCat?.label || categoryId,
    statement: statement || rawText.trim(),
    evidenceUrls,
  };
}

export function formatSupervisorDirective(directive: string): string {
  return `[PAIKARII SUPERVISOR DIRECTIVE]\n${directive.trim()}`;
}

export function parseSupervisorDirective(rawText: string): {
  isSupervisor: boolean;
  directive: string;
} {
  if (!rawText) return { isSupervisor: false, directive: '' };
  const match = rawText.match(/\[PAIKARII SUPERVISOR DIRECTIVE\]\s*([\s\S]*)/i);
  if (match) {
    return {
      isSupervisor: true,
      directive: match[1].trim(),
    };
  }
  return {
    isSupervisor: false,
    directive: rawText.trim(),
  };
}
