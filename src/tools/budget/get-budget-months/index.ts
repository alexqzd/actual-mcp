// ----------------------------
// GET BUDGET MONTHS TOOL
// ----------------------------

import { getBudgetMonths } from '../../../actual-api.js';
import { errorFromCatch } from '../../../utils/response.js';
import { buildQueryResponse } from '../../../utils/report-builder.js';

export const schema = {
  name: 'get-budget-months',
  description:
    'Get a list of all available budget months. Use this to find which months have budget data before querying specific month details.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof buildQueryResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const months = await getBudgetMonths();
    return buildQueryResponse({
      resourceType: 'budget-month',
      data: months,
      metadata: {
        count: Array.isArray(months) ? months.length : 0,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
