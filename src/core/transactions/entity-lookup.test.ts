import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findCategoryByName, findPayeeByName, validateAccount } from './entity-lookup.js';
import * as actualApi from '../../actual-api.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getCategories: vi.fn(),
  getPayees: vi.fn(),
}));

describe('entity-lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findCategoryByName', () => {
    it('should find category by name (case-insensitive)', async () => {
      vi.mocked(actualApi.getCategories).mockResolvedValue([
        { id: 'cat1', name: 'Groceries', group_id: 'grp1' },
        { id: 'cat2', name: 'Gas', group_id: 'grp1' },
      ] as any);

      const result = await findCategoryByName('groceries');
      expect(result).toEqual({ id: 'cat1', name: 'Groceries', group_id: 'grp1' });
    });

    it('should return undefined if category not found', async () => {
      vi.mocked(actualApi.getCategories).mockResolvedValue([
        { id: 'cat1', name: 'Groceries', group_id: 'grp1' },
      ] as any);

      const result = await findCategoryByName('NonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('findPayeeByName', () => {
    it('should find payee by name (case-insensitive)', async () => {
      vi.mocked(actualApi.getPayees).mockResolvedValue([
        { id: 'payee1', name: 'Whole Foods' },
        { id: 'payee2', name: 'Shell Gas' },
      ] as any);

      const result = await findPayeeByName('whole foods');
      expect(result).toEqual({ id: 'payee1', name: 'Whole Foods' });
    });

    it('should return undefined if payee not found', async () => {
      vi.mocked(actualApi.getPayees).mockResolvedValue([{ id: 'payee1', name: 'Whole Foods' }] as any);

      const result = await findPayeeByName('NonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('validateAccount', () => {
    it('should pass for valid open account', async () => {
      vi.mocked(actualApi.getAccounts).mockResolvedValue([{ id: 'acc1', name: 'Checking', closed: false }] as any);

      await expect(validateAccount('acc1')).resolves.not.toThrow();
    });

    it('should throw if account not found', async () => {
      vi.mocked(actualApi.getAccounts).mockResolvedValue([{ id: 'acc1', name: 'Checking', closed: false }] as any);

      await expect(validateAccount('nonexistent')).rejects.toThrow('Account with ID nonexistent not found');
    });

    it('should throw if account is closed', async () => {
      vi.mocked(actualApi.getAccounts).mockResolvedValue([{ id: 'acc1', name: 'Old Checking', closed: true }] as any);

      await expect(validateAccount('acc1')).rejects.toThrow('Account Old Checking is closed');
    });
  });
});
