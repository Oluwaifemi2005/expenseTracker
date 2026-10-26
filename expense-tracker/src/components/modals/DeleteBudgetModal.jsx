import React from 'react';

/**
 * Delete Confirmation Modal Dialog for Budgets.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is visible
 * @param {Object|null} props.budget - The budget record pending deletion
 * @param {Function} props.onClose - Callback invoked when cancelling
 * @param {Function} props.onConfirm - Callback invoked to execute deletion
 * @param {boolean} props.isDeleting - Whether deletion request is in progress
 * @param {Function} props.formatCurrency - Formatter function for displaying limit
 */
const DeleteBudgetModal = ({
    isOpen,
    budget,
    onClose,
    onConfirm,
    isDeleting,
    formatCurrency
}) => {
    if (!isOpen || !budget) return null;

    return (
        <div
            className="modal-backdrop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-budget-title"
            aria-describedby="delete-budget-desc"
        >
            <div className="modal-card modal-delete-card">
                <div className="delete-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 id="delete-budget-title" className="delete-dialog-title">Delete Budget?</h2>
                <p id="delete-budget-desc" className="delete-dialog-desc">
                    Are you sure you want to delete the <strong>"{budget.name}"</strong> budget ({formatCurrency(budget.limit)} limit)? Your transactions will not be affected.
                </p>

                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-danger"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <span className="spinner" aria-hidden="true"></span>
                                <span>Deleting...</span>
                            </>
                        ) : (
                            <span>Yes, Delete</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteBudgetModal;
