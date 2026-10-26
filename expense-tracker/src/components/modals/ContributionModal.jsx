import React, { useState } from 'react';
import { CURRENCY_SYMBOLS } from '../../constants/theme.js';
import { formatCurrency } from '../../utils/formatters.js';

/**
 * Modal dialog for manually depositing or withdrawing funds from a savings goal.
 * Enforces client-side validation to prevent negative balances before submitting.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Object|null} props.goal - Active goal { _id, name, currentAmount, targetAmount }
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onSubmit - Submission callback receiving { amount, type }
 * @param {boolean} props.isSubmitting - Loading state
 * @param {string} props.currency - Active currency code
 * @param {string} [props.errorMessage=""] - Error message
 */
const ContributionModal = ({
    isOpen,
    goal,
    onClose,
    onSubmit,
    isSubmitting,
    currency,
    errorMessage = ""
}) => {
    const [amount, setAmount] = useState("");
    const [type, setType] = useState("add"); // "add" | "subtract"
    const [clientError, setClientError] = useState("");

    if (!isOpen || !goal) return null;

    const currentSaved = Number(goal.currentAmount) || 0;
    const numericAmount = Number(amount) || 0;
    const wouldBeNegative = type === "subtract" && numericAmount > currentSaved;

    const handleSubmit = (e) => {
        e.preventDefault();
        setClientError("");

        if (numericAmount <= 0) {
            setClientError("Amount must be greater than zero.");
            return;
        }

        if (type === "subtract" && numericAmount > currentSaved) {
            setClientError(`Cannot withdraw more than current balance (${formatCurrency(currentSaved, currency)}).`);
            return;
        }

        onSubmit({
            amount: numericAmount,
            type
        });
    };

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="contrib-modal-title">
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <h2 id="contrib-modal-title">Adjust Funds</h2>
                        <p className="modal-subtitle">
                            Goal: <strong>{goal.name}</strong> • Current Balance: <strong>{formatCurrency(currentSaved, currency)}</strong>
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

                {(clientError || errorMessage) && (
                    <div className="error-banner" role="alert">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{clientError || errorMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="transaction-form">
                    <div className="form-field">
                        <label className="form-label">Action Type</label>
                        <div className="type-toggle-group">
                            <button
                                type="button"
                                className={`type-btn income ${type === 'add' ? 'active' : ''}`}
                                onClick={() => {
                                    setType('add');
                                    setClientError("");
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>Add Funds</span>
                            </button>
                            <button
                                type="button"
                                className={`type-btn expense ${type === 'subtract' ? 'active' : ''}`}
                                onClick={() => {
                                    setType('subtract');
                                    setClientError("");
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>Withdraw Funds</span>
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="contrib-amount" className="form-label">Amount</label>
                        <div className="input-container">
                            <span className="currency-symbol-addon">{CURRENCY_SYMBOLS[currency] || '₦'}</span>
                            <input
                                id="contrib-amount"
                                className="form-input has-addon"
                                value={amount}
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="0.00"
                                required
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setClientError("");
                                }}
                            />
                        </div>
                        {wouldBeNegative && (
                            <span className="field-hint text-danger" style={{ color: 'var(--color-expense)', marginTop: '0.35rem', display: 'block', fontSize: '0.8rem' }}>
                                Warning: Withdrawal exceeds current saved balance.
                            </span>
                        )}
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
                            disabled={isSubmitting || wouldBeNegative}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner" aria-hidden="true"></span>
                                    <span>Updating...</span>
                                </>
                            ) : (
                                <span>{type === 'add' ? 'Add Funds' : 'Confirm Withdrawal'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContributionModal;
