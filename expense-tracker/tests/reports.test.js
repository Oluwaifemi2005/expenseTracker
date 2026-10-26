import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateSavingsRate,
    getDateRangeBounds,
    filterTransactionsByDateRange,
    generateMonthlyReportSeries,
    sanitizeCSVField,
    generateTransactionsCSV
} from '../src/utils/finance.js';

describe('Financial Reports Pure Utilities & Calculations', () => {
    describe('1. calculateSavingsRate', () => {
        it('calculates savings rate percentage accurately', () => {
            // ((1000 - 400) / 1000) * 100 = 60%
            const rate = calculateSavingsRate(1000, 400);
            assert.equal(rate, 60);
        });

        it('supports negative savings rate when expenses exceed income', () => {
            // ((500 - 750) / 500) * 100 = -50%
            const rate = calculateSavingsRate(500, 750);
            assert.equal(rate, -50);
        });

        it('strictly returns null (N/A) when total income is zero, avoiding NaN or division-by-zero', () => {
            assert.equal(calculateSavingsRate(0, 500), null);
            assert.equal(calculateSavingsRate(0, 0), null);
            assert.equal(calculateSavingsRate(-100, 200), null);
            assert.equal(calculateSavingsRate(null, 200), null);
        });
    });

    describe('2. getDateRangeBounds', () => {
        const refDate = new Date('2026-10-26T12:00:00.000Z');

        it('calculates this-month bounds from 1st day 00:00:00 to last day 23:59:59.999', () => {
            const { startDate, endDate, isValid } = getDateRangeBounds('this-month', '', '', refDate);
            assert.equal(isValid, true);
            assert.equal(startDate.getFullYear(), 2026);
            assert.equal(startDate.getMonth(), 9); // October
            assert.equal(startDate.getDate(), 1);
            assert.equal(startDate.getHours(), 0);

            assert.equal(endDate.getFullYear(), 2026);
            assert.equal(endDate.getMonth(), 9); // October
            assert.equal(endDate.getDate(), 31);
            assert.equal(endDate.getHours(), 23);
            assert.equal(endDate.getMinutes(), 59);
        });

        it('calculates last-month bounds for the full preceding calendar month', () => {
            const { startDate, endDate, isValid } = getDateRangeBounds('last-month', '', '', refDate);
            assert.equal(isValid, true);
            assert.equal(startDate.getFullYear(), 2026);
            assert.equal(startDate.getMonth(), 8); // September
            assert.equal(startDate.getDate(), 1);

            assert.equal(endDate.getFullYear(), 2026);
            assert.equal(endDate.getMonth(), 8); // September
            assert.equal(endDate.getDate(), 30);
        });

        it('includes current month and preceding 2 calendar months for last-3-months (August - October 2026)', () => {
            const { startDate, endDate, isValid } = getDateRangeBounds('last-3-months', '', '', refDate);
            assert.equal(isValid, true);
            assert.equal(startDate.getFullYear(), 2026);
            assert.equal(startDate.getMonth(), 7); // August (preceding 2 months)
            assert.equal(startDate.getDate(), 1);

            assert.equal(endDate.getFullYear(), 2026);
            assert.equal(endDate.getMonth(), 9); // October (current month)
            assert.equal(endDate.getDate(), 31);
        });

        it('includes current month and preceding 5 calendar months for last-6-months (May - October 2026)', () => {
            const { startDate, endDate, isValid } = getDateRangeBounds('last-6-months', '', '', refDate);
            assert.equal(isValid, true);
            assert.equal(startDate.getFullYear(), 2026);
            assert.equal(startDate.getMonth(), 4); // May (preceding 5 months)
            assert.equal(startDate.getDate(), 1);

            assert.equal(endDate.getFullYear(), 2026);
            assert.equal(endDate.getMonth(), 9); // October (current month)
            assert.equal(endDate.getDate(), 31);
        });

        it('sets custom date ranges to include the entire selected end date up to 23:59:59.999', () => {
            const { startDate, endDate, isValid } = getDateRangeBounds('custom', '2026-06-10', '2026-06-25');
            assert.equal(isValid, true);
            assert.equal(startDate.getDate(), 10);
            assert.equal(startDate.getHours(), 0);
            assert.equal(endDate.getDate(), 25);
            assert.equal(endDate.getHours(), 23);
            assert.equal(endDate.getMinutes(), 59);
            assert.equal(endDate.getSeconds(), 59);
        });

        it('clearly rejects inverted custom date ranges where start > end', () => {
            const { isValid, errorMessage } = getDateRangeBounds('custom', '2026-08-20', '2026-08-10');
            assert.equal(isValid, false);
            assert.match(errorMessage, /cannot be after/i);
        });
    });

    describe('3. filterTransactionsByDateRange', () => {
        const txs = [
            { id: 1, description: 'Past', amount: 50, date: '2026-05-01T12:00:00.000Z' },
            { id: 2, description: 'Start Boundary', amount: 100, date: '2026-06-01T00:00:00.000Z' },
            { id: 3, description: 'In Range', amount: 150, date: '2026-06-15T10:00:00.000Z' },
            { id: 4, description: 'End Boundary', amount: 200, date: '2026-06-30T23:59:59.000Z' },
            { id: 5, description: 'Future', amount: 300, date: '2026-07-01T00:00:00.000Z' }
        ];

        const start = new Date('2026-06-01T00:00:00.000Z');
        const end = new Date('2026-06-30T23:59:59.999Z');

        it('includes records on and between boundaries and excludes outside records', () => {
            const filtered = filterTransactionsByDateRange(txs, start, end);
            assert.equal(filtered.length, 3);
            assert.deepEqual(filtered.map(t => t.id), [2, 3, 4]);
        });

        it('returns empty array on empty input or invalid range', () => {
            assert.deepEqual(filterTransactionsByDateRange([], start, end), []);
            assert.deepEqual(filterTransactionsByDateRange(null, start, end), []);
        });
    });

    describe('4. generateMonthlyReportSeries', () => {
        it('builds chronological series across multi-month spans including empty months', () => {
            const bounds = getDateRangeBounds('last-3-months', '', '', new Date(2026, 9, 26));
            const start = bounds.startDate;
            const end = bounds.endDate;

            const txs = [
                { type: 'income', amount: 2000, date: '2026-08-05' },
                { type: 'expense', amount: 500, date: '2026-08-10' },
                // September has 0 transactions
                { type: 'income', amount: 1500, date: '2026-10-15' },
                { type: 'expense', amount: 1200, date: '2026-10-20' }
            ];

            const { series, maxMonthlyValue } = generateMonthlyReportSeries(txs, start, end);

            assert.equal(series.length, 3); // August, September, October
            assert.equal(series[0].shortName, 'Aug');
            assert.equal(series[0].income, 2000);
            assert.equal(series[0].expense, 500);
            assert.equal(series[0].balance, 1500);
            assert.equal(series[0].savingsRate, 75);

            assert.equal(series[1].shortName, 'Sep');
            assert.equal(series[1].income, 0);
            assert.equal(series[1].expense, 0);
            assert.equal(series[1].balance, 0);
            assert.equal(series[1].savingsRate, null); // 0 income -> N/A

            assert.equal(series[2].shortName, 'Oct');
            assert.equal(series[2].income, 1500);
            assert.equal(series[2].expense, 1200);
            assert.equal(series[2].balance, 300);
            assert.equal(series[2].savingsRate, 20);

            assert.ok(maxMonthlyValue >= 2000);
        });
    });

    describe('5. CSV Export & Spreadsheet Formula Injection Defense', () => {
        it('neutralizes formula injection characters (=, +, -, @, tab, return) with single quote prefix', () => {
            assert.equal(sanitizeCSVField('=SUM(A1:A10)'), "'=SUM(A1:A10)");
            assert.equal(sanitizeCSVField('+cmd|/C'), "'+cmd|/C");
            assert.equal(sanitizeCSVField('-10+20'), "'-10+20");
            assert.equal(sanitizeCSVField('@malicious'), "'@malicious");
            assert.equal(sanitizeCSVField('\tmalicious'), "'\tmalicious");
        });

        it('escapes quotes and wraps values containing commas or newlines', () => {
            assert.equal(sanitizeCSVField('Groceries, Supermarket'), '"Groceries, Supermarket"');
            assert.equal(sanitizeCSVField('He said "Hello"'), '"He said ""Hello"""');
            assert.equal(sanitizeCSVField('Line 1\nLine 2'), '"Line 1\nLine 2"');
        });

        it('generates fully compliant CSV with headers and sanitized values', () => {
            const sampleTxs = [
                {
                    date: '2026-10-15T00:00:00.000Z',
                    description: '=1+1 Dangerous',
                    type: 'expense',
                    category: 'Food & Dining',
                    amount: 45.50
                },
                {
                    date: '2026-10-16T00:00:00.000Z',
                    description: 'Salary, Tech Corp',
                    type: 'income',
                    category: 'Salary',
                    amount: 3000
                }
            ];

            const csv = generateTransactionsCSV(sampleTxs, 'NGN');
            const lines = csv.split('\r\n');

            assert.equal(lines[0], 'Date,Description,Type,Category,Amount (NGN)');
            assert.ok(lines[1].includes("'=1+1 Dangerous"));
            assert.ok(lines[2].includes('"Salary, Tech Corp"'));
        });
    });
});
