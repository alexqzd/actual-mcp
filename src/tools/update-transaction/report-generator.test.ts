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

      expect(result).toContain('✅ Successfully updated transaction txn-123 (updated: date)');
      expect(result).toContain(
        '⚠️  If this is a split transaction parent, updates to date/amount/notes may not persist'
      );
    });

    it('should generate report for cleared status update without warnings', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        cleared: true,
      };

      const result = generator.generate(input);

      expect(result).toBe('✅ Successfully updated transaction txn-123 (updated: cleared)');
    });

    it('should generate report for multiple updates including date and cleared with warning', () => {
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

      expect(result).toContain(
        '✅ Successfully updated transaction txn-123 (updated: date, category, payee, notes, amount, cleared)'
      );
      expect(result).toContain('⚠️  If this is a split transaction parent');
    });

    it('should generate report for amount update with warning', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        amount: 50.5,
      };

      const result = generator.generate(input);

      expect(result).toContain('✅ Successfully updated transaction txn-123 (updated: amount)');
      expect(result).toContain('⚠️  If this is a split transaction parent');
    });

    it('should generate report for subtransactions update with warning', () => {
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

      expect(result).toContain('✅ Successfully updated transaction txn-123 (updated: subtransactions)');
      expect(result).toContain('⚠️  Updating subtransactions array has known limitations');
    });

    it('should generate report with all possible fields with subtransactions warning only', () => {
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

      expect(result).toContain(
        '✅ Successfully updated transaction txn-456 (updated: date, category, payee, notes, amount, cleared, subtransactions)'
      );
      expect(result).toContain('⚠️  Updating subtransactions array has known limitations');
      // Should not have the split parent warning when subtransactions is present
      expect(result).not.toContain('⚠️  If this is a split transaction parent');
    });

    it('should handle transaction with only transactionId', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
      };

      const result = generator.generate(input);

      expect(result).toBe('✅ Successfully updated transaction txn-123');
    });

    it('should generate report for category update without warnings', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        categoryId: 'cat-456',
      };

      const result = generator.generate(input);

      expect(result).toBe('✅ Successfully updated transaction txn-123 (updated: category)');
    });

    it('should generate report for notes update with warning', () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        notes: 'Updated notes',
      };

      const result = generator.generate(input);

      expect(result).toContain('✅ Successfully updated transaction txn-123 (updated: notes)');
      expect(result).toContain('⚠️  If this is a split transaction parent');
    });
  });
});
