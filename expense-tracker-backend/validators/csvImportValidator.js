const { z } = require('zod');
const { VALID_CATEGORIES, VALID_TYPES } = require('./transactionValidator');

const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_CSV_ROWS = 1000;

const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Safely unescapes spreadsheet formula injection single-quote prefix.
 * Strictly adheres to rule: only remove leading single quote if the character
 * immediately following it is a formula trigger (=, +, -, @, \t, \r).
 * Legitimate descriptions like "'Quote'" or "'Hello world'" remain untouched.
 * 
 * @param {string} text
 * @returns {string}
 */
const unescapeFormulaPrefix = (text) => {
    if (typeof text !== 'string') return '';
    if (text.length >= 2 && text[0] === "'" && FORMULA_TRIGGERS.includes(text[1])) {
        return text.slice(1);
    }
    return text;
};

/**
 * Parses raw CSV text according to RFC 4180 specification.
 * Handles CRLF, LF, CR, quoted fields, embedded commas, and escaped quotes ("").
 * 
 * @param {string} csvText
 * @returns {Array<Array<string>>} 2D array of rows and column cell strings
 * @throws {Error} if CSV is malformed (e.g. unclosed quote)
 */
const parseRFC4180 = (csvText) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    let i = 0;
    const len = csvText.length;

    while (i < len) {
        const char = csvText[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < len && csvText[i + 1] === '"') {
                    // Escaped quote: "" -> "
                    currentCell += '"';
                    i += 2;
                    continue;
                } else {
                    // Closing quote
                    inQuotes = false;
                    i++;
                    continue;
                }
            } else {
                currentCell += char;
                i++;
                continue;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                i++;
                continue;
            } else if (char === ',') {
                currentRow.push(currentCell);
                currentCell = '';
                i++;
                continue;
            } else if (char === '\r') {
                if (i + 1 < len && csvText[i + 1] === '\n') {
                    i++; // Skip \n in \r\n
                }
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
                i++;
                continue;
            } else if (char === '\n') {
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
                i++;
                continue;
            } else {
                currentCell += char;
                i++;
                continue;
            }
        }
    }

    if (inQuotes) {
        throw new Error('Malformed CSV: Unclosed quote detected.');
    }

    // Push the final cell and row if not empty
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    // Filter out trailing empty rows
    while (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const isBlank = lastRow.every(c => !c || c.trim() === '');
        if (isBlank) {
            rows.pop();
        } else {
            break;
        }
    }

    return rows;
};

/**
 * Normalizes and maps CSV column headers to known transaction fields.
 * Recognizes Vaultex Reports export headers and standard CSV variations.
 * 
 * @param {Array<string>} rawHeaders
 * @returns {{
 *   dateIdx: number,
 *   descIdx: number,
 *   typeIdx: number,
 *   categoryIdx: number,
 *   amountIdx: number,
 *   missing: Array<string>
 * }}
 */
const mapHeaders = (rawHeaders) => {
    let dateIdx = -1;
    let descIdx = -1;
    let typeIdx = -1;
    let categoryIdx = -1;
    let amountIdx = -1;

    for (let i = 0; i < rawHeaders.length; i++) {
        const h = (rawHeaders[i] || '').trim().toLowerCase().replace(/^["']|["']$/g, '');

        if (dateIdx === -1 && (h === 'date' || h === 'transaction date' || h.startsWith('date'))) {
            dateIdx = i;
        } else if (descIdx === -1 && (h === 'description' || h === 'desc' || h === 'title' || h === 'details' || h === 'name')) {
            descIdx = i;
        } else if (typeIdx === -1 && (h === 'type' || h === 'transaction type')) {
            typeIdx = i;
        } else if (categoryIdx === -1 && (h === 'category' || h === 'cat')) {
            categoryIdx = i;
        } else if (amountIdx === -1 && (h === 'amount' || h.startsWith('amount') || h === 'value')) {
            amountIdx = i;
        }
    }

    const missing = [];
    if (dateIdx === -1) missing.push('Date');
    if (descIdx === -1) missing.push('Description');
    if (amountIdx === -1) missing.push('Amount');

    return {
        dateIdx,
        descIdx,
        typeIdx,
        categoryIdx,
        amountIdx,
        missing
    };
};

/**
 * Sanitizes numeric amount string by removing currency symbols and thousand commas.
 * Handles inputs like "$1,250.50", "₦5,000", "-50.00", etc.
 * 
 * @param {string} rawAmount
 * @returns {number}
 */
const parseAmount = (rawAmount) => {
    if (typeof rawAmount !== 'string') {
        const n = Number(rawAmount);
        return Number.isFinite(n) ? n : NaN;
    }
    // Remove currency symbols and comma separators
    const cleaned = rawAmount.replace(/[$₦€£¥,\s]/g, '');
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : NaN;
};

/**
 * Parses and validates raw date string.
 * Supports ISO (YYYY-MM-DD), YYYY/MM/DD, MM/DD/YYYY, DD/MM/YYYY etc.
 * 
 * @param {string} rawDate
 * @returns {Date|null}
 */
const parseDate = (rawDate) => {
    if (!rawDate || typeof rawDate !== 'string') return null;
    const str = rawDate.trim();
    if (!str) return null;

    // Check ISO / standard format YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]) - 1;
        const day = Number(isoMatch[3]);
        const d = new Date(year, month, day, 12, 0, 0);
        if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
            return d;
        }
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        const yr = parsed.getFullYear();
        if (yr >= 1970 && yr <= 2100) {
            return parsed;
        }
    }

    return null;
};

