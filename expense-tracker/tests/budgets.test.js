import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateBudgetSpending,
    calculateBudgetsSummary
} from '../src/utils/finance.js';

describe('Budgets Calculation & Threshold Warnings', () => {
    // Reference date: October 15, 2026 (month 9, zero-indexed)
    const targetDate = new Date(2026, 9, 15);

    const sampleTransactions = [
        // Current month expenses (Oct 2026)
        { _id: 'tx-1', type: 'expense', category: 'Food & Dining', amount: 25000, date: '2026-10-02T10:00:00Z' },
        { _id: 'tx-2', type: 'expense', category: 'Food & Dining', amount: 18000, date: '2026-10-10T12:00:00Z' },
        { _id: 'tx-3', type: 'expense', category: 'Transportation', amount: 15000, date: '2026-10-14T08:30:00Z' },
        // Current month income (should be excluded)
        { _id: 'tx-4', type: 'income', category: 'Salary', amount: 300000, date: '2026-10-01T09:00:00Z' },
        // Prior month expense (Sep 2026 - should be excluded from Oct budget)
        { _id: 'tx-5', type: 'expense', category: 'Food & Dining', amount: 40000, date: '2026-09-28T14:00:00Z' },
        // Prior year expense (Oct 2025 - should be excluded)
        { _id: 'tx-6', type: 'expense', category: 'Food & Dining', amount: 35000, date: '2025-10-15T10:00:00Z' }
    ];

    describe('calculateBudgetSpending', () => {
        it('calculates spending exclusively from the active calendar month and year', () => {
            const budget = {
                name: 'Dining',
                limit: 50000,
                category: 'Food & Dining',
                period: 'monthly'
            };

            const result = calculateBudgetSpending(budget, sampleTransactions, targetDate);

            // tx-1 (25000) + tx-2 (18000) = 43000
            assert.equal(result.spent, 43000);
            assert.equal(result.limit, 50000);
            assert.equal(result.remaining, 7000);
            assert.equal(result.percentage, 86);
            assert.equal(result.isWarning, true);
            assert.equal(result.isExceeded, false);
            assert.equal(result.status, 'warning');
        });

        it('warns when spending reaches 80% and does not trigger exceeded flag', () => {
            const budget = {
                name: 'Dining 80%',
                limit: 50000,
                category: 'Food & Dining',
                period: 'monthly'
            };

            // Exactly 40,000 spent out of 50,000 = 80.0%
            const txs = [
                { _id: 'a', type: 'expense', category: 'Food & Dining', amount: 40000, date: '2026-10-05T00:00:00Z' }
            ];

            const result = calculateBudgetSpending(budget, txs, targetDate);
            assert.equal(result.percentage, 80);
            assert.equal(result.isWarning, true);
            assert.equal(result.isExceeded, false);
            assert.equal(result.status, 'warning');
        });

        it('triggers exceeded alert when spending reaches or passes 100%', () => {
            const budget = {
                name: 'Transit',
                limit: 12000,
                category: 'Transportation',
                period: 'monthly'
            };

            // tx-3 is 15000, limit is 12000 -> 125% used, remaining -3000
            const result = calculateBudgetSpending(budget, sampleTransactions, targetDate);
            assert.equal(result.spent, 15000);
            assert.equal(result.remaining, -3000);
            assert.equal(result.percentage, 125);
            assert.equal(result.isExceeded, true);
            assert.equal(result.isWarning, false);
            assert.equal(result.status, 'exceeded');
        });

        it('handles "All Categories" budget covering all monthly expenses', () => {
            const budget = {
                name: 'Total Monthly Cap',
                limit: 100000,
                category: 'All Categories',
                period: 'monthly'
            };

            // Oct expenses: tx-1 (25000) + tx-2 (18000) + tx-3 (15000) = 58000
            const result = calculateBudgetSpending(budget, sampleTransactions, targetDate);
            assert.equal(result.spent, 58000);
            assert.equal(result.remaining, 42000);
            assert.equal(result.percentage, 58);
            assert.equal(result.status, 'normal');
        });

        it('returns zero spent and 100% remaining when no transactions exist', () => {
            const budget = { limit: 20000, category: 'Utilities' };
            const result = calculateBudgetSpending(budget, [], targetDate);

            assert.equal(result.spent, 0);
            assert.equal(result.limit, 20000);
            assert.equal(result.remaining, 20000);
            assert.equal(result.percentage, 0);
            assert.equal(result.status, 'normal');
        });
    });

    describe('calculateBudgetsSummary (Anti-Double-Counting)', () => {
        it('prevents double-counting when multiple budgets overlap on categories', () => {
            const budgets = [
                { _id: 'b1', name: 'Dining Work', limit: 30000, category: 'Food & Dining' },
                { _id: 'b2', name: 'Dining Weekend', limit: 20000, category: 'Food & Dining' },
                { _id: 'b3', name: 'Overall Cap', limit: 100000, category: 'All Categories' }
            ];

            // Sample transactions for Oct 2026:
            // tx-1 (25000) Food & Dining
            // tx-2 (18000) Food & Dining
            // tx-3 (15000) Transportation
            // Total unique expense in Oct = 58,000.
            // Even though b1, b2, and b3 all overlap with tx-1 and tx-2, summary must count them exactly once.
            const summary = calculateBudgetsSummary(budgets, sampleTransactions, targetDate);

            assert.equal(summary.totalLimit, 150000); // 30k + 20k + 100k
            assert.equal(summary.totalSpent, 58000);  // 25k + 18k + 15k (NOT 101k or 159k)
            assert.equal(summary.totalRemaining, 92000);
            assert.equal(summary.overallPercentage, 38.7);
            assert.equal(summary.budgetCount, 3);
            assert.equal(summary.status, 'normal');
        });

        it('returns safe zero defaults when budget list is empty', () => {
            const summary = calculateBudgetsSummary([], sampleTransactions, targetDate);
            assert.equal(summary.totalLimit, 0);
            assert.equal(summary.totalSpent, 0);
            assert.equal(summary.totalRemaining, 0);
            assert.equal(summary.overallPercentage, 0);
            assert.equal(summary.budgetCount, 0);
        });
    });
});
