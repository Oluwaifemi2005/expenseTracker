import React from 'react';
import { CURRENCY_SYMBOLS } from '../../constants/theme.js';
import { EXPENSE_CATEGORIES } from '../../constants/categories.js';

/**
 * Modal form for creating or editing a budget.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.formState - Form data { name, limit, category, period }
 * @param {Function} props.setFormState - Setter for form data
 * @param {Function} props.onSubmit - Submission callback
 * @param {boolean} props.isSubmitting - Loading state
 * @param {string} props.currency - Active currency code (e.g. 'NGN')
 * @param {boolean} [props.isEditing=false] - Whether in edit mode
 * @param {string} [props.errorMessage=""] - Error message to display
 */
const BudgetModal = ({
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

    const categories = ['All Categories', ...EXPENSE_CATEGORIES];

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <h2 id="budget-modal-title">{isEditing ? 'Edit Budget' : 'Create New Budget'}</h2>
                        <p className="modal-subtitle">
                            {isEditing
                                ? 'Update your spending target and limit.'
                                : 'Set a monthly spending limit to stay on track.'}
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
                        <label htmlFor="budget-name" className="form-label">Budget Name</label>
                        <input
                            id="budget-name"
                            className="form-input"
                            value={formState.name}
                            type="text"
                            placeholder="e.g. Monthly Groceries, Dining Out"
                            required
                            maxLength={100}
                            onChange={(e) => setFormState({
                                ...formState,
                                name: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="budget-limit" className="form-label">Spending Limit</label>
                        <div className="input-container">
                            <span className="currency-symbol-addon">{CURRENCY_SYMBOLS[currency] || '₦'}</span>
                            <input
                                id="budget-limit"
                                className="form-input has-addon"
                                value={formState.limit}
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="0.00"
                                required
                                onChange={(e) => setFormState({
                                    ...formState,
                                    limit: e.target.value
                                })}
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="budget-category" className="form-label">Category</label>
                        <select
                            id="budget-category"
                            className="form-select"
                            value={formState.category}
                            onChange={(e) => setFormState({
                                ...formState,
                                category: e.target.value
                            })}
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-field">
                        <label htmlFor="budget-period" className="form-label">Budget Period</label>
                        <select
                            id="budget-period"
                            className="form-select"
                            value={formState.period || 'monthly'}
                            onChange={(e) => setFormState({
                                ...formState,
                                period: e.target.value
                            })}
                        >
                            <option value="monthly">Monthly (Calendar Month)</option>
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
                                <span>{isEditing ? 'Update Budget' : 'Save Budget'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BudgetModal;
