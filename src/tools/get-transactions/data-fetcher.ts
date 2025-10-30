// Fetches transactions and related data for get-transactions tool
import { fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import { q, runQuery, getCategories, getPayees, type QueryBuilder } from '../../actual-api.js';
import { mapTransaction } from '../../core/mapping/transaction-mapper.js';
import type { Transaction } from '../../core/types/domain.js';

export class GetTransactionsDataFetcher {
  /**
   * Fetch transactions for a specific account within a date range
   * (Legacy method for backward compatibility)
   */
  async fetch(accountId: string, start: string, end: string): Promise<Transaction[]> {
    return await fetchTransactionsForAccount(accountId, start, end);
  }

  /**
   * Fetch ALL transactions for an account (no date filtering)
   * Uses query builder for more efficient querying
   *
   * @param accountId - The account ID to fetch transactions for
   * @returns All transactions for the account
   */
  async fetchAllForAccount(accountId: string): Promise<Transaction[]> {
    // Fetch categories and payees for mapping
    const [categories, payees] = await Promise.all([getCategories(), getPayees()]);

    // Build query for all transactions in the account
    const query: QueryBuilder = q('transactions')
      .filter({ account: accountId })
      .select(['*'])
      .orderBy({ date: 'desc' });

    // Execute query
    const result = await runQuery(query);
    const rawTransactions = (result.data as any[]) || [];

    // Map to domain transactions
    return rawTransactions.map((t) => mapTransaction(t, categories, payees));
  }
}
