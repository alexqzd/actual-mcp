// Handles transaction creation using IDs for create-transaction tool

import { importTransactions } from '../../actual-api.js';
import { convertToCents, validateAccount } from '../../core/transactions/index.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';
import api from '@actual-app/api';

export class CreateTransactionDataFetcher {
  /**
   * Creates the transaction using provided IDs
   */
  async createTransaction(input: CreateTransactionInput): Promise<EntityCreationResult & { transactionId: string }> {
    // Validate account exists
    await validateAccount(input.accountId);

    // Map subtransactions if provided
    const subtransactions = input.subtransactions
      ? input.subtransactions.map((sub) => ({
          amount: convertToCents(sub.amount),
          category: sub.categoryId,
          notes: sub.notes || '',
        }))
      : undefined;

    // Prepare transaction object
    const transaction = {
      date: input.date,
      amount: convertToCents(input.amount),
      payee: input.payeeId || null,
      category: input.categoryId || null,
      notes: input.notes || '',
      cleared: input.cleared === undefined ? false : input.cleared,
      subtransactions,
    };

    // Add the transaction
    const transactionID = await importTransactions(input.accountId, [transaction]);

    // Workaround: Actual Budget's auto-categorization behavior
    // When a payee is provided, Actual tries to guess the category and may ignore the one we set.
    // We need to call updateTransaction to ensure the correct category is applied.
    if (input.categoryId && input.payeeId) {
      await api.updateTransaction(transactionID, { category: input.categoryId });
    }

    // Workaround: Actual clears transactions by default during import
    // If the user explicitly wants the transaction uncleared, we need to update it
    if (input.cleared === false) {
      await api.updateTransaction(transactionID, { cleared: false });
    }

    return {
      transactionId: transactionID,
      payeeId: input.payeeId,
      categoryId: input.categoryId,
    };
  }
}
