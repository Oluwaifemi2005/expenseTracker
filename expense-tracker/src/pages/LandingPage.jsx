import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | null

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && activeModal) {
                setActiveModal(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (activeModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [activeModal]);

    return (
        <div className="landing-page">
            {/* Header / Navigation Bar */}
            <header className="landing-header">
                <div className="landing-container landing-header-inner">
                    <Link to="/" className="landing-brand" aria-label="Vaultex Home">
                        <div className="brand-icon landing-brand-icon">V</div>
                        <span className="landing-brand-name">Vaultex</span>
                        <span className="landing-brand-badge">Vault</span>
                    </Link>

                    <nav className="landing-nav" aria-label="Main Navigation">
                        <a href="#features" className="landing-nav-link">Features</a>
                        <a href="#security" className="landing-nav-link">Security & Privacy</a>
                        <a href="#about" className="landing-nav-link">About</a>
                    </nav>

                    <div className="landing-auth-actions">
                        <Link to="/login" className="btn btn-secondary landing-btn-signin">
                            Sign In
                        </Link>
                        <Link to="/register" className="btn btn-primary landing-btn-register">
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-container landing-hero-inner">
                    <div className="landing-hero-badge">
                        <span className="landing-hero-badge-dot"></span>
                        Private Personal Finance Vault
                    </div>
                    <h1 className="landing-hero-title">
                        Take Complete Control of Your Personal Finances
                    </h1>
                    <p className="landing-hero-subtitle">
                        Vaultex provides a private, user-isolated dashboard for tracking expenses, managing category budgets, planning savings goals, and analyzing cash flow — without advertising or automated bank credential sharing.
                    </p>
                    <div className="landing-hero-cta-group">
                        <Link to="/register" className="btn btn-primary landing-btn-hero-primary">
                            <span>Create Your Private Vault</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </Link>
                        <Link to="/login" className="btn btn-secondary landing-btn-hero-secondary">
                            <span>Sign In to Existing Account</span>
                        </Link>
                    </div>

                    {/* Trust Indicators Pill Bar */}
                    <div className="landing-trust-bar">
                        <div className="landing-trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            <span>Private User Accounts</span>
                        </div>
                        <div className="landing-trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <span>Encrypted in Transit (HTTPS)</span>
                        </div>
                        <div className="landing-trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                            <span>No Bank Logins Required</span>
                        </div>
                        <div className="landing-trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            <span>RFC 4180 CSV Import/Export</span>
                        </div>
                    </div>

                    {/* Dashboard Preview Showcase Card */}
                    <div className="landing-showcase-wrapper">
                        <div className="landing-showcase-card">
                            <div className="landing-showcase-header">
                                <div className="landing-showcase-dots" aria-hidden="true">
                                    <span className="dot red"></span>
                                    <span className="dot yellow"></span>
                                    <span className="dot green"></span>
                                </div>
                                <span className="landing-showcase-title">Vaultex — Dashboard Overview</span>
                                <div className="landing-showcase-status">
                                    <span className="live-indicator"></span>
                                    Live Vault
                                </div>
                            </div>
                            <div className="landing-showcase-body">
                                <div className="landing-preview-stats">
                                    <div className="landing-stat-card income">
                                        <div className="stat-label">Total Income</div>
                                        <div className="stat-value">$8,450.00</div>
                                        <div className="stat-badge">+12.4% this month</div>
                                    </div>
                                    <div className="landing-stat-card expense">
                                        <div className="stat-label">Total Expenses</div>
                                        <div className="stat-value">$3,210.50</div>
                                        <div className="stat-badge">38% of budget</div>
                                    </div>
                                    <div className="landing-stat-card balance">
                                        <div className="stat-label">Net Savings</div>
                                        <div className="stat-value">$5,239.50</div>
                                        <div className="stat-badge savings-rate">62% savings rate</div>
                                    </div>
                                </div>
                                <div className="landing-preview-grid">
                                    <div className="landing-preview-panel">
                                        <div className="panel-title">Active Category Budgets</div>
                                        <div className="preview-progress-item">
                                            <div className="progress-label">
                                                <span>Housing & Utilities</span>
                                                <span>$1,450 / $1,800</span>
                                            </div>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: '80%' }}></div>
                                            </div>
                                        </div>
                                        <div className="preview-progress-item">
                                            <div className="progress-label">
                                                <span>Food & Dining</span>
                                                <span>$620 / $800</span>
                                            </div>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: '77%' }}></div>
                                            </div>
                                        </div>
                                        <div className="preview-progress-item">
                                            <div className="progress-label">
                                                <span>Entertainment</span>
                                                <span>$240 / $400</span>
                                            </div>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: '60%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="landing-preview-panel">
                                        <div className="panel-title">Recent Verified Activity</div>
                                        <div className="preview-tx-row">
                                            <div className="preview-tx-info">
                                                <span className="tx-name">Client Retainer</span>
                                                <span className="tx-meta">Income • Direct Deposit</span>
                                            </div>
                                            <span className="tx-amount income">+$4,250.00</span>
                                        </div>
                                        <div className="preview-tx-row">
                                            <div className="preview-tx-info">
                                                <span className="tx-name">Studio Rental</span>
                                                <span className="tx-meta">Expense • Recurring</span>
                                            </div>
                                            <span className="tx-amount expense">-$1,250.00</span>
                                        </div>
                                        <div className="preview-tx-row">
                                            <div className="preview-tx-info">
                                                <span className="tx-name">Emergency Fund Deposit</span>
                                                <span className="tx-meta">Goal Contribution • Vault</span>
                                            </div>
                                            <span className="tx-amount goal">+$1,000.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Features Section */}
            <section id="features" className="landing-features">
                <div className="landing-container">
                    <div className="landing-section-header">
                        <span className="landing-section-badge">Capabilities</span>
                        <h2 className="landing-section-title">Designed for Mindful Financial Management</h2>
                        <p className="landing-section-subtitle">
                            Every module in Vaultex is built to provide actionable clarity over your money without automated noise or unexpected subscriptions.
                        </p>
                    </div>

                    <div className="landing-features-grid">
                        {/* Feature 1 */}
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon-wrapper income-tone">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            </div>
                            <h3 className="landing-feature-title">Transaction Tracking</h3>
                            <p className="landing-feature-desc">
                                Record daily inflows and outflows with customized categories, dates, and notes. Filter and search transaction history instantly.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon-wrapper accent-tone">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                                </svg>
                            </div>
                            <h3 className="landing-feature-title">Category Budgets</h3>
                            <p className="landing-feature-desc">
                                Establish monthly limits per spending category. Visual progress bars alert you when approaching or exceeding your allocation.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon-wrapper goal-tone">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="6" />
                                    <circle cx="12" cy="12" r="2" />
                                </svg>
                            </div>
                            <h3 className="landing-feature-title">Savings Goals Engine</h3>
                            <p className="landing-feature-desc">
                                Define target amounts and deadlines for emergency reserves, investments, or travel. Track progress with every manual contribution.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon-wrapper recurring-tone">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <polyline points="23 4 23 10 17 10" />
                                    <polyline points="1 20 1 14 7 14" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                            </div>
                            <h3 className="landing-feature-title">Recurring Rules & Subscriptions</h3>
                            <p className="landing-feature-desc">
                                Track recurring bills on weekly, monthly, or yearly schedules. Receive advance notifications and overdue alerts before renewal dates.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon-wrapper report-tone">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6" y1="20" x2="6" y2="14" />
                                </svg>
                            </div>
                            <h3 className="landing-feature-title">Financial Reports & Data Portability</h3>
                            <p className="landing-feature-desc">
                                Review multi-month cash flow trends, compute savings rates, and export or import data anytime with injection-safe RFC 4180 CSV files.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon-wrapper security-tone">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                            </div>
                            <h3 className="landing-feature-title">Private & Controlled</h3>
                            <p className="landing-feature-desc">
                                You own your data. Reset your account data or export complete records with a single click in your personal settings panel.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Architecture & Security Disclosure Section */}
            <section id="security" className="landing-security">
                <div className="landing-container">
                    <div className="landing-section-header">
                        <span className="landing-section-badge">Architecture & Transparency</span>
                        <h2 className="landing-section-title">Strict Privacy Built on Open Principles</h2>
                        <p className="landing-section-subtitle">
                            We believe in truthful security disclosures. Here is how your data is actually handled, stored, and protected.
                        </p>
                    </div>

                    <div className="landing-security-grid">
                        <div className="landing-security-card">
                            <div className="landing-security-badge-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <h3 className="landing-security-card-title">Encrypted Transport</h3>
                            <p className="landing-security-card-text">
                                All communication between your browser and our API servers is conducted exclusively over TLS/HTTPS to protect your credentials and data in transit.
                            </p>
                        </div>

                        <div className="landing-security-card">
                            <div className="landing-security-badge-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                            </div>
                            <h3 className="landing-security-card-title">Password Hashing</h3>
                            <p className="landing-security-card-text">
                                Passwords are never stored in plaintext. They are salted and hashed using bcrypt before being committed to our authenticated database.
                            </p>
                        </div>

                        <div className="landing-security-card">
                            <div className="landing-security-badge-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                            </div>
                            <h3 className="landing-security-card-title">Isolated User Data</h3>
                            <p className="landing-security-card-text">
                                Every record in the database is bound to your unique account identifier. Access to transactions, budgets, and goals requires valid authentication on every request.
                            </p>
                        </div>

                        <div className="landing-security-card">
                            <div className="landing-security-badge-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                            </div>
                            <h3 className="landing-security-card-title">No Financial Scraping</h3>
                            <p className="landing-security-card-text">
                                Vaultex does not use third-party financial data aggregators, banking scrapers, or third-party advertising scripts. You control what data is entered.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* About / Philosophy Section */}
            <section id="about" className="landing-about">
                <div className="landing-container landing-about-inner">
                    <div className="landing-about-content">
                        <span className="landing-section-badge">Our Philosophy</span>
                        <h2 className="landing-about-title">Why We Built Vaultex</h2>
                        <p className="landing-about-text">
                            Many modern finance applications mandate connecting your live bank accounts, granting sweeping data access, and monetizing your spending habits with loan and credit card ads.
                        </p>
                        <p className="landing-about-text">
                            Vaultex takes the opposite approach: a clean, responsive, private workspace for tracking your cash flow intentionally. It gives you the full power of budget planning, goal allocation, and recurring expense monitoring without surrendering your financial sovereignty.
                        </p>
                        <div className="landing-about-cta">
                            <Link to="/register" className="btn btn-primary">
                                Start Your Private Vault Today
                            </Link>
                        </div>
                    </div>
                    <div className="landing-about-card">
                        <div className="landing-about-quote-icon">“</div>
                        <blockquote className="landing-about-quote">
                            Mindful personal finance starts with knowing where your money goes — on your own terms, in your own private vault.
                        </blockquote>
                        <div className="landing-about-author">— The Vaultex Philosophy</div>
                    </div>
                </div>
            </section>

            {/* Final CTA Banner */}
            <section className="landing-cta-banner">
                <div className="landing-container landing-cta-inner">
                    <h2>Ready to Take Control of Your Finances?</h2>
                    <p>Create your private account in seconds. No credit card or bank login required.</p>
                    <div className="landing-cta-buttons">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Create Free Account
                        </Link>
                        <Link to="/login" className="btn btn-secondary btn-lg">
                            Sign In to Vault
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container landing-footer-inner">
                    <div className="landing-footer-brand">
                        <div className="landing-brand">
                            <div className="brand-icon landing-brand-icon">V</div>
                            <span className="landing-brand-name">Vaultex</span>
                        </div>
                        <p className="landing-footer-tagline">
                            Private personal finance management with user data isolation.
                        </p>
                    </div>

                    <div className="landing-footer-links">
                        <div className="landing-footer-col">
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#security">Security & Privacy</a>
                            <a href="#about">About</a>
                        </div>
                        <div className="landing-footer-col">
                            <h4>Access</h4>
                            <Link to="/login">Sign In</Link>
                            <Link to="/register">Create Account</Link>
                        </div>
                        <div className="landing-footer-col">
                            <h4>Legal & Disclosures</h4>
                            <button
                                type="button"
                                className="landing-footer-modal-trigger"
                                onClick={() => setActiveModal('privacy')}
                            >
                                Privacy Policy
                            </button>
                            <button
                                type="button"
                                className="landing-footer-modal-trigger"
                                onClick={() => setActiveModal('terms')}
                            >
                                Terms of Service
                            </button>
                        </div>
                    </div>
                </div>
                <div className="landing-container landing-footer-bottom">
                    <p>© 2026 Vaultex. All rights reserved. Personal finance tracking software.</p>
                </div>
            </footer>

            {/* Privacy Policy Modal */}
            {activeModal === 'privacy' && (
                <div className="landing-modal-overlay" onClick={() => setActiveModal(null)} role="presentation">
                    <div
                        className="landing-modal-content"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="privacy-modal-title"
                    >
                        <div className="landing-modal-header">
                            <h2 id="privacy-modal-title">Privacy Policy</h2>
                            <button
                                type="button"
                                className="landing-modal-close"
                                onClick={() => setActiveModal(null)}
                                aria-label="Close Privacy Policy dialog"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="landing-modal-body">
                            <p className="landing-modal-update">Last updated: October 2026</p>
                            <h3>1. Information We Collect</h3>
                            <p>
                                When you create an account, we collect your name, email address, and a hashed version of your password. When using the application, we store the financial records you create (transactions, category budgets, savings goals, and recurring rules).
                            </p>
                            <h3>2. How Your Information is Used</h3>
                            <p>
                                Your information is used strictly to provide you with your personal financial dashboard, calculate summaries, and authenticate your sessions. We do not sell, rent, or monetize your personal data.
                            </p>
                            <h3>3. Data Isolation and Protection</h3>
                            <p>
                                All records are associated exclusively with your account ID. Passwords are encrypted using bcrypt prior to database storage. Network traffic is encrypted in transit using standard HTTPS/TLS.
                            </p>
                            <h3>4. Third-Party Sharing</h3>
                            <p>
                                Vaultex does not share your data with advertisers, third-party data aggregators, or external financial brokers.
                            </p>
                            <h3>5. Data Retention and Deletion</h3>
                            <p>
                                You can export your data via RFC 4180 CSV or reset your transactions anytime in your account settings.
                            </p>
                        </div>
                        <div className="landing-modal-footer">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setActiveModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms of Service Modal */}
            {activeModal === 'terms' && (
                <div className="landing-modal-overlay" onClick={() => setActiveModal(null)} role="presentation">
                    <div
                        className="landing-modal-content"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="terms-modal-title"
                    >
                        <div className="landing-modal-header">
                            <h2 id="terms-modal-title">Terms of Service</h2>
                            <button
                                type="button"
                                className="landing-modal-close"
                                onClick={() => setActiveModal(null)}
                                aria-label="Close Terms of Service dialog"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="landing-modal-body">
                            <p className="landing-modal-update">Last updated: October 2026</p>
                            <h3>1. Service Purpose</h3>
                            <p>
                                Vaultex is a self-directed personal finance tracking tool provided for informational and record-keeping purposes. It is not an automated banking service, broker-dealer, or certified financial advisor.
                            </p>
                            <h3>2. User Account Responsibility</h3>
                            <p>
                                You are responsible for safeguarding your password and account credentials. You agree to use the application in compliance with applicable laws.
                            </p>
                            <h3>3. Financial Decisions</h3>
                            <p>
                                All calculations, budgets, and savings tracking depend on user-provided data. Users remain solely responsible for verifying the accuracy of their financial decisions and records.
                            </p>
                            <h3>4. Availability and Modifications</h3>
                            <p>
                                We strive to maintain continuous availability and data integrity. Features may be updated or enhanced to improve stability and performance.
                            </p>
                        </div>
                        <div className="landing-modal-footer">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setActiveModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
