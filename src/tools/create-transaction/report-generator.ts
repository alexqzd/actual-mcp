// Generates formatted output for create-transaction tool

import { formatAmount } from '../../utils.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';

export class CreateTransactionReportGenerator {
  generate(input: CreateTransactionInput, result: EntityCreationResult & { transactionId: string }): string {
    const { accountId, date, amount, payeeName, categoryName, notes, cleared } = input;
    const { createdPayee } = result;

    let report = `# Transaction Created Successfully\n\n`;

    // Transaction details
    report += `## Transaction Details\n\n`;
    report += `- **Date**: ${date}\n`;
    report += `- **Amount**: ${formatAmount(amount * 100)}\n`;
    report += `- **Account ID**: ${accountId}\n`;

    if (payeeName) {
      report += `- **Payee**: ${payeeName}`;
      if (createdPayee) {
        report += ` *(newly created)*`;
      }
      report += `\n`;
    }

    if (categoryName) {
      report += `- **Category**: ${categoryName}`;
      report += `\n`;
    }

    if (notes) {
      report += `- **Notes**: ${notes}\n`;
    }

    report += `- **Status**: ${cleared ? 'Cleared' : 'Pending'}\n\n`;

    // Creation summary
    if (createdPayee) {
      report += `## Entities Created\n\n`;

      if (createdPayee && payeeName) {
        report += `- ✓ Created new payee: **${payeeName}**\n`;
      }

      report += `\n`;
    }

    report += `The transaction has been successfully added to your budget.`;

    return report;
  }
}
