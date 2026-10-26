const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../server");
const budgetModel = require("../models/Budget");
const { JWT_SECRET } = require("../middleware/auth");

describe("Budgets API Integration Tests (Isolated & Mocked Database Layer)", () => {
    let originalFind;
    let originalCreate;
    let originalFindOneAndUpdate;
    let originalFindOneAndDelete;

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
        originalFind = budgetModel.find;
        originalCreate = budgetModel.create;
        originalFindOneAndUpdate = budgetModel.findOneAndUpdate;
        originalFindOneAndDelete = budgetModel.findOneAndDelete;

        // Verify safety rule: tests must never connect to live MongoDB Atlas
        assert.notEqual(
            mongoose.connection.readyState,
            1,
            "CRITICAL SAFETY VIOLATION: Test suite must not be connected to a live database."
        );
    });

    afterEach(() => {
        budgetModel.find = originalFind;
        budgetModel.create = originalCreate;
        budgetModel.findOneAndUpdate = originalFindOneAndUpdate;
        budgetModel.findOneAndDelete = originalFindOneAndDelete;
    });

    describe("Authentication & Route Protection", () => {
        it("should reject GET /api/budgets without authentication (401)", async () => {
            const res = await request(app).get("/api/budgets");
            assert.equal(res.status, 401);
            assert.match(res.body.message, /unauthorized|authentication required|log in/i);
        });

        it("should reject POST /api/budgets without authentication (401)", async () => {
            const res = await request(app)
                .post("/api/budgets")
                .send({ name: "Groceries", limit: 50000, category: "Food & Dining" });
            assert.equal(res.status, 401);
        });

        it("should reject PUT /api/budgets/:id without authentication (401)", async () => {
            const res = await request(app)
                .put("/api/budgets/65f1a2b3c4d5e6f7a8b9c011")
                .send({ limit: 60000 });
            assert.equal(res.status, 401);
        });

        it("should reject DELETE /api/budgets/:id without authentication (401)", async () => {
            const res = await request(app)
                .delete("/api/budgets/65f1a2b3c4d5e6f7a8b9c011");
            assert.equal(res.status, 401);
        });
    });

    describe("GET /api/budgets", () => {
        it("should retrieve budgets strictly scoped to the authenticated user", async () => {
            let capturedQuery = null;
            budgetModel.find = (query) => {
                capturedQuery = query;
                return {
                    sort: () => Promise.resolve([
                        {
                            _id: "65f1a2b3c4d5e6f7a8b9c011",
                            name: "Dining Out",
                            limit: 30000,
                            category: "Food & Dining",
                            period: "monthly",
                            user: userAId
                        }
                    ])
                };
            };

            const res = await request(app)
                .get("/api/budgets")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(Array.isArray(res.body), true);
            assert.equal(res.body.length, 1);
            assert.equal(res.body[0].name, "Dining Out");
            assert.deepEqual(capturedQuery, { user: userAId });
        });
    });

    describe("POST /api/budgets", () => {
        it("should create a valid budget and bind it to the authenticated user", async () => {
            let capturedData = null;
            budgetModel.create = async (data) => {
                capturedData = data;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c022",
                    ...data,
                    createdAt: new Date().toISOString()
                };
            };

            const res = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Monthly Fuel",
                    limit: 45000,
                    category: "Transportation",
                    period: "monthly"
                });

            assert.equal(res.status, 201);
            assert.equal(res.body.name, "Monthly Fuel");
            assert.equal(res.body.limit, 45000);
            assert.equal(res.body.category, "Transportation");
            assert.equal(res.body.period, "monthly");
            assert.equal(capturedData.user, userAId);
        });

        it("should reject budget creation with missing required fields", async () => {
            const res = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    limit: 20000
                });

            assert.equal(res.status, 400);
            assert.ok(res.body.message);
        });

        it("should reject non-positive or invalid limit amounts", async () => {
            const resNegative = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Invalid Budget",
                    limit: -500,
                    category: "Shopping"
                });
            assert.equal(resNegative.status, 400);

            const resZero = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Zero Budget",
                    limit: 0,
                    category: "Shopping"
                });
            assert.equal(resZero.status, 400);
        });

        it("should reject unsupported categories", async () => {
            const res = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Crypto Trading",
                    limit: 10000,
                    category: "InvalidUnknownCategory"
                });
            assert.equal(res.status, 400);
        });
    });

    describe("PUT /api/budgets/:id", () => {
        it("should update a budget owned by the authenticated user", async () => {
            let capturedFilter = null;
            let capturedUpdate = null;

            budgetModel.findOneAndUpdate = async (filter, update) => {
                capturedFilter = filter;
                capturedUpdate = update;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c033",
                    name: "Updated Groceries",
                    limit: 65000,
                    category: "Food & Dining",
                    period: "monthly",
                    user: userAId
                };
            };

            const res = await request(app)
                .put("/api/budgets/65f1a2b3c4d5e6f7a8b9c033")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Updated Groceries",
                    limit: 65000
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.name, "Updated Groceries");
            assert.equal(res.body.limit, 65000);
            assert.equal(capturedFilter._id, "65f1a2b3c4d5e6f7a8b9c033");
            assert.equal(capturedFilter.user, userAId);
        });

        it("should reject invalid ObjectId format", async () => {
            const res = await request(app)
                .put("/api/budgets/not-a-valid-id")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ limit: 10000 });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /invalid budget id/i);
        });

        it("should return 404 when budget does not exist or belongs to another user", async () => {
            budgetModel.findOneAndUpdate = async () => null;

            const res = await request(app)
                .put("/api/budgets/65f1a2b3c4d5e6f7a8b9c099")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ limit: 75000 });

            assert.equal(res.status, 404);
            assert.match(res.body.message, /budget not found/i);
        });
    });

    describe("DELETE /api/budgets/:id", () => {
        it("should delete a budget owned by the authenticated user", async () => {
            let capturedFilter = null;

            budgetModel.findOneAndDelete = async (filter) => {
                capturedFilter = filter;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c044",
                    name: "Old Budget",
                    limit: 10000,
                    user: userAId
                };
            };

            const res = await request(app)
                .delete("/api/budgets/65f1a2b3c4d5e6f7a8b9c044")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(capturedFilter._id, "65f1a2b3c4d5e6f7a8b9c044");
            assert.equal(capturedFilter.user, userAId);
        });

        it("should return 404 when trying to delete another user's budget", async () => {
            budgetModel.findOneAndDelete = async () => null;

            const res = await request(app)
                .delete("/api/budgets/65f1a2b3c4d5e6f7a8b9c055")
                .set("Authorization", `Bearer ${userBToken}`);

            assert.equal(res.status, 404);
            assert.match(res.body.message, /budget not found/i);
        });
    });

    describe("Multi-User Ownership & Isolation", () => {
        it("User A cannot access or modify User B's budgets", async () => {
            // User A queries budgets
            budgetModel.find = (query) => {
                assert.equal(query.user, userAId);
                return { sort: () => Promise.resolve([]) };
            };

            await request(app)
                .get("/api/budgets")
                .set("Authorization", `Bearer ${userAToken}`);

            // User B queries budgets
            budgetModel.find = (query) => {
                assert.equal(query.user, userBId);
                return { sort: () => Promise.resolve([]) };
            };

            await request(app)
                .get("/api/budgets")
                .set("Authorization", `Bearer ${userBToken}`);
        });
    });
});
