/**
 * Report generator for search-transactions tool
 */

import type { Transaction } from '../../core/types/domain.js';
import type { PaginationMetadata, SearchFilters } from './types.js';

/**
 * Report generator for search results
 */
export class SearchTransactionsReportGenerator {
  /**
   * Generate markdown report for search results
   *
   * @param transactions - Transactions to include in the report
   * @param pagination - Pagination metadata
   * @param filters - Active search filters
   * @returns Formatted markdown report
   */
  generate(transactions: Transaction[], pagination: PaginationMetadata, filters: SearchFilters): string {
    const parts: string[] = [];

    // Header with pagination info
    parts.push('# Transaction Search Results\n');
    parts.push(
      `**Page ${pagination.page} of ${pagination.totalPages}** (showing ${transactions.length} of ${pagination.totalResults} results)\n`
    );

    // Active filters
    const filterParts: string[] = [];
    if (filters.searchText) filterParts.push(`searchText="${filters.searchText}"`);
    if (filters.payeeName) filterParts.push(`payeeName="${filters.payeeName}"`);
    if (filters.categoryId) filterParts.push(`categoryId="${filters.categoryId}"`);
    if (filters.minAmount !== undefined) filterParts.push(`minAmount=$${filters.minAmount.toFixed(2)}`);
    if (filters.maxAmount !== undefined) filterParts.push(`maxAmount=$${filters.maxAmount.toFixed(2)}`);
    if (filters.startDate) filterParts.push(`startDate=${filters.startDate}`);
    if (filters.endDate) filterParts.push(`endDate=${filters.endDate}`);
    if (filters.accountId) filterParts.push(`accountId="${filters.accountId}"`);

    if (filterParts.length > 0) {
      parts.push(`**Filters:** ${filterParts.join(', ')}\n`);
    }

    // Transactions
    if (transactions.length === 0) {
      parts.push('\n*No transactions found matching the search criteria.*\n');
    } else {
      parts.push('\n## Transactions\n');
      for (const tx of transactions) {
        const amount = tx.amount / 100;
        const sign = amount >= 0 ? '+' : '';
        const formattedAmount = `${sign}$${amount.toFixed(2)}`;

        parts.push(`### ${tx.date} - ${formattedAmount}`);
        if (tx.payee) parts.push(`- **Payee:** ${tx.payee}`);
        if (tx.category) parts.push(`- **Category:** ${tx.category}`);
        if (tx.account) parts.push(`- **Account:** ${tx.account}`);
        if (tx.notes) parts.push(`- **Notes:** ${tx.notes}`);
        parts.push(`- **ID:** ${tx.id}`);
        parts.push(''); // Empty line between transactions
      }
    }

    // Pagination guidance
    if (pagination.hasNextPage || pagination.hasPreviousPage) {
      parts.push('\n---\n');
      if (pagination.hasNextPage) {
        parts.push(`To see more results, use **page=${pagination.page + 1}** with the same search criteria.`);
      }
      if (pagination.hasPreviousPage) {
        parts.push(`To see previous results, use **page=${pagination.page - 1}** with the same search criteria.`);
      }
    }

    return parts.join('\n');
  }
}
