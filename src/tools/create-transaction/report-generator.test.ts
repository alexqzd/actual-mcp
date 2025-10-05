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

    it('should generate report for complete transaction with existing entities', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payeeName: 'Grocery Store',
        categoryName: 'Food',
        notes: 'Weekly groceries',
        cleared: true,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'txn-123',
        payeeId: 'payee-1',
        categoryId: 'cat-1',
        createdPayee: false,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Payee**: Grocery Store');
      expect(report).not.toContain('*(newly created)*');
      expect(report).toContain('- **Category**: Food');
      expect(report).toContain('- **Notes**: Weekly groceries');
      expect(report).toContain('- **Status**: Cleared');
    });
  });

  describe('generate - entity creation', () => {
    it('should show entity creation when new payee is created', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payeeName: 'New Restaurant',
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'txn-123',
        payeeId: 'payee-new',
        createdPayee: true,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Payee**: New Restaurant *(newly created)*');
      expect(report).toContain('## Entities Created');
      expect(report).toContain('- ✓ Created new payee: **New Restaurant**');
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
