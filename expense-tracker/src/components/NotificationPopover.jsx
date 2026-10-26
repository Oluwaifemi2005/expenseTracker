import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../utils/finance.js';

const NotificationPopover = ({
    isOpen,
    onClose,
    notifications = [],
    unreadCount = 0,
    onMarkRead,
    onMarkAllRead,
    onDismiss
}) => {
    const popoverRef = useRef(null);
    const navigate = useNavigate();

    // Close on Escape key and Click Outside
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                // If clicked outside popover and outside the bell button
                if (!e.target.closest('.notification-bell')) {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleItemClick = (notification) => {
        if (!notification.isRead && onMarkRead) {
            onMarkRead(notification._id);
        }
        if (notification.link) {
            navigate(notification.link);
            onClose();
        }
    };

    return (
        <div
            ref={popoverRef}
            className="notification-popover"
            role="dialog"
            aria-label="Financial Notifications"
            aria-modal="true"
        >
            {/* Popover Header */}
            <div className="popover-header">
                <div className="popover-title-flex">
                    <span className="popover-title">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="popover-unread-badge" aria-label={`${unreadCount} unread`}>
                            {unreadCount} new
                        </span>
                    )}
                </div>

                <div className="popover-header-actions">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            className="btn-mark-all-read"
                            onClick={onMarkAllRead}
                            title="Mark all as read"
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn-close-popover"
                        onClick={onClose}
                        aria-label="Close notifications"
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Notification List */}
            <div className="popover-body">
                {notifications.length > 0 ? (
                    <div className="notification-items-list" role="list">
                        {notifications.map((n) => {
                            const timeStr = formatRelativeTime(n.createdAt);
                            return (
                                <div
                                    key={n._id}
                                    className={`notification-item ${!n.isRead ? 'unread' : 'read'} severity-${n.severity}`}
                                    onClick={() => handleItemClick(n)}
                                    role="listitem"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleItemClick(n);
                                        }
                                    }}
                                >
                                    {/* Indicator Dot */}
                                    {!n.isRead && <span className="unread-dot" aria-label="Unread"></span>}

                                    {/* Severity Icon */}
                                    <div className={`notification-icon-wrapper ${n.severity}`} aria-hidden="true">
                                        {n.severity === 'danger' && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                        )}
                                        {n.severity === 'warning' && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                                <line x1="12" y1="9" x2="12" y2="13" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                        )}
                                        {n.severity === 'success' && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                                <polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                        )}
                                        {n.severity === 'info' && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Text Content */}
                                    <div className="notification-content">
                                        <div className="notification-header-row">
                                            <span className="notification-title">{n.title}</span>
                                            {timeStr && <span className="notification-time">{timeStr}</span>}
                                        </div>
                                        <p className="notification-message">{n.message}</p>
                                    </div>

                                    {/* Dismiss Button */}
                                    <button
                                        type="button"
                                        className="btn-dismiss-notification"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onDismiss) onDismiss(n._id);
                                        }}
                                        aria-label="Dismiss notification"
                                        title="Dismiss"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="popover-empty-state">
                        <div className="empty-state-bell-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </div>
                        <h4 className="empty-title">All caught up!</h4>
                        <p className="empty-subtitle">You have no active financial alerts right now.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPopover;
