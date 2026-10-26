import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeToMonthly,
    calculateRecurringSummary,
    getOccurrenceStatusInfo
} from '../src/utils/finance.js';

describe('Recurring Transactions Frontend Utilities & Calculations', () => {
    describe('normalizeToMonthly', () => {
        it('normalizes monthly cadence directly', () => {
            assert.equal(normalizeToMonthly(150, 'monthly'), 150);
        });

        it('normalizes weekly cadence to monthly equivalent (* 52 / 12)', () => {
            // 120 * 52 / 12 = 520
            assert.equal(normalizeToMonthly(120, 'weekly'), 520);
        });

        it('normalizes yearly cadence to monthly equivalent (/ 12)', () => {
            // 1200 / 12 = 100
            assert.equal(normalizeToMonthly(1200, 'yearly'), 100);
        });

        it('safely handles non-numeric or negative inputs', () => {
            assert.equal(normalizeToMonthly(-50, 'monthly'), 0);
            assert.equal(normalizeToMonthly(null, 'monthly'), 0);
            assert.equal(normalizeToMonthly('invalid', 'weekly'), 0);
        });
    });

    describe('calculateRecurringSummary', () => {
        it('aggregates active recurring rules, separates expenses from income, and counts due rules', () => {
            const refDate = new Date('2026-10-26T12:00:00.000Z');
            const rules = [
                {
                    name: 'Salary',
                    amount: 6000,
                    type: 'income',
                    frequency: 'monthly',
                    status: 'active',
                    nextOccurrence: '2026-11-01T00:00:00.000Z'
                },
                {
                    name: 'Rent',
                    amount: 1500,
                    type: 'expense',
                    frequency: 'monthly',
                    status: 'active',
                    nextOccurrence: '2026-10-20T00:00:00.000Z' // Past refDate -> Due!
                },
                {
                    name: 'Gym',
                    amount: 50,
                    type: 'expense',
                    frequency: 'monthly',
                    status: 'paused',
                    nextOccurrence: '2026-10-22T00:00:00.000Z' // Paused, so not active or due
                },
                {
                    name: 'Old Contract',
                    amount: 300,
                    type: 'income',
                    frequency: 'monthly',
                    status: 'ended',
                    nextOccurrence: '2026-10-01T00:00:00.000Z' // Ended, not active or due
                }
            ];

            const summary = calculateRecurringSummary(rules, refDate);

            assert.equal(summary.totalRules, 4);
            assert.equal(summary.activeCount, 2);
            assert.equal(summary.pausedCount, 1);
            assert.equal(summary.endedCount, 1);
            assert.equal(summary.monthlyProjectedIncome, 6000);
            assert.equal(summary.monthlyProjectedExpense, 1500);
            assert.equal(summary.netMonthlyProjected, 4500);
            assert.equal(summary.dueCount, 1); // Only Rent is active & past refDate
        });

        it('returns zero defaults on empty or invalid rules list', () => {
            const summary = calculateRecurringSummary(null);
            assert.equal(summary.totalRules, 0);
            assert.equal(summary.activeCount, 0);
            assert.equal(summary.monthlyProjectedExpense, 0);
            assert.equal(summary.monthlyProjectedIncome, 0);
            assert.equal(summary.dueCount, 0);
        });
    });

    describe('getOccurrenceStatusInfo', () => {
        const today = new Date('2026-10-26T10:00:00.000Z');

        it('returns Ended badge for ended rules', () => {
            const info = getOccurrenceStatusInfo('2026-10-01', 'ended', today);
            assert.equal(info.label, 'Ended');
            assert.equal(info.isDue, false);
            assert.equal(info.tone, 'neutral');
        });

        it('returns Paused badge for paused rules', () => {
            const info = getOccurrenceStatusInfo('2026-10-01', 'paused', today);
            assert.equal(info.label, 'Paused');
            assert.equal(info.isDue, false);
            assert.equal(info.tone, 'warning');
        });

        it('returns Due Today when occurrence is on the reference date', () => {
            const info = getOccurrenceStatusInfo('2026-10-26T00:00:00.000Z', 'active', today);
            assert.equal(info.label, 'Due Today');
            assert.equal(info.isDue, true);
            assert.equal(info.tone, 'warning');
        });

        it('returns Overdue with danger tone for past occurrences', () => {
            const info = getOccurrenceStatusInfo('2026-10-24T00:00:00.000Z', 'active', today);
            assert.match(info.label, /Overdue/);
            assert.equal(info.isDue, true);
            assert.equal(info.tone, 'danger');
        });

        it('returns upcoming day count for future occurrences', () => {
            const info = getOccurrenceStatusInfo('2026-10-30T00:00:00.000Z', 'active', today);
            assert.match(info.label, /In 4 days/);
            assert.equal(info.isDue, false);
            assert.equal(info.tone, 'neutral');
        });
    });
});
