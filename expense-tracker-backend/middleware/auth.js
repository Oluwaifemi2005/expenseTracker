require('dotenv').config();
const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'vaultex_jwt_dev_secret_key_change_in_production_12345';

/**
 * Authentication middleware that verifies credentials on protected routes.
 * Checks HTTP-only cookie first, falls back to Authorization: Bearer <token>.
 * Rejects unauthenticated, expired, or tampered requests with 401 Unauthorized.
 */
const requireAuth = (req, res, next) => {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    // 2. Check Authorization Bearer header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Reject missing credentials
    if (!token) {
        return res.status(401).json({
            message: 'Authentication required. Please log in.'
        });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, getJwtSecret());

        // Attach verified identity to request (never trust client-supplied ID in body/params)
        req.user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name
        };

        return next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Session expired. Please log in again.'
            });
        }

        return res.status(401).json({
            message: 'Session invalid or expired. Please log in again.'
        });
    }
};

module.exports = {
    requireAuth,
    getJwtSecret,
    get JWT_SECRET() {
        return getJwtSecret();
    }
};
