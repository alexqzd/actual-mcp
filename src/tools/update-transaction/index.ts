// Orchestrator for update-transaction tool

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch } from '../../utils/response.js';
import { buildMutationResponse } from '../../utils/report-builder.js';
import { UpdateTransactionArgsSchema, type UpdateTransactionArgs, ToolInput } from '../../types.js';
import { UpdateTransactionInputParser } from './input-parser.js';
import { UpdateTransactionDataFetcher } from './data-fetcher.js';
import type { UpdateTransactionInput } from './types.js';

export const schema = {
  name: 'update-transaction',
  description:
    'Update an existing transaction using IDs for transaction, category, and payee. ' +
    'Use get-transactions to find transaction IDs, get-grouped-categories for category IDs, and get-payees for payee IDs. ' +
    'Note: For split transactions, update individual subtransactions using their IDs for reliable results.',
  inputSchema: zodToJsonSchema(UpdateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: UpdateTransactionArgs): Promise<CallToolResult> {
  try {
    // Parse and validate input
    const input = new UpdateTransactionInputParser().parse(args);

    // Update transaction
    await new UpdateTransactionDataFetcher().updateTransaction(input);

    // Build list of updated fields and warnings
    const updatedFields: string[] = [];
    const warnings: string[] = [];

    if (input.date !== undefined) updatedFields.push('date');
    if (input.categoryId !== undefined) updatedFields.push('category');
    if (input.payeeId !== undefined) updatedFields.push('payee');
    if (input.notes !== undefined) updatedFields.push('notes');
    if (input.amount !== undefined) updatedFields.push('amount');
    if (input.cleared !== undefined) updatedFields.push('cleared');

    if (input.subtransactions !== undefined) {
      updatedFields.push('subtransactions');
      warnings.push(
        '⚠️  Updating subtransactions array has known limitations. ' +
          'Verify changes in the Actual Budget UI. ' +
          'If changes do not persist, delete the split transaction and create a new one.'
      );
    }

    // Warn if updating fields that might be on a split parent
    const splitParentFields: (keyof UpdateTransactionInput)[] = ['date', 'amount', 'notes'];
    const updatingSplitParentField = splitParentFields.some((field) => input[field] !== undefined);

    if (updatingSplitParentField && !input.subtransactions) {
      warnings.push(
        '⚠️  If this is a split transaction parent, updates to date/amount/notes may not persist in the UI. ' +
          'To reliably update splits: update individual subtransactions by their IDs, or delete and recreate the split.'
      );
    }

    return buildMutationResponse({
      operation: 'update',
      resourceType: 'transaction',
      resourceIds: input.transactionId,
      metadata: {
        warnings: warnings.length > 0 ? warnings : undefined,
        changes: {
          updatedFields,
        },
      },
    });
  } catch (error) {
    return errorFromCatch(error);
  }
}
