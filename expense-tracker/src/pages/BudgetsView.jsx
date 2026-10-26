import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getCategoryColor } from '../constants/categories.js';
import { calculateBudgetSpending, calculateBudgetsSummary, MONTH_NAMES } from '../utils/finance.js';
import BudgetModal from '../components/modals/BudgetModal.jsx';
import DeleteBudgetModal from '../components/modals/DeleteBudgetModal.jsx';

const BudgetsView = () => {
    const {
        transactions,
        formatCurrency,
        currency,
        budgets = [],
        isBudgetsLoading,
        handleCreateBudget,
        handleUpdateBudget,
        handleDeleteBudget
    } = useOutletContext();

    // Active reference month and year (current calendar month)
    const [currentDate] = useState(() => new Date());
    const currentMonthName = MONTH_NAMES[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();
    const formattedPeriod = `${currentMonthName} ${currentYear}`;

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingBudgetId, setEditingBudgetId] = useState(null);
    const [modalErrorMessage, setModalErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialFormState = {
        name: "",
        limit: "",
        category: "All Categories",
        period: "monthly"
    };
    const [formState, setFormState] = useState(initialFormState);

    // Delete Confirmation State
    const [budgetToDelete, setBudgetToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Summary calculations (guaranteed anti-double-counting across overlapping budgets)
    const summary = calculateBudgetsSummary(budgets, transactions, currentDate);

    // Filter budgets that have reached threshold warnings
    const warningBudgets = budgets.filter(b => {
        const stats = calculateBudgetSpending(b, transactions, currentDate);
        return stats.isWarning || stats.isExceeded;
    });

    // Handlers
    const openCreateModal = () => {
        setFormState(initialFormState);
        setIsEditing(false);
        setEditingBudgetId(null);
        setModalErrorMessage("");
        setIsModalOpen(true);
    };

    const openEditModal = (budget) => {
        setFormState({
            name: budget.name,
            limit: String(budget.limit),
            category: budget.category || "All Categories",
            period: budget.period || "monthly"
        });
        setIsEditing(true);
        setEditingBudgetId(budget._id);
        setModalErrorMessage("");
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setModalErrorMessage("");
        setIsSubmitting(true);

        try {
            if (isEditing) {
                await handleUpdateBudget(editingBudgetId, formState);
            } else {
                await handleCreateBudget(formState);
            }
            setIsModalOpen(false);
            setFormState(initialFormState);
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to save budget. Please check your inputs.";
            setModalErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!budgetToDelete) return;
        setIsDeleting(true);
        try {
            await handleDeleteBudget(budgetToDelete._id);
            setBudgetToDelete(null);
        } catch (error) {
            console.error("Delete budget failed:", error);
            alert("Failed to delete budget. Please try again.");
            setBudgetToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="budgets-view-container">
            {/* Action Topbar */}
            <div className="budgets-topbar">
                <div className="budgets-title-group">
                    <span className="budgets-period-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>Active Period: {formattedPeriod}</span>
                    </span>
                    <p className="budgets-subtitle">
                        Spending is calculated automatically from your transactions in {formattedPeriod}.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn-primary"
                    onClick={openCreateModal}
                    id="create-budget-btn"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Create Budget</span>
                </button>
            </div>

            {/* Threshold Alert Banner if any budget is warning/exceeded */}
            {warningBudgets.length > 0 && (
                <div className="budgets-alert-banner" role="alert">
                    <div className="alert-banner-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="alert-banner-content">
                        <strong>Spending Alert for {formattedPeriod}</strong>
                        <span>
                            {warningBudgets.length} budget{warningBudgets.length > 1 ? 's have' : ' has'} reached 80% or exceeded their spending limit.
                        </span>
                    </div>
                </div>
            )}

            {/* High-Level Summary KPI Cards */}
            <section className="kpi-grid" aria-label="Budgets Overview Cards">
                <article className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Budget Cap</span>
                        <span className="kpi-badge badge-neutral">Monthly Target</span>
                    </div>
                    <div className="kpi-value">{formatCurrency(summary.totalLimit)}</div>
                    <div className="kpi-trend trend-neutral">
                        <span>{summary.budgetCount} active budget{summary.budgetCount === 1 ? '' : 's'}</span>
                    </div>
                </article>

                <article className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Month Spent</span>
                        <span className="kpi-badge badge-expense">Outflows</span>
                    </div>
                    <div className="kpi-value" style={{ color: 'var(--color-expense)' }}>
                        {formatCurrency(summary.totalSpent)}
                    </div>
                    <div className="kpi-trend trend-neutral">
                        <span>Across budgeted categories</span>
                    </div>
                </article>

                <article className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Remaining Pool</span>
                        <span className={`kpi-badge ${summary.totalRemaining >= 0 ? 'badge-income' : 'badge-expense'}`}>
                            {summary.totalRemaining >= 0 ? 'Available' : 'Overspent'}
                        </span>
                    </div>
                    <div
                        className="kpi-value"
                        style={{ color: summary.totalRemaining >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
                    >
                        {formatCurrency(summary.totalRemaining)}
                    </div>
                    <div className="kpi-trend trend-neutral">
                        <span>{summary.overallPercentage}% total allocated spent</span>
                    </div>
                </article>
            </section>

            {/* Budgets Grid List */}
            {isBudgetsLoading && budgets.length === 0 ? (
                <div className="budgets-loading-state" role="status">
                    <div className="spinner" aria-hidden="true"></div>
                    <p>Loading your budgets...</p>
                </div>
            ) : budgets.length === 0 ? (
                <div className="budgets-empty-state">
                    <div className="empty-icon-wrapper">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8M12 6v2m0 8v2" />
                        </svg>
                    </div>
                    <h3>No Budgets Set Up Yet</h3>
                    <p>
                        Set monthly spending limits for specific expense categories or your total spending.
                        Vaultex will automatically monitor your transactions and alert you before you overspend.
                    </p>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={openCreateModal}
                    >
                        Create Your First Budget
                    </button>
                </div>
            ) : (
                <div className="budgets-grid">
                    {budgets.map((budget) => {
                        const stats = calculateBudgetSpending(budget, transactions, currentDate);
                        const categoryColor = getCategoryColor(budget.category);
                        const progressWidth = Math.min(100, Math.max(0, stats.percentage));

                        let progressColor = "var(--color-income)";
                        let badgeClass = "badge-income";
                        let statusText = `On track • ${formatCurrency(stats.remaining)} left`;

                        if (stats.isExceeded) {
                            progressColor = "var(--color-expense)";
                            badgeClass = "badge-expense";
                            statusText = `Exceeded by ${formatCurrency(Math.abs(stats.remaining))} (${stats.percentage}%)`;
                        } else if (stats.isWarning) {
                            progressColor = "#f59e0b"; // Amber warning
                            badgeClass = "badge-warning";
                            statusText = `80%+ Warning • ${formatCurrency(stats.remaining)} left (${stats.percentage}%)`;
                        }

                        return (
                            <div key={budget._id} className={`budget-card status-${stats.status}`}>
                                <div className="budget-card-header">
                                    <div className="budget-card-title-group">
                                        <span
                                            className="budget-category-pill"
                                            style={{
                                                backgroundColor: `${categoryColor}18`,
                                                color: categoryColor,
                                                borderColor: `${categoryColor}40`
                                            }}
                                        >
                                            {budget.category}
                                        </span>
                                        <h3 className="budget-card-name" title={budget.name}>
                                            {budget.name}
                                        </h3>
                                    </div>

                                    <div className="budget-card-actions">
                                        <button
                                            type="button"
                                            className="budget-action-btn edit"
                                            onClick={() => openEditModal(budget)}
                                            aria-label={`Edit ${budget.name} budget`}
                                            title="Edit budget"
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="budget-action-btn delete"
                                            onClick={() => setBudgetToDelete(budget)}
                                            aria-label={`Delete ${budget.name} budget`}
                                            title="Delete budget"
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="budget-amounts-row">
                                    <div className="budget-amount-item">
                                        <span className="budget-amount-label">Spent</span>
                                        <span className="budget-amount-value spent" style={{ color: stats.isExceeded ? 'var(--color-expense)' : 'var(--text-main)' }}>
                                            {formatCurrency(stats.spent)}
                                        </span>
                                    </div>

                                    <div className="budget-amount-item align-right">
                                        <span className="budget-amount-label">Limit</span>
                                        <span className="budget-amount-value limit">
                                            {formatCurrency(stats.limit)}
                                        </span>
                                    </div>
                                </div>

                                {/* Visual Progress Bar */}
                                <div className="budget-progress-track" role="progressbar" aria-valuenow={stats.percentage} aria-valuemin="0" aria-valuemax="100">
                                    <div
                                        className="budget-progress-fill"
                                        style={{
                                            width: `${progressWidth}%`,
                                            backgroundColor: progressColor
                                        }}
                                    />
                                </div>

                                <div className="budget-card-footer">
                                    <span className={`kpi-badge ${badgeClass}`}>
                                        {statusText}
                                    </span>
                                    <span className="budget-period-tag">
                                        Monthly
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Budget Modal */}
            <BudgetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                currency={currency}
                isEditing={isEditing}
                errorMessage={modalErrorMessage}
            />

            {/* Delete Confirmation Modal */}
            <DeleteBudgetModal
                isOpen={Boolean(budgetToDelete)}
                budget={budgetToDelete}
                onClose={() => setBudgetToDelete(null)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                formatCurrency={formatCurrency}
            />
        </div>
    );
};

export default BudgetsView;
