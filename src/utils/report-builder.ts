// ----------------------------
// REPORT BUILDER UTILITIES
// ----------------------------

import { successWithJson } from './response.js';
import type {
  QueryResponse,
  MutationResponse,
  ReportResponse,
  QueryMetadata,
  MutationMetadata,
  ReportMetadata,
  ReportSection,
} from './standard-responses.js';

/**
 * Options for building a query response
 */
export interface QueryResponseOptions<T = unknown> {
  /** Type of resource being queried */
  resourceType: string;
  /** The data to return */
  data: T;
  /** Human-readable summary (optional, will be auto-generated if not provided) */
  summary?: string;
  /** Metadata for the query */
  metadata?: QueryMetadata;
}

/**
 * Options for building a mutation response
 */
export interface MutationResponseOptions {
  /** Type of operation (create/update/delete) */
  operation: 'create' | 'update' | 'delete';
  /** Type of resource affected */
  resourceType: string;
  /** IDs of affected resources */
  resourceIds: string | string[];
  /** Human-readable summary (optional, will be auto-generated if not provided) */
  summary?: string;
  /** Details about what changed (for updates) */
  changes?: {
    updatedFields?: string[];
    previousValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  };
  /** Metadata for the mutation */
  metadata?: MutationMetadata;
}

/**
 * Options for building a report response
 */
export interface ReportResponseOptions {
  /** Type of operation (report/analyze) */
  operation: 'report' | 'analyze';
  /** Type of report */
  resourceType: string;
  /** Human-readable summary */
  summary: string;
  /** Report sections (optional) */
  sections?: ReportSection[];
  /** Structured data for the report (optional) */
  data?: unknown;
  /** Metadata for the report */
  metadata?: ReportMetadata;
}

/**
 * Build a standard query response
 *
 * @param options - Query response options
 * @returns MCP-compatible response with standardized query data
 */
export function buildQueryResponse<T = unknown>(options: QueryResponseOptions<T>): ReturnType<typeof successWithJson> {
  const { resourceType, data, metadata } = options;

  // Auto-generate summary if not provided
  const count = metadata?.count ?? (Array.isArray(data) ? data.length : 1);
  const summary = options.summary ?? `Retrieved ${count} ${resourceType}${count !== 1 ? 's' : ''}`;

  const response: QueryResponse<T> = {
    operation: 'query',
    resourceType,
    summary,
    data,
    metadata,
  };

  return successWithJson(response);
}

/**
 * Build a standard mutation response
 *
 * @param options - Mutation response options
 * @returns MCP-compatible response with standardized mutation data
 */
export function buildMutationResponse(options: MutationResponseOptions): ReturnType<typeof successWithJson> {
  const { operation, resourceType, resourceIds, changes, metadata } = options;

  // Normalize IDs to array
  const ids = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
  const count = ids.length;

  // Auto-generate summary if not provided
  let summary = options.summary;
  if (!summary) {
    const verb =
      operation === 'create' ? 'Created' : operation === 'update' ? 'Updated' : operation === 'delete' ? 'Deleted' : '';
    summary = `${verb} ${count} ${resourceType}${count !== 1 ? 's' : ''}`;
    if (count === 1 && ids[0]) {
      summary += ` (ID: ${ids[0]})`;
    }
  }

  const response: MutationResponse = {
    operation,
    resourceType,
    summary,
    affected: {
      ids,
      count,
    },
    metadata: {
      ...metadata,
      changes,
    },
  };

  return successWithJson(response);
}

/**
 * Build a standard report response
 *
 * @param options - Report response options
 * @returns MCP-compatible response with standardized report data
 */
export function buildReportResponse(options: ReportResponseOptions): ReturnType<typeof successWithJson> {
  const { operation, resourceType, summary, sections, data, metadata } = options;

  const response: ReportResponse = {
    operation,
    resourceType,
    summary,
    sections,
    data,
    metadata,
  };

  return successWithJson(response);
}

/**
 * Helper to create a report section
 *
 * @param title - Section title
 * @param content - Section content (can be markdown)
 * @param data - Optional structured data for the section
 * @returns A report section object
 */
export function createReportSection(title: string, content: string, data?: unknown): ReportSection {
  return {
    title,
    content,
    data,
  };
}
