import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    computePercentageChange,
    calculateMonthOverMonthComparison,
    calculateCategoryMoMTrends,
    generateDashboardInsights
} from '../src/utils/finance.js';

describe('Dashboard Insights & Trends Calculation Utilities', () => {
    describe('1. computePercentageChange', () => {
        it('calculates positive and negative percentage changes accurately', () => {
            // 150 from 100 = +50%
            const inc = computePercentageChange(150, 100);
            assert.equal(inc.percentage, 50);
            assert.equal(inc.delta, 50);
            assert.equal(inc.status, 'increased');

            // 60 from 100 = -40%
            const dec = computePercentageChange(60, 100);
            assert.equal(dec.percentage, -40);
            assert.equal(dec.delta, -40);
            assert.equal(dec.status, 'decreased');
        });

        it('safely handles zero baseline without NaN or Infinity', () => {
            // prev is 0, curr is 250 -> marked as 'new' with null percentage
            const newSpent = computePercentageChange(250, 0);
            assert.equal(newSpent.percentage, null);
            assert.equal(newSpent.delta, 250);
            assert.equal(newSpent.status, 'new');

            // both are 0 -> unchanged
            const bothZero = computePercentageChange(0, 0);
            assert.equal(bothZero.percentage, 0);
            assert.equal(bothZero.delta, 0);
            assert.equal(bothZero.status, 'unchanged');

            // prev is 100, curr is 0 -> -100% decreased
            const dropToZero = computePercentageChange(0, 100);
            assert.equal(dropToZero.percentage, -100);
            assert.equal(dropToZero.delta, -100);
            assert.equal(dropToZero.status, 'decreased');
        });
    });

    describe('2. calculateMonthOverMonthComparison', () => {
        // Oct 26, 2026 as reference date (day 26 of 31)
        const refDate = new Date('2026-10-26T12:00:00.000Z');

        it('identifies historyState as no_transactions when transactions array is empty', () => {
            const result = calculateMonthOverMonthComparison([], refDate);
            assert.equal(result.historyState, 'no_transactions');
            assert.equal(result.currentMonth.label, 'October 2026');
            assert.equal(result.previousMonth.label, 'September 2026');
            assert.equal(result.currentMonth.daysElapsed, 26);
            assert.equal(result.currentMonth.isComplete, false);
            assert.equal(result.fullMonthComparison.isComparable, false);
        });

        it('identifies current_month_only and previous_month_only correctly', () => {
            const currentTxs = [
                { amount: 50, type: 'expense', category: 'Food & Dining', date: '2026-10-10T10:00:00Z' }
            ];
            const currentOnly = calculateMonthOverMonthComparison(currentTxs, refDate);
            assert.equal(currentOnly.historyState, 'current_month_only');
            assert.equal(currentOnly.currentMonth.expense, 50);
            assert.equal(currentOnly.previousMonth.expense, 0);

            const prevTxs = [
                { amount: 120, type: 'expense', category: 'Utilities', date: '2026-09-15T10:00:00Z' }
            ];
            const prevOnly = calculateMonthOverMonthComparison(prevTxs, refDate);
            assert.equal(prevOnly.historyState, 'previous_month_only');
            assert.equal(prevOnly.currentMonth.expense, 0);
            assert.equal(prevOnly.previousMonth.expense, 120);

            const olderTxs = [
                { amount: 200, type: 'expense', category: 'Rent', date: '2026-05-01T10:00:00Z' }
            ];
            const olderOnly = calculateMonthOverMonthComparison(olderTxs, refDate);
            assert.equal(olderOnly.historyState, 'other_history_only');
        });

        it('correctly compares both months with full month and elapsed pace metrics', () => {
            const txs = [
                // Previous month (September 2026)
                { amount: 3000, type: 'income', category: 'Salary', date: '2026-09-01T10:00:00Z' },
                { amount: 400, type: 'expense', category: 'Food & Dining', date: '2026-09-10T10:00:00Z' }, // day 10
                { amount: 600, type: 'expense', category: 'Housing', date: '2026-09-20T10:00:00Z' },       // day 20
                { amount: 500, type: 'expense', category: 'Travel', date: '2026-09-29T10:00:00Z' },        // day 29 (> day 26)

                // Current month (October 2026 through day 26)
                { amount: 3500, type: 'income', category: 'Salary', date: '2026-10-01T10:00:00Z' },
                { amount: 500, type: 'expense', category: 'Food & Dining', date: '2026-10-12T10:00:00Z' }, // day 12
                { amount: 700, type: 'expense', category: 'Housing', date: '2026-10-18T10:00:00Z' }        // day 18
            ];

            const result = calculateMonthOverMonthComparison(txs, refDate);
            assert.equal(result.historyState, 'both_months');

            // Current Month Totals (Oct)
            assert.equal(result.currentMonth.income, 3500);
            assert.equal(result.currentMonth.expense, 1200); // 500 + 700
            assert.equal(result.currentMonth.balance, 2300); // 3500 - 1200
            assert.equal(result.currentMonth.isComplete, false);

            // Previous Month Full Totals (Sep)
            assert.equal(result.previousMonth.income, 3000);
            assert.equal(result.previousMonth.expense, 1500); // 400 + 600 + 500

            // Equivalent Elapsed Pace (Through Day 26)
            // Current elapsed (days 1-26): 1200
            // Prev elapsed (days 1-26): 400 + 600 = 1000 (day 29 is excluded!)
            assert.equal(result.elapsedPaceComparison.daysCompared, 26);
            assert.equal(result.elapsedPaceComparison.currentElapsedExpense, 1200);
            assert.equal(result.elapsedPaceComparison.prevElapsedExpense, 1000);
            // Pace change: ((1200 - 1000) / 1000) * 100 = +20%
            assert.equal(result.elapsedPaceComparison.expenseChange.percentage, 20);
            assert.equal(result.elapsedPaceComparison.expenseChange.delta, 200);
            assert.equal(result.elapsedPaceComparison.expenseChange.status, 'increased');
        });

        it('handles month boundaries and leap years safely for equivalent elapsed comparison', () => {
            // Test March 31 on a Leap Year (2024 has 29 days in Feb)
            const leapRef = new Date('2024-03-31T12:00:00.000Z');
            const result = calculateMonthOverMonthComparison([], leapRef);
            assert.equal(result.currentMonth.daysElapsed, 31);
            assert.equal(result.previousMonth.totalDays, 29); // February 2024 leap year
            // Should clamp elapsed comparison day to 29
            assert.equal(result.elapsedPaceComparison.daysCompared, 29);

            // Test March 31 on a Non-Leap Year (2025 has 28 days in Feb)
            const nonLeapRef = new Date('2025-03-31T12:00:00.000Z');
            const resultNonLeap = calculateMonthOverMonthComparison([], nonLeapRef);
            assert.equal(resultNonLeap.previousMonth.totalDays, 28);
            assert.equal(resultNonLeap.elapsedPaceComparison.daysCompared, 28);
        });
    });

    describe('3. calculateCategoryMoMTrends', () => {
        const refDate = new Date('2026-10-26T12:00:00.000Z');

        it('ranks category movers by absolute delta and limits to top 3', () => {
            const txs = [
                // Sep
                { amount: 300, type: 'expense', category: 'Food & Dining', date: '2026-09-10T00:00:00Z' },
                { amount: 800, type: 'expense', category: 'Housing', date: '2026-09-10T00:00:00Z' },
                { amount: 150, type: 'expense', category: 'Utilities', date: '2026-09-10T00:00:00Z' },
                { amount: 200, type: 'expense', category: 'Entertainment', date: '2026-09-10T00:00:00Z' },
                { amount: 100, type: 'expense', category: 'Healthcare', date: '2026-09-10T00:00:00Z' },

                // Oct
                { amount: 500, type: 'expense', category: 'Food & Dining', date: '2026-10-10T00:00:00Z' }, // +200
                { amount: 800, type: 'expense', category: 'Housing', date: '2026-10-10T00:00:00Z' },       // 0
                { amount: 50, type: 'expense', category: 'Utilities', date: '2026-10-10T00:00:00Z' },      // -100
                { amount: 500, type: 'expense', category: 'Entertainment', date: '2026-10-10T00:00:00Z' }, // +300
                { amount: 120, type: 'expense', category: 'Healthcare', date: '2026-10-10T00:00:00Z' }     // +20
            ];

            const trends = calculateCategoryMoMTrends(txs, refDate);
            // Top category this month: Housing (800)
            assert.equal(trends.topCategoryThisMonth.category, 'Housing');
            assert.equal(trends.topCategoryThisMonth.amount, 800);

            // Movers must be strictly limited to 3
            assert.equal(trends.topMovers.length, 3);
            // 1st mover: Entertainment (+300)
            assert.equal(trends.topMovers[0].category, 'Entertainment');
            assert.equal(trends.topMovers[0].delta, 300);
            assert.equal(trends.topMovers[0].changeStatus, 'increased');

            // 2nd mover: Food & Dining (+200)
            assert.equal(trends.topMovers[1].category, 'Food & Dining');
            assert.equal(trends.topMovers[1].delta, 200);

            // 3rd mover: Utilities (-100)
            assert.equal(trends.topMovers[2].category, 'Utilities');
            assert.equal(trends.topMovers[2].delta, -100);
            assert.equal(trends.topMovers[2].changeStatus, 'decreased');
        });

        it('handles new categories in current month gracefully', () => {
            const txs = [
                // No Shopping in Sep
                { amount: 100, type: 'expense', category: 'Food & Dining', date: '2026-09-05T00:00:00Z' },
                // Shopping appears in Oct
                { amount: 250, type: 'expense', category: 'Shopping', date: '2026-10-05T00:00:00Z' }
            ];

            const trends = calculateCategoryMoMTrends(txs, refDate);
            const shoppingMover = trends.topMovers.find((m) => m.category === 'Shopping');
            assert.ok(shoppingMover);
            assert.equal(shoppingMover.previousAmount, 0);
            assert.equal(shoppingMover.currentAmount, 250);
            assert.equal(shoppingMover.delta, 250);
            assert.equal(shoppingMover.changeStatus, 'new');
            assert.equal(shoppingMover.percentageChange, null);
        });
    });

    describe('4. generateDashboardInsights', () => {
        const refDate = new Date('2026-10-26T12:00:00.000Z');

        it('returns welcoming guidance when no transactions exist', () => {
            const insights = generateDashboardInsights([], refDate);
            assert.equal(insights.length, 1);
            assert.equal(insights[0].id, 'no_transactions');
        });

        it('returns helpful advice without claiming zero history when only previous month has data', () => {
            const txs = [
                { amount: 500, type: 'expense', category: 'Rent', date: '2026-09-15T00:00:00Z' }
            ];
            const insights = generateDashboardInsights(txs, refDate);
            assert.ok(insights.some((i) => i.id === 'no_current_activity'));
            assert.ok(insights.some((i) => i.id === 'record_current'));
            // Must mention September activity
            const msg = insights[0].message;
            assert.ok(msg.includes('September 2026'));
        });

        it('returns concise observations for current_month_only without broken MoM claims', () => {
            const txs = [
                { amount: 2000, type: 'income', category: 'Salary', date: '2026-10-01T00:00:00Z' },
                { amount: 400, type: 'expense', category: 'Food & Dining', date: '2026-10-15T00:00:00Z' }
            ];
            const insights = generateDashboardInsights(txs, refDate);
            assert.ok(insights.some((i) => i.id === 'current_cash_flow'));
            assert.ok(insights.some((i) => i.id === 'top_category'));
            assert.ok(insights.some((i) => i.id === 'history_notice'));
        });

        it('generates pacing and cash flow insights when both months have data', () => {
            const txs = [
                { amount: 3000, type: 'income', category: 'Salary', date: '2026-09-01T00:00:00Z' },
                { amount: 1000, type: 'expense', category: 'Housing', date: '2026-09-05T00:00:00Z' },
                { amount: 3000, type: 'income', category: 'Salary', date: '2026-10-01T00:00:00Z' },
                { amount: 700, type: 'expense', category: 'Housing', date: '2026-10-05T00:00:00Z' }
            ];
            const insights = generateDashboardInsights(txs, refDate);
            assert.ok(insights.some((i) => i.id === 'spending_pace'));
            assert.ok(insights.some((i) => i.id === 'cash_flow_health'));
            assert.ok(insights.some((i) => i.id === 'category_shift'));
        });
    });
});
