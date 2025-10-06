// ----------------------------
// REPORT BUILDER TESTS
// ----------------------------

import { describe, it, expect } from 'vitest';
import {
  buildQueryResponse,
  buildMutationResponse,
  buildReportResponse,
  createReportSection,
} from './report-builder.js';
import type { QueryResponse, MutationResponse, ReportResponse } from './standard-responses.js';

describe('buildQueryResponse', () => {
  it('should build a query response with auto-generated summary for array data', () => {
    const data = [
      { id: '1', name: 'Account 1' },
      { id: '2', name: 'Account 2' },
    ];

    const result = buildQueryResponse({
      resourceType: 'account',
      data,
      metadata: { count: 2, total: 10 },
    });

    const response = JSON.parse(result.content[0].text) as QueryResponse;
    expect(response.operation).toBe('query');
    expect(response.resourceType).toBe('account');
    expect(response.summary).toBe('Retrieved 2 accounts');
    expect(response.data).toEqual(data);
    expect(response.metadata?.count).toBe(2);
    expect(response.metadata?.total).toBe(10);
  });

  it('should build a query response with custom summary', () => {
    const data = { id: '1', name: 'Test Account' };

    const result = buildQueryResponse({
      resourceType: 'account',
      data,
      summary: 'Found the test account',
    });

    const response = JSON.parse(result.content[0].text) as QueryResponse;
    expect(response.summary).toBe('Found the test account');
  });

  it('should include filters and period in metadata', () => {
    const result = buildQueryResponse({
      resourceType: 'transaction',
      data: [],
      metadata: {
        count: 0,
        filters: { categoryId: '123', minAmount: 100 },
        period: { start: '2024-01', end: '2024-12' },
      },
    });

    const response = JSON.parse(result.content[0].text) as QueryResponse;
    expect(response.metadata?.filters).toEqual({ categoryId: '123', minAmount: 100 });
    expect(response.metadata?.period).toEqual({ start: '2024-01', end: '2024-12' });
  });
});

describe('buildMutationResponse', () => {
  it('should build a create response with single resource ID', () => {
    const result = buildMutationResponse({
      operation: 'create',
      resourceType: 'category',
      resourceIds: 'cat-123',
    });

    const response = JSON.parse(result.content[0].text) as MutationResponse;
    expect(response.operation).toBe('create');
    expect(response.resourceType).toBe('category');
    expect(response.summary).toBe('Created 1 category (ID: cat-123)');
    expect(response.affected?.ids).toEqual(['cat-123']);
    expect(response.affected?.count).toBe(1);
  });

  it('should build an update response with multiple resource IDs', () => {
    const result = buildMutationResponse({
      operation: 'update',
      resourceType: 'transaction',
      resourceIds: ['txn-1', 'txn-2', 'txn-3'],
      changes: {
        updatedFields: ['category', 'amount'],
      },
    });

    const response = JSON.parse(result.content[0].text) as MutationResponse;
    expect(response.operation).toBe('update');
    expect(response.summary).toBe('Updated 3 transactions');
    expect(response.affected?.ids).toEqual(['txn-1', 'txn-2', 'txn-3']);
    expect(response.affected?.count).toBe(3);
    expect(response.metadata?.changes?.updatedFields).toEqual(['category', 'amount']);
  });

  it('should build a delete response with custom summary', () => {
    const result = buildMutationResponse({
      operation: 'delete',
      resourceType: 'payee',
      resourceIds: 'payee-456',
      summary: 'Successfully deleted the payee',
    });

    const response = JSON.parse(result.content[0].text) as MutationResponse;
    expect(response.operation).toBe('delete');
    expect(response.summary).toBe('Successfully deleted the payee');
  });

  it('should include warnings in metadata', () => {
    const result = buildMutationResponse({
      operation: 'update',
      resourceType: 'transaction',
      resourceIds: 'txn-123',
      metadata: {
        warnings: ['This is a split transaction', 'Changes may not persist in UI'],
      },
    });

    const response = JSON.parse(result.content[0].text) as MutationResponse;
    expect(response.metadata?.warnings).toEqual(['This is a split transaction', 'Changes may not persist in UI']);
  });
});

describe('buildReportResponse', () => {
  it('should build a report response with sections', () => {
    const sections = [
      createReportSection('Summary', '# Summary\nTotal spending: $1,234.56'),
      createReportSection('Details', '## Category Breakdown\n...', { totalCategories: 5 }),
    ];

    const result = buildReportResponse({
      operation: 'report',
      resourceType: 'spending-by-category',
      summary: 'Spending report for January 2024',
      sections,
      metadata: {
        period: { start: '2024-01', end: '2024-01' },
      },
    });

    const response = JSON.parse(result.content[0].text) as ReportResponse;
    expect(response.operation).toBe('report');
    expect(response.resourceType).toBe('spending-by-category');
    expect(response.summary).toBe('Spending report for January 2024');
    expect(response.sections).toHaveLength(2);
    expect(response.sections?.[0].title).toBe('Summary');
    expect(response.sections?.[1].data).toEqual({ totalCategories: 5 });
    expect(response.metadata?.period).toEqual({ start: '2024-01', end: '2024-01' });
  });

  it('should build an analysis response with structured data', () => {
    const analysisData = {
      avgIncome: 5000,
      avgExpenses: 3500,
      savingsRate: 30,
    };

    const result = buildReportResponse({
      operation: 'analyze',
      resourceType: 'monthly-summary',
      summary: 'Financial analysis for Q1 2024',
      data: analysisData,
      metadata: {
        period: { start: '2024-01', end: '2024-03' },
        accountName: 'Checking',
      },
    });

    const response = JSON.parse(result.content[0].text) as ReportResponse;
    expect(response.operation).toBe('analyze');
    expect(response.data).toEqual(analysisData);
    expect(response.metadata?.accountName).toBe('Checking');
  });
});

describe('createReportSection', () => {
  it('should create a report section without data', () => {
    const section = createReportSection('Introduction', '# Welcome\nThis is a report.');

    expect(section.title).toBe('Introduction');
    expect(section.content).toBe('# Welcome\nThis is a report.');
    expect(section.data).toBeUndefined();
  });

  it('should create a report section with data', () => {
    const sectionData = { count: 42, total: 100 };
    const section = createReportSection('Statistics', 'Count: 42/100', sectionData);

    expect(section.title).toBe('Statistics');
    expect(section.content).toBe('Count: 42/100');
    expect(section.data).toEqual(sectionData);
  });
});

// Edge cases
describe('report builder edge cases', () => {
  it('should handle empty data array in query response', () => {
    const result = buildQueryResponse({
      resourceType: 'transaction',
      data: [],
    });

    const response = JSON.parse(result.content[0].text) as QueryResponse;
    expect(response.summary).toBe('Retrieved 0 transactions');
    expect(response.data).toEqual([]);
  });

  it('should handle single item (non-array) in query response', () => {
    const data = { id: '1', name: 'Single Item' };
    const result = buildQueryResponse({
      resourceType: 'budget',
      data,
    });

    const response = JSON.parse(result.content[0].text) as QueryResponse;
    expect(response.summary).toBe('Retrieved 1 budget');
  });

  it('should handle empty array of resource IDs', () => {
    const result = buildMutationResponse({
      operation: 'delete',
      resourceType: 'rule',
      resourceIds: [],
    });

    const response = JSON.parse(result.content[0].text) as MutationResponse;
    expect(response.affected?.count).toBe(0);
    expect(response.summary).toBe('Deleted 0 rules');
  });
});
