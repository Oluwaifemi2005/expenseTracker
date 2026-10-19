import React, { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories'

const DashboardView = () => {
    const {
        transactions,
        income,
        expense,
        totalIncome,
        totalExpense,
        balance,
        formatCurrency,
        formatTxDate,
        handleCreateTransaction,
        startEditing,
        setTransactionToDelete,
        isSubmitting,
        currencySymbol
    } = useOutletContext();



    const [formState, setFormState] = useState({
        description: "",
        amount: "",
        type: "expense",
        category: "Food & Dining"
    });

    const activeCategories = formState.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const onSubmit = async (e) => {
        e.preventDefault();
        const success = await handleCreateTransaction(formState);
        if (success) {
            setFormState({
                description: "",
                amount: "",
                type: "expense",
                category: "Food & Dining"
            });
        }
    };

    // Sensible limit: Show 5 most recent transactions on Dashboard
    const recentTransactions = [...transactions].reverse().slice(0, 5);

    return (
        <>
            {/* 3 Prominent KPI Cards */}
            <section className="kpi-grid" aria-label="Financial Summary Cards">
                {/* Total Balance */}
                <article className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Balance</span>
                        <span className="kpi-badge badge-neutral">
                            <span>Net Position</span>
                        </span>
                    </div>
                    <div className="kpi-value">{formatCurrency(balance)}</div>
                    <div className="kpi-footer">Overall account position</div>
                </article>

                {/* Total Income */}
                <article className="kpi-card kpi-income">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Income</span>
                        <span className="kpi-badge badge-income">
                            <span>+{income.length} credits</span>
                        </span>
                    </div>
                    <div className="kpi-value">{formatCurrency(totalIncome)}</div>
                    <div className="kpi-footer">Total recorded inflows</div>
                </article>

                {/* Total Expenses */}
                <article className="kpi-card kpi-expense">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Expenses</span>
                        <span className="kpi-badge badge-expense">
                            <span>-{expense.length} debits</span>
                        </span>
                    </div>
                    <div className="kpi-value">-{formatCurrency(totalExpense).replace('-', '')}</div>
                    <div className="kpi-footer">Total recorded outflows</div>
                </article>
            </section>

            {/* Dashboard Split: Quick Add Form & Recent Activity */}
            <div className="dashboard-content-grid">
                {/* Form Card */}
                <section className="form-card" aria-labelledby="form-heading">
                    <div className="card-title-group">
                        <h2 id="form-heading">Quick Add Transaction</h2>
                        <p>Log a new income or expense transaction.</p>
                    </div>

                    <form onSubmit={onSubmit} className="transaction-form">
                        <div className="form-field">
                            <label htmlFor="description" className="form-label">
                                Description
                            </label>
                            <input
                                id="description"
                                className="form-input"
                                value={formState.description}
                                type="text"
                                placeholder="e.g. Monthly Salary, Groceries, Rent"
                                required
                                onChange={(e) => setFormState({
                                    ...formState,
                                    description: e.target.value
                                })}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="amount" className="form-label">
                                Amount
                            </label>
                            <div className="input-container">
                                <span className="currency-symbol-addon">
                                    {currencySymbol || '₦'}
                                </span>

                                <input
                                    id="amount"
                                    className="form-input has-addon"
                                    value={formState.amount}
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    placeholder="0.00"
                                    required
                                    onChange={(e) => setFormState({
                                        ...formState,
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
                                    className={`segmented-btn ${formState.type === "expense" ? "active expense" : ""}`}
                                    onClick={() => {
                                        const defaultCat = EXPENSE_CATEGORIES.includes(formState.category) ? formState.category : "Food & Dining";
                                        setFormState({ ...formState, type: "expense", category: defaultCat });
                                    }}
                                >
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-btn ${formState.type === "income" ? "active income" : ""}`}
                                    onClick={() => {
                                        const defaultCat = INCOME_CATEGORIES.includes(formState.category) ? formState.category : "Salary";
                                        setFormState({ ...formState, type: "income", category: defaultCat });
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
                                value={formState.category}
                                onChange={(e) => setFormState({
                                    ...formState,
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
                        <div className="header-title-flex">
                            <h2 id="tx-heading">Recent Transactions</h2>
                            <span className="badge-count">Showing {recentTransactions.length} of {transactions.length}</span>
                        </div>
                        {transactions.length > 5 && (
                            <Link to="/transactions" className="view-all-link">
                                View all →
                            </Link>
                        )}
                    </div>

                    {recentTransactions.length > 0 ? (
                        <div className="transactions-list">
                            {recentTransactions.map((tx) => {
                                const txDate = formatTxDate(tx.createdAt);
                                const categoryLabel = tx.category || "Other";
                                return (
                                    <div key={tx._id} className="transaction-row">
                                        <div className="row-left">
                                            <div className={`type-icon-wrapper ${tx.type}`}>
                                                {tx.type === "income" ? (
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
                                                <h3 className="tx-title">{tx.description}</h3>
                                                <div className="tx-badges-group">
                                                    <span className="tx-category-badge">{categoryLabel}</span>
                                                    <span className="tx-type-tag">{tx.type}</span>
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
                                            <span className={`tx-amount ${tx.type === "income" ? "amount-income" : "amount-expense"}`}>
                                                {tx.type === "income"
                                                    ? `+${formatCurrency(tx.amount)}`
                                                    : `-${formatCurrency(tx.amount).replace('-', '')}`
                                                }
                                            </span>

                                            <div className="row-actions">
                                                <button
                                                    type="button"
                                                    className="edit-action-btn"
                                                    onClick={() => startEditing(tx)}
                                                    aria-label={`Edit ${tx.description}`}
                                                    title="Edit transaction"
                                                >
                                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="delete-action-btn"
                                                    onClick={() => setTransactionToDelete(tx)}
                                                    aria-label={`Delete ${tx.description}`}
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
        </>
    );
};

export default DashboardView;
