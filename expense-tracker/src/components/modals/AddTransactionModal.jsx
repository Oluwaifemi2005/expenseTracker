import React from 'react';
import { CURRENCY_SYMBOLS } from '../../constants/theme.js';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../constants/categories.js';

/**
 * Global Add Transaction Modal Form.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.formState - Current form values { description, amount, type, category }
 * @param {Function} props.setFormState - Setter for form values
 * @param {Function} props.onSubmit - Form submission handler
 * @param {boolean} props.isSubmitting - Submission loading state
 * @param {string} props.currency - Active currency code (e.g. 'NGN', 'USD')
 */
const AddTransactionModal = ({
    isOpen,
    onClose,
    formState,
    setFormState,
    onSubmit,
    isSubmitting,
    currency
}) => {
    if (!isOpen) return null;

    const activeCategories = formState.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <h2 id="add-modal-title">Add New Transaction</h2>
                        <p className="modal-subtitle">Log an inflow or outflow to your records.</p>
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

                <form onSubmit={onSubmit} className="transaction-form">
                    <div className="form-field">
                        <label htmlFor="modal-description" className="form-label">Description</label>
                        <input
                            id="modal-description"
                            className="form-input"
                            value={formState.description}
                            type="text"
                            placeholder="e.g. Salary, Groceries, Rent"
                            required
                            onChange={(e) => setFormState({
                                ...formState,
                                description: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="modal-amount" className="form-label">Amount</label>
                        <div className="input-container">
                            <span className="currency-symbol-addon">{CURRENCY_SYMBOLS[currency] || '₦'}</span>
                            <input
                                id="modal-amount"
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
                        <label className="form-label">Transaction Type</label>
                        <div className="type-segmented-control" role="group" aria-label="Add Type Selection">
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

                    <div className="form-field">
                        <label htmlFor="modal-category" className="form-label">Category</label>
                        <select
                            id="modal-category"
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
                            className="submit-btn modal-submit"
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
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTransactionModal;
