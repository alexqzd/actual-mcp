// Generates formatted output for create-transaction tool

import { formatAmount } from '../../utils.js';
import { convertToCents } from '../../core/transactions/index.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';

export class CreateTransactionReportGenerator {
  generate(input: CreateTransactionInput, result: EntityCreationResult & { transactionId: string }): string {
    const { accountId, date, amount, payeeId, categoryId, notes, cleared } = input;

    let report = `# Transaction Created Successfully\n\n`;

    // Transaction details
    report += `## Transaction Details\n\n`;
    report += `- **Transaction ID**: ${result.transactionId}\n`;
    report += `- **Date**: ${date}\n`;
    report += `- **Amount**: ${formatAmount(convertToCents(amount))}\n`;
    report += `- **Account ID**: ${accountId}\n`;

    if (payeeId) {
      report += `- **Payee ID**: ${payeeId}\n`;
    }

    if (categoryId) {
      report += `- **Category ID**: ${categoryId}\n`;
    }

    if (notes) {
      report += `- **Notes**: ${notes}\n`;
    }

    report += `- **Status**: ${cleared ? 'Cleared' : 'Pending'}\n\n`;

    report += `The transaction has been successfully added to your budget.`;

    return report;
  }
}
