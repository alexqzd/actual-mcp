/**
 * Utility functions for looking up and validating entities (accounts, categories, payees)
 */

import { getAccounts, getCategories, getPayees } from '../../actual-api.js';
import type { Account, Category, Payee } from '../types/domain.js';

/**
 * Find a category by name (case-insensitive)
 *
 * @param categoryName - Name of the category to find
 * @returns Category object or undefined if not found
 */
export async function findCategoryByName(categoryName: string): Promise<Category | undefined> {
  const categories = await getCategories();
  return categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
}

/**
 * Find a payee by name (case-insensitive)
 *
 * @param payeeName - Name of the payee to find
 * @returns Payee object or undefined if not found
 */
export async function findPayeeByName(payeeName: string): Promise<Payee | undefined> {
  const payees = await getPayees();
  return payees.find((p) => p.name.toLowerCase() === payeeName.toLowerCase());
}

/**
 * Validate that an account exists and is not closed
 *
 * @param accountId - ID of the account to validate
 * @throws Error if account doesn't exist or is closed
 */
export async function validateAccount(accountId: string): Promise<void> {
  const accounts = await getAccounts();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    throw new Error(`Account with ID ${accountId} not found`);
  }

  if (account.closed) {
    throw new Error(`Account ${account.name} is closed`);
  }
}
