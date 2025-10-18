// ----------------------------
// GET RULES TOOL
// ----------------------------

import { errorFromCatch } from '../../../utils/response.js';
import { buildQueryResponse } from '../../../utils/report-builder.js';
// import type { Rule } from '../../../types.js';
import { fetchAllRules } from '../../../core/data/fetch-rules.js';
import { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';

export const schema = {
  name: 'get-rules',
  description: 'Retrieve a list of all rules. Amount values: positive for deposit, negative for payment',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof buildQueryResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const rules: RuleEntity[] = await fetchAllRules();

    return buildQueryResponse({
      resourceType: 'rule',
      data: rules,
      metadata: {
        count: rules.length,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
