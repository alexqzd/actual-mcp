// ----------------------------
// HOLD BUDGET FOR NEXT MONTH TOOL
// ----------------------------

import { holdBudgetForNextMonth } from '../../../actual-api.js';
import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';
import { formatAmount } from '../../../utils.js';

export const schema = {
  name: 'hold-budget-for-next-month',
  description: 'Hold a portion of the budget for next month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'The month in YYYY-MM format (e.g., "2025-09")',
        pattern: '^\\d{4}-\\d{2}$',
      },
      amount: {
        type: 'number',
        description: 'The amount to hold for next month',
      },
    },
    required: ['month', 'amount'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const { month, amount } = args;
    if (typeof month !== 'string' || typeof amount !== 'number') {
      return errorFromCatch('month must be a string in YYYY-MM format and amount must be a number');
    }

    // Convert from dollars to cents for the API
    const amountInCents = Math.round(amount * 100);
    await holdBudgetForNextMonth(month, amountInCents);

    return buildMutationResponse({
      operation: 'update',
      resourceType: 'budget',
      resourceIds: month,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
