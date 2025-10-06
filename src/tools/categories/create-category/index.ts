// ----------------------------
// CREATE CATEGORY TOOL
// ----------------------------

import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';
import { createCategory } from '../../../actual-api.js';

export const schema = {
  name: 'create-category',
  description: 'Create a new category',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the category',
      },
      groupId: {
        type: 'string',
        description: 'ID of the category group. Should be in UUID format.',
      },
    },
    required: ['name', 'groupId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.name || typeof args.name !== 'string') {
      return errorFromCatch('name is required and must be a string');
    }

    const data: Record<string, unknown> = {
      name: args.name,
      group_id: args.groupId,
    };

    const id: string = await createCategory(data);

    return buildMutationResponse({
      operation: 'create',
      resourceType: 'category',
      resourceIds: id,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
