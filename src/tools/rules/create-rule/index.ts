// ----------------------------
// CREATE RULE TOOL
// ----------------------------

import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';
import { createRule } from '../../../actual-api.js';
import { RuleInputSchema } from '../input-schema.js';
import { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';

export const schema = {
  name: 'create-rule',
  description: 'Create a new rule',
  inputSchema: RuleInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const { id }: RuleEntity = await createRule(args);

    return buildMutationResponse({
      operation: 'create',
      resourceType: 'rule',
      resourceIds: id,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
