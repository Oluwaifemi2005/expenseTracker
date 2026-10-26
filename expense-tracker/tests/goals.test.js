import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateGoalProgress,
    calculateGoalsSummary
} from '../src/utils/finance.js';

describe('Savings Goals Calculation & Progress Tracking', () => {
    describe('calculateGoalProgress', () => {
        it('calculates progress correctly for an in-progress goal', () => {
            const goal = {
                name: 'Emergency Fund',
                targetAmount: 100000,
                currentAmount: 45000
            };

            const result = calculateGoalProgress(goal);

            assert.equal(result.target, 100000);
            assert.equal(result.saved, 45000);
            assert.equal(result.remaining, 55000);
            assert.equal(result.percentage, 45);
            assert.equal(result.isCompleted, false);
            assert.equal(result.progressWidth, 45);
        });

        it('marks goal as completed when target is exactly met', () => {
            const goal = {
                name: 'Laptop',
                targetAmount: 500000,
                currentAmount: 500000
            };

            const result = calculateGoalProgress(goal);

            assert.equal(result.target, 500000);
            assert.equal(result.saved, 500000);
            assert.equal(result.remaining, 0);
            assert.equal(result.percentage, 100);
            assert.equal(result.isCompleted, true);
            assert.equal(result.progressWidth, 100);
        });

        it('strictly caps percentage at 100% and sets remaining to 0 when overfunded, while preserving actual saved amount', () => {
            const goal = {
                name: 'Vacation',
                targetAmount: 200000,
                currentAmount: 250000 // Overfunded by 50,000
            };

            const result = calculateGoalProgress(goal);

            // Progress must never exceed 100%
            assert.equal(result.percentage, 100);
            assert.equal(result.progressWidth, 100);
            // Remaining amount must be strictly 0, not negative
            assert.equal(result.remaining, 0);
            // Actual saved amount must be preserved
            assert.equal(result.saved, 250000);
            assert.equal(result.target, 200000);
            assert.equal(result.isCompleted, true);
        });

        it('handles zero saved amount correctly', () => {
            const goal = {
                name: 'Car Downpayment',
                targetAmount: 1000000,
                currentAmount: 0
            };

            const result = calculateGoalProgress(goal);

            assert.equal(result.saved, 0);
            assert.equal(result.remaining, 1000000);
            assert.equal(result.percentage, 0);
            assert.equal(result.isCompleted, false);
            assert.equal(result.progressWidth, 0);
        });

        it('handles zero target edge case safely', () => {
            const goal = {
                targetAmount: 0,
                currentAmount: 5000
            };

            const result = calculateGoalProgress(goal);

            assert.equal(result.percentage, 0);
            assert.equal(result.isCompleted, false);
            assert.equal(result.remaining, 0);
        });
    });

    describe('calculateGoalsSummary', () => {
        it('aggregates totals across mixed goals accurately and calculates completed count', () => {
            const goals = [
                { targetAmount: 100000, currentAmount: 100000 }, // Completed
                { targetAmount: 200000, currentAmount: 250000 }, // Overfunded (Completed)
                { targetAmount: 300000, currentAmount: 150000 }  // In progress
            ];

            const summary = calculateGoalsSummary(goals);

            assert.equal(summary.totalTarget, 600000);
            assert.equal(summary.totalSaved, 500000);
            assert.equal(summary.totalRemaining, 100000);
            assert.equal(summary.overallPercentage, 83.3);
            assert.equal(summary.completedCount, 2);
            assert.equal(summary.inProgressCount, 1);
            assert.equal(summary.goalCount, 3);
        });

        it('returns safe zero defaults on empty goals array', () => {
            const summary = calculateGoalsSummary([]);

            assert.equal(summary.totalTarget, 0);
            assert.equal(summary.totalSaved, 0);
            assert.equal(summary.totalRemaining, 0);
            assert.equal(summary.overallPercentage, 0);
            assert.equal(summary.completedCount, 0);
            assert.equal(summary.inProgressCount, 0);
            assert.equal(summary.goalCount, 0);
        });
    });
});
