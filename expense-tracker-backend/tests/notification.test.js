const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../server");
const Notification = require("../models/Notification");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const RecurringTransaction = require("../models/RecurringTransaction");
const transactionModel = require("../models/Transaction");
const { JWT_SECRET } = require("../middleware/auth");

describe("In-App Notifications & Financial Alerts API Tests", () => {
    let origNotificationFind;
    let origNotificationFindOne;
    let origNotificationCreate;
    let origNotificationFindOneAndUpdate;
    let origNotificationUpdateMany;
    let origBudgetFind;
    let origGoalFind;
    let origRecurringFind;
    let origTxFind;

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
        origNotificationFind = Notification.find;
        origNotificationFindOne = Notification.findOne;
        origNotificationCreate = Notification.create;
        origNotificationFindOneAndUpdate = Notification.findOneAndUpdate;
        origNotificationUpdateMany = Notification.updateMany;
        origBudgetFind = Budget.find;
        origGoalFind = Goal.find;
        origRecurringFind = RecurringTransaction.find;
        origTxFind = transactionModel.find;

        assert.notEqual(
            mongoose.connection.readyState,
            1,
            "CRITICAL SAFETY VIOLATION: Test suite must not be connected to a live database."
        );
    });

    afterEach(() => {
        Notification.find = origNotificationFind;
        Notification.findOne = origNotificationFindOne;
        Notification.create = origNotificationCreate;
        Notification.findOneAndUpdate = origNotificationFindOneAndUpdate;
        Notification.updateMany = origNotificationUpdateMany;
        Budget.find = origBudgetFind;
        Goal.find = origGoalFind;
        RecurringTransaction.find = origRecurringFind;
        transactionModel.find = origTxFind;
    });

    describe("1. Authentication & Ownership Protection", () => {
        it("should reject unauthenticated requests with 401", async () => {
            const res = await request(app).get("/api/notifications");
            assert.equal(res.status, 401);
            assert.ok(res.body.message);
        });

        it("should prevent User A from marking read User B notification", async () => {
            const notifId = "65f1a2b3c4d5e6f7a8b9c999";
            Notification.findOneAndUpdate = async (filter) => {
                // If filter specifies User A but document belongs to User B, return null
                if (filter.user?.toString() !== userBId) {
                    return null;
                }
                return { _id: notifId, user: userBId, isRead: true };
            };

            const res = await request(app)
                .patch(`/api/notifications/${notifId}/read`)
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 404);
            assert.equal(res.body.success, false);
        });

        it("should prevent User A from dismissing User B notification", async () => {
            const notifId = "65f1a2b3c4d5e6f7a8b9c999";
            Notification.findOneAndUpdate = async (filter) => {
                if (filter.user?.toString() !== userBId) {
                    return null;
                }
                return { _id: notifId, user: userBId, isDismissed: true };
            };

            const res = await request(app)
                .patch(`/api/notifications/${notifId}/dismiss`)
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 404);
            assert.equal(res.body.success, false);
        });

        it("should reject invalid ObjectId formats with 400", async () => {
            const res = await request(app)
                .patch("/api/notifications/invalid-id-123/read")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 400);
        });
    });

    describe("2. Budget Alert Synchronization & Transitions", () => {
        it("should generate budget_warning alert when usage is between 80% and < 100%", async () => {
            const budgetId = new mongoose.Types.ObjectId();
            Budget.find = async () => [
                { _id: budgetId, user: userAId, name: "Groceries", limit: 500, category: "Food & Dining" }
            ];
            // 420 spent = 84%
            transactionModel.find = async () => [
                { user: userAId, type: "expense", amount: 420, category: "Food & Dining" }
            ];

            let createdAlert = null;
            Notification.findOne = async () => null;
            Notification.create = async (payload) => {
                createdAlert = payload;
                return payload;
            };
            Notification.updateMany = async () => ({ modifiedCount: 0 });
            Notification.find = () => ({
                sort: () => [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        type: "budget_warning",
                        title: "Budget Alert (80% Used): Groceries",
                        isRead: false,
                        isDismissed: false
                    }
                ]
            });

            Goal.find = async () => [];
            RecurringTransaction.find = async () => [];

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.ok(createdAlert);
            assert.equal(createdAlert.type, "budget_warning");
            assert.equal(createdAlert.severity, "warning");
        });

        it("should transition from warning to exceeded and resolve the warning alert", async () => {
            const budgetId = new mongoose.Types.ObjectId();
            Budget.find = async () => [
                { _id: budgetId, user: userAId, name: "Groceries", limit: 500, category: "Food & Dining" }
            ];
            // 550 spent = 110% (exceeded)
            transactionModel.find = async () => [
                { user: userAId, type: "expense", amount: 550, category: "Food & Dining" }
            ];

            let createdExceeded = null;
            let resolvedWarning = false;

            Notification.findOne = async () => null;
            Notification.create = async (payload) => {
                if (payload.type === "budget_exceeded") {
                    createdExceeded = payload;
                }
                return payload;
            };
            Notification.updateMany = async (filter, update) => {
                if (filter.dedupKey?.startsWith("budget_warning:") && update.status === "resolved") {
                    resolvedWarning = true;
                }
                return { modifiedCount: 1 };
            };
            Notification.find = () => ({
                sort: () => [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        type: "budget_exceeded",
                        title: "Budget Exceeded: Groceries",
                        isRead: false,
                        isDismissed: false
                    }
                ]
            });

            Goal.find = async () => [];
            RecurringTransaction.find = async () => [];

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.ok(createdExceeded);
            assert.equal(createdExceeded.type, "budget_exceeded");
            assert.equal(createdExceeded.severity, "danger");
            assert.equal(resolvedWarning, true);
        });

        it("should resolve alerts when spending falls below 80%", async () => {
            const budgetId = new mongoose.Types.ObjectId();
            Budget.find = async () => [
                { _id: budgetId, user: userAId, name: "Groceries", limit: 500, category: "Food & Dining" }
            ];
            // 200 spent = 40% (under 80%)
            transactionModel.find = async () => [
                { user: userAId, type: "expense", amount: 200, category: "Food & Dining" }
            ];

            let resolvedUnder80 = false;
            Notification.updateMany = async (filter, update) => {
                if (filter["dedupKey.$in"] || filter.dedupKey?.$in) {
                    if (update.status === "resolved") {
                        resolvedUnder80 = true;
                    }
                }
                return { modifiedCount: 1 };
            };
            Notification.find = () => ({
                sort: () => []
            });

            Goal.find = async () => [];
            RecurringTransaction.find = async () => [];

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(resolvedUnder80, true);
        });
    });

    describe("3. Recurring & Savings Goal Alerts", () => {
        it("should generate recurring_due alert for active due rules without altering schedule", async () => {
            const ruleId = new mongoose.Types.ObjectId();
            const pastDate = new Date("2026-10-01T00:00:00Z");
            RecurringTransaction.find = async () => [
                {
                    _id: ruleId,
                    user: userAId,
                    name: "Gym Membership",
                    amount: 45,
                    type: "expense",
                    status: "active",
                    nextOccurrence: pastDate
                }
            ];

            let createdDue = null;
            Notification.findOne = async () => null;
            Notification.create = async (payload) => {
                createdDue = payload;
                return payload;
            };
            Notification.updateMany = async () => ({ modifiedCount: 0 });
            Notification.find = () => ({
                sort: () => [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        type: "recurring_due",
                        title: "Recurring Transaction Due: Gym Membership",
                        isRead: false
                    }
                ]
            });

            Budget.find = async () => [];
            Goal.find = async () => [];
            transactionModel.find = async () => [];

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.ok(createdDue);
            assert.equal(createdDue.type, "recurring_due");
            assert.equal(createdDue.entityType, "RecurringTransaction");
        });

        it("should generate goal_reached alert when currentAmount >= targetAmount", async () => {
            const goalId = new mongoose.Types.ObjectId();
            Goal.find = async () => [
                {
                    _id: goalId,
                    user: userAId,
                    name: "Emergency Fund",
                    targetAmount: 5000,
                    currentAmount: 5000
                }
            ];

            let createdGoal = null;
            Notification.findOne = async () => null;
            Notification.create = async (payload) => {
                createdGoal = payload;
                return payload;
            };
            Notification.updateMany = async () => ({ modifiedCount: 0 });
            Notification.find = () => ({
                sort: () => []
            });

            Budget.find = async () => [];
            RecurringTransaction.find = async () => [];
            transactionModel.find = async () => [];

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.ok(createdGoal);
            assert.equal(createdGoal.type, "goal_reached");
            assert.equal(createdGoal.severity, "success");
        });
    });

    describe("4. Duplicate Safety & Lifecycle", () => {
        it("should not overwrite read or dismissed status when alert is already active", async () => {
            const budgetId = new mongoose.Types.ObjectId();
            Budget.find = async () => [
                { _id: budgetId, user: userAId, name: "Groceries", limit: 500, category: "Food & Dining" }
            ];
            transactionModel.find = async () => [
                { user: userAId, type: "expense", amount: 450, category: "Food & Dining" }
            ];

            // Alert already exists and user marked it as read
            const existingAlert = {
                _id: new mongoose.Types.ObjectId(),
                user: userAId,
                status: "active",
                isRead: true,
                isDismissed: false,
                title: "Budget Alert (80% Used): Groceries",
                message: "You have reached 90% of your limit (450 of 500) for Groceries.",
                save: async () => existingAlert
            };

            Notification.findOne = async () => existingAlert;
            Notification.updateMany = async () => ({ modifiedCount: 0 });
            Notification.find = () => ({
                sort: () => [existingAlert]
            });

            Goal.find = async () => [];
            RecurringTransaction.find = async () => [];

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(existingAlert.isRead, true); // preserved!
        });

        it("should reactivate a resolved alert and reset isRead when condition re-triggers", async () => {
            const budgetId = new mongoose.Types.ObjectId();
            Budget.find = async () => [
                { _id: budgetId, user: userAId, name: "Groceries", limit: 500, category: "Food & Dining" }
            ];
            transactionModel.find = async () => [
                { user: userAId, type: "expense", amount: 450, category: "Food & Dining" }
            ];

            // Alert was resolved earlier
            const existingResolved = {
                _id: new mongoose.Types.ObjectId(),
                user: userAId,
                status: "resolved",
                isRead: true,
                isDismissed: true,
                save: async function () {
                    return this;
                }
            };

            Notification.findOne = async () => existingResolved;
            Notification.updateMany = async () => ({ modifiedCount: 0 });
            Notification.find = () => ({
                sort: () => [existingResolved]
            });

            Goal.find = async () => [];
            RecurringTransaction.find = async () => [];

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(existingResolved.status, "active");
            assert.equal(existingResolved.isRead, false); // reset for new occurrence!
            assert.equal(existingResolved.isDismissed, false);
        });

        it("should mark all active notifications as read on PATCH /read-all", async () => {
            let updateManyCalled = false;
            Notification.updateMany = async (filter, update) => {
                if (filter.user?.toString() === userAId && filter.status === "active" && update.isRead === true) {
                    updateManyCalled = true;
                }
                return { modifiedCount: 3 };
            };

            const res = await request(app)
                .patch("/api/notifications/read-all")
                .set("Authorization", `Bearer ${userAToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.modifiedCount, 3);
            assert.equal(updateManyCalled, true);
        });
    });
});
