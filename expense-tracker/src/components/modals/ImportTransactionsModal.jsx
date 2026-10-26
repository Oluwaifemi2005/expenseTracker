import React, { useState, useRef } from 'react'
import { previewTransactionsImport, importTransactions } from '../../api/transactionsApi'
import { MAX_CSV_SIZE_BYTES } from '../../utils/csvParser'

const ImportTransactionsModal = ({
    isOpen,
    onClose,
    onImportSuccess,
    currency = 'USD',
    formatCurrency
}) => {
    // Stage: 'upload' | 'preview' | 'result'
    const [step, setStep] = useState('upload');
    const [fileName, setFileName] = useState('');
    const [csvContent, setCsvContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Preview data from server
    const [previewData, setPreviewData] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'valid' | 'invalid' | 'duplicates'

    // Options
    const [skipExistingDuplicates, setSkipExistingDuplicates] = useState(true);
    const [skipInFileDuplicates, setSkipInFileDuplicates] = useState(true);
    const [importMode, setImportMode] = useState('valid_only'); // 'valid_only' | 'all_or_nothing'

    // Result data from server
    const [resultData, setResultData] = useState(null);

    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

    if (!isOpen) return null;

    const resetState = () => {
        setStep('upload');
        setFileName('');
        setCsvContent('');
        setIsLoading(false);
        setErrorMessage('');
        setPreviewData(null);
        setActiveTab('all');
        setSkipExistingDuplicates(true);
        setSkipInFileDuplicates(true);
        setImportMode('valid_only');
        setResultData(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFile = async (file) => {
        if (!file) return;
        setErrorMessage('');

        if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
            setErrorMessage('Please upload a valid CSV file (.csv).');
            return;
        }

        if (file.size > MAX_CSV_SIZE_BYTES) {
            setErrorMessage(`File exceeds the maximum size limit of 2 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
            return;
        }

        if (file.size === 0) {
            setErrorMessage('Uploaded CSV file is empty.');
            return;
        }

        setFileName(file.name);
        setIsLoading(true);

        try {
            const text = await file.text();
            if (!text.trim()) {
                setErrorMessage('Uploaded CSV file contains no data.');
                setIsLoading(false);
                return;
            }

            setCsvContent(text);

            // Fetch server-side preview & validation
            const response = await previewTransactionsImport(text);
            setPreviewData(response.data);
            setStep('preview');
        } catch (err) {
            console.error('CSV preview error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to parse CSV file.';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleImportSubmit = async () => {
        if (!csvContent) return;
        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await importTransactions({
                csvContent,
                importMode,
                skipExistingDuplicates,
                skipInFileDuplicates
            });

            setResultData(response.data);
            setStep('result');
            if (onImportSuccess) {
                onImportSuccess(response.data);
            }
        } catch (err) {
            console.error('CSV import error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to complete transaction import.';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter rows for preview tab
    const filteredPreviewRows = (previewData?.rows || []).filter((row) => {
        if (activeTab === 'valid') return row.status === 'valid';
        if (activeTab === 'invalid') return row.status === 'invalid';
        if (activeTab === 'duplicates') {
            return row.status === 'duplicate_file' || row.status === 'duplicate_existing';
        }
        return true;
    });

    const summary = previewData?.summary || {
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        duplicateFileCount: 0,
        duplicateExistingCount: 0
    };

    const totalDuplicates = summary.duplicateFileCount + summary.duplicateExistingCount;

    return (
        <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
            <div className="modal-card import-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title-group">
                        <div className="import-icon-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="import-modal-title" className="modal-title">Import Transactions</h2>
                            <p className="modal-subtitle">
                                {step === 'upload' && 'Upload a CSV file to import multiple income and expense records.'}
                                {step === 'preview' && `Previewing ${fileName} before writing to your vault.`}
                                {step === 'result' && 'Import complete. Review the final summary below.'}
                            </p>
                        </div>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Close import dialog">
                        ✕
                    </button>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="auth-error-banner" role="alert" style={{ margin: '1rem 0' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* STEP 1: UPLOAD */}
                {step === 'upload' && (
                    <div className="import-step-upload">
                        <div
                            className={`import-dropzone ${isDragOver ? 'drag-over' : ''}`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv,application/vnd.ms-excel"
                                onChange={handleFileInputChange}
                                style={{ display: 'none' }}
                                id="csv-file-input"
                            />
                            <div className="dropzone-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="12" y1="18" x2="12" y2="12" />
                                    <line x1="9" y1="15" x2="12" y2="12" />
                                    <line x1="15" y1="15" x2="12" y2="12" />
                                </svg>
                            </div>
                            <span className="dropzone-primary-text">
                                {isLoading ? 'Parsing and validating CSV...' : 'Click to browse or drag and drop your CSV file here'}
                            </span>
                            <span className="dropzone-subtext">
                                Supports standard CSV files up to 2 MB and 1,000 transaction rows.
                            </span>
                        </div>

                        {/* Format Guidance Card */}
                        <div className="import-format-guidance">
                            <h4 className="guidance-title">Supported Column Headers</h4>
                            <p className="guidance-desc">
                                Matches the headers generated by Vaultex Reports export:
                            </p>
                            <div className="guidance-columns-list">
                                <span className="guidance-col-tag required">Date (Required)</span>
                                <span className="guidance-col-tag required">Description (Required)</span>
                                <span className="guidance-col-tag required">Amount (Required)</span>
                                <span className="guidance-col-tag optional">Type (expense / income)</span>
                                <span className="guidance-col-tag optional">Category (Food, Rent, etc.)</span>
                            </div>
                            <div className="guidance-code-preview">
                                <code>Date,Description,Type,Category,Amount ({currency})</code>
                                <br />
                                <code>2026-10-15,Supermarket Groceries,expense,Food & Dining,65.50</code>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                            <button type="button" className="btn-secondary" onClick={handleClose}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: PREVIEW */}
                {step === 'preview' && (
                    <div className="import-step-preview">
                        {/* Summary KPI Badges */}
                        <div className="preview-kpi-bar">
                            <div className="preview-kpi-item">
                                <span className="kpi-label">Total Rows</span>
                                <span className="kpi-num">{summary.totalRows}</span>
                            </div>
                            <div className="preview-kpi-item valid">
                                <span className="kpi-label">Valid Rows</span>
                                <span className="kpi-num">{summary.validCount}</span>
                            </div>
                            <div className="preview-kpi-item duplicates">
                                <span className="kpi-label">Matches / Duplicates</span>
                                <span className="kpi-num">{totalDuplicates}</span>
                            </div>
                            <div className="preview-kpi-item invalid">
                                <span className="kpi-label">Invalid Rows</span>
                                <span className="kpi-num">{summary.invalidCount}</span>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="preview-tabs-bar">
                            <button
                                type="button"
                                className={`preview-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                All ({summary.totalRows})
                            </button>
                            <button
                                type="button"
                                className={`preview-tab-btn ${activeTab === 'valid' ? 'active' : ''}`}
                                onClick={() => setActiveTab('valid')}
                            >
                                Valid ({summary.validCount})
                            </button>
                            <button
                                type="button"
                                className={`preview-tab-btn ${activeTab === 'duplicates' ? 'active' : ''}`}
                                onClick={() => setActiveTab('duplicates')}
                            >
                                Duplicates ({totalDuplicates})
                            </button>
                            {summary.invalidCount > 0 && (
                                <button
                                    type="button"
                                    className={`preview-tab-btn invalid ${activeTab === 'invalid' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('invalid')}
                                >
                                    Invalid ({summary.invalidCount})
                                </button>
                            )}
                        </div>

                        {/* Preview Table */}
                        <div className="cazura-table-wrapper preview-table-wrapper">
                            <table className="cazura-table compact-rows preview-table">
                                <thead>
                                    <tr>
                                        <th>Row</th>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Type</th>
                                        <th>Category</th>
                                        <th className="text-right">Amount</th>
                                        <th>Status</th>
                                        <th>Notes / Errors</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPreviewRows.length > 0 ? (
                                        filteredPreviewRows.map((row) => {
                                            const isInvalid = row.status === 'invalid';
                                            const isDupFile = row.status === 'duplicate_file';
                                            const isDupExisting = row.status === 'duplicate_existing';

                                            return (
                                                <tr key={row.rowNumber} className={`preview-row-${row.status}`}>
                                                    <td className="row-num-cell">#{row.rowNumber}</td>
                                                    <td>{row.parsed?.dateStr || row.raw?.Date || '—'}</td>
                                                    <td className="desc-cell" title={row.parsed?.description || row.raw?.Description}>
                                                        {row.parsed?.description || row.raw?.Description || '—'}
                                                    </td>
                                                    <td>
                                                        <span className={`cazura-type-pill ${row.parsed?.type || row.raw?.Type || 'expense'}`}>
                                                            {row.parsed?.type || row.raw?.Type || 'expense'}
                                                        </span>
                                                    </td>
                                                    <td>{row.parsed?.category || row.raw?.Category || 'Other'}</td>
                                                    <td className={`text-right ${row.parsed?.type === 'income' ? 'text-income' : 'text-expense'}`}>
                                                        {row.parsed ? formatCurrency(row.parsed.amount) : row.raw?.Amount}
                                                    </td>
                                                    <td>
                                                        {row.status === 'valid' && (
                                                            <span className="import-status-tag status-valid">Valid</span>
                                                        )}
                                                        {isDupFile && (
                                                            <span className="import-status-tag status-dup">In-File Dup</span>
                                                        )}
                                                        {isDupExisting && (
                                                            <span className="import-status-tag status-dup">History Match</span>
                                                        )}
                                                        {isInvalid && (
                                                            <span className="import-status-tag status-invalid">Invalid</span>
                                                        )}
                                                    </td>
                                                    <td className="preview-notes-cell">
                                                        {isInvalid && (
                                                            <span className="preview-error-text">
                                                                {row.errors.join('; ')}
                                                            </span>
                                                        )}
                                                        {(isDupFile || isDupExisting) && (
                                                            <span className="preview-dup-text">
                                                                {row.matchReason}
                                                            </span>
                                                        )}
                                                        {row.status === 'valid' && (
                                                            <span className="preview-ready-text">Ready to import</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                                                No rows in this filter category.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Import Options */}
                        <div className="import-options-box">
                            <h4 className="options-title">Import Options</h4>
                            <div className="options-controls">
                                <label className="option-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={skipExistingDuplicates}
                                        onChange={(e) => setSkipExistingDuplicates(e.target.checked)}
                                    />
                                    <span>
                                        Skip transactions that match existing records in your history ({summary.duplicateExistingCount} match{summary.duplicateExistingCount === 1 ? '' : 'es'})
                                    </span>
                                </label>

                                <label className="option-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={skipInFileDuplicates}
                                        onChange={(e) => setSkipInFileDuplicates(e.target.checked)}
                                    />
                                    <span>
                                        Skip duplicate rows detected within this file ({summary.duplicateFileCount} duplicate{summary.duplicateFileCount === 1 ? '' : 's'})
                                    </span>
                                </label>

                                {summary.invalidCount > 0 && (
                                    <div className="import-mode-selection">
                                        <span className="mode-label">Handling rows with errors:</span>
                                        <div className="mode-radios">
                                            <label className="mode-radio-label">
                                                <input
                                                    type="radio"
                                                    name="importMode"
                                                    value="valid_only"
                                                    checked={importMode === 'valid_only'}
                                                    onChange={() => setImportMode('valid_only')}
                                                />
                                                <span>Import valid rows only (skip {summary.invalidCount} invalid row{summary.invalidCount === 1 ? '' : 's'})</span>
                                            </label>
                                            <label className="mode-radio-label">
                                                <input
                                                    type="radio"
                                                    name="importMode"
                                                    value="all_or_nothing"
                                                    checked={importMode === 'all_or_nothing'}
                                                    onChange={() => setImportMode('all_or_nothing')}
                                                />
                                                <span>Cancel import if any rows are invalid (strict all-or-nothing)</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    setStep('upload');
                                    setPreviewData(null);
                                }}
                                disabled={isLoading}
                            >
                                ← Choose Another File
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleImportSubmit}
                                disabled={
                                    isLoading ||
                                    (importMode === 'all_or_nothing' && summary.invalidCount > 0) ||
                                    (summary.validCount === 0 && !(!skipExistingDuplicates && summary.duplicateExistingCount > 0))
                                }
                            >
                                {isLoading ? 'Importing Transactions...' : 'Confirm & Import Transactions'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: RESULT SUMMARY */}
                {step === 'result' && resultData && (
                    <div className="import-step-result">
                        <div className="result-banner success">
                            <div className="result-icon-circle">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="result-title">{resultData.message}</h3>
                                <p className="result-subtext">
                                    Your transactions have been saved and associated securely with your account.
                                </p>
                            </div>
                        </div>

                        <div className="result-metrics-grid">
                            <div className="result-metric-card valid">
                                <span className="metric-val">{resultData.importedCount}</span>
                                <span className="metric-lbl">Imported</span>
                            </div>
                            <div className="result-metric-card skipped">
                                <span className="metric-val">{resultData.skippedCount}</span>
                                <span className="metric-lbl">Skipped</span>
                            </div>
                            <div className="result-metric-card failed">
                                <span className="metric-val">{resultData.failedCount}</span>
                                <span className="metric-lbl">Failed</span>
                            </div>
                        </div>

                        {/* Detailed Skipped Rows */}
                        {resultData.skippedRows && resultData.skippedRows.length > 0 && (
                            <div className="result-skipped-section">
                                <h4 className="skipped-section-title">Skipped Rows Details ({resultData.skippedRows.length})</h4>
                                <div className="result-skipped-list">
                                    {resultData.skippedRows.map((sr, idx) => (
                                        <div key={idx} className="skipped-item">
                                            <span className="skipped-row-tag">Row #{sr.rowNumber}</span>
                                            <span className="skipped-desc">{sr.description}</span>
                                            <span className="skipped-reason">{sr.reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detailed Failed Rows */}
                        {resultData.failedWrites && resultData.failedWrites.length > 0 && (
                            <div className="result-skipped-section">
                                <h4 className="skipped-section-title failed">Failed Database Writes ({resultData.failedWrites.length})</h4>
                                <div className="result-skipped-list">
                                    {resultData.failedWrites.map((fw, idx) => (
                                        <div key={idx} className="skipped-item failed">
                                            <span className="skipped-row-tag">Row #{fw.rowNumber}</span>
                                            <span className="skipped-desc">{fw.description}</span>
                                            <span className="skipped-reason">{fw.error}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                            <button type="button" className="btn-primary" onClick={handleClose}>
                                Done & View Transactions
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportTransactionsModal;
