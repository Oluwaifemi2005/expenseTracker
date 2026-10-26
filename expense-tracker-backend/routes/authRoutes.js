const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    getMe
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Authentication endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

module.exports = router;
