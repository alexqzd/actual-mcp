import { describe, it, expect } from 'vitest';
import { convertToCents, convertFromCents } from './amount-converter.js';

describe('amount-converter', () => {
  describe('convertToCents', () => {
    it('should convert dollars to cents', () => {
      expect(convertToCents(10.5)).toBe(1050);
      expect(convertToCents(100)).toBe(10000);
      expect(convertToCents(0.01)).toBe(1);
    });

    it('should handle negative amounts', () => {
      expect(convertToCents(-10.5)).toBe(-1050);
      expect(convertToCents(-100)).toBe(-10000);
    });

    it('should round to nearest cent', () => {
      expect(convertToCents(10.505)).toBe(1051);
      expect(convertToCents(10.504)).toBe(1050);
    });
  });

  describe('convertFromCents', () => {
    it('should convert cents to dollars', () => {
      expect(convertFromCents(1050)).toBe(10.5);
      expect(convertFromCents(10000)).toBe(100);
      expect(convertFromCents(1)).toBe(0.01);
    });

    it('should handle negative amounts', () => {
      expect(convertFromCents(-1050)).toBe(-10.5);
      expect(convertFromCents(-10000)).toBe(-100);
    });

    it('should handle zero', () => {
      expect(convertFromCents(0)).toBe(0);
    });
  });
});
