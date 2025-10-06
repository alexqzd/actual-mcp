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
    'Use get-transactions to find transaction IDs, get-grouped-categories for category IDs, and get-payees for payee IDs.' +
    '\n\nIMPORTANT LIMITATIONS WITH SPLIT TRANSACTIONS:\n' +
    '- Updating parent split transactions (date, notes, amount) may not persist correctly in the UI due to Actual Budget API limitations\n' +
    '- To update split transactions reliably: update individual subtransactions using their IDs, or delete and recreate the split\n' +
    '- Updating category on subtransactions works, but verify changes in the UI\n' +
    '- DO NOT pass an empty subtransactions array - this will corrupt the transaction and may crash the app\n' +
    '- When updating subtransaction amounts, ensure the total matches the parent amount to avoid "Amount left" errors',
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
