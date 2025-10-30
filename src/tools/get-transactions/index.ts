// Orchestrator for get-transactions tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { GetTransactionsMapper } from './transaction-mapper.js';
import { GetTransactionsBalanceCalculator } from './balance-calculator.js';
import { errorFromCatch } from '../../utils/response.js';
import { buildQueryResponse } from '../../utils/report-builder.js';
import { getDateRange } from '../../utils.js';
import { GetTransactionsArgsSchema, type GetTransactionsArgs, type ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';

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

    // Fetch account information for balance calculation
    const accounts = await fetchAllAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    // Fetch ALL transactions for the account (for accurate balance calculation)
    // Use a wide date range to get all transactions
    const allTransactions = await new GetTransactionsDataFetcher().fetch(accountId, '1900-01-01', '2100-12-31');

    // Calculate account balance metadata from all transactions
    const balanceCalculator = new GetTransactionsBalanceCalculator();
    const accountBalance = balanceCalculator.calculateAccountBalance(account, allTransactions);

    // Apply date filter
    let filtered = allTransactions.filter((t) => t.date >= start && t.date <= end);

    // Apply other filters
    if (minAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount >= minAmount);
    }
    if (maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount <= maxAmount);
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

    // Calculate filtered transactions total
    const filteredTransactions = balanceCalculator.calculateFilteredTotal(filtered);

    // Map transactions for output
    const mapped = new GetTransactionsMapper().map(filtered);

    // Build filters object
    const filters: Record<string, unknown> = {};
    if (categoryId) filters.categoryId = categoryId;
    if (payeeId) filters.payeeId = payeeId;
    if (minAmount !== undefined) filters.minAmount = minAmount;
    if (maxAmount !== undefined) filters.maxAmount = maxAmount;

    return buildQueryResponse({
      resourceType: 'transaction',
      data: mapped,
      summary: `Found ${filtered.length} of ${allTransactions.length} transactions`,
      metadata: {
        accountBalance,
        filteredTransactions,
        count: filtered.length,
        period: { start, end },
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
