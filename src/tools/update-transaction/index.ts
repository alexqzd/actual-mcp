// Orchestrator for update-transaction tool

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../utils/response.js';
import { UpdateTransactionArgsSchema, type UpdateTransactionArgs, ToolInput } from '../../types.js';
import { UpdateTransactionInputParser } from './input-parser.js';
import { UpdateTransactionDataFetcher } from './data-fetcher.js';
import { UpdateTransactionReportGenerator } from './report-generator.js';

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

    // Generate formatted report
    const markdown = new UpdateTransactionReportGenerator().generate(input);

    return success(markdown);
  } catch (error) {
    return errorFromCatch(error);
  }
}
