// Types/interfaces for update-transaction tool

export interface UpdateTransactionInput {
  transactionId: string;
  date?: string;
  categoryId?: string;
  payeeId?: string;
  notes?: string;
  amount?: number;
  cleared?: boolean;
  subtransactions?: Array<{
    amount: number;
    categoryId: string;
    notes?: string;
  }>;
}
