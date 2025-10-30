// ----------------------------
// STANDARD RESPONSE INTERFACES
// ----------------------------

/**
 * Base metadata that can be included in any response
 */
export interface BaseMetadata {
  /** Warning messages for the user */
  warnings?: string[];
  /** Informational messages */
  info?: string[];
  /** Timestamp of the operation */
  timestamp?: string;
}

/**
 * Period filter metadata
 */
export interface PeriodMetadata {
  start: string;
  end: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of results across all pages */
  totalResults: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Account balance metadata (for transaction queries)
 */
export interface AccountBalanceMetadata {
  /** Current account balance */
  current: string;
  /** Balance of cleared transactions only */
  cleared: string;
  /** Total of uncleared transactions */
  uncleared: string;
}

/**
 * Filtered transactions metadata (for transaction queries)
 */
export interface FilteredTransactionsMetadata {
  /** Sum of filtered transactions */
  totalAmount: string;
  /** Number of filtered transactions */
  count: number;
}

/**
 * Query-specific metadata
 */
export interface QueryMetadata extends BaseMetadata {
  /** Number of items returned */
  count?: number;
  /** Total number of items available (before filtering) */
  total?: number;
  /** Total count (alias for backward compatibility) */
  totalCount?: number;
  /** Filters applied to the query */
  filters?: Record<string, unknown>;
  /** Period/date range for the query */
  period?: PeriodMetadata;
  /** Pagination information */
  pagination?: PaginationMetadata;
  /** Account balance metadata (for transaction queries) */
  accountBalance?: AccountBalanceMetadata;
  /** Filtered transactions metadata (for transaction queries) */
  filteredTransactions?: FilteredTransactionsMetadata;
}

/**
 * Affected resources information
 */
export interface AffectedResources {
  /** IDs of affected resources */
  ids: string[];
  /** Number of resources affected */
  count: number;
}

/**
 * Changes made in a mutation
 */
export interface ChangeDetails {
  /** Fields that were updated */
  updatedFields?: string[];
  /** Previous values (for updates) */
  previousValues?: Record<string, unknown>;
  /** New values */
  newValues?: Record<string, unknown>;
}

/**
 * Mutation-specific metadata
 */
export interface MutationMetadata extends BaseMetadata {
  /** Details about what changed */
  changes?: ChangeDetails;
}

/**
 * Report section (for analysis/summary tools)
 */
export interface ReportSection {
  /** Section title */
  title: string;
  /** Section content (can be markdown) */
  content: string;
  /** Optional data for this section */
  data?: unknown;
}

/**
 * Report-specific metadata
 */
export interface ReportMetadata extends BaseMetadata {
  /** Period covered by the report */
  period?: PeriodMetadata;
  /** Account context */
  accountId?: string;
  accountName?: string;
  /** Filters applied */
  filters?: Record<string, unknown>;
}

/**
 * Standard response for query operations (get/list/search)
 */
export interface QueryResponse<T = unknown> {
  /** Type of operation performed */
  operation: 'query';
  /** Type of resource queried */
  resourceType: string;
  /** Human-readable summary */
  summary: string;
  /** The actual data returned */
  data: T;
  /** Query metadata */
  metadata?: QueryMetadata;
}

/**
 * Standard response for mutation operations (create/update/delete)
 */
export interface MutationResponse {
  /** Type of operation performed */
  operation: 'create' | 'update' | 'delete';
  /** Type of resource affected */
  resourceType: string;
  /** Human-readable summary */
  summary: string;
  /** Information about affected resources */
  affected?: AffectedResources;
  /** Mutation metadata */
  metadata?: MutationMetadata;
}

/**
 * Standard response for report/analysis operations
 */
export interface ReportResponse {
  /** Type of operation performed */
  operation: 'report' | 'analyze';
  /** Type of report */
  resourceType: string;
  /** Human-readable summary */
  summary: string;
  /** Report sections */
  sections?: ReportSection[];
  /** Structured data for the report */
  data?: unknown;
  /** Report metadata */
  metadata?: ReportMetadata;
}

/**
 * Union type of all standard responses
 */
export type StandardResponse = QueryResponse | MutationResponse | ReportResponse;
