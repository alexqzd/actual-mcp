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

describe('get-budget-summary tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct schema definition', () => {
      expect(schema.name).toBe('get-budget-summary');
      expect(schema.inputSchema.required).toEqual(['startMonth', 'endMonth']);
      expect(schema.inputSchema.properties.startMonth.type).toBe('string');
      expect(schema.inputSchema.properties.endMonth.type).toBe('string');
      expect(schema.inputSchema.properties.startMonth.pattern).toBe('^\\d{4}-\\d{2}$');
    });
  });

  describe('handler', () => {
    it('should convert cents to dollars for all numeric fields including expectedToBudget', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01', '2025-02']);

      const mockMonth1 = {
        month: '2025-01',
        incomeAvailable: 100000,
        lastMonthOverspent: 0,
        forNextMonth: 0,
        totalBudgeted: 50000,
        toBudget: 50000,
        expectedToBudget: 100000,
        fromLastMonth: 0,
        totalIncome: 100000,
        totalSpent: 50000,
        totalBalance: 50000,
        categoryGroups: [{ id: 'group1', name: 'Test' }],
      };

      const mockMonth2 = {
        month: '2025-02',
        incomeAvailable: 150000,
        lastMonthOverspent: 0,
        forNextMonth: 0,
        totalBudgeted: 75000,
        toBudget: 75000,
        expectedToBudget: 150000,
        fromLastMonth: 50000,
        totalIncome: 150000,
        totalSpent: 75000,
        totalBalance: 75000,
        categoryGroups: [{ id: 'group1', name: 'Test' }],
      };

      vi.mocked(getBudgetMonth).mockResolvedValueOnce(mockMonth1).mockResolvedValueOnce(mockMonth2);

      const result = await handler({ startMonth: '2025-01', endMonth: '2025-02' });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      expect(parsed.resourceType).toBe('budget-summary');

      const data = parsed.data;
      expect(data).toHaveLength(2);

      // Verify first month conversions
      expect(data[0].month).toBe('2025-01');
      expect(data[0].incomeAvailable).toBe(1000);
      expect(data[0].totalBudgeted).toBe(500);
      expect(data[0].toBudget).toBe(500);
      expect(data[0].expectedToBudget).toBe(1000);
      expect(data[0].totalIncome).toBe(1000);
      expect(data[0].totalSpent).toBe(500);
      expect(data[0].totalBalance).toBe(500);
      expect(data[0].categoryGroups).toBeUndefined();

      // Verify second month conversions
      expect(data[1].month).toBe('2025-02');
      expect(data[1].incomeAvailable).toBe(1500);
      expect(data[1].expectedToBudget).toBe(1500);
      expect(data[1].fromLastMonth).toBe(500);

      expect(getBudgetMonths).toHaveBeenCalledOnce();
      expect(getBudgetMonth).toHaveBeenCalledTimes(2);
    });

    it('should validate startMonth format', async () => {
      const result = await handler({ startMonth: '2025/01', endMonth: '2025-02' });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('startMonth must be in YYYY-MM format');
    });

    it('should validate endMonth format', async () => {
      const result = await handler({ startMonth: '2025-01', endMonth: '2025/02' });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('endMonth must be in YYYY-MM format');
    });

    it('should handle missing parameters', async () => {
      const result = await handler({ startMonth: '2025-01' });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('Both startMonth and endMonth are required');
    });

    it('should handle no available months in requested range', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2024-01', '2024-02']);

      const result = await handler({ startMonth: '2025-01', endMonth: '2025-12' });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('No budget data found');
      expect(parsed.message).toContain('2024-01 to 2024-02');
    });

    it('should filter to only include available months', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-02', '2025-03', '2025-05']);

      const mockData = {
        month: '2025-02',
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

      const result = await handler({ startMonth: '2025-01', endMonth: '2025-04' });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      const data = parsed.data;
      expect(data).toHaveLength(2);
      expect(getBudgetMonth).toHaveBeenCalledWith('2025-02');
      expect(getBudgetMonth).toHaveBeenCalledWith('2025-03');
      expect(getBudgetMonth).not.toHaveBeenCalledWith('2025-01');
      expect(getBudgetMonth).not.toHaveBeenCalledWith('2025-04');
    });

    it('should handle API errors', async () => {
      vi.mocked(getBudgetMonths).mockRejectedValue(new Error('Failed to fetch months'));

      const result = await handler({ startMonth: '2025-01', endMonth: '2025-02' });
      const parsed = parseResponse(result);

      expect(parsed.isError).toBe(true);
      expect(parsed.message).toContain('Failed to fetch months');
    });

    it('should exclude categoryGroups from response', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2025-01']);

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
        categoryGroups: [{ id: 'test', name: 'Test Group', budgeted: 100 }],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockData);

      const result = await handler({ startMonth: '2025-01', endMonth: '2025-01' });
      const parsed = parseResponse(result);

      const data = parsed.data;
      expect(data[0]).not.toHaveProperty('categoryGroups');
    });

    it('should handle month range spanning multiple years', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2024-11', '2024-12', '2025-01', '2025-02']);

      const mockData = {
        month: '2024-11',
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

      const result = await handler({ startMonth: '2024-11', endMonth: '2025-02' });
      const parsed = parseResponse(result);

      expect(parsed.operation).toBe('query');
      const data = parsed.data;
      expect(data).toHaveLength(4);
    });
  });
});
