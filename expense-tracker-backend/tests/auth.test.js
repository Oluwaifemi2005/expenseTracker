const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const {
    registerSchema,
    loginSchema,
    formatAuthValidationError
} = require('../validators/authValidator');
const { generateToken } = require('../controllers/authController');

const request = supertest(app);

describe('Authentication Foundation Tests (Isolated & Mocked Database Layer)', () => {
    before(() => {
        // Enforce safety: verify we are NOT connected to any live MongoDB Atlas database
        assert.notEqual(
            mongoose.connection.readyState,
            1,
            'CRITICAL SAFETY ERROR: Tests must run with mocked database methods and NOT against a live MongoDB connection.'
        );
    });

    afterEach(() => {
        // Restore all mocked methods on User
        if (User.findOne.restore) User.findOne.restore();
        if (User.create.restore) User.create.restore();
        if (User.findById.restore) User.findById.restore();
    });

    // Helper to mock User methods
    const mockMethod = (obj, method, mockFn) => {
        const original = obj[method];
        obj[method] = mockFn;
        obj[method].restore = () => {
            obj[method] = original;
        };
    };

    describe('Auth Input Validators (Zod)', () => {
        it('should pass on valid registration payload', () => {
            const input = {
                name: 'John Doe',
                email: 'John.Doe@example.COM',
                password: 'Password123'
            };
            const result = registerSchema.safeParse(input);
            assert.equal(result.success, true);
            assert.equal(result.data.email, 'john.doe@example.com'); // normalized
            assert.equal(result.data.name, 'John Doe');
        });

        it('should reject missing or empty name', () => {
            const result = registerSchema.safeParse({
                name: '   ',
                email: 'test@example.com',
                password: 'Password123'
            });
            assert.equal(result.success, false);
            const { message } = formatAuthValidationError(result.error);
            assert.equal(message, 'Name must be at least 1 character long.');
        });

        it('should reject invalid email format', () => {
            const result = registerSchema.safeParse({
                name: 'John',
                email: 'not-an-email',
                password: 'Password123'
            });
            assert.equal(result.success, false);
            const { message } = formatAuthValidationError(result.error);
            assert.equal(message, 'Please provide a valid email address.');
        });

        it('should reject passwords shorter than 8 characters', () => {
            const result = registerSchema.safeParse({
                name: 'John',
                email: 'test@example.com',
                password: 'Pass1'
            });
            assert.equal(result.success, false);
            const { message } = formatAuthValidationError(result.error);
            assert.equal(message, 'Password must be at least 8 characters long.');
        });

        it('should reject passwords without numbers', () => {
            const result = registerSchema.safeParse({
                name: 'John',
                email: 'test@example.com',
                password: 'PasswordOnly'
            });
            assert.equal(result.success, false);
            const { message } = formatAuthValidationError(result.error);
            assert.equal(message, 'Password must contain at least one letter and one number.');
        });

        it('should validate login input', () => {
            const valid = loginSchema.safeParse({
                email: 'USER@Test.com',
                password: 'Password123'
            });
            assert.equal(valid.success, true);
            assert.equal(valid.data.email, 'user@test.com');

            const invalid = loginSchema.safeParse({
                email: 'invalid-email',
                password: ''
            });
            assert.equal(invalid.success, false);
        });
    });

    describe('User Model Password Hashing & Serialization', () => {
        it('should hash plaintext passwords before save and compare correctly', async () => {
            const plainPassword = 'SecurePassword456';
            const user = new User({
                name: 'Alice',
                email: 'alice@example.com',
                password: plainPassword
            });

            // Simulate pre-save hook
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(plainPassword, salt);

            assert.notEqual(user.password, plainPassword);
            assert.equal(user.password.startsWith('$2'), true);

            const isMatch = await user.comparePassword(plainPassword);
            assert.equal(isMatch, true);

            const isWrongMatch = await user.comparePassword('WrongPassword');
            assert.equal(isWrongMatch, false);
        });

        it('should strip password from JSON representation', () => {
            const user = new User({
                name: 'Bob',
                email: 'bob@example.com',
                password: '$2a$12$hashedPasswordExample'
            });

            const json = user.toJSON();
            assert.equal(json.password, undefined);
            assert.equal(json.name, 'Bob');
            assert.equal(json.email, 'bob@example.com');
        });
    });

    describe('POST /api/auth/register', () => {
        it('should successfully register a new user and return HTTP-only cookie and sanitized user', async () => {
            const mockSavedUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Charlie Brown',
                email: 'charlie@example.com'
            };

            mockMethod(User, 'findOne', async () => null); // No duplicate
            mockMethod(User, 'create', async () => mockSavedUser);

            const res = await request
                .post('/api/auth/register')
                .send({
                    name: 'Charlie Brown',
                    email: 'Charlie@Example.com',
                    password: 'SecurePassword123'
                });

            assert.equal(res.status, 201);
            assert.equal(res.body.message, 'User registered successfully.');
            assert.equal(res.body.user.name, 'Charlie Brown');
            assert.equal(res.body.user.email, 'charlie@example.com');
            assert.equal(res.body.user.password, undefined); // Password never leaked
            assert.ok(res.body.token);

            // Verify Set-Cookie header contains token and HttpOnly
            const cookies = res.headers['set-cookie'];
            assert.ok(cookies);
            const tokenCookie = cookies.find((c) => c.startsWith('token='));
            assert.ok(tokenCookie);
            assert.ok(tokenCookie.toLowerCase().includes('httponly'));
        });

        it('should return 409 Conflict if email already exists', async () => {
            mockMethod(User, 'findOne', async () => ({
                _id: new mongoose.Types.ObjectId(),
                email: 'existing@example.com'
            }));

            const res = await request
                .post('/api/auth/register')
                .send({
                    name: 'Existing User',
                    email: 'existing@example.com',
                    password: 'Password123'
                });

            assert.equal(res.status, 409);
            assert.equal(res.body.message, 'An account with this email address already exists.');
        });

        it('should return 400 Bad Request if validation fails', async () => {
            const res = await request
                .post('/api/auth/register')
                .send({
                    name: '',
                    email: 'bad-email',
                    password: 'short'
                });

            assert.equal(res.status, 400);
            assert.ok(res.body.errors);
            assert.ok(res.body.message);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should successfully log in with valid credentials and return HTTP-only cookie', async () => {
            const userId = new mongoose.Types.ObjectId();
            const mockUser = {
                _id: userId,
                name: 'Diana Prince',
                email: 'diana@example.com',
                password: '$2a$12$someHashedPassword',
                comparePassword: async (pwd) => pwd === 'ValidPassword123'
            };

            mockMethod(User, 'findOne', () => ({
                select: async () => mockUser
            }));

            const res = await request
                .post('/api/auth/login')
                .send({
                    email: 'diana@example.com',
                    password: 'ValidPassword123'
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.message, 'Logged in successfully.');
            assert.equal(res.body.user.name, 'Diana Prince');
            assert.equal(res.body.user.email, 'diana@example.com');
            assert.equal(res.body.user.password, undefined);
            assert.ok(res.body.token);

            const cookies = res.headers['set-cookie'];
            assert.ok(cookies);
            const tokenCookie = cookies.find((c) => c.startsWith('token='));
            assert.ok(tokenCookie);
            assert.ok(tokenCookie.toLowerCase().includes('httponly'));
        });

        it('should return 401 Unauthorized with generic message on wrong password', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                email: 'diana@example.com',
                password: '$2a$12$someHashedPassword',
                comparePassword: async () => false
            };

            mockMethod(User, 'findOne', () => ({
                select: async () => mockUser
            }));

            const res = await request
                .post('/api/auth/login')
                .send({
                    email: 'diana@example.com',
                    password: 'WrongPassword123'
                });

            assert.equal(res.status, 401);
            assert.equal(res.body.message, 'Invalid email or password.');
        });

        it('should return 401 Unauthorized with generic message on nonexistent email', async () => {
            mockMethod(User, 'findOne', () => ({
                select: async () => null
            }));

            const res = await request
                .post('/api/auth/login')
                .send({
                    email: 'unknown@example.com',
                    password: 'AnyPassword123'
                });

            assert.equal(res.status, 401);
            assert.equal(res.body.message, 'Invalid email or password.');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should clear the token cookie on logout', async () => {
            const res = await request.post('/api/auth/logout');
            assert.equal(res.status, 200);
            assert.equal(res.body.message, 'Logged out successfully.');

            const cookies = res.headers['set-cookie'];
            assert.ok(cookies);
            const tokenCookie = cookies.find((c) => c.startsWith('token='));
            assert.ok(tokenCookie);
            // Expired or cleared cookie contains expires=Thu, 01 Jan 1970 or Max-Age=0
            assert.ok(
                tokenCookie.includes('Max-Age=0') ||
                tokenCookie.includes('1970') ||
                tokenCookie.startsWith('token=;')
            );
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return user profile when authenticated via Bearer token', async () => {
            const userId = new mongoose.Types.ObjectId();
            const mockUser = {
                _id: userId,
                name: 'Bruce Wayne',
                email: 'bruce@wayne.com'
            };

            const token = generateToken(mockUser);
            mockMethod(User, 'findById', async () => mockUser);

            const res = await request
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.name, 'Bruce Wayne');
            assert.equal(res.body.user.email, 'bruce@wayne.com');
        });

        it('should return user profile when authenticated via cookie', async () => {
            const userId = new mongoose.Types.ObjectId();
            const mockUser = {
                _id: userId,
                name: 'Clark Kent',
                email: 'clark@dailyplanet.com'
            };

            const token = generateToken(mockUser);
            mockMethod(User, 'findById', async () => mockUser);

            const res = await request
                .get('/api/auth/me')
                .set('Cookie', [`token=${token}`]);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.name, 'Clark Kent');
            assert.equal(res.body.user.email, 'clark@dailyplanet.com');
        });

        it('should return 401 Unauthorized when no credentials provided', async () => {
            const res = await request.get('/api/auth/me');
            assert.equal(res.status, 401);
            assert.equal(res.body.message, 'Authentication required. Please log in.');
        });

        it('should return 401 Unauthorized on tampered/invalid token', async () => {
            const res = await request
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid_tampered_token');

            assert.equal(res.status, 401);
            assert.equal(res.body.message, 'Session invalid or expired. Please log in again.');
        });
    });
});
