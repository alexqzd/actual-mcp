// ----------------------------
// CREATE PAYEE TOOL
// ----------------------------

import { errorFromCatch } from '../../../utils/response.js';
import { buildMutationResponse } from '../../../utils/report-builder.js';
import { createPayee } from '../../../actual-api.js';

export const schema = {
  name: 'create-payee',
  description: 'Create a new payee',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the payee',
      },
      transferAccount: {
        type: 'string',
        description: 'ID of the transfer account. Should be in UUID format. Only for transfer payees.',
      },
    },
    required: ['name'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof buildMutationResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.name || typeof args.name !== 'string') {
      return errorFromCatch('name is required and must be a string');
    }

    const data: Record<string, unknown> = { name: args.name };
    if (args.transferAccount) {
      data.transfer_acct = args.transferAccount;
    }

    const id: string = await createPayee(data);

    return buildMutationResponse({
      operation: 'create',
      resourceType: 'payee',
      resourceIds: id,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
