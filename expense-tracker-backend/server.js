const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const transactionRoutes = require('./routes/transactionRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Root health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Expense tracker API is running!' });
});

// Mount modular API routes
app.use('/api/transactions', transactionRoutes);

// Centralized 404 handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

// Connect to MongoDB Atlas and start server only when executed directly
if (require.main === module) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    });
}

module.exports = app;