// ----------------------------
// GET CATEGORY BUDGETS TOOL
// ----------------------------

import { getBudgetMonth, getBudgetMonths } from '../../../actual-api.js';
import { errorFromCatch } from '../../../utils/response.js';
import { buildQueryResponse } from '../../../utils/report-builder.js';

export const schema = {
  name: 'get-category-budgets',
  description:
    'Get budget data for SPECIFIC categories in a month or range of months. Returns only the requested categories with their budgeted amounts, spending, and balances. This is much more efficient than get-budget-month when you only need a few categories, reducing context usage for LLMs. Use this for targeted category analysis across one or more months.',
  inputSchema: {
    type: 'object',
    properties: {
      categoryIds: {
        type: 'array',
        description:
          'Array of category IDs to retrieve budget data for. Use get-grouped-categories to find category IDs.',
        items: {
          type: 'string',
        },
        minItems: 1,
      },
      startMonth: {
        type: 'string',
        description: 'Start month in YYYY-MM format (e.g., "2024-01")',
        pattern: '^\\d{4}-\\d{2}$',
      },
      endMonth: {
        type: 'string',
        description: 'End month in YYYY-MM format (e.g., "2024-12"). If not provided, defaults to startMonth.',
        pattern: '^\\d{4}-\\d{2}$',
      },
    },
    required: ['categoryIds', 'startMonth'],
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

interface CategoryBudget {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  budgeted: number | null;
  spent: number | null;
  balance: number | null;
  received: number | null;
}

interface MonthCategoryBudgets {
  month: string;
  categories: CategoryBudget[];
}

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildQueryResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const { categoryIds, startMonth, endMonth } = args;

    // Validate required parameters
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return errorFromCatch('categoryIds must be a non-empty array of category ID strings');
    }

    if (typeof startMonth !== 'string') {
      return errorFromCatch('startMonth is required and must be a string in YYYY-MM format');
    }

    // Validate all category IDs are strings
    if (!categoryIds.every((id) => typeof id === 'string')) {
      return errorFromCatch('All categoryIds must be strings');
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      return errorFromCatch('startMonth must be in YYYY-MM format (e.g., "2024-01")');
    }

    // Set endMonth to startMonth if not provided
    const finalEndMonth = typeof endMonth === 'string' ? endMonth : startMonth;

    // Validate endMonth format if provided
    if (typeof endMonth === 'string' && !/^\d{4}-\d{2}$/.test(endMonth)) {
      return errorFromCatch('endMonth must be in YYYY-MM format (e.g., "2024-12")');
    }

    // Get available budget months from the API
    const availableMonths = (await getBudgetMonths()) as string[];
    const availableMonthsSet = new Set(availableMonths);

    // Generate range from startMonth to endMonth
    const requestedMonths = generateMonthRange(startMonth, finalEndMonth);

    // Filter to only include months that actually exist in the budget
    const monthsToFetch = requestedMonths.filter((month) => availableMonthsSet.has(month));

    if (monthsToFetch.length === 0) {
      return errorFromCatch(
        `No budget data found for the requested range ${startMonth} to ${finalEndMonth}. Available months: ${availableMonths[0]} to ${availableMonths[availableMonths.length - 1]}`
      );
    }

    // Create a Set of category IDs for efficient lookup
    const categoryIdSet = new Set(categoryIds as string[]);

    // Helper to convert cents to dollars, preserving null/undefined
    const convertCents = (value: number | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      return value / 100;
    };

    // Fetch each month's budget data and filter for requested categories
    const budgetData: MonthCategoryBudgets[] = await Promise.all(
      monthsToFetch.map(async (monthString) => {
        const rawBudgetMonth = (await getBudgetMonth(monthString)) as any;

        // Extract and filter categories
        const matchedCategories: CategoryBudget[] = [];

        if (rawBudgetMonth.categoryGroups && Array.isArray(rawBudgetMonth.categoryGroups)) {
          for (const group of rawBudgetMonth.categoryGroups) {
            if (group.categories && Array.isArray(group.categories)) {
              for (const category of group.categories) {
                // Check if this category ID is in the requested set
                if (categoryIdSet.has(category.id)) {
                  matchedCategories.push({
                    id: category.id,
                    name: category.name,
                    group_id: group.id,
                    group_name: group.name,
                    budgeted: convertCents(category.budgeted),
                    spent: convertCents(category.spent),
                    balance: convertCents(category.balance),
                    received: convertCents(category.received),
                  });
                }
              }
            }
          }
        }

        return {
          month: monthString,
          categories: matchedCategories,
        };
      })
    );

    // Check if any categories were found across all months
    const totalCategoriesFound = budgetData.reduce((sum, monthData) => sum + monthData.categories.length, 0);

    if (totalCategoriesFound === 0) {
      return errorFromCatch(
        `No matching categories found for the provided IDs. Use get-grouped-categories to find valid category IDs.`
      );
    }

    return buildQueryResponse({
      resourceType: 'category-budgets',
      data: budgetData,
      metadata: {
        count: budgetData.length,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
