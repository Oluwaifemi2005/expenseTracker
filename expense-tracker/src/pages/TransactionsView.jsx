import React, { useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, getCategoryColor } from '../constants/categories'
import { calculateCategoryBreakdown, calculatePagination } from '../utils/finance'
import ImportTransactionsModal from '../components/modals/ImportTransactionsModal'

const ALL_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

const TransactionsView = () => {
    const {
        transactions = [],
        income = [],
        expense = [],
        totalIncome = 0,
        totalExpense = 0,
        balance = 0,
        inflowOutflowRatio = null,
        averageExpense = 0,
        formatCurrency,
        formatTxDate,
        startEditing,
        setTransactionToDelete,
        setIsAddModalOpen,
        compactView,
        showTime,
        fetchTransactions,
        currency = 'USD'
    } = useOutletContext();

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Search, Filter, and Sort States
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [showFilterBar, setShowFilterBar] = useState(false);

    // Filter and Sort Logic
    const filteredTransactions = useMemo(() => {
        let result = [...transactions];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((tx) =>
                tx.description.toLowerCase().includes(query) ||
                (tx.category && tx.category.toLowerCase().includes(query))
            );
        }

        if (typeFilter !== "all") {
            result = result.filter((tx) => tx.type === typeFilter);
        }

        if (categoryFilter !== "all") {
            result = result.filter((tx) => (tx.category || "Other") === categoryFilter);
        }

        result.sort((a, b) => {
            const amtA = Number(a.amount) || 0;
            const amtB = Number(b.amount) || 0;
            if (sortBy === "highest") return amtB - amtA;
            if (sortBy === "lowest") return amtA - amtB;

            const timeA = new Date(a.date || a.createdAt || 0).getTime();
            const timeB = new Date(b.date || b.createdAt || 0).getTime();
            if (sortBy === "oldest") return timeA - timeB;
            return timeB - timeA;
        });

        return result;
    }, [transactions, searchQuery, typeFilter, categoryFilter, sortBy]);

    const isFiltered = searchQuery.trim() !== "" || typeFilter !== "all" || categoryFilter !== "all" || sortBy !== "newest";

    const clearFilters = () => {
        setSearchQuery("");
        setTypeFilter("all");
        setCategoryFilter("all");
        setSortBy("newest");
    };

    // Pagination configuration & state (10 items per page)
    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [prevFilterKey, setPrevFilterKey] = useState(() => `${searchQuery}|${typeFilter}|${categoryFilter}|${sortBy}`);

    // Reset to page 1 during render whenever search, filters, or sorting change
    const currentFilterKey = `${searchQuery}|${typeFilter}|${categoryFilter}|${sortBy}`;
    if (prevFilterKey !== currentFilterKey) {
        setPrevFilterKey(currentFilterKey);
        setCurrentPage(1);
    }

    // Calculate pagination slice and bounded metadata
    const pagination = useMemo(() => {
        return calculatePagination(filteredTransactions, currentPage, PAGE_SIZE);
    }, [filteredTransactions, currentPage]);

    // Keep currentPage in sync if items were deleted or reduced
    if (currentPage > pagination.totalPages) {
        setCurrentPage(pagination.totalPages);
    }

    // Calculate real category expense breakdown for the Cazura right panel
    const expenseBreakdown = useMemo(() => {
        return calculateCategoryBreakdown(expense, totalExpense);
    }, [expense, totalExpense]);

    // Top categories and others
    const topCategories = expenseBreakdown.slice(0, 3);
    const otherCategories = expenseBreakdown.slice(3, 7);

    return (
        <div className="cazura-transactions-container">
            {/* Cazura Top Action Header */}
            <div className="cazura-sub-header">
                <div className="sub-header-left">
                    <span className="sub-header-caption">View and manage all your income and expenses in one place</span>
                </div>
                <div className="sub-header-actions">
                    <div className="cazura-period-badge">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>All Records</span>
                    </div>

                    <button
                        type="button"
                        className="cazura-import-btn"
                        onClick={() => setIsImportModalOpen(true)}
                        title="Import transactions from CSV file"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Import CSV</span>
                    </button>

                    <button
                        type="button"
                        className="cazura-add-btn"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Add Transaction</span>
                    </button>
                </div>
            </div>

            {/* Cazura 2-Column Main Split (70% Left / 30% Right) */}
            <div className="cazura-grid-layout">
                {/* Left Area (70%) */}
                <div className="cazura-main-column">
                    {/* 3 Top Summary KPI Cards */}
                    <div className="cazura-kpi-row">
                        <article className="cazura-kpi-card">
                            <div className="cazura-kpi-header">
                                <span className="cazura-kpi-title">Total Transactions</span>
                            </div>
                            <div className="cazura-kpi-val">{transactions.length}</div>
                            <div className="cazura-kpi-trend trend-positive">
                                <span>Recorded entries</span>
                            </div>
                        </article>

                        <article className="cazura-kpi-card">
                            <div className="cazura-kpi-header">
                                <span className="cazura-kpi-title">Incomes</span>
                            </div>
                            <div className="cazura-kpi-val text-income">{formatCurrency(totalIncome)}</div>
                            <div className="cazura-kpi-trend trend-positive">
                                <span>+{income.length} inflows</span>
                            </div>
                        </article>

                        <article className="cazura-kpi-card">
                            <div className="cazura-kpi-header">
                                <span className="cazura-kpi-title">Expenses</span>
                            </div>
                            <div className="cazura-kpi-val text-expense">-{formatCurrency(totalExpense).replace('-', '')}</div>
                            <div className="cazura-kpi-trend trend-negative">
                                <span>-{expense.length} outflows</span>
                            </div>
                        </article>
                    </div>

                    {/* Transaction Activity Table Card (Cazura Reference) */}
                    <section className="cazura-table-card" aria-label="Transaction Activity">
                        {/* Table Card Header with Search and Filter inside */}
                        <div className="cazura-table-card-header">
                            <h2 className="cazura-table-title">Transaction Activity</h2>

                            <div className="cazura-header-search-filter">
                                <div className="cazura-search-box">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search Transaction..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        aria-label="Search transactions"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            className="cazura-search-clear"
                                            onClick={() => setSearchQuery("")}
                                            aria-label="Clear search"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className={`cazura-filter-toggle-btn ${showFilterBar ? 'active' : ''}`}
                                    onClick={() => setShowFilterBar(!showFilterBar)}
                                    aria-expanded={showFilterBar}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                    </svg>
                                    <span>Filter</span>
                                </button>
                            </div>
                        </div>

                        {/* Dropdown / Collapsible Filter Bar */}
                        {showFilterBar && (
                            <div className="cazura-expanded-filter-bar">
                                <div className="filter-select-group">
                                    <label htmlFor="tx-type-filter" className="filter-label">Type:</label>
                                    <select
                                        id="tx-type-filter"
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="cazura-select"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="income">Income</option>
                                        <option value="expense">Expense</option>
                                    </select>
                                </div>

                                <div className="filter-select-group">
                                    <label htmlFor="tx-cat-filter" className="filter-label">Category:</label>
                                    <select
                                        id="tx-cat-filter"
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="cazura-select"
                                    >
                                        <option value="all">All Categories</option>
                                        {ALL_CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="filter-select-group">
                                    <label htmlFor="tx-sort" className="filter-label">Sort:</label>
                                    <select
                                        id="tx-sort"
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
                                        Reset
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Table Layout */}
                        {filteredTransactions.length > 0 ? (
                            <div className="cazura-table-wrapper">
                                <table className={`cazura-table ${compactView ? 'compact-rows' : ''}`}>
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Description</th>
                                            <th>Date</th>
                                            {showTime && <th>Time</th>}
                                            <th className="text-right">Amount</th>
                                            <th>Type</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagination.paginatedItems.map((tx) => {
                                            const txDate = formatTxDate(tx.date || tx.createdAt);
                                            const categoryLabel = tx.category || "Other";
                                            const catColor = getCategoryColor(categoryLabel);

                                            return (
                                                <tr key={tx._id}>
                                                    {/* Category Column with Icon */}
                                                    <td>
                                                        <div className="cazura-category-cell">
                                                            <span
                                                                className="cazura-cat-dot"
                                                                style={{ backgroundColor: catColor }}
                                                            />
                                                            <span className="cazura-cat-name">{categoryLabel}</span>
                                                        </div>
                                                    </td>

                                                    {/* Description */}
                                                    <td className="cazura-desc-cell">{tx.description}</td>

                                                    {/* Date */}
                                                    <td className="cazura-date-cell">{txDate.date}</td>

                                                    {/* Time */}
                                                    {showTime && (
                                                        <td className="cazura-time-cell">{txDate.time}</td>
                                                    )}

                                                    {/* Amount */}
                                                    <td className={`cazura-amount-cell ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                                                        {tx.type === "income"
                                                            ? `+${formatCurrency(tx.amount)}`
                                                            : `-${formatCurrency(tx.amount).replace('-', '')}`
                                                        }
                                                    </td>

                                                    {/* Method / Type */}
                                                    <td>
                                                        <span className={`cazura-type-pill ${tx.type}`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="text-center">
                                                        <div className="cazura-action-buttons">
                                                            <button
                                                                type="button"
                                                                className="cazura-icon-btn edit"
                                                                onClick={() => startEditing(tx)}
                                                                title="Edit transaction"
                                                                aria-label={`Edit ${tx.description}`}
                                                            >
                                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="cazura-icon-btn delete"
                                                                onClick={() => setTransactionToDelete(tx)}
                                                                title="Delete transaction"
                                                                aria-label={`Delete ${tx.description}`}
                                                            >
                                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Cazura Pagination Bar Footer */}
                                <div className="cazura-table-footer">
                                    <span className="cazura-footer-count">
                                        Showing <strong>{pagination.totalItems === 0 ? 0 : pagination.startIndex + 1}–{pagination.endIndex}</strong> of {pagination.totalItems} {pagination.totalItems === 1 ? 'record' : 'records'}
                                        {pagination.totalItems !== transactions.length && (
                                            <span className="cazura-footer-total"> (filtered from {transactions.length})</span>
                                        )}
                                    </span>
                                    <div className="cazura-pagination-pill" role="navigation" aria-label="Transactions pagination">
                                        <button
                                            type="button"
                                            disabled={!pagination.hasPrevPage}
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            aria-label="Previous page"
                                        >
                                            ‹
                                        </button>
                                        <span className="page-active" aria-current="page" title={`Page ${pagination.currentPage} of ${pagination.totalPages}`}>
                                            {pagination.currentPage}
                                        </span>
                                        <span className="page-total" aria-label={`Total pages: ${pagination.totalPages}`}>
                                            / {pagination.totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={!pagination.hasNextPage}
                                            onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                                            aria-label="Next page"
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="cazura-empty-table">
                                <p>No transactions match your search criteria.</p>
                                {isFiltered && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={clearFilters}
                                        style={{ marginTop: '0.75rem' }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Sidebar Area (30%) — Cazura Expense Breakdown & Summary */}
                <aside className="cazura-side-column" aria-label="Transaction Breakdown Panel">
                    {/* Expense Breakdown Card */}
                    <div className="cazura-side-card">
                        <div className="side-card-header">
                            <h3>Expense Breakdown</h3>
                        </div>

                        {expenseBreakdown.length > 0 ? (
                            <div className="cazura-breakdown-content">
                                {/* Visual Ring Indicator with Top Category */}
                                <div className="cazura-ring-metric">
                                    <div className="ring-center-value">
                                        <span className="ring-percent">{topCategories[0]?.percentage || 0}%</span>
                                        <span className="ring-subtext">{topCategories[0]?.category || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Top Categories Breakdown */}
                                <div className="cazura-category-breakdown-list">
                                    {topCategories.map((item) => (
                                        <div key={item.category} className="cazura-cat-row">
                                            <div className="cat-name-left">
                                                <span
                                                    className="cat-dot"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span>{item.category}</span>
                                            </div>
                                            <div className="cat-val-right">
                                                <span className="cat-amt">{formatCurrency(item.amount)}</span>
                                                <span className="cat-pct">{item.percentage}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Other Categories List */}
                                {otherCategories.length > 0 && (
                                    <div className="cazura-other-categories-section">
                                        <h4 className="other-cat-title">Other Categories</h4>
                                        {otherCategories.map((item) => (
                                            <div key={item.category} className="other-cat-item">
                                                <span
                                                    className="other-dot"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="other-name">{item.category}</span>
                                                <span className="other-pct">{item.percentage}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="side-card-empty">
                                <p>No expenses recorded yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Financial Position Card */}
                    <div className="cazura-side-card">
                        <div className="side-card-header">
                            <h3>Financial Position</h3>
                        </div>
                        <div className="cazura-position-stats">
                            <div className="position-item">
                                <span className="pos-label">Net Balance</span>
                                <span className="pos-val">{formatCurrency(balance)}</span>
                            </div>
                            <div className="position-item">
                                <span className="pos-label">Inflow to Outflow Ratio</span>
                                <span className="pos-val">
                                    {inflowOutflowRatio !== null ? `${inflowOutflowRatio}x` : 'N/A'}
                                </span>
                            </div>
                            <div className="position-item">
                                <span className="pos-label">Avg. Outflow Size</span>
                                <span className="pos-val">
                                    {formatCurrency(averageExpense)}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* CSV Import Modal */}
            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={() => {
                    if (fetchTransactions) {
                        fetchTransactions();
                    }
                }}
                currency={currency}
                formatCurrency={formatCurrency}
            />
        </div>
    );
};

export default TransactionsView;
