import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../context/useAuth';

const AuthScreen = ({ initialMode }) => {
    const navigate = useNavigate();
    const {
        authModalMode,
        setAuthModalMode,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
        login,
        register
    } = useAuth();

    // Sync initial mode if passed via route (/login or /register)
    useEffect(() => {
        if (initialMode && (initialMode === 'login' || initialMode === 'register')) {
            setAuthModalMode(initialMode);
        }
    }, [initialMode, setAuthModalMode]);

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
        navigate(`/${mode}`, { replace: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);

        try {
            if (authModalMode === 'login') {
                const result = await login({
                    email: formState.email.trim(),
                    password: formState.password
                });

                if (result.success) {
                    navigate('/', { replace: true });
                } else {
                    setErrorMessage(result.message);
                }
            } else {
                // Client pre-validation for registration
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

                if (result.success) {
                    navigate('/', { replace: true });
                } else {
                    setErrorMessage(result.message);
                }
            }
        } catch {
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-screen-container">
            <div className="auth-screen-card">
                <Link to="/" className="auth-back-home-link" aria-label="Return to Vaultex home page">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>Back to Home</span>
                </Link>

                {/* Brand Logo & Header */}
                <div className="auth-screen-brand">
                    <div className="brand-icon auth-screen-brand-icon">V</div>
                    <div className="auth-screen-brand-text">
                        <span className="auth-screen-brand-title">Vaultex</span>
                        <span className="auth-screen-brand-badge">Private Vault</span>
                    </div>
                </div>

                {/* Session Expired Alert Banner */}
                {sessionExpiredMessage && (
                    <div className="auth-expired-banner" role="alert">
                        <div className="auth-expired-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <div className="auth-expired-content">
                            <strong>Session Expired</strong>
                            <p>{sessionExpiredMessage}</p>
                        </div>
                        <button
                            type="button"
                            className="auth-expired-close-btn"
                            onClick={clearSessionExpiredMessage}
                            aria-label="Dismiss session expired alert"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Tab Switcher: Sign In vs Create Account */}
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

                {/* Headings */}
                <div className="auth-modal-titles">
                    <h2>
                        {authModalMode === 'login' ? 'Welcome to Vaultex' : 'Create Your Private Vault'}
                    </h2>
                    <p>
                        {authModalMode === 'login'
                            ? 'Please sign in to access your personal dashboard, transactions, and financial analytics.'
                            : 'Register to unlock your personal finance dashboard with private user accounts and secure data protection.'}
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

                {/* Authentication Form */}
                <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
                    {authModalMode === 'register' && (
                        <div className="form-group">
                            <label htmlFor="auth-screen-name">Full Name</label>
                            <input
                                id="auth-screen-name"
                                type="text"
                                className="form-input"
                                placeholder="e.g. your full name"
                                value={formState.name}
                                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                required
                                disabled={isSubmitting}
                                autoComplete="name"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="auth-screen-email">Email Address</label>
                        <input
                            id="auth-screen-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={formState.email}
                            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                            required
                            disabled={isSubmitting}
                            autoComplete="email"
                            autoFocus={authModalMode === 'login'}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="auth-screen-password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="auth-screen-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input password-input"
                                placeholder={authModalMode === 'register' ? 'Min 8 chars with a number' : 'Your password'}
                                value={formState.password}
                                onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                                required
                                disabled={isSubmitting}
                                autoComplete={authModalMode === 'login' ? 'current-password' : 'new-password'}
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
                            Don't have an account yet?{' '}
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

                {/* Trust & Security Footnote */}
                <div className="auth-screen-security-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <span>HTTP-only Secure Cookie • Isolated User Privacy</span>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
