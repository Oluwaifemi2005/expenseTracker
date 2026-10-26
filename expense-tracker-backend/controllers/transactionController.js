const transactionModel = require('../models/Transaction');
const {
    createTransactionSchema,
    updateTransactionSchema,
    isValidObjectId,
    formatValidationError
} = require('../validators/transactionValidator');

/**
 * GET /api/transactions
 * Retrieve all transactions.
 */
const getTransactions = async (req, res, next) => {
    try {
        const data = await transactionModel.find({ user: req.user.id });
        return res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/transactions
 * Create a new transaction with validated payload bound to the authenticated user.
 */
const createTransaction = async (req, res, next) => {
    const validationResult = createTransactionSchema.safeParse(req.body);
    if (!validationResult.success) {
        const { message, errors } = formatValidationError(validationResult.error);
        return res.status(400).json({ message, errors });
    }

    try {
        const { description, amount, type, category } = validationResult.data;

        const newTransaction = await transactionModel.create({
            description,
            amount,
            type,
            category,
            user: req.user.id
        });

        return res.status(201).json(newTransaction);
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/transactions/:id
 * Update an existing transaction by ID with validated partial payload.
 * Scoped strictly to transactions owned by the authenticated user.
 */
const updateTransaction = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid transaction ID'
            });
        }

        const validationResult = updateTransactionSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const updateData = validationResult.data;

        const updatedTransaction = await transactionModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedTransaction) {
            return res.status(404).json({
                message: 'Transaction not found'
            });
        }

        return res.status(200).json(updatedTransaction);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/transactions/:id
 * Delete a transaction by ID.
 * Scoped strictly to transactions owned by the authenticated user.
 */
const deleteTransaction = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid transaction ID'
            });
        }
        const deletedTransaction = await transactionModel.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });
        if (deletedTransaction) {
            return res.status(200).json(deletedTransaction);
        }
        return res.status(404).json({ message: 'Transaction not found' });
    } catch (error) {
        next(error);
    }
};

const { parseAndValidateCSV } = require('../validators/csvImportValidator');

/**
 * POST /api/transactions/import-preview
 * Parses and validates an uploaded CSV file without writing to the database.
 * Reports valid rows, validation errors, in-file duplicates, and existing database matches.
 */
const previewImportTransactions = async (req, res, next) => {
    try {
        const { csvContent } = req.body || {};
        if (typeof csvContent !== 'string' || !csvContent.trim()) {
            return res.status(400).json({ message: 'Uploaded CSV file is empty.' });
        }

        const byteLength = Buffer.byteLength(csvContent, 'utf8');
        if (byteLength > 2 * 1024 * 1024) {
            return res.status(400).json({ message: 'File size exceeds maximum allowed limit of 2 MB.' });
        }

        const existingTransactions = await transactionModel.find({ user: req.user.id });
        const previewResult = parseAndValidateCSV(csvContent, existingTransactions);

        return res.status(200).json(previewResult);
    } catch (error) {
        if (error.statusCode === 400 || error.message.startsWith('Malformed CSV')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * POST /api/transactions/import
 * Re-validates the CSV server-side and imports transactions bound to the authenticated user.
 * Supports 'valid_only' and 'all_or_nothing' modes, with configurable duplicate skipping.
 */
const importTransactions = async (req, res, next) => {
    try {
        const {
            csvContent,
            importMode = 'valid_only',
            skipExistingDuplicates = true,
            skipInFileDuplicates = true
        } = req.body || {};

        if (typeof csvContent !== 'string' || !csvContent.trim()) {
            return res.status(400).json({ message: 'Uploaded CSV file is empty.' });
        }

        const byteLength = Buffer.byteLength(csvContent, 'utf8');
        if (byteLength > 2 * 1024 * 1024) {
            return res.status(400).json({ message: 'File size exceeds maximum allowed limit of 2 MB.' });
        }

        // Fetch user's existing transactions to verify duplicate matches
        const existingTransactions = await transactionModel.find({ user: req.user.id });
        const validation = parseAndValidateCSV(csvContent, existingTransactions);

        // In all_or_nothing mode, reject immediately if any row failed validation
        if (importMode === 'all_or_nothing' && validation.summary.invalidCount > 0) {
            return res.status(400).json({
                message: `Import rejected in all-or-nothing mode: ${validation.summary.invalidCount} invalid row(s) found. No transactions were written.`,
                summary: validation.summary,
                invalidRows: validation.rows.filter(r => r.status === 'invalid')
            });
        }

        const rowsToInsert = [];
        const skippedRows = [];

        for (const row of validation.rows) {
            if (row.status === 'invalid') {
                skippedRows.push({
                    rowNumber: row.rowNumber,
                    description: row.raw?.Description || 'N/A',
                    reason: `Validation error: ${row.errors.join('; ')}`
                });
                continue;
            }

            if (row.status === 'duplicate_file') {
                if (skipInFileDuplicates) {
                    skippedRows.push({
                        rowNumber: row.rowNumber,
                        description: row.parsed.description,
                        reason: row.matchReason || 'Duplicate within uploaded file'
                    });
                    continue;
                }
            }

            if (row.status === 'duplicate_existing') {
                if (skipExistingDuplicates) {
                    skippedRows.push({
                        rowNumber: row.rowNumber,
                        description: row.parsed.description,
                        reason: row.matchReason || 'Matches existing transaction in your history'
                    });
                    continue;
                }
            }

            rowsToInsert.push(row);
        }

        const successfulWrites = [];
        const failedWrites = [];

        // Insert transactions with explicit session user ownership
        for (const item of rowsToInsert) {
            try {
                const doc = await transactionModel.create({
                    user: req.user.id, // Strictly from authenticated session; CSV user fields ignored
                    description: item.parsed.description,
                    amount: item.parsed.amount,
                    type: item.parsed.type,
                    category: item.parsed.category,
                    date: item.parsed.date,
                    createdAt: item.parsed.date
                });
                successfulWrites.push(doc);
            } catch (writeErr) {
                failedWrites.push({
                    rowNumber: item.rowNumber,
                    description: item.parsed.description,
                    error: writeErr.message || 'Database write failure'
                });
            }
        }

        const statusCode = (failedWrites.length > 0 && successfulWrites.length === 0) ? 500 : 200;

        return res.status(statusCode).json({
            message: failedWrites.length > 0
                ? `Import completed with ${failedWrites.length} failure(s). ${successfulWrites.length} transaction(s) written.`
                : `Successfully imported ${successfulWrites.length} transaction(s).`,
            importedCount: successfulWrites.length,
            skippedCount: skippedRows.length,
            failedCount: failedWrites.length,
            skippedRows,
            failedWrites,
            importedTransactions: successfulWrites
        });
    } catch (error) {
        if (error.statusCode === 400 || error.message.startsWith('Malformed CSV')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

module.exports = {
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    previewImportTransactions,
    importTransactions
};
