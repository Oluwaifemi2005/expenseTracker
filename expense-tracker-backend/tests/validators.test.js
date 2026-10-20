const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
    createTransactionSchema,
    updateTransactionSchema,
    isValidObjectId,
    formatValidationError
} = require("../validators/transactionValidator");

describe("Transaction Validator Unit Tests", () => {
    describe("createTransactionSchema", () => {
        it("should validate a valid income transaction with all fields", () => {
            const input = {
                description: "Monthly Consulting Fee",
                amount: 3500.50,
                type: "income",
                category: "Freelance"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, true);
            assert.equal(result.data.description, "Monthly Consulting Fee");
            assert.equal(result.data.amount, 3500.50);
            assert.equal(result.data.type, "income");
            assert.equal(result.data.category, "Freelance");
        });

        it("should validate a valid expense transaction and trim description", () => {
            const input = {
                description: "   Groceries at Trader Joe's   ",
                amount: 120.75,
                type: "expense",
                category: "Food & Dining"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, true);
            assert.equal(result.data.description, "Groceries at Trader Joe's");
            assert.equal(result.data.category, "Food & Dining");
        });

        it("should default category to 'Other' when not provided", () => {
            const input = {
                description: "Miscellaneous Expense",
                amount: 45,
                type: "expense"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, true);
            assert.equal(result.data.category, "Other");
        });

        it("should coerce numeric string amounts to numbers", () => {
            const input = {
                description: "Book purchase",
                amount: "29.99",
                type: "expense"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, true);
            assert.equal(result.data.amount, 29.99);
        });

        it("should reject when description is missing", () => {
            const input = {
                amount: 100,
                type: "income"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.match(message, /description/i);
        });

        it("should reject when description is empty or only whitespace", () => {
            const input = {
                description: "    ",
                amount: 100,
                type: "income"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Please provide a valid, non-empty description.");
        });

        it("should reject when description exceeds 200 characters", () => {
            const input = {
                description: "A".repeat(201),
                amount: 100,
                type: "income"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.match(message, /cannot exceed 200 characters/i);
        });

        it("should reject when amount is missing", () => {
            const input = {
                description: "Salary",
                type: "income"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.match(message, /amount/i);
        });

        it("should reject zero amount", () => {
            const input = {
                description: "Free lunch",
                amount: 0,
                type: "expense"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Amount must be a positive number greater than 0.");
        });

        it("should reject negative amount", () => {
            const input = {
                description: "Refund",
                amount: -50,
                type: "income"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Amount must be a positive number greater than 0.");
        });

        it("should reject non-numeric string amounts (NaN)", () => {
            const input = {
                description: "Coffee",
                amount: "twenty dollars",
                type: "expense"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Amount must be a valid positive number.");
        });

        it("should reject Infinity as amount", () => {
            const input = {
                description: "Jackpot",
                amount: Infinity,
                type: "income"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Amount must be a valid positive number.");
        });

        it("should reject unsupported transaction types", () => {
            const input = {
                description: "Transfer",
                amount: 100,
                type: "transfer"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Transaction type must be 'income' or 'expense'.");
        });

        it("should reject unsupported categories", () => {
            const input = {
                description: "Crypto purchase",
                amount: 100,
                type: "expense",
                category: "Cryptocurrency"
            };
            const result = createTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Please provide a supported transaction category.");
        });
    });

    describe("updateTransactionSchema", () => {
        it("should validate a single-field update (amount)", () => {
            const input = { amount: 150 };
            const result = updateTransactionSchema.safeParse(input);
            assert.equal(result.success, true);
            assert.equal(result.data.amount, 150);
        });

        it("should validate a multi-field update", () => {
            const input = {
                description: "Updated description",
                category: "Shopping"
            };
            const result = updateTransactionSchema.safeParse(input);
            assert.equal(result.success, true);
            assert.equal(result.data.description, "Updated description");
            assert.equal(result.data.category, "Shopping");
        });

        it("should reject an empty update body", () => {
            const input = {};
            const result = updateTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.match(message, /at least one field/i);
        });

        it("should reject invalid amount in update", () => {
            const input = { amount: -20 };
            const result = updateTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Amount must be a positive number greater than 0.");
        });

        it("should reject invalid type in update", () => {
            const input = { type: "credit" };
            const result = updateTransactionSchema.safeParse(input);
            assert.equal(result.success, false);
            const { message } = formatValidationError(result.error);
            assert.equal(message, "Transaction type must be 'income' or 'expense'.");
        });
    });

    describe("isValidObjectId", () => {
        it("should accept valid 24-character hexadecimal MongoDB ObjectIds", () => {
            assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
            assert.equal(isValidObjectId("65f1a2b3c4d5e6f7a8b9c0d1"), true);
        });

        it("should reject short IDs", () => {
            assert.equal(isValidObjectId("123"), false);
            assert.equal(isValidObjectId("507f1f77bcf86cd799439"), false);
        });

        it("should reject non-hex characters", () => {
            assert.equal(isValidObjectId("507f1f77bcf86cd7994390zz"), false);
            assert.equal(isValidObjectId("65f1a2b3c4d5e6f7a8b9c0g_"), false);
        });

        it("should reject non-string values or empty inputs", () => {
            assert.equal(isValidObjectId(""), false);
            assert.equal(isValidObjectId(null), false);
            assert.equal(isValidObjectId(undefined), false);
            assert.equal(isValidObjectId(123456789012345678901234), false);
            assert.equal(isValidObjectId({}), false);
        });
    });
});
