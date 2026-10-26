const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Notification must belong to a user'],
        index: true
    },
    type: {
        type: String,
        enum: ['budget_warning', 'budget_exceeded', 'recurring_due', 'goal_reached'],
        required: [true, 'Notification type is required']
    },
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true,
        maxlength: [150, 'Title cannot exceed 150 characters']
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'danger', 'success'],
        default: 'info'
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    entityType: {
        type: String,
        enum: ['Budget', 'Goal', 'RecurringTransaction'],
        required: true
    },
    link: {
        type: String,
        default: ''
    },
    dedupKey: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'resolved'],
        default: 'active',
        index: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isDismissed: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

// Compound unique index ensuring idempotency per user and dedupKey
notificationSchema.index({ user: 1, dedupKey: 1 }, { unique: true });

const notificationModel = mongoose.model("Notification", notificationSchema);
module.exports = notificationModel;
