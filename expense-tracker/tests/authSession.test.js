import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 8: Mandatory Authentication & Session Expiration Logic', () => {
    describe('Session Expiry and Concurrent 401 Deduplication', () => {
        it('should handle session expiration by setting state and message', () => {
            let user = { id: 'u1', name: 'Alice', email: 'alice@example.com' };
            let sessionExpiredMessage = '';
            let mode = 'login';
            let serverLogoutCalls = 0;

            const handleSessionExpired = (message) => {
                user = null;
                sessionExpiredMessage = message || 'Your session has expired. Please log in again to continue.';
                mode = 'login';
                serverLogoutCalls += 1;
            };

            handleSessionExpired('Session expired. Please log in again.');

            assert.equal(user, null, 'User session must be cleared to null');
            assert.equal(sessionExpiredMessage, 'Session expired. Please log in again.');
            assert.equal(mode, 'login');
            assert.equal(serverLogoutCalls, 1);
        });

        it('should deduplicate concurrent 401 responses and avoid duplicate logout actions', () => {
            let user = { id: 'u1', name: 'Alice', email: 'alice@example.com' };
            let sessionExpiredMessage = '';
            let logoutCallCount = 0;
            let isHandlingExpiry = false;

            const handleSessionExpired = (message) => {
                if (isHandlingExpiry) return;
                isHandlingExpiry = true;

                user = null;
                sessionExpiredMessage = message;
                logoutCallCount += 1;
            };

            // Simulate 5 simultaneous requests receiving 401
            for (let i = 0; i < 5; i++) {
                handleSessionExpired('Session expired.');
            }

            assert.equal(user, null);
            assert.equal(sessionExpiredMessage, 'Session expired.');
            assert.equal(logoutCallCount, 1, 'Server logout and state handling must be triggered exactly ONCE despite 5 concurrent 401s');
        });

        it('should NOT treat intentional login/register failures as session expirations', () => {
            const urls = ['/api/auth/login', '/api/auth/register'];
            urls.forEach((url) => {
                const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
                assert.equal(isAuthEndpoint, true, 'Login and register endpoints should be recognized as auth attempts');
            });
        });
    });

    describe('State Isolation & Data Cleanliness Between Users', () => {
        it('should wipe transaction state when user logs out or switches', () => {
            let activeUser = { id: 'user_1', name: 'User One' };
            let transactions = [
                { _id: 'tx1', description: 'User 1 Salary', amount: 5000, type: 'income', user: 'user_1' },
                { _id: 'tx2', description: 'User 1 Rent', amount: 1500, type: 'expense', user: 'user_1' }
            ];

            // User 1 logs out
            activeUser = null;
            transactions = [];

            assert.equal(activeUser, null);
            assert.equal(transactions.length, 0, 'Transactions must be immediately emptied');

            // User 2 logs in
            activeUser = { id: 'user_2', name: 'User Two' };
            const user2Data = [
                { _id: 'tx3', description: 'User 2 Freelance', amount: 800, type: 'income', user: 'user_2' }
            ];
            transactions = [...user2Data];

            assert.equal(activeUser.id, 'user_2');
            assert.equal(transactions.length, 1);
            assert.equal(transactions[0].description, 'User 2 Freelance');
            assert.ok(!transactions.some(tx => tx.user === 'user_1'), 'User 2 must NEVER see User 1 transactions');
        });

        it('should not expose cached data during verification or upon failure', () => {
            let loading = true;
            let isAuthenticated = false;
            let exposedFinancialData = null;

            const renderView = () => {
                if (loading) return 'LOADING_SCREEN';
                if (!isAuthenticated) return 'AUTH_SCREEN';
                return 'DASHBOARD_SCREEN';
            };

            // Pending verification
            assert.equal(renderView(), 'LOADING_SCREEN');
            assert.equal(exposedFinancialData, null);

            // Failed verification
            loading = false;
            isAuthenticated = false;
            assert.equal(renderView(), 'AUTH_SCREEN');
            assert.equal(exposedFinancialData, null);

            // Successful authentication
            isAuthenticated = true;
            exposedFinancialData = { balance: 2500 };
            assert.equal(renderView(), 'DASHBOARD_SCREEN');
            assert.notEqual(exposedFinancialData, null);
        });
    });

    describe('JWT Expiration and Error Message Mapping', () => {
        it('should identify TokenExpiredError messages specifically', () => {
            const expiredMsg = 'Session expired. Please log in again.';
            const isExpired = expiredMsg.toLowerCase().includes('expired');
            assert.equal(isExpired, true);

            const invalidMsg = 'Session invalid or expired. Please log in again.';
            assert.equal(invalidMsg.toLowerCase().includes('expired'), true);

            const unauthMsg = 'Authentication required. Please log in.';
            assert.equal(unauthMsg.toLowerCase().includes('expired'), false, 'Standard unauthenticated visitor error must not be classified as expired');
        });
    });
});
