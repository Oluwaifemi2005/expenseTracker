import React from 'react'
import { useState, useEffect } from 'react'
import axios from 'axios'

// Sensible Category Definitions for Personal Finance
const INCOME_CATEGORIES = [
    'Salary',
    'Freelance',
    'Business',
    'Investments',
    'Gifts',
    'Other'
];

const EXPENSE_CATEGORIES = [
    'Food & Dining',
    'Transportation',
    'Housing & Rent',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Education',
    'Personal Care',
    'Other'
];

const Transactions = () => {
    const [newTransaction, setNewTransaction] = useState({
        description: "",
        amount: "",
        type: "expense",
        category: "Food & Dining",
    })
    const [transactions, setTransactions] = useState(() => {
        const savedTransactions = localStorage.getItem("transactions");
        return savedTransactions ? JSON.parse(savedTransactions) : [];
    });

    const [apiStatus, setApiStatus] = useState("Connecting...");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Modal State
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editErrorMessage, setEditErrorMessage] = useState("");

    // Delete Confirmation State
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        axios.get("http://localhost:5000/api/transactions")
        .then((response) => {
            setTransactions(response.data);
            setApiStatus("Connected to Express API!");
        })
        .catch((error) => {
            console.error("API error:", error);
            setApiStatus("Could not connect to the API");
        })
        // localStorage.setItem("transactions", JSON.stringify(transactions))
    }, [])

    const income = transactions.filter((myTransaction) => {
        return myTransaction.type === "income"
    })
    const expense = transactions.filter((myTransaction) => {
        return myTransaction.type === "expense"
    })
    
    const totalIncome = income.reduce((acc, currentValue) =>{
        return acc + currentValue.amount
    }, 0)

    const totalExpense = expense.reduce((acc, currentValue) => {
        return acc + currentValue.amount
    }, 0)

    const balance = totalIncome - totalExpense

    const deleteTransaction = async(id) => {
        try {
            await axios.delete(`http://localhost:5000/api/transactions/${id}`);
            setTransactions((previousTransactions) =>
                previousTransactions.filter((mydata) => mydata._id !== id)
            );
        } catch (error) {
            console.error(
                "Failed to delete transaction:",
                error.response?.data?.message || error.message
            );
            setErrorMessage("Could not delete transaction. Please try again.");
        }
    };

    const confirmDelete = async () => {
        if (!transactionToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteTransaction(transactionToDelete._id);
            setTransactionToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;
        
        setErrorMessage("");
        setIsSubmitting(true);

        const transactionToSend = {
            ...newTransaction,
            amount: Number(newTransaction.amount),
        };

        try {
            const response = await axios.post(
                "http://localhost:5000/api/transactions",
                transactionToSend
            );

            setTransactions((previousTransactions) => [
                ...previousTransactions,
                response.data,
            ]);

            setNewTransaction({
                description: "",
                amount: "",
                type: "expense",
                category: "Food & Dining",
            });

        } catch (error) {
            const message = error.response?.data?.message;

            console.error(
                "Failed to add transaction:",
                message || error.message
            );
            setErrorMessage(
                message || "Could not add transaction. Check your description and amount, then try again."
            );
        }
        finally {
            setIsSubmitting(false);
        }
    };

    // Open Edit Modal with transaction values
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

    // Save Edited Transaction via PUT /api/transactions/:id
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (isUpdating || !editingTransaction) return;

        setIsUpdating(true);
        setEditErrorMessage("");

        try {
            const response = await axios.put(
                `http://localhost:5000/api/transactions/${editingTransaction._id}`,
                {
                    description: editingTransaction.description,
                    amount: Number(editingTransaction.amount),
                    type: editingTransaction.type,
                    category: editingTransaction.category
                }
            );

            // Update in-memory state without page reload
            setTransactions((previousTransactions) =>
                previousTransactions.map((item) =>
                    item._id === editingTransaction._id ? response.data : item
                )
            );

            setEditingTransaction(null);
        } catch (error) {
            const message = error.response?.data?.message;
            console.error("Failed to update transaction:", message || error.message);
            setEditErrorMessage(message || "Could not update transaction. Please check your inputs.");
        } finally {
            setIsUpdating(false);
        }
    };

    // Helper: Format amount with Nigerian Naira (NGN / ₦)
    const formatNaira = (val) => {
        const num = Number(val) || 0;
        const isNegative = num < 0;
        const absVal = Math.abs(num);
        const formatted = absVal.toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return `${isNegative ? '-' : ''}₦${formatted}`;
    };

    // Helper: Format date and time safely from createdAt
    const formatTxDate = (dateStr) => {
        if (!dateStr) return { date: "Recent", time: "Just now" };
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return { date: "Recent", time: "Just now" };
            return {
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };
        } catch {
            return { date: "Recent", time: "Just now" };
        }
    };

    // Dynamic Category List based on current type
    const activeCategories = newTransaction.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const activeEditCategories = editingTransaction && editingTransaction.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div>
                    <div className="sidebar-brand">
                        <div className="brand-icon">V</div>
                        <span className="brand-title">Vaultex</span>
                    </div>

                    <nav className="sidebar-nav">
                        <button type="button" className="nav-item active">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                            </svg>
                            <span>Dashboard</span>
                        </button>
                        <button type="button" className="nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span>Transactions</span>
                        </button>
                        <button type="button" className="nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M18 20V10M12 20V4M6 20v-6" />
                            </svg>
                            <span>Analytics</span>
                        </button>
                        <button type="button" className="nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                            <span>Settings</span>
                        </button>
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
                        <h1>Dashboard</h1>
                        <p>Track your income, monitor expenses, and maintain full financial control.</p>
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
                    </div>
                )}

                {/* 3 Prominent KPI Cards */}
                <section className="kpi-grid" aria-label="Financial Summary Cards">
                    {/* Card 1: Total Balance */}
                    <article className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">Total Balance</span>
                            <span className="kpi-badge badge-neutral">
                                <span>Net Savings</span>
                            </span>
                        </div>
                        <div className="kpi-value">{formatNaira(balance)}</div>
                        <div className="kpi-footer">Overall account position</div>
                    </article>

                    {/* Card 2: Total Income */}
                    <article className="kpi-card kpi-income">
                        <div className="kpi-header">
                            <span className="kpi-title">Monthly Income</span>
                            <span className="kpi-badge badge-income">
                                <span>+{income.length} credits</span>
                            </span>
                        </div>
                        <div className="kpi-value">{formatNaira(totalIncome)}</div>
                        <div className="kpi-footer">Total recorded inflows</div>
                    </article>

                    {/* Card 3: Total Expenses */}
                    <article className="kpi-card kpi-expense">
                        <div className="kpi-header">
                            <span className="kpi-title">Monthly Expenses</span>
                            <span className="kpi-badge badge-expense">
                                <span>-{expense.length} debits</span>
                            </span>
                        </div>
                        <div className="kpi-value">-{formatNaira(totalExpense).replace('-', '')}</div>
                        <div className="kpi-footer">Total recorded outflows</div>
                    </article>
                </section>

                {/* Dashboard Split: Quick Add Form & Recent Transactions */}
                <div className="dashboard-content-grid">
                    {/* Form Card */}
                    <section className="form-card" aria-labelledby="form-heading">
                        <div className="card-title-group">
                            <h2 id="form-heading">Add Transaction</h2>
                            <p>Quickly log income or expense with a category.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="transaction-form">
                            <div className="form-field">
                                <label htmlFor="description" className="form-label">
                                    Description
                                </label>
                                <input
                                    id="description"
                                    className="form-input"
                                    value={newTransaction.description}
                                    type="text"
                                    placeholder="e.g. Monthly Salary, Groceries, Rent"
                                    required
                                    onChange={(e) => setNewTransaction({
                                        ...newTransaction,
                                        description: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="amount" className="form-label">
                                    Amount
                                </label>
                                <div className="input-container">
                                    <span className="currency-symbol-addon">₦</span>
                                    <input
                                        id="amount"
                                        className="form-input has-addon"
                                        value={newTransaction.amount}
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        placeholder="0.00"
                                        required
                                        onChange={(e) => setNewTransaction({
                                            ...newTransaction,
                                            amount: e.target.value
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">
                                    Transaction Type
                                </label>
                                <div className="type-segmented-control" role="group" aria-label="Transaction Type Selection">
                                    <button
                                        type="button"
                                        className={`segmented-btn ${newTransaction.type === "expense" ? "active expense" : ""}`}
                                        onClick={() => {
                                            const defaultCat = EXPENSE_CATEGORIES.includes(newTransaction.category) ? newTransaction.category : "Food & Dining";
                                            setNewTransaction({ ...newTransaction, type: "expense", category: defaultCat });
                                        }}
                                    >
                                        Expense
                                    </button>
                                    <button
                                        type="button"
                                        className={`segmented-btn ${newTransaction.type === "income" ? "active income" : ""}`}
                                        onClick={() => {
                                            const defaultCat = INCOME_CATEGORIES.includes(newTransaction.category) ? newTransaction.category : "Salary";
                                            setNewTransaction({ ...newTransaction, type: "income", category: defaultCat });
                                        }}
                                    >
                                        Income
                                    </button>
                                </div>
                            </div>

                            {/* Category Selector */}
                            <div className="form-field">
                                <label htmlFor="category" className="form-label">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    className="form-select"
                                    value={newTransaction.category}
                                    onChange={(e) => setNewTransaction({
                                        ...newTransaction,
                                        category: e.target.value
                                    })}
                                >
                                    {activeCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner" aria-hidden="true"></span>
                                        <span>Adding...</span>
                                    </>
                                ) : (
                                    <span>Add Transaction</span>
                                )}
                            </button>
                        </form>
                    </section>

                    {/* Recent Transactions Card */}
                    <section className="transactions-card" aria-labelledby="tx-heading">
                        <div className="transactions-card-header">
                            <h2 id="tx-heading">Recent Transactions</h2>
                            <span className="badge-count">{transactions.length} total</span>
                        </div>

                        {transactions.length > 0 ? (
                            <div className="transactions-list">
                                {transactions.map((mydata) => {
                                    const txDate = formatTxDate(mydata.createdAt);
                                    const categoryLabel = mydata.category || "Other";
                                    return (
                                        <div key={mydata._id} className="transaction-row">
                                            <div className="row-left">
                                                <div className={`type-icon-wrapper ${mydata.type}`}>
                                                    {mydata.type === "income" ? (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <path d="M12 19V5M5 12l7-7 7 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <path d="M12 5v14M19 12l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </div>

                                                <div className="row-text">
                                                    <h3 className="tx-title">{mydata.description}</h3>
                                                    <div className="tx-badges-group">
                                                        <span className="tx-category-badge">{categoryLabel}</span>
                                                        <span className="tx-type-tag">{mydata.type}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="row-center">
                                                <span className="tx-date">{txDate.date}</span>
                                                <span className="tx-time">{txDate.time}</span>
                                            </div>

                                            <div className="row-status">
                                                <span className="status-tag">Recorded</span>
                                            </div>

                                            <div className="row-right">
                                                <span className={`tx-amount ${mydata.type === "income" ? "amount-income" : "amount-expense"}`}>
                                                    {mydata.type === "income"
                                                        ? `+${formatNaira(mydata.amount)}`
                                                        : `-${formatNaira(mydata.amount).replace('-', '')}`
                                                    }
                                                </span>

                                                <div className="row-actions">
                                                    {/* Edit Button */}
                                                    <button
                                                        type="button"
                                                        className="edit-action-btn"
                                                        onClick={() => startEditing(mydata)}
                                                        aria-label={`Edit ${mydata.description}`}
                                                        title="Edit transaction"
                                                    >
                                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>

                                                    {/* Delete Button (Triggers Confirmation) */}
                                                    <button
                                                        type="button"
                                                        className="delete-action-btn"
                                                        onClick={() => setTransactionToDelete(mydata)}
                                                        aria-label={`Delete ${mydata.description}`}
                                                        title="Delete transaction"
                                                    >
                                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state-container">
                                <div className="empty-state-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="empty-state-title">No transactions yet. Add your first transaction!</h3>
                                <p className="empty-state-subtitle">Use the form to record your first income or expense and start tracking your finances.</p>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* ==========================================================================
                Edit Transaction Modal
                ========================================================================== */}
            {editingTransaction && (
                <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
                    <div className="modal-card">
                        <div className="modal-header">
                            <div>
                                <h2 id="edit-modal-title">Edit Transaction</h2>
                                <p className="modal-subtitle">Update transaction details and category.</p>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setEditingTransaction(null)}
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        </div>

                        {editErrorMessage && (
                            <div className="error-banner" role="alert">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{editErrorMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="transaction-form">
                            <div className="form-field">
                                <label htmlFor="edit-description" className="form-label">Description</label>
                                <input
                                    id="edit-description"
                                    className="form-input"
                                    value={editingTransaction.description}
                                    type="text"
                                    required
                                    onChange={(e) => setEditingTransaction({
                                        ...editingTransaction,
                                        description: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="edit-amount" className="form-label">Amount</label>
                                <div className="input-container">
                                    <span className="currency-symbol-addon">₦</span>
                                    <input
                                        id="edit-amount"
                                        className="form-input has-addon"
                                        value={editingTransaction.amount}
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        required
                                        onChange={(e) => setEditingTransaction({
                                            ...editingTransaction,
                                            amount: e.target.value
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Transaction Type</label>
                                <div className="type-segmented-control" role="group" aria-label="Edit Type Selection">
                                    <button
                                        type="button"
                                        className={`segmented-btn ${editingTransaction.type === "expense" ? "active expense" : ""}`}
                                        onClick={() => {
                                            const defaultCat = EXPENSE_CATEGORIES.includes(editingTransaction.category) ? editingTransaction.category : "Food & Dining";
                                            setEditingTransaction({
                                                ...editingTransaction,
                                                type: "expense",
                                                category: defaultCat
                                            });
                                        }}
                                    >
                                        Expense
                                    </button>
                                    <button
                                        type="button"
                                        className={`segmented-btn ${editingTransaction.type === "income" ? "active income" : ""}`}
                                        onClick={() => {
                                            const defaultCat = INCOME_CATEGORIES.includes(editingTransaction.category) ? editingTransaction.category : "Salary";
                                            setEditingTransaction({
                                                ...editingTransaction,
                                                type: "income",
                                                category: defaultCat
                                            });
                                        }}
                                    >
                                        Income
                                    </button>
                                </div>
                            </div>

                            <div className="form-field">
                                <label htmlFor="edit-category" className="form-label">Category</label>
                                <select
                                    id="edit-category"
                                    className="form-select"
                                    value={editingTransaction.category}
                                    onChange={(e) => setEditingTransaction({
                                        ...editingTransaction,
                                        category: e.target.value
                                    })}
                                >
                                    {activeEditCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setEditingTransaction(null)}
                                    disabled={isUpdating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn modal-submit"
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? (
                                        <>
                                            <span className="spinner" aria-hidden="true"></span>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Changes</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================================================
                Delete Confirmation Dialog
                ========================================================================== */}
            {transactionToDelete && (
                <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-desc">
                    <div className="modal-card modal-delete-card">
                        <div className="delete-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 id="delete-dialog-title" className="delete-dialog-title">Delete Transaction?</h2>
                        <p id="delete-dialog-desc" className="delete-dialog-desc">
                            Are you sure you want to delete <strong>"{transactionToDelete.description}"</strong> ({formatNaira(transactionToDelete.amount)})? This action cannot be undone.
                        </p>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setTransactionToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="spinner" aria-hidden="true"></span>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <span>Yes, Delete</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Transactions