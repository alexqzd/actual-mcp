import api from '@actual-app/api';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BudgetFile } from './types.js';
import {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
} from '@actual-app/api/@types/loot-core/src/server/api-models.js';
import { RuleEntity, TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/index.js';
import ReconcileTransactionsResult from '@actual-app/api/@types/loot-core/src/server/accounts/sync.js';
import { logger } from './core/logger.js';

const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');

// API initialization state
let initialized = false;
let initializing = false;
let initializationError: Error | null = null;
let currentBudgetId: string | null = null;
let apiInitialized = false;

/**
 * Initialize the Actual Budget API
 */
export async function initActualApi(): Promise<void> {
  if (initialized) return;
  if (initializing) {
    // Wait for initialization to complete if already in progress
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return;
  }

  initializing = true;
  try {
    logger.info('actual-api', { message: 'Initializing Actual Budget API...' });
    const dataDir = process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Only call api.init() once
    if (!apiInitialized) {
      await api.init({
        dataDir,
        serverURL: process.env.ACTUAL_SERVER_URL,
        password: process.env.ACTUAL_PASSWORD,
      });
      apiInitialized = true;
    }

    const budgets: BudgetFile[] = await api.getBudgets();
    if (!budgets || budgets.length === 0) {
      throw new Error('No budgets found. Please create a budget in Actual first.');
    }

    // Use specified budget or the first one
    const budgetId: string = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';

    // Only download budget if it's different from the current one
    if (currentBudgetId !== budgetId) {
      logger.info('actual-api', { message: 'Loading budget', budgetId });
      await api.downloadBudget(budgetId);
      currentBudgetId = budgetId;
    } else {
      logger.info('actual-api', { message: 'Budget already loaded', budgetId });
    }

    initialized = true;
    logger.info('actual-api', { message: 'Actual Budget API initialized successfully' });
  } catch (error) {
    logger.error('actual-api', { message: 'Failed to initialize Actual Budget API', error });
    initializationError = error instanceof Error ? error : new Error(String(error));
    // Clean up partial initialization
    initialized = false;
    currentBudgetId = null;
    try {
      await api.shutdown();
      apiInitialized = false;
    } catch (shutdownError) {
      logger.error('actual-api', { message: 'Error during cleanup after failed initialization', error: shutdownError });
    }
    throw initializationError;
  } finally {
    initializing = false;
  }
}

/**
 * Shutdown the Actual Budget API
 */
export async function shutdownActualApi(): Promise<void> {
  if (!initialized) return;
  await api.shutdown();
  initialized = false;
  initializationError = null;
  currentBudgetId = null;
  apiInitialized = false;
}

// ----------------------------
// FETCH
// ----------------------------

/**
 * Get all accounts (ensures API is initialized)
 */
export async function getAccounts(): Promise<APIAccountEntity[]> {
  await initActualApi();
  return api.getAccounts();
}

/**
 * Get all categories (ensures API is initialized)
 */
export async function getCategories(): Promise<APICategoryEntity[]> {
  await initActualApi();
  return api.getCategories();
}

/**
 * Get all category groups (ensures API is initialized)
 */
export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  await initActualApi();
  return api.getCategoryGroups();
}

/**
 * Get all payees (ensures API is initialized)
 */
export async function getPayees(): Promise<APIPayeeEntity[]> {
  await initActualApi();
  return api.getPayees();
}

/**
 * Get transactions for a specific account and date range (ensures API is initialized)
 */
export async function getTransactions(accountId: string, start: string, end: string): Promise<TransactionEntity[]> {
  await initActualApi();
  return api.getTransactions(accountId, start, end);
}

/**
 * Get all rules (ensures API is initialized)
 */
export async function getRules(): Promise<RuleEntity[]> {
  await initActualApi();
  return api.getRules();
}

/**
 * Execute a query using the Actual Budget query builder (ensures API is initialized)
 *
 * @param query - A query object created with q() - do NOT call .serialize() first as runQuery does this internally
 * @returns Query results from the database
 */
export async function runQuery(query: QueryBuilder): Promise<{ data: unknown }> {
  await initActualApi();
  // api.runQuery() calls query.serialize() internally, so we pass the Query object directly
  return api.runQuery(query) as Promise<{ data: unknown }>;
}

/**
 * Query builder interface matching Actual Budget's query API
 */
export interface QueryBuilder {
  filter(expr: any): QueryBuilder;
  select(exprs?: any[]): QueryBuilder;
  calculate(expr: any): QueryBuilder;
  orderBy(exprs: any): QueryBuilder;
  limit(num: number): QueryBuilder;
  offset(num: number): QueryBuilder;
  serialize(): any;
}

