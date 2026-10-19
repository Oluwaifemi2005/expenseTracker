const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    id: {type: Number, default: () => Date.now()},
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
    }
}, {timestamps: true});

const transactionModel = mongoose.model("Transaction", transactionSchema);
module.exports = transactionModel;

// module.exports = mongoose.model("Transaction", transactionSchema);