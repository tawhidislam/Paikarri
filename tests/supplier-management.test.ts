import { describe, it, expect } from 'vitest';
import {
  dhakaToday,
  labelsSchema,
  warningInput,
  noteInput,
  dateOnly,
} from '../src/lib/supplier-management';
describe('supplier management boundaries', () => {
  it('uses Bangladesh midnight for due dates regardless of browser timezone', () => {
    expect(dhakaToday(new Date('2026-10-17T17:59:59Z'))).toBe('2026-10-17');
    expect(dhakaToday(new Date('2026-10-17T18:00:00Z'))).toBe('2026-10-18');
    expect(dateOnly('2026-10-18')).toContain('18');
  });
  it('rejects invalid dates, unrecognized severity, and missing corrective action', () => {
    const valid = {
      title: 'Correct product',
      message: 'Correct product details please',
      corrective_action: 'Update all product specifications',
      severity: 'warning',
      due_on: '2026-10-18',
    };
    expect(warningInput.safeParse(valid).success).toBe(true);
    for (const patch of [
      { due_on: '2026-02-30' },
      { severity: 'suspend' },
      { corrective_action: '' },
      { message: 'tiny' },
    ])
      expect(warningInput.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it('limits private notes and labels before sending', () => {
    expect(labelsSchema.parse([' Priority '])).toEqual(['Priority']);
    expect(labelsSchema.safeParse(Array(11).fill('Priority')).success).toBe(false);
    expect(labelsSchema.safeParse(['x']).success).toBe(false);
    expect(noteInput.safeParse('    ').success).toBe(false);
    expect(noteInput.safeParse('x'.repeat(3001)).success).toBe(false);
  });
});
