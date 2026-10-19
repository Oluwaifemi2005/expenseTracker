import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { THEME_PALETTES, CURRENCY_CONFIG } from './constants/theme'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from './api/transactionsApi'
import { formatCurrency, formatTxDate } from './utils/formatters'
import { calculateTotals } from './utils/finance'
import DeleteConfirmModal from './components/modals/DeleteConfirmModal'
import AddTransactionModal from './components/modals/AddTransactionModal'
import EditTransactionModal from './components/modals/EditTransactionModal'


const Layout = () => {
    const location = useLocation();

    // Central Transactions State
    const [transactions, setTransactions] = useState([]);
    const [apiStatus, setApiStatus] = useState("Connecting...");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Fetch transactions on mount
    const fetchTransactions = () => {
        getTransactions()
            .then((response) => {
                setTransactions(response.data);
                setApiStatus("Connected to Express API!");
            })
            .catch((error) => {
                console.error("API error:", error);
                setApiStatus("Could not connect to the API");
            });
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

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
    const { income, expense, totalIncome, totalExpense, balance } = calculateTotals(transactions);

    // Currency Formatter bound to the active user currency preference
    const formatCurrencyDisplay = (val) => formatCurrency(val, currency);

    // Create Transaction Handler
    const handleCreateTransaction = async (txData) => {
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

    // Edit Transaction Handler
    const handleUpdateTransaction = async (e) => {
        e.preventDefault();
        if (isUpdating || !editingTransaction) return;

        setIsUpdating(true);
        setEditErrorMessage("");

        try {
            const response = await updateTransaction(editingTransaction._id, editingTransaction);

            setTransactions((prev) =>
                prev.map((item) => (item._id === editingTransaction._id ? response.data : item))
            );

            setEditingTransaction(null);
        } catch (error) {
            const message = error.response?.data?.message || "Failed to update transaction.";
            setEditErrorMessage(message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Delete Transaction Handler
    const confirmDeleteTransaction = async () => {
        if (!transactionToDelete || isDeleting) return;
        setIsDeleting(true);

        try {
            await deleteTransaction(transactionToDelete._id);
            setTransactions((prev) => prev.filter((item) => item._id !== transactionToDelete._id));
            setTransactionToDelete(null);
        } catch (error) {
            console.error("Delete error:", error);
            setErrorMessage("Could not delete transaction. Please try again.");
            setTransactionToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const startEditing = (tx) => {
        setEditingTransaction({
            _id: tx._id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            category: tx.category || "Other"
        });
        setEditErrorMessage("");
    };

    // Header Content based on active route
    const getHeaderInfo = () => {
        switch (location.pathname) {
            case '/transactions':
                return {
                    title: "Transactions",
                    subtitle: "View and manage all your income and expenses in one place."
                };
            case '/analytics':
                return {
                    title: "Financial Analytics & Insights",
                    subtitle: "Real-time cash flow analysis and spending distribution based on your database records."
                };
            case '/settings':
                return {
                    title: "Settings",
                    subtitle: "Manage preferences, regional formatting, and configurations."
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
                    {apiStatus === "Connected to Express API!" ? (
                        <div className="mobile-api-dot connected" title="API Connected" />
                    ) : (
                        <div className="mobile-api-dot disconnected" title={apiStatus} />
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
                    <div className="user-avatar">EA</div>
                    <div className="user-info">
                        <span className="user-name">Emmanuel Alo</span>
                        <span className="user-role">Developer Portfolio</span>
                    </div>
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
                        {apiStatus === "Connected to Express API!" ? (
                            <div className="api-badge api-connected" title="Connected to Express API">
                                <span className="api-dot"></span>
                                <span>Live API Connected</span>
                            </div>
                        ) : apiStatus === "Connecting..." ? (
                            <div className="api-badge api-connecting">
                                <span className="api-dot"></span>
                                <span>Connecting...</span>
                            </div>
                        ) : (
                            <div className="api-badge api-disconnected" title={apiStatus}>
                                <span className="api-dot"></span>
                                <span>API Disconnected</span>
                            </div>
                        )}

                        <button type="button" className="notification-bell" aria-label="Notifications">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            <span className="bell-badge"></span>
                        </button>
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
                        income,
                        expense,
                        totalIncome,
                        totalExpense,
                        balance,
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
                        fetchTransactions
                    }}
                />
            </main>

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
