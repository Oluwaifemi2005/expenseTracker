const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../server");
const recurringModel = require("../models/RecurringTransaction");
const transactionModel = require("../models/Transaction");
const { JWT_SECRET } = require("../middleware/auth");
const {
    toOccurrenceKey,
    getNextOccurrenceDate,
    isOccurrencePastEndDate
} = require("../utils/recurrenceUtils");

describe("Recurring Transactions API Integration & Schedule Tests (Isolated Mock Layer)", () => {
    let origRecurringFind;
    let origRecurringCreate;
    let origRecurringFindOne;
    let origRecurringFindOneAndDelete;
    let origTxFind;
    let origTxFindOne;
    let origTxCreate;
    let origCronSecret;

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
        origRecurringFind = recurringModel.find;
        origRecurringCreate = recurringModel.create;
        origRecurringFindOne = recurringModel.findOne;
        origRecurringFindOneAndDelete = recurringModel.findOneAndDelete;
        origTxFind = transactionModel.find;
        origTxFindOne = transactionModel.findOne;
        origTxCreate = transactionModel.create;
        origCronSecret = process.env.CRON_SECRET;

        // Verify safety rule: tests must never connect to live MongoDB Atlas
        assert.notEqual(
            mongoose.connection.readyState,
            1,
            "CRITICAL SAFETY VIOLATION: Test suite must not be connected to a live database."
        );
    });

    afterEach(() => {
        recurringModel.find = origRecurringFind;
        recurringModel.create = origRecurringCreate;
        recurringModel.findOne = origRecurringFindOne;
        recurringModel.findOneAndDelete = origRecurringFindOneAndDelete;
        transactionModel.find = origTxFind;
        transactionModel.findOne = origTxFindOne;
        transactionModel.create = origTxCreate;
        process.env.CRON_SECRET = origCronSecret;
    });

    describe("1. Pure Schedule Advancement & Anchor Day Tests", () => {
        it("should format dates to consistent YYYY-MM-DD occurrence keys", () => {
            const key = toOccurrenceKey(new Date("2026-11-05T14:30:00.000Z"));
            assert.equal(key, "2026-11-05");
        });

        it("should advance weekly schedules exactly 7 days", () => {
            const start = new Date("2026-10-01T00:00:00.000Z");
            const next = getNextOccurrenceDate(start, "weekly", 1);
            assert.equal(toOccurrenceKey(next), "2026-10-08");
        });

        it("should preserve day-of-month anchor across short months (Jan 31 -> Feb 28 -> Mar 31)", () => {
            // Non-leap year 2025
            const jan31 = new Date("2025-01-31T00:00:00.000Z");
            const feb = getNextOccurrenceDate(jan31, "monthly", 31);
            assert.equal(toOccurrenceKey(feb), "2025-02-28");

            // From Feb 28, advancing with anchorDay=31 should return to March 31!
            const mar = getNextOccurrenceDate(feb, "monthly", 31);
            assert.equal(toOccurrenceKey(mar), "2025-03-31");

            // From March 31, April has 30 days -> April 30
            const apr = getNextOccurrenceDate(mar, "monthly", 31);
            assert.equal(toOccurrenceKey(apr), "2025-04-30");

            // From April 30, May has 31 days -> May 31
            const may = getNextOccurrenceDate(apr, "monthly", 31);
            assert.equal(toOccurrenceKey(may), "2025-05-31");
        });

        it("should correctly handle leap years (Feb 29 on leap year, Feb 28 on regular year)", () => {
            // Leap year 2024
            const jan31_2024 = new Date("2024-01-31T00:00:00.000Z");
            const feb2024 = getNextOccurrenceDate(jan31_2024, "monthly", 31);
            assert.equal(toOccurrenceKey(feb2024), "2024-02-29");

            // Yearly from Feb 29 leap year
            const feb29_2024 = new Date("2024-02-29T00:00:00.000Z");
            const next2025 = getNextOccurrenceDate(feb29_2024, "yearly", 29);
            assert.equal(toOccurrenceKey(next2025), "2025-02-28"); // non-leap year clamps to 28
            const next2028 = getNextOccurrenceDate(new Date("2027-02-28T00:00:00.000Z"), "yearly", 29);
            assert.equal(toOccurrenceKey(next2028), "2028-02-29"); // leap year returns to 29!
        });

        it("should correctly identify when occurrence exceeds optional endDate", () => {
            const endDate = new Date("2026-12-31T23:59:59.000Z");
            assert.equal(isOccurrencePastEndDate(new Date("2026-12-01"), endDate), false);
            assert.equal(isOccurrencePastEndDate(new Date("2027-01-01"), endDate), true);
            assert.equal(isOccurrencePastEndDate(new Date("2027-01-01"), null), false);
        });
    });

    describe("2. Authentication & Authorization Enforcement", () => {
        it("should reject GET /api/recurring without auth token (401)", async () => {
            const res = await request(app).get("/api/recurring");
            assert.equal(res.status, 401);
        });

        it("should reject POST /api/recurring without auth token (401)", async () => {
            const res = await request(app)
                .post("/api/recurring")
                .send({ name: "Rent", amount: 1200, frequency: "monthly", startDate: "2026-11-01" });
            assert.equal(res.status, 401);
        });

        it("should reject POST /api/recurring/process-due without auth token (401)", async () => {
            const res = await request(app).post("/api/recurring/process-due");
            assert.equal(res.status, 401);
        });

        it("should reject PUT /api/recurring/:id without auth token (401)", async () => {
            const res = await request(app)
                .put("/api/recurring/65f1a2b3c4d5e6f7a8b9c0aa")
                .send({ name: "Updated" });
            assert.equal(res.status, 401);
        });

        it("should reject PATCH /api/recurring/:id/status without auth token (401)", async () => {
            const res = await request(app).patch("/api/recurring/65f1a2b3c4d5e6f7a8b9c0aa/status");
            assert.equal(res.status, 401);
        });

        it("should reject DELETE /api/recurring/:id without auth token (401)", async () => {
            const res = await request(app).delete("/api/recurring/65f1a2b3c4d5e6f7a8b9c0aa");
            assert.equal(res.status, 401);
        });
    });

    describe("3. Multi-User Ownership Isolation", () => {
        it("should only return User A's recurring rules when User A queries GET /api/recurring", async () => {
            let capturedQuery = null;
            recurringModel.find = (query) => {
                capturedQuery = query;
                return {
                    sort: () => Promise.resolve([
                        { _id: "rule1", user: userAId, name: "User A Salary", amount: 5000 }
                    ])
                };
            };

            const res = await request(app)
                .get("/api/recurring")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(capturedQuery.user, userAId);
            assert.equal(res.body.length, 1);
            assert.equal(res.body[0].name, "User A Salary");
        });

        it("should prevent User A from updating User B's recurring rule (returns 404)", async () => {
            recurringModel.findOne = (query) => {
                assert.equal(query.user, userAId);
                return Promise.resolve(null); // Rule belongs to User B, not found for User A
            };

            const res = await request(app)
                .put("/api/recurring/65f1a2b3c4d5e6f7a8b9c0bb")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({ name: "Hacked rule" });

            assert.equal(res.status, 404);
            assert.match(res.body.message, /not found/i);
        });

        it("should prevent User A from deleting User B's recurring rule (returns 404)", async () => {
            recurringModel.findOneAndDelete = (query) => {
                assert.equal(query.user, userAId);
                return Promise.resolve(null);
            };

            const res = await request(app)
                .delete("/api/recurring/65f1a2b3c4d5e6f7a8b9c0bb")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 404);
        });

        it("should strictly scope process-due to the authenticated user", async () => {
            let capturedUserQuery = null;
            recurringModel.find = (query) => {
                capturedUserQuery = query;
                return Promise.resolve([]);
            };

            const res = await request(app)
                .post("/api/recurring/process-due")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(capturedUserQuery.user, userAId);
            assert.equal(capturedUserQuery.status, "active");
        });
    });

    describe("4. Validation & Schema Enforcement", () => {
        it("should reject creation when rule name is empty", async () => {
            const res = await request(app)
                .post("/api/recurring")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "   ",
                    amount: 100,
                    frequency: "monthly",
                    category: "Housing & Rent",
                    startDate: "2026-11-01"
                });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /rule name/i);
        });

        it("should reject creation with zero or negative amount", async () => {
            const resZero = await request(app)
                .post("/api/recurring")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Gym",
                    amount: 0,
                    frequency: "monthly",
                    category: "Personal Care",
                    startDate: "2026-11-01"
                });
            assert.equal(resZero.status, 400);

            const resNegative = await request(app)
                .post("/api/recurring")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Gym",
                    amount: -50,
                    frequency: "monthly",
                    category: "Personal Care",
                    startDate: "2026-11-01"
                });
            assert.equal(resNegative.status, 400);
        });

        it("should reject invalid frequency", async () => {
            const res = await request(app)
                .post("/api/recurring")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Netflix",
                    amount: 15,
                    frequency: "hourly", // invalid
                    category: "Entertainment",
                    startDate: "2026-11-01"
                });
            assert.equal(res.status, 400);
            assert.match(res.body.message, /frequency/i);
        });

        it("should reject when end date is earlier than start date", async () => {
            const res = await request(app)
                .post("/api/recurring")
                .set("Authorization", `Bearer ${userAToken}`)
                .send({
                    name: "Contract",
                    amount: 500,
                    frequency: "monthly",
                    category: "Business",
                    startDate: "2026-12-01",
                    endDate: "2026-11-01" // before start
                });

            assert.equal(res.status, 400);
            assert.match(res.body.message, /end date must be on or after/i);
        });
    });

    describe("5. Idempotent Processing, Concurrency & Duplicate Prevention", () => {
        it("should generate transactions and advance schedule for active due rules", async () => {
            const mockRule = {
                _id: "rule_due_1",
                user: userAId,
                name: "Monthly Internet",
                amount: 60,
                type: "expense",
                category: "Utilities",
                frequency: "monthly",
                startDate: new Date("2026-09-01T00:00:00.000Z"),
                endDate: null,
                anchorDay: 1,
                status: "active",
                nextOccurrence: new Date("2026-10-01T00:00:00.000Z"),
                processedOccurrences: ["2026-09-01"],
                save: async function () { return this; }
            };

            recurringModel.find = () => Promise.resolve([mockRule]);

            let createdTx = null;
            transactionModel.findOne = () => Promise.resolve(null);
            transactionModel.create = (doc) => {
                createdTx = doc;
                return Promise.resolve(doc);
            };

            const res = await request(app)
                .post("/api/recurring/process-due")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.processedRules, 1);
            assert.equal(res.body.generatedTransactions, 1);
            assert.ok(createdTx);
            assert.equal(createdTx.description, "Monthly Internet");
            assert.equal(createdTx.amount, 60);
            assert.equal(createdTx.recurrenceOccurrence, "2026-10-01");
            assert.equal(createdTx.recurringRule, "rule_due_1");
            assert.equal(toOccurrenceKey(mockRule.nextOccurrence), "2026-11-01");
        });

        it("should handle concurrency race safely when transaction was already inserted (E11000 duplicate key)", async () => {
            const mockRule = {
                _id: "rule_race_1",
                user: userAId,
                name: "Bi-Weekly",
                amount: 100,
                type: "expense",
                category: "Food & Dining",
                frequency: "weekly",
                startDate: new Date("2026-10-24T00:00:00.000Z"),
                endDate: null,
                anchorDay: 24,
                status: "active",
                nextOccurrence: new Date("2026-10-24T00:00:00.000Z"),
                processedOccurrences: [],
                save: async function () { return this; }
            };

            recurringModel.find = () => Promise.resolve([mockRule]);

            // First findOne returns null (simulating concurrent insert right before create)
            let callCount = 0;
            transactionModel.findOne = () => {
                callCount++;
                if (callCount > 1) {
                    return Promise.resolve({ _id: "tx_already_there" });
                }
                return Promise.resolve(null);
            };

            // create throws code 11000 duplicate key
            transactionModel.create = () => {
                const err = new Error("E11000 duplicate key error");
                err.code = 11000;
                return Promise.reject(err);
            };

            const res = await request(app)
                .post("/api/recurring/process-due")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            // It safely reconciled without re-throwing or failing!
            assert.ok(mockRule.processedOccurrences.includes("2026-10-24"));
            assert.equal(toOccurrenceKey(mockRule.nextOccurrence), "2026-10-31");
        });

        it("should skip paused rules during process-due", async () => {
            const mockRule = {
                _id: "rule_paused",
                user: userAId,
                name: "Paused Subscription",
                amount: 30,
                type: "expense",
                category: "Entertainment",
                frequency: "monthly",
                startDate: new Date("2026-09-01"),
                anchorDay: 1,
                status: "paused",
                nextOccurrence: new Date("2026-10-01"),
                processedOccurrences: [],
                save: async function () { return this; }
            };

            // DB query for active rules returns nothing because status is paused
            recurringModel.find = () => Promise.resolve([]);

            let createdCalled = false;
            transactionModel.create = () => {
                createdCalled = true;
                return Promise.resolve({});
            };

            const res = await request(app)
                .post("/api/recurring/process-due")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.processedRules, 0);
            assert.equal(createdCalled, false);
        });

        it("should stop processing and mark rule as ended when endDate is reached", async () => {
            const mockRule = {
                _id: "rule_ended",
                user: userAId,
                name: "Temporary Project",
                amount: 200,
                type: "income",
                category: "Freelance",
                frequency: "monthly",
                startDate: new Date("2026-09-01T00:00:00.000Z"),
                endDate: new Date("2026-10-05T00:00:00.000Z"), // Expires before Nov
                anchorDay: 1,
                status: "active",
                nextOccurrence: new Date("2026-10-01T00:00:00.000Z"),
                processedOccurrences: ["2026-09-01"],
                save: async function () { return this; }
            };

            recurringModel.find = () => Promise.resolve([mockRule]);
            transactionModel.findOne = () => Promise.resolve(null);
            transactionModel.create = (doc) => Promise.resolve(doc);

            const res = await request(app)
                .post("/api/recurring/process-due")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.generatedTransactions, 1);
            // Advanced to Nov 01, which is past Oct 05 endDate -> status becomes 'ended'
            assert.equal(mockRule.status, "ended");
        });
    });

    describe("6. Rule Lifecycle & Deletion Preservation", () => {
        it("should toggle status between active and paused", async () => {
            const mockRule = {
                _id: "rule_toggle",
                user: userAId,
                status: "active",
                save: async function () { return this; }
            };

            recurringModel.findOne = () => Promise.resolve(mockRule);

            const res = await request(app)
                .patch("/api/recurring/65f1a2b3c4d5e6f7a8b9c0aa/status")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(mockRule.status, "paused");
        });

        it("should delete recurring rule without deleting existing transactions", async () => {
            recurringModel.findOneAndDelete = () => Promise.resolve({
                _id: "rule_delete",
                user: userAId
            });

            let txDeleteCalled = false;
            transactionModel.deleteMany = () => {
                txDeleteCalled = true;
                return Promise.resolve({});
            };

            const res = await request(app)
                .delete("/api/recurring/65f1a2b3c4d5e6f7a8b9c0aa")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(txDeleteCalled, false, "Existing transactions must NEVER be deleted when a rule is removed");
        });
    });

    describe("7. External Scheduler / Cron Endpoint Security", () => {
        it("should reject cron-process when CRON_SECRET is not configured on server (500/401 fail-closed)", async () => {
            delete process.env.CRON_SECRET;
            const res = await request(app)
                .post("/api/recurring/cron-process")
                .set("x-cron-secret", "some-token");

            assert.equal(res.status, 401);
            assert.match(res.body.message, /unavailable|unauthorized/i);
        });

        it("should reject cron-process when secret header is missing", async () => {
            process.env.CRON_SECRET = "super-secret-cron-token";
            const res = await request(app).post("/api/recurring/cron-process");
            assert.equal(res.status, 401);
        });

        it("should reject cron-process when secret header is incorrect", async () => {
            process.env.CRON_SECRET = "super-secret-cron-token";
            const res = await request(app)
                .post("/api/recurring/cron-process")
                .set("x-cron-secret", "wrong-token");

            assert.equal(res.status, 401);
        });

        it("should allow cron-process when valid x-cron-secret is provided", async () => {
            process.env.CRON_SECRET = "super-secret-cron-token";
            recurringModel.find = () => Promise.resolve([]);

            const res = await request(app)
                .post("/api/recurring/cron-process")
                .set("x-cron-secret", "super-secret-cron-token");

            assert.equal(res.status, 200);
            assert.match(res.body.message, /completed/i);
        });
    });
});
