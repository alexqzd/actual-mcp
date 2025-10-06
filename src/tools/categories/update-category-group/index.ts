// ----------------------------
// UPDATE CATEGORY GROUP TOOL
// ----------------------------

import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';
import { updateCategoryGroup } from '../../../actual-api.js';

export const schema = {
  name: 'update-category-group',
  description: 'Update a category group',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category group. Should be in UUID format.',
      },
      name: {
        type: 'string',
        description: 'New name for the category group',
      },
    },
    required: ['id', 'name'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    const data: Record<string, unknown> = { name: args.name };

    await updateCategoryGroup(args.id, data);

    return buildMutationResponse({
      operation: 'update',
      resourceType: 'category-group',
      resourceIds: args.id,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
