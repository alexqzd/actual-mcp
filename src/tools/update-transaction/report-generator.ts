// Generates formatted output for update-transaction tool

import type { UpdateTransactionInput } from './types.js';

export class UpdateTransactionReportGenerator {
  generate(input: UpdateTransactionInput): string {
    const updates: string[] = [];

    if (input.categoryId !== undefined) {
      updates.push(`category`);
    }

    if (input.payeeId !== undefined) {
      updates.push(`payee`);
    }

    if (input.notes !== undefined) {
      updates.push(`notes`);
    }

    if (input.amount !== undefined) {
      updates.push(`amount`);
    }

    if (input.subtransactions !== undefined) {
      updates.push(`subtransactions`);
    }

    const updatesList = updates.join(', ');
    return `Successfully updated transaction ${input.transactionId}${updates.length > 0 ? ` (updated: ${updatesList})` : ''}`;
  }
}
