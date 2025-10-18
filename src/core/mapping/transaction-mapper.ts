import type { Transaction } from '../types/domain.js';

/**
 * Maps a TransactionEntity from the Actual API into a domain Transaction
 * NOTE: Amount is kept in cents (not converted to dollars) for internal consistency
 */
export function mapTransaction(entity: any, categories: any[], payees: any[]): Transaction {
  const category = categories.find((c) => c.id === entity.category);
  const payee = payees.find((p) => p.id === entity.payee);

  // if the entity has subtransactions, map them recursively

  return {
    id: entity.id,
    account: entity.account,
    date: entity.date,
    amount: entity.amount, // Keep in cents for internal consistency
    notes: entity.notes,
    category: entity.category,
    category_name: category?.name,
    payee: entity.payee,
    payee_name: payee?.name,
    subtransactions: entity.subtransactions
      ? entity.subtransactions.map((sub: any) => mapTransaction(sub, categories, payees))
      : undefined,
  };
}

// Shared transaction mapping logic
export {};
