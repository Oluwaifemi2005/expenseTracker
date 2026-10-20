const { z } = require("zod");
const mongoose = require("mongoose");

const VALID_CATEGORIES = [
    'Salary',
    'Freelance',
    'Business',
    'Investments',
    'Gifts',
    'Food & Dining',
    'Transportation',
    'Housing & Rent',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Education',
    'Personal Care',
    'Other'
];

const VALID_TYPES = ['expense', 'income'];

/**
 * Validates a MongoDB ObjectId string.
 * Must be a 24-character hexadecimal string.
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
};

/**
 * Schema for creating a new transaction record.
 * Requires: description, amount, type.
 * Optional: category (defaults to 'Other').
 */
const createTransactionSchema = z.object({
    description: z.preprocess((val) => {
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid, non-empty description."
    })
    .min(1, "Please provide a valid, non-empty description.")
    .max(200, "Description cannot exceed 200 characters.")),

    amount: z.preprocess((val) => {
        if (val === undefined || val === null || val === "") return NaN;
        const num = Number(val);
        return num;
    }, z.number({
        message: "Amount must be a valid positive number."
    })
    .finite("Amount must be a finite number.")
    .gt(0, "Amount must be a positive number greater than 0.")),

    type: z.enum(VALID_TYPES, {
        message: "Transaction type must be 'income' or 'expense'."
    }),

    category: z.enum(VALID_CATEGORIES, {
        message: "Please provide a supported transaction category."
    }).default("Other")
});

/**
 * Schema for updating an existing transaction record.
 * All fields are optional, but if provided they must be valid.
 * At least one field must be provided.
 */
const updateTransactionSchema = z.object({
    description: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val;
    }, z.string({
        message: "Please provide a valid, non-empty description."
    })
    .min(1, "Please provide a valid, non-empty description.")
    .max(200, "Description cannot exceed 200 characters.")
    .optional()),

    amount: z.preprocess((val) => {
        if (val === undefined) return undefined;
        if (val === null || val === "") return NaN;
        const num = Number(val);
        return num;
    }, z.number({
        message: "Amount must be a valid positive number."
    })
    .finite("Amount must be a finite number.")
    .gt(0, "Amount must be a positive number greater than 0.")
    .optional()),

    type: z.enum(VALID_TYPES, {
        message: "Transaction type must be 'income' or 'expense'."
    }).optional(),

    category: z.enum(VALID_CATEGORIES, {
        message: "Please provide a supported transaction category."
    }).optional()
}).refine(data => {
    return Object.keys(data).length > 0;
}, {
    message: "At least one field (description, amount, type, or category) must be provided for update."
});

/**
 * Formats a Zod validation error into a consistent API response shape.
 * @param {import('zod').ZodError} zodError
 * @returns {{ message: string, errors: Array<{ field: string, message: string }> }}
 */
const formatValidationError = (zodError) => {
    const issues = zodError?.issues || [];
    const firstIssue = issues[0];
    return {
        message: firstIssue ? firstIssue.message : "Invalid request data.",
        errors: issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }))
    };
};

module.exports = {
    VALID_CATEGORIES,
    VALID_TYPES,
    isValidObjectId,
    createTransactionSchema,
    updateTransactionSchema,
    formatValidationError
};
