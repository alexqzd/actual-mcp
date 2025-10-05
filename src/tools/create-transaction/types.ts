// Types/interfaces for create-transaction tool

export interface CreateTransactionInput {
  accountId: string;
  date: string;
  amount: number;
  payeeName?: string;
  categoryName?: string;
  notes?: string;
  cleared?: boolean;
  subtransactions?: Array<{
    amount: number;
    categoryName: string;
    notes?: string;
  }>;
}

export interface CreatedTransaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  payee?: string;
  payeeId?: string;
  category?: string;
  categoryId?: string;
  notes?: string;
  cleared: boolean;
}

export interface EntityCreationResult {
  payeeId?: string;
  categoryId?: string;
  createdPayee?: boolean;
  createdCategory?: boolean;
}
