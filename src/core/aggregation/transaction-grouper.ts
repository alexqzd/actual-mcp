// Groups transactions by category and aggregates spending
import type { Transaction, CategorySpending, CategoryGroupInfo } from '../types/domain.js';

export class TransactionGrouper {
  groupByCategory(
    transactions: Transaction[],
    getCategoryName: (categoryId: string) => string,
    getGroupInfo: (categoryId: string) => CategoryGroupInfo | undefined,
    includeIncome: boolean
  ): Record<string, CategorySpending> {
    const spendingByCategory: Record<string, CategorySpending> = {};
    transactions.forEach((transaction) => {
      const items = transaction.subtransactions?.length
        ? transaction.subtransactions
        : [transaction];
      items.forEach((tx) => {
        if (!tx.category) return; // Skip uncategorized
        const categoryId = tx.category;
        const categoryName = getCategoryName(categoryId);
        const group = getGroupInfo(categoryId) || {
          name: 'Unknown Group',
          isIncome: false,
        };
        // Skip income categories if not requested
        if (group.isIncome && !includeIncome) return;
        if (!spendingByCategory[categoryId]) {
          spendingByCategory[categoryId] = {
            id: categoryId,
            name: categoryName,
            group: group.name,
            isIncome: group.isIncome,
            total: 0,
            transactions: 0,
          };
        }
        spendingByCategory[categoryId].total += tx.amount;
        spendingByCategory[categoryId].transactions += 1;
      });
    });
    return spendingByCategory;
  }
}
