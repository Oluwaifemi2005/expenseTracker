import React, { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { THEME_PALETTES, CURRENCY_CONFIG } from './constants/theme'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from './api/transactionsApi'
import { getBudgets, createBudget as createBudgetApi, updateBudget as updateBudgetApi, deleteBudget as deleteBudgetApi } from './api/budgetsApi'
import { getGoals, createGoal as createGoalApi, updateGoal as updateGoalApi, deleteGoal as deleteGoalApi, adjustContribution as adjustContributionApi } from './api/goalsApi'
import {
    getRecurringRules,
    createRecurringRule as createRecurringApi,
    updateRecurringRule as updateRecurringApi,
    toggleRecurringStatus as toggleRecurringStatusApi,
    deleteRecurringRule as deleteRecurringApi,
    processDueRecurring
} from './api/recurringApi'
import { formatCurrency, formatTxDate } from './utils/formatters'
import { calculateTotals } from './utils/finance'
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification
} from './api/notificationApi'
import NotificationPopover from './components/NotificationPopover'
import DeleteConfirmModal from './components/modals/DeleteConfirmModal'
import AddTransactionModal from './components/modals/AddTransactionModal'
import EditTransactionModal from './components/modals/EditTransactionModal'
import AuthModal from './components/modals/AuthModal'
import useAuth from './context/useAuth'

