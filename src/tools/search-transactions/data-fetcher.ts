/**
 * Data fetcher for search-transactions tool
 * Builds and executes queries using the Actual Budget query builder
 */

import { q, runQuery, getCategories, getPayees, type QueryBuilder } from '../../actual-api.js';
import { mapTransaction } from '../../core/mapping/transaction-mapper.js';
import type { SearchTransactionsInput, SearchTransactionsResult, PaginationMetadata } from './types.js';
import type { Transaction } from '../../core/types/domain.js';

/**
 * Data fetcher for searching transactions
 */
export class SearchTransactionsDataFetcher {
  /**
   * Fetch transactions matching search criteria with pagination
   *
   * @param input - Validated search parameters
   * @returns Search results with transactions and pagination metadata
   */
  async fetch(input: SearchTransactionsInput): Promise<SearchTransactionsResult> {
    // Fetch categories and payees for mapping
    const [categories, payees] = await Promise.all([getCategories(), getPayees()]);

    // Build base query
    let query: QueryBuilder = q('transactions');

    // Apply filters
    if (input.searchText) {
      // Case-insensitive search in notes field
      query = query.filter({ notes: { $like: `%${input.searchText}%` } });
    }

    if (input.payeeName) {
      // Case-insensitive search in payee name
      // Note: We'll need to filter this after fetching since payee is a foreign key
      // For now, we'll do a preliminary filter if we can match payee IDs
      const matchingPayees = payees.filter((p) => p.name?.toLowerCase().includes(input.payeeName!.toLowerCase()));
      if (matchingPayees.length > 0) {
        const payeeIds = matchingPayees.map((p) => p.id);
        if (payeeIds.length === 1) {
          query = query.filter({ payee: payeeIds[0] });
        } else {
          // Multiple payees match - use $oneof
          query = query.filter({ payee: { $oneof: payeeIds } });
        }
      } else {
        // No matching payees - return empty results
        return this.emptyResult(input.page, input.pageSize);
      }
    }

    if (input.categoryId) {
      query = query.filter({ category: input.categoryId });
    }

    if (input.minAmount !== undefined) {
      // Convert currency units to cents for database query
      query = query.filter({ amount: { $gte: input.minAmount * 100 } });
    }

    if (input.maxAmount !== undefined) {
      // Convert currency units to cents for database query
      query = query.filter({ amount: { $lte: input.maxAmount * 100 } });
    }

    if (input.startDate) {
      query = query.filter({ date: { $gte: input.startDate } });
    }

    if (input.endDate) {
      query = query.filter({ date: { $lte: input.endDate } });
    }

    if (input.accountId) {
      query = query.filter({ account: input.accountId });
    }

    // Get total count first (before pagination)
    const countQuery = query.calculate({ $count: '*' });
    const countResult = await runQuery(countQuery);
    const totalCount = (countResult.data as any) || 0;

    // Apply ordering and pagination
    const offset = (input.page - 1) * input.pageSize;
    query = query.select(['*']).orderBy({ date: 'desc' }).offset(offset).limit(input.pageSize);

    // Execute query
    const result = await runQuery(query);
    const rawTransactions = (result.data as any[]) || [];

    // Map to domain transactions
    const transactions: Transaction[] = rawTransactions.map((t) => mapTransaction(t, categories, payees));

    // Calculate pagination metadata
    const pagination: PaginationMetadata = {
      page: input.page,
      pageSize: input.pageSize,
      totalResults: totalCount,
      totalPages: Math.ceil(totalCount / input.pageSize),
      hasNextPage: input.page < Math.ceil(totalCount / input.pageSize),
      hasPreviousPage: input.page > 1,
    };

    return {
      transactions,
      pagination,
      totalCount,
    };
  }

  /**
   * Return empty result set
   */
  private emptyResult(page: number, pageSize: number): SearchTransactionsResult {
    return {
      transactions: [],
      pagination: {
        page,
        pageSize,
        totalResults: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: 0,
    };
  }
}
