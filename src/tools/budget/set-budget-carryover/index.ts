// ----------------------------
// SET BUDGET CARRYOVER TOOL
// ----------------------------

import { setBudgetCarryover } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'set-budget-carryover',
  description: 'Enable or disable budget carryover for a specific category in a given month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'The month in YYYY-MM format (e.g., "2025-09")',
        pattern: '^\\d{4}-\\d{2}$'
      },
      categoryId: {
        type: 'string',
        description: 'The ID of the category to set the carryover for',
      },
      carryover: {
        type: 'boolean',
        description: 'Whether to enable carryover for this category',
      },
    },
    required: ['month', 'categoryId', 'carryover'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { month, categoryId, carryover } = args;
    if (typeof month !== 'string' || typeof categoryId !== 'string' || typeof carryover !== 'boolean') {
      return errorFromCatch('month must be a string in YYYY-MM format, categoryId must be a string, and carryover must be a boolean');
    }

    await setBudgetCarryover(month, categoryId, carryover);
    return successWithJson(`Successfully ${carryover ? 'enabled' : 'disabled'} budget carryover for category ${categoryId} in month ${month}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}