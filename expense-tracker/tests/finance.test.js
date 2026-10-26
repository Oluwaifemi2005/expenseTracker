import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    roundToTwo,
    getSafeAmount,
    getTransactionDate,
    calculateTotals,
    calculateCategoryBreakdown,
    calculateMonthlyAggregates,
    getRecentTransactions
} from '../src/utils/finance.js';
import {
    CATEGORY_COLORS,
    DEFAULT_CATEGORY_COLOR,
    getCategoryColor
} from '../src/constants/categories.js';

describe('Financial Utility Pure Functions', () => {
    describe('roundToTwo and getSafeAmount', () => {
        it('should round floating-point arithmetic properly', () => {
            assert.equal(roundToTwo(0.1 + 0.2), 0.3);
            assert.equal(roundToTwo(123.456), 123.46);
            assert.equal(roundToTwo(123.454), 123.45);
        });

        it('should sanitize amounts safely', () => {
            assert.equal(getSafeAmount('45.50'), 45.5);
            assert.equal(getSafeAmount(100), 100);
            assert.equal(getSafeAmount(0), 0);
            assert.equal(getSafeAmount(-50), 0);
            assert.equal(getSafeAmount(NaN), 0);
            assert.equal(getSafeAmount(Infinity), 0);
            assert.equal(getSafeAmount('invalid'), 0);
            assert.equal(getSafeAmount(null), 0);
            assert.equal(getSafeAmount(undefined), 0);
        });
    });

    describe('getTransactionDate', () => {
        it('should prioritize tx.date then tx.createdAt', () => {
            const tx1 = { date: '2026-05-15T12:00:00Z', createdAt: '2026-01-01T00:00:00Z' };
            const d1 = getTransactionDate(tx1);
            assert.equal(d1?.toISOString(), '2026-05-15T12:00:00.000Z');

            const tx2 = { createdAt: '2026-04-10T10:00:00Z' };
            const d2 = getTransactionDate(tx2);
            assert.equal(d2?.toISOString(), '2026-04-10T10:00:00.000Z');
        });

        it('should return null for missing or invalid dates', () => {
            assert.equal(getTransactionDate(null), null);
            assert.equal(getTransactionDate({}), null);
            assert.equal(getTransactionDate({ date: 'not-a-date' }), null);
        });
    });

    describe('calculateTotals', () => {
        it('should return safe zero defaults on empty or invalid transactions list', () => {
            const emptyResult = calculateTotals([]);
            assert.equal(emptyResult.totalIncome, 0);
            assert.equal(emptyResult.totalExpense, 0);
            assert.equal(emptyResult.balance, 0);
            assert.equal(emptyResult.savingsRate, 0);
            assert.equal(emptyResult.inflowOutflowRatio, null);
            assert.equal(emptyResult.averageExpense, 0);
            assert.deepEqual(emptyResult.income, []);
            assert.deepEqual(emptyResult.expense, []);

            const nullResult = calculateTotals(null);
            assert.equal(nullResult.totalIncome, 0);
            assert.equal(nullResult.balance, 0);
        });

        it('should calculate accurate totals for mixed transactions with floating point amounts', () => {
            const transactions = [
                { _id: '1', type: 'income', amount: 1500.55 },
                { _id: '2', type: 'income', amount: 500.45 },
                { _id: '3', type: 'expense', amount: 200.10 },
                { _id: '4', type: 'expense', amount: 300.20 }
            ];

            const result = calculateTotals(transactions);
            assert.equal(result.totalIncome, 2001.00);
            assert.equal(result.totalExpense, 500.30);
            assert.equal(result.balance, 1500.70);
            assert.equal(result.income.length, 2);
            assert.equal(result.expense.length, 2);
            assert.equal(result.savingsRate, 75); // (1500.70 / 2001.00) * 100 = ~75%
            assert.equal(result.inflowOutflowRatio, 4.00); // 2001.00 / 500.30 = ~4.00
            assert.equal(result.averageExpense, 250.15); // 500.30 / 2
        });

        it('should handle income-only datasets correctly', () => {
            const transactions = [
                { _id: '1', type: 'income', amount: 3000 }
            ];

            const result = calculateTotals(transactions);
            assert.equal(result.totalIncome, 3000);
            assert.equal(result.totalExpense, 0);
            assert.equal(result.balance, 3000);
            assert.equal(result.savingsRate, 100);
            assert.equal(result.inflowOutflowRatio, null);
            assert.equal(result.averageExpense, 0);
        });

        it('should handle expense-only datasets without corrupting balance or division errors', () => {
            const transactions = [
                { _id: '1', type: 'expense', amount: 1200 }
            ];

            const result = calculateTotals(transactions);
            assert.equal(result.totalIncome, 0);
            assert.equal(result.totalExpense, 1200);
            assert.equal(result.balance, -1200);
            assert.equal(result.savingsRate, 0); // No income to retain
            assert.equal(result.inflowOutflowRatio, 0);
            assert.equal(result.averageExpense, 1200);
        });

        it('should ignore negative or invalid amounts gracefully', () => {
            const transactions = [
                { _id: '1', type: 'income', amount: 1000 },
                { _id: '2', type: 'expense', amount: -500 }, // Negative invalid amount ignored -> 0
                { _id: '3', type: 'expense', amount: NaN }     // NaN ignored -> 0
            ];

            const result = calculateTotals(transactions);
            assert.equal(result.totalIncome, 1000);
            assert.equal(result.totalExpense, 0);
            assert.equal(result.balance, 1000);
        });
    });

    describe('calculateCategoryBreakdown', () => {
        it('should return empty list when no expenses exist', () => {
            assert.deepEqual(calculateCategoryBreakdown([]), []);
            assert.deepEqual(calculateCategoryBreakdown([{ type: 'income', amount: 100 }]), []);
        });

        it('should aggregate expenses by category, calculate accurate percentages, and sort descending', () => {
            const transactions = [
                { type: 'expense', category: 'Food & Dining', amount: 300 },
                { type: 'expense', category: 'Transportation', amount: 100 },
                { type: 'expense', category: 'Food & Dining', amount: 100 },
                { type: 'income', category: 'Salary', amount: 2000 } // Income ignored
            ];

            const breakdown = calculateCategoryBreakdown(transactions);
            assert.equal(breakdown.length, 2);

            // Food & Dining: 400 / 500 = 80.0%
            assert.equal(breakdown[0].category, 'Food & Dining');
            assert.equal(breakdown[0].amount, 400);
            assert.equal(breakdown[0].percentage, 80.0);
            assert.equal(breakdown[0].color, CATEGORY_COLORS['Food & Dining']);

            // Transportation: 100 / 500 = 20.0%
            assert.equal(breakdown[1].category, 'Transportation');
            assert.equal(breakdown[1].amount, 100);
            assert.equal(breakdown[1].percentage, 20.0);
            assert.equal(breakdown[1].color, CATEGORY_COLORS['Transportation']);
        });

        it('should fallback missing or unknown categories to Other with default color', () => {
            const transactions = [
                { type: 'expense', category: '', amount: 50 },
                { type: 'expense', category: 'MysteryCategory', amount: 50 }
            ];

            const breakdown = calculateCategoryBreakdown(transactions);
            assert.equal(breakdown.length, 2);

            const otherItem = breakdown.find(b => b.category === 'Other');
            const mysteryItem = breakdown.find(b => b.category === 'MysteryCategory');

            assert.equal(otherItem?.amount, 50);
            assert.equal(otherItem?.color, DEFAULT_CATEGORY_COLOR);
            assert.equal(mysteryItem?.amount, 50);
            assert.equal(mysteryItem?.color, DEFAULT_CATEGORY_COLOR);
        });
    });

    describe('calculateMonthlyAggregates', () => {
        it('should isolate transactions strictly by year and avoid cross-year month collision', () => {
            const transactions = [
                // Oct 2026
                { type: 'income', amount: 5000, date: '2026-10-05T10:00:00Z' },
                { type: 'expense', amount: 1500, date: '2026-10-10T10:00:00Z' },
                // Oct 2025 (different year!)
                { type: 'income', amount: 4000, date: '2025-10-12T10:00:00Z' },
                { type: 'expense', amount: 2000, date: '2025-10-15T10:00:00Z' },
                // Jan 2026
                { type: 'income', amount: 3000, date: '2026-01-15T10:00:00Z' }
            ];

            // Target 2026
            const agg2026 = calculateMonthlyAggregates(transactions, { year: 2026 });
            assert.equal(agg2026.activeYear, 2026);
            assert.equal(agg2026.months.length, 12);
            assert.deepEqual(agg2026.availableYears, [2026, 2025]);

            // Oct 2026 (index 9) must ONLY have 2026 data
            const oct2026 = agg2026.months[9];
            assert.equal(oct2026.name, 'Oct');
            assert.equal(oct2026.income, 5000);
            assert.equal(oct2026.expense, 1500);
            assert.equal(oct2026.balance, 3500);

            // Jan 2026 (index 0)
            const jan2026 = agg2026.months[0];
            assert.equal(jan2026.name, 'Jan');
            assert.equal(jan2026.income, 3000);

            // Target 2025
            const agg2025 = calculateMonthlyAggregates(transactions, { year: 2025 });
            assert.equal(agg2025.activeYear, 2025);
            const oct2025 = agg2025.months[9];
            assert.equal(oct2025.income, 4000);
            assert.equal(oct2025.expense, 2000);
        });

        it('should handle empty transactions safely with 12 zeroed calendar months', () => {
            const agg = calculateMonthlyAggregates([]);
            assert.equal(agg.months.length, 12);
            assert.equal(agg.months[0].name, 'Jan');
            assert.equal(agg.months[0].income, 0);
            assert.equal(agg.months[0].expense, 0);
            assert.equal(agg.maxMonthlyValue, 1000);
        });

        it('should skip transactions with unparseable dates without throwing', () => {
            const transactions = [
                { type: 'income', amount: 500, date: 'not-valid' },
                { type: 'income', amount: 1200, date: '2026-03-01T00:00:00Z' }
            ];

            const agg = calculateMonthlyAggregates(transactions, { year: 2026 });
            assert.equal(agg.months[2].income, 1200); // March
        });
    });

    describe('getRecentTransactions', () => {
        it('should sort transactions strictly chronologically descending (newest first)', () => {
            const transactions = [
                { _id: '1', description: 'Oldest', date: '2026-01-01T10:00:00Z' },
                { _id: '2', description: 'Newest', date: '2026-03-01T10:00:00Z' },
                { _id: '3', description: 'Middle', date: '2026-02-01T10:00:00Z' }
            ];

            const recent = getRecentTransactions(transactions, 2);
            assert.equal(recent.length, 2);
            assert.equal(recent[0]._id, '2'); // Newest first
            assert.equal(recent[1]._id, '3');
        });

        it('should handle empty list or limit 0 safely', () => {
            assert.deepEqual(getRecentTransactions([]), []);
            assert.deepEqual(getRecentTransactions([{ _id: '1' }], 0), []);
        });
    });

    describe('Category Colors & Fallbacks', () => {
        it('should return correct color for known categories', () => {
            assert.equal(getCategoryColor('Food & Dining'), '#f59e0b');
            assert.equal(getCategoryColor('Salary'), '#10b981');
            assert.equal(getCategoryColor('Housing & Rent'), '#8b5cf6');
        });

        it('should return default fallback color for unknown, null, or empty category', () => {
            assert.equal(getCategoryColor('NonExistent'), DEFAULT_CATEGORY_COLOR);
            assert.equal(getCategoryColor(''), DEFAULT_CATEGORY_COLOR);
            assert.equal(getCategoryColor(null), DEFAULT_CATEGORY_COLOR);
            assert.equal(getCategoryColor(undefined), DEFAULT_CATEGORY_COLOR);
        });
    });
});
