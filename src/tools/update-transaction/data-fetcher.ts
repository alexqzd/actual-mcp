// Handles transaction update operations

import api from '@actual-app/api';
import { initActualApi } from '../../actual-api.js';
import { convertToCents } from '../../core/transactions/index.js';
import type { UpdateTransactionInput } from './types.js';

export class UpdateTransactionDataFetcher {
  /**
   * Update an existing transaction with new values
   */
  async updateTransaction(input: UpdateTransactionInput): Promise<void> {
    await initActualApi();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};

    if (input.categoryId !== undefined) {
      updateData.category = input.categoryId;
    }

    if (input.payeeId !== undefined) {
      updateData.payee = input.payeeId;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    if (input.amount !== undefined) {
      updateData.amount = convertToCents(input.amount);
    }

    if (input.subtransactions !== undefined) {
      updateData.subtransactions = input.subtransactions.map((sub) => ({
        amount: convertToCents(sub.amount),
        category: sub.categoryId,
        notes: sub.notes || '',
      }));
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update provided');
    }

    // Update the transaction using the Actual API
    await api.updateTransaction(input.transactionId, updateData);
  }
}
