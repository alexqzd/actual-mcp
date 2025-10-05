// Handles entity creation and transaction insertion for create-transaction tool

import { getPayees, createPayee, importTransactions } from '../../actual-api.js';
import { convertToCents, findCategoryByName, validateAccount, mapSubtransactions } from '../../core/transactions/index.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';
import api from '@actual-app/api';

export class CreateTransactionDataFetcher {
  /**
   * Ensures payee exists, creating it if necessary
   */
  async ensurePayeeExists(payeeName?: string): Promise<{ payeeId?: string; created: boolean }> {
    if (!payeeName) {
      return { created: false };
    }

    const payees = await getPayees();
    const existingPayee = payees.find((p) => p.name.toLowerCase() === payeeName.toLowerCase());

    if (existingPayee) {
      return { payeeId: existingPayee.id, created: false };
    }

    // Crear nuevo payee usando objeto
    const payeeId = await createPayee({ name: payeeName });
    return { payeeId, created: true };
  }


  /**
   * Creates the transaction after ensuring all entities exist
   */
  async createTransaction(input: CreateTransactionInput): Promise<EntityCreationResult & { transactionId: string }> {
    // Validate account exists
    await validateAccount(input.accountId);

    // Ensure payee exists
    const { payeeId, created: createdPayee } = await this.ensurePayeeExists(input.payeeName);

    // Find category if provided
    let categoryId: string | undefined;
    if (input.categoryName) {
      const category = await findCategoryByName(input.categoryName);
      if (!category) {
        throw new Error(`Category '${input.categoryName}' not found`);
      }
      categoryId = category.id;
    }

    // Prepare transaction object
    const transaction = {
      date: input.date,
      amount: convertToCents(input.amount),
      payee: payeeId || null,
      category: categoryId || null,
      notes: input.notes || '',
      cleared: input.cleared === undefined ? false : input.cleared,
      subtransactions: input.subtransactions ? await mapSubtransactions(input.subtransactions) : undefined,
    };

    // Add the transaction
    const transactionID = await importTransactions(input.accountId, [transaction]);

    // Workaround: Actual Budget's auto-categorization behavior
    // When a payee is provided, Actual tries to guess the category and may ignore the one we set.
    // We need to call updateTransaction to ensure the correct category is applied.
    if (input.categoryName && payeeId) {
      await api.updateTransaction(transactionID, { category: categoryId });
    }

    // Workaround: Actual clears transactions by default during import
    // If the user explicitly wants the transaction uncleared, we need to update it
    if (input.cleared === false) {
      await api.updateTransaction(transactionID, { cleared: false });
    }

    return {
      transactionId: transactionID,
      payeeId,
      categoryId,
      createdPayee,
    };
  }
}
