// Handles entity creation and transaction insertion for create-transaction tool

import {
  getAccounts,
  getPayees,
  getCategories,
  getCategoryGroups,
  createPayee,
  createCategory,
  createCategoryGroup,
  addTransactions,
  importTransactions,
} from '../../actual-api.js';
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
   * Validates account exists
   */
  async validateAccount(accountId: string): Promise<void> {
    const accounts = await getAccounts();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    if (account.closed) {
      throw new Error(`Account ${account.name} is closed`);
    }
  }

  /**
   * Creates the transaction after ensuring all entities exist
   */
  async createTransaction(input: CreateTransactionInput): Promise<EntityCreationResult & { transactionId: string }> {
    // Validate account exists
    await this.validateAccount(input.accountId);

    // Ensure payee exists
    const { payeeId, created: createdPayee } = await this.ensurePayeeExists(input.payeeName);

    // Ensure category exists if provided
    let categoryId: string | undefined;
    const categories = await getCategories();
    if (!input.categoryName) {
      // No category provided
      categoryId = undefined;
    } else {
      // Try to find existing category
      let targetCategory = categories.find((c) => c.name.toLowerCase() === input.categoryName!.toLowerCase());

      if (!targetCategory) {
      // If category not found, return error
      throw new Error(`Category '${input.categoryName}' not found`);
      }

      categoryId = targetCategory.id;
    }

    // Convert amount to cents (Actual uses integer cents)
    const amountInCents = Math.round(input.amount * 100);

    // Prepare transaction object
    const transaction = {
      date: input.date,
      amount: amountInCents,
      payee: payeeId || null,
      category: categoryId || null,
      notes: input.notes || '',
      cleared: input.cleared === undefined ? false : input.cleared,
      subtransactions: input.subtransactions ? input.subtransactions.map((sub) => ({
        amount: Math.round(sub.amount * 100),
        category: categories.find((c) => c.name.toLowerCase() === sub.categoryName.toLowerCase())?.id,
        notes: sub.notes || '',
      })) : undefined,
    };

    // Add the transaction
    // await addTransactions(input.accountId, [transaction], { learnCategories: true, runTransfers: true });
    let transactionID = await importTransactions(input.accountId, [transaction]);

    // if a payee was provided, Actual will try to guess the category and ignore the one provided
    // so we need to call the updateTransaction endpoint to set the correct category
    // but only if a category was provided
    if (input.categoryName && payeeId) {
      await api.updateTransaction(transactionID, { category: categoryId });
    }

    // Actual clears transactions by default, so if the user specified cleared: false, we need to update it
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
