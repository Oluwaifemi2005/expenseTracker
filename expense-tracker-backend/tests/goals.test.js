const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../server");
const goalModel = require("../models/Goal");
const { JWT_SECRET } = require("../middleware/auth");

describe("Savings Goals API Integration Tests (Isolated & Mocked Database Layer)", () => {
    let originalFind;
    let originalCreate;
    let originalFindOneAndUpdate;
    let originalFindOneAndDelete;
    let originalFindOne;

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
        originalFind = goalModel.find;
        originalCreate = goalModel.create;
        originalFindOneAndUpdate = goalModel.findOneAndUpdate;
        originalFindOneAndDelete = goalModel.findOneAndDelete;
        originalFindOne = goalModel.findOne;

        // Verify safety rule: tests must never connect to live MongoDB Atlas
        assert.notEqual(
            mongoose.connection.readyState,
            1,
            "CRITICAL SAFETY VIOLATION: Test suite must not be connected to a live database."
        );
    });

    afterEach(() => {
        goalModel.find = originalFind;
        goalModel.create = originalCreate;
        goalModel.findOneAndUpdate = originalFindOneAndUpdate;
        goalModel.findOneAndDelete = originalFindOneAndDelete;
        goalModel.findOne = originalFindOne;
    });

    describe("Authentication & Route Protection", () => {
        it("should reject GET /api/goals without authentication (401)", async () => {
            const res = await request(app).get("/api/goals");
            assert.equal(res.status, 401);
            assert.match(res.body.message, /unauthorized|authentication required|log in/i);
        });

        it("should reject POST /api/goals without authentication (401)", async () => {
            const res = await request(app)
                .post("/api/goals")
                .send({ name: "Emergency Fund", targetAmount: 200000 });
            assert.equal(res.status, 401);
        });

        it("should reject PUT /api/goals/:id without authentication (401)", async () => {
            const res = await request(app)
                .put("/api/goals/65f1a2b3c4d5e6f7a8b9c011")
                .send({ targetAmount: 250000 });
            assert.equal(res.status, 401);
        });

        it("should reject POST /api/goals/:id/adjust without authentication (401)", async () => {
            const res = await request(app)
                .post("/api/goals/65f1a2b3c4d5e6f7a8b9c011/adjust")
                .send({ amount: 10000, type: "add" });
            assert.equal(res.status, 401);
        });

        it("should reject DELETE /api/goals/:id without authentication (401)", async () => {
            const res = await request(app)
                .delete("/api/goals/65f1a2b3c4d5e6f7a8b9c011");
            assert.equal(res.status, 401);
        });
    });

    describe("GET /api/goals", () => {
        it("should retrieve savings goals strictly scoped to the authenticated user", async () => {
            let capturedQuery = null;
            goalModel.find = (query) => {
                capturedQuery = query;
                return {
                    sort: () => Promise.resolve([
                        {
                            _id: "65f1a2b3c4d5e6f7a8b9c011",
                            name: "Emergency Fund",
                            targetAmount: 500000,
                            currentAmount: 150000,
                            targetDate: null,
                            user: userAId
                        }
                    ])
                };
            };

            const res = await request(app)
                .get("/api/goals")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(Array.isArray(res.body), true);
            assert.equal(res.body.length, 1);
            assert.equal(res.body[0].name, "Emergency Fund");
            assert.deepEqual(capturedQuery, { user: userAId });
        });
    });

    describe("POST /api/goals", () => {
        it("should create a valid savings goal and bind it to the authenticated user", async () => {
            let capturedData = null;
            goalModel.create = async (data) => {
                capturedData = data;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c022",
                    ...data,
                    createdAt: new Date().toISOString()
                };
            };

            const res = await request(app)
                .post("/api/goals")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Vacation Fund",
                    targetAmount: 300000,
                    currentAmount: 50000,
                    targetDate: "2026-12-31"
                });

            assert.equal(res.status, 201);
            assert.equal(res.body.name, "Vacation Fund");
            assert.equal(res.body.targetAmount, 300000);
            assert.equal(res.body.currentAmount, 50000);
            assert.equal(capturedData.user, userAId);
        });

        it("should reject goal creation with non-positive target amount", async () => {
            const resNegative = await request(app)
                .post("/api/goals")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Invalid Goal",
                    targetAmount: -1000
                });
            assert.equal(resNegative.status, 400);

            const resZero = await request(app)
                .post("/api/goals")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Zero Goal",
                    targetAmount: 0
                });
            assert.equal(resZero.status, 400);
        });

        it("should reject negative initial currentAmount", async () => {
            const res = await request(app)
                .post("/api/goals")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Negative Balance",
                    targetAmount: 50000,
                    currentAmount: -500
                });
            assert.equal(res.status, 400);
        });

        it("should reject missing or empty name", async () => {
            const res = await request(app)
                .post("/api/goals")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "   ",
                    targetAmount: 50000
                });
            assert.equal(res.status, 400);
        });
    });

    describe("PUT /api/goals/:id", () => {
        it("should update a goal owned by the authenticated user", async () => {
            let capturedFilter = null;
            let capturedUpdate = null;

            goalModel.findOneAndUpdate = async (filter, update) => {
                capturedFilter = filter;
                capturedUpdate = update;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c033",
                    name: "Updated Goal",
                    targetAmount: 400000,
                    currentAmount: 100000,
                    user: userAId
                };
            };

            const res = await request(app)
                .put("/api/goals/65f1a2b3c4d5e6f7a8b9c033")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Updated Goal",
                    targetAmount: 400000
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.name, "Updated Goal");
            assert.equal(res.body.targetAmount, 400000);
            assert.equal(capturedFilter._id, "65f1a2b3c4d5e6f7a8b9c033");
            assert.equal(capturedFilter.user, userAId);
        });

        it("should return 404 when goal does not exist or belongs to another user", async () => {
            goalModel.findOneAndUpdate = async () => null;

            const res = await request(app)
                .put("/api/goals/65f1a2b3c4d5e6f7a8b9c099")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ targetAmount: 750000 });

            assert.equal(res.status, 404);
            assert.match(res.body.message, /goal not found/i);
        });
    });

    describe("POST /api/goals/:id/adjust (Concurrency-Safe Contributions)", () => {
        it("should atomically add funds to a savings goal", async () => {
            let capturedFilter = null;
            let capturedUpdate = null;

            goalModel.findOneAndUpdate = async (filter, update) => {
                capturedFilter = filter;
                capturedUpdate = update;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c044",
                    name: "Car Fund",
                    targetAmount: 1000000,
                    currentAmount: 250000,
                    user: userAId
                };
            };

            const res = await request(app)
                .post("/api/goals/65f1a2b3c4d5e6f7a8b9c044/adjust")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ amount: 50000, type: "add" });

            assert.equal(res.status, 200);
            assert.deepEqual(capturedFilter, { _id: "65f1a2b3c4d5e6f7a8b9c044", user: userAId });
            assert.deepEqual(capturedUpdate, { $inc: { currentAmount: 50000 } });
        });

        it("should atomically subtract funds when balance is sufficient", async () => {
            let capturedFilter = null;
            let capturedUpdate = null;

            goalModel.findOneAndUpdate = async (filter, update) => {
                capturedFilter = filter;
                capturedUpdate = update;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c044",
                    name: "Car Fund",
                    targetAmount: 1000000,
                    currentAmount: 150000,
                    user: userAId
                };
            };

            const res = await request(app)
                .post("/api/goals/65f1a2b3c4d5e6f7a8b9c044/adjust")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ amount: 50000, type: "subtract" });

            assert.equal(res.status, 200);
            assert.equal(capturedFilter._id, "65f1a2b3c4d5e6f7a8b9c044");
            assert.equal(capturedFilter.user, userAId);
            assert.deepEqual(capturedFilter.currentAmount, { $gte: 50000 });
            assert.deepEqual(capturedUpdate, { $inc: { currentAmount: -50000 } });
        });

        it("should prevent simultaneous withdrawals from making currentAmount negative (400)", async () => {
            // findOneAndUpdate with { currentAmount: { $gte: 50000 } } fails due to insufficient balance
            goalModel.findOneAndUpdate = async () => null;

            // findOne confirms goal exists with only 20000 balance
            goalModel.findOne = async () => ({
                _id: "65f1a2b3c4d5e6f7a8b9c044",
                name: "Car Fund",
                currentAmount: 20000,
                user: userAId
            });

            const res = await request(app)
                .post("/api/goals/65f1a2b3c4d5e6f7a8b9c044/adjust")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ amount: 50000, type: "subtract" });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /insufficient funds/i);
        });

        it("should reject non-positive contribution amounts (400)", async () => {
            const resZero = await request(app)
                .post("/api/goals/65f1a2b3c4d5e6f7a8b9c044/adjust")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ amount: 0, type: "add" });
            assert.equal(resZero.status, 400);

            const resNegative = await request(app)
                .post("/api/goals/65f1a2b3c4d5e6f7a8b9c044/adjust")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ amount: -100, type: "add" });
            assert.equal(resNegative.status, 400);
        });
    });

    describe("DELETE /api/goals/:id", () => {
        it("should delete a goal owned by the authenticated user", async () => {
            let capturedFilter = null;
            goalModel.findOneAndDelete = async (filter) => {
                capturedFilter = filter;
                return {
                    _id: "65f1a2b3c4d5e6f7a8b9c055",
                    name: "Old Goal",
                    user: userAId
                };
            };

            const res = await request(app)
                .delete("/api/goals/65f1a2b3c4d5e6f7a8b9c055")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(capturedFilter._id, "65f1a2b3c4d5e6f7a8b9c055");
            assert.equal(capturedFilter.user, userAId);
        });

        it("should return 404 when trying to delete another user's goal", async () => {
            goalModel.findOneAndDelete = async () => null;

            const res = await request(app)
                .delete("/api/goals/65f1a2b3c4d5e6f7a8b9c055")
                .set("Authorization", `Bearer ${userBToken}`);

            assert.equal(res.status, 404);
            assert.match(res.body.message, /goal not found/i);
        });
    });
});
