const { z } = require("zod");
const {
    VALID_CATEGORIES,
    isValidObjectId,
    formatValidationError
} = require("./transactionValidator");

/**
 * Parses and sanitizes optional dates.
 * Accepts ISO date strings, null, undefined, or empty string.
 */
const datePreprocessor = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? val : date;
};

/**
 * Schema for creating a new recurring transaction rule.
 */
const createRecurringSchema = z.object({
    name: z.preprocess((val) => {
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid rule name."
    })
    .min(1, "Please provide a valid rule name.")
    .max(100, "Rule name cannot exceed 100 characters.")),

    amount: z.preprocess((val) => {
        if (val === undefined || val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Amount must be a valid positive number."
    })
    .finite("Amount must be a finite number.")
    .gt(0, "Amount must be greater than 0.")),

    type: z.enum(['expense', 'income'], {
        message: "Type must be either 'expense' or 'income'."
    }).default('expense'),

    category: z.preprocess((val) => {
        if (typeof val === "string") return val.trim();
        return val;
    }, z.enum(VALID_CATEGORIES, {
        message: "Please select a supported transaction category."
    })),

    frequency: z.enum(['weekly', 'monthly', 'yearly'], {
        message: "Frequency must be 'weekly', 'monthly', or 'yearly'."
    }),

    startDate: z.preprocess(datePreprocessor, z.date({
        message: "Start date must be a valid date."
    })),

    endDate: z.preprocess(datePreprocessor, z.date({
        message: "End date must be a valid date."
    }).nullable().optional()),

    status: z.enum(['active', 'paused'], {
        message: "Status must be 'active' or 'paused'."
    }).optional().default('active')
}).refine((data) => {
    if (data.startDate && data.endDate) {
        return new Date(data.endDate).getTime() >= new Date(data.startDate).getTime();
    }
    return true;
}, {
    message: "End date must be on or after the start date.",
    path: ["endDate"]
});

/**
 * Schema for updating an existing recurring transaction rule.
 */
const updateRecurringSchema = z.object({
    name: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid rule name."
    })
    .min(1, "Please provide a valid rule name.")
    .max(100, "Rule name cannot exceed 100 characters.")
    .optional()),

    amount: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (val === null || val === "") return NaN;
        return Number(val);
    }, z.number({
        message: "Amount must be a valid positive number."
    })
    .finite("Amount must be a finite number.")
    .gt(0, "Amount must be greater than 0.")
    .optional()),

    type: z.enum(['expense', 'income'], {
        message: "Type must be either 'expense' or 'income'."
    }).optional(),

    category: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val;
    }, z.enum(VALID_CATEGORIES, {
        message: "Please select a supported transaction category."
    }).optional()),

    frequency: z.enum(['weekly', 'monthly', 'yearly'], {
        message: "Frequency must be 'weekly', 'monthly', or 'yearly'."
    }).optional(),

    startDate: z.preprocess(datePreprocessor, z.date({
        message: "Start date must be a valid date."
    }).optional()),

    endDate: z.preprocess(datePreprocessor, z.date({
        message: "End date must be a valid date."
    }).nullable().optional()),

    status: z.enum(['active', 'paused', 'ended'], {
        message: "Status must be 'active', 'paused', or 'ended'."
    }).optional()
}).refine((data) => {
    return Object.keys(data).length > 0;
}, {
    message: "At least one field must be provided for update."
}).refine((data) => {
    if (data.startDate && data.endDate) {
        return new Date(data.endDate).getTime() >= new Date(data.startDate).getTime();
    }
    return true;
}, {
    message: "End date must be on or after the start date.",
    path: ["endDate"]
});

module.exports = {
    isValidObjectId,
    createRecurringSchema,
    updateRecurringSchema,
    formatValidationError
};
