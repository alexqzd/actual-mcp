// Maps and formats transaction data for get-transactions tool
import { formatAmount, formatDate } from '../../utils.js';
import type { Transaction } from '../../types.js';

export class GetTransactionsMapper {
  map(transactions: Transaction[]): Array<{
    id: string;
    date: string;
    payee: string;
    category: string;
    payee_name?: string;
    category_name?: string;
    amount: string;
    notes: string;
    subtransactions?: Array<{
      id: string;
      category: string;
      amount: string;
      notes: string;
    }>;
  }> {
    return transactions.map((t) => ({
      id: t.id || '(No ID)',
      date: formatDate(t.date),
      payee: t.payee_name || '(No Payee)',
      category: t.category_name || '(Uncategorized)',
      amount: formatAmount(t.amount),
      notes: t.notes || '',
      subtransactions: t.subtransactions?.map((st) => ({
        id: st.id || '(No ID)',
        category: st.category_name || '(Uncategorized)',
        amount: formatAmount(st.amount),
        notes: st.notes || '',
      })),
    }));
  }
}
