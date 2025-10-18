/**
 * Main handler for search-transactions tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchTransactionsInputParser, SearchTransactionsArgsSchema } from './input-parser.js';
import { SearchTransactionsDataFetcher } from './data-fetcher.js';
import { SearchTransactionsReportGenerator } from './report-generator.js';
import { errorFromCatch } from '../../utils/response.js';
import { buildReportResponse, createReportSection } from '../../utils/report-builder.js';
import type { SearchFilters } from './types.js';
import type { ToolInput } from '../../types.js';

export const schema = {
  name: 'search-transactions',
  description:
    'Search for transactions across all accounts in the budget. ' +
    'Supports flexible filtering by text search, payee name, category, amount range, date range, and account. ' +
    'Results are paginated to avoid overwhelming context windows. ' +
    'Use this tool to find transactions matching specific criteria without needing to know the account ID.',
  inputSchema: zodToJsonSchema(SearchTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: unknown): Promise<CallToolResult> {
  try {
    // Parse and validate input
    const input = new SearchTransactionsInputParser().parse(args as any);

    // Fetch search results
    const result = await new SearchTransactionsDataFetcher().fetch(input);

    // Build active filters object
    const activeFilters: Record<string, unknown> = {};
    if (input.searchText) activeFilters.searchText = input.searchText;
    if (input.payeeName) activeFilters.payeeName = input.payeeName;
    if (input.categoryId) activeFilters.categoryId = input.categoryId;
    if (input.minAmount !== undefined) activeFilters.minAmount = input.minAmount;
    if (input.maxAmount !== undefined) activeFilters.maxAmount = input.maxAmount;
    if (input.startDate) activeFilters.startDate = input.startDate;
    if (input.endDate) activeFilters.endDate = input.endDate;
    if (input.accountId) activeFilters.accountId = input.accountId;

    // Generate markdown report
    const markdown = new SearchTransactionsReportGenerator().generate(
      result.transactions,
      result.pagination,
      activeFilters as SearchFilters
    );

    // Build summary
    const summary = `Found ${result.totalCount} transactions (page ${result.pagination.page} of ${result.pagination.totalPages})`;

    // Return structured response
    return buildReportResponse({
      operation: 'report',
      resourceType: 'transaction',
      summary,
      sections: [createReportSection('Search Results', markdown)],
      data: result.transactions,
      metadata: {
        filters: activeFilters,
        ...({ pagination: result.pagination, totalCount: result.totalCount } as any),
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
