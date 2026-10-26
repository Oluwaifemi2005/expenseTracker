const mongoose = require("mongoose");
const { VALID_CATEGORIES } = require("../validators/transactionValidator");

const budgetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Budget must belong to a user'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Budget name is required'],
        trim: true,
        maxlength: [100, 'Budget name cannot exceed 100 characters']
    },
    limit: {
        type: Number,
        required: [true, 'Spending limit is required'],
        min: [0.01, 'Spending limit must be greater than 0']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        enum: {
            values: [...VALID_CATEGORIES, 'All Categories'],
            message: 'Please provide a supported budget category'
        }
    },
    period: {
        type: String,
        enum: ['monthly'],
        default: 'monthly',
        required: true
    }
}, { timestamps: true });

const budgetModel = mongoose.model("Budget", budgetSchema);
module.exports = budgetModel;
