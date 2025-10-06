// Unit tests for create-transaction report generator

import { describe, it, expect, beforeEach } from 'vitest';
import { CreateTransactionReportGenerator } from './report-generator.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';

describe('CreateTransactionReportGenerator', () => {
  let generator: CreateTransactionReportGenerator;

  beforeEach(() => {
    generator = new CreateTransactionReportGenerator();
  });

  describe('generate - happy path', () => {
    it('should generate report for minimal transaction', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'txn-123',
      };

      const report = generator.generate(input, result);

      expect(report).toContain('# Transaction Created Successfully');
      expect(report).toContain('- **Transaction ID**: txn-123');
      expect(report).toContain('- **Date**: 2023-12-15');
      expect(report).toContain('- **Amount**: $25.50');
      expect(report).toContain('- **Account ID**: account-123');
    });

    it('should generate report for complete transaction with IDs', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payeeId: 'payee-456',
        categoryId: 'cat-789',
        notes: 'Weekly groceries',
        cleared: true,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'txn-123',
        payeeId: 'payee-456',
        categoryId: 'cat-789',
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Payee ID**: payee-456');
      expect(report).toContain('- **Category ID**: cat-789');
      expect(report).toContain('- **Notes**: Weekly groceries');
      expect(report).toContain('- **Status**: Cleared');
    });
  });

  describe('generate - edge cases', () => {
    it('should handle negative amounts correctly', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: -25.5,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'txn-123',
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Amount**: -$25.50');
    });
  });
});
