// Parses and validates input arguments for update-transaction tool

import { UpdateTransactionInput } from './types.js';

export class UpdateTransactionInputParser {
  parse(args: unknown): UpdateTransactionInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const argsObj = args as Record<string, unknown>;
    const { transactionId, categoryId, payeeId, notes, amount, subtransactions } = argsObj;

    // Validate required fields
    if (!transactionId || typeof transactionId !== 'string') {
      throw new Error('transactionId is required and must be a string');
    }

    return {
      transactionId,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      payeeId: typeof payeeId === 'string' ? payeeId : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
      amount: typeof amount === 'number' ? amount : undefined,
      subtransactions: Array.isArray(subtransactions) ? subtransactions.map((sub) => ({
        amount: typeof sub.amount === 'number' ? sub.amount : 0,
        categoryId: typeof sub.categoryId === 'string' ? sub.categoryId : '',
        notes: typeof sub.notes === 'string' ? sub.notes : undefined,
      })) : undefined,
    };
  }
}
