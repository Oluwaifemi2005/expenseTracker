import React, { useState, useEffect } from 'react';
import useAuth from '../../context/useAuth';

const AuthModal = () => {
    const {
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        closeAuthModal,
        login,
        register
    } = useAuth();

    const [formState, setFormState] = useState({
        name: '',
        email: '',
        password: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSwitchMode = (mode) => {
        setAuthModalMode(mode);
        setErrorMessage('');
        setFormState({ name: '', email: '', password: '' });
        setShowPassword(false);
    };

    const handleClose = () => {
        setErrorMessage('');
        setFormState({ name: '', email: '', password: '' });
        setShowPassword(false);
        closeAuthModal();
    };

    // Keyboard escape listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isAuthModalOpen && !isSubmitting) {
                closeAuthModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAuthModalOpen, isSubmitting, closeAuthModal]);

    if (!isAuthModalOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);

        if (authModalMode === 'login') {
            const result = await login({
                email: formState.email.trim(),
                password: formState.password
            });
            if (!result.success) {
                setErrorMessage(result.message);
            }
        } else {
            // Client pre-validation
            if (!formState.name.trim()) {
                setErrorMessage('Please enter your full name.');
                setIsSubmitting(false);
                return;
            }
            if (formState.password.length < 8) {
                setErrorMessage('Password must be at least 8 characters long.');
                setIsSubmitting(false);
                return;
            }
            if (!/\d/.test(formState.password)) {
                setErrorMessage('Password must contain at least one number.');
                setIsSubmitting(false);
                return;
            }

            const result = await register({
                name: formState.name.trim(),
                email: formState.email.trim(),
                password: formState.password
            });
            if (!result.success) {
                setErrorMessage(result.message);
            }
        }

        setIsSubmitting(false);
    };

    return (
        <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                    handleClose();
                }
            }}
        >
            <div className="modal-card auth-modal-card">
                {/* Header with Close */}
                <div className="auth-modal-header">
                    <div className="auth-brand-badge">
                        <div className="brand-icon">V</div>
                        <span>Vaultex Security</span>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="auth-tab-group" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={authModalMode === 'login'}
                        className={`auth-tab-btn ${authModalMode === 'login' ? 'active' : ''}`}
                        onClick={() => handleSwitchMode('login')}
                        disabled={isSubmitting}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={authModalMode === 'register'}
                        className={`auth-tab-btn ${authModalMode === 'register' ? 'active' : ''}`}
                        onClick={() => handleSwitchMode('register')}
                        disabled={isSubmitting}
                    >
                        Create Account
                    </button>
                </div>

                <div className="auth-modal-titles">
                    <h2 id="auth-modal-title">
                        {authModalMode === 'login' ? 'Welcome Back' : 'Create Your Private Vault'}
                    </h2>
                    <p>
                        {authModalMode === 'login'
                            ? 'Enter your credentials to securely access your transactions and analytics.'
                            : 'Sign up to manage your personal finances with isolated, end-to-end user privacy.'}
                    </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="auth-error-banner" role="alert">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {authModalMode === 'register' && (
                        <div className="form-group">
                            <label htmlFor="auth-name">Full Name</label>
                            <input
                                id="auth-name"
                                type="text"
                                className="form-input"
                                placeholder="e.g. Bruce Wayne"
                                value={formState.name}
                                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                required
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="auth-email">Email Address</label>
                        <input
                            id="auth-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={formState.email}
                            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                            required
                            disabled={isSubmitting}
                            autoFocus={authModalMode === 'login'}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="auth-password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="auth-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input password-input"
                                placeholder={authModalMode === 'register' ? 'Min 8 chars with a number' : 'Your password'}
                                value={formState.password}
                                onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                                required
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {authModalMode === 'register' && (
                            <small className="password-hint">
                                Must be at least 8 characters and include at least one number.
                            </small>
                        )}
                    </div>

                    <div className="auth-form-actions">
                        <button
                            type="submit"
                            className="btn-primary auth-submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner" aria-hidden="true"></span>
                                    <span>{authModalMode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                                </>
                            ) : (
                                <span>{authModalMode === 'login' ? 'Sign In to Vaultex' : 'Create My Account'}</span>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer Switcher */}
                <div className="auth-modal-footer">
                    {authModalMode === 'login' ? (
                        <p>
                            Don't have an account?{' '}
                            <button
                                type="button"
                                className="auth-switch-link"
                                onClick={() => handleSwitchMode('register')}
                                disabled={isSubmitting}
                            >
                                Create an account
                            </button>
                        </p>
                    ) : (
                        <p>
                            Already have an account?{' '}
                            <button
                                type="button"
                                className="auth-switch-link"
                                onClick={() => handleSwitchMode('login')}
                                disabled={isSubmitting}
                            >
                                Sign in
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
