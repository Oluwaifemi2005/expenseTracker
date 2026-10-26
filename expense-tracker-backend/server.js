require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const goalRoutes = require('./routes/goalRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Render, Railway, Nginx, AWS ALB) in production for IP rate limiting & secure cookies
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Security Headers
app.use(helmet());

// Standard Middlewares
const configuredClientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    ...(configuredClientUrl ? [configuredClientUrl] : [])
]);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (allowedOrigins.has(normalized)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Root health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Expense tracker API is running!' });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/notifications', notificationRoutes);

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