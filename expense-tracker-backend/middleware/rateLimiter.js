const rateLimit = require('express-rate-limit');

/**
 * Authentication rate limiter to protect login and registration against
 * brute-force attacks and credential stuffing.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'test' ? 100 : 10, // 10 attempts per 15 min window in production/dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
    }
});

/**
 * Factory for creating custom rate limiters (used for security regression testing)
 */
const createRateLimiter = (options = {}) => {
    return rateLimit({
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            message: 'Too many requests, please try again later.'
        },
        ...options
    });
};

module.exports = {
    authLimiter,
    createRateLimiter
};
