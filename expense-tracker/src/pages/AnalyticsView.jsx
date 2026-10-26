import React, { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { calculateCategoryBreakdown, calculateMonthlyAggregates } from '../utils/finance'

const AnalyticsView = () => {
    const {
        transactions = [],
        income = [],
        expense = [],
        totalIncome = 0,
        totalExpense = 0,
        balance = 0,
        savingsRate = 0,
        formatCurrency,
        user
    } = useOutletContext();

    const [hoveredMonth, setHoveredMonth] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);

    // 1. Spending Distribution by Category (Unified calculation via pure utility)
    const categoryDistribution = useMemo(() => {
        return calculateCategoryBreakdown(expense, totalExpense);
    }, [expense, totalExpense]);

    // 2. Monthly Income vs Expenses Aggregation (Strictly isolated by calendar year)
    const {
        months: monthlyData,
        maxMonthlyValue: maxMonthlyVal,
        activeYear,
        availableYears
    } = useMemo(() => {
        return calculateMonthlyAggregates(transactions, { year: selectedYear });
    }, [transactions, selectedYear]);

    return (
        <div className="jeamstar-analytics-container">
            {/* Top Greeting Subheader */}
            <div className="jeamstar-welcome-banner">
                <div>
                    <h2 className="welcome-title">
                        {user?.name ? `Welcome back, ${user.name}` : 'Welcome back'}
                    </h2>
                    <p className="welcome-subtitle">
                        {balance >= 0 
                            ? "Your current financial health is positive. Track your monthly trajectory below."
                            : "Your outflows currently exceed your inflows. Review your category spending."
                        }
                    </p>
                </div>
            </div>

            {/* 3 Top KPI Cards with Jeamstar Sparklines */}
            <section className="jeamstar-kpi-grid">
                {/* Card 1: Total Income */}
                <article className="jeamstar-kpi-card">
                    <div className="kpi-meta-left">
                        <span className="jeamstar-card-label">Total Income</span>
                        <div className="jeamstar-card-val">{formatCurrency(totalIncome)}</div>
                        <div className="jeamstar-badge badge-green">
                            <span>+{income.length} credits</span>
                        </div>
                    </div>
                    {/* SVG Sparkline Curve */}
                    <div className="jeamstar-sparkline">
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                            <path
                                d="M 0 35 Q 25 10, 50 25 T 100 5"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 0 35 Q 25 10, 50 25 T 100 5 L 100 40 L 0 40 Z"
                                fill="url(#sparkline-green-grad)"
                                opacity="0.15"
                            />
                            <defs>
                                <linearGradient id="sparkline-green-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </article>

                {/* Card 2: Total Expenses */}
                <article className="jeamstar-kpi-card">
                    <div className="kpi-meta-left">
                        <span className="jeamstar-card-label">Total Expenses</span>
                        <div className="jeamstar-card-val text-expense">-{formatCurrency(totalExpense).replace('-', '')}</div>
                        <div className="jeamstar-badge badge-red">
                            <span>-{expense.length} debits</span>
                        </div>
                    </div>
                    {/* SVG Sparkline Curve */}
                    <div className="jeamstar-sparkline">
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                            <path
                                d="M 0 10 Q 25 35, 50 20 T 100 35"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 0 10 Q 25 35, 50 20 T 100 35 L 100 40 L 0 40 Z"
                                fill="url(#sparkline-red-grad)"
                                opacity="0.15"
                            />
                            <defs>
                                <linearGradient id="sparkline-red-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </article>

                {/* Card 3: Savings / Net Balance */}
                <article className="jeamstar-kpi-card">
                    <div className="kpi-meta-left">
                        <span className="jeamstar-card-label">Net Savings</span>
                        <div className="jeamstar-card-val">{formatCurrency(balance)}</div>
                        <div className="jeamstar-badge badge-green">
                            <span>{savingsRate}% retention</span>
                        </div>
                    </div>
                    {/* SVG Sparkline Curve */}
                    <div className="jeamstar-sparkline">
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                            <path
                                d="M 0 30 Q 30 5, 60 20 T 100 10"
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 0 30 Q 30 5, 60 20 T 100 10 L 100 40 L 0 40 Z"
                                fill="url(#sparkline-blue-grad)"
                                opacity="0.15"
                            />
                            <defs>
                                <linearGradient id="sparkline-blue-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0284c7" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </article>
            </section>

            {/* Jeamstar Middle Row (Left: Monthly Bar Chart / Right: Spending Distribution Donut) */}
            <div className="jeamstar-main-grid">
                {/* Left: Monthly Income vs Expenses Bar Chart */}
                <section className="jeamstar-chart-card">
                    <div className="chart-card-header">
                        <div>
                            <h3 className="chart-card-title">Monthly Income vs Expenses</h3>
                            <p className="chart-card-sub">Comparison of inflows vs outflows across calendar months.</p>
                        </div>
                        <div className={`jeamstar-period-select ${availableYears.length <= 1 ? 'is-static' : ''}`}>
                            {availableYears.length > 1 ? (
                                <select
                                    value={activeYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    aria-label="Select calendar year for analytics"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'inherit',
                                        font: 'inherit',
                                        cursor: 'pointer',
                                        padding: '0 4px',
                                        outline: 'none'
                                    }}
                                >
                                    {availableYears.map((yr) => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            ) : (
                                <span>{activeYear}</span>
                            )}
                        </div>
                    </div>

                    {/* Interactive Tooltip Card if hovering a month */}
                    <div className="monthly-chart-canvas">
                        {hoveredMonth !== null && (
                            <div className="jeamstar-chart-tooltip">
                                <span className="tooltip-month">{monthlyData[hoveredMonth]?.name}</span>
                                <div className="tooltip-row">
                                    <span className="tooltip-dot green" />
                                    <span>Income: {formatCurrency(monthlyData[hoveredMonth]?.income)}</span>
                                </div>
                                <div className="tooltip-row">
                                    <span className="tooltip-dot red" />
                                    <span>Expense: {formatCurrency(monthlyData[hoveredMonth]?.expense)}</span>
                                </div>
                            </div>
                        )}

                        {/* Bar Chart Columns */}
                        <div className="bars-container">
                            {monthlyData.map((m, idx) => {
                                const incomeHeight = maxMonthlyVal > 0 ? (m.income / maxMonthlyVal) * 160 : 0;
                                const expenseHeight = maxMonthlyVal > 0 ? (m.expense / maxMonthlyVal) * 160 : 0;

                                return (
                                    <div
                                        key={m.name}
                                        className="month-bar-group"
                                        onMouseEnter={() => setHoveredMonth(idx)}
                                        onMouseLeave={() => setHoveredMonth(null)}
                                    >
                                        <div className="bars-pair">
                                            {/* Income Bar (Dark Slate / Green) */}
                                            <div
                                                className="bar-col bar-income"
                                                style={{ height: `${Math.max(4, incomeHeight)}px` }}
                                                title={`${m.name} Income: ${formatCurrency(m.income)}`}
                                            />
                                            {/* Expense Bar (Contrast Lighter Bar) */}
                                            <div
                                                className="bar-col bar-expense"
                                                style={{ height: `${Math.max(4, expenseHeight)}px` }}
                                                title={`${m.name} Expense: ${formatCurrency(m.expense)}`}
                                            />
                                        </div>
                                        <span className="month-axis-label">{m.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="chart-legend-bottom">
                        <div className="legend-item">
                            <span className="legend-box bar-income" />
                            <span>Income Inflows</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-box bar-expense" />
                            <span>Expense Outflows</span>
                        </div>
                    </div>
                </section>

                {/* Right: Spending Distribution Donut & Legend (Jeamstar Reference) */}
                <section className="jeamstar-distribution-card">
                    <div className="chart-card-header">
                        <h3 className="chart-card-title">Spending Distribution</h3>
                    </div>

                    {categoryDistribution.length > 0 ? (
                        <div className="distribution-content-body">
                            {/* SVG Donut Visual */}
                            <div className="donut-visual-container">
                                <svg viewBox="0 0 160 160" className="donut-svg">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="60"
                                        fill="none"
                                        stroke="#f1f5f9"
                                        strokeWidth="22"
                                    />
                                    {/* Render category segments mathematically */}
                                    {categoryDistribution.reduce((acc, cat) => {
                                        const radius = 60;
                                        const circumference = 2 * Math.PI * radius; // ~376.99
                                        const ratio = totalExpense > 0 ? (cat.amount / totalExpense) : 0;
                                        const strokeDasharray = `${ratio * circumference} ${circumference}`;
                                        const strokeDashoffset = -acc.offset;

                                        acc.segments.push(
                                            <circle
                                                key={cat.category}
                                                cx="80"
                                                cy="80"
                                                r={radius}
                                                fill="none"
                                                stroke={cat.color}
                                                strokeWidth="22"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                            />
                                        );

                                        acc.offset += ratio * circumference;
                                        return acc;
                                    }, { offset: 0, segments: [] }).segments}
                                </svg>
                                <div className="donut-center-info">
                                    <span className="center-top-val">{categoryDistribution[0]?.percentage || 0}%</span>
                                    <span className="center-top-sub">{categoryDistribution[0]?.category || 'Expenses'}</span>
                                </div>
                            </div>

                            {/* Legend with Categories, Amounts & Percentages (Jeamstar Right Legend) */}
                            <div className="distribution-legend-list">
                                {categoryDistribution.slice(0, 6).map((item) => (
                                    <div key={item.category} className="dist-legend-row">
                                        <div className="dist-name-group">
                                            <span
                                                className="dist-color-dot"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="dist-name">{item.category}</span>
                                        </div>
                                        <div className="dist-values-group">
                                            <span className="dist-amt">{formatCurrency(item.amount)}</span>
                                            <span className="dist-pct">{item.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-sub-state">
                            <p>No expenses recorded yet to generate spending distribution.</p>
                            <Link to="/" className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                                + Add Expense
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AnalyticsView;
