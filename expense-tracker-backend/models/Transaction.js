const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    id: {type: Number, default: () => Date.now()},
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Transaction must belong to a user'],
        index: true
    },
    description: {type: String, required: true, trim: true},
    amount: {type: Number, required: true, min: [0.01, "Amount must be greater than 0"]},
    type: {type: String, enum: ['expense', 'income'], default: 'expense', required: true},
    category: {
        type: String,
        default: 'Other',
        trim: true,
        enum: [
            'Salary',
            'Freelance',
            'Business',
            'Investments',
            'Gifts',
            'Food & Dining',
            'Transportation',
            'Housing & Rent',
            'Utilities',
            'Entertainment',
            'Healthcare',
            'Shopping',
            'Education',
            'Personal Care',
            'Other'
        ]
    },
    date: {
        type: Date,
        default: Date.now
    },
    recurringRule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecurringTransaction',
        default: null,
        index: true
    },
    recurrenceOccurrence: {
        type: String,
        default: null
    }
}, {timestamps: true});

transactionSchema.index(
    { recurringRule: 1, recurrenceOccurrence: 1 },
    {
        unique: true,
        partialFilterExpression: { recurringRule: { $type: "objectId" } }
    }
);

const transactionModel = mongoose.model("Transaction", transactionSchema);
module.exports = transactionModel;

// module.exports = mongoose.model("Transaction", transactionSchema);