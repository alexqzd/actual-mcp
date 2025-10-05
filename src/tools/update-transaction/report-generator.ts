// Generates formatted output for update-transaction tool

import type { UpdateTransactionInput } from './types.js';

export class UpdateTransactionReportGenerator {
  generate(input: UpdateTransactionInput): string {
    const updates: string[] = [];
    const warnings: string[] = [];

    if (input.date !== undefined) {
      updates.push(`date`);
    }

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

    if (input.cleared !== undefined) {
      updates.push(`cleared`);
    }

    if (input.subtransactions !== undefined) {
      updates.push(`subtransactions`);
      warnings.push(
        '⚠️  Updating subtransactions array has known limitations. ' +
          'Verify changes in the Actual Budget UI. ' +
          'If changes do not persist, delete the split transaction and create a new one.'
      );
    }

    // Warn if updating fields that might be on a split parent
    const splitParentFields: (keyof UpdateTransactionInput)[] = ['date', 'amount', 'notes'];
    const updatingSplitParentField = splitParentFields.some((field) => input[field] !== undefined);

    if (updatingSplitParentField && !input.subtransactions) {
      warnings.push(
        '⚠️  If this is a split transaction parent, updates to date/amount/notes may not persist in the UI. ' +
          'To reliably update splits: update individual subtransactions by their IDs, or delete and recreate the split.'
      );
    }

    const updatesList = updates.join(', ');
    let report = `✅ Successfully updated transaction ${input.transactionId}${updates.length > 0 ? ` (updated: ${updatesList})` : ''}`;

    if (warnings.length > 0) {
      report += '\n\n' + warnings.join('\n\n');
    }

    return report;
  }
}
