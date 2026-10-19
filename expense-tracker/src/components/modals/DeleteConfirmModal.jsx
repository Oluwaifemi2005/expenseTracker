import React from 'react';

/**
 * Delete Confirmation Modal Dialog.
 * Displays a destructive action confirmation with accessible alertdialog markup.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is visible
 * @param {Object|null} props.transaction - The transaction pending deletion
 * @param {Function} props.onClose - Callback invoked when cancelling or closing
 * @param {Function} props.onConfirm - Callback invoked to execute deletion
 * @param {boolean} props.isDeleting - Whether deletion request is in progress
 * @param {Function} props.formatCurrency - Formatter function for displaying transaction amount
 */
const DeleteConfirmModal = ({
    isOpen,
    transaction,
    onClose,
    onConfirm,
    isDeleting,
    formatCurrency
}) => {
    if (!isOpen || !transaction) return null;

    return (
        <div
            className="modal-backdrop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
        >
            <div className="modal-card modal-delete-card">
                <div className="delete-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 id="delete-dialog-title" className="delete-dialog-title">Delete Transaction?</h2>
                <p id="delete-dialog-desc" className="delete-dialog-desc">
                    Are you sure you want to delete <strong>"{transaction.description}"</strong> ({formatCurrency(transaction.amount)})? This action cannot be undone.
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

export default DeleteConfirmModal;
