import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapSubtransactions } from './transaction-mapper.js';
import * as actualApi from '../../actual-api.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  getCategories: vi.fn(),
}));

describe('transaction-mapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapSubtransactions', () => {
    it('should map subtransactions with category names to category IDs', async () => {
      vi.mocked(actualApi.getCategories).mockResolvedValue([
        { id: 'cat1', name: 'Groceries', group_id: 'grp1' },
        { id: 'cat2', name: 'Gas', group_id: 'grp1' },
      ] as any);

      const input = [
        { amount: 10.5, categoryName: 'Groceries', notes: 'Weekly shopping' },
        { amount: 25.0, categoryName: 'gas' },
      ];

      const result = await mapSubtransactions(input);

      expect(result).toEqual([
        { amount: 1050, category: 'cat1', notes: 'Weekly shopping' },
        { amount: 2500, category: 'cat2', notes: '' },
      ]);
    });

    it('should handle missing category gracefully', async () => {
      vi.mocked(actualApi.getCategories).mockResolvedValue([
        { id: 'cat1', name: 'Groceries', group_id: 'grp1' },
      ] as any);

      const input = [{ amount: 10.5, categoryName: 'NonExistent' }];

      const result = await mapSubtransactions(input);

      expect(result).toEqual([{ amount: 1050, category: undefined, notes: '' }]);
    });

    it('should handle empty array', async () => {
      vi.mocked(actualApi.getCategories).mockResolvedValue([] as any);

      const result = await mapSubtransactions([]);

      expect(result).toEqual([]);
    });
  });
});
