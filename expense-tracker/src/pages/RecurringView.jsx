import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getCategoryColor } from '../constants/categories.js';
import {
    calculateRecurringSummary,
    getOccurrenceStatusInfo
} from '../utils/finance.js';
import { formatCurrency as defaultFormatCurrency } from '../utils/formatters.js';
import RecurringModal from '../components/modals/RecurringModal.jsx';
import DeleteRecurringModal from '../components/modals/DeleteRecurringModal.jsx';

/**
 * Formats an ISO date string to a readable format (e.g. "Nov 1, 2026").
 */
const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const RecurringView = () => {
    const {
        recurringRules = [],
        isRecurringLoading,
        currency = 'NGN',
        formatCurrency: contextFormatCurrency,
        handleCreateRecurring,
        handleUpdateRecurring,
        handleToggleRecurringStatus,
        handleDeleteRecurring,
        handleProcessDue,
        isProcessingDue = false
    } = useOutletContext();

    // Context-provided currency formatter respecting user's configured settings
    const formatCurrency = contextFormatCurrency || ((val) => defaultFormatCurrency(val, currency));

    // Stable reference date initialized once per view mount
    const [viewReferenceDate] = useState(() => new Date());

    // Filter tab: 'all' | 'active' | 'paused' | 'ended'
    const [activeFilter, setActiveFilter] = useState('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [modalError, setModalError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete modal state
    const [deleteModalRule, setDeleteModalRule] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state lazily initialized
    const [formState, setFormState] = useState(() => ({
        name: '',
        amount: '',
        type: 'expense',
        category: 'Housing & Rent',
        frequency: 'monthly',
        startDate: viewReferenceDate.toISOString().split('T')[0],
        endDate: '',
        status: 'active'
    }));

    // Summary calculations
    const summary = useMemo(() => {
        return calculateRecurringSummary(recurringRules, viewReferenceDate);
    }, [recurringRules, viewReferenceDate]);

    // Filtered rules
    const filteredRules = useMemo(() => {
        if (activeFilter === 'all') return recurringRules;
        return recurringRules.filter((r) => r.status === activeFilter);
    }, [recurringRules, activeFilter]);

    const handleOpenCreateModal = () => {
        setFormState({
            name: '',
            amount: '',
            type: 'expense',
            category: 'Housing & Rent',
            frequency: 'monthly',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            status: 'active'
        });
        setIsEditing(false);
        setEditingRuleId(null);
        setModalError('');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (rule) => {
        setFormState({
            name: rule.name || '',
            amount: rule.amount !== undefined ? String(rule.amount) : '',
            type: rule.type || 'expense',
            category: rule.category || 'Housing & Rent',
            frequency: rule.frequency || 'monthly',
            startDate: rule.startDate ? new Date(rule.startDate).toISOString().split('T')[0] : '',
            endDate: rule.endDate ? new Date(rule.endDate).toISOString().split('T')[0] : '',
            status: rule.status || 'active'
        });
        setIsEditing(true);
        setEditingRuleId(rule._id);
        setModalError('');
        setIsModalOpen(true);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setModalError('');
        setIsSubmitting(true);

        try {
            if (isEditing) {
                await handleUpdateRecurring(editingRuleId, formState);
            } else {
                await handleCreateRecurring(formState);
            }
            setIsModalOpen(false);
        } catch (err) {
            setModalError(err.response?.data?.message || err.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteModalRule) return;
        setIsDeleting(true);
        try {
            await handleDeleteRecurring(deleteModalRule._id);
            setDeleteModalRule(null);
        } catch (err) {
            console.error('Failed to delete rule:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="recurring-view">
            {/* Action Bar with Subtitle and Action Buttons */}
            <div className="recurring-header">
                <div className="recurring-header-text">
                    <p className="view-subtitle">
                        Manage regular bills, subscriptions, and scheduled income streams with automated tracking.
                    </p>
                </div>
                <div className="recurring-header-actions">
                    {summary.dueCount > 0 && (
                        <button
                            type="button"
                            className="btn btn-warning process-due-btn"
                            onClick={handleProcessDue}
                            disabled={isProcessingDue}
                            title="Generate transactions for overdue and scheduled items"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                            </svg>
                            <span>
                                {isProcessingDue
                                    ? 'Processing...'
                                    : `Process Due (${summary.dueCount})`}
                            </span>
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenCreateModal}
                    >
                        <span>+ Add Recurring Rule</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="summary-cards recurring-kpi-grid">
                <div className="summary-card">
                    <span className="summary-label">Active Rules</span>
                    <span className="summary-value">{summary.activeCount}</span>
                    <span className="summary-subtext">
                        {summary.totalRules} total ({summary.pausedCount} paused, {summary.endedCount} ended)
                    </span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Projected Monthly Expense</span>
                    <span className="summary-value text-danger">
                        {formatCurrency(summary.monthlyProjectedExpense)}
                    </span>
                    <span className="summary-subtext">Normalized regular outflow</span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Projected Monthly Inflow</span>
                    <span className="summary-value text-success">
                        {formatCurrency(summary.monthlyProjectedIncome)}
                    </span>
                    <span className="summary-subtext">Normalized regular income</span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Pending / Due Now</span>
                    <span className={`summary-value ${summary.dueCount > 0 ? 'text-warning' : 'text-neutral'}`}>
                        {summary.dueCount}
                    </span>
                    <span className="summary-subtext">
                        {summary.dueCount > 0 ? 'Ready for transaction creation' : 'All schedules up to date'}
                    </span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs" role="tablist" aria-label="Recurring rules filter">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'all'}
                    className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    All Rules ({recurringRules.length})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'active'}
                    className={`filter-tab ${activeFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('active')}
                >
                    Active ({summary.activeCount})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'paused'}
                    className={`filter-tab ${activeFilter === 'paused' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('paused')}
                >
                    Paused ({summary.pausedCount})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'ended'}
                    className={`filter-tab ${activeFilter === 'ended' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('ended')}
                >
                    Ended ({summary.endedCount})
                </button>
            </div>

            {/* Rules Content */}
            {isRecurringLoading ? (
                <div className="loading-state">
                    <div className="loading-spinner" aria-hidden="true" />
                    <p>Loading recurring transactions...</p>
                </div>
            ) : recurringRules.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon" aria-hidden="true">🔁</div>
                    <h3>No Recurring Rules Yet</h3>
                    <p>
                        Set up regular bills, subscriptions, or salary schedules. They will be tracked automatically
                        and can be generated with a single click.
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenCreateModal}
                    >
                        Create Your First Rule
                    </button>
                </div>
            ) : filteredRules.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon" aria-hidden="true">🔍</div>
                    <h3>No {activeFilter} rules found</h3>
                    <p>There are no recurring rules matching the selected status filter.</p>
                </div>
            ) : (
                <div className="recurring-cards-grid">
                    {filteredRules.map((rule) => {
                        const statusInfo = getOccurrenceStatusInfo(
                            rule.nextOccurrence,
                            rule.status,
                            viewReferenceDate
                        );
                        const isIncome = rule.type === 'income';
                        const categoryColor = getCategoryColor(rule.category);

                        return (
                            <div key={rule._id} className={`recurring-card status-${rule.status}`}>
                                <div className="recurring-card-header">
                                    <div className="recurring-card-title-group">
                                        <div className="recurring-card-badges">
                                            <span className={`type-badge ${isIncome ? 'income' : 'expense'}`}>
                                                {isIncome ? 'Income' : 'Expense'}
                                            </span>
                                            <span className="category-pill">
                                                <span
                                                    className="category-dot"
                                                    style={{ backgroundColor: categoryColor }}
                                                    aria-hidden="true"
                                                />
                                                {rule.category}
                                            </span>
                                            <span className="frequency-badge">
                                                {rule.frequency}
                                            </span>
                                        </div>
                                        <h3 className="recurring-rule-name">{rule.name}</h3>
                                    </div>
                                    <div className="recurring-amount-display">
                                        <span className={`recurring-amount ${isIncome ? 'text-success' : ''}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(rule.amount).replace('-', '')}
                                        </span>
                                    </div>
                                </div>

                                <div className="recurring-card-body">
                                    <div className="schedule-detail-row">
                                        <span className="schedule-label">Next Occurrence:</span>
                                        <span className="schedule-date">{formatDate(rule.nextOccurrence)}</span>
                                        <span className={`schedule-status-tag tag-${statusInfo.tone}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>

                                    <div className="schedule-meta-row">
                                        <span>Started: {formatDate(rule.startDate)}</span>
                                        {rule.endDate && (
                                            <span>Ends: {formatDate(rule.endDate)}</span>
                                        )}
                                        {rule.lastProcessedDate && (
                                            <span>Last processed: {formatDate(rule.lastProcessedDate)}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="recurring-card-actions">
                                    {rule.status !== 'ended' && (
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${rule.status === 'paused' ? 'btn-outline-success' : 'btn-outline-warning'}`}
                                            onClick={() => handleToggleRecurringStatus(rule._id)}
                                            title={rule.status === 'paused' ? 'Resume rule' : 'Pause rule'}
                                        >
                                            {rule.status === 'paused' ? 'Resume' : 'Pause'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        onClick={() => handleOpenEditModal(rule)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => setDeleteModalRule(rule)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Modal */}
            <RecurringModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleSubmitForm}
                isSubmitting={isSubmitting}
                currency={currency}
                isEditing={isEditing}
                errorMessage={modalError}
            />

            {/* Delete Confirmation Modal */}
            <DeleteRecurringModal
                isOpen={Boolean(deleteModalRule)}
                onClose={() => setDeleteModalRule(null)}
                onConfirm={handleConfirmDelete}
                rule={deleteModalRule}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default RecurringView;
