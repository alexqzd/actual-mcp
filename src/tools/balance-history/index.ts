// Orchestrator for balance-history tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BalanceHistoryInputParser } from './input-parser.js';
import { BalanceHistoryDataFetcher } from './data-fetcher.js';
import { BalanceHistoryCalculator } from './balance-calculator.js';
import { BalanceHistoryReportGenerator } from './report-generator.js';
import { errorFromCatch } from '../../utils/response.js';
import { buildReportResponse, createReportSection } from '../../utils/report-builder.js';
import { formatDate } from '../../utils.js';
import { BalanceHistoryArgsSchema, type BalanceHistoryArgs, ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'balance-history',
  description: 'Get account balance history over time using account ID. Use get-accounts to find account IDs.',
  inputSchema: zodToJsonSchema(BalanceHistoryArgsSchema) as ToolInput,
};

export async function handler(args: BalanceHistoryArgs): Promise<CallToolResult> {
  try {
    const input = new BalanceHistoryInputParser().parse(args);
    const { accountId, months } = input;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    // Fetch data
    const { account, accounts, transactions } = await new BalanceHistoryDataFetcher().fetchAll(accountId, start, end);

    // Calculate balance history
    const sortedMonths = new BalanceHistoryCalculator().calculate(account, accounts, transactions, months, endDate);

    // Generate report markdown
    const markdown = new BalanceHistoryReportGenerator().generate(account, { start, end }, sortedMonths);

    // Build structured report response
    const accountName = account ? account.name : 'All accounts';
    return buildReportResponse({
      operation: 'report',
      resourceType: 'balance-history',
      summary: `Balance history for ${accountName} from ${start} to ${end}`,
      sections: [createReportSection('Balance History', markdown, { monthCount: sortedMonths.length })],
      data: sortedMonths,
      metadata: {
        period: { start, end },
        accountId: accountId,
        accountName: accountName,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
