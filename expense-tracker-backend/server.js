const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const transactionModel = require("./models/Transaction");
const {
    createTransactionSchema,
    updateTransactionSchema,
    isValidObjectId,
    formatValidationError
} = require("./validators/transactionValidator");
const {
    errorHandler,
    notFoundHandler
} = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Expense tracker API is running!" });
});

app.get("/api/transactions", async (req, res, next) => {
    try {
        const data = await transactionModel.find();
        return res.status(200).json(data);
    } catch (error) {
        next(error);
    }
});

app.post("/api/transactions", async (req, res, next) => {
    const validationResult = createTransactionSchema.safeParse(req.body);
    if (!validationResult.success) {
        const { message, errors } = formatValidationError(validationResult.error);
        return res.status(400).json({ message, errors });
    }

    try {
        const { description, amount, type, category } = validationResult.data;

        const newTransaction = await transactionModel.create({
            description,
            amount,
            type,
            category
        });

        return res.status(201).json(newTransaction);
    } catch (error) {
        next(error);
    }
});

app.put("/api/transactions/:id", async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid transaction ID"
            });
        }

        const validationResult = updateTransactionSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const updateData = validationResult.data;

        const updatedTransaction = await transactionModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedTransaction) {
            return res.status(404).json({
                message: "Transaction not found"
            });
        }

        return res.status(200).json(updatedTransaction);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/transactions/:id", async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid transaction ID"
            });
        }
        const deletedTransaction = await transactionModel.findByIdAndDelete(req.params.id);
        if (deletedTransaction) {
            return res.status(200).json(deletedTransaction);
        }
        return res.status(404).json({ message: "Transaction not found" });
    } catch (error) {
        next(error);
    }
});

// Centralized 404 handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

// Connect to database and start server only when executed directly
if (require.main === module) {
    const mongoUri = (process.env.MONGODB_URI || "").trim();

    if (!mongoUri) {
        console.error("FATAL: MONGODB_URI is not set in environment variables.");
        process.exit(1);
    }

    mongoose.connect(mongoUri)
        .then(() => {
            console.log("Connected to MongoDB Atlas!");
            app.listen(PORT, () => {
                console.log(`Server running on http://localhost:${PORT}`);
            });
        })
        .catch((error) => {
            console.error("MongoDB connection failed:", error.message);
        });
}

module.exports = app;