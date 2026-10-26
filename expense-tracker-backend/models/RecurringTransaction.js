const mongoose = require("mongoose");
const { VALID_CATEGORIES } = require("../validators/transactionValidator");

const recurringTransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Recurring rule must belong to a user'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Rule name is required'],
        trim: true,
        maxlength: [100, 'Rule name cannot exceed 100 characters']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be greater than 0']
    },
    type: {
        type: String,
        enum: ['expense', 'income'],
        default: 'expense',
        required: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        enum: {
            values: VALID_CATEGORIES,
            message: 'Please provide a supported transaction category'
        }
    },
    frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'yearly'],
        required: [true, 'Frequency is required']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        default: null
    },
    anchorDay: {
        type: Number,
        min: 1,
        max: 31,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'ended'],
        default: 'active',
        index: true
    },
    lastProcessedDate: {
        type: Date,
        default: null
    },
    nextOccurrence: {
        type: Date,
        required: true,
        index: true
    },
    processedOccurrences: [{
        type: String // Normalized calendar occurrence date key 'YYYY-MM-DD'
    }]
}, { timestamps: true });

// Compound index to quickly find active due rules per user
recurringTransactionSchema.index({ user: 1, status: 1, nextOccurrence: 1 });

const recurringTransactionModel = mongoose.model("RecurringTransaction", recurringTransactionSchema);
module.exports = recurringTransactionModel;
