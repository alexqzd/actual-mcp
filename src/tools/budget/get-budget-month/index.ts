// ----------------------------
// GET BUDGET MONTH TOOL
// ----------------------------

import { getBudgetMonth } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { formatAmount } from '../../../utils.js';

export const schema = {
  name: 'get-budget-month',
  description: 'Get detailed budget data for a specific month including category budgets, spending, balances, income, and rollover amounts.',
  inputSchema: {
    type: 'object',
    properties: {
      year: {
        type: 'number',
        description: 'The year of the budget month',
      },
      month: {
        type: 'number',
        description: 'The month number (1-12)',
        minimum: 1,
        maximum: 12,
      },
    },
    required: ['year', 'month'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { year, month } = args;
    if (typeof year !== 'number' || typeof month !== 'number') {
      return errorFromCatch('Year and month must be numbers');
    }

    const monthString = `${year}-${String(month).padStart(2, '0')}`;
    const rawBudgetMonth = (await getBudgetMonth(monthString)) as any;

    // Convert cents to dollars in the response
    const budgetMonth = {
      ...rawBudgetMonth,
      incomeAvailable: rawBudgetMonth.incomeAvailable / 100,
      lastMonthOverspent: rawBudgetMonth.lastMonthOverspent / 100,
      forNextMonth: rawBudgetMonth.forNextMonth / 100,
      totalBudgeted: rawBudgetMonth.totalBudgeted / 100,
      toBudget: rawBudgetMonth.toBudget / 100,
      fromLastMonth: rawBudgetMonth.fromLastMonth / 100,
      totalIncome: rawBudgetMonth.totalIncome / 100,
      totalSpent: rawBudgetMonth.totalSpent / 100,
      totalBalance: rawBudgetMonth.totalBalance / 100,
      categoryGroups: rawBudgetMonth.categoryGroups?.map((group: any) => ({
        ...group,
        budgeted: group.budgeted / 100,
        spent: group.spent / 100,
        balance: group.balance / 100,
        categories: group.categories?.map((cat: any) => ({
          ...cat,
          received: cat.received / 100,
          budgeted: cat.budgeted / 100,
          spent: cat.spent / 100,
          balance: cat.balance / 100,
        })),
      })),
    };
    return successWithJson(budgetMonth);
  } catch (err) {
    return errorFromCatch(err);
  }
}
