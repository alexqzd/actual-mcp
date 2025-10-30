// Calculates balance metadata for get-transactions tool
import type { Transaction } from '../../types.js';
import { formatAmount } from '../../utils.js';

export interface BalanceMetadata {
  current: string;
  cleared: string;
  uncleared: string;
}

export interface FilteredTransactionsMetadata {
  totalAmount: string;
  count: number;
}

export class GetTransactionsBalanceCalculator {
  /**
   * Calculate account balance metadata (current, cleared, uncleared)
   *
   * Note: Calculates balances from all transactions in the account, not just filtered ones.
   * This matches the Actual Budget desktop UI behavior.
   *
   * @param currentBalance - The current account balance from Actual API
   * @param allTransactions - All transactions for the account (no filters applied)
   * @returns Balance metadata with formatted amounts
   */
  calculateAccountBalance(currentBalance: number, allTransactions: Transaction[]): BalanceMetadata {
    // Current balance comes from the Actual API getAccountBalance()

    // Calculate balance considering only cleared transactions
    let clearedBalance = 0;
    for (const transaction of allTransactions) {
      if (transaction.cleared) {
        clearedBalance += transaction.amount;
      }
    }

    // Uncleared balance is the difference
    const unclearedBalance = currentBalance - clearedBalance;

    return {
      current: formatAmount(currentBalance),
      cleared: formatAmount(clearedBalance),
      uncleared: formatAmount(unclearedBalance),
    };
  }

  /**
   * Calculate total amount of filtered transactions
   *
   * @param filteredTransactions - The filtered transactions to sum
   * @returns Filtered transactions metadata with total and count
   */
  calculateFilteredTotal(filteredTransactions: Transaction[]): FilteredTransactionsMetadata {
    const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      totalAmount: formatAmount(totalAmount),
      count: filteredTransactions.length,
    };
  }
}
