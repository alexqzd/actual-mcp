# Split Transaction Update Fixes - Summary

## Problem Statement
Split transactions in Actual Budget have known limitations when using the `update-transaction` MCP tool. Updates to parent split transactions or subtransactions often don't persist in the UI despite the API accepting them.

## Investigation Results

### Automated Testing (`scripts/investigate-splits.ts`)
Created and ran comprehensive tests that revealed:

1. ✅ **API Accepts All Updates** - The Actual Budget API accepts updates to:
   - Parent split transaction fields (date, notes, amount)
   - Individual subtransaction fields (category, notes, amount)
   - Subtransactions array modifications

2. ⚠️ **UI Persistence Issues** - Despite API success, many updates don't persist in the UI
   - This is an **Actual Budget API limitation**, not an MCP bug

3. ⚠️ **Dangerous Operations**
   - Passing `subtransactions: []` to convert split → regular transaction **causes app crashes**

### Key Findings from Transaction Structure
- Split transactions have `is_parent: true` flag
- Subtransactions have `is_child: true` and `parent_id` field
- Subtransactions reference parent's account (no direct `account` field)

## Fixes Implemented

### 1. Smart Validation for Empty Subtransactions
**File**: `src/tools/update-transaction/data-fetcher.ts`

```typescript
// Prevent dangerous empty subtransactions array
if (Array.isArray(input.subtransactions) && input.subtransactions.length === 0) {
  throw new Error(
    'Cannot set subtransactions to an empty array. ' +
    'This operation can corrupt split transactions and cause app crashes. ' +
    'To convert a split transaction to a regular transaction, delete the split and create a new transaction instead.'
  );
}
```

### 2. Enhanced Logging & Warnings
**File**: `src/tools/update-transaction/data-fetcher.ts`

- Added `logger.warning()` when updating subtransactions array
- Added `logger.info()` when updating fields that might be on split parents
- Warns users about potential API limitations

### 3. Updated Tool Description
**File**: `src/tools/update-transaction/index.ts`

Added comprehensive documentation about split transaction limitations:
- Parent split transaction updates may not persist
- Recommended workarounds (update individual subtransactions, or delete and recreate)
- Warnings about empty subtransactions array danger
- Guidance about "Amount left" errors

### 4. Enhanced User-Facing Error Messages
**File**: `src/tools/update-transaction/report-generator.ts`

Now includes contextual warnings:
- ⚠️ When updating subtransactions array
- ⚠️ When updating date/amount/notes (might be split parent)
- Clear guidance on workarounds and verification steps

### 5. Comprehensive Test Coverage
**Files**:
- `src/tools/update-transaction/data-fetcher.test.ts`
- `src/tools/update-transaction/report-generator.test.ts`

Added tests for:
- Empty subtransactions validation
- Warning generation logic
- All update scenarios (27 tests total, all passing ✅)

## Files Changed

### Core Implementation
- `src/tools/update-transaction/data-fetcher.ts` - Validation & logging
- `src/tools/update-transaction/report-generator.ts` - Warning messages
- `src/tools/update-transaction/index.ts` - Tool description

### Tests
- `src/tools/update-transaction/data-fetcher.test.ts` - Added 2 new tests
- `src/tools/update-transaction/report-generator.test.ts` - Updated all 9 tests

### Investigation
- `scripts/investigate-splits.ts` - Automated testing script (NEW)
- `scripts/SPLIT_TRANSACTION_FIXES_SUMMARY.md` - This file (NEW)

## Recommendations for Users

### ✅ What Works Reliably
- Creating split transactions via `create-transaction`
- Updating simple (non-split) transactions
- Deleting individual subtransactions via `delete-transaction`
- Updating individual subtransaction amounts and notes

### ⚠️ What Has Limitations
- Updating parent split transaction fields (date, notes, amount)
- Modifying the subtransactions array
- Updating category on subtransactions (verify in UI)

### 🚫 What to Avoid
- **NEVER** pass `subtransactions: []` - will crash the app
- Don't assume parent split updates will persist without UI verification

### 💡 Recommended Workflows

**To modify a split transaction:**
1. **Option A (Reliable)**: Delete the split and create a new one
2. **Option B (Verify)**: Update individual subtransactions by their IDs, then verify in UI
3. **Option C (Not recommended)**: Update parent fields and cross your fingers

**To change subtransaction amounts:**
- Update individual subtransactions
- Ensure total matches parent amount to avoid "Amount left" errors

## Test Results

```
✓ src/tools/update-transaction/report-generator.test.ts (9 tests)
✓ src/tools/update-transaction/input-parser.test.ts (9 tests)
✓ src/tools/update-transaction/data-fetcher.test.ts (9 tests)

Test Files  3 passed (3)
     Tests  27 passed (27) ✅
```

## Build Status

```bash
npm run build  ✅ Success
npm run test   ✅ 27/27 tests passing
```

## Future Improvements

1. **Name-based field support**: Add `categoryName` and `payeeName` optional parameters to match `create-transaction` UX (deferred per user request)

2. **Transaction type detection**: Fetch transaction before update to detect if it's a split parent (requires knowing account ID and date range)

3. **Better API workarounds**: Investigate if there's a better way to reliably update split transactions

## Conclusion

The MCP server now properly:
- ✅ Prevents dangerous operations (empty subtransactions)
- ✅ Warns users about known limitations
- ✅ Provides clear guidance and workarounds
- ✅ Documents expected vs actual behavior
- ✅ Has comprehensive test coverage

The underlying API limitations remain (Actual Budget side), but users are now protected and informed.
