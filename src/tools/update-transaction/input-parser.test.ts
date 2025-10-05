import { describe, it, expect } from 'vitest';
import { UpdateTransactionInputParser } from './input-parser.js';

describe('UpdateTransactionInputParser', () => {
  const parser = new UpdateTransactionInputParser();

  describe('parse', () => {
    it('should parse valid arguments with all fields', () => {
      const args = {
        transactionId: 'txn-123',
        date: '2025-01-15',
        categoryId: 'cat-456',
        payeeId: 'payee-789',
        notes: 'Updated transaction',
        amount: 50.25,
        cleared: true,
        subtransactions: [
          {
            amount: 30,
            categoryId: 'cat-1',
            notes: 'Split 1',
          },
          {
            amount: 20.25,
            categoryId: 'cat-2',
          },
        ],
      };

      const result = parser.parse(args);

      expect(result).toEqual({
        transactionId: 'txn-123',
        date: '2025-01-15',
        categoryId: 'cat-456',
        payeeId: 'payee-789',
        notes: 'Updated transaction',
        amount: 50.25,
        cleared: true,
        subtransactions: [
          {
            amount: 30,
            categoryId: 'cat-1',
            notes: 'Split 1',
          },
          {
            amount: 20.25,
            categoryId: 'cat-2',
            notes: undefined,
          },
        ],
      });
    });

    it('should parse valid arguments with only transactionId', () => {
      const args = {
        transactionId: 'txn-123',
      };

      // This should throw because no fields to update
      expect(() => parser.parse(args)).not.toThrow();

      const result = parser.parse(args);
      expect(result.transactionId).toBe('txn-123');
      expect(result.date).toBeUndefined();
      expect(result.categoryId).toBeUndefined();
      expect(result.payeeId).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(result.amount).toBeUndefined();
      expect(result.cleared).toBeUndefined();
    });

    it('should parse date field correctly', () => {
      const args = {
        transactionId: 'txn-123',
        date: '2025-02-20',
      };

      const result = parser.parse(args);

      expect(result.transactionId).toBe('txn-123');
      expect(result.date).toBe('2025-02-20');
    });

    it('should parse cleared field correctly when true', () => {
      const args = {
        transactionId: 'txn-123',
        cleared: true,
      };

      const result = parser.parse(args);

      expect(result.transactionId).toBe('txn-123');
      expect(result.cleared).toBe(true);
    });

    it('should parse cleared field correctly when false', () => {
      const args = {
        transactionId: 'txn-123',
        cleared: false,
      };

      const result = parser.parse(args);

      expect(result.transactionId).toBe('txn-123');
      expect(result.cleared).toBe(false);
    });

    it('should throw error if transactionId is missing', () => {
      const args = {
        categoryId: 'cat-456',
      };

      expect(() => parser.parse(args)).toThrow('transactionId is required and must be a string');
    });

    it('should throw error if args is not an object', () => {
      expect(() => parser.parse('invalid')).toThrow('Arguments must be an object');
      expect(() => parser.parse(null)).toThrow('Arguments must be an object');
      expect(() => parser.parse(undefined)).toThrow('Arguments must be an object');
    });

    it('should ignore non-string date values', () => {
      const args = {
        transactionId: 'txn-123',
        date: 12345,
      };

      const result = parser.parse(args);

      expect(result.date).toBeUndefined();
    });

    it('should ignore non-boolean cleared values', () => {
      const args = {
        transactionId: 'txn-123',
        cleared: 'yes',
      };

      const result = parser.parse(args);

      expect(result.cleared).toBeUndefined();
    });
  });
});
