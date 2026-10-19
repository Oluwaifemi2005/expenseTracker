import React from 'react';
import { CURRENCY_SYMBOLS } from '../../constants/theme.js';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../constants/categories.js';

/**
 * Global Edit Transaction Modal Form.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Object|null} props.transaction - The transaction being edited
 * @param {Function} props.setTransaction - Setter for the editing transaction state
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onSubmit - Form submission handler (update transaction)
 * @param {boolean} props.isUpdating - Submission loading state
 * @param {string} props.errorMessage - Error message to display if update failed
 * @param {string} props.currency - Active currency code (e.g. 'NGN', 'USD')
 */
const EditTransactionModal = ({
    isOpen,
    transaction,
    setTransaction,
    onClose,
    onSubmit,
    isUpdating,
    errorMessage,
    currency
}) => {
    if (!isOpen || !transaction) return null;

    const activeCategories = transaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
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
                        <label htmlFor="edit-description" className="form-label">Description</label>
                        <input
                            id="edit-description"
                            className="form-input"
                            value={transaction.description}
                            type="text"
                            required
                            onChange={(e) => setTransaction({
                                ...transaction,
                                description: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="edit-amount" className="form-label">Amount</label>
                        <div className="input-container">
                            <span className="currency-symbol-addon">{CURRENCY_SYMBOLS[currency] || '₦'}</span>
                            <input
                                id="edit-amount"
                                className="form-input has-addon"
                                value={transaction.amount}
                                type="number"
                                step="any"
                                min="0.01"
                                required
                                onChange={(e) => setTransaction({
                                    ...transaction,
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
                                className={`segmented-btn ${transaction.type === "expense" ? "active expense" : ""}`}
                                onClick={() => {
                                    const defaultCat = EXPENSE_CATEGORIES.includes(transaction.category) ? transaction.category : "Food & Dining";
                                    setTransaction({
                                        ...transaction,
                                        type: "expense",
                                        category: defaultCat
                                    });
                                }}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                className={`segmented-btn ${transaction.type === "income" ? "active income" : ""}`}
                                onClick={() => {
                                    const defaultCat = INCOME_CATEGORIES.includes(transaction.category) ? transaction.category : "Salary";
                                    setTransaction({
                                        ...transaction,
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
                            value={transaction.category}
                            onChange={(e) => setTransaction({
                                ...transaction,
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
    );
};

export default EditTransactionModal;
