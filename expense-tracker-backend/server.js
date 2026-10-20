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
        const data = await transactionModel.find();
        return res.status(200).json(data);
    } catch (error) {
        console.error("GET error:", error.message || error);
        return res.status(500).json({message: "Failed to fetch transactions"});
    }
});

app.post("/api/transactions", async (req, res) => {
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
        console.error("POST error:", error.message || error);

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
        console.error("PUT error:", error.message || error);

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
        console.error("DELETE error:", error.message || error);
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