import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { calculateGoalProgress, calculateGoalsSummary } from '../utils/finance.js';
import { formatTxDate } from '../utils/formatters.js';
import GoalModal from '../components/modals/GoalModal.jsx';
import ContributionModal from '../components/modals/ContributionModal.jsx';
import DeleteGoalModal from '../components/modals/DeleteGoalModal.jsx';

const GoalsView = () => {
    const {
        goals = [],
        isGoalsLoading,
        handleCreateGoal,
        handleUpdateGoal,
        handleDeleteGoal,
        handleAdjustContribution,
        formatCurrency,
        currency
    } = useOutletContext();

    // Filter tab: 'all' | 'in-progress' | 'completed'
    const [filterTab, setFilterTab] = useState('all');

    // Goal Form Modal State
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingGoalId, setEditingGoalId] = useState(null);
    const [goalErrorMessage, setGoalErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialFormState = {
        name: "",
        targetAmount: "",
        currentAmount: "",
        targetDate: "",
        category: "General"
    };
    const [formState, setFormState] = useState(initialFormState);

    // Contribution Modal State
    const [activeContribGoal, setActiveContribGoal] = useState(null);
    const [contribErrorMessage, setContribErrorMessage] = useState("");
    const [isContribSubmitting, setIsContribSubmitting] = useState(false);

    // Delete Confirmation State
    const [goalToDelete, setGoalToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Summary Metrics
    const summary = calculateGoalsSummary(goals);

    // Filtered Goals
    const filteredGoals = goals.filter((goal) => {
        const stats = calculateGoalProgress(goal);
        if (filterTab === 'completed') return stats.isCompleted;
        if (filterTab === 'in-progress') return !stats.isCompleted;
        return true;
    });

    // Modal Triggers
    const openCreateModal = () => {
        setFormState(initialFormState);
        setIsEditing(false);
        setEditingGoalId(null);
        setGoalErrorMessage("");
        setIsGoalModalOpen(true);
    };

    const openEditModal = (goal) => {
        let dateVal = "";
        if (goal.targetDate) {
            try {
                dateVal = new Date(goal.targetDate).toISOString().split('T')[0];
            } catch {
                dateVal = "";
            }
        }

        setFormState({
            name: goal.name,
            targetAmount: String(goal.targetAmount),
            currentAmount: String(goal.currentAmount || 0),
            targetDate: dateVal,
            category: goal.category || "General"
        });
        setIsEditing(true);
        setEditingGoalId(goal._id);
        setGoalErrorMessage("");
        setIsGoalModalOpen(true);
    };

    const handleGoalFormSubmit = async (e) => {
        e.preventDefault();
        setGoalErrorMessage("");
        setIsSubmitting(true);

        try {
            if (isEditing) {
                await handleUpdateGoal(editingGoalId, formState);
            } else {
                await handleCreateGoal(formState);
            }
            setIsGoalModalOpen(false);
            setFormState(initialFormState);
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to save savings goal. Please check inputs.";
            setGoalErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContributionSubmit = async ({ amount, type }) => {
        if (!activeContribGoal) return;
        setContribErrorMessage("");
        setIsContribSubmitting(true);

        try {
            await handleAdjustContribution(activeContribGoal._id, { amount, type });
            setActiveContribGoal(null);
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to adjust contribution. Please check your balance.";
            setContribErrorMessage(msg);
        } finally {
            setIsContribSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!goalToDelete) return;
        setIsDeleting(true);

        try {
            await handleDeleteGoal(goalToDelete._id);
            setGoalToDelete(null);
        } catch (error) {
            console.error("Delete goal failed:", error);
            alert("Failed to delete goal. Please try again.");
            setGoalToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="goals-view-container">
            {/* Action Topbar */}
            <div className="goals-topbar">
                <div className="goals-title-group">
                    <span className="goals-badge-counter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                        <span>{summary.completedCount} of {summary.goalCount} Completed</span>
                    </span>
                    <p className="goals-subtitle">
                        Build dedicated reserves, allocate funds, and track your milestone achievements.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn-primary"
                    onClick={openCreateModal}
                    id="create-goal-btn"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Create Savings Goal</span>
                </button>
            </div>

            {/* High-Level Summary KPI Cards */}
            <section className="kpi-grid" aria-label="Savings Goals Summary Cards">
                <article className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Targets</span>
                        <span className="kpi-badge badge-neutral">Portfolio</span>
                    </div>
                    <div className="kpi-value">{formatCurrency(summary.totalTarget)}</div>
                    <div className="kpi-trend trend-neutral">
                        <span>{summary.goalCount} active goal{summary.goalCount === 1 ? '' : 's'}</span>
                    </div>
                </article>

                <article className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Saved</span>
                        <span className="kpi-badge badge-income">Accumulated</span>
                    </div>
                    <div className="kpi-value" style={{ color: 'var(--color-income)' }}>
                        {formatCurrency(summary.totalSaved)}
                    </div>
                    <div className="kpi-trend trend-neutral">
                        <span>{summary.overallPercentage}% total funded</span>
                    </div>
                </article>

                <article className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Remaining Needed</span>
                        <span className="kpi-badge badge-neutral">To Target</span>
                    </div>
                    <div className="kpi-value" style={{ color: summary.totalRemaining === 0 ? 'var(--color-income)' : 'var(--text-main)' }}>
                        {formatCurrency(summary.totalRemaining)}
                    </div>
                    <div className="kpi-trend trend-neutral">
                        <span>{summary.inProgressCount} goal{summary.inProgressCount === 1 ? '' : 's'} in progress</span>
                    </div>
                </article>
            </section>

            {/* Filter Tabs */}
            {goals.length > 0 && (
                <div className="goals-filter-bar">
                    <div className="filter-tabs">
                        <button
                            type="button"
                            className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterTab('all')}
                        >
                            All Goals ({goals.length})
                        </button>
                        <button
                            type="button"
                            className={`filter-tab ${filterTab === 'in-progress' ? 'active' : ''}`}
                            onClick={() => setFilterTab('in-progress')}
                        >
                            In Progress ({summary.inProgressCount})
                        </button>
                        <button
                            type="button"
                            className={`filter-tab ${filterTab === 'completed' ? 'active' : ''}`}
                            onClick={() => setFilterTab('completed')}
                        >
                            Completed ({summary.completedCount})
                        </button>
                    </div>
                </div>
            )}

            {/* Goals Grid List */}
            {isGoalsLoading && goals.length === 0 ? (
                <div className="budgets-loading-state" role="status">
                    <div className="spinner" aria-hidden="true"></div>
                    <p>Loading savings goals...</p>
                </div>
            ) : goals.length === 0 ? (
                <div className="budgets-empty-state">
                    <div className="empty-icon-wrapper">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                    </div>
                    <h3>No Savings Goals Yet</h3>
                    <p>
                        Set up a target for an emergency fund, major purchase, or vacation.
                        Deposit funds at your own pace and track your progress to 100%.
                    </p>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={openCreateModal}
                    >
                        Create Your First Goal
                    </button>
                </div>
            ) : filteredGoals.length === 0 ? (
                <div className="budgets-empty-state" style={{ padding: '2.5rem 1.5rem' }}>
                    <p style={{ margin: 0 }}>No goals match the "{filterTab}" filter.</p>
                </div>
            ) : (
                <div className="goals-grid">
                    {filteredGoals.map((goal) => {
                        const stats = calculateGoalProgress(goal);
                        const deadlineFormatted = goal.targetDate
                            ? formatTxDate(goal.targetDate).date
                            : null;

                        return (
                            <div
                                key={goal._id}
                                className={`goal-card ${stats.isCompleted ? 'goal-completed' : 'goal-in-progress'}`}
                            >
                                <div className="goal-card-header">
                                    <div className="goal-title-group">
                                        <div className="goal-tag-row">
                                            <span className="goal-category-tag">{goal.category || 'General'}</span>
                                            {stats.isCompleted ? (
                                                <span className="goal-status-badge badge-completed">
                                                    ✓ Completed
                                                </span>
                                            ) : (
                                                <span className="goal-status-badge badge-active">
                                                    In Progress
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="goal-name" title={goal.name}>{goal.name}</h3>
                                        {deadlineFormatted && (
                                            <span className="goal-deadline-label">
                                                Target: {deadlineFormatted}
                                            </span>
                                        )}
                                    </div>

                                    <div className="goal-actions">
                                        <button
                                            type="button"
                                            className="budget-action-btn edit"
                                            onClick={() => openEditModal(goal)}
                                            aria-label={`Edit ${goal.name} goal`}
                                            title="Edit goal"
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="budget-action-btn delete"
                                            onClick={() => setGoalToDelete(goal)}
                                            aria-label={`Delete ${goal.name} goal`}
                                            title="Delete goal"
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="goal-amounts-box">
                                    <div className="goal-amount-col">
                                        <span className="goal-amount-sub">Saved</span>
                                        <span className="goal-amount-main saved" style={{ color: stats.isCompleted ? 'var(--color-income)' : 'var(--text-main)' }}>
                                            {formatCurrency(stats.saved)}
                                        </span>
                                    </div>
                                    <div className="goal-amount-col align-right">
                                        <span className="goal-amount-sub">Target</span>
                                        <span className="goal-amount-main target">
                                            {formatCurrency(stats.target)}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar (Capped at 100%) */}
                                <div
                                    className="budget-progress-track"
                                    role="progressbar"
                                    aria-valuenow={stats.percentage}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                >
                                    <div
                                        className="budget-progress-fill"
                                        style={{
                                            width: `${stats.progressWidth}%`,
                                            backgroundColor: stats.isCompleted ? 'var(--color-income)' : 'var(--brand-accent)'
                                        }}
                                    />
                                </div>

                                <div className="goal-card-footer">
                                    <span className="goal-percentage-label">
                                        {stats.percentage}% funded
                                    </span>
                                    <span className="goal-remaining-label">
                                        {stats.isCompleted
                                            ? 'Goal Achieved!'
                                            : `${formatCurrency(stats.remaining)} left`}
                                    </span>
                                </div>

                                {/* Contribution Action Buttons */}
                                <div className="goal-contrib-btn-group">
                                    <button
                                        type="button"
                                        className="btn-contrib add"
                                        onClick={() => {
                                            setActiveContribGoal(goal);
                                            setContribErrorMessage("");
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        <span>Add Funds</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-contrib subtract"
                                        onClick={() => {
                                            setActiveContribGoal(goal);
                                            setContribErrorMessage("");
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        <span>Withdraw</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Goal Modal */}
            <GoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleGoalFormSubmit}
                isSubmitting={isSubmitting}
                currency={currency}
                isEditing={isEditing}
                errorMessage={goalErrorMessage}
            />

            {/* Quick Contribution Modal */}
            <ContributionModal
                isOpen={Boolean(activeContribGoal)}
                goal={activeContribGoal}
                onClose={() => setActiveContribGoal(null)}
                onSubmit={handleContributionSubmit}
                isSubmitting={isContribSubmitting}
                currency={currency}
                errorMessage={contribErrorMessage}
            />

            {/* Delete Confirmation Modal */}
            <DeleteGoalModal
                isOpen={Boolean(goalToDelete)}
                goal={goalToDelete}
                onClose={() => setGoalToDelete(null)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                formatCurrency={formatCurrency}
            />
        </div>
    );
};

export default GoalsView;
