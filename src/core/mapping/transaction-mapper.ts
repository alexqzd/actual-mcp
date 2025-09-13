import type { Transaction } from '../types/domain.js';

/**
 * Maps a TransactionEntity from the Actual API into a domain Transaction
 */
export function mapTransaction(
  entity: any,
  categories: any[],
  payees: any[]
): Transaction {
  const category = categories.find((c) => c.id === entity.category);
  const payee = payees.find((p) => p.id === entity.payee);
  return {
    id: entity.id,
    account: entity.account,
    date: entity.date,
    amount: entity.amount,
    notes: entity.notes,
    category: entity.category,
    category_name: category?.name,
    payee: entity.payee,
    payee_name: payee?.name,
  };
}

// Shared transaction mapping logic
export {};
