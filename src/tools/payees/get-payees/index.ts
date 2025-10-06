// ----------------------------
// GET PAYEES TOOL
// ----------------------------

import { errorFromCatch } from '../../../utils/response.js';
import { buildQueryResponse } from '../../../utils/report-builder.js';
import { fetchAllPayees } from '../../../core/data/fetch-payees.js';
import type { Payee } from '../../../types.js';

export const schema = {
  name: 'get-payees',
  description: 'Retrieve a list of all payees with their id, name, categoryId and transferAccountId.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof buildQueryResponse> | ReturnType<typeof errorFromCatch>> {
  try {
    const categories: Payee[] = await fetchAllPayees();

    const structured = categories.map((payee) => ({
      id: payee.id,
      name: payee.name,
      transfer_acct: payee.transfer_acct || '(not a transfer payee)',
    }));

    return buildQueryResponse({
      resourceType: 'payee',
      data: structured,
      metadata: {
        count: structured.length,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
