// ----------------------------
// SET BUDGET AMOUNT TOOL
// ----------------------------

import { setBudgetAmount } from '../../../actual-api.js';
import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';
import { formatAmount } from '../../../utils.js';

export const schema = {
  name: 'set-budget-amount',
  description: 'Set the budget amount for a specific category in a given month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'The month in YYYY-MM format (e.g., "2025-09")',
        pattern: '^\\d{4}-\\d{2}$',
      },
      categoryId: {
        type: 'string',
        description: 'The ID of the category to set the budget for',
      },
      amount: {
        type: 'number',
        description: 'The budget amount to set',
      },
    },
    required: ['month', 'categoryId', 'amount'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const { month, categoryId, amount } = args;
    if (typeof month !== 'string' || typeof categoryId !== 'string' || typeof amount !== 'number') {
      return errorFromCatch(
        'month must be a string in YYYY-MM format, categoryId must be a string, and amount must be a number'
      );
    }

    // Convert from dollars to cents for the API
    const amountInCents = Math.round(amount * 100);
    await setBudgetAmount(month, categoryId, amountInCents);

    return buildMutationResponse({
      operation: 'update',
      resourceType: 'budget',
      resourceIds: `${month}-${categoryId}`,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
