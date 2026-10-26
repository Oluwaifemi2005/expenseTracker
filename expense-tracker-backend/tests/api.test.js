const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../server");
const transactionModel = require("../models/Transaction");
const { JWT_SECRET } = require("../middleware/auth");

describe("Transactions API Integration Tests (Isolated & Mocked Database Layer)", () => {
    let originalFind;
    let originalCreate;
    let originalFindOneAndUpdate;
    let originalFindOneAndDelete;
    let originalFindByIdAndUpdate;
    let originalFindByIdAndDelete;

    const userAId = "65f1a2b3c4d5e6f7a8b9c0aa";
    const userBId = "65f1a2b3c4d5e6f7a8b9c0bb";

    const userAToken = jwt.sign(
        { id: userAId, email: "usera@vaultex.com", name: "User A" },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    const userBToken = jwt.sign(
        { id: userBId, email: "userb@vaultex.com", name: "User B" },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    beforeEach(() => {
        // Save original methods
        originalFind = transactionModel.find;
        originalCreate = transactionModel.create;
        originalFindOneAndUpdate = transactionModel.findOneAndUpdate;
        originalFindOneAndDelete = transactionModel.findOneAndDelete;
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
        transactionModel.findOneAndUpdate = originalFindOneAndUpdate;
        transactionModel.findOneAndDelete = originalFindOneAndDelete;
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

    describe("Route Authentication Protection (/api/transactions)", () => {
        it("should return 401 Unauthorized when GET /api/transactions is requested without credentials", async () => {
            const res = await request(app).get("/api/transactions");
            assert.equal(res.status, 401);
            assert.equal(res.body.message, "Authentication required. Please log in.");
        });

        it("should return 401 Unauthorized when POST /api/transactions is requested without credentials", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .send({ description: "Coffee", amount: 5, type: "expense" });
            assert.equal(res.status, 401);
            assert.equal(res.body.message, "Authentication required. Please log in.");
        });

        it("should return 401 Unauthorized when PUT /api/transactions/:id is requested without credentials", async () => {
            const res = await request(app)
                .put(`/api/transactions/${userAId}`)
                .send({ amount: 10 });
            assert.equal(res.status, 401);
            assert.equal(res.body.message, "Authentication required. Please log in.");
        });

        it("should return 401 Unauthorized when DELETE /api/transactions/:id is requested without credentials", async () => {
            const res = await request(app)
                .delete(`/api/transactions/${userAId}`);
            assert.equal(res.status, 401);
            assert.equal(res.body.message, "Authentication required. Please log in.");
        });

        it("should return 401 Unauthorized on tampered/invalid Bearer token", async () => {
            const res = await request(app)
                .get("/api/transactions")
                .set("Authorization", "Bearer invalid.signature.token");
            assert.equal(res.status, 401);
            assert.equal(res.body.message, "Session invalid or expired. Please log in again.");
        });

        it("should return 401 Unauthorized on expired token", async () => {
            const expiredToken = jwt.sign(
                { id: userAId, email: "usera@vaultex.com" },
                JWT_SECRET,
                { expiresIn: "-1s" }
            );
            const res = await request(app)
                .get("/api/transactions")
                .set("Authorization", `Bearer ${expiredToken}`);
            assert.equal(res.status, 401);
            assert.equal(res.body.message, "Session expired. Please log in again.");
        });

        it("should authenticate successfully when valid token is passed in Cookie header", async () => {
            transactionModel.find = async (query) => {
                assert.deepEqual(query, { user: userAId });
                return [];
            };
            const res = await request(app)
                .get("/api/transactions")
                .set("Cookie", [`token=${userAToken}`]);
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, []);
        });

        it("should authenticate successfully when valid token is passed in Authorization Bearer header", async () => {
            transactionModel.find = async (query) => {
                assert.deepEqual(query, { user: userAId });
                return [];
            };
            const res = await request(app)
                .get("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`);
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, []);
        });
    });

    describe("GET /api/transactions", () => {
        it("should return a 200 and transactions strictly scoped to authenticated user", async () => {
            const mockData = [
                { _id: "65f1a2b3c4d5e6f7a8b9c0d1", user: userAId, description: "Salary", amount: 5000, type: "income", category: "Salary" },
                { _id: "65f1a2b3c4d5e6f7a8b9c0d2", user: userAId, description: "Groceries", amount: 150, type: "expense", category: "Food & Dining" }
            ];
            transactionModel.find = async (query) => {
                assert.deepEqual(query, { user: userAId });
                return mockData;
            };

            const res = await request(app)
                .get("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.equal(res.body.length, 2);
            assert.equal(res.body[0].description, "Salary");
        });

        it("should handle unexpected database errors gracefully with a 500 status", async () => {
            transactionModel.find = async () => {
                throw new Error("Simulated database read failure");
            };

            const res = await request(app)
                .get("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 500);
            assert.equal(res.body.message, "An unexpected server error occurred.");
            assert.equal(res.body.stack, undefined);
        });
    });

    describe("POST /api/transactions", () => {
        it("should create a valid transaction bound to authenticated user and return 201", async () => {
            const newTx = {
                description: "Freelance Project",
                amount: 1250,
                type: "income",
                category: "Freelance"
            };

            transactionModel.create = async (doc) => {
                assert.equal(doc.user, userAId, "Transaction must be bound to authenticated user's ID");
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c0d3",
                    ...doc,
                    createdAt: new Date().toISOString()
                };
            };

            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send(newTx);

            assert.equal(res.status, 201);
            assert.equal(res.body.description, "Freelance Project");
            assert.equal(res.body.amount, 1250);
            assert.equal(res.body.type, "income");
            assert.equal(res.body.category, "Freelance");
            assert.equal(res.body.user, userAId);
            assert.ok(res.body._id);
        });

        it("should reject creation when required description is missing", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ amount: 100, type: "expense" });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /description/i);
            assert.ok(Array.isArray(res.body.errors));
        });

        it("should reject creation with zero amount", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Invalid", amount: 0, type: "expense" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Amount must be a positive number greater than 0.");
        });

        it("should reject creation with negative amount", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Invalid", amount: -25, type: "expense" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Amount must be a positive number greater than 0.");
        });

        it("should reject creation with non-numeric string amount", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Invalid", amount: "not-a-number", type: "expense" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Amount must be a valid positive number.");
        });

        it("should reject creation with invalid transaction type", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Invalid Type", amount: 100, type: "crypto" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Transaction type must be 'income' or 'expense'.");
        });

        it("should reject creation with invalid category", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Invalid Cat", amount: 100, type: "expense", category: "Gambling" });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Please provide a supported transaction category.");
        });
    });

    describe("PUT /api/transactions/:id", () => {
        const validId = "65f1a2b3c4d5e6f7a8b9c0d1";

        it("should successfully update an existing transaction owned by user and return 200", async () => {
            const updated = {
                _id: validId,
                user: userAId,
                description: "Updated Office Rent",
                amount: 1400,
                type: "expense",
                category: "Housing & Rent"
            };

            transactionModel.findOneAndUpdate = async (filter, update) => {
                assert.deepEqual(filter, { _id: validId, user: userAId });
                return { ...updated, ...update };
            };

            const res = await request(app)
                .put(`/api/transactions/${validId}`)
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Updated Office Rent", amount: 1400 });

            assert.equal(res.status, 200);
            assert.equal(res.body.description, "Updated Office Rent");
            assert.equal(res.body.amount, 1400);
        });

        it("should return 400 when ID format is not a valid 24-character hex ObjectId", async () => {
            const res = await request(app)
                .put("/api/transactions/invalid-id-123")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ amount: 50 });

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Invalid transaction ID");
        });

        it("should return 404 when transaction is not found or not owned by user", async () => {
            transactionModel.findOneAndUpdate = async () => null;

            const res = await request(app)
                .put(`/api/transactions/${validId}`)
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Nonexistent" });

            assert.equal(res.status, 404);
            assert.equal(res.body.message, "Transaction not found");
        });

        it("should return 400 when update payload is completely empty", async () => {
            const res = await request(app)
                .put(`/api/transactions/${validId}`)
                .set("Authorization", `Bearer ${userAToken}`)
                .send({});

            assert.equal(res.status, 400);
            assert.match(res.body.message, /at least one field/i);
        });
    });

    describe("DELETE /api/transactions/:id", () => {
        const validId = "65f1a2b3c4d5e6f7a8b9c0d1";

        it("should delete an existing transaction owned by user and return 200", async () => {
            const deleted = {
                _id: validId,
                user: userAId,
                description: "Old Expense",
                amount: 30,
                type: "expense"
            };

            transactionModel.findOneAndDelete = async (filter) => {
                assert.deepEqual(filter, { _id: validId, user: userAId });
                return deleted;
            };

            const res = await request(app)
                .delete(`/api/transactions/${validId}`)
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body._id, validId);
        });

        it("should return 400 when ID format is invalid", async () => {
            const res = await request(app)
                .delete("/api/transactions/999")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 400);
            assert.equal(res.body.message, "Invalid transaction ID");
        });

        it("should return 404 when transaction does not exist or belongs to another user", async () => {
            transactionModel.findOneAndDelete = async () => null;

            const res = await request(app)
                .delete(`/api/transactions/${validId}`)
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 404);
            assert.equal(res.body.message, "Transaction not found");
        });
    });

    describe("Multi-User Data Isolation & Ownership Security", () => {
        const txAId = "65f1a2b3c4d5e6f7a8b9c001";
        const txBId = "65f1a2b3c4d5e6f7a8b9c002";

        const txA = { _id: txAId, user: userAId, description: "User A Transaction", amount: 100, type: "expense" };
        const txB = { _id: txBId, user: userBId, description: "User B Transaction", amount: 200, type: "income" };

        it("User A cannot see User B transactions on GET /api/transactions", async () => {
            transactionModel.find = async (query) => {
                assert.deepEqual(query, { user: userAId });
                return [txA];
            };

            const res = await request(app)
                .get("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.length, 1);
            assert.equal(res.body[0].description, "User A Transaction");
        });

        it("User B cannot see User A transactions on GET /api/transactions", async () => {
            transactionModel.find = async (query) => {
                assert.deepEqual(query, { user: userBId });
                return [txB];
            };

            const res = await request(app)
                .get("/api/transactions")
                .set("Authorization", `Bearer ${userBToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.length, 1);
            assert.equal(res.body[0].description, "User B Transaction");
        });

        it("User A cannot update User B transaction (returns 404 without leaking record existence)", async () => {
            transactionModel.findOneAndUpdate = async (filter) => {
                // Because filter requires both _id: txBId and user: userAId, database finds no match
                assert.deepEqual(filter, { _id: txBId, user: userAId });
                return null;
            };

            const res = await request(app)
                .put(`/api/transactions/${txBId}`)
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ description: "Malicious Edit Attempt" });

            assert.equal(res.status, 404);
            assert.equal(res.body.message, "Transaction not found");
        });

        it("User A cannot delete User B transaction (returns 404 without leaking record existence)", async () => {
            transactionModel.findOneAndDelete = async (filter) => {
                // Filter requires both _id: txBId and user: userAId
                assert.deepEqual(filter, { _id: txBId, user: userAId });
                return null;
            };

            const res = await request(app)
                .delete(`/api/transactions/${txBId}`)
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 404);
            assert.equal(res.body.message, "Transaction not found");
        });

        it("POST /api/transactions ignores forged user ID in request body and binds strictly to token user", async () => {
            let capturedDoc;
            transactionModel.create = async (doc) => {
                capturedDoc = doc;
                return { _id: "65f1a2b3c4d5e6f7a8b9c099", ...doc };
            };

            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    description: "Hacker attempt",
                    amount: 50,
                    type: "expense",
                    user: userBId // malicious attempt to attribute transaction to User B
                });

            assert.equal(res.status, 201);
            assert.equal(capturedDoc.user, userAId, "Server must bind to req.user.id and ignore client-supplied user");
        });
    });

    describe("Centralized Error & 404 Handling", () => {
        it("should return 400 with a clean message on malformed JSON payload", async () => {
            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${userAToken}`)
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
