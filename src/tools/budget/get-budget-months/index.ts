// ----------------------------
// GET BUDGET MONTHS TOOL
// ----------------------------

import { getBudgetMonths } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'get-budget-months',
  description: 'Get a list of all available budget months',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const months = await getBudgetMonths();
    return successWithJson(months);
  } catch (err) {
    return errorFromCatch(err);
  }
}
