const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const express = require('express');

const app = require('../server');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { generateToken } = require('../controllers/authController');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { JWT_SECRET } = require('../middleware/auth');

const request = supertest(app);

describe('Security Verification & Regression Audit Test Suite', () => {
    before(() => {
        // Enforce safety: verify we are NOT connected to any live MongoDB Atlas database
        assert.notEqual(
            mongoose.connection.readyState,
            1,
            'CRITICAL SAFETY ERROR: Security tests must execute with mocked database layer and NOT against a live database.'
        );
    });

    afterEach(() => {
        // Restore all mocked methods
        if (User.findOne?.restore) User.findOne.restore();
        if (User.create?.restore) User.create.restore();
        if (User.findById?.restore) User.findById.restore();
        if (Transaction.find?.restore) Transaction.find.restore();
        if (Transaction.findById?.restore) Transaction.findById.restore();
        if (Transaction.findOne?.restore) Transaction.findOne.restore();
        if (Transaction.findOneAndUpdate?.restore) Transaction.findOneAndUpdate.restore();
        if (Transaction.findOneAndDelete?.restore) Transaction.findOneAndDelete.restore();
        if (Transaction.create?.restore) Transaction.create.restore();
    });

    const mockMethod = (obj, method, mockFn) => {
        const original = obj[method];
        obj[method] = mockFn;
        obj[method].restore = () => {
            obj[method] = original;
        };
    };

    describe('1. HTTP Security Headers (Helmet)', () => {
        it('should include nosniff, frameguard, and remove X-Powered-By header', async () => {
            const res = await request.get('/');
            assert.equal(res.status, 200);

            // Helmet headers
            assert.equal(res.headers['x-content-type-options'], 'nosniff');
            assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
            assert.equal(res.headers['x-dns-prefetch-control'], 'off');
            assert.ok(res.headers['content-security-policy']);

            // X-Powered-By should be suppressed
            assert.equal(res.headers['x-powered-by'], undefined);
        });
    });

    describe('2. Authentication Rate Limiting', () => {
        it('should enforce rate limits and return 429 when threshold exceeded', async () => {
            // Build an isolated micro-app with strict rate limiting to verify behavior deterministically
            const testApp = express();
            const strictLimiter = createRateLimiter({
                windowMs: 60 * 1000,
                max: 3,
                message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes.' }
            });

            testApp.post('/test-limit', strictLimiter, (req, res) => {
                res.status(200).json({ ok: true });
            });

            const testReq = supertest(testApp);

            // 3 requests pass
            for (let i = 0; i < 3; i++) {
                const res = await testReq.post('/test-limit');
                assert.equal(res.status, 200);
            }

            // 4th request must be rate limited with 429
            const blockedRes = await testReq.post('/test-limit');
            assert.equal(blockedRes.status, 429);
            assert.equal(blockedRes.body.message, 'Too many authentication attempts from this IP, please try again after 15 minutes.');
        });
    });

    describe('3. Injection & Input Sanitization', () => {
        it('should reject NoSQL injection objects in email or password fields with 400', async () => {
            const nosqlPayloads = [
                { email: { $gt: '' }, password: 'Password123' },
                { email: 'user@example.com', password: { $ne: null } },
                { email: { $regex: '.*' }, password: 'Password123' }
            ];

            for (const payload of nosqlPayloads) {
                const res = await request.post('/api/auth/login').send(payload);
                assert.equal(res.status, 400, `Expected 400 Bad Request for NoSQL payload: ${JSON.stringify(payload)}`);
                assert.ok(res.body.message);
            }
        });

        it('should reject NoSQL injection objects in transaction fields with 400', async () => {
            const token = jwt.sign(
                { id: '65f1a2b3c4d5e6f7a8b9c0aa', email: 'sec@test.com' },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            const invalidPayloads = [
                { description: { $ne: '' }, amount: 100, category: 'Food & Dining', type: 'expense' },
                { description: 'Valid', amount: { $gt: 0 }, category: 'Food & Dining', type: 'expense' },
                { description: 'Valid', amount: 100, category: { $exists: true }, type: 'expense' }
            ];

            for (const payload of invalidPayloads) {
                const res = await request
                    .post('/api/transactions')
                    .set('Authorization', `Bearer ${token}`)
                    .send(payload);

                assert.equal(res.status, 400, `Expected 400 for payload: ${JSON.stringify(payload)}`);
                assert.ok(res.body.errors || res.body.message);
            }
        });
    });

    describe('4. Sensitive Data Exposure & Information Disclosure', () => {
        it('should never expose password or password hash on registration', async () => {
            const savedUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Sec User',
                email: 'sec@test.com'
            };
            mockMethod(User, 'findOne', async () => null);
            mockMethod(User, 'create', async () => savedUser);

            const res = await request.post('/api/auth/register').send({
                name: 'Sec User',
                email: 'sec@test.com',
                password: 'Password123'
            });

            assert.equal(res.status, 201);
            assert.equal(res.body.user.password, undefined);
            assert.equal(JSON.stringify(res.body).includes('password'), false);
        });

        it('should never expose password hash on login or /me endpoint', async () => {
            const userObj = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Sec User',
                email: 'sec@test.com',
                password: '$2a$12$eX4mpL3h45h3dPa55w0rdStr1ngTh4tSh0uldN3v3rB3L34k3d',
                comparePassword: async () => true,
                toJSON: function () {
                    const copy = { ...this };
                    delete copy.password;
                    return copy;
                }
            };

            mockMethod(User, 'findOne', () => ({
                select: async () => userObj
            }));
            mockMethod(User, 'findById', async () => userObj);

            // Test Login
            const loginRes = await request.post('/api/auth/login').send({
                email: 'sec@test.com',
                password: 'Password123'
            });

            assert.equal(loginRes.status, 200);
            assert.equal(loginRes.body.user.password, undefined);
            assert.equal(JSON.stringify(loginRes.body).includes('eX4mpL3h45h'), false);

            // Test /me
            const token = generateToken(userObj);
            const meRes = await request
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            assert.equal(meRes.status, 200);
            assert.equal(meRes.body.user.password, undefined);
            assert.equal(JSON.stringify(meRes.body).includes('eX4mpL3h45h'), false);
        });

        it('should suppress stack traces on unhandled 500 server errors', async () => {
            const token = jwt.sign(
                { id: '65f1a2b3c4d5e6f7a8b9c0aa', email: 'sec@test.com' },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            mockMethod(Transaction, 'find', async () => {
                throw new Error('Simulated internal database crash with secret DB_PASSWORD=hidden_secret');
            });

            const res = await request
                .get('/api/transactions')
                .set('Authorization', `Bearer ${token}`);

            assert.equal(res.status, 500);
            assert.equal(res.body.message, 'An unexpected server error occurred.');
            assert.equal(res.body.stack, undefined);
            assert.equal(JSON.stringify(res.body).includes('hidden_secret'), false);
        });
    });

    describe('5. Strict Multi-User Transaction Ownership Isolation', () => {
        const userA_Id = '65f1a2b3c4d5e6f7a8b9c0aa';
        const userB_Id = '65f1a2b3c4d5e6f7a8b9c0bb';
        const transactionOfUserB_Id = '65f1a2b3c4d5e6f7a8b9c0cc';

        const tokenUserA = jwt.sign(
            { id: userA_Id, email: 'userA@test.com' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        it('should prevent User A from reading User B transactions', async () => {
            mockMethod(Transaction, 'find', async (query) => {
                assert.deepEqual(query, { user: userA_Id });
                return []; // Returns User A's empty list, never User B's transactions
            });

            const res = await request
                .get('/api/transactions')
                .set('Authorization', `Bearer ${tokenUserA}`);

            assert.equal(res.status, 200);
            assert.deepEqual(res.body, []);
        });

        it('should prevent User A from updating User B transaction (returns 404)', async () => {
            mockMethod(Transaction, 'findOneAndUpdate', async (filter) => {
                // In database, transaction belongs to userB_Id.
                // Controller strictly queries { _id, user: req.user.id (userA_Id) }.
                // Since user does not match owner (userB), MongoDB returns null.
                assert.equal(filter.user, userA_Id);
                return null;
            });

            const res = await request
                .put(`/api/transactions/${transactionOfUserB_Id}`)
                .set('Authorization', `Bearer ${tokenUserA}`)
                .send({
                    description: 'Attempted Cross-User Overwrite',
                    amount: 999,
                    category: 'Food & Dining',
                    type: 'expense'
                });

            assert.equal(res.status, 404);
            assert.equal(res.body.message, 'Transaction not found');
        });

        it('should prevent User A from deleting User B transaction (returns 404)', async () => {
            mockMethod(Transaction, 'findOneAndDelete', async (filter) => {
                // Controller strictly queries { _id, user: req.user.id (userA_Id) }.
                // Since user does not match owner (userB), MongoDB returns null.
                assert.equal(filter.user, userA_Id);
                return null;
            });

            const res = await request
                .delete(`/api/transactions/${transactionOfUserB_Id}`)
                .set('Authorization', `Bearer ${tokenUserA}`);

            assert.equal(res.status, 404);
            assert.equal(res.body.message, 'Transaction not found');
        });

        it('should ignore spoofed user field in request body on transaction creation', async () => {
            let capturedDoc = null;
            mockMethod(Transaction, 'create', async (doc) => {
                capturedDoc = doc;
                return { ...doc, _id: new mongoose.Types.ObjectId() };
            });

            const res = await request
                .post('/api/transactions')
                .set('Authorization', `Bearer ${tokenUserA}`)
                .send({
                    description: 'Legit User A Item',
                    amount: 50,
                    category: 'Food & Dining',
                    type: 'expense',
                    user: userB_Id // Spoofed user field
                });

            assert.equal(res.status, 201);
            // Server MUST enforce authenticated user ID and ignore spoofed body user
            assert.equal(String(capturedDoc.user), String(userA_Id));
            assert.notEqual(String(capturedDoc.user), String(userB_Id));
        });
    });

    describe('6. Token & Session Lifecycle Edge Cases', () => {
        it('should reject expired JWT tokens with 401', async () => {
            const expiredToken = jwt.sign(
                { id: '65f1a2b3c4d5e6f7a8b9c0aa', email: 'expired@test.com' },
                JWT_SECRET,
                { expiresIn: '-1s' }
            );

            const res = await request
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            assert.equal(res.status, 401);
            assert.equal(res.body.message, 'Session expired. Please log in again.');
        });

        it('should reject tokens signed with a different secret with 401', async () => {
            const forgedToken = jwt.sign(
                { id: '65f1a2b3c4d5e6f7a8b9c0aa', email: 'forged@test.com' },
                'wrong_untrusted_secret_key',
                { expiresIn: '1h' }
            );

            const res = await request
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${forgedToken}`);

            assert.equal(res.status, 401);
            assert.equal(res.body.message, 'Session invalid or expired. Please log in again.');
        });

        it('should reject malformed Bearer strings with 401', async () => {
            const badHeaders = [
                'Bearer',
                'Bearer ',
                'Token xyz',
                'Basic dXNlcjpwYXNz'
            ];

            for (const header of badHeaders) {
                const res = await request.get('/api/auth/me').set('Authorization', header);
                assert.equal(res.status, 401);
            }
        });
    });

    describe('7. Cross-Origin Resource Sharing (CORS) & Production Policy', () => {
        it('should permit production Vercel frontend with credentials and matching origin', async () => {
            const vercelOrigin = 'https://expense-tracker-coral-one-95.vercel.app';
            const res = await request
                .get('/')
                .set('Origin', vercelOrigin);

            assert.equal(res.status, 200);
            assert.equal(res.headers['access-control-allow-origin'], vercelOrigin);
            assert.equal(res.headers['access-control-allow-credentials'], 'true');
            assert.notEqual(res.headers['access-control-allow-origin'], '*', 'Must never use wildcard origin with credentials');
        });

        it('should allow dynamic Vercel preview deployments for the application', async () => {
            const previewOrigin = 'https://expense-tracker-feat-insights-95.vercel.app';
            const res = await request
                .get('/')
                .set('Origin', previewOrigin);

            assert.equal(res.status, 200);
            assert.equal(res.headers['access-control-allow-origin'], previewOrigin);
            assert.equal(res.headers['access-control-allow-credentials'], 'true');
        });

        it('should permit local development origins', async () => {
            const localOrigin = 'http://localhost:5173';
            const res = await request
                .get('/')
                .set('Origin', localOrigin);

            assert.equal(res.status, 200);
            assert.equal(res.headers['access-control-allow-origin'], localOrigin);
            assert.equal(res.headers['access-control-allow-credentials'], 'true');
        });

        it('should reject unauthorized origins without CORS headers', async () => {
            const unauthorizedOrigin = 'https://malicious-attacker-domain.com';
            const res = await request
                .get('/')
                .set('Origin', unauthorizedOrigin);

            assert.equal(res.status, 200);
            assert.equal(res.headers['access-control-allow-origin'], undefined);
        });

        it('should handle OPTIONS preflight requests for allowed origins', async () => {
            const vercelOrigin = 'https://expense-tracker-coral-one-95.vercel.app';
            const res = await request
                .options('/api/auth/me')
                .set('Origin', vercelOrigin)
                .set('Access-Control-Request-Method', 'GET')
                .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

            assert.ok(res.status === 200 || res.status === 204);
            assert.equal(res.headers['access-control-allow-origin'], vercelOrigin);
            assert.equal(res.headers['access-control-allow-credentials'], 'true');
            assert.ok(res.headers['access-control-allow-methods']);
        });

        it('should configure Helmet with cross-origin resource policy for API usage', async () => {
            const res = await request.get('/');
            assert.equal(res.headers['cross-origin-resource-policy'], 'cross-origin');
        });
    });
});

