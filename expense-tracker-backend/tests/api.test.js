const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const transactionModel = require("../models/Transaction");

describe("Transactions API Integration Tests (Isolated & Mocked Database Layer)", () => {
    let originalFind;
    let originalCreate;
    let originalFindByIdAndUpdate;
    let originalFindByIdAndDelete;

    beforeEach(() => {
        // Save original methods
        originalFind = transactionModel.find;
        originalCreate = transactionModel.create;
        originalFindByIdAndUpdate = transactionModel.findByIdAndUpdate;
        originalFindByIdAndDelete = transactionModel.findByIdAndDelete;

        // Verify safety rule: tests must never connect to live MongoDB Atlas
        assert.notEqual(
            mongoose.connection.readyState,
            1,
            "CRITICAL SAFETY VIOLATION: Test suite must not be connected to a live database."
        );
    });

    afterEach(() => {
        // Restore original methods
        transactionModel.find = originalFind;
        transactionModel.create = originalCreate;
        transactionModel.findByIdAndUpdate = originalFindByIdAndUpdate;
        transactionModel.findByIdAndDelete = originalFindByIdAndDelete;
    });

    describe("GET /", () => {
        it("should return API health status", async () => {
            const res = await request(app).get("/");
            assert.equal(res.status, 200);
            assert.equal(res.body.message, "Expense tracker API is running!");
        });
    });

    describe("GET /api/transactions", () => {
        it("should return a 200 and an array of transactions", async () => {
            const mockData = [
                { _id: "65f1a2b3c4d5e6f7a8b9c0d1", description: "Salary", amount: 5000, type: "income", category: "Salary" },
                { _id: "65f1a2b3c4d5e6f7a8b9c0d2", description: "Groceries", amount: 150, type: "expense", category: "Food & Dining" }
            ];
            transactionModel.find = async () => mockData;

            const res = await request(app).get("/api/transactions");
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.equal(res.body.length, 2);
            assert.equal(res.body[0].description, "Salary");
        });

        it("should handle unexpected database errors gracefully with a 500 status", async () => {
            transactionModel.find = async () => {
                throw new Error("Simulated database read failure");
            };

            const res = await request(app).get("/api/transactions");
            assert.equal(res.status, 500);
            assert.equal(res.body.message, "An unexpected server error occurred.");
            assert.equal(res.body.stack, undefined);
        });
    });

    describe("POST /api/transactions", () => {
        it("should create a valid transaction and return 201", async () => {
            const newTx = {
                description: "Freelance Project",
                amount: 1250,
                type: "income",
                category: "Freelance"
            };

            transactionModel.create = async (doc) => ({
                _id: "65f1a2b3c4d5e6f7a8b9c0d3",
                ...doc,
                createdAt: new Date().toISOString()
            });

            const res = await request(app)
                .post("/api/transactions")
                .send(newTx);

            assert.equal(res.status, 201);
            assert.equal(res.body.description, "Freelance Project");
            assert.equal(res.body.amount, 1250);
            assert.equal(res.body.type, "income");
            assert.equal(res.body.category, "Freelance");
            assert.ok(res.body._id);
        });

        it("should reject creation when required description is missing", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .send({ amount: 100, type: "expense" });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /description/i);
            assert.ok(Array.isArray(res.body.errors));
        });

        it("should reject creation with zero amount", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .send({ description: "Invalid", amount: 0, type: "expense" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Amount must be a positive number greater than 0.");
        });

        it("should reject creation with negative amount", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .send({ description: "Invalid", amount: -25, type: "expense" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Amount must be a positive number greater than 0.");
        });

        it("should reject creation with non-numeric string amount", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .send({ description: "Invalid", amount: "not-a-number", type: "expense" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Amount must be a valid positive number.");
        });

        it("should reject creation with invalid transaction type", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .send({ description: "Invalid Type", amount: 100, type: "crypto" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Transaction type must be 'income' or 'expense'.");
        });

        it("should reject creation with invalid category", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .send({ description: "Invalid Cat", amount: 100, type: "expense", category: "Gambling" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Please provide a supported transaction category.");
        });
    });

    describe("PUT /api/transactions/:id", () => {
        const validId = "65f1a2b3c4d5e6f7a8b9c0d1";

        it("should successfully update an existing transaction and return 200", async () => {
            const updated = {
                _id: validId,
                description: "Updated Office Rent",
                amount: 1400,
                type: "expense",
                category: "Housing & Rent"
            };

            transactionModel.findByIdAndUpdate = async (id, update) => {
                assert.equal(id, validId);
                return { ...updated, ...update };
            };

            const res = await request(app)
                .put(`/api/transactions/${validId}`)
                .send({ description: "Updated Office Rent", amount: 1400 });

            assert.equal(res.status, 200);
            assert.equal(res.body.description, "Updated Office Rent");
            assert.equal(res.body.amount, 1400);
        });

        it("should return 400 when ID format is not a valid 24-character hex ObjectId", async () => {
            const res = await request(app)
                .put("/api/transactions/invalid-id-123")
                .send({ amount: 50 });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Invalid transaction ID");
        });

        it("should return 404 when transaction is not found", async () => {
            transactionModel.findByIdAndUpdate = async () => null;

            const res = await request(app)
                .put(`/api/transactions/${validId}`)
                .send({ description: "Nonexistent" });

            assert.equal(res.status, 404);
            assert.equal(res.body.message, "Transaction not found");
        });

        it("should return 400 when update payload is completely empty", async () => {
            const res = await request(app)
                .put(`/api/transactions/${validId}`)
                .send({});

            assert.equal(res.status, 400);
            assert.match(res.body.message, /at least one field/i);
        });
    });

    describe("DELETE /api/transactions/:id", () => {
        const validId = "65f1a2b3c4d5e6f7a8b9c0d1";

        it("should delete an existing transaction and return 200 with the deleted record", async () => {
            const deleted = {
                _id: validId,
                description: "Old Expense",
                amount: 30,
                type: "expense"
            };

            transactionModel.findByIdAndDelete = async (id) => {
                assert.equal(id, validId);
                return deleted;
            };

            const res = await request(app).delete(`/api/transactions/${validId}`);
            assert.equal(res.status, 200);
            assert.equal(res.body._id, validId);
        });

        it("should return 400 when ID format is invalid", async () => {
            const res = await request(app).delete("/api/transactions/999");
            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Invalid transaction ID");
        });

        it("should return 404 when transaction does not exist", async () => {
            transactionModel.findByIdAndDelete = async () => null;

            const res = await request(app).delete(`/api/transactions/${validId}`);
            assert.equal(res.status, 404);
            assert.equal(res.body.message, "Transaction not found");
        });
    });

    describe("Centralized Error & 404 Handling", () => {
        it("should return 400 with a clean message on malformed JSON payload", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Content-Type", "application/json")
                .send('{"description": "Broken JSON, missing brace');

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Invalid JSON in request body.");
        });

        it("should return 404 JSON response on nonexistent route", async () => {
            const res = await request(app).get("/api/non-existent-route");
            assert.equal(res.status, 404);
            assert.match(res.body.message, /not found/i);
        });
    });
});
