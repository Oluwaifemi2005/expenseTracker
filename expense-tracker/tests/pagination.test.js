import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePagination } from '../src/utils/finance.js';

describe('Pagination Utilities & Logic (calculatePagination)', () => {
    const mockItems = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

    it('calculates page 1 of 3 correctly for 25 items with default page size 10', () => {
        const result = calculatePagination(mockItems, 1, 10);
        assert.equal(result.currentPage, 1);
        assert.equal(result.totalPages, 3);
        assert.equal(result.totalItems, 25);
        assert.equal(result.startIndex, 0);
        assert.equal(result.endIndex, 10);
        assert.equal(result.paginatedItems.length, 10);
        assert.equal(result.paginatedItems[0].id, 1);
        assert.equal(result.paginatedItems[9].id, 10);
        assert.equal(result.hasPrevPage, false);
        assert.equal(result.hasNextPage, true);
    });

    it('calculates middle page (page 2) correctly', () => {
        const result = calculatePagination(mockItems, 2, 10);
        assert.equal(result.currentPage, 2);
        assert.equal(result.totalPages, 3);
        assert.equal(result.startIndex, 10);
        assert.equal(result.endIndex, 20);
        assert.equal(result.paginatedItems.length, 10);
        assert.equal(result.paginatedItems[0].id, 11);
        assert.equal(result.paginatedItems[9].id, 20);
        assert.equal(result.hasPrevPage, true);
        assert.equal(result.hasNextPage, true);
    });

    it('calculates final page (page 3) with remaining 5 items correctly', () => {
        const result = calculatePagination(mockItems, 3, 10);
        assert.equal(result.currentPage, 3);
        assert.equal(result.totalPages, 3);
        assert.equal(result.startIndex, 20);
        assert.equal(result.endIndex, 25);
        assert.equal(result.paginatedItems.length, 5);
        assert.equal(result.paginatedItems[0].id, 21);
        assert.equal(result.paginatedItems[4].id, 25);
        assert.equal(result.hasPrevPage, true);
        assert.equal(result.hasNextPage, false);
    });

    it('safely clamps requested page when it exceeds totalPages', () => {
        // e.g. User was on page 5, then a filter reduced items to 25 (max page 3)
        const result = calculatePagination(mockItems, 5, 10);
        assert.equal(result.currentPage, 3);
        assert.equal(result.totalPages, 3);
        assert.equal(result.paginatedItems.length, 5);
        assert.equal(result.hasNextPage, false);
        assert.equal(result.hasPrevPage, true);
    });

    it('safely clamps requested page when it is 0 or negative', () => {
        const resultZero = calculatePagination(mockItems, 0, 10);
        assert.equal(resultZero.currentPage, 1);
        assert.equal(resultZero.hasPrevPage, false);

        const resultNeg = calculatePagination(mockItems, -3, 10);
        assert.equal(resultNeg.currentPage, 1);
        assert.equal(resultNeg.hasPrevPage, false);
    });

    it('handles empty item list gracefully without NaN or negative indices', () => {
        const result = calculatePagination([], 1, 10);
        assert.equal(result.currentPage, 1);
        assert.equal(result.totalPages, 1);
        assert.equal(result.totalItems, 0);
        assert.equal(result.startIndex, 0);
        assert.equal(result.endIndex, 0);
        assert.deepEqual(result.paginatedItems, []);
        assert.equal(result.hasPrevPage, false);
        assert.equal(result.hasNextPage, false);
    });

    it('handles non-array or null input gracefully', () => {
        const resultNull = calculatePagination(null, 1, 10);
        assert.equal(resultNull.totalItems, 0);
        assert.equal(resultNull.totalPages, 1);
        assert.deepEqual(resultNull.paginatedItems, []);
    });

    it('supports custom page size and handles invalid page size safely', () => {
        const result5 = calculatePagination(mockItems, 1, 5);
        assert.equal(result5.totalPages, 5);
        assert.equal(result5.paginatedItems.length, 5);

        const resultInvalid = calculatePagination(mockItems, 1, 'invalid');
        assert.equal(resultInvalid.totalPages, 3); // Defaults to 10
        assert.equal(resultInvalid.paginatedItems.length, 10);
    });

    it('handles exact boundary where items equals pageSize exactly', () => {
        const exactItems = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
        const result = calculatePagination(exactItems, 1, 10);
        assert.equal(result.totalPages, 1);
        assert.equal(result.totalItems, 10);
        assert.equal(result.hasPrevPage, false);
        assert.equal(result.hasNextPage, false);
    });
});
