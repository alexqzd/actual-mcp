// Types/interfaces for update-transaction tool

export interface UpdateTransactionInput {
  transactionId: string;
  categoryId?: string;
  payeeId?: string;
  notes?: string;
  amount?: number;
  subtransactions?: Array<{
    amount: number;
    categoryId: string;
    notes?: string;
  }>;
}
