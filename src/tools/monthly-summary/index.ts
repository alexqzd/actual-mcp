import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MonthlySummaryInputParser } from './input-parser.js';
import { MonthlySummaryDataFetcher } from './data-fetcher.js';
import { MonthlySummaryCategoryClassifier } from './category-classifier.js';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';
import { MonthlySummaryCalculator } from './summary-calculator.js';
import { MonthlySummaryReportDataBuilder } from './report-data-builder.js';
import { MonthlySummaryReportGenerator } from './report-generator.js';
import { errorFromCatch } from '../../utils/response.js';
import { buildReportResponse, createReportSection } from '../../utils/report-builder.js';
import { getDateRangeForMonths } from '../../utils.js';
import { MonthlySummaryArgsSchema, type MonthlySummaryArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'monthly-summary',
  description:
    'Get monthly income, expenses, and savings. Optionally filter by account ID (use get-accounts to find account IDs).',
  inputSchema: zodToJsonSchema(MonthlySummaryArgsSchema) as ToolInput,
};

export async function handler(args: MonthlySummaryArgs): Promise<CallToolResult> {
  try {
    const input = new MonthlySummaryInputParser().parse(args);
    const { start, end } = getDateRangeForMonths(input.months);

    const { accounts, categories, transactions } = await new MonthlySummaryDataFetcher().fetchAll(
      input.accountId,
      start,
      end
    );
    const { incomeCategories, investmentSavingsCategories } = new MonthlySummaryCategoryClassifier().classify(
      categories
    );
    const sortedMonths = new MonthlySummaryTransactionAggregator().aggregate(
      transactions,
      incomeCategories,
      investmentSavingsCategories
    );
    const averages = new MonthlySummaryCalculator().calculateAverages(sortedMonths);
    const reportData = new MonthlySummaryReportDataBuilder().build(
      start,
      end,
      input.accountId,
      accounts,
      sortedMonths,
      averages
    );
    const markdown = new MonthlySummaryReportGenerator().generate(reportData);

    // Build structured report response
    const accountName = reportData.accountName || 'All on-budget accounts';
    return buildReportResponse({
      operation: 'analyze',
      resourceType: 'monthly-summary',
      summary: `Monthly financial summary for ${accountName} from ${start} to ${end}`,
      sections: [createReportSection('Monthly Summary', markdown, sortedMonths)],
      data: {
        months: sortedMonths,
        averages: averages,
      },
      metadata: {
        period: { start, end },
        accountId: input.accountId,
        accountName: accountName,
      },
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
