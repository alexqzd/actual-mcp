// Handles transaction update operations

import api from '@actual-app/api';
import { initActualApi } from '../../actual-api.js';
import { convertToCents } from '../../core/transactions/index.js';
import type { UpdateTransactionInput } from './types.js';
import { logger } from '../../core/logger.js';

export class UpdateTransactionDataFetcher {
  /**
   * Update an existing transaction with new values
   */
  async updateTransaction(input: UpdateTransactionInput): Promise<void> {
    await initActualApi();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};

    if (input.date !== undefined) {
      updateData.date = input.date;
    }

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

    if (input.cleared !== undefined) {
      updateData.cleared = input.cleared;
    }

    if (input.subtransactions !== undefined) {
      // Validate empty subtransactions array - this can crash the Actual Budget app
      if (Array.isArray(input.subtransactions) && input.subtransactions.length === 0) {
        throw new Error(
          'Cannot set subtransactions to an empty array. ' +
            'This operation can corrupt split transactions and cause app crashes. ' +
            'To convert a split transaction to a regular transaction, delete the split and create a new transaction instead.'
        );
      }

      updateData.subtransactions = input.subtransactions.map((sub) => ({
        amount: convertToCents(sub.amount),
        category: sub.categoryId,
        notes: sub.notes || '',
      }));

      logger.warning('update-transaction', {
        message: 'Updating subtransactions array on transaction',
        transactionId: input.transactionId,
        note: 'Actual Budget API has known limitations with split transaction updates. Changes may not persist correctly in the UI.',
      });
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update provided');
    }

    // Log warning if updating multiple fields (could indicate updating a split parent)
    if (Object.keys(updateData).length > 1 || updateData.date || updateData.amount || updateData.notes) {
      logger.info('update-transaction', {
        message: 'Updating transaction',
        transactionId: input.transactionId,
        fields: Object.keys(updateData),
        note: 'If this is a split parent transaction, updates may not persist correctly due to Actual Budget API limitations.',
      });
    }

    // Update the transaction using the Actual API
    await api.updateTransaction(input.transactionId, updateData);
  }
}
