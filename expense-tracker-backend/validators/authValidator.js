const { z } = require('zod');

/**
 * Schema for user registration.
 * Requires name, valid email, and strong password (min 8 characters, with letters and numbers).
 */
const registerSchema = z.object({
    name: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val),
        z.string({ message: 'Name is required.' })
            .min(1, 'Name must be at least 1 character long.')
            .max(60, 'Name cannot exceed 60 characters.')
    ),

    email: z.preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
        z.string({ message: 'Email is required.' })
            .email('Please provide a valid email address.')
            .max(254, 'Email address is too long.')
    ),

    password: z.string({ message: 'Password is required.' })
        .min(8, 'Password must be at least 8 characters long.')
        .max(128, 'Password cannot exceed 128 characters.')
        .refine((pwd) => /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd), {
            message: 'Password must contain at least one letter and one number.'
        })
});

/**
 * Schema for user login.
 * Requires email and password.
 */
const loginSchema = z.object({
    email: z.preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
        z.string({ message: 'Email is required.' })
            .email('Please provide a valid email address.')
    ),

    password: z.string({ message: 'Password is required.' })
        .min(1, 'Password is required.')
});

/**
 * Standardizes Zod validation error formatting for API responses.
 * @param {z.ZodError} zodError
 * @returns {{ message: string, errors: Array<{ field: string, message: string }> }}
 */
const formatAuthValidationError = (zodError) => {
    const issues = zodError.issues || [];
    const firstMessage = issues.length > 0 ? issues[0].message : 'Validation failed.';

    const formattedErrors = issues.map((issue) => ({
        field: issue.path.join('.') || 'input',
        message: issue.message
    }));

    return {
        message: firstMessage,
        errors: formattedErrors
    };
};

module.exports = {
    registerSchema,
    loginSchema,
    formatAuthValidationError
};
