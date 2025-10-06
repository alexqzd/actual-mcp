// ----------------------------
// UPDATE RULE TOOL
// ----------------------------

import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';
import { updateRule } from '../../../actual-api.js';
import { RuleInputSchema } from '../input-schema.js';

export const schema = {
  name: 'update-rule',
  description: 'Update a rule',
  inputSchema: RuleInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    await updateRule(args);

    return buildMutationResponse({
      operation: 'update',
      resourceType: 'rule',
      resourceIds: args.id as string,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
