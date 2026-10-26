const { z } = require("zod");
const {
    VALID_CATEGORIES,
    isValidObjectId,
    formatValidationError
} = require("./transactionValidator");

const BUDGET_CATEGORIES = [...VALID_CATEGORIES, 'All Categories'];
const VALID_PERIODS = ['monthly'];

/**
 * Schema for creating a new budget.
 * Requires: name, limit, category.
 * Optional: period (defaults to 'monthly').
 */
const createBudgetSchema = z.object({
    name: z.preprocess((val) => {
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid budget name."
    })
    .min(1, "Please provide a valid budget name.")
    .max(100, "Budget name cannot exceed 100 characters.")),

    limit: z.preprocess((val) => {
        if (val === undefined || val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Spending limit must be a valid positive number."
    })
    .finite("Spending limit must be a finite number.")
    .gt(0, "Spending limit must be greater than 0.")),

    category: z.enum(BUDGET_CATEGORIES, {
        message: "Please provide a supported budget category."
    }),

    period: z.enum(VALID_PERIODS, {
        message: "Budget period must be 'monthly'."
    }).default("monthly")
});

/**
 * Schema for updating an existing budget.
 * At least one valid field must be provided.
 */
const updateBudgetSchema = z.object({
    name: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid budget name."
    })
    .min(1, "Please provide a valid budget name.")
    .max(100, "Budget name cannot exceed 100 characters.")
    .optional()),

    limit: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Spending limit must be a valid positive number."
    })
    .finite("Spending limit must be a finite number.")
    .gt(0, "Spending limit must be greater than 0.")
    .optional()),

    category: z.enum(BUDGET_CATEGORIES, {
        message: "Please provide a supported budget category."
    }).optional(),

    period: z.enum(VALID_PERIODS, {
        message: "Budget period must be 'monthly'."
    }).optional()
}).refine(data => {
    return Object.keys(data).length > 0;
}, {
    message: "At least one field (name, limit, category, or period) must be provided for update."
});

module.exports = {
    BUDGET_CATEGORIES,
    VALID_PERIODS,
    isValidObjectId,
    createBudgetSchema,
    updateBudgetSchema,
    formatValidationError
};
