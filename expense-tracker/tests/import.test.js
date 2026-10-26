import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    parseRFC4180,
    unescapeFormulaPrefix,
    mapHeaders
} from '../src/utils/csvParser.js';

describe('Frontend CSV Parser & Header Mapping Unit Tests', () => {
    describe('1. Formula Injection Unescaping', () => {
        it('unescapes formula triggers (=, +, -, @, \\t, \\r) when preceded by a single quote', () => {
            assert.equal(unescapeFormulaPrefix("=SUM(A1:A10)"), "=SUM(A1:A10)");
            assert.equal(unescapeFormulaPrefix("'=SUM(A1:A10)"), "=SUM(A1:A10)");
            assert.equal(unescapeFormulaPrefix("'+cmd|/C"), "+cmd|/C");
            assert.equal(unescapeFormulaPrefix("'-10+20"), "-10+20");
            assert.equal(unescapeFormulaPrefix("'@malicious"), "@malicious");
            assert.equal(unescapeFormulaPrefix("'\tmalicious"), "\tmalicious");
        });

        it('preserves legitimate descriptions that start with a single quote', () => {
            assert.equal(unescapeFormulaPrefix("'Special Deal'"), "'Special Deal'");
            assert.equal(unescapeFormulaPrefix("'Quote of the day"), "'Quote of the day");
            assert.equal(unescapeFormulaPrefix("'Standard entry'"), "'Standard entry'");
        });
    });

    describe('2. RFC 4180 Parsing', () => {
        it('parses fields with commas inside double quotes and escaped double quotes', () => {
            const csv = 'Date,Description,Amount\n2026-10-15,"Grocery, Market",45.50\n2026-10-16,"Said ""Hello""",20.00';
            const parsed = parseRFC4180(csv);
            assert.equal(parsed.length, 3);
            assert.equal(parsed[1][1], 'Grocery, Market');
            assert.equal(parsed[2][1], 'Said "Hello"');
        });

        it('handles CRLF line endings cleanly', () => {
            const csv = 'Date,Description,Amount\r\n2026-10-15,Item 1,10.00\r\n2026-10-16,Item 2,20.00\r\n';
            const parsed = parseRFC4180(csv);
            assert.equal(parsed.length, 3);
            assert.equal(parsed[1][1], 'Item 1');
            assert.equal(parsed[2][1], 'Item 2');
        });

        it('throws an error when an unclosed quote is encountered', () => {
            const badCsv = 'Date,Description,Amount\n2026-10-15,"Unclosed string,50.00';
            assert.throws(() => parseRFC4180(badCsv), /Malformed CSV: Unclosed quote detected/);
        });
    });

    describe('3. Header Mapping', () => {
        it('correctly maps Vaultex Reports export headers including currency annotation', () => {
            const headers = ['Date', 'Description', 'Type', 'Category', 'Amount (USD)'];
            const mapped = mapHeaders(headers);
            assert.equal(mapped.dateIdx, 0);
            assert.equal(mapped.descIdx, 1);
            assert.equal(mapped.typeIdx, 2);
            assert.equal(mapped.categoryIdx, 3);
            assert.equal(mapped.amountIdx, 4);
            assert.equal(mapped.missing.length, 0);
        });

        it('identifies missing required columns', () => {
            const headers = ['Category', 'Type'];
            const mapped = mapHeaders(headers);
            assert.ok(mapped.missing.includes('Date'));
            assert.ok(mapped.missing.includes('Description'));
            assert.ok(mapped.missing.includes('Amount'));
        });
    });
});
