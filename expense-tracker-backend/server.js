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
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
    app.set('trust proxy', 1);
}

// Security Headers - allow cross-origin resource sharing for API consumption
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Standard Middlewares
const parseOrigins = (raw) => {
    if (!raw) return [];
    return raw
        .split(',')
        .map(url => url.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, ''))
        .filter(Boolean);
};

const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'https://expense-tracker-coral-one-95.vercel.app'
];

const configuredOrigins = parseOrigins(process.env.CLIENT_URL);
const allowedOrigins = new Set([
    ...defaultAllowedOrigins,
    ...configuredOrigins
]);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const normalized = origin.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
    if (allowedOrigins.has(normalized)) return true;

    // Support dynamic Vercel preview and production deployments for this application
    if (/^https:\/\/expense-tracker-[a-z0-9-]+-95\.vercel\.app$/.test(normalized) ||
        /^https:\/\/expense-tracker-[a-z0-9-]+\.vercel\.app$/.test(normalized)) {
        return true;
    }

    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server requests)
        if (!origin || isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
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