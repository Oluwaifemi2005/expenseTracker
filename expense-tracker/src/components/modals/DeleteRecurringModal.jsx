import React from 'react';

/**
 * Confirmation modal for deleting a recurring transaction rule.
 * Explicitly assures the user that previously generated transactions remain preserved.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback to cancel/close
 * @param {Function} props.onConfirm - Callback to confirm deletion
 * @param {Object} props.rule - Recurring rule being deleted
 * @param {boolean} props.isDeleting - Loading state during deletion
 */
const DeleteRecurringModal = ({
    isOpen,
    onClose,
    onConfirm,
    rule,
    isDeleting
}) => {
    if (!isOpen || !rule) return null;

    return (
        <div
            className="modal-backdrop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-recurring-title"
            aria-describedby="delete-recurring-desc"
        >
            <div className="modal-card modal-delete-card">
                <div className="delete-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 id="delete-recurring-title" className="delete-dialog-title">Delete Recurring Rule?</h2>
                <p id="delete-recurring-desc" className="delete-dialog-desc">
                    Are you sure you want to delete <strong>"{rule.name}"</strong>? Future occurrences will no longer be scheduled, but past transactions remain intact in your history.
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

export default DeleteRecurringModal;
