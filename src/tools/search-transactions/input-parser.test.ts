import { describe, it, expect } from 'vitest';
import { SearchTransactionsInputParser, type SearchTransactionsArgs } from './input-parser.js';

describe('SearchTransactionsInputParser', () => {
  const parser = new SearchTransactionsInputParser();

  describe('Happy path', () => {
    it('should parse valid input with all parameters', () => {
      const input = {
        searchText: 'grocery',
        payeeName: 'Whole Foods',
        categoryId: 'cat-123',
        minAmount: 10.0,
        maxAmount: 100.0,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        accountId: 'acc-456',
        page: 2,
        pageSize: 25,
      };

      const result = parser.parse(input);

      expect(result).toEqual({
        searchText: 'grocery',
        payeeName: 'Whole Foods',
        categoryId: 'cat-123',
        minAmount: 10.0,
        maxAmount: 100.0,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        accountId: 'acc-456',
        page: 2,
        pageSize: 25,
      });
    });

    it('should parse minimal valid input with just searchText', () => {
      const input = {
        searchText: 'coffee',
      };

      const result = parser.parse(input);

      expect(result.searchText).toBe('coffee');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it('should parse input with default pagination', () => {
      const input = {
        categoryId: 'cat-789',
      };

      const result = parser.parse(input);

      expect(result.categoryId).toBe('cat-789');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it('should parse input with amount range only', () => {
      const input = {
        minAmount: 0,
        maxAmount: 50,
      };

      const result = parser.parse(input);

      expect(result.minAmount).toBe(0);
      expect(result.maxAmount).toBe(50);
    });

    it('should allow negative minAmount for filtering expenses', () => {
      const input = {
        minAmount: -100,
        maxAmount: -10,
      };

      const result = parser.parse(input);
      expect(result.minAmount).toBe(-100);
      expect(result.maxAmount).toBe(-10);
    });

    it('should allow mixed range for filtering expenses and income', () => {
      const input = {
        searchText: 'test',
        minAmount: -50,
        maxAmount: 100,
      };

      const result = parser.parse(input);
      expect(result.minAmount).toBe(-50);
      expect(result.maxAmount).toBe(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero amounts', () => {
      const input = {
        searchText: 'test',
        minAmount: 0,
        maxAmount: 0,
      };

      const result = parser.parse(input);

      expect(result.minAmount).toBe(0);
      expect(result.maxAmount).toBe(0);
    });

    it('should handle page size at maximum (500)', () => {
      const input = {
        searchText: 'test',
        pageSize: 500,
      };

      const result = parser.parse(input);

      expect(result.pageSize).toBe(500);
    });

    it('should handle date range with same start and end date', () => {
      const input = {
        startDate: '2024-06-15',
        endDate: '2024-06-15',
      };

      const result = parser.parse(input);

      expect(result.startDate).toBe('2024-06-15');
      expect(result.endDate).toBe('2024-06-15');
    });
  });

  describe('Failure cases', () => {
    it('should reject input with no search criteria', () => {
      const input = {};

      expect(() => parser.parse(input)).toThrow('At least one search criterion must be provided');
    });

    it('should reject input with only page number', () => {
      const input = {
        page: 2,
      };

      expect(() => parser.parse(input)).toThrow('At least one search criterion must be provided');
    });

    it('should reject when minAmount > maxAmount', () => {
      const input = {
        searchText: 'test',
        minAmount: 100,
        maxAmount: 50,
      };

      expect(() => parser.parse(input)).toThrow('minAmount cannot be greater than maxAmount');
    });

    it('should reject invalid date format', () => {
      const input = {
        startDate: '01-01-2024',
      };

      expect(() => parser.parse(input)).toThrow('Invalid startDate format');
    });

    it('should reject invalid endDate format', () => {
      const input = {
        endDate: '2024/12/31',
      };

      expect(() => parser.parse(input)).toThrow('Invalid endDate format');
    });

    it('should reject page size over 500', () => {
      const input = {
        searchText: 'test',
        pageSize: 501,
      };

      expect(() => parser.parse(input)).toThrow();
    });

    it('should reject zero or negative page number', () => {
      const input = {
        searchText: 'test',
        page: 0,
      };

      expect(() => parser.parse(input)).toThrow();
    });

    it('should reject negative page number', () => {
      const input = {
        searchText: 'test',
        page: -1,
      };

      expect(() => parser.parse(input)).toThrow();
    });
  });
});
