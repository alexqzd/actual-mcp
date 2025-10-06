// Orchestrator for get-transactions tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { GetTransactionsMapper } from './transaction-mapper.js';
import { GetTransactionsReportGenerator } from './report-generator.js';
import { errorFromCatch } from '../../utils/response.js';
import { buildReportResponse, createReportSection } from '../../utils/report-builder.js';
import { getDateRange } from '../../utils.js';
import { GetTransactionsArgsSchema, type GetTransactionsArgs, type ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'get-transactions',
  description:
    'Get transactions for an account with optional filtering by IDs. ' +
    'IMPORTANT: Filters use IDs, not names. Use get-grouped-categories to find category IDs and get-payees to find payee IDs.',
  inputSchema: zodToJsonSchema(GetTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetTransactionsArgs): Promise<CallToolResult> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryId, payeeId, limit } = input;
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    // Fetch transactions
    const transactions = await new GetTransactionsDataFetcher().fetch(accountId, start, end);
    let filtered = [...transactions];

    if (minAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount >= minAmount * 100);
    }
    if (maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount <= maxAmount * 100);
    }
    if (categoryId) {
      filtered = filtered.filter((t) => t.category === categoryId);
    }
    if (payeeId) {
      filtered = filtered.filter((t) => t.payee === payeeId);
    }
    if (limit && filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }

    // Map transactions for output
    const mapped = new GetTransactionsMapper().map(filtered);

    // Build filter description
    const filterParts = [
      startDate || endDate ? `Date range: ${startDate} to ${endDate}` : null,
      minAmount !== undefined ? `Min amount: $${minAmount.toFixed(2)}` : null,
      maxAmount !== undefined ? `Max amount: $${maxAmount.toFixed(2)}` : null,
      categoryId ? `Category ID: ${categoryId}` : null,
      payeeId ? `Payee ID: ${payeeId}` : null,
    ].filter(Boolean);
    const filterDescription = filterParts.length > 0 ? filterParts.join(', ') : 'No filters applied';

    const markdown = new GetTransactionsReportGenerator().generate(
      mapped,
      filterDescription,
      filtered.length,
      transactions.length
    );

    // Build structured report response
    const filters: Record<string, unknown> = {};
    if (categoryId) filters.categoryId = categoryId;
    if (payeeId) filters.payeeId = payeeId;
    if (minAmount !== undefined) filters.minAmount = minAmount;
    if (maxAmount !== undefined) filters.maxAmount = maxAmount;

    return buildReportResponse({
      operation: 'report',
      resourceType: 'transaction',
      summary: `Found ${filtered.length} of ${transactions.length} transactions`,
      sections: [createReportSection('Transactions', markdown)],
      data: mapped,
      metadata: {
        period: { start: start, end: end },
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
