import React, { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

const CATEGORY_COLORS = {
    'Food & Dining': '#10b981',
    'Transportation': '#f59e0b',
    'Housing & Rent': '#0284c7',
    'Utilities': '#6366f1',
    'Entertainment': '#ec4899',
    'Healthcare': '#ef4444',
    'Shopping': '#8b5cf6',
    'Education': '#14b8a6',
    'Personal Care': '#d97706',
    'Salary': '#10b981',
    'Freelance': '#0ea5e9',
    'Business': '#6366f1',
    'Investments': '#8b5cf6',
    'Gifts': '#f43f5e',
    'Other': '#64748b'
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AnalyticsView = () => {
    const {
        transactions,
        income,
        expense,
        totalIncome,
        totalExpense,
        balance,
        formatCurrency
    } = useOutletContext();

    const [hoveredMonth, setHoveredMonth] = useState(null);

    // 1. Savings Rate Calculation (Real mathematical formula)
    const savingsRate = useMemo(() => {
        if (totalIncome <= 0) return 0;
        const rate = (balance / totalIncome) * 100;
        return Math.max(-100, Math.min(100, Math.round(rate)));
    }, [balance, totalIncome]);

    // 2. Spending Distribution by Category (Real mathematical calculations from expense records)
    const categoryDistribution = useMemo(() => {
        if (totalExpense <= 0) return [];

        const catMap = {};
        expense.forEach((tx) => {
            const cat = tx.category || 'Other';
            catMap[cat] = (catMap[cat] || 0) + tx.amount;
        });

        const list = Object.keys(catMap).map((cat) => {
            const amount = catMap[cat];
            const percentage = ((amount / totalExpense) * 100).toFixed(1);
            return {
                category: cat,
                amount,
                percentage: Number(percentage),
                color: CATEGORY_COLORS[cat] || '#64748b'
            };
        });

        return list.sort((a, b) => b.amount - a.amount);
    }, [expense, totalExpense]);

    // 3. Monthly Income vs Expenses Aggregation (Grouped by actual transaction dates)
    const monthlyData = useMemo(() => {
        // Group transactions into months of current year or recent months
        const monthsMap = {};
        
        // Initialize 12 calendar months with 0s
        for (let i = 0; i < 12; i++) {
            monthsMap[i] = { monthIndex: i, name: MONTH_NAMES[i], income: 0, expense: 0 };
        }

        transactions.forEach((tx) => {
            if (!tx.createdAt) return;
            const d = new Date(tx.createdAt);
            if (!isNaN(d.getTime())) {
                const m = d.getMonth();

                if (monthsMap[m]) {
                    if (tx.type === "income") {
                        monthsMap[m].income += tx.amount;
                    } else {
                        monthsMap[m].expense += tx.amount;
                    }
                }
            }
        });

        return Object.values(monthsMap);
    }, [transactions]);

    // Find highest monthly value for chart scale
    const maxMonthlyVal = useMemo(() => {
        let max = 1000;
        monthlyData.forEach((m) => {
            if (m.income > max) max = m.income;
            if (m.expense > max) max = m.expense;
        });
        return max;
    }, [monthlyData]);

    return (
        <div className="jeamstar-analytics-container">
            {/* Top Greeting Subheader */}
            <div className="jeamstar-welcome-banner">
                <div>
                    <h2 className="welcome-title">Welcome back, Emmanuel</h2>
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
                        <div className="jeamstar-period-select">
                            <span>Yearly ▾</span>
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
                                        const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
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

                                        acc.offset += (cat.percentage / 100) * circumference;
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