/**
 * Parses and validates an entire CSV upload against business rules and user transactions.
 * Enforces size limits, row limits, RFC 4180 parsing, Zod validation,
 * in-file duplicate detection, and existing transaction match detection.
 * 
 * @param {string} csvContent
 * @param {Array<Object>} existingUserTransactions - Transactions of the authenticated user
 * @returns {{
 *   canImport: boolean,
 *   summary: {
 *     totalRows: number,
 *     validCount: number,
 *     invalidCount: number,
 *     duplicateFileCount: number,
 *     duplicateExistingCount: number
 *   },
 *   rows: Array<{
 *     rowNumber: number,
 *     raw: Object,
 *     parsed: {
 *       date: Date,
 *       dateStr: string,
 *       description: string,
 *       type: 'expense'|'income',
 *       category: string,
 *       amount: number
 *     }|null,
 *     status: 'valid'|'invalid'|'duplicate_file'|'duplicate_existing',
 *     matchReason?: string,
 *     errors: Array<string>
 *   }>
 * }}
 */
const parseAndValidateCSV = (csvContent, existingUserTransactions = []) => {
    if (typeof csvContent !== 'string' || !csvContent.trim()) {
        const err = new Error('Uploaded CSV file is empty.');
        err.statusCode = 400;
        throw err;
    }

    const byteLength = Buffer.byteLength(csvContent, 'utf8');
    if (byteLength > MAX_CSV_SIZE_BYTES) {
        const err = new Error('File size exceeds maximum allowed limit of 2 MB.');
        err.statusCode = 400;
        throw err;
    }

    const parsedGrid = parseRFC4180(csvContent);
    if (parsedGrid.length < 2) {
        const err = new Error('CSV must contain a header row and at least one data row.');
        err.statusCode = 400;
        throw err;
    }

    const headerRow = parsedGrid[0];
    const dataRows = parsedGrid.slice(1);

    if (dataRows.length > MAX_CSV_ROWS) {
        const err = new Error(`Uploaded CSV exceeds maximum limit of 1,000 transaction rows (found ${dataRows.length}).`);
        err.statusCode = 400;
        throw err;
    }

    const headerMap = mapHeaders(headerRow);
    if (headerMap.missing.length > 0) {
        const err = new Error(`CSV is missing required column(s): ${headerMap.missing.join(', ')}. Expected: Date, Description, Amount.`);
        err.statusCode = 400;
        throw err;
    }

    // Build index of existing transactions for duplicate detection
    // Key: YYYY-MM-DD|description_lower|type|category|amount.toFixed(2)
    const existingMap = new Map();
    for (let i = 0; i < existingUserTransactions.length; i++) {
        const tx = existingUserTransactions[i];
        const rawDate = tx.date || tx.createdAt;
        if (!rawDate) continue;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) continue;

        const dateKey = d.toISOString().slice(0, 10);
        const descKey = (tx.description || '').trim().toLowerCase();
        const typeKey = (tx.type || 'expense').toLowerCase();
        const catKey = (tx.category || 'Other').trim();
        const amtKey = Number(tx.amount || 0).toFixed(2);
        const sig = `${dateKey}|${descKey}|${typeKey}|${catKey}|${amtKey}`;

        const count = existingMap.get(sig) || 0;
        existingMap.set(sig, count + 1);
    }

    const inFileSeen = new Map();
    const rows = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateFileCount = 0;
    let duplicateExistingCount = 0;

    for (let idx = 0; idx < dataRows.length; idx++) {
        const rowNumber = idx + 2; // 1-indexed, accounting for header
        const row = dataRows[idx];

        // Skip completely blank rows within the file
        if (row.every(c => !c || c.trim() === '')) {
            continue;
        }

        const rawDate = (row[headerMap.dateIdx] || '').trim();
        const rawDesc = row[headerMap.descIdx] !== undefined ? row[headerMap.descIdx] : '';
        const rawType = headerMap.typeIdx !== -1 ? (row[headerMap.typeIdx] || '').trim().toLowerCase() : '';
        const rawCat = headerMap.categoryIdx !== -1 ? (row[headerMap.categoryIdx] || '').trim() : '';
        const rawAmt = headerMap.amountIdx !== -1 ? (row[headerMap.amountIdx] || '').trim() : '';

        const rowErrors = [];

        // 1. Description validation & formula injection unescaping
        let desc = unescapeFormulaPrefix(rawDesc.trim());
        if (!desc || desc.length === 0) {
            rowErrors.push('Please provide a valid, non-empty description.');
        } else if (desc.length > 200) {
            rowErrors.push('Description cannot exceed 200 characters.');
        }

        // 2. Amount validation
        const amountNum = parseAmount(rawAmt);
        if (!Number.isFinite(amountNum) || isNaN(amountNum)) {
            rowErrors.push('Amount must be a valid positive number.');
        } else if (amountNum <= 0) {
            rowErrors.push('Amount must be a positive number greater than 0.');
        }

        // 3. Type validation
        let type = rawType;
        if (!type) {
            type = 'expense'; // Default to expense if missing
        } else if (!VALID_TYPES.includes(type)) {
            rowErrors.push("Transaction type must be 'income' or 'expense'.");
        }

        // 4. Category validation
        let category = rawCat;
        if (!category) {
            category = 'Other';
        } else if (!VALID_CATEGORIES.includes(category)) {
            // Case-insensitive match attempt
            const matched = VALID_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
            if (matched) {
                category = matched;
            } else {
                rowErrors.push(`Unsupported category "${category}". Must be a valid Vaultex category.`);
            }
        }

        // 5. Date validation
        const dateObj = parseDate(rawDate);
        if (!dateObj) {
            rowErrors.push(`Invalid date format "${rawDate}". Expected valid date (e.g. YYYY-MM-DD).`);
        }

        const rawObj = {
            Date: rawDate,
            Description: rawDesc,
            Type: rawType,
            Category: rawCat,
            Amount: rawAmt
        };

        if (rowErrors.length > 0) {
            invalidCount++;
            rows.push({
                rowNumber,
                raw: rawObj,
                parsed: null,
                status: 'invalid',
                errors: rowErrors
            });
            continue;
        }

        // Row is structurally valid; check duplicates
        const dateStr = dateObj.toISOString().slice(0, 10);
        const descKey = desc.toLowerCase();
        const roundedAmount = Math.round((amountNum + Number.EPSILON) * 100) / 100;
        const sig = `${dateStr}|${descKey}|${type}|${category}|${roundedAmount.toFixed(2)}`;

        const parsedData = {
            date: dateObj,
            dateStr,
            description: desc,
            type,
            category,
            amount: roundedAmount
        };

        // Check in-file duplicate
        if (inFileSeen.has(sig)) {
            const firstOccurrence = inFileSeen.get(sig);
            duplicateFileCount++;
            rows.push({
                rowNumber,
                raw: rawObj,
                parsed: parsedData,
                status: 'duplicate_file',
                matchReason: `Matches identical transaction on row ${firstOccurrence} within this file.`,
                errors: []
            });
            continue;
        }
        inFileSeen.set(sig, rowNumber);

        // Check match with existing transactions in database
        const existingCount = existingMap.get(sig) || 0;
        if (existingCount > 0) {
            duplicateExistingCount++;
            rows.push({
                rowNumber,
                raw: rawObj,
                parsed: parsedData,
                status: 'duplicate_existing',
                matchReason: `Matches existing transaction already recorded in your history for ${dateStr}.`,
                errors: []
            });
            continue;
        }

        // Valid, non-duplicate row
        validCount++;
        rows.push({
            rowNumber,
            raw: rawObj,
            parsed: parsedData,
            status: 'valid',
            errors: []
        });
    }

    return {
        canImport: validCount > 0 || duplicateExistingCount > 0,
        summary: {
            totalRows: rows.length,
            validCount,
            invalidCount,
            duplicateFileCount,
            duplicateExistingCount
        },
        rows
    };
};

module.exports = {
    MAX_CSV_SIZE_BYTES,
    MAX_CSV_ROWS,
    unescapeFormulaPrefix,
    parseRFC4180,
    mapHeaders,
    parseAmount,
    parseDate,
    parseAndValidateCSV
};
