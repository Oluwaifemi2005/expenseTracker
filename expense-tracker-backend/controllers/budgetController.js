const budgetModel = require('../models/Budget');
const {
    createBudgetSchema,
    updateBudgetSchema,
    isValidObjectId,
    formatValidationError
} = require('../validators/budgetValidator');

/**
 * GET /api/budgets
 * Retrieve all budgets belonging strictly to the authenticated user.
 */
const getBudgets = async (req, res, next) => {
    try {
        const data = await budgetModel.find({ user: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/budgets
 * Create a new budget record bound to the authenticated user.
 */
const createBudget = async (req, res, next) => {
    const validationResult = createBudgetSchema.safeParse(req.body);
    if (!validationResult.success) {
        const { message, errors } = formatValidationError(validationResult.error);
        return res.status(400).json({ message, errors });
    }

    try {
        const { name, limit, category, period } = validationResult.data;

        const newBudget = await budgetModel.create({
            name,
            limit,
            category,
            period: period || 'monthly',
            user: req.user.id
        });

        return res.status(201).json(newBudget);
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/budgets/:id
 * Update an existing budget by ID.
 * Scoped strictly to budgets owned by the authenticated user.
 */
const updateBudget = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid budget ID'
            });
        }

        const validationResult = updateBudgetSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const updateData = validationResult.data;

        const updatedBudget = await budgetModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedBudget) {
            return res.status(404).json({
                message: 'Budget not found'
            });
        }

        return res.status(200).json(updatedBudget);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/budgets/:id
 * Delete a budget by ID.
 * Scoped strictly to budgets owned by the authenticated user.
 */
const deleteBudget = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid budget ID'
            });
        }

        const deletedBudget = await budgetModel.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (deletedBudget) {
            return res.status(200).json(deletedBudget);
        }

        return res.status(404).json({ message: 'Budget not found' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget
};
