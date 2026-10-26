const Notification = require("../models/Notification");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const RecurringTransaction = require("../models/RecurringTransaction");
const transactionModel = require("../models/Transaction");
const { isValidObjectId } = require("../validators/transactionValidator");

/**
 * Synchronizes financial alert notifications for the given user against live data.
 * Purely declarative and idempotent: creates, activates, or resolves alerts as conditions change.
 * Never executes financial transactions or modifies recurring schedules.
 * 
 * @param {string} userId - Authenticated user ID
 * @param {Date} [referenceDate=new Date()] - Deterministic reference date
 */
const syncUserNotifications = async (userId, referenceDate = new Date()) => {
    const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
        ? new Date(referenceDate)
        : new Date();

    const year = ref.getFullYear();
    const month = ref.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 1. Synchronize Budgets
    const budgets = await Budget.find({ user: userId });
    const budgetIds = budgets.map((b) => b._id.toString());

    // Fetch transactions strictly within the current calendar month for this user
    const monthExpenses = await transactionModel.find({
        user: userId,
        type: 'expense',
        $or: [
            { date: { $gte: monthStart, $lte: monthEnd } },
            { date: { $exists: false }, createdAt: { $gte: monthStart, $lte: monthEnd } }
        ]
    });

    for (const budget of budgets) {
        let spent = 0;
        for (const tx of monthExpenses) {
            if (budget.category === 'All Categories' || tx.category === budget.category) {
                const amt = Number(tx.amount);
                if (Number.isFinite(amt) && amt > 0) {
                    spent += amt;
                }
            }
        }
        spent = Math.round(spent * 100) / 100;
        const usagePercent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;

        const warningKey = `budget_warning:${budget._id}:${monthKey}`;
        const exceededKey = `budget_exceeded:${budget._id}:${monthKey}`;

        if (usagePercent >= 100) {
            // Exceeded alert applies at >= 100%
            await upsertOrReactivateNotification({
                user: userId,
                type: 'budget_exceeded',
                title: `Budget Exceeded: ${budget.name}`,
                message: `You have spent ${spent} of your ${budget.limit} limit (${Math.round(usagePercent)}%) for ${budget.name} this month.`,
                severity: 'danger',
                entityId: budget._id,
                entityType: 'Budget',
                link: '/budgets',
                dedupKey: exceededKey
            });

            // Resolve any active warning so warning and exceeded never appear simultaneously
            await Notification.updateMany(
                { user: userId, dedupKey: warningKey, status: 'active' },
                { status: 'resolved' }
            );
        } else if (usagePercent >= 80) {
            // Warning applies between 80% and < 100%
            await upsertOrReactivateNotification({
                user: userId,
                type: 'budget_warning',
                title: `Budget Alert (80% Used): ${budget.name}`,
                message: `You have reached ${Math.round(usagePercent)}% of your limit (${spent} of ${budget.limit}) for ${budget.name}.`,
                severity: 'warning',
                entityId: budget._id,
                entityType: 'Budget',
                link: '/budgets',
                dedupKey: warningKey
            });

            // Resolve exceeded if spending dropped back down
            await Notification.updateMany(
                { user: userId, dedupKey: exceededKey, status: 'active' },
                { status: 'resolved' }
            );
        } else {
            // Under 80%: resolve both warning and exceeded for this budget
            await Notification.updateMany(
                { user: userId, dedupKey: { $in: [warningKey, exceededKey] }, status: 'active' },
                { status: 'resolved' }
            );
        }
    }

    // Resolve any active budget alerts whose parent budget was deleted
    await Notification.updateMany(
        {
            user: userId,
            entityType: 'Budget',
            status: 'active',
            entityId: { $nin: budgetIds }
        },
        { status: 'resolved' }
    );

    // 2. Synchronize Recurring Transactions
    const recurringRules = await RecurringTransaction.find({ user: userId });
    const recurringIds = recurringRules.map((r) => r._id.toString());

    for (const rule of recurringRules) {
        const nextOcc = rule.nextOccurrence ? new Date(rule.nextOccurrence) : null;
        const isDue = rule.status === 'active' && nextOcc && !isNaN(nextOcc.getTime()) && nextOcc.getTime() <= ref.getTime();

        if (isDue) {
            const occKey = nextOcc.toISOString().split('T')[0];
            const dedupKey = `recurring_due:${rule._id}:${occKey}`;

            await upsertOrReactivateNotification({
                user: userId,
                type: 'recurring_due',
                title: `Recurring Transaction Due: ${rule.name}`,
                message: `Your scheduled ${rule.type} of ${rule.amount} for ${rule.name} is due.`,
                severity: 'info',
                entityId: rule._id,
                entityType: 'RecurringTransaction',
                link: '/recurring',
                dedupKey
            });
        } else {
            // If rule is paused, ended, or occurrence advanced into future, resolve active due alerts for this rule
            await Notification.updateMany(
                { user: userId, entityId: rule._id, entityType: 'RecurringTransaction', status: 'active' },
                { status: 'resolved' }
            );
        }
    }

    // Resolve any active recurring alerts whose parent rule was deleted
    await Notification.updateMany(
        {
            user: userId,
            entityType: 'RecurringTransaction',
            status: 'active',
            entityId: { $nin: recurringIds }
        },
        { status: 'resolved' }
    );

    // 3. Synchronize Savings Goals
    const goals = await Goal.find({ user: userId });
    const goalIds = goals.map((g) => g._id.toString());

    for (const goal of goals) {
        const isReached = Number(goal.currentAmount) >= Number(goal.targetAmount);
        const dedupKey = `goal_reached:${goal._id}:${goal.targetAmount}`;

        if (isReached) {
            await upsertOrReactivateNotification({
                user: userId,
                type: 'goal_reached',
                title: `Savings Goal Reached: ${goal.name}!`,
                message: `Congratulations! You reached 100% of your target for ${goal.name} (${goal.currentAmount} saved).`,
                severity: 'success',
                entityId: goal._id,
                entityType: 'Goal',
                link: '/goals',
                dedupKey
            });
        } else {
            // Funds withdrawn or target increased: resolve reached alert
            await Notification.updateMany(
                { user: userId, dedupKey, status: 'active' },
                { status: 'resolved' }
            );
        }
    }

    // Resolve any active goal alerts whose parent goal was deleted
    await Notification.updateMany(
        {
            user: userId,
            entityType: 'Goal',
            status: 'active',
            entityId: { $nin: goalIds }
        },
        { status: 'resolved' }
    );
};

