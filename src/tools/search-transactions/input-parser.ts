/**
 * Input parser and validator for search-transactions tool
 */

import { z } from 'zod';
import type { SearchTransactionsInput } from './types.js';

// Zod schema for search-transactions arguments
export const SearchTransactionsArgsSchema = z.object({
  searchText: z.string().optional().describe('Text to search for in transaction notes (case-insensitive)'),
  payeeName: z.string().optional().describe('Payee name to search for (case-insensitive)'),
  categoryId: z.string().optional().describe('Category ID to filter by'),
  minAmount: z.number().optional().describe('Minimum transaction amount (negative for expenses, positive for income)'),
  maxAmount: z.number().optional().describe('Maximum transaction amount (negative for expenses, positive for income)'),
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
  accountId: z.string().optional().describe('Account ID to filter by'),
  page: z.number().int().positive().optional().default(1).describe('Page number (1-indexed)'),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .default(50)
    .describe('Number of results per page (max 500)'),
});

export type SearchTransactionsArgs = z.infer<typeof SearchTransactionsArgsSchema>;

/**
 * Input parser for search-transactions tool
 */
export class SearchTransactionsInputParser {
  /**
   * Parse and validate search-transactions arguments
   *
   * @param args - Raw arguments from MCP tool call
   * @returns Parsed and validated input
   */
  parse(args: unknown): SearchTransactionsInput {
    const validated = SearchTransactionsArgsSchema.parse(args);

    // Validate date format if provided
    if (validated.startDate && !this.isValidDate(validated.startDate)) {
      throw new Error(`Invalid startDate format: ${validated.startDate}. Use YYYY-MM-DD format.`);
    }
    if (validated.endDate && !this.isValidDate(validated.endDate)) {
      throw new Error(`Invalid endDate format: ${validated.endDate}. Use YYYY-MM-DD format.`);
    }

    // Validate amount ranges
    if (
      validated.minAmount !== undefined &&
      validated.maxAmount !== undefined &&
      validated.minAmount > validated.maxAmount
    ) {
      throw new Error('minAmount cannot be greater than maxAmount');
    }

    // Validate that at least one search criterion is provided
    const hasSearchCriteria =
      validated.searchText ||
      validated.payeeName ||
      validated.categoryId ||
      validated.minAmount !== undefined ||
      validated.maxAmount !== undefined ||
      validated.startDate ||
      validated.endDate ||
      validated.accountId;

    if (!hasSearchCriteria) {
      throw new Error(
        'At least one search criterion must be provided (searchText, payeeName, categoryId, amount range, date range, or accountId)'
      );
    }

    return {
      searchText: validated.searchText,
      payeeName: validated.payeeName,
      categoryId: validated.categoryId,
      minAmount: validated.minAmount,
      maxAmount: validated.maxAmount,
      startDate: validated.startDate,
      endDate: validated.endDate,
      accountId: validated.accountId,
      page: validated.page,
      pageSize: validated.pageSize,
    };
  }

  /**
   * Validate date string format (YYYY-MM-DD)
   */
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}
