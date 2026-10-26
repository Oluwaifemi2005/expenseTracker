const { z } = require("zod");
const {
    isValidObjectId,
    formatValidationError
} = require("./transactionValidator");

/**
 * Parses and sanitizes optional target dates.
 * Accepts ISO date strings, null, undefined, or empty string.
 */
const datePreprocessor = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? val : date;
};

/**
 * Schema for creating a new savings goal.
 */
const createGoalSchema = z.object({
    name: z.preprocess((val) => {
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid goal name."
    })
    .min(1, "Please provide a valid goal name.")
    .max(100, "Goal name cannot exceed 100 characters.")),

    targetAmount: z.preprocess((val) => {
        if (val === undefined || val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Target amount must be a valid positive number."
    })
    .finite("Target amount must be a finite number.")
    .gt(0, "Target amount must be greater than 0.")),

    currentAmount: z.preprocess((val) => {
        if (val === undefined || val === null || val === "") return 0;
        return Number(val);
    }, z.number({
        message: "Saved amount must be a valid non-negative number."
    })
    .finite("Saved amount must be a finite number.")
    .gte(0, "Saved amount cannot be negative.")).default(0),

    targetDate: z.preprocess(datePreprocessor, z.date({
        message: "Target date must be a valid date."
    }).nullable().optional()),

    category: z.preprocess((val) => {
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string().max(50).optional().default("General"))
});

/**
 * Schema for updating an existing savings goal.
 * At least one field must be provided.
 */
const updateGoalSchema = z.object({
    name: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid goal name."
    })
    .min(1, "Please provide a valid goal name.")
    .max(100, "Goal name cannot exceed 100 characters.")
    .optional()),

    targetAmount: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Target amount must be a valid positive number."
    })
    .finite("Target amount must be a finite number.")
    .gt(0, "Target amount must be greater than 0.")
    .optional()),

    currentAmount: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Saved amount must be a valid non-negative number."
    })
    .finite("Saved amount must be a finite number.")
    .gte(0, "Saved amount cannot be negative.")
    .optional()),

    targetDate: z.preprocess(datePreprocessor, z.date({
        message: "Target date must be a valid date."
    }).nullable().optional()),

    category: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string().max(50).optional())
}).refine(data => {
    return Object.keys(data).length > 0;
}, {
    message: "At least one field must be provided for update."
});

/**
 * Schema for adjusting contributions (adding or subtracting funds).
 */
const adjustContributionSchema = z.object({
    amount: z.preprocess((val) => {
        if (val === undefined || val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Contribution amount must be a valid positive number."
    })
    .finite("Contribution amount must be a finite number.")
    .gt(0, "Contribution amount must be greater than 0.")),

    type: z.enum(['add', 'subtract', 'deposit', 'withdraw'], {
        message: "Action type must be 'add' or 'subtract'."
    })
});

module.exports = {
    isValidObjectId,
    createGoalSchema,
    updateGoalSchema,
    adjustContributionSchema,
    formatValidationError
};
