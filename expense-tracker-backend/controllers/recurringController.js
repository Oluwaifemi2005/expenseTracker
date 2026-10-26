const crypto = require("crypto");
const recurringModel = require("../models/RecurringTransaction");
const transactionModel = require("../models/Transaction");
const {
    createRecurringSchema,
    updateRecurringSchema,
    isValidObjectId,
    formatValidationError
} = require("../validators/recurringValidator");
const {
    toOccurrenceKey,
    getNextOccurrenceDate,
    isOccurrencePastEndDate
} = require("../utils/recurrenceUtils");

/**
 * Helper to process due occurrences for a single recurring rule up to cutoffDate.
 * Guaranteed idempotent and crash/retry safe:
 * - Checks for existing transactions for each (ruleId, occurrenceKey)
 * - Catches MongoDB duplicate key (11000) errors gracefully
 * - Reconciles rule state (processedOccurrences, lastProcessedDate, nextOccurrence, status)
 * 
 * @param {Object} rule - Mongoose RecurringTransaction document
 * @param {Date} cutoffDate - Maximum occurrence timestamp to process
 * @returns {Promise<{ createdCount: number, advanced: boolean }>}
 */
async function processSingleRule(rule, cutoffDate) {
    if (rule.status !== 'active') {
        return { createdCount: 0, advanced: false };
    }

    let createdCount = 0;
    let advanced = false;
    const maxIterations = 500; // Safeguard against runaway loops
    let iteration = 0;

    while (
        rule.status === 'active' &&
        rule.nextOccurrence &&
        new Date(rule.nextOccurrence).getTime() <= cutoffDate.getTime() &&
        iteration < maxIterations
    ) {
        iteration++;
        const currOccurrenceDate = new Date(rule.nextOccurrence);
        const occurrenceKey = toOccurrenceKey(currOccurrenceDate);

        // Check if rule's occurrence exceeds endDate
        if (isOccurrencePastEndDate(currOccurrenceDate, rule.endDate)) {
            rule.status = 'ended';
            advanced = true;
            break;
        }

        // 1. Check if a transaction for this rule & occurrence already exists (e.g. from prior failed rule update)
        let existingTx = await transactionModel.findOne({
            recurringRule: rule._id,
            recurrenceOccurrence: occurrenceKey
        });

        if (!existingTx) {
            try {
                await transactionModel.create({
                    user: rule.user,
                    description: rule.name,
                    amount: rule.amount,
                    type: rule.type,
                    category: rule.category,
                    recurringRule: rule._id,
                    recurrenceOccurrence: occurrenceKey,
                    createdAt: currOccurrenceDate
                });
                createdCount++;
            } catch (err) {
                // MongoDB duplicate key error code 11000 indicates another worker or retry inserted it concurrently
                if (err.code === 11000) {
                    existingTx = await transactionModel.findOne({
                        recurringRule: rule._id,
                        recurrenceOccurrence: occurrenceKey
                    });
                } else {
                    throw err;
                }
            }
        }

        // 2. Reconcile rule occurrence records
        if (!rule.processedOccurrences.includes(occurrenceKey)) {
            rule.processedOccurrences.push(occurrenceKey);
        }
        rule.lastProcessedDate = new Date();

        // 3. Advance to the next occurrence from the previous scheduled occurrence date
        const nextDate = getNextOccurrenceDate(currOccurrenceDate, rule.frequency, rule.anchorDay);
        rule.nextOccurrence = nextDate;
        advanced = true;

        // Check if the newly computed nextOccurrence already exceeds the end date
        if (isOccurrencePastEndDate(nextDate, rule.endDate)) {
            rule.status = 'ended';
            break;
        }
    }

    if (advanced) {
        await rule.save();
    }

    return { createdCount, advanced };
}

/**
 * GET /api/recurring
 * Retrieve all recurring rules for the authenticated user.
 */
