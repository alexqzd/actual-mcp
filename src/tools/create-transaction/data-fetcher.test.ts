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

      // Verify importTransactions was called with the expected transaction data
      expect(actualApi.importTransactions).toHaveBeenCalled();
      const callArgs = vi.mocked(actualApi.importTransactions).mock.calls[0];
      expect(callArgs[0]).toBe('account-1');
      const transaction = callArgs[1][0];
      expect(transaction).toMatchObject({
        date: '2023-12-15',
        amount: 2550, // Amount in cents
        payee: 'payee-123',
        category: 'cat-456',
        notes: 'Test transaction',
        cleared: true,
        subtransactions: undefined,
      });
      // Verify imported_id is present and is a valid UUID
      expect(transaction).toHaveProperty('imported_id');
      expect(transaction.imported_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

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

      // Verify importTransactions was called with the expected transaction data
      const callArgs = vi.mocked(actualApi.importTransactions).mock.calls[0];
      expect(callArgs[0]).toBe('account-1');
      const transaction = callArgs[1][0];
      expect(transaction).toMatchObject({
        date: '2023-12-15',
        amount: 2550,
        payee: null,
        category: null,
        notes: 'Test transaction',
        cleared: false,
        subtransactions: undefined,
      });
      // Verify imported_id is present and is a valid UUID
      expect(transaction).toHaveProperty('imported_id');
      expect(transaction.imported_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('duplicate transaction handling', () => {
    it('should always generate unique imported_id to allow duplicates', async () => {
      const coreTransactions = await import('../../core/transactions/index.js');

      const input: CreateTransactionInput = {
        accountId: 'account-1',
        date: '2023-12-15',
        amount: 25.5,
        payeeId: 'payee-123',
        categoryId: 'cat-456',
        notes: 'Test duplicate',
      };

      vi.mocked(actualApi.importTransactions).mockResolvedValue('txn-789');
      vi.mocked(coreTransactions.validateAccount).mockResolvedValue(undefined);

      // Create first transaction
      await fetcher.createTransaction(input);
      const firstCallArgs = vi.mocked(actualApi.importTransactions).mock.calls[0];
      const firstImportedId = firstCallArgs[1][0].imported_id;

      // Create second identical transaction
      vi.clearAllMocks();
      vi.mocked(actualApi.importTransactions).mockResolvedValue('txn-790');
      await fetcher.createTransaction(input);
      const secondCallArgs = vi.mocked(actualApi.importTransactions).mock.calls[0];
      const secondImportedId = secondCallArgs[1][0].imported_id;

      // Both should have imported_id
      expect(firstImportedId).toBeDefined();
      expect(secondImportedId).toBeDefined();

      // But they should be different (unique UUIDs)
      expect(firstImportedId).not.toBe(secondImportedId);

      // Both should be valid UUIDs
      expect(firstImportedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(secondImportedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});
