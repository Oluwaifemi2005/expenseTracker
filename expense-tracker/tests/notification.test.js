import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeTime } from '../src/utils/finance.js';

describe('Frontend Notification & Alert Helper Unit Tests', () => {
    describe('1. formatRelativeTime timestamp formatting', () => {
        it('returns empty string for null, undefined, empty, or invalid date values', () => {
            assert.equal(formatRelativeTime(null), '');
            assert.equal(formatRelativeTime(undefined), '');
            assert.equal(formatRelativeTime(''), '');
            assert.equal(formatRelativeTime('invalid-date-string'), '');
        });

        it('returns "Just now" for dates within the last 60 seconds', () => {
            const now = new Date();
            const recent = new Date(now.getTime() - 15 * 1000);
            assert.equal(formatRelativeTime(recent.toISOString()), 'Just now');
        });

        it('returns "Xm ago" for dates between 1 and 59 minutes ago', () => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            assert.equal(formatRelativeTime(fiveMinutesAgo.toISOString()), '5m ago');
            const fortyMinutesAgo = new Date(now.getTime() - 40 * 60 * 1000);
            assert.equal(formatRelativeTime(fortyMinutesAgo.toISOString()), '40m ago');
        });

        it('returns "Xh ago" for dates between 1 and 23 hours ago', () => {
            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            assert.equal(formatRelativeTime(twoHoursAgo.toISOString()), '2h ago');
            const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            assert.equal(formatRelativeTime(twelveHoursAgo.toISOString()), '12h ago');
        });

        it('returns "Yesterday" for dates between 24 and 47 hours ago', () => {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
            assert.equal(formatRelativeTime(oneDayAgo.toISOString()), 'Yesterday');
        });

        it('returns "Xd ago" for dates between 2 and 6 days ago', () => {
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            assert.equal(formatRelativeTime(threeDaysAgo.toISOString()), '3d ago');
            const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
            assert.equal(formatRelativeTime(fiveDaysAgo.toISOString()), '5d ago');
        });

        it('returns a formatted calendar date for dates 7 days or older', () => {
            const now = new Date();
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const res = formatRelativeTime(twoWeeksAgo.toISOString());
            assert.ok(res.length > 0);
            assert.notEqual(res, 'Just now');
            assert.ok(!res.includes('ago'));
        });
    });

    describe('2. Frontend Notification State Calculations', () => {
        const sampleNotifications = [
            {
                _id: 'n1',
                type: 'budget_warning',
                title: 'Budget Alert',
                message: 'Dining is at 85% of limit',
                severity: 'warning',
                isRead: false,
                isDismissed: false
            },
            {
                _id: 'n2',
                type: 'recurring_due',
                title: 'Recurring Transaction Due',
                message: 'Rent is due today',
                severity: 'info',
                isRead: true,
                isDismissed: false
            },
            {
                _id: 'n3',
                type: 'goal_reached',
                title: 'Goal Achieved!',
                message: 'Emergency Fund goal completed',
                severity: 'success',
                isRead: false,
                isDismissed: false
            },
            {
                _id: 'n4',
                type: 'budget_exceeded',
                title: 'Budget Exceeded',
                message: 'Shopping exceeded limit',
                severity: 'danger',
                isRead: false,
                isDismissed: true
            }
        ];

        it('accurately computes active, non-dismissed unread notification count', () => {
            const activeNotifications = sampleNotifications.filter(n => !n.isDismissed);
            assert.equal(activeNotifications.length, 3);

            const unreadCount = activeNotifications.filter(n => !n.isRead).length;
            assert.equal(unreadCount, 2); // n1 and n3
        });

        it('filters out dismissed alerts from visible notification list', () => {
            const visible = sampleNotifications.filter(n => !n.isDismissed);
            const dismissed = sampleNotifications.filter(n => n.isDismissed);

            assert.equal(visible.length, 3);
            assert.equal(dismissed.length, 1);
            assert.equal(dismissed[0]._id, 'n4');
        });

        it('marks a single notification as read correctly in state copy', () => {
            const targetId = 'n1';
            const updated = sampleNotifications.map(n =>
                n._id === targetId ? { ...n, isRead: true } : n
            );

            const target = updated.find(n => n._id === targetId);
            assert.equal(target.isRead, true);

            const activeUnreadCount = updated.filter(n => !n.isDismissed && !n.isRead).length;
            assert.equal(activeUnreadCount, 1); // Only n3 is left unread
        });

        it('marks all active notifications as read correctly in state copy', () => {
            const updated = sampleNotifications.map(n => ({ ...n, isRead: true }));
            const activeUnreadCount = updated.filter(n => !n.isDismissed && !n.isRead).length;
            assert.equal(activeUnreadCount, 0);
        });

        it('dismisses a notification without deleting from state array', () => {
            const dismissId = 'n3';
            const updated = sampleNotifications.map(n =>
                n._id === dismissId ? { ...n, isDismissed: true } : n
            );

            const remainingVisible = updated.filter(n => !n.isDismissed);
            assert.equal(remainingVisible.length, 2);
            assert.ok(!remainingVisible.some(n => n._id === dismissId));
        });
    });
});
