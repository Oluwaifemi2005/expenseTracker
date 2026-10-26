const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Savings goal must belong to a user'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Goal name is required'],
        trim: true,
        maxlength: [100, 'Goal name cannot exceed 100 characters']
    },
    targetAmount: {
        type: Number,
        required: [true, 'Target amount is required'],
        min: [0.01, 'Target amount must be greater than 0']
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: [0, 'Saved amount cannot be negative']
    },
    targetDate: {
        type: Date,
        default: null
    },
    category: {
        type: String,
        trim: true,
        default: 'General'
    }
}, { timestamps: true });

const goalModel = mongoose.model("Goal", goalSchema);
module.exports = goalModel;