const Layout = () => {
    const location = useLocation();

    // Authentication Context
    const {
        user,
        isAuthenticated,
        loading: authLoading,
        logout,
        openLoginModal,
        openRegisterModal
    } = useAuth();

    // Central Transactions State
    const [transactions, setTransactions] = useState([]);
    const [apiStatus, setApiStatus] = useState("Connecting...");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Central Budgets State
    const [budgets, setBudgets] = useState([]);
    const [isBudgetsLoading, setIsBudgetsLoading] = useState(false);

    // Central Savings Goals State
    const [goals, setGoals] = useState([]);
    const [isGoalsLoading, setIsGoalsLoading] = useState(false);

    // Central Recurring Rules State
    const [recurringRules, setRecurringRules] = useState([]);
    const [isRecurringLoading, setIsRecurringLoading] = useState(false);
    const [isProcessingDue, setIsProcessingDue] = useState(false);

    // Central In-App Notifications State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    // Add Modal State (for Cazura + Add Transaction action)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addFormState, setAddFormState] = useState({
        description: "",
        amount: "",
        type: "expense",
        category: "Food & Dining"
    });

    // Edit Modal State
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editErrorMessage, setEditErrorMessage] = useState("");

    // Delete Confirmation State
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // User Settings / Preferences
    const [currency, setCurrency] = useState(() => localStorage.getItem("vaultex_currency") || "NGN");
    const [themeColor, setThemeColor] = useState(() => localStorage.getItem("vaultex_theme") || "slate");
    const [compactView, setCompactView] = useState(() => localStorage.getItem("vaultex_compact") === "true");
    const [showTime, setShowTime] = useState(() => localStorage.getItem("vaultex_show_time") !== "false");

    // Fetch transactions on mount & when auth state changes
    const fetchTransactions = useCallback(() => {
        if (!isAuthenticated || !user) {
            setTransactions([]);
            return;
        }

        getTransactions()
            .then((response) => {
                setTransactions(response.data);
                setApiStatus("Connected to Express API!");
            })
            .catch((error) => {
                console.error("API error:", error);
                if (error.response?.status === 401) {
                    setTransactions([]);
                    setApiStatus("Session expired");
                } else {
                    setApiStatus("Could not connect to the API");
                }
            });
    }, [isAuthenticated, user]);

    // Fetch budgets on mount & when auth state changes
    const fetchBudgets = useCallback(() => {
        if (!isAuthenticated || !user) {
            setBudgets([]);
            return;
        }

        setIsBudgetsLoading(true);
        getBudgets()
            .then((response) => {
                setBudgets(response.data);
            })
            .catch((error) => {
                console.error("Budgets fetch error:", error);
                if (error.response?.status === 401) {
                    setBudgets([]);
                }
            })
            .finally(() => {
                setIsBudgetsLoading(false);
            });
    }, [isAuthenticated, user]);

    // Fetch savings goals on mount & when auth state changes
    const fetchGoals = useCallback(() => {
        if (!isAuthenticated || !user) {
            setGoals([]);
            return;
        }

        setIsGoalsLoading(true);
        getGoals()
            .then((response) => {
                setGoals(response.data);
            })
            .catch((error) => {
                console.error("Goals fetch error:", error);
                if (error.response?.status === 401) {
                    setGoals([]);
                }
            })
            .finally(() => {
                setIsGoalsLoading(false);
            });
    }, [isAuthenticated, user]);

    // Fetch recurring rules on mount & when auth state changes
    const fetchRecurring = useCallback(() => {
        if (!isAuthenticated || !user) {
            setRecurringRules([]);
            return;
        }

        setIsRecurringLoading(true);
        getRecurringRules()
            .then((response) => {
                setRecurringRules(response.data);
            })
            .catch((error) => {
                console.error("Recurring rules fetch error:", error);
                if (error.response?.status === 401) {
                    setRecurringRules([]);
                }
            })
            .finally(() => {
                setIsRecurringLoading(false);
            });
    }, [isAuthenticated, user]);

    useEffect(() => {
        let isCurrent = true;
        if (!isAuthenticated || !user) {
            return;
        }

        getTransactions()
            .then((response) => {
                if (isCurrent) {
                    setTransactions(response.data);
                    setApiStatus("Connected to Express API!");
                }
            })
            .catch((error) => {
                if (isCurrent) {
                    console.error("API error:", error);
                    if (error.response?.status === 401) {
                        setTransactions([]);
                        setApiStatus("Session expired");
                    } else {
                        setApiStatus("Could not connect to the API");
                    }
                }
            });

        getBudgets()
            .then((response) => {
                if (isCurrent) {
                    setBudgets(response.data);
                }
            })
            .catch((error) => {
                if (isCurrent) {
                    console.error("Budgets fetch error:", error);
                    if (error.response?.status === 401) {
                        setBudgets([]);
                    }
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsBudgetsLoading(false);
                }
            });

        getGoals()
            .then((response) => {
                if (isCurrent) {
                    setGoals(response.data);
                }
            })
            .catch((error) => {
                if (isCurrent) {
                    console.error("Goals fetch error:", error);
                    if (error.response?.status === 401) {
                        setGoals([]);
                    }
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsGoalsLoading(false);
                }
            });

        getRecurringRules()
            .then((response) => {
                if (isCurrent) {
                    setRecurringRules(response.data);
                }
            })
            .catch((error) => {
                if (isCurrent) {
                    console.error("Recurring rules fetch error:", error);
                    if (error.response?.status === 401) {
                        setRecurringRules([]);
                    }
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsRecurringLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [isAuthenticated, user]);

    // Apply Theme Color changes to root
    useEffect(() => {
        localStorage.setItem("vaultex_theme", themeColor);
        const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.slate;
        const root = document.documentElement;
        root.style.setProperty("--brand-primary", palette.primary);
        root.style.setProperty("--brand-primary-hover", palette.hover);
        root.style.setProperty("--brand-accent", palette.accent);
        root.style.setProperty("--brand-accent-hover", palette.accentHover);
        root.style.setProperty("--brand-accent-light", palette.accentLight);
        root.style.setProperty("--border-focus", palette.accent);
        root.style.setProperty("--shadow-focus", `0 0 0 3px ${palette.accentRgba}`);
    }, [themeColor]);

    useEffect(() => {
        localStorage.setItem("vaultex_currency", currency);
    }, [currency]);

    useEffect(() => {
        localStorage.setItem("vaultex_compact", compactView);
    }, [compactView]);

    useEffect(() => {
        localStorage.setItem("vaultex_show_time", showTime);
    }, [showTime]);

    // Mobile Navigation Drawer State
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [prevPathname, setPrevPathname] = useState(location.pathname);

    // Auto-close mobile drawer on route change during render
    if (prevPathname !== location.pathname) {
        setPrevPathname(location.pathname);
        setIsMobileNavOpen(false);
    }

    // Financial Calculations
    const {
        income,
        expense,
        totalIncome,
        totalExpense,
        balance,
        savingsRate,
        inflowOutflowRatio,
        averageExpense
    } = calculateTotals(transactions);

    // Currency Formatter bound to the active user currency preference
    const formatCurrencyDisplay = (val) => formatCurrency(val, currency);

    // Create Transaction Handler
    const handleCreateTransaction = async (txData) => {
        if (!isAuthenticated) {
            openLoginModal();
            return false;
        }

        if (isSubmitting) return false;
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const response = await createTransaction(txData);
            setTransactions((prev) => [...prev, response.data]);
            return true;
        } catch (error) {
            const message = error.response?.data?.message || "Failed to add transaction. Please check inputs.";
            setErrorMessage(message);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Add Modal Submission
    const handleAddModalSubmit = async (e) => {
        e.preventDefault();
        const success = await handleCreateTransaction(addFormState);
        if (success) {
            setAddFormState({
                description: "",
                amount: "",
                type: "expense",
                category: "Food & Dining"
            });
            setIsAddModalOpen(false);
        }
    };

    // Start Editing Transaction
    const startEditing = (tx) => {
        if (!isAuthenticated) {
            openLoginModal();
            return;
        }
        setEditErrorMessage("");
        setEditingTransaction({
            ...tx,
            category: tx.category || "Other"
        });
    };

    // Handle Update Transaction
    const handleUpdateTransaction = async (updatedFields) => {
        if (!isAuthenticated) {
            openLoginModal();
            return;
        }

        if (!editingTransaction) return;
        setIsUpdating(true);
        setEditErrorMessage("");

        try {
            const response = await updateTransaction(editingTransaction._id, updatedFields);
            const updated = response.data;

            setTransactions((prev) =>
                prev.map((t) => (t._id === updated._id ? updated : t))
            );
            setEditingTransaction(null);
        } catch (error) {
            const message = error.response?.data?.message || "Failed to update transaction. Please try again.";
            setEditErrorMessage(message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Confirm Delete Transaction
    const confirmDeleteTransaction = async () => {
        if (!isAuthenticated) {
            openLoginModal();
            return;
        }

        if (!transactionToDelete) return;
        setIsDeleting(true);

        try {
            await deleteTransaction(transactionToDelete._id);
            setTransactions((prev) => prev.filter((t) => t._id !== transactionToDelete._id));
            setTransactionToDelete(null);
        } catch (error) {
            console.error("Delete transaction failed:", error);
            setErrorMessage("Failed to delete transaction. Please try again.");
            setTransactionToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    // Budget Handlers
    const handleCreateBudget = async (budgetData) => {
        const response = await createBudgetApi(budgetData);
        setBudgets((prev) => [response.data, ...prev]);
        return response.data;
    };

    const handleUpdateBudget = async (id, budgetData) => {
        const response = await updateBudgetApi(id, budgetData);
        const updated = response.data;
        setBudgets((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
        return updated;
    };

    const handleDeleteBudget = async (id) => {
        await deleteBudgetApi(id);
        setBudgets((prev) => prev.filter((b) => b._id !== id));
    };

    // Savings Goals Handlers
    const handleCreateGoal = async (goalData) => {
        const response = await createGoalApi(goalData);
        setGoals((prev) => [response.data, ...prev]);
        return response.data;
    };

    const handleUpdateGoal = async (id, goalData) => {
        const response = await updateGoalApi(id, goalData);
        const updated = response.data;
        setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
        return updated;
    };

    const handleAdjustContribution = async (id, data) => {
        const response = await adjustContributionApi(id, data);
        const updated = response.data;
        setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
        return updated;
    };

    const handleDeleteGoal = async (id) => {
        await deleteGoalApi(id);
        setGoals((prev) => prev.filter((g) => g._id !== id));
    };

    // Recurring Transaction Handlers
    const handleCreateRecurring = async (ruleData) => {
        const response = await createRecurringApi(ruleData);
        setRecurringRules((prev) => [response.data, ...prev].sort((a, b) => new Date(a.nextOccurrence) - new Date(b.nextOccurrence)));
        return response.data;
    };

    const handleUpdateRecurring = async (id, ruleData) => {
        const response = await updateRecurringApi(id, ruleData);
        const updated = response.data;
        setRecurringRules((prev) => prev.map((r) => (r._id === updated._id ? updated : r)).sort((a, b) => new Date(a.nextOccurrence) - new Date(b.nextOccurrence)));
        return updated;
    };

    const handleToggleRecurringStatus = async (id) => {
        const response = await toggleRecurringStatusApi(id);
        const updated = response.data;
        setRecurringRules((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        return updated;
    };

    const handleDeleteRecurring = async (id) => {
        await deleteRecurringApi(id);
        setRecurringRules((prev) => prev.filter((r) => r._id !== id));
    };

    const handleProcessDue = async () => {
        setIsProcessingDue(true);
        try {
            const response = await processDueRecurring();
            fetchRecurring();
            fetchTransactions();
            return response.data;
        } catch (err) {
            console.error("Failed to process due recurring transactions:", err);
            setErrorMessage(err.response?.data?.message || "Failed to process due recurring transactions");
            throw err;
        } finally {
            setIsProcessingDue(false);
        }
    };

    // In-App Notification Handlers
    const fetchNotifications = useCallback(() => {
        if (!isAuthenticated || !user) {
            return;
        }

        getNotifications()
            .then((response) => {
                if (response.data?.success) {
                    setNotifications(response.data.data || []);
                    setUnreadCount(response.data.unreadCount || 0);
                }
            })
            .catch((error) => {
                if (error.response?.status === 401) {
                    setNotifications([]);
                    setUnreadCount(0);
                }
            });
    }, [isAuthenticated, user]);

    useEffect(() => {
        if (isAuthenticated && user) {
            fetchNotifications();
        }
    }, [fetchNotifications, isAuthenticated, user, transactions, budgets, goals, recurringRules]);

    const handleMarkNotificationRead = async (id) => {
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all notifications as read:", err);
        }
    };

    const handleDismissNotification = async (id) => {
        try {
            await dismissNotification(id);
            const target = notifications.find((n) => n._id === id);
            setNotifications((prev) => prev.filter((n) => n._id !== id));
            if (target && !target.isRead) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error("Failed to dismiss notification:", err);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'VT';
        return name
            .split(' ')
            .map(n => n[0])
            .filter(Boolean)
            .join('')
            .slice(0, 2)
            .toUpperCase();
    };

    // Dynamic Header Info based on active route
    const getHeaderInfo = () => {
        switch (location.pathname) {
            case "/":
                return {
                    title: "Dashboard",
                    subtitle: "Track your income, monitor expenses, and maintain full financial control."
                };
            case "/transactions":
                return {
                    title: "Transactions",
                    subtitle: "View, filter, sort, and manage all your historical income and expense records."
                };
            case "/budgets":
                return {
                    title: "Budgets",
                    subtitle: "Set monthly spending limits by category, track current utilization, and keep expenses on target."
                };
            case "/goals":
                return {
                    title: "Savings Goals",
                    subtitle: "Set financial targets, allocate funds, and track your milestone achievements."
                };
            case "/recurring":
                return {
                    title: "Recurring Transactions",
                    subtitle: "Manage recurring bills, subscriptions, and scheduled income streams with automated tracking."
                };
            case "/analytics":
                return {
                    title: "Analytics",
                    subtitle: "Deep-dive into spending trends, monthly cash flows, and category distributions."
                };
            case "/reports":
                return {
                    title: "Financial Reports",
                    subtitle: "Analyze trends, export transaction summaries, and evaluate financial performance over custom periods."
                };
            case "/settings":
                return {
                    title: "Settings",
                    subtitle: "Configure your currency preferences, brand theme colors, and view options."
                };
            default:
                return {
                    title: "Dashboard",
                    subtitle: "Track your income, monitor expenses, and maintain full financial control."
                };
        }
    };

    const headerInfo = getHeaderInfo();

    return (
        <div className="dashboard-layout">
            {/* Mobile Top App Bar (Visible <= 860px) */}
            <div className="mobile-topbar">
                <div className="mobile-brand">
                    <div className="brand-icon">V</div>
                    <span className="brand-title">Vaultex</span>
                </div>

                <div className="mobile-topbar-actions">
                    {user && (
                        <div className="user-pill-avatar" style={{ width: 26, height: 26, fontSize: '0.7rem' }}>
                            {getInitials(user.name)}
                        </div>
                    )}

                    <button
                        type="button"
                        className="mobile-menu-toggle"
                        onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                        aria-label="Toggle navigation menu"
                        aria-expanded={isMobileNavOpen}
                    >
                        {isMobileNavOpen ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Sidebar Backdrop Overlay on Mobile */}
            {isMobileNavOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setIsMobileNavOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar (Desktop sticky / Mobile slide-out drawer) */}
            <aside className={`dashboard-sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
                <div>
                    <div className="sidebar-brand-wrapper">
                        <div className="sidebar-brand">
                            <div className="brand-icon">V</div>
                            <span className="brand-title">Vaultex</span>
                        </div>
                        <button
                            type="button"
                            className="sidebar-close-btn"
                            onClick={() => setIsMobileNavOpen(false)}
                            aria-label="Close navigation menu"
                        >
                            ✕
                        </button>
                    </div>

                    <nav className="sidebar-nav">
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                            </svg>
                            <span>Dashboard</span>
                        </NavLink>

                        <NavLink
                            to="/transactions"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span>Transactions</span>
                        </NavLink>

                        <NavLink
                            to="/budgets"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8M12 6v2m0 8v2" />
                            </svg>
                            <span>Budgets</span>
                        </NavLink>

                        <NavLink
                            to="/goals"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                            </svg>
                            <span>Savings Goals</span>
                        </NavLink>

                        <NavLink
                            to="/recurring"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                            </svg>
                            <span>Recurring</span>
                        </NavLink>

                        <NavLink
                            to="/analytics"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M18 20V10M12 20V4M6 20v-6" />
                            </svg>
                            <span>Analytics</span>
                        </NavLink>

                        <NavLink
                            to="/reports"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            <span>Reports</span>
                        </NavLink>

                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                            <span>Settings</span>
                        </NavLink>
                    </nav>
                </div>

                <div className="sidebar-user">
                    {user && (
                        <div className="sidebar-auth-section">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="user-avatar">{getInitials(user.name)}</div>
                                <div className="user-info">
                                    <span className="user-name" title={user.name}>{user.name}</span>
                                    <span className="user-role" title={user.email}>{user.email}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="sidebar-signout-btn"
                                onClick={logout}
                                aria-label="Sign out of account"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main">
                {/* Header */}
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1>{headerInfo.title}</h1>
                        <p>{headerInfo.subtitle}</p>
                    </div>

                    <div className="header-right">
                        {user && (
                            <div className="user-profile-menu">
                                <div className="user-profile-pill" title={`Logged in as ${user.email}`}>
                                    <div className="user-pill-avatar">{getInitials(user.name)}</div>
                                    <span>{user.name.split(' ')[0]}</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-signout-subtle"
                                    onClick={logout}
                                    title="Sign Out"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}

                        <div className="notification-bell-container">
                            <button
                                type="button"
                                className={`notification-bell ${isNotificationOpen ? 'active' : ''}`}
                                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                                aria-haspopup="dialog"
                                aria-expanded={isNotificationOpen}
                                onClick={() => setIsNotificationOpen((prev) => !prev)}
                                title="View Notifications"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="bell-badge" aria-hidden="true">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            <NotificationPopover
                                isOpen={isNotificationOpen}
                                onClose={() => setIsNotificationOpen(false)}
                                notifications={notifications}
                                unreadCount={unreadCount}
                                onMarkRead={handleMarkNotificationRead}
                                onMarkAllRead={handleMarkAllNotificationsRead}
                                onDismiss={handleDismissNotification}
                            />
                        </div>
                    </div>
                </header>

                {/* Accessible Error Alert */}
                {errorMessage && (
                    <div className="error-banner" role="alert">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                        <button
                            type="button"
                            className="alert-close-btn"
                            onClick={() => setErrorMessage("")}
                            aria-label="Dismiss error"
                        >
                            ✕
                        </button>
                    </div>
                )}



                {/* Page Outlet: Renders active route */}
                <Outlet
                    context={{
                        transactions,
                        apiStatus,
                        income,
                        expense,
                        totalIncome,
                        totalExpense,
                        balance,
                        savingsRate,
                        inflowOutflowRatio,
                        averageExpense,
                        formatCurrency: formatCurrencyDisplay,
                        formatTxDate,
                        handleCreateTransaction,
                        startEditing,
                        setTransactionToDelete,
                        setIsAddModalOpen,
                        isSubmitting,
                        currency,
                        currencySymbol: CURRENCY_CONFIG[currency]?.symbol || '₦',
                        setCurrency,
                        themeColor,
                        setThemeColor,
                        compactView,
                        setCompactView,
                        showTime,
                        setShowTime,
                        fetchTransactions,
                        budgets,
                        isBudgetsLoading,
                        fetchBudgets,
                        handleCreateBudget,
                        handleUpdateBudget,
                        handleDeleteBudget,
                        goals,
                        isGoalsLoading,
                        fetchGoals,
                        handleCreateGoal,
                        handleUpdateGoal,
                        handleAdjustContribution,
                        handleDeleteGoal,
                        recurringRules,
                        isRecurringLoading,
                        fetchRecurring,
                        handleCreateRecurring,
                        handleUpdateRecurring,
                        handleToggleRecurringStatus,
                        handleDeleteRecurring,
                        handleProcessDue,
                        isProcessingDue,
                        user,
                        isAuthenticated,
                        authLoading,
                        logout,
                        openLoginModal,
                        openRegisterModal,
                        notifications,
                        unreadCount,
                        fetchNotifications
                    }}
                />
            </main>

            {/* ==========================================================================
                Global Authentication Modal
                ========================================================================== */}
            <AuthModal />

            {/* ==========================================================================
                Global Add Transaction Modal (Triggered from Cazura Header)
                ========================================================================== */}
            <AddTransactionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                formState={addFormState}
                setFormState={setAddFormState}
                onSubmit={handleAddModalSubmit}
                isSubmitting={isSubmitting}
                currency={currency}
            />

            {/* ==========================================================================
                Global Edit Transaction Modal (Available on all pages)
                ========================================================================== */}
            <EditTransactionModal
                isOpen={Boolean(editingTransaction)}
                transaction={editingTransaction}
                setTransaction={setEditingTransaction}
                onClose={() => setEditingTransaction(null)}
                onSubmit={handleUpdateTransaction}
                isUpdating={isUpdating}
                errorMessage={editErrorMessage}
                currency={currency}
            />

            {/* ==========================================================================
                Global Delete Confirmation Dialog
                ========================================================================== */}
            <DeleteConfirmModal
                isOpen={Boolean(transactionToDelete)}
                transaction={transactionToDelete}
                onClose={() => setTransactionToDelete(null)}
                onConfirm={confirmDeleteTransaction}
                isDeleting={isDeleting}
                formatCurrency={formatCurrencyDisplay}
            />
        </div>
    )
}

export default Layout