const getRecurringRules = async (req, res, next) => {
    try {
        const rules = await recurringModel.find({ user: req.user.id }).sort({ nextOccurrence: 1 });
        return res.status(200).json(rules);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/recurring
 * Create a new recurring transaction rule.
 */
const createRecurringRule = async (req, res, next) => {
    const validationResult = createRecurringSchema.safeParse(req.body);
    if (!validationResult.success) {
        const { message, errors } = formatValidationError(validationResult.error);
        return res.status(400).json({ message, errors });
    }

    try {
        const { name, amount, type, category, frequency, startDate, endDate, status } = validationResult.data;

        const start = new Date(startDate);
        const anchorDay = start.getUTCDate();
        const nextOccurrence = new Date(startDate);

        const newRule = await recurringModel.create({
            user: req.user.id,
            name,
            amount,
            type,
            category,
            frequency,
            startDate: start,
            endDate: endDate ? new Date(endDate) : null,
            anchorDay,
            status: status || 'active',
            nextOccurrence,
            processedOccurrences: []
        });

        return res.status(201).json(newRule);
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/recurring/:id
 * Update an existing recurring transaction rule.
 */
const updateRecurringRule = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid recurring rule ID" });
        }

        const validationResult = updateRecurringSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const rule = await recurringModel.findOne({ _id: req.params.id, user: req.user.id });
        if (!rule) {
            return res.status(404).json({ message: "Recurring rule not found" });
        }

        const updates = validationResult.data;

        if (updates.name !== undefined) rule.name = updates.name;
        if (updates.amount !== undefined) rule.amount = updates.amount;
        if (updates.type !== undefined) rule.type = updates.type;
        if (updates.category !== undefined) rule.category = updates.category;
        if (updates.frequency !== undefined) rule.frequency = updates.frequency;
        if (updates.status !== undefined) rule.status = updates.status;
        if (updates.endDate !== undefined) {
            rule.endDate = updates.endDate ? new Date(updates.endDate) : null;
            if (rule.nextOccurrence && isOccurrencePastEndDate(rule.nextOccurrence, rule.endDate)) {
                rule.status = 'ended';
            }
        }

        if (updates.startDate !== undefined) {
            const newStart = new Date(updates.startDate);
            rule.startDate = newStart;
            rule.anchorDay = newStart.getUTCDate();
            // If the rule has not processed any occurrences yet, reset nextOccurrence to new start date
            if (rule.processedOccurrences.length === 0) {
                rule.nextOccurrence = newStart;
            }
        }

        await rule.save();
        return res.status(200).json(rule);
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/recurring/:id/status
 * Toggle recurring rule status between 'active' and 'paused'.
 */
const toggleStatus = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid recurring rule ID" });
        }

        const rule = await recurringModel.findOne({ _id: req.params.id, user: req.user.id });
        if (!rule) {
            return res.status(404).json({ message: "Recurring rule not found" });
        }

        if (rule.status === 'active') {
            rule.status = 'paused';
        } else if (rule.status === 'paused') {
            // Check if end date has already passed
            if (rule.nextOccurrence && isOccurrencePastEndDate(rule.nextOccurrence, rule.endDate)) {
                rule.status = 'ended';
            } else {
                rule.status = 'active';
            }
        } else if (rule.status === 'ended') {
            // If rule ended, can reactivate only if endDate is null or in the future
            if (!rule.endDate || new Date(rule.endDate).getTime() >= Date.now()) {
                rule.status = 'active';
            }
        }

        await rule.save();
        return res.status(200).json(rule);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/recurring/:id
 * Delete a recurring rule. Previously generated transactions are preserved!
 */
const deleteRecurringRule = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid recurring rule ID" });
        }

        const deletedRule = await recurringModel.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!deletedRule) {
            return res.status(404).json({ message: "Recurring rule not found" });
        }

        // Return confirmation without touching existing transactions
        return res.status(200).json({
            message: "Recurring rule deleted successfully",
            deletedId: deletedRule._id
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/recurring/process-due
 * Authenticated endpoint: processes due occurrences strictly for the logged-in user.
 */
const processUserDueRules = async (req, res, next) => {
    try {
        const now = new Date();
        const dueRules = await recurringModel.find({
            user: req.user.id,
            status: 'active',
            nextOccurrence: { $lte: now }
        });

        let totalGenerated = 0;
        let rulesProcessed = 0;

        for (const rule of dueRules) {
            const { createdCount, advanced } = await processSingleRule(rule, now);
            totalGenerated += createdCount;
            if (advanced) {
                rulesProcessed++;
            }
        }

        return res.status(200).json({
            message: `Processed ${rulesProcessed} rules, generated ${totalGenerated} transactions`,
            processedRules: rulesProcessed,
            generatedTransactions: totalGenerated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/recurring/cron-process
 * External scheduler endpoint: protected by CRON_SECRET token.
 * Fails closed if CRON_SECRET is missing, empty, or invalid.
 * Secret is never logged or exposed in the response.
 */
const cronProcessDueRules = async (req, res, next) => {
    try {
        const configuredSecret = process.env.CRON_SECRET;
        if (!configuredSecret || typeof configuredSecret !== 'string' || configuredSecret.trim().length === 0) {
            return res.status(401).json({ message: "Scheduler authentication unavailable" });
        }

        const providedSecret =
            req.headers['x-cron-secret'] ||
            (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
                ? req.headers.authorization.slice(7)
                : null);

        if (!providedSecret || typeof providedSecret !== 'string') {
            return res.status(401).json({ message: "Unauthorized scheduler request" });
        }

        const bufProvided = Buffer.from(providedSecret);
        const bufConfigured = Buffer.from(configuredSecret);

        if (bufProvided.length !== bufConfigured.length || !crypto.timingSafeEqual(bufProvided, bufConfigured)) {
            return res.status(401).json({ message: "Unauthorized scheduler request" });
        }

        const now = new Date();
        const dueRules = await recurringModel.find({
            status: 'active',
            nextOccurrence: { $lte: now }
        });

        let totalGenerated = 0;
        let rulesProcessed = 0;

        for (const rule of dueRules) {
            const { createdCount, advanced } = await processSingleRule(rule, now);
            totalGenerated += createdCount;
            if (advanced) {
                rulesProcessed++;
            }
        }

        return res.status(200).json({
            message: "Scheduler run completed",
            processedRules: rulesProcessed,
            generatedTransactions: totalGenerated
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getRecurringRules,
    createRecurringRule,
    updateRecurringRule,
    toggleStatus,
    deleteRecurringRule,
    processUserDueRules,
    cronProcessDueRules,
    processSingleRule
};
