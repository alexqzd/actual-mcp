/**
 * Types for the search-transactions tool
 */

import type { Transaction } from '../../core/types/domain.js';

/**
 * Parsed and validated input for search-transactions tool
 */
export interface SearchTransactionsInput {
  searchText?: string;
  payeeName?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  accountId?: string;
  page: number;
  pageSize: number;
}

/**
 * Pagination metadata for search results
 */
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Search results with transactions and pagination info
 */
export interface SearchTransactionsResult {
  transactions: Transaction[];
  pagination: PaginationMetadata;
  totalCount: number;
}

/**
 * Active filters applied to the search
 */
export interface SearchFilters {
  searchText?: string;
  payeeName?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  accountId?: string;
}
