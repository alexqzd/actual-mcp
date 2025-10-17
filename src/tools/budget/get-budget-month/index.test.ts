import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Mock actual-api before imports
vi.mock('../../../actual-api.js', () => ({
  getBudgetMonth: vi.fn(),
}));

import { getBudgetMonth } from '../../../actual-api.js';

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

describe('get-budget-month tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct schema definition', () => {
      expect(schema.name).toBe('get-budget-month');
      expect(schema.inputSchema.required).toEqual(['year', 'month']);
      expect(schema.inputSchema.properties.year.type).toBe('number');
      expect(schema.inputSchema.properties.month.type).toBe('number');
    });
  });

  describe('handler', () => {
    it('should convert cents to dollars for all numeric fields including expectedToBudget', async () => {
      const mockRawData = {
        month: '2025-12',
        incomeAvailable: -6895944,
        lastMonthOverspent: 0,
        forNextMonth: 0,
        totalBudgeted: -3623267,
        toBudget: -10519211,
        expectedToBudget: 50789,
        fromLastMonth: -6895944,
        totalIncome: 0,
        totalSpent: 0,
        totalBalance: 13578547,
        categoryGroups: [
          {
            id: 'group1',
            name: 'Test Group',
            budgeted: 100000,
            spent: 50000,
            balance: 50000,
            categories: [
              {
                id: 'cat1',
                name: 'Test Category',
                received: 0,
                budgeted: 100000,
                spent: 50000,
                balance: 50000,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockRawData);

      const result = await handler({ year: 2025, month: 12 });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      expect(parsed.resourceType).toBe('budget-month');

      const data = parsed.data;
      expect(data.month).toBe('2025-12');
      expect(data.incomeAvailable).toBe(-68959.44);
      expect(data.lastMonthOverspent).toBe(0);
      expect(data.forNextMonth).toBe(0);
      expect(data.totalBudgeted).toBe(-36232.67);
      expect(data.toBudget).toBe(-105192.11);
      expect(data.expectedToBudget).toBe(507.89);
      expect(data.fromLastMonth).toBe(-68959.44);
      expect(data.totalIncome).toBe(0);
      expect(data.totalSpent).toBe(0);
      expect(data.totalBalance).toBe(135785.47);

      // Verify category group conversions
      expect(data.categoryGroups[0].budgeted).toBe(1000);
      expect(data.categoryGroups[0].spent).toBe(500);
      expect(data.categoryGroups[0].balance).toBe(500);

      // Verify category conversions
      expect(data.categoryGroups[0].categories[0].received).toBe(0);
      expect(data.categoryGroups[0].categories[0].budgeted).toBe(1000);
      expect(data.categoryGroups[0].categories[0].spent).toBe(500);
      expect(data.categoryGroups[0].categories[0].balance).toBe(500);

      expect(getBudgetMonth).toHaveBeenCalledWith('2025-12');
    });

    it('should handle invalid year parameter', async () => {
      const result = await handler({ year: 'invalid', month: 12 });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('Year and month must be numbers');
    });

    it('should handle invalid month parameter', async () => {
      const result = await handler({ year: 2025, month: 'invalid' });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('Year and month must be numbers');
    });

    it('should handle API errors', async () => {
      vi.mocked(getBudgetMonth).mockRejectedValue(new Error('API connection failed'));

      const result = await handler({ year: 2025, month: 12 });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('API connection failed');
    });

    it('should format month string with zero padding', async () => {
      const mockData = {
        month: '2025-01',
        incomeAvailable: 0,
        lastMonthOverspent: 0,
        forNextMonth: 0,
        totalBudgeted: 0,
        toBudget: 0,
        expectedToBudget: 0,
        fromLastMonth: 0,
        totalIncome: 0,
        totalSpent: 0,
        totalBalance: 0,
        categoryGroups: [],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockData);

      await handler({ year: 2025, month: 1 });

      expect(getBudgetMonth).toHaveBeenCalledWith('2025-01');
    });

    it('should handle budget data with no category groups', async () => {
      const mockData = {
        month: '2025-06',
        incomeAvailable: 10000,
        lastMonthOverspent: 0,
        forNextMonth: 0,
        totalBudgeted: 5000,
        toBudget: 5000,
        expectedToBudget: 10000,
        fromLastMonth: 0,
        totalIncome: 10000,
        totalSpent: 5000,
        totalBalance: 5000,
        categoryGroups: undefined,
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockData);

      const result = await handler({ year: 2025, month: 6 });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      const data = parsed.data;
      expect(data.expectedToBudget).toBe(100);
      expect(data.categoryGroups).toBeUndefined();
    });
  });
});
