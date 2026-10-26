import React from 'react';
import { CURRENCY_SYMBOLS } from '../../constants/theme.js';

const GOAL_CATEGORIES = [
    'General',
    'Emergency Fund',
    'Travel & Vacation',
    'Vehicle',
    'Housing & Real Estate',
    'Education',
    'Gadgets & Technology',
    'Retirement',
    'Wedding & Events',
    'Other'
];

/**
 * Modal form for creating or editing a savings goal.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Close callback
 * @param {Object} props.formState - Form state { name, targetAmount, currentAmount, targetDate, category }
 * @param {Function} props.setFormState - Form state setter
 * @param {Function} props.onSubmit - Submission callback
 * @param {boolean} props.isSubmitting - Loading state
 * @param {string} props.currency - Active currency code
 * @param {boolean} [props.isEditing=false] - Whether in edit mode
 * @param {string} [props.errorMessage=""] - Error message to display
 */
const GoalModal = ({
    isOpen,
    onClose,
    formState,
    setFormState,
    onSubmit,
    isSubmitting,
    currency,
    isEditing = false,
    errorMessage = ""
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <h2 id="goal-modal-title">{isEditing ? 'Edit Savings Goal' : 'Create Savings Goal'}</h2>
                        <p className="modal-subtitle">
                            {isEditing
                                ? 'Update your target details or milestone deadline.'
                                : 'Set a target amount and track your progress to completion.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

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

                <form onSubmit={onSubmit} className="transaction-form">
                    <div className="form-field">
                        <label htmlFor="goal-name" className="form-label">Goal Name</label>
                        <input
                            id="goal-name"
                            className="form-input"
                            value={formState.name}
                            type="text"
                            placeholder="e.g. Rainy Day Fund, New Laptop"
                            required
                            maxLength={100}
                            onChange={(e) => setFormState({
                                ...formState,
                                name: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="goal-target-amount" className="form-label">Target Amount</label>
                        <div className="input-container">
                            <span className="currency-symbol-addon">{CURRENCY_SYMBOLS[currency] || '₦'}</span>
                            <input
                                id="goal-target-amount"
                                className="form-input has-addon"
                                value={formState.targetAmount}
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="0.00"
                                required
                                onChange={(e) => setFormState({
                                    ...formState,
                                    targetAmount: e.target.value
                                })}
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="goal-current-amount" className="form-label">
                            {isEditing ? 'Saved Amount' : 'Initial Amount Saved (Optional)'}
                        </label>
                        <div className="input-container">
                            <span className="currency-symbol-addon">{CURRENCY_SYMBOLS[currency] || '₦'}</span>
                            <input
                                id="goal-current-amount"
                                className="form-input has-addon"
                                value={formState.currentAmount}
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                onChange={(e) => setFormState({
                                    ...formState,
                                    currentAmount: e.target.value
                                })}
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="goal-target-date" className="form-label">Target Date (Optional)</label>
                        <input
                            id="goal-target-date"
                            className="form-input"
                            value={formState.targetDate || ""}
                            type="date"
                            onChange={(e) => setFormState({
                                ...formState,
                                targetDate: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="goal-category" className="form-label">Category</label>
                        <select
                            id="goal-category"
                            className="form-select"
                            value={formState.category || 'General'}
                            onChange={(e) => setFormState({
                                ...formState,
                                category: e.target.value
                            })}
                        >
                            {GOAL_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner" aria-hidden="true"></span>
                                    <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                                </>
                            ) : (
                                <span>{isEditing ? 'Update Goal' : 'Save Goal'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GoalModal;
