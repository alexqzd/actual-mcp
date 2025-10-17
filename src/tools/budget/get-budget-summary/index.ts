// ----------------------------
// GET BUDGET SUMMARY TOOL
// ----------------------------

import { getBudgetMonth, getBudgetMonths } from '../../../actual-api.js';
import { errorFromCatch } from '../../../utils/response.js';
import { buildQueryResponse } from '../../../utils/report-builder.js';

export const schema = {
  name: 'get-budget-summary',
  description:
    'Get high-level budget overview for a date range of months. Returns total income, expenses, budgeted amounts, and balances per month WITHOUT category-level breakdowns. Use this for comparing trends across multiple months or quick financial snapshots. For detailed category-by-category analysis of a single month, use get-budget-month instead.',
  inputSchema: {
    type: 'object',
    properties: {
      startMonth: {
        type: 'string',
        description: 'Start month in YYYY-MM format (e.g., "2024-01")',
        pattern: '^\\d{4}-\\d{2}$',
      },
      endMonth: {
        type: 'string',
        description: 'End month in YYYY-MM format (e.g., "2024-12")',
        pattern: '^\\d{4}-\\d{2}$',
      },
    },
    required: ['startMonth', 'endMonth'],
  },
};

/**
 * Generate list of months between start and end (inclusive)
 */
function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildQueryResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const { startMonth, endMonth } = args;

    // Validate required parameters
    if (typeof startMonth !== 'string' || typeof endMonth !== 'string') {
      return errorFromCatch('Both startMonth and endMonth are required');
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      return errorFromCatch('startMonth must be in YYYY-MM format (e.g., "2024-01")');
    }
    if (!/^\d{4}-\d{2}$/.test(endMonth)) {
      return errorFromCatch('endMonth must be in YYYY-MM format (e.g., "2024-12")');
    }

    // Get available budget months from the API
    const availableMonths = (await getBudgetMonths()) as string[];
    const availableMonthsSet = new Set(availableMonths);

    // Generate range from startMonth to endMonth
    const requestedMonths = generateMonthRange(startMonth, endMonth);

    // Filter to only include months that actually exist in the budget
    const monthsToFetch = requestedMonths.filter((month) => availableMonthsSet.has(month));

    if (monthsToFetch.length === 0) {
      return errorFromCatch(
        `No budget data found for the requested range ${startMonth} to ${endMonth}. Available months: ${availableMonths[0]} to ${availableMonths[availableMonths.length - 1]}`
      );
    }

    // Fetch each month's budget data
    const budgetData = await Promise.all(
      monthsToFetch.map(async (monthString) => {
        const rawBudgetMonth = (await getBudgetMonth(monthString)) as any;

        // Convert cents to dollars and exclude categoryGroups
        const { categoryGroups, ...monthData } = rawBudgetMonth;

        return {
          ...monthData,
          incomeAvailable: monthData.incomeAvailable / 100,
          lastMonthOverspent: monthData.lastMonthOverspent / 100,
          forNextMonth: monthData.forNextMonth / 100,
          totalBudgeted: monthData.totalBudgeted / 100,
          toBudget: monthData.toBudget / 100,
          fromLastMonth: monthData.fromLastMonth / 100,
          totalIncome: monthData.totalIncome / 100,
          totalSpent: monthData.totalSpent / 100,
          totalBalance: monthData.totalBalance / 100,
        };
      })
    );

    return buildQueryResponse({
      resourceType: 'budget-summary',
      data: budgetData,
      metadata: {
        count: budgetData.length,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
