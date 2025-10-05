// Unit tests for create-transaction data fetcher

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTransactionDataFetcher } from './data-fetcher.js';
import type { CreateTransactionInput } from './types.js';
import * as actualApi from '../../actual-api.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  getPayees: vi.fn(),
  createPayee: vi.fn(),
  importTransactions: vi.fn(),
}));

// Mock the core/transactions module
vi.mock('../../core/transactions/index.js', () => ({
  convertToCents: (amount: number) => Math.round(amount * 100),
  findCategoryByName: vi.fn(),
  validateAccount: vi.fn(),
  mapSubtransactions: vi.fn(),
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

  describe('ensurePayeeExists - happy path', () => {
    it('should return existing payee when found', async () => {
      vi.mocked(actualApi.getPayees).mockResolvedValue([
        { id: 'payee-1', name: 'Grocery Store' },
        { id: 'payee-2', name: 'Gas Station' },
      ] as any);

      const result = await fetcher.ensurePayeeExists('Grocery Store');

      expect(result).toEqual({ payeeId: 'payee-1', created: false });
      expect(actualApi.createPayee).not.toHaveBeenCalled();
    });

    it('should create new payee when not found', async () => {
      vi.mocked(actualApi.getPayees).mockResolvedValue([{ id: 'payee-1', name: 'Grocery Store' }] as any);
      vi.mocked(actualApi.createPayee).mockResolvedValue('payee-2');

      const result = await fetcher.ensurePayeeExists('New Restaurant');

      expect(result).toEqual({ payeeId: 'payee-2', created: true });
      expect(actualApi.createPayee).toHaveBeenCalledWith({ name: 'New Restaurant' });
    });

    it('should return no payee when name not provided', async () => {
      const result = await fetcher.ensurePayeeExists(undefined);

      expect(result).toEqual({ created: false });
      expect(actualApi.getPayees).not.toHaveBeenCalled();
    });
  });

  describe('createTransaction - integration test', () => {
    it('should handle transaction creation with all entities', async () => {
      // Import the mocked modules to access their functions
      const coreTransactions = await import('../../core/transactions/index.js');
      const actualApp = await import('@actual-app/api');

      const input: CreateTransactionInput = {
        accountId: 'account-1',
        date: '2023-12-15',
        amount: 25.5,
        payeeName: 'New Store',
        categoryName: 'Food',
        notes: 'Test transaction',
        cleared: true,
      };

      // Mock all required API calls
      vi.mocked(actualApi.getPayees).mockResolvedValue([] as any);
      vi.mocked(actualApi.createPayee).mockResolvedValue('payee-new');
      vi.mocked(actualApi.importTransactions).mockResolvedValue('txn-123');

      // Mock core transaction utilities
      vi.mocked(coreTransactions.validateAccount).mockResolvedValue(undefined);
      vi.mocked(coreTransactions.findCategoryByName).mockResolvedValue({
        id: 'cat-1',
        name: 'Food',
        group_id: 'grp1',
      } as any);
      vi.mocked(coreTransactions.mapSubtransactions).mockResolvedValue([]);

      const result = await fetcher.createTransaction(input);

      expect(result).toEqual({
        transactionId: 'txn-123',
        payeeId: 'payee-new',
        categoryId: 'cat-1',
        createdPayee: true,
      });

      expect(actualApi.importTransactions).toHaveBeenCalledWith('account-1', [
        {
          date: '2023-12-15',
          amount: 2550, // Amount in cents
          payee: 'payee-new',
          category: 'cat-1',
          notes: 'Test transaction',
          cleared: true,
          subtransactions: undefined,
        },
      ]);

      // Should call updateTransaction as workaround for Actual's auto-categorization
      expect(actualApp.default.updateTransaction).toHaveBeenCalledWith('txn-123', { category: 'cat-1' });
    });
  });
});
