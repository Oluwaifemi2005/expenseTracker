import React from 'react';
import { CURRENCY_SYMBOLS } from '../../constants/theme.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories.js';

/**
 * Modal form for creating or editing a recurring transaction rule.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.formState - Form data { name, amount, type, category, frequency, startDate, endDate, status }
 * @param {Function} props.setFormState - Setter for form data
 * @param {Function} props.onSubmit - Submission callback
 * @param {boolean} props.isSubmitting - Loading state
 * @param {string} props.currency - Active currency code (e.g. 'NGN')
 * @param {boolean} [props.isEditing=false] - Whether in edit mode
 * @param {string} [props.errorMessage=""] - Error message to display
 */
const RecurringModal = ({
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

    const currencySymbol = CURRENCY_SYMBOLS[currency] || '$';
    const categories = formState.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const handleTypeChange = (newType) => {
        const availableCategories = newType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        setFormState((prev) => ({
            ...prev,
            type: newType,
            category: availableCategories.includes(prev.category) ? prev.category : availableCategories[0]
        }));
    };

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="recurring-modal-title">
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <h2 id="recurring-modal-title">
                            {isEditing ? 'Edit Recurring Rule' : 'New Recurring Transaction'}
                        </h2>
                        <p className="modal-subtitle">
                            {isEditing
                                ? 'Update your recurring transaction schedule.'
                                : 'Automate regular income or expenses with a schedule.'}
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
                    <div className="error-message" role="alert" style={{ marginBottom: '1rem' }}>
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={onSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="recurring-name">Rule Name</label>
                        <input
                            id="recurring-name"
                            type="text"
                            className="form-input"
                            placeholder="e.g. Apartment Rent, Internet, Monthly Salary"
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                            required
                            maxLength={100}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Transaction Type</label>
                            <div className="type-toggle-group" role="radiogroup" aria-label="Transaction type">
                                <button
                                    type="button"
                                    className={`type-toggle-btn ${formState.type === 'expense' ? 'active expense' : ''}`}
                                    onClick={() => handleTypeChange('expense')}
                                >
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    className={`type-toggle-btn ${formState.type === 'income' ? 'active income' : ''}`}
                                    onClick={() => handleTypeChange('income')}
                                >
                                    Income
                                </button>
                            </div>
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="recurring-amount">Amount ({currencySymbol})</label>
                            <input
                                id="recurring-amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                className="form-input"
                                placeholder="0.00"
                                value={formState.amount}
                                onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="recurring-category">Category</label>
                            <select
                                id="recurring-category"
                                className="form-input"
                                value={formState.category}
                                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                                required
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="recurring-frequency">Frequency</label>
                            <select
                                id="recurring-frequency"
                                className="form-input"
                                value={formState.frequency}
                                onChange={(e) => setFormState({ ...formState, frequency: e.target.value })}
                                required
                            >
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="recurring-start-date">Start Date</label>
                            <input
                                id="recurring-start-date"
                                type="date"
                                className="form-input"
                                value={formState.startDate}
                                onChange={(e) => setFormState({ ...formState, startDate: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="recurring-end-date">End Date (Optional)</label>
                            <input
                                id="recurring-end-date"
                                type="date"
                                className="form-input"
                                value={formState.endDate || ''}
                                min={formState.startDate}
                                onChange={(e) => setFormState({ ...formState, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="form-group">
                            <label htmlFor="recurring-status">Status</label>
                            <select
                                id="recurring-status"
                                className="form-input"
                                value={formState.status}
                                onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="ended">Ended</option>
                            </select>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : isEditing
                                ? 'Update Rule'
                                : 'Create Recurring Rule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecurringModal;