/**
 * Helper to upsert a notification or reactivate it if it was previously resolved.
 * Preserves user's read or dismissed states when already active.
 */
const upsertOrReactivateNotification = async (payload) => {
    const existing = await Notification.findOne({ user: payload.user, dedupKey: payload.dedupKey });

    if (!existing) {
        return await Notification.create({
            ...payload,
            status: 'active',
            isRead: false,
            isDismissed: false
        });
    }

    // If it was resolved and the condition became true again, reactivate it as a new unread alert
    if (existing.status === 'resolved') {
        existing.status = 'active';
        existing.isRead = false;
        existing.isDismissed = false;
        existing.title = payload.title;
        existing.message = payload.message;
        existing.severity = payload.severity;
        return await existing.save();
    }

    // Already active: preserve user's read and dismissed flags, update message/title if needed
    if (existing.message !== payload.message || existing.title !== payload.title) {
        existing.title = payload.title;
        existing.message = payload.message;
        existing.severity = payload.severity;
        return await existing.save();
    }

    return existing;
};

/**
 * GET /api/notifications
 * Synchronizes and retrieves active, non-dismissed notifications for the authenticated user.
 */
const getNotifications = async (req, res) => {
    try {
        await syncUserNotifications(req.user.id);

        const notifications = await Notification.find({
            user: req.user.id,
            status: 'active',
            isDismissed: false
        }).sort({ createdAt: -1 });

        const unreadCount = notifications.filter((n) => !n.isRead).length;

        return res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            data: notifications
        });
    } catch (error) {
        console.error("GET /api/notifications error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notifications."
        });
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read for the authenticated user.
 */
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID format."
            });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error("PATCH /api/notifications/:id/read error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update notification."
        });
    }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all active, non-dismissed notifications as read for the authenticated user.
 */
const markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { user: req.user.id, status: 'active', isDismissed: false },
            { isRead: true }
        );

        return res.status(200).json({
            success: true,
            modifiedCount: result.modifiedCount || 0
        });
    } catch (error) {
        console.error("PATCH /api/notifications/read-all error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read."
        });
    }
};

/**
 * PATCH /api/notifications/:id/dismiss
 * Dismisses a notification for the authenticated user.
 */
const dismissNotification = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID format."
            });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { isDismissed: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error("PATCH /api/notifications/:id/dismiss error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to dismiss notification."
        });
    }
};

module.exports = {
    syncUserNotifications,
    getNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification
};
