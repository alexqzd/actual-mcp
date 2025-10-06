// Parses and validates input arguments for get-transactions tool

export interface GetTransactionsInput {
  accountId: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryId?: string;
  payeeId?: string;
  limit?: number;
}

export class GetTransactionsInputParser {
  parse(args: unknown): GetTransactionsInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }
    const argsObj = args as Record<string, unknown>;
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryId, payeeId, limit } = argsObj;
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('accountId is required and must be a string');
    }
    return {
      accountId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      minAmount: typeof minAmount === 'number' ? minAmount : undefined,
      maxAmount: typeof maxAmount === 'number' ? maxAmount : undefined,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      payeeId: typeof payeeId === 'string' ? payeeId : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
    };
  }
}
