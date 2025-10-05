import { describe, it, expect } from 'vitest';
import { UpdateTransactionReportGenerator } from './report-generator.js';
import type { UpdateTransactionInput } from './types.js';

describe('UpdateTransactionReportGenerator', () => {
  const generator = new UpdateTransactionReportGenerator();

  describe('generate', () => {
    it('should generate report for date update', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        date: '2025-02-20',
      };

      const result = generator.generate(input);

      expect(result).toBe('Successfully updated transaction txn-123 (updated: date)');
    });

    it('should generate report for cleared status update', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        cleared: true,
      };

      const result = generator.generate(input);

      expect(result).toBe('Successfully updated transaction txn-123 (updated: cleared)');
    });

    it('should generate report for multiple updates including date and cleared', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        date: '2025-03-15',
        categoryId: 'cat-456',
        payeeId: 'payee-789',
        notes: 'Updated',
        amount: 100,
        cleared: false,
      };

      const result = generator.generate(input);

      expect(result).toBe(
        'Successfully updated transaction txn-123 (updated: date, category, payee, notes, amount, cleared)'
      );
    });

    it('should generate report for single field update', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        amount: 50.5,
      };

      const result = generator.generate(input);

      expect(result).toBe('Successfully updated transaction txn-123 (updated: amount)');
    });

    it('should generate report for subtransactions update', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        subtransactions: [
          {
            amount: 30,
            categoryId: 'cat-1',
          },
        ],
      };

      const result = generator.generate(input);

      expect(result).toBe('Successfully updated transaction txn-123 (updated: subtransactions)');
    });

    it('should generate report with all possible fields', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-456',
        date: '2025-01-01',
        categoryId: 'cat-1',
        payeeId: 'payee-1',
        notes: 'Test',
        amount: 100,
        cleared: true,
        subtransactions: [
          {
            amount: 50,
            categoryId: 'cat-2',
            notes: 'Split',
          },
        ],
      };

      const result = generator.generate(input);

      expect(result).toBe(
        'Successfully updated transaction txn-456 (updated: date, category, payee, notes, amount, cleared, subtransactions)'
      );
    });

    it('should handle transaction with only transactionId', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
      };

      const result = generator.generate(input);

      expect(result).toBe('Successfully updated transaction txn-123');
    });
  });
});
