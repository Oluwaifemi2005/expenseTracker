/**
 * Global error handling middleware for Express.
 * Ensures consistent JSON error responses without exposing internal paths or stack traces.
 */
const errorHandler = (err, req, res, next) => {
    // Log diagnostic info safely to server console (sanitized, no credentials)
    const errorName = err.name || 'Error';
    const errorMessage = err.message || 'Unknown error';
    console.error(`[API Error] ${req.method} ${req.originalUrl || req.url} - ${errorName}: ${errorMessage}`);

    // Handle JSON syntax errors from express.json()
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            message: "Invalid JSON in request body."
        });
    }

    // Handle request entity too large
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            message: "Request payload too large."
        });
    }

    // Handle Mongoose CastError (e.g., invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            message: `Invalid format for field '${err.path}'.`
        });
    }

    // Handle Mongoose ValidationError
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors || {}).map(e => e.message);
        return res.status(400).json({
            message: messages[0] || "Validation failed on database model.",
            errors: messages
        });
    }

    // Handle MongoDB Connection or Network errors
    if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
        return res.status(503).json({
            message: "Database service temporarily unavailable. Please try again later."
        });
    }

    // Handle MongoDB duplicate key error (code 11000)
    if (err.code === 11000) {
        return res.status(409).json({
            message: "An account with this email address already exists."
        });
    }

    // Generic HTTP status if attached to error, otherwise 500
    const statusCode = typeof err.statusCode === 'number'
        ? err.statusCode
        : (typeof err.status === 'number' ? err.status : 500);

    return res.status(statusCode).json({
        message: statusCode >= 500 ? "An unexpected server error occurred." : errorMessage
    });
};

/**
 * Middleware for unmatched API routes.
 * Returns consistent JSON 404 response instead of default HTML.
 */
const notFoundHandler = (req, res) => {
    return res.status(404).json({
        message: `Route '${req.method} ${req.originalUrl || req.url}' not found.`
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
