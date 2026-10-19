import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { THEME_PALETTES, CURRENCY_CONFIG } from '../constants/theme'

const SettingsView = () => {
    const {
        currency,
        setCurrency,
        themeColor,
        setThemeColor,
        compactView,
        setCompactView,
        showTime,
        setShowTime,
        fetchTransactions,
        transactions
    } = useOutletContext();

    const [activeTab, setActiveTab] = useState("general");
    const [savedNotice, setSavedNotice] = useState("");
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const showNotice = (msg) => {
        setSavedNotice(msg);
        setTimeout(() => setSavedNotice(""), 3000);
    };

    const handleConfirmReset = () => {
        localStorage.removeItem("vaultex_currency");
        localStorage.removeItem("vaultex_theme");
        localStorage.removeItem("vaultex_compact");
        localStorage.removeItem("vaultex_show_time");
        setCurrency("NGN");
        setThemeColor("slate");
        setCompactView(false);
        setShowTime(true);
        setShowResetConfirm(false);
        showNotice("Preferences reset to default values.");
    };

    return (
        <div className="prime-settings-container">
            {savedNotice && (
                <div className="settings-notice" role="status">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{savedNotice}</span>
                </div>
            )}

            {/* Prime Pay Nested 2-Column Layout */}
            <div className="prime-settings-layout">
                {/* Left Inner Navigation Sub-Menu (Prime Pay Reference) */}
                <aside className="prime-settings-sidebar">
                    <div className="sub-menu-section">
                        <span className="sub-menu-heading">Personal</span>
                        <button
                            type="button"
                            className={`sub-nav-item ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                            <span>General</span>
                        </button>

                        <button
                            type="button"
                            className={`sub-nav-item ${activeTab === 'display' ? 'active' : ''}`}
                            onClick={() => setActiveTab('display')}
                        >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                            </svg>
                            <span>Display Options</span>
                        </button>
                    </div>

                    <div className="sub-menu-section">
                        <span className="sub-menu-heading">System</span>
                        <button
                            type="button"
                            className={`sub-nav-item ${activeTab === 'system' ? 'active' : ''}`}
                            onClick={() => setActiveTab('system')}
                        >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>About Architecture</span>
                        </button>
                    </div>
                </aside>

                {/* Right Settings Content Panel with Horizontal Row Dividers (Prime Pay Reference) */}
                <div className="prime-settings-panel">
                    {activeTab === 'general' && (
                        <>
                            {/* Row 1: Theme & Color Palette (Prime Pay Circle Swatches) */}
                            <div className="prime-settings-row">
                                <div className="row-label-column">
                                    <h3 className="row-title">Theme</h3>
                                    <p className="row-desc">Choose a preferred brand accent for the app.</p>
                                </div>
                                <div className="row-control-column">
                                    <div className="prime-theme-picker" role="radiogroup" aria-label="Theme Color Options">
                                        {Object.entries(THEME_PALETTES).map(([key, palette]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                className={`prime-color-dot ${themeColor === key ? 'active' : ''}`}
                                                style={{ backgroundColor: palette.accent || palette.primary }}

                                                onClick={() => {
                                                    setThemeColor(key);
                                                    showNotice(`Theme updated to ${palette.name}`);
                                                }}
                                                title={palette.name}
                                                aria-label={palette.name}
                                            >
                                                {themeColor === key && (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="control-subtext">
                                        Active: <strong>{THEME_PALETTES[themeColor]?.name || 'Vaultex Slate'}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Row 2: Currency & Region (Prime Pay Dropdowns) */}
                            <div className="prime-settings-row">
                                <div className="row-label-column">
                                    <h3 className="row-title">Language & Region</h3>
                                    <p className="row-desc">Customize your primary dashboard currency formatting.</p>
                                </div>
                                <div className="row-control-column">
                                    <div className="prime-select-field">
                                        <label htmlFor="prime-currency" className="control-field-label">Active Currency</label>
                                        <select
                                            id="prime-currency"
                                            className="prime-select"
                                            value={currency}
                                            onChange={(e) => {
                                                setCurrency(e.target.value);
                                                showNotice(`Currency updated to ${e.target.value}`);
                                            }}
                                        >
                                            {Object.entries(CURRENCY_CONFIG).map(([code, item]) => (
                                                <option key={code} value={code}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>

                                    </div>
                                    <span className="control-subtext">
                                        Persistently updates currency calculations across all tables and charts.
                                    </span>
                                </div>
                            </div>

                            {/* Row 3: Data Synchronization */}
                            <div className="prime-settings-row">
                                <div className="row-label-column">
                                    <h3 className="row-title">Data & Cache Synchronization</h3>
                                    <p className="row-desc">Synchronize with Express API or reset client-side preferences.</p>
                                </div>
                                <div className="row-control-column">
                                    <div className="prime-actions-row">
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => {
                                                fetchTransactions();
                                                showNotice("Synchronized latest transactions from Express API!");
                                            }}
                                        >
                                            Sync From Server
                                        </button>

                                        <button
                                            type="button"
                                            className="btn-secondary btn-danger-subtle"
                                            onClick={() => setShowResetConfirm(true)}
                                        >
                                            Reset Preferences
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'display' && (
                        <>
                            {/* Display View Options (Working Functional Toggle Switches) */}
                            <div className="prime-settings-row">
                                <div className="row-label-column">
                                    <h3 className="row-title">Editor View Options</h3>
                                    <p className="row-desc">Customize display density and table columns.</p>
                                </div>
                                <div className="row-control-column">
                                    <div className="prime-toggle-list">
                                        {/* Toggle 1: Compact Table View */}
                                        <label className="prime-toggle-item">
                                            <input
                                                type="checkbox"
                                                className="prime-switch-input"
                                                checked={compactView}
                                                onChange={(e) => {
                                                    setCompactView(e.target.checked);
                                                    showNotice(`Compact table view ${e.target.checked ? 'enabled' : 'disabled'}`);
                                                }}
                                            />
                                            <span className="prime-switch-slider" />
                                            <span className="prime-toggle-label">
                                                <strong>Compact table rows</strong> — Reduces padding on the Transactions page for higher density.
                                            </span>
                                        </label>

                                        {/* Toggle 2: Show Timestamp Detail */}
                                        <label className="prime-toggle-item">
                                            <input
                                                type="checkbox"
                                                className="prime-switch-input"
                                                checked={showTime}
                                                onChange={(e) => {
                                                    setShowTime(e.target.checked);
                                                    showNotice(`Timestamp detail ${e.target.checked ? 'visible' : 'hidden'}`);
                                                }}
                                            />
                                            <span className="prime-switch-slider" />
                                            <span className="prime-toggle-label">
                                                <strong>Show timestamp detail</strong> — Displays the recorded time alongside the transaction date.
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'system' && (
                        <div className="prime-settings-row">
                            <div className="row-label-column">
                                <h3 className="row-title">Architecture & System Details</h3>
                                <p className="row-desc">Application stack and database status.</p>
                            </div>
                            <div className="row-control-column">
                                <div className="system-info-table">
                                    <div className="sys-row">
                                        <span className="sys-label">Project</span>
                                        <span className="sys-val">Vaultex Personal Finance</span>
                                    </div>
                                    <div className="sys-row">
                                        <span className="sys-label">Frontend</span>
                                        <span className="sys-val">React 19 + Vite 8 + React Router 7</span>
                                    </div>
                                    <div className="sys-row">
                                        <span className="sys-label">Backend</span>
                                        <span className="sys-val">Node.js + Express 5 REST API</span>
                                    </div>
                                    <div className="sys-row">
                                        <span className="sys-label">Database</span>
                                        <span className="sys-val">MongoDB Atlas ({transactions.length} records)</span>
                                    </div>
                                    <div className="sys-row">
                                        <span className="sys-label">Developer</span>
                                        <span className="sys-val">Emmanuel Alo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reset Confirmation Dialog */}
            {showResetConfirm && (
                <div className="modal-backdrop" role="alertdialog" aria-modal="true">
                    <div className="modal-card modal-delete-card">
                        <div className="delete-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="delete-dialog-title">Reset Preferences?</h2>
                        <p className="delete-dialog-desc">
                            Are you sure you want to reset your currency, theme accent, and display preferences back to factory defaults?
                        </p>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowResetConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={handleConfirmReset}
                            >
                                Yes, Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
