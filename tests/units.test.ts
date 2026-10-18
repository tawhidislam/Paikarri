import { describe, expect, it } from 'vitest';
import { formatQuantity, formatUnit } from '../src/lib/units';
import { money } from '../src/lib/utils';

describe('wholesale quantity formatting', () => {
  it('preserves paisa in real wholesale prices in both languages', () => {
    expect(money(100.75)).toContain('100.75');
    expect(money(100.75, 'bn')).toContain('১০০.৭৫');
  });
  it('handles countable units, mass units and existing plural unit inputs', () => {
    expect(formatQuantity(1, 'box')).toBe('1 box');
    expect(formatQuantity(500, 'box')).toBe('500 boxes');
    expect(formatQuantity(25, 'kg')).toBe('25 kg');
    expect(formatQuantity(1, 'pieces')).toBe('1 piece');
    expect(formatQuantity(2, 'sets')).toBe('2 sets');
  });
  it('localizes both numbers and known units in Bangla', () => {
    expect(formatQuantity(500, 'box', 'bn')).toBe('৫০০ বাক্স');
    expect(formatQuantity(25, 'kg', 'bn')).toBe('২৫ কেজি');
    expect(formatUnit('piece', 1, 'bn')).toBe('টি');
  });
  it('preserves supplier-defined units rather than inventing plurals', () => {
    expect(formatQuantity(10, 'bundle')).toBe('10 bundle');
    expect(formatUnit('Custom size', 2, 'bn')).toBe('Custom size');
  });
});
