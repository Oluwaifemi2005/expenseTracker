import React, { useState, useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories'
import {
    getRecentTransactions,
    calculateMonthOverMonthComparison,
    calculateCategoryMoMTrends,
    generateDashboardInsights
} from '../utils/finance'

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

    // Sensible limit: Show 5 most recent transactions on Dashboard (sorted newest first)
    const recentTransactions = getRecentTransactions(transactions, 5);

    // Compute Month-over-Month comparison, category shifts, and verified observations
    const momComparison = useMemo(() => {
        return calculateMonthOverMonthComparison(transactions);
    }, [transactions]);

    const categoryTrends = useMemo(() => {
        return calculateCategoryMoMTrends(transactions);
    }, [transactions]);

    const dashboardInsights = useMemo(() => {
        return generateDashboardInsights(transactions);
    }, [transactions]);

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

            {/* Dashboard Monthly Insights & Trends Section */}
            <section className="dashboard-insights-panel" aria-label="Monthly Insights and Trends">
                <div className="insights-panel-header">
                    <div>
                        <h2 className="insights-heading">Monthly Trends & Insights</h2>
                        <p className="insights-subheading">
                            Performance in {momComparison.currentMonth.label} compared with {momComparison.previousMonth.label}
                        </p>
                    </div>

                    <div className="insights-header-badges">
                        <span className={`month-status-pill ${momComparison.currentMonth.isComplete ? 'complete' : 'in-progress'}`}>
                            <span className="status-dot" aria-hidden="true"></span>
                            {momComparison.currentMonth.isComplete
                                ? `${momComparison.currentMonth.label} (Complete)`
                                : `${momComparison.currentMonth.label} (Day ${momComparison.currentMonth.daysElapsed} of ${momComparison.currentMonth.totalDays})`
                            }
                        </span>
                    </div>
                </div>

                <div className="insights-content-grid">
                    {/* Panel 1: Month-over-Month Comparison & Pace */}
                    <div className="insights-card mom-card">
                        <div className="insights-card-header">
                            <h3 className="card-subheading">Month-over-Month Comparison</h3>
                            <span className="card-badge-muted">
                                {momComparison.historyState === 'both_months'
                                    ? (momComparison.currentMonth.isComplete ? 'Full Month vs Full Month' : `Pace: Days 1–${momComparison.elapsedPaceComparison.daysCompared}`)
                                    : (momComparison.historyState === 'current_month_only'
                                        ? 'Initial Tracking Period'
                                        : (momComparison.historyState === 'previous_month_only'
                                            ? 'Prior Month Data'
                                            : 'No Recent Records'))
                                }
                            </span>
                        </div>

                        {momComparison.historyState === 'no_transactions' ? (
                            <div className="insights-empty-state">
                                <p className="empty-state-title">No transactions recorded yet.</p>
                                <p className="empty-state-subtitle">Use the Quick Add form below to start tracking your finances.</p>
                            </div>
                        ) : momComparison.historyState === 'previous_month_only' ? (
                            <div className="mom-comparison-view">
                                <div className="mom-month-row previous-highlight">
                                    <div className="month-meta">
                                        <span className="month-name">{momComparison.previousMonth.label} (Previous)</span>
                                        <span className="month-count">{momComparison.previousMonth.transactionCount} transactions</span>
                                    </div>
                                    <div className="month-figures">
                                        <div className="figure-item">
                                            <span className="figure-label">Income</span>
                                            <span className="figure-val figure-income">{formatCurrency(momComparison.previousMonth.income)}</span>
                                        </div>
                                        <div className="figure-item">
                                            <span className="figure-label">Expenses</span>
                                            <span className="figure-val figure-expense">-{formatCurrency(momComparison.previousMonth.expense).replace('-', '')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mom-notice-callout">
                                    <span className="notice-icon" aria-hidden="true">ℹ️</span>
                                    <span>No activity recorded yet for {momComparison.currentMonth.label}. Log a transaction to see this month's comparison.</span>
                                </div>
                            </div>
                        ) : momComparison.historyState === 'other_history_only' ? (
                            <div className="insights-empty-state">
                                <p className="empty-state-title">No transactions in {momComparison.currentMonth.label} or {momComparison.previousMonth.label}.</p>
                                <p className="empty-state-subtitle">Prior transactions exist in your history. Add a new transaction to resume monthly trends.</p>
                            </div>
                        ) : (
                            <div className="mom-comparison-view">
                                {/* Current vs Previous Comparison Matrix */}
                                <div className="mom-metrics-grid">
                                    {/* Current Month Box */}
                                    <div className="mom-metric-box current">
                                        <div className="metric-box-top">
                                            <span className="metric-box-title">{momComparison.currentMonth.shortLabel}</span>
                                            {!momComparison.currentMonth.isComplete && (
                                                <span className="box-badge-live">In progress</span>
                                            )}
                                        </div>
                                        <div className="metric-box-values">
                                            <div className="val-line">
                                                <span className="line-label">Expenses:</span>
                                                <span className="line-val text-expense">-{formatCurrency(momComparison.currentMonth.expense).replace('-', '')}</span>
                                            </div>
                                            <div className="val-line">
                                                <span className="line-label">Income:</span>
                                                <span className="line-val text-income">+{formatCurrency(momComparison.currentMonth.income)}</span>
                                            </div>
                                            <div className="val-line">
                                                <span className="line-label">Net:</span>
                                                <span className={`line-val ${momComparison.currentMonth.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                                                    {momComparison.currentMonth.balance >= 0 ? '+' : ''}{formatCurrency(momComparison.currentMonth.balance)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Previous Month Box */}
                                    <div className="mom-metric-box previous">
                                        <div className="metric-box-top">
                                            <span className="metric-box-title">{momComparison.previousMonth.shortLabel}</span>
                                            <span className="box-badge-prior">Full Month</span>
                                        </div>
                                        <div className="metric-box-values">
                                            <div className="val-line">
                                                <span className="line-label">Expenses:</span>
                                                <span className="line-val text-expense">-{formatCurrency(momComparison.previousMonth.expense).replace('-', '')}</span>
                                            </div>
                                            <div className="val-line">
                                                <span className="line-label">Income:</span>
                                                <span className="line-val text-income">+{formatCurrency(momComparison.previousMonth.income)}</span>
                                            </div>
                                            <div className="val-line">
                                                <span className="line-label">Net:</span>
                                                <span className={`line-val ${momComparison.previousMonth.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                                                    {momComparison.previousMonth.balance >= 0 ? '+' : ''}{formatCurrency(momComparison.previousMonth.balance)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Pace Comparison Indicator */}
                                {momComparison.historyState === 'both_months' && momComparison.elapsedPaceComparison.isApplicable && (
                                    <div className="mom-pace-banner">
                                        <div className="pace-header">
                                            <span className="pace-title">Spending Pace (Days 1–{momComparison.elapsedPaceComparison.daysCompared}):</span>
                                            <span className={`pace-pill ${
                                                momComparison.elapsedPaceComparison.expenseChange.status === 'decreased'
                                                    ? 'pill-positive'
                                                    : (momComparison.elapsedPaceComparison.expenseChange.status === 'increased'
                                                        ? 'pill-warning'
                                                        : 'pill-neutral')
                                            }`}>
                                                {momComparison.elapsedPaceComparison.expenseChange.percentage !== null
                                                    ? `${momComparison.elapsedPaceComparison.expenseChange.percentage > 0 ? '+' : ''}${momComparison.elapsedPaceComparison.expenseChange.percentage}%`
                                                    : 'New spending'
                                                }
                                            </span>
                                        </div>
                                        <p className="pace-detail">
                                            {formatCurrency(momComparison.elapsedPaceComparison.currentElapsedExpense)} spent so far in {momComparison.currentMonth.shortLabel} vs {formatCurrency(momComparison.elapsedPaceComparison.prevElapsedExpense)} at the same point in {momComparison.previousMonth.shortLabel}.
                                        </p>
                                    </div>
                                )}

                                {momComparison.historyState === 'current_month_only' && (
                                    <div className="mom-notice-callout">
                                        <span className="notice-icon" aria-hidden="true">💡</span>
                                        <span>First recorded month on Vaultex. Full month-over-month comparisons will unlock in your next month of activity.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Panel 2: Top Category Shifts (Top 3 Movers) */}
                    <div className="insights-card category-trends-card">
                        <div className="insights-card-header">
                            <h3 className="card-subheading">Category Shifts</h3>
                            <span className="card-badge-muted">Top 3 Movers vs {momComparison.previousMonth.shortLabel}</span>
                        </div>

                        {categoryTrends.topMovers.length > 0 ? (
                            <div className="category-movers-list">
                                {categoryTrends.topMovers.map((mover) => {
                                    const isIncrease = mover.delta > 0;
                                    const isDecrease = mover.delta < 0;
                                    return (
                                        <div key={mover.category} className="category-mover-row">
                                            <div className="mover-info">
                                                <div className="category-color-dot" style={{ backgroundColor: mover.color }} aria-hidden="true"></div>
                                                <div className="mover-names">
                                                    <span className="mover-cat-title">{mover.category}</span>
                                                    <span className="mover-amounts">
                                                        {formatCurrency(mover.currentAmount)} ({momComparison.currentMonth.shortLabel}) vs {formatCurrency(mover.previousAmount)} ({momComparison.previousMonth.shortLabel})
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mover-delta">
                                                <span className={`mover-delta-badge ${isIncrease ? 'delta-increase' : isDecrease ? 'delta-decrease' : 'delta-unchanged'}`}>
                                                    {mover.changeStatus === 'new'
                                                        ? 'New'
                                                        : `${isIncrease ? '+' : ''}${formatCurrency(mover.delta)}`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="insights-empty-state">
                                <p className="empty-state-subtitle">No category spending changes recorded between {momComparison.currentMonth.shortLabel} and {momComparison.previousMonth.shortLabel}.</p>
                            </div>
                        )}

                        {categoryTrends.topCategoryThisMonth && (
                            <div className="top-category-footer">
                                <span className="footer-label">Top Spending Category:</span>
                                <span className="footer-value">
                                    {categoryTrends.topCategoryThisMonth.category} ({formatCurrency(categoryTrends.topCategoryThisMonth.amount)} • {categoryTrends.topCategoryThisMonth.percentage}%)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Panel 3: Concise Factual Observations */}
                    <div className="insights-card observations-card">
                        <div className="insights-card-header">
                            <h3 className="card-subheading">Verified Observations</h3>
                            <span className="card-badge-muted">Data-Backed Insights</span>
                        </div>

                        <div className="observations-list">
                            {dashboardInsights.map((insight) => (
                                <div key={insight.id} className={`observation-item item-${insight.type}`}>
                                    <div className="observation-indicator" aria-hidden="true">
                                        {insight.type === 'positive' ? '✓' : insight.type === 'warning' ? '!' : 'ℹ'}
                                    </div>
                                    <div className="observation-body">
                                        <span className="observation-title">{insight.title}</span>
                                        <p className="observation-msg">{insight.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
                                <span className="currency-symbol-addon" aria-hidden="true">
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
                            <label id="tx-type-label" className="form-label">
                                Transaction Type
                            </label>
                            <div className="type-segmented-control" role="group" aria-labelledby="tx-type-label">
                                <button
                                    type="button"
                                    className={`segmented-btn ${formState.type === "expense" ? "active expense" : ""}`}
                                    aria-pressed={formState.type === "expense"}
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
                                    aria-pressed={formState.type === "income"}
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
                                const txDate = formatTxDate(tx.date || tx.createdAt);
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
