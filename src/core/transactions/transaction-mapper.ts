/**
 * Utility functions for mapping and transforming transaction data
 */

import { convertToCents } from './amount-converter.js';
import { getCategories } from '../../actual-api.js';

/**
 * Subtransaction input shape
 */
export interface SubtransactionInput {
  amount: number;
  categoryName: string;
  notes?: string;
}

/**
 * Subtransaction output shape (for Actual API)
 */
export interface SubtransactionOutput {
  amount: number;
  category?: string;
  notes: string;
}

/**
 * Map subtransactions from input format to Actual API format
 *
 * @param subtransactions - Array of subtransactions with category names
 * @returns Array of subtransactions with category IDs
 */
export async function mapSubtransactions(
  subtransactions: SubtransactionInput[]
): Promise<SubtransactionOutput[]> {
  const categories = await getCategories();

  return subtransactions.map((sub) => ({
    amount: convertToCents(sub.amount),
    category: categories.find((c) => c.name.toLowerCase() === sub.categoryName.toLowerCase())?.id,
    notes: sub.notes || '',
  }));
}
