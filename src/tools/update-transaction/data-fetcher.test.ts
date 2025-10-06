import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateTransactionDataFetcher } from './data-fetcher.js';
import type { UpdateTransactionInput } from './types.js';

// Mock @actual-app/api
vi.mock('@actual-app/api', () => ({
  default: {
    updateTransaction: vi.fn(),
  },
}));

// Mock actual-api.js
vi.mock('../../actual-api.js', () => ({
  initActualApi: vi.fn(),
}));

// Mock convertToCents from core/transactions
vi.mock('../../core/transactions/index.js', () => ({
  convertToCents: vi.fn((amount: number) => Math.round(amount * 100)),
}));

// Mock logger
vi.mock('../../core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('UpdateTransactionDataFetcher', () => {
  let fetcher: UpdateTransactionDataFetcher;
  let mockUpdateTransaction: ReturnType<typeof vi.fn>;
  let mockInitActualApi: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetcher = new UpdateTransactionDataFetcher();

    const actualApi = await import('@actual-app/api');
    mockUpdateTransaction = actualApi.default.updateTransaction as ReturnType<typeof vi.fn>;

    const actualApiModule = await import('../../actual-api.js');
    mockInitActualApi = actualApiModule.initActualApi as ReturnType<typeof vi.fn>;
  });

  describe('updateTransaction', () => {
    it('should update transaction with date field', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        date: '2025-02-20',
      };

      await fetcher.updateTransaction(input);

      expect(mockInitActualApi).toHaveBeenCalled();
      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', {
        date: '2025-02-20',
      });
    });

    it('should update transaction with cleared status true', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        cleared: true,
      };

      await fetcher.updateTransaction(input);

      expect(mockInitActualApi).toHaveBeenCalled();
      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', {
        cleared: true,
      });
    });

    it('should update transaction with cleared status false', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        cleared: false,
      };

      await fetcher.updateTransaction(input);

      expect(mockInitActualApi).toHaveBeenCalled();
      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', {
        cleared: false,
      });
    });

    it('should update transaction with all fields including date and cleared', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        date: '2025-03-15',
        categoryId: 'cat-456',
        payeeId: 'payee-789',
        notes: 'Updated note',
        amount: 100.5,
        cleared: true,
      };

      await fetcher.updateTransaction(input);

      expect(mockInitActualApi).toHaveBeenCalled();
      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', {
        date: '2025-03-15',
        category: 'cat-456',
        payee: 'payee-789',
        notes: 'Updated note',
        amount: 10050, // converted to cents
        cleared: true,
      });
    });

    it('should update transaction with only some fields', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        amount: 75.25,
        notes: 'New note',
      };

      await fetcher.updateTransaction(input);

      expect(mockInitActualApi).toHaveBeenCalled();
      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', {
        amount: 7525,
        notes: 'New note',
      });
    });

    it('should throw error if no fields to update are provided', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
      };

      await expect(fetcher.updateTransaction(input)).rejects.toThrow('No fields to update provided');
    });

    it('should update transaction with subtransactions', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        subtransactions: [
          {
            amount: 50,
            categoryId: 'cat-1',
            notes: 'Split 1',
          },
          {
            amount: 25.5,
            categoryId: 'cat-2',
          },
        ],
      };

      await fetcher.updateTransaction(input);

      expect(mockInitActualApi).toHaveBeenCalled();
      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', {
        subtransactions: [
          {
            amount: 5000,
            category: 'cat-1',
            notes: 'Split 1',
          },
          {
            amount: 2550,
            category: 'cat-2',
            notes: '',
          },
        ],
      });
    });

    it('should throw error when trying to set subtransactions to empty array', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        subtransactions: [],
      };

      await expect(fetcher.updateTransaction(input)).rejects.toThrow('Cannot set subtransactions to an empty array');

      expect(mockUpdateTransaction).not.toHaveBeenCalled();
    });

    it('should not throw error for empty subtransactions if subtransactions is undefined', async () => {
      const input: UpdateTransactionInput = {
        transactionId: 'txn-123',
        amount: 100,
      };

      await fetcher.updateTransaction(input);

      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', {
        amount: 10000,
      });
    });
  });
});
