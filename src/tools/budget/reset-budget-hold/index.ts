// ----------------------------
// RESET BUDGET HOLD TOOL
// ----------------------------

import { resetBudgetHold } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'reset-budget-hold',
  description: 'Reset/remove any held amount for the specified month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'The month in YYYY-MM format (e.g., "2025-09")',
        pattern: '^\\d{4}-\\d{2}$'
      },
    },
    required: ['month'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { month } = args;
    if (typeof month !== 'string') {
      return errorFromCatch('month must be a string in YYYY-MM format');
    }

    await resetBudgetHold(month);
    return successWithJson(`Successfully reset budget hold for ${month}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}