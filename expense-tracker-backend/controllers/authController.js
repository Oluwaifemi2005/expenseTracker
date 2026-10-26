require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
    registerSchema,
    loginSchema,
    formatAuthValidationError
} = require('../validators/authValidator');

const getJwtSecret = () => process.env.JWT_SECRET || 'vaultex_jwt_dev_secret_key_change_in_production_12345';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '24h';

/**
 * Returns cookie options matching deployment environment.
 */
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
    };
};

/**
 * Generate a signed JWT for an authenticated user.
 * @param {Object} user
 * @returns {string}
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id ? user._id.toString() : user.id,
            email: user.email,
            name: user.name
        },
        getJwtSecret(),
        { expiresIn: getJwtExpiresIn() }
    );
};

/**
 * POST /api/auth/register
 * Register a new user account with unique email and hashed password.
 */
const register = async (req, res, next) => {
    try {
        const validationResult = registerSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatAuthValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const { name, email, password } = validationResult.data;

        // Check if an account already exists with this email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                message: 'An account with this email address already exists.'
            });
        }

        // Create user (password will be hashed by pre-save hook)
        const newUser = await User.create({
            name,
            email,
            password
        });

        const token = generateToken(newUser);

        // Attach HTTP-only cookie
        res.cookie('token', token, getCookieOptions());

        return res.status(201).json({
            message: 'User registered successfully.',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            },
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/login
 * Authenticate user credentials and return session token.
 */
const login = async (req, res, next) => {
    try {
        const validationResult = loginSchema.safeParse(req.body);
        if (!validationResult.success) {
            const { message, errors } = formatAuthValidationError(validationResult.error);
            return res.status(400).json({ message, errors });
        }

        const { email, password } = validationResult.data;

        // Find user by normalized email and explicitly select password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            // Generic message to prevent email enumeration
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        // Compare password hash
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        const token = generateToken(user);

        // Attach HTTP-only cookie
        res.cookie('token', token, getCookieOptions());

        return res.status(200).json({
            message: 'Logged in successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/logout
 * Invalidate session by clearing the HTTP-only cookie.
 */
const logout = async (req, res) => {
    res.clearCookie('token', {
        ...getCookieOptions(),
        maxAge: 0
    });

    return res.status(200).json({
        message: 'Logged out successfully.'
    });
};

/**
 * GET /api/auth/me
 * Retrieve the currently authenticated user profile from token/cookie.
 */
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(401).json({
                message: 'User account not found.'
            });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    getMe,
    generateToken,
    getCookieOptions
};
