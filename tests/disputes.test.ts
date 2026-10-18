import { describe, it, expect } from 'vitest';
import {
  BUYER_DISPUTE_CATEGORIES,
  SELLER_DEFENSE_CATEGORIES,
  DESIRED_OUTCOMES,
  formatDisputeClaim,
  parseDisputeClaim,
  formatDefenseNote,
  parseDefenseNote,
  formatSupervisorDirective,
  parseSupervisorDirective,
} from '../src/lib/disputes';

describe('Paikarii Escrow Appeal & Dispute Resolution System', () => {
  it('defines valid non-empty categories and outcomes with bilingual labels', () => {
    expect(BUYER_DISPUTE_CATEGORIES.length).toBeGreaterThanOrEqual(5);
    expect(SELLER_DEFENSE_CATEGORIES.length).toBeGreaterThanOrEqual(5);
    expect(DESIRED_OUTCOMES.length).toBeGreaterThanOrEqual(4);

    for (const cat of BUYER_DISPUTE_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.label_bn).toBeTruthy();
    }

    for (const def of SELLER_DEFENSE_CATEGORIES) {
      expect(def.id).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(def.label_bn).toBeTruthy();
    }
  });

  describe('Buyer claim formatting and parsing', () => {
    it('formats and parses structured buyer dispute claims with evidence URLs', () => {
      const formatted = formatDisputeClaim({
        category: 'damaged_goods',
        desiredOutcome: 'full_refund',
        details: 'Received 50 pieces of cotton fabric with visible moisture and color staining.',
        evidenceUrls: [
          'https://drive.google.com/open?id=proof1',
          'https://drive.google.com/open?id=proof2',
        ],
      });

      expect(formatted).toContain('[CLAIM: damaged_goods]');
      expect(formatted).toContain('Outcome: full_refund');
      expect(formatted).toContain(
        'Details: Received 50 pieces of cotton fabric with visible moisture and color staining.',
      );
      expect(formatted).toContain(
        'Evidence: https://drive.google.com/open?id=proof1 | https://drive.google.com/open?id=proof2',
      );

      const parsed = parseDisputeClaim(formatted);
      expect(parsed.isStructured).toBe(true);
      expect(parsed.category).toBe('damaged_goods');
      expect(parsed.categoryLabel).toBe('Damaged or Defective Wholesale Goods');
      expect(parsed.desiredOutcome).toBe('full_refund');
      expect(parsed.outcomeLabel).toBe('Full Escrow Refund');
      expect(parsed.details).toBe(
        'Received 50 pieces of cotton fabric with visible moisture and color staining.',
      );
      expect(parsed.evidenceUrls).toEqual([
        'https://drive.google.com/open?id=proof1',
        'https://drive.google.com/open?id=proof2',
      ]);
    });

    it('gracefully handles legacy unstructured dispute text and extracts URLs', () => {
      const legacyText =
        'The received goods have synthetic damage. See photos at https://example.com/damage.jpg';
      const parsed = parseDisputeClaim(legacyText);

      expect(parsed.isStructured).toBe(false);
      expect(parsed.categoryLabel).toBe('General Dispute');
      expect(parsed.details).toBe(legacyText);
      expect(parsed.evidenceUrls).toEqual(['https://example.com/damage.jpg']);
    });

    it('handles empty or blank dispute text safely', () => {
      const parsed = parseDisputeClaim('');
      expect(parsed.isStructured).toBe(false);
      expect(parsed.details).toBe('');
      expect(parsed.evidenceUrls).toEqual([]);
    });
  });

  describe('Seller defense note formatting and parsing', () => {
    it('formats and parses structured seller defense notes with proof links', () => {
      const formatted = formatDefenseNote({
        category: 'signed_pod',
        statement:
          'Consignment delivered via Steadfast Courier on 15 Oct. Receiver signed challan #ST-99120.',
        evidenceUrls: ['https://steadfast.com.bd/track/ST-99120'],
      });

      expect(formatted).toContain('[SELLER DEFENSE: signed_pod]');
      expect(formatted).toContain(
        'Statement: Consignment delivered via Steadfast Courier on 15 Oct. Receiver signed challan #ST-99120.',
      );
      expect(formatted).toContain('Evidence: https://steadfast.com.bd/track/ST-99120');

      const parsed = parseDefenseNote(formatted);
      expect(parsed.isDefense).toBe(true);
      expect(parsed.category).toBe('signed_pod');
      expect(parsed.categoryLabel).toBe('Signed Delivery Challan / Proof of Delivery (POD)');
      expect(parsed.statement).toBe(
        'Consignment delivered via Steadfast Courier on 15 Oct. Receiver signed challan #ST-99120.',
      );
      expect(parsed.evidenceUrls).toEqual(['https://steadfast.com.bd/track/ST-99120']);
    });

    it('identifies non-defense generic order notes', () => {
      const genericNote = 'Please ensure packing with double corrugated cartons.';
      const parsed = parseDefenseNote(genericNote);

      expect(parsed.isDefense).toBe(false);
      expect(parsed.statement).toBe(genericNote);
      expect(parsed.evidenceUrls).toEqual([]);
    });
  });

  describe('Supervisor directives formatting and parsing', () => {
    it('formats and parses official supervisor directives', () => {
      const directive =
        'Seller: Please upload official Steadfast POD scan within 48 hours. Escrow remains paused.';
      const formatted = formatSupervisorDirective(directive);

      expect(formatted).toContain('[PAIKARII SUPERVISOR DIRECTIVE]');
      expect(formatted).toContain(directive);

      const parsed = parseSupervisorDirective(formatted);
      expect(parsed.isSupervisor).toBe(true);
      expect(parsed.directive).toBe(directive);
    });

    it('identifies non-supervisor notes', () => {
      const note = 'Buyer asked for delivery update.';
      const parsed = parseSupervisorDirective(note);
      expect(parsed.isSupervisor).toBe(false);
      expect(parsed.directive).toBe(note);
    });
  });
});
