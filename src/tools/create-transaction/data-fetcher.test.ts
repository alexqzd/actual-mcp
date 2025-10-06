// Unit tests for create-transaction data fetcher

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTransactionDataFetcher } from './data-fetcher.js';
import type { CreateTransactionInput } from './types.js';
import * as actualApi from '../../actual-api.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  importTransactions: vi.fn(),
}));

// Mock the core/transactions module
vi.mock('../../core/transactions/index.js', () => ({
  convertToCents: (amount: number) => Math.round(amount * 100),
  validateAccount: vi.fn(),
}));

// Mock @actual-app/api for updateTransaction
vi.mock('@actual-app/api', () => ({
  default: {
    updateTransaction: vi.fn(),
  },
}));

describe('CreateTransactionDataFetcher', () => {
  let fetcher: CreateTransactionDataFetcher;

  beforeEach(() => {
    fetcher = new CreateTransactionDataFetcher();
    vi.clearAllMocks();
  });

  describe('createTransaction - happy path', () => {
    it('should handle transaction creation with IDs', async () => {
      // Import the mocked modules to access their functions
      const coreTransactions = await import('../../core/transactions/index.js');
      const actualApp = await import('@actual-app/api');

      const input: CreateTransactionInput = {
        accountId: 'account-1',
        date: '2023-12-15',
        amount: 25.5,
        payeeId: 'payee-123',
        categoryId: 'cat-456',
        notes: 'Test transaction',
        cleared: true,
      };

      // Mock all required API calls
      vi.mocked(actualApi.importTransactions).mockResolvedValue('txn-123');

      // Mock core transaction utilities
      vi.mocked(coreTransactions.validateAccount).mockResolvedValue(undefined);

      const result = await fetcher.createTransaction(input);

      expect(result).toEqual({
        transactionId: 'txn-123',
        payeeId: 'payee-123',
        categoryId: 'cat-456',
      });

      expect(actualApi.importTransactions).toHaveBeenCalledWith('account-1', [
        {
          date: '2023-12-15',
          amount: 2550, // Amount in cents
          payee: 'payee-123',
          category: 'cat-456',
          notes: 'Test transaction',
          cleared: true,
          subtransactions: undefined,
        },
      ]);

      // Should call updateTransaction as workaround for Actual's auto-categorization
      expect(actualApp.default.updateTransaction).toHaveBeenCalledWith('txn-123', { category: 'cat-456' });
    });

    it('should handle transaction without payee or category', async () => {
      const coreTransactions = await import('../../core/transactions/index.js');

      const input: CreateTransactionInput = {
        accountId: 'account-1',
        date: '2023-12-15',
        amount: 25.5,
        notes: 'Test transaction',
      };

      vi.mocked(actualApi.importTransactions).mockResolvedValue('txn-123');
      vi.mocked(coreTransactions.validateAccount).mockResolvedValue(undefined);

      const result = await fetcher.createTransaction(input);

      expect(result).toEqual({
        transactionId: 'txn-123',
        payeeId: undefined,
        categoryId: undefined,
      });

      expect(actualApi.importTransactions).toHaveBeenCalledWith('account-1', [
        {
          date: '2023-12-15',
          amount: 2550,
          payee: null,
          category: null,
          notes: 'Test transaction',
          cleared: false,
          subtransactions: undefined,
        },
      ]);
    });
  });
});
