const goalModel = require('../models/Goal');
const {
    createGoalSchema,
    updateGoalSchema,
    adjustContributionSchema,
    isValidObjectId,
    formatValidationError
} = require('../validators/goalValidator');

/**
 * GET /api/goals
 * Retrieve all savings goals belonging strictly to the authenticated user.
 */
const getGoals = async (req, res, next) => {
    try {
        const data = await goalModel.find({ user: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/goals
 * Create a new savings goal record bound to the authenticated user.
 */
const createGoal = async (req, res, next) => {
    const validationResult = createGoalSchema.safeParse(req.body);
    if (!validationResult.success) {
        const { message, errors } = formatValidationError(validationResult.error);
        return res.status(400).json({ message, errors });
    }

    try {
        const { name, targetAmount, currentAmount, targetDate, category } = validationResult.data;

        const newGoal = await goalModel.create({
            name,
            targetAmount,
            currentAmount: currentAmount || 0,
            targetDate: targetDate || null,
            category: category || 'General',
            user: req.user.id
        });

        return res.status(201).json(newGoal);
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/goals/:id
 * Update an existing savings goal by ID.
 * Scoped strictly to goals owned by the authenticated user.
 */
const updateGoal = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid goal ID'
            });
        }

        const validationResult = updateGoalSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const updateData = validationResult.data;

        const updatedGoal = await goalModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedGoal) {
            return res.status(404).json({
                message: 'Goal not found'
            });
        }

        return res.status(200).json(updatedGoal);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/goals/:id/adjust
 * Atomically adjust a goal's saved amount (add or subtract funds).
 * Concurrency-safe: conditional atomic query prevents negative balances under concurrent withdrawals.
 * Strictly scoped to goals owned by the authenticated user.
 */
const adjustContribution = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid goal ID'
            });
        }

        const validationResult = adjustContributionSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const { amount, type } = validationResult.data;
        const isAddition = type === 'add' || type === 'deposit';

        if (isAddition) {
            const updatedGoal = await goalModel.findOneAndUpdate(
                { _id: req.params.id, user: req.user.id },
                { $inc: { currentAmount: amount } },
                { new: true, runValidators: true }
            );

            if (!updatedGoal) {
                return res.status(404).json({ message: 'Goal not found' });
            }

            return res.status(200).json(updatedGoal);
        }

        // Subtraction: concurrency-safe atomic conditional update using { currentAmount: { $gte: amount } }
        const updatedGoal = await goalModel.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.user.id,
                currentAmount: { $gte: amount }
            },
            { $inc: { currentAmount: -amount } },
            { new: true, runValidators: true }
        );

        if (!updatedGoal) {
            // Determine if the goal does not exist or if the balance was insufficient
            const existingGoal = await goalModel.findOne({ _id: req.params.id, user: req.user.id });
            if (!existingGoal) {
                return res.status(404).json({ message: 'Goal not found' });
            }

            return res.status(400).json({
                message: `Insufficient funds. Withdrawal of ${amount} exceeds current balance of ${existingGoal.currentAmount}.`
            });
        }

        return res.status(200).json(updatedGoal);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/goals/:id
 * Delete a savings goal by ID.
 * Scoped strictly to goals owned by the authenticated user.
 */
const deleteGoal = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid goal ID'
            });
        }

        const deletedGoal = await goalModel.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (deletedGoal) {
            return res.status(200).json(deletedGoal);
        }

        return res.status(404).json({ message: 'Goal not found' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGoals,
    createGoal,
    updateGoal,
    adjustContribution,
    deleteGoal
};
