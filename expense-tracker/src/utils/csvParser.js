import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories.js';

export const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_CSV_ROWS = 1000;

export const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

export const ALL_VALID_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

/**
 * Safely unescapes spreadsheet formula injection single-quote prefix.
 * Strictly adheres to rule: only remove leading single quote if the character
 * immediately following it is a formula trigger (=, +, -, @, \t, \r).
 * Legitimate descriptions like "'Quote'" or "'Hello world'" remain untouched.
 * 
 * @param {string} text
 * @returns {string}
 */
export const unescapeFormulaPrefix = (text) => {
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
 * @returns {Array<Array<string>>}
 */
export const parseRFC4180 = (csvText) => {
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
                    currentCell += '"';
                    i += 2;
                    continue;
                } else {
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
                    i++;
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

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

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
 * Maps headers to known transaction attributes.
 * 
 * @param {Array<string>} rawHeaders
 * @returns {{ dateIdx: number, descIdx: number, typeIdx: number, categoryIdx: number, amountIdx: number, missing: Array<string> }}
 */
export const mapHeaders = (rawHeaders) => {
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
