import apiClient from './client.js';

/**
 * Fetches active notifications and unread count for the authenticated user.
 * Automatically synchronizes with live budgets, goals, and recurring rules.
 */
export const getNotifications = () => {
    return apiClient.get('/notifications');
};

/**
 * Marks a single notification as read.
 * 
 * @param {string} id - Notification ID
 */
export const markNotificationAsRead = (id) => {
    return apiClient.patch(`/notifications/${id}/read`);
};

/**
 * Marks all active notifications as read for the authenticated user.
 */
export const markAllNotificationsAsRead = () => {
    return apiClient.patch('/notifications/read-all');
};

/**
 * Dismisses a notification for the authenticated user.
 * 
 * @param {string} id - Notification ID
 */
export const dismissNotification = (id) => {
    return apiClient.patch(`/notifications/${id}/dismiss`);
};