/**
 * Get the query builder instance to construct queries
 * Note: Does NOT require API initialization - query builder works without it
 *
 * @param table - The table name to query (e.g., 'transactions', 'accounts', 'categories')
 * @returns Query builder instance
 */
export function q(table: string): QueryBuilder {
  // Don't call initActualApi() here - query builder doesn't need it
  // The query will be executed later via runQuery() which will init the API
  const queryBuilder = api.q(table);
  if (!queryBuilder || typeof queryBuilder.serialize !== 'function') {
    throw new Error(`Failed to create query builder for table ${table}. Got: ${typeof queryBuilder}`);
  }
  return queryBuilder as QueryBuilder;
}

// ----------------------------
// ACTION
// ----------------------------

/**
 * Create a new payee (ensures API is initialized)
 */
export async function createPayee(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createPayee(args);
}

/**
 * Update a payee (ensures API is initialized)
 */
export async function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updatePayee(id, args);
}

/**
 * Delete a payee (ensures API is initialized)
 */
export async function deletePayee(id: string): Promise<unknown> {
  await initActualApi();
  return api.deletePayee(id);
}

/**
 * Create a new rule (ensures API is initialized)
 */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  await initActualApi();
  return api.createRule(args);
}

/**
 * Update a rule (ensures API is initialized)
 */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  await initActualApi();
  return api.updateRule(args);
}

/**
 * Delete a rule (ensures API is initialized)
 */
export async function deleteRule(id: string): Promise<boolean> {
  await initActualApi();
  return api.deleteRule(id);
}

/**
 * Create a new category (ensures API is initialized)
 */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createCategory(args);
}

/**
 * Update a category (ensures API is initialized)
 */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateCategory(id, args);
}

/**
 * Delete a category (ensures API is initialized)
 */
export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await initActualApi();
  return api.deleteCategory(id);
}

/**
 * Create a new category group (ensures API is initialized)
 */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createCategoryGroup(args);
}

/**
 * Update a category group (ensures API is initialized)
 */
export async function updateCategoryGroup(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateCategoryGroup(id, args);
}

/**
 * Delete a category group (ensures API is initialized)
 */
export async function deleteCategoryGroup(id: string): Promise<unknown> {
  await initActualApi();
  return api.deleteCategoryGroup(id);
}

/**
 * Add transactions to an account (ensures API is initialized)
 */
export async function addTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    category?: string | null;
    notes?: string;
    cleared?: boolean;
  }>,
  options?: { learnCategories?: boolean; runTransfers?: boolean }
): Promise<void> {
  await initActualApi();
  await api.addTransactions(accountId, transactions, options);
}

/**
 * Add transactions to an account (ensures API is initialized)
 */
export async function importTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    category?: string | null;
    notes?: string;
    cleared?: boolean;
    subtransactions?: Array<{
      amount: number;
      category?: string | null;
      notes?: string;
    }>;
  }>
): Promise<string> {
  await initActualApi();
  // Map to the ImportTransactionEntity shape (include required `account` field)
  const importPayload = transactions.map((t) => ({
    account: accountId,
    date: t.date,
    amount: t.amount,
    payee: t.payee ?? undefined,
    category: t.category ?? undefined,
    notes: t.notes,
    cleared: t.cleared,
    subtransactions: t.subtransactions?.map((st) => ({
      amount: st.amount,
      category: st.category ?? undefined,
      notes: st.notes,
    })),
  }));
  const result = await api.importTransactions(accountId, importPayload);
  let added_id = result.added[0];
  const updated_id = result.updated[0];
  // if added is undefined, it means the transaction was already there, use updated instead
  if (added_id === undefined) {
    added_id = updated_id;
  }
  return added_id;
}

export async function getBudgetMonths(): Promise<unknown> {
  await initActualApi();
  return api.getBudgetMonths();
}

export async function getBudgetMonth(monthString: string): Promise<unknown> {
  await initActualApi();
  return api.getBudgetMonth(monthString);
}

export async function setBudgetAmount(month: string, categoryId: string, amount: number): Promise<void> {
  await initActualApi();
  return api.setBudgetAmount(month, categoryId, amount);
}

export async function setBudgetCarryover(month: string, categoryId: string, carryover: boolean): Promise<void> {
  await initActualApi();
  return api.setBudgetCarryover(month, categoryId, carryover);
}

export async function holdBudgetForNextMonth(month: string, amount: number): Promise<void> {
  await initActualApi();
  await api.holdBudgetForNextMonth(month, amount);
}

export async function resetBudgetHold(month: string): Promise<void> {
  await initActualApi();
  return api.resetBudgetHold(month);
}

/**
 * Delete a transaction (ensures API is initialized)
 */
export async function deleteTransaction(id: string): Promise<unknown> {
  await initActualApi();
  return api.deleteTransaction(id);
}
