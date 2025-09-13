import { getTransactions, getCategories, getPayees } from '../../actual-api.js';
import { mapTransaction } from '../mapping/transaction-mapper.js';
import type { Account, Transaction } from '../types/domain.js';
import type { APICategoryEntity, APIPayeeEntity } from '@actual-app/api/@types/loot-core/src/server/api-models.js';

export async function fetchTransactionsForAccount(
  accountId: string,
  start: string,
  end: string
): Promise<Transaction[]> {
  // Fetch lookup data
  const [categories, payees] = await Promise.all([
    getCategories(),
    getPayees(),
  ]);
  // Fetch raw transactions
  const entities = await getTransactions(accountId, start, end);
  // Map to domain Transactions
  return entities.map((e) => mapTransaction(e, categories, payees));
}

export async function fetchAllOnBudgetTransactions(
  accounts: Account[],
  start: string,
  end: string
): Promise<Transaction[]> {
  let transactions: Transaction[] = [];
  const onBudgetAccounts = accounts.filter((a) => !a.offbudget && !a.closed);
  if (onBudgetAccounts.length === 0) return transactions;
  // Fetch lookup data once
  const [categories, payees] = await Promise.all([
    getCategories(),
    getPayees(),
  ]);
  // Aggregate mapped transactions
  for (const account of onBudgetAccounts) {
    const entities = await getTransactions(account.id, start, end);
    transactions.push(...entities.map((e) => mapTransaction(e, categories, payees)));
  }
  return transactions;
}

export async function fetchAllTransactions(
  accounts: Account[],
  start: string,
  end: string
): Promise<Transaction[]> {
  let transactions: Transaction[] = [];
  if (accounts.length === 0) return transactions;
  // Fetch lookup data once
  const [categories, payees] = await Promise.all([
    getCategories(),
    getPayees(),
  ]);
  // Aggregate mapped transactions
  for (const account of accounts) {
    const entities = await getTransactions(account.id, start, end);
    transactions.push(...entities.map((e) => mapTransaction(e, categories, payees)));
  }
  return transactions;
}
