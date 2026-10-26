import React, { useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, getCategoryColor } from '../constants/categories'
import {
    calculateSavingsRate,
    getDateRangeBounds,
    filterTransactionsByDateRange,
    generateMonthlyReportSeries,
    calculateCategoryBreakdown,
    generateTransactionsCSV
} from '../utils/finance'

const ALL_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

const PRESET_OPTIONS = [
    { id: 'this-month', label: 'This Month' },
    { id: 'last-month', label: 'Last Month' },
    { id: 'last-3-months', label: 'Last 3 Months' },
    { id: 'last-6-months', label: 'Last 6 Months' },
    { id: 'custom', label: 'Custom Range' }
];

const ReportsView = () => {
    const {
        transactions = [],
        currency = 'USD',
        formatCurrency,
        formatTxDate,
        compactView,
        showTime
    } = useOutletContext();

    // Baseline reference date (stable across renders)
    const [referenceDate] = useState(() => new Date());

    // Date Range State
    const [preset, setPreset] = useState('this-month');
    const [customStart, setCustomStart] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [customEnd, setCustomEnd] = useState(() => {
        const d = new Date();
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    });

    // Breakdown Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [hoveredMonth, setHoveredMonth] = useState(null);

    // 1. Calculate active date range boundaries & validate
    const rangeBounds = useMemo(() => {
        return getDateRangeBounds(preset, customStart, customEnd, referenceDate);
    }, [preset, customStart, customEnd, referenceDate]);

    // 2. Filter transactions strictly to the selected period
    const periodTransactions = useMemo(() => {
        if (!rangeBounds.isValid) return [];
        return filterTransactionsByDateRange(transactions, rangeBounds.startDate, rangeBounds.endDate);
    }, [transactions, rangeBounds]);

    // 3. Calculate Period Totals and Savings Rate
    const periodMetrics = useMemo(() => {
        let inc = 0;
        let exp = 0;
        let incCount = 0;
        let expCount = 0;

        for (let i = 0; i < periodTransactions.length; i++) {
            const tx = periodTransactions[i];
            const amt = Number(tx.amount) || 0;
            if (tx.type === 'income') {
                inc += amt;
                incCount++;
            } else {
                exp += amt;
                expCount++;
            }
        }

        const totalIncome = Math.round(inc * 100) / 100;
        const totalExpense = Math.round(exp * 100) / 100;
        const netCashFlow = Math.round((totalIncome - totalExpense) * 100) / 100;
        const savingsRate = calculateSavingsRate(totalIncome, totalExpense);

        return {
            totalIncome,
            totalExpense,
            netCashFlow,
            savingsRate,
            incCount,
            expCount,
            totalCount: periodTransactions.length
        };
    }, [periodTransactions]);

    // 4. Monthly Inflow vs Outflow Trajectory Series
    const { series: monthlySeries, maxMonthlyValue } = useMemo(() => {
        if (!rangeBounds.isValid) {
            return { series: [], maxMonthlyValue: 100 };
        }
        return generateMonthlyReportSeries(periodTransactions, rangeBounds.startDate, rangeBounds.endDate);
    }, [periodTransactions, rangeBounds]);

    // 5. Category Expense Breakdown
    const categoryBreakdown = useMemo(() => {
        const expensesOnly = periodTransactions.filter(tx => tx.type !== 'income');
        return calculateCategoryBreakdown(expensesOnly, periodMetrics.totalExpense);
    }, [periodTransactions, periodMetrics.totalExpense]);

    // 6. Filtered and Sorted Transaction Breakdown
    const displayedTransactions = useMemo(() => {
        let result = [...periodTransactions];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(tx =>
                (tx.description && tx.description.toLowerCase().includes(query)) ||
                (tx.category && tx.category.toLowerCase().includes(query))
            );
        }

        if (typeFilter !== 'all') {
            result = result.filter(tx => tx.type === typeFilter);
        }

        if (categoryFilter !== 'all') {
            result = result.filter(tx => (tx.category || 'Other') === categoryFilter);
        }

        result.sort((a, b) => {
            const amtA = Number(a.amount) || 0;
            const amtB = Number(b.amount) || 0;
            if (sortBy === 'highest') return amtB - amtA;
            if (sortBy === 'lowest') return amtA - amtB;

            const timeA = new Date(a.date || a.createdAt || 0).getTime();
            const timeB = new Date(b.date || b.createdAt || 0).getTime();
            if (sortBy === 'oldest') return timeA - timeB;
            return timeB - timeA;
        });

        return result;
    }, [periodTransactions, searchQuery, typeFilter, categoryFilter, sortBy]);

    // Handle CSV Export
    const handleExportCSV = () => {
        if (displayedTransactions.length === 0) return;

        const csvContent = generateTransactionsCSV(displayedTransactions, currency);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const startStr = rangeBounds.startDate.toISOString().slice(0, 10);
        const endStr = rangeBounds.endDate.toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `vaultex-financial-report-${preset}-${startStr}-to-${endStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const isFiltered = searchQuery.trim() !== '' || typeFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'newest';

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setCategoryFilter('all');
        setSortBy('newest');
    };

    // Format human-friendly range display label
    const rangeLabel = useMemo(() => {
        if (!rangeBounds.isValid) return 'Invalid Range';
        const startStr = rangeBounds.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const endStr = rangeBounds.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startStr} — ${endStr}`;
    }, [rangeBounds]);

    return (
        <div className="reports-container">
            {/* Top Period Selector Bar */}
            <div className="reports-header-card">
                <div className="reports-header-left">
                    <span className="reports-header-caption">Select a reporting window to analyze cash flow, category distribution, and savings rate.</span>
                    <div className="reports-date-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>{rangeLabel}</span>
                    </div>
                </div>

                <div className="reports-preset-chips" role="radiogroup" aria-label="Date Range Presets">
                    {PRESET_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={preset === opt.id}
                            className={`preset-chip ${preset === opt.id ? 'active' : ''}`}
                            onClick={() => setPreset(opt.id)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Range Picker Inputs (Only visible when Custom Range is active) */}
            {preset === 'custom' && (
                <div className="reports-custom-picker-bar">
                    <div className="custom-input-group">
                        <label htmlFor="custom-start-date">Start Date:</label>
                        <input
                            id="custom-start-date"
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="cazura-select"
                        />
                    </div>
                    <div className="custom-input-group">
                        <label htmlFor="custom-end-date">End Date (inclusive):</label>
                        <input
                            id="custom-end-date"
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="cazura-select"
                        />
                    </div>
                    {!rangeBounds.isValid && (
                        <div className="custom-range-error" role="alert">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{rangeBounds.errorMessage}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Executive KPI Summary Cards */}
            <section className="reports-kpi-grid" aria-label="Executive Financial Summary">
                {/* Total Income */}
                <article className="cazura-kpi-card">
                    <div className="cazura-kpi-header">
                        <span className="cazura-kpi-title">Period Income</span>
                    </div>
                    <div className="cazura-kpi-val text-income">{formatCurrency(periodMetrics.totalIncome)}</div>
                    <div className="cazura-kpi-trend trend-positive">
                        <span>+{periodMetrics.incCount} credits in period</span>
                    </div>
                </article>

                {/* Total Expenses */}
                <article className="cazura-kpi-card">
                    <div className="cazura-kpi-header">
                        <span className="cazura-kpi-title">Period Expenses</span>
                    </div>
                    <div className="cazura-kpi-val text-expense">-{formatCurrency(periodMetrics.totalExpense).replace('-', '')}</div>
                    <div className="cazura-kpi-trend trend-negative">
                        <span>-{periodMetrics.expCount} debits in period</span>
                    </div>
                </article>

                {/* Net Cash Flow */}
                <article className="cazura-kpi-card">
                    <div className="cazura-kpi-header">
                        <span className="cazura-kpi-title">Net Cash Flow</span>
                    </div>
                    <div className={`cazura-kpi-val ${periodMetrics.netCashFlow >= 0 ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(periodMetrics.netCashFlow)}
                    </div>
                    <div className={`cazura-kpi-trend ${periodMetrics.netCashFlow >= 0 ? 'trend-positive' : 'trend-negative'}`}>
                        <span>{periodMetrics.netCashFlow >= 0 ? 'Net surplus retained' : 'Net deficit incurred'}</span>
                    </div>
                </article>

                {/* Savings Rate */}
                <article className="cazura-kpi-card">
                    <div className="cazura-kpi-header">
                        <span className="cazura-kpi-title">Savings Rate</span>
                    </div>
                    <div className="cazura-kpi-val">
                        {periodMetrics.savingsRate !== null ? `${periodMetrics.savingsRate}%` : 'N/A'}
                    </div>
                    <div className={`cazura-kpi-trend ${periodMetrics.savingsRate !== null && periodMetrics.savingsRate >= 20 ? 'trend-positive' : 'trend-neutral'}`}>
                        <span>
                            {periodMetrics.savingsRate !== null
                                ? (periodMetrics.savingsRate >= 0 ? 'Of period income saved' : 'Expenses exceed income')
                                : 'No income recorded'}
                        </span>
                    </div>
                </article>
            </section>

            {/* Middle Row: Trajectory Chart (Left) & Category Distribution (Right) */}
            <div className="reports-visuals-grid">
                {/* Monthly Income vs Expenses Visualizer */}
                <section className="jeamstar-chart-card reports-chart-card" aria-label="Monthly Comparison Chart">
                    <div className="chart-card-header">
                        <div>
                            <h3 className="chart-card-title">Income vs Expenses Trajectory</h3>
                            <p className="chart-card-sub">Comparison of inflows and outflows across months in selected period.</p>
                        </div>
                    </div>

                    {monthlySeries.length > 0 ? (
                        <div className="monthly-chart-canvas">
                            {hoveredMonth !== null && (
                                <div className="jeamstar-chart-tooltip">
                                    <span className="tooltip-month">{monthlySeries[hoveredMonth]?.name}</span>
                                    <div className="tooltip-row">
                                        <span className="tooltip-dot green" />
                                        <span>Income: {formatCurrency(monthlySeries[hoveredMonth]?.income)}</span>
                                    </div>
                                    <div className="tooltip-row">
                                        <span className="tooltip-dot red" />
                                        <span>Expense: {formatCurrency(monthlySeries[hoveredMonth]?.expense)}</span>
                                    </div>
                                    <div className="tooltip-row">
                                        <span className="tooltip-dot blue" />
                                        <span>Savings Rate: {monthlySeries[hoveredMonth]?.savingsRate !== null ? `${monthlySeries[hoveredMonth].savingsRate}%` : 'N/A'}</span>
                                    </div>
                                </div>
                            )}

                            <div className="bars-container">
                                {monthlySeries.map((m, idx) => {
                                    const incomeHeight = maxMonthlyValue > 0 ? (m.income / maxMonthlyValue) * 160 : 0;
                                    const expenseHeight = maxMonthlyValue > 0 ? (m.expense / maxMonthlyValue) * 160 : 0;

                                    return (
                                        <div
                                            key={m.key}
                                            className="month-bar-group"
                                            onMouseEnter={() => setHoveredMonth(idx)}
                                            onMouseLeave={() => setHoveredMonth(null)}
                                        >
                                            <div className="bars-pair">
                                                <div
                                                    className="bar-col bar-income"
                                                    style={{ height: `${Math.max(4, incomeHeight)}px` }}
                                                    title={`${m.name} Income: ${formatCurrency(m.income)}`}
                                                />
                                                <div
                                                    className="bar-col bar-expense"
                                                    style={{ height: `${Math.max(4, expenseHeight)}px` }}
                                                    title={`${m.name} Expense: ${formatCurrency(m.expense)}`}
                                                />
                                            </div>
                                            <span className="month-axis-label">{m.shortName}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="chart-legend-bottom">
                                <div className="legend-item">
                                    <span className="legend-box bar-income" />
                                    <span>Income</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-box bar-expense" />
                                    <span>Expenses</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-sub-state">
                            <p>No activity recorded in this period.</p>
                        </div>
                    )}
                </section>

                {/* Expenses by Category Breakdown */}
                <section className="jeamstar-distribution-card reports-category-card" aria-label="Category Distribution">
                    <div className="chart-card-header">
                        <div>
                            <h3 className="chart-card-title">Expenses by Category</h3>
                            <p className="chart-card-sub">Share of total outflows across categories.</p>
                        </div>
                    </div>

                    {categoryBreakdown.length > 0 ? (
                        <div className="reports-category-list">
                            {categoryBreakdown.map(item => (
                                <div key={item.category} className="reports-category-item">
                                    <div className="reports-cat-header">
                                        <div className="reports-cat-left">
                                            <span
                                                className="reports-cat-dot"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="reports-cat-name">{item.category}</span>
                                        </div>
                                        <div className="reports-cat-right">
                                            <span className="reports-cat-amt">{formatCurrency(item.amount)}</span>
                                            <span className="reports-cat-pct">({item.percentage}%)</span>
                                        </div>
                                    </div>
                                    <div className="reports-progress-track">
                                        <div
                                            className="reports-progress-fill"
                                            style={{
                                                width: `${item.percentage}%`,
                                                backgroundColor: item.color
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-sub-state">
                            <p>No expenses recorded in the selected reporting period.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Bottom Section: Transaction Breakdown with Search, Filter, Sort & CSV Export */}
            <section className="cazura-table-card reports-table-card" aria-label="Transaction Breakdown">
                <div className="cazura-table-card-header reports-table-header">
                    <div>
                        <h2 className="cazura-table-title">Period Transaction Breakdown</h2>
                        <span className="reports-subtext">Detailed record of all transactions within the selected range.</span>
                    </div>

                    <div className="reports-table-actions">
                        {/* Search Input */}
                        <div className="cazura-search-box">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search transactions"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="cazura-search-clear"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search query"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Export CSV Button */}
                        <button
                            type="button"
                            className="btn-export-csv"
                            onClick={handleExportCSV}
                            disabled={displayedTransactions.length === 0}
                            title="Export filtered transactions to CSV"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Export CSV ({displayedTransactions.length})</span>
                        </button>
                    </div>
                </div>

                {/* Filter and Sorting Controls Bar */}
                <div className="cazura-expanded-filter-bar reports-filters-bar">
                    <div className="filter-select-group">
                        <label htmlFor="rep-type-filter" className="filter-label">Type:</label>
                        <select
                            id="rep-type-filter"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="cazura-select"
                        >
                            <option value="all">All Types</option>
                            <option value="income">Income Only</option>
                            <option value="expense">Expense Only</option>
                        </select>
                    </div>

                    <div className="filter-select-group">
                        <label htmlFor="rep-cat-filter" className="filter-label">Category:</label>
                        <select
                            id="rep-cat-filter"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="cazura-select"
                        >
                            <option value="all">All Categories</option>
                            {ALL_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-select-group">
                        <label htmlFor="rep-sort" className="filter-label">Sort:</label>
                        <select
                            id="rep-sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="cazura-select"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="highest">Highest Amount</option>
                            <option value="lowest">Lowest Amount</option>
                        </select>
                    </div>

                    {isFiltered && (
                        <button
                            type="button"
                            className="cazura-reset-link"
                            onClick={clearFilters}
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

                {/* Transactions Table */}
                {displayedTransactions.length > 0 ? (
                    <div className="cazura-table-wrapper">
                        <table className={`cazura-table ${compactView ? 'compact-rows' : ''}`}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    {showTime && <th>Time</th>}
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Type</th>
                                    <th className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedTransactions.map((tx) => {
                                    const txDate = formatTxDate(tx.date || tx.createdAt);
                                    const categoryLabel = tx.category || 'Other';
                                    const catColor = getCategoryColor(categoryLabel);

                                    return (
                                        <tr key={tx._id || tx.id}>
                                            <td className="cazura-date-cell">{txDate.date}</td>
                                            {showTime && <td className="cazura-time-cell">{txDate.time}</td>}
                                            <td className="cazura-desc-cell">{tx.description}</td>
                                            <td>
                                                <div className="cazura-category-cell">
                                                    <span
                                                        className="cazura-cat-dot"
                                                        style={{ backgroundColor: catColor }}
                                                    />
                                                    <span className="cazura-cat-name">{categoryLabel}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`cazura-type-pill ${tx.type}`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className={`cazura-amount-cell ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                                                {tx.type === 'income'
                                                    ? `+${formatCurrency(tx.amount)}`
                                                    : `-${formatCurrency(tx.amount).replace('-', '')}`
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="cazura-table-footer">
                            <span className="cazura-footer-count">
                                Showing <strong>{displayedTransactions.length}</strong> of {periodTransactions.length} period transactions
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="cazura-empty-table">
                        <p>No transactions match the selected date range and filter criteria.</p>
                        {isFiltered && (
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={clearFilters}
                                style={{ marginTop: '0.75rem' }}
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default ReportsView;
