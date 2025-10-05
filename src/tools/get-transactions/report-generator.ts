export class GetTransactionsReportGenerator {
  generate(
    mappedTransactions: Array<{
      id: string;
      date: string;
      payee: string;
      category: string;
      amount: string;
      notes: string;
      subtransactions?: Array<{
        id: string;
        category: string;
        amount: string;
        notes: string;
      }>;
    }>,
    filterDescription: string,
    filteredCount: number,
    totalCount: number
  ): string {
    const header = '| Transaction ID | Date | Payee | Category | Amount | Notes |\n| -- | ---- | ----- | -------- | ------ | ----- |\n';
    
    const rows = mappedTransactions
      .map((t) => {
        const isSplit = (t.subtransactions?.length ?? 0) > 0;
        const mainRow = `| ${t.id} | ${t.date} | ${t.payee} | ${isSplit ? '(Split)' : t.category} | ${t.amount} | ${t.notes} |`;
        const subs =
          t.subtransactions?.map(
            (s) =>
              `| Parent: ${t.id} Split: ${s.id} |  |  | ${s.category} | ${s.amount} | ${s.notes || ''} |`
          ) ?? [];
        return [mainRow, ...subs].join('\n');
      })
      .join('\n');

    return `# Filtered Transactions\n\n${filterDescription}\nMatching Transactions: ${filteredCount}/${totalCount}\n\n${header}${rows}`;
  }
}