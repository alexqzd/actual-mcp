// Orchestrator for create-transaction tool

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CreateTransactionInputParser } from './input-parser.js';
import { CreateTransactionDataFetcher } from './data-fetcher.js';
import { errorFromCatch } from '../../utils/response.js';
import { buildMutationResponse } from '../../utils/report-builder.js';
import { formatAmount } from '../../utils.js';
import { convertToCents } from '../../core/transactions/index.js';
import { CreateTransactionArgsSchema, type CreateTransactionArgs, ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'create-transaction',
  description:
    'Create a new transaction using IDs for account, payee, and category. ' +
    'IMPORTANT: This tool uses IDs, not names. Use get-accounts to find account IDs, ' +
    'get-payees to find payee IDs, and get-grouped-categories to find category IDs.',
  inputSchema: zodToJsonSchema(CreateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: CreateTransactionArgs): Promise<CallToolResult> {
  try {
    // Parse and validate input
    const input = new CreateTransactionInputParser().parse(args);

    // Create transaction and any necessary entities
    const result = await new CreateTransactionDataFetcher().createTransaction(input);

    // Build structured mutation response
    const newValues: Record<string, unknown> = {
      transactionId: result.transactionId,
      date: input.date,
      amount: formatAmount(convertToCents(input.amount)),
      accountId: input.accountId,
      status: input.cleared ? 'Cleared' : 'Pending',
    };

    if (input.payeeId) {
      newValues.payeeId = input.payeeId;
    }
    if (input.categoryId) {
      newValues.categoryId = input.categoryId;
    }
    if (input.notes) {
      newValues.notes = input.notes;
    }

    return buildMutationResponse({
      operation: 'create',
      resourceType: 'transaction',
      resourceIds: result.transactionId,
      metadata: {
        changes: {
          newValues,
        },
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
