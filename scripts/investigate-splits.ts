/**
 * Investigation script for split transaction behavior in Actual Budget API
 *
 * This script tests various operations on split transactions to understand:
 * 1. Can parent split transactions be updated?
 * 2. Can individual subtransactions be updated?
 * 3. What happens with empty subtransactions array?
 * 4. Do category updates work on subtransactions?
 */

import api from '@actual-app/api';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DEFAULT_DATA_DIR = path.resolve(os.homedir() || '.', '.actual');

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string, data?: any) {
  console.log(`\n📝 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message: string, data?: any) {
  console.log(`\n✅ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(message: string, error?: any) {
  console.error(`\n❌ ${message}`);
  if (error) {
    console.error(error);
  }
}

function logWarning(message: string, data?: any) {
  console.warn(`\n⚠️  ${message}`);
  if (data) {
    console.warn(JSON.stringify(data, null, 2));
  }
}

async function initializeAPI() {
  log('Initializing Actual Budget API...');

  const dataDir = process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  await api.init({
    dataDir,
    serverURL: process.env.ACTUAL_SERVER_URL,
    password: process.env.ACTUAL_PASSWORD,
  });

  const budgets = await api.getBudgets();
  if (!budgets || budgets.length === 0) {
    throw new Error('No budgets found');
  }

  const budgetId = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';
  log(`Loading budget: ${budgetId}`);
  await api.downloadBudget(budgetId);

  logSuccess('API initialized successfully');
}

async function getTestAccount() {
  const accounts = await api.getAccounts();
  const testAccount = accounts.find(a => !a.closed);
  if (!testAccount) {
    throw new Error('No open accounts found');
  }
  log(`Using test account: ${testAccount.name} (${testAccount.id})`);
  return testAccount;
}

async function getTestCategories() {
  const categories = await api.getCategories();
  const testCategories = categories.filter(c => !c.is_income).slice(0, 3);
  if (testCategories.length < 2) {
    throw new Error('Need at least 2 categories for testing');
  }
  log(`Using test categories: ${testCategories.map(c => c.name).join(', ')}`);
  return testCategories;
}

async function createTestSplitTransaction(accountId: string, categories: any[]) {
  log('Creating test split transaction...');

  const transaction = {
    date: '2025-01-15',
    amount: -10000, // -$100.00
    cleared: false,
    subtransactions: [
      {
        amount: -6000, // -$60.00
        category: categories[0].id,
        notes: 'Split 1',
      },
      {
        amount: -4000, // -$40.00
        category: categories[1].id,
        notes: 'Split 2',
      },
    ],
  };

  const result = await api.importTransactions(accountId, [transaction]);
  const transactionId = result.added[0] || result.updated[0];

  logSuccess(`Created split transaction with ID: ${transactionId}`);

  // Fetch the transaction to get subtransaction IDs
  const transactions = await api.getTransactions(accountId, '2025-01-01', '2025-01-31');
  const createdTx = transactions.find(t => t.id === transactionId);

  if (createdTx && createdTx.subtransactions) {
    log(`Parent transaction has ${createdTx.subtransactions.length} subtransactions`);
    createdTx.subtransactions.forEach((sub, idx) => {
      log(`  Subtransaction ${idx + 1}: ID=${sub.id}, amount=${sub.amount}, category=${sub.category}`);
    });
  }

  return { transactionId, transaction: createdTx };
}

async function testUpdateParentSplitNotes(transactionId: string) {
  log('\n🧪 TEST 1: Update notes on parent split transaction');

  try {
    await api.updateTransaction(transactionId, { notes: 'Updated parent notes' });
    logSuccess('API call succeeded');

    results.push({
      test: 'Update parent split - notes',
      success: true,
      details: 'API accepted the update. Check UI to verify if it actually changed.',
    });
  } catch (error) {
    logError('API call failed', error);
    results.push({
      test: 'Update parent split - notes',
      success: false,
      error: String(error),
    });
  }
}

async function testUpdateParentSplitDate(transactionId: string) {
  log('\n🧪 TEST 2: Update date on parent split transaction');

  try {
    await api.updateTransaction(transactionId, { date: '2025-01-20' });
    logSuccess('API call succeeded');

    results.push({
      test: 'Update parent split - date',
      success: true,
      details: 'API accepted the update. Check UI to verify if it actually changed.',
    });
  } catch (error) {
    logError('API call failed', error);
    results.push({
      test: 'Update parent split - date',
      success: false,
      error: String(error),
    });
  }
}

async function testUpdateParentSplitAmount(transactionId: string) {
  log('\n🧪 TEST 3: Update amount on parent split transaction');

  try {
    await api.updateTransaction(transactionId, { amount: -12000 }); // -$120.00
    logSuccess('API call succeeded');

    results.push({
      test: 'Update parent split - amount',
      success: true,
      details: 'API accepted the update. Check UI - may show "Amount left" error.',
    });
  } catch (error) {
    logError('API call failed', error);
    results.push({
      test: 'Update parent split - amount',
      success: false,
      error: String(error),
    });
  }
}

async function testUpdateSubtransactionCategory(subtransactionId: string, newCategoryId: string) {
  log('\n🧪 TEST 4: Update category on individual subtransaction');

  try {
    await api.updateTransaction(subtransactionId, { category: newCategoryId });
    logSuccess('API call succeeded');

    results.push({
      test: 'Update subtransaction - category',
      success: true,
      details: 'API accepted the update. Check UI to verify category changed.',
    });
  } catch (error) {
    logError('API call failed', error);
    results.push({
      test: 'Update subtransaction - category',
      success: false,
      error: String(error),
    });
  }
}

async function testUpdateSubtransactionNotes(subtransactionId: string) {
  log('\n🧪 TEST 5: Update notes on individual subtransaction');

  try {
    await api.updateTransaction(subtransactionId, { notes: 'Updated subtransaction notes' });
    logSuccess('API call succeeded');

    results.push({
      test: 'Update subtransaction - notes',
      success: true,
      details: 'API accepted the update. Check UI to verify notes changed.',
    });
  } catch (error) {
    logError('API call failed', error);
    results.push({
      test: 'Update subtransaction - notes',
      success: false,
      error: String(error),
    });
  }
}

async function testUpdateSubtransactionAmount(subtransactionId: string) {
  log('\n🧪 TEST 6: Update amount on individual subtransaction');

  try {
    await api.updateTransaction(subtransactionId, { amount: -7000 }); // -$70.00
    logSuccess('API call succeeded');

    results.push({
      test: 'Update subtransaction - amount',
      success: true,
      details: 'API accepted the update. Check UI - may show "Amount left" if total doesn\'t match.',
    });
  } catch (error) {
    logError('API call failed', error);
    results.push({
      test: 'Update subtransaction - amount',
      success: false,
      error: String(error),
    });
  }
}

async function testUpdateParentSubtransactionsArray(transactionId: string, categories: any[]) {
  log('\n🧪 TEST 7: Update subtransactions array on parent');

  try {
    await api.updateTransaction(transactionId, {
      subtransactions: [
        {
          amount: -5000, // -$50.00
          category: categories[0].id,
          notes: 'Modified split 1',
        },
        {
          amount: -5000, // -$50.00
          category: categories[1].id,
          notes: 'Modified split 2',
        },
      ],
    });
    logSuccess('API call succeeded');

    results.push({
      test: 'Update parent - subtransactions array',
      success: true,
      details: 'API accepted the update. Check UI to verify if subtransactions changed.',
    });
  } catch (error) {
    logError('API call failed', error);
    results.push({
      test: 'Update parent - subtransactions array',
      success: false,
      error: String(error),
    });
  }
}

async function testEmptySubtransactionsArray(transactionId: string) {
  log('\n🧪 TEST 8: Send empty subtransactions array (DANGEROUS - may crash app)');
  logWarning('This test may corrupt the transaction and cause UI errors!');

  // Skip this test by default - too dangerous
  logWarning('SKIPPED: This test is too dangerous to run automatically');
  results.push({
    test: 'Update parent - empty subtransactions array',
    success: false,
    details: 'Test skipped - known to cause app crash',
  });

  // Uncomment to run the dangerous test:
  // try {
  //   await api.updateTransaction(transactionId, { subtransactions: [] });
  //   logSuccess('API call succeeded');
  //   results.push({
  //     test: 'Update parent - empty subtransactions array',
  //     success: true,
  //     details: 'API accepted empty array. CHECK UI IMMEDIATELY - may be crashed!',
  //   });
  // } catch (error) {
  //   logError('API call failed', error);
  //   results.push({
  //     test: 'Update parent - empty subtransactions array',
  //     success: false,
  //     error: String(error),
  //   });
  // }
}

async function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  results.forEach((result, idx) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`\n${idx + 1}. ${icon} ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('🔍 NEXT STEPS:');
  console.log('1. Check your Actual Budget UI to see which updates actually applied');
  console.log('2. Look for any "Amount left" errors or corrupted transactions');
  console.log('3. Document which operations work vs. which ones fail silently');
  console.log('='.repeat(80) + '\n');
}

async function main() {
  try {
    await initializeAPI();

    const account = await getTestAccount();
    const categories = await getTestCategories();

    const { transactionId, transaction } = await createTestSplitTransaction(account.id, categories);

    if (!transaction || !transaction.subtransactions || transaction.subtransactions.length === 0) {
      throw new Error('Failed to create split transaction with subtransactions');
    }

    const subtransactionId = transaction.subtransactions[0].id;
    const subtransaction2Id = transaction.subtransactions[1]?.id;

    // Run tests
    await testUpdateParentSplitNotes(transactionId);
    await testUpdateParentSplitDate(transactionId);
    await testUpdateParentSplitAmount(transactionId);

    if (subtransactionId) {
      await testUpdateSubtransactionCategory(subtransactionId, categories[2].id);
      await testUpdateSubtransactionNotes(subtransactionId);
      await testUpdateSubtransactionAmount(subtransactionId);
    }

    await testUpdateParentSubtransactionsArray(transactionId, categories);
    await testEmptySubtransactionsArray(transactionId);

    await printSummary();

    logSuccess('\n✨ Investigation completed! Check the test account in Actual Budget UI.');

  } catch (error) {
    logError('Investigation failed', error);
    process.exit(1);
  } finally {
    await api.shutdown();
  }
}

main();
