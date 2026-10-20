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
        const data = await transactionModel.find();
        return res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/transactions
 * Create a new transaction with validated payload.
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
            category
        });

        return res.status(201).json(newTransaction);
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/transactions/:id
 * Update an existing transaction by ID with validated partial payload.
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

        const updatedTransaction = await transactionModel.findByIdAndUpdate(
            req.params.id,
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
 */
const deleteTransaction = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid transaction ID'
            });
        }
        const deletedTransaction = await transactionModel.findByIdAndDelete(req.params.id);
        if (deletedTransaction) {
            return res.status(200).json(deletedTransaction);
        }
        return res.status(404).json({ message: 'Transaction not found' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction
};
