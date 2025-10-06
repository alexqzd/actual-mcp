// ----------------------------
// DELETE CATEGORY GROUP TOOL
// ----------------------------

import { deleteCategoryGroup } from '../../../actual-api.js';
import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';

export const schema = {
  name: 'delete-category-group',
  description: 'Delete a category group',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category group. Should be in UUID format.',
      },
    },
    required: ['id'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    await deleteCategoryGroup(args.id);

    return buildMutationResponse({
      operation: 'delete',
      resourceType: 'category-group',
      resourceIds: args.id,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
