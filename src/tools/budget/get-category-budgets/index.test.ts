import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Mock actual-api before imports
vi.mock('../../../actual-api.js', () => ({
  getBudgetMonth: vi.fn(),
  getBudgetMonths: vi.fn(),
}));

import { getBudgetMonth, getBudgetMonths } from '../../../actual-api.js';

/**
 * Helper to parse MCP response and extract JSON data
 */
function parseResponse(result: CallToolResult): any {
  if (result.isError) {
    return {
      isError: true,
      message: result.content[0]?.type === 'text' ? result.content[0].text : 'Unknown error',
    };
  }
  if (result.content[0]?.type === 'text') {
    return JSON.parse(result.content[0].text);
  }
  throw new Error('Unexpected response format');
}

describe('get-category-budgets tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct schema definition', () => {
      expect(schema.name).toBe('get-category-budgets');
      expect(schema.inputSchema.required).toEqual(['categoryIds', 'startMonth']);
      expect(schema.inputSchema.properties.categoryIds.type).toBe('array');
      expect(schema.inputSchema.properties.categoryIds.items.type).toBe('string');
      expect(schema.inputSchema.properties.categoryIds.minItems).toBe(1);
      expect(schema.inputSchema.properties.startMonth.type).toBe('string');
      expect(schema.inputSchema.properties.startMonth.pattern).toBe('^\\d{4}-\\d{2}$');
      expect(schema.inputSchema.properties.endMonth.pattern).toBe('^\\d{4}-\\d{2}$');
    });
  });

  describe('handler', () => {
    it('should retrieve budget data for specific categories in a single month', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01']);

      const mockBudgetMonth = {
        month: '2025-01',
        incomeAvailable: 100000,
        categoryGroups: [
          {
            id: 'group1',
            name: 'Living Expenses',
            categories: [
              {
                id: 'cat1',
                name: 'Groceries',
                budgeted: 50000, // $500
                spent: 45000, // $450
                balance: 5000, // $50
                received: 0,
              },
              {
                id: 'cat2',
                name: 'Utilities',
                budgeted: 20000, // $200
                spent: 18000, // $180
                balance: 2000, // $20
                received: 0,
              },
            ],
          },
          {
            id: 'group2',
            name: 'Entertainment',
            categories: [
              {
                id: 'cat3',
                name: 'Dining Out',
                budgeted: 15000,
                spent: 12000,
                balance: 3000,
                received: 0,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetMonth);

      const result = await handler({
        categoryIds: ['cat1', 'cat3'],
        startMonth: '2025-01',
      });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      expect(parsed.resourceType).toBe('category-budgets');

      const data = parsed.data;
      expect(data).toHaveLength(1);
      expect(data[0].month).toBe('2025-01');
      expect(data[0].categories).toHaveLength(2);

      // Verify Groceries category
      const groceries = data[0].categories.find((c: any) => c.id === 'cat1');
      expect(groceries).toBeDefined();
      expect(groceries.name).toBe('Groceries');
      expect(groceries.group_name).toBe('Living Expenses');
      expect(groceries.budgeted).toBe(500); // Converted from cents
      expect(groceries.spent).toBe(450);
      expect(groceries.balance).toBe(50);

      // Verify Dining Out category
      const diningOut = data[0].categories.find((c: any) => c.id === 'cat3');
      expect(diningOut).toBeDefined();
      expect(diningOut.name).toBe('Dining Out');
      expect(diningOut.group_name).toBe('Entertainment');
      expect(diningOut.budgeted).toBe(150);

      // Verify metadata
      expect(parsed.metadata.count).toBe(1);

      expect(getBudgetMonths).toHaveBeenCalledOnce();
      expect(getBudgetMonth).toHaveBeenCalledWith('2025-01');
    });

    it('should retrieve budget data across multiple months', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01', '2025-02']);

      const mockMonth1 = {
        month: '2025-01',
        categoryGroups: [
          {
            id: 'group1',
            name: 'Living',
            categories: [
              {
                id: 'cat1',
                name: 'Groceries',
                budgeted: 50000,
                spent: 45000,
                balance: 5000,
                received: 0,
              },
            ],
          },
        ],
      };

      const mockMonth2 = {
        month: '2025-02',
        categoryGroups: [
          {
            id: 'group1',
            name: 'Living',
            categories: [
              {
                id: 'cat1',
                name: 'Groceries',
                budgeted: 52000,
                spent: 48000,
                balance: 4000,
                received: 0,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValueOnce(mockMonth1).mockResolvedValueOnce(mockMonth2);

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
        endMonth: '2025-02',
      });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      const data = parsed.data;
      expect(data).toHaveLength(2);

      expect(data[0].month).toBe('2025-01');
      expect(data[0].categories[0].budgeted).toBe(500);

      expect(data[1].month).toBe('2025-02');
      expect(data[1].categories[0].budgeted).toBe(520);

      expect(getBudgetMonth).toHaveBeenCalledTimes(2);
    });

    it('should use startMonth as endMonth when endMonth is not provided', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01']);

      const mockBudgetMonth = {
        month: '2025-01',
        categoryGroups: [
          {
            id: 'group1',
            name: 'Test',
            categories: [
              {
                id: 'cat1',
                name: 'Test Category',
                budgeted: 10000,
                spent: 5000,
                balance: 5000,
                received: 0,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetMonth);

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
        // endMonth not provided
      });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      expect(parsed.data).toHaveLength(1);
      expect(getBudgetMonth).toHaveBeenCalledOnce();
      expect(getBudgetMonth).toHaveBeenCalledWith('2025-01');
    });

    it('should validate categoryIds is a non-empty array', async () => {
      const result = await handler({
        categoryIds: [],
        startMonth: '2025-01',
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('categoryIds must be a non-empty array');
    });

    it('should validate all categoryIds are strings', async () => {
      const result = await handler({
        categoryIds: ['cat1', 123, 'cat2'],
        startMonth: '2025-01',
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('All categoryIds must be strings');
    });

    it('should validate startMonth format', async () => {
      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025/01',
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('startMonth must be in YYYY-MM format');
    });

    it('should validate endMonth format when provided', async () => {
      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
        endMonth: 'invalid',
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('endMonth must be in YYYY-MM format');
    });

    it('should handle missing startMonth parameter', async () => {
      const result = await handler({
        categoryIds: ['cat1'],
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('startMonth is required');
    });

    it('should handle no matching categories found', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01']);

      const mockBudgetMonth = {
        month: '2025-01',
        categoryGroups: [
          {
            id: 'group1',
            name: 'Test',
            categories: [
              {
                id: 'other-cat',
                name: 'Other Category',
                budgeted: 10000,
                spent: 5000,
                balance: 5000,
                received: 0,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetMonth);

      const result = await handler({
        categoryIds: ['nonexistent-cat'],
        startMonth: '2025-01',
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('No matching categories found');
      expect(parsed.message).toContain('get-grouped-categories');
    });

    it('should handle no available months in requested range', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2024-01', '2024-02']);

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
        endMonth: '2025-12',
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('No budget data found');
      expect(parsed.message).toContain('2024-01 to 2024-02');
    });

    it('should filter to only include available months in range', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-02', '2025-04']);

      const mockMonth = {
        month: '2025-02',
        categoryGroups: [
          {
            id: 'group1',
            name: 'Test',
            categories: [
              {
                id: 'cat1',
                name: 'Test',
                budgeted: 10000,
                spent: 5000,
                balance: 5000,
                received: 0,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockMonth);

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
        endMonth: '2025-04',
      });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      expect(parsed.data).toHaveLength(2);

      // Should only fetch available months (2025-02 and 2025-04), skip 2025-01 and 2025-03
      expect(getBudgetMonth).toHaveBeenCalledWith('2025-02');
      expect(getBudgetMonth).toHaveBeenCalledWith('2025-04');
      expect(getBudgetMonth).toHaveBeenCalledTimes(2);
    });

    it('should handle null/undefined values in category amounts', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01']);

      const mockBudgetMonth = {
        month: '2025-01',
        categoryGroups: [
          {
            id: 'group1',
            name: 'Test',
            categories: [
              {
                id: 'cat1',
                name: 'Test Category',
                budgeted: null,
                spent: undefined,
                balance: 0,
                received: null,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetMonth);

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
      });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      const category = parsed.data[0].categories[0];
      expect(category.budgeted).toBeNull();
      expect(category.spent).toBeNull();
      expect(category.balance).toBe(0);
      expect(category.received).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(getBudgetMonths).mockRejectedValue(new Error('API connection failed'));

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
      });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('API connection failed');
    });

    it('should handle month range spanning multiple years', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2024-12', '2025-01', '2025-02']);

      const mockMonth = {
        month: '2024-12',
        categoryGroups: [
          {
            id: 'group1',
            name: 'Test',
            categories: [
              {
                id: 'cat1',
                name: 'Test',
                budgeted: 10000,
                spent: 5000,
                balance: 5000,
                received: 0,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockMonth);

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2024-12',
        endMonth: '2025-02',
      });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      expect(parsed.data).toHaveLength(3);
      expect(getBudgetMonth).toHaveBeenCalledTimes(3);
    });

    it('should include all group information for matched categories', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01']);

      const mockBudgetMonth = {
        month: '2025-01',
        categoryGroups: [
          {
            id: 'group-123',
            name: 'Custom Group Name',
            categories: [
              {
                id: 'cat1',
                name: 'Test Category',
                budgeted: 10000,
                spent: 5000,
                balance: 5000,
                received: 2000,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetMonth);

      const result = await handler({
        categoryIds: ['cat1'],
        startMonth: '2025-01',
      });
      const parsed = parseResponse(result);

      const category = parsed.data[0].categories[0];
      expect(category.group_id).toBe('group-123');
      expect(category.group_name).toBe('Custom Group Name');
      expect(category.received).toBe(20); // Converted from cents
    });
  });
});
