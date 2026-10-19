const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const transactionModel= require("./models/Transaction")

const app = express();
const PORT = process.env.PORT || 5000;


// mongoose.connect(process.env.MONGODB_URI);

app.use(cors());
app.use(express.json());


app.get("/", (req,res) => {
    res.json({message: "Expense tracker API is running!"});
});

app.get("/api/transactions", async (req,res) => {
    try {
        const data = await transactionModel.find()
            return res.status(200).json(data)
        
    } catch (error) {
        console.log('====================================');
        console.log(error);
        console.log('====================================');
        
        return res.status(500).json({message: "Failed to fetch transactions"});
    }
    // res.json(transactions);
});

app.post("/api/transactions", async (req, res) => {
    try {
        const { description, amount, type, category } = req.body;

        const newTransaction = await transactionModel.create({
            description,
            amount: Number(amount),
            type,
            category: category || "Other"
        });

        return res.status(201).json(newTransaction);
    } catch (error) {
        console.error("POST error:", error);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Please provide a valid description, amount, type, and category."
            });
        }

        return res.status(500).json({
            message: "An error occurred while creating transaction"
        });
    }
});

app.put("/api/transactions/:id", async (req, res) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            return res.status(400).json({
                message: "Invalid transaction ID"
            });
        }

        const { description, amount, type, category } = req.body;

        if (description !== undefined && (typeof description !== "string" || !description.trim())) {
            return res.status(400).json({
                message: "Please provide a valid, non-empty description."
            });
        }

        if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
            return res.status(400).json({
                message: "Amount must be a positive number greater than 0."
            });
        }

        if (type !== undefined && !["expense", "income"].includes(type)) {
            return res.status(400).json({
                message: "Transaction type must be 'income' or 'expense'."
            });
        }

        const updateData = {};
        if (description !== undefined) updateData.description = description.trim();
        if (amount !== undefined) updateData.amount = Number(amount);
        if (type !== undefined) updateData.type = type;
        if (category !== undefined) updateData.category = category;

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
        console.error("PUT error:", error);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Invalid transaction update. Please check all fields."
            });
        }

        return res.status(500).json({
            message: "Failed to update transaction"
        });
    }
});

app.delete("/api/transactions/:id", async(req, res) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
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
        console.error("DELETE error:", error);
        return res.status(500).json({ message: "An error occurred while deleting transaction" });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            message: "Invalid JSON in request body"
        });
    }

    return res.status(500).json({
        message: "An unexpected error occurred"
    });
});


const mongoUri = (process.env.MONGODB_URI || "").trim();

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