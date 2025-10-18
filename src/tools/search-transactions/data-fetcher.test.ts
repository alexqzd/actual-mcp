import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchTransactionsDataFetcher } from './data-fetcher.js';
import type { SearchTransactionsInput } from './types.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  q: vi.fn(),
  runQuery: vi.fn(),
  getCategories: vi.fn(),
  getPayees: vi.fn(),
}));

import { q, runQuery, getCategories, getPayees } from '../../actual-api.js';

describe('SearchTransactionsDataFetcher', () => {
  let fetcher: SearchTransactionsDataFetcher;
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new SearchTransactionsDataFetcher();

    // Set up mock query builder chain
    mockQuery = {
      filter: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      calculate: vi.fn().mockReturnThis(),
      serialize: vi.fn().mockReturnValue({ table: 'transactions' }),
    };

    vi.mocked(q).mockReturnValue(mockQuery);
    vi.mocked(getCategories).mockResolvedValue([]);
    vi.mocked(getPayees).mockResolvedValue([]);
  });

  describe('Happy path', () => {
    it('should fetch transactions with searchText filter', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'grocery',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(runQuery).mockResolvedValueOnce({ data: 5 }); // count query
      vi.mocked(runQuery).mockResolvedValueOnce({ data: [] }); // main query

      const result = await fetcher.fetch(input);

      expect(q).toHaveBeenCalledWith('transactions');
      expect(mockQuery.filter).toHaveBeenCalledWith({
        notes: { $like: '%grocery%' },
      });
      expect(result.totalCount).toBe(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(50);
    });

    it('should fetch transactions with multiple filters', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'coffee',
        categoryId: 'cat-123',
        minAmount: 5,
        maxAmount: 20,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(runQuery).mockResolvedValueOnce({ data: 10 }); // count query
      vi.mocked(runQuery).mockResolvedValueOnce({ data: [] }); // main query

      await fetcher.fetch(input);

      expect(mockQuery.filter).toHaveBeenCalledWith({ notes: { $like: '%coffee%' } });
      expect(mockQuery.filter).toHaveBeenCalledWith({ category: 'cat-123' });
      expect(mockQuery.filter).toHaveBeenCalledWith({ amount: { $gte: 500 } }); // 5 currency units * 100 = 500 cents for DB query
      expect(mockQuery.filter).toHaveBeenCalledWith({ amount: { $lte: 2000 } }); // 20 currency units * 100 = 2000 cents for DB query
      expect(mockQuery.filter).toHaveBeenCalledWith({ date: { $gte: '2024-01-01' } });
      expect(mockQuery.filter).toHaveBeenCalledWith({ date: { $lte: '2024-12-31' } });
    });

    it('should apply pagination correctly', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'test',
        page: 3,
        pageSize: 25,
      };

      vi.mocked(runQuery).mockResolvedValueOnce({ data: 100 }); // count query
      vi.mocked(runQuery).mockResolvedValueOnce({ data: [] }); // main query

      const result = await fetcher.fetch(input);

      expect(mockQuery.offset).toHaveBeenCalledWith(50); // (3-1) * 25
      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(result.pagination.totalPages).toBe(4); // ceil(100 / 25)
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty results', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'nonexistent',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(runQuery).mockResolvedValueOnce({ data: 0 }); // count query
      vi.mocked(runQuery).mockResolvedValueOnce({ data: [] }); // main query

      const result = await fetcher.fetch(input);

      expect(result.transactions).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('should handle last page with fewer results', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'test',
        page: 3,
        pageSize: 50,
      };

      vi.mocked(runQuery).mockResolvedValueOnce({ data: 120 }); // count query
      vi.mocked(runQuery).mockResolvedValueOnce({ data: [] }); // main query

      const result = await fetcher.fetch(input);

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should handle payeeName filter with matching payees', async () => {
      const input: SearchTransactionsInput = {
        payeeName: 'starbucks',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(getPayees).mockResolvedValue([
        { id: 'payee-1', name: 'Starbucks Coffee' },
        { id: 'payee-2', name: 'Starbucks Downtown' },
      ] as any);

      vi.mocked(runQuery).mockResolvedValueOnce({ data: 5 }); // count query
      vi.mocked(runQuery).mockResolvedValueOnce({ data: [] }); // main query

      await fetcher.fetch(input);

      expect(mockQuery.filter).toHaveBeenCalledWith({
        payee: { $oneof: ['payee-1', 'payee-2'] },
      });
    });

    it('should return empty results if payeeName matches no payees', async () => {
      const input: SearchTransactionsInput = {
        payeeName: 'nonexistent payee',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(getPayees).mockResolvedValue([
        { id: 'payee-1', name: 'Other Store' },
      ] as any);

      const result = await fetcher.fetch(input);

      expect(result.transactions).toEqual([]);
      expect(result.totalCount).toBe(0);
      // runQuery should not be called since we know there are no matches
      expect(runQuery).not.toHaveBeenCalled();
    });
  });

  describe('Failure cases', () => {
    it('should propagate errors from runQuery', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'test',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(runQuery).mockRejectedValue(new Error('Database error'));

      await expect(fetcher.fetch(input)).rejects.toThrow('Database error');
    });

    it('should propagate errors from getCategories', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'test',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(getCategories).mockRejectedValue(new Error('Failed to fetch categories'));

      await expect(fetcher.fetch(input)).rejects.toThrow('Failed to fetch categories');
    });

    it('should propagate errors from getPayees', async () => {
      const input: SearchTransactionsInput = {
        searchText: 'test',
        page: 1,
        pageSize: 50,
      };

      vi.mocked(getPayees).mockRejectedValue(new Error('Failed to fetch payees'));

      await expect(fetcher.fetch(input)).rejects.toThrow('Failed to fetch payees');
    });
  });
});
