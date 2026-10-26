/**
 * Financial calculation and aggregation utilities.
 * Pure functions with zero UI or state dependencies.
 */
import { getCategoryColor } from '../constants/categories.js';

export const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Safely rounds a numeric value to two decimal places.
 * Solves floating-point representation artifacts (e.g., 0.1 + 0.2 = 0.30000000000000004).
 * 
 * @param {number} num - Raw numeric value
 * @returns {number} Rounded number
 */
export const roundToTwo = (num) => {
    const val = Number(num);
    if (!Number.isFinite(val)) return 0;
    return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Extracts a safe, positive finite amount from a transaction.
 * Rejects negative, NaN, or non-finite inputs by returning 0.
 * 
 * @param {any} val - Amount value to sanitize
 * @returns {number} Non-negative finite number
 */
export const getSafeAmount = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num) || num < 0) return 0;
    return roundToTwo(num);
};

/**
 * Extracts a valid Date object from a transaction record.
 * Prioritizes `tx.date`, falls back to `tx.createdAt`.
 * Returns null if missing or invalid.
 * 
 * @param {Object} tx - Transaction object
 * @returns {Date|null}
 */
export const getTransactionDate = (tx) => {
    if (!tx || typeof tx !== 'object') return null;
    const raw = tx.date || tx.createdAt;
    if (!raw) return null;
    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
};

/**
 * Calculates total income, total expense, net balance, savings retention rate,
 * inflow-to-outflow ratio, and average outflow size.
 * 
 * @param {Array<Object>} transactions - List of transaction objects
 * @returns {{
 *   income: Array<Object>,
 *   expense: Array<Object>,
 *   totalIncome: number,
 *   totalExpense: number,
 *   balance: number,
 *   savingsRate: number,
 *   inflowOutflowRatio: number|null,
 *   averageExpense: number
 * }}
 */
export const calculateTotals = (transactions = []) => {
    const txList = Array.isArray(transactions) ? transactions : [];

    const income = [];
    const expense = [];
    let rawTotalIncome = 0;
    let rawTotalExpense = 0;

    for (let i = 0; i < txList.length; i++) {
        const tx = txList[i];
        if (!tx || typeof tx !== 'object') continue;

        const amt = getSafeAmount(tx.amount);
        if (tx.type === 'income') {
            income.push(tx);
            rawTotalIncome += amt;
        } else if (tx.type === 'expense') {
            expense.push(tx);
            rawTotalExpense += amt;
        }
    }

    const totalIncome = roundToTwo(rawTotalIncome);
    const totalExpense = roundToTwo(rawTotalExpense);
    const balance = roundToTwo(totalIncome - totalExpense);

    // Savings retention rate (percentage of income retained) clamped between -100% and 100%
    const savingsRate = totalIncome > 0
        ? Math.max(-100, Math.min(100, Math.round((balance / totalIncome) * 100)))
        : 0;

    // Inflow to Outflow ratio (null if no expenses)
    const inflowOutflowRatio = totalExpense > 0
        ? Number((totalIncome / totalExpense).toFixed(2))
        : null;

    // Average expense size
    const averageExpense = expense.length > 0
        ? roundToTwo(totalExpense / expense.length)
        : 0;

    return {
        income,
        expense,
        totalIncome,
        totalExpense,
        balance,
        savingsRate,
        inflowOutflowRatio,
        averageExpense
    };
};

/**
 * Aggregates expenses by category and calculates percentages.
 * Safely handles zero expense total and sorts descending by amount.
 * 
 * @param {Array<Object>} transactions - Transaction records (or pre-filtered expenses)
 * @param {number} [providedTotalExpense] - Optional total expense if precomputed
 * @returns {Array<{
 *   category: string,
 *   amount: number,
 *   percentage: number,
 *   color: string
 * }>}
 */
export const calculateCategoryBreakdown = (transactions = [], providedTotalExpense = null) => {
    const txList = Array.isArray(transactions) ? transactions : [];
    const map = {};
    let calculatedTotal = 0;

    for (let i = 0; i < txList.length; i++) {
        const tx = txList[i];
        if (!tx || typeof tx !== 'object') continue;

        // If mixed list passed, include only expense records
        if (tx.type && tx.type !== 'expense') continue;

        const cat = (typeof tx.category === 'string' && tx.category.trim()) ? tx.category.trim() : 'Other';
        const amt = getSafeAmount(tx.amount);

        map[cat] = (map[cat] || 0) + amt;
        calculatedTotal += amt;
    }

    const totalExpense = providedTotalExpense !== null && Number.isFinite(Number(providedTotalExpense))
        ? roundToTwo(Number(providedTotalExpense))
        : roundToTwo(calculatedTotal);

    const categories = Object.keys(map);
    if (categories.length === 0 || totalExpense <= 0) {
        return [];
    }

    const breakdown = categories.map((cat) => {
        const amount = roundToTwo(map[cat]);
        const percentage = totalExpense > 0
            ? Number(((amount / totalExpense) * 100).toFixed(1))
            : 0;

        return {
            category: cat,
            amount,
            percentage,
            color: getCategoryColor(cat)
        };
    });

    return breakdown.sort((a, b) => b.amount - a.amount);
};

/**
 * Aggregates monthly income and expense values for a specific calendar year.
 * Prevents transactions from different years from being accidentally combined.
 * 
 * @param {Array<Object>} transactions - List of transactions
 * @param {{ year?: number }} [options] - Aggregation options
 * @returns {{
 *   months: Array<{
 *     monthIndex: number,
 *     name: string,
 *     year: number,
 *     income: number,
 *     expense: number,
 *     balance: number
 *   }>,
 *   maxMonthlyValue: number,
 *   activeYear: number,
 *   availableYears: Array<number>
 * }}
 */
export const calculateMonthlyAggregates = (transactions = [], options = {}) => {
    const txList = Array.isArray(transactions) ? transactions : [];

    // Identify all unique years present in the dataset
    const yearSet = new Set();
    const parsedTxs = [];

    for (let i = 0; i < txList.length; i++) {
        const tx = txList[i];
        const date = getTransactionDate(tx);
        if (date) {
            const yr = date.getFullYear();
            yearSet.add(yr);
            parsedTxs.push({ tx, date, year: yr });
        }
    }

    const availableYears = Array.from(yearSet).sort((a, b) => b - a);
    const currentCalendarYear = new Date().getFullYear();
    const activeYear = options.year && Number.isInteger(Number(options.year))
        ? Number(options.year)
        : (availableYears[0] ?? currentCalendarYear);

    // Initialize all 12 calendar months for activeYear with 0 totals
    const months = MONTH_NAMES.map((name, index) => ({
        monthIndex: index,
        name,
        year: activeYear,
        income: 0,
        expense: 0,
        balance: 0
    }));

    // Aggregate records strictly belonging to activeYear
    for (let i = 0; i < parsedTxs.length; i++) {
        const { tx, date, year } = parsedTxs[i];
        if (year !== activeYear) continue;

        const monthIdx = date.getMonth();
        if (monthIdx >= 0 && monthIdx < 12) {
            const amt = getSafeAmount(tx.amount);
            if (tx.type === 'income') {
                months[monthIdx].income += amt;
            } else if (tx.type === 'expense') {
                months[monthIdx].expense += amt;
            }
        }
    }

    // Clean up rounding and compute monthly balances
    let maxMonthlyValue = 1000;
    for (let i = 0; i < months.length; i++) {
        months[i].income = roundToTwo(months[i].income);
        months[i].expense = roundToTwo(months[i].expense);
        months[i].balance = roundToTwo(months[i].income - months[i].expense);

        if (months[i].income > maxMonthlyValue) maxMonthlyValue = months[i].income;
        if (months[i].expense > maxMonthlyValue) maxMonthlyValue = months[i].expense;
    }

    return {
        months,
        maxMonthlyValue: roundToTwo(maxMonthlyValue),
        activeYear,
        availableYears: availableYears.length > 0 ? availableYears : [currentCalendarYear]
    };
};

/**
 * Returns a list of the N most recent transactions, sorted chronologically newest-first.
 * 
 * @param {Array<Object>} transactions - List of transactions
 * @param {number} [limit=5] - Maximum number of transactions to return
 * @returns {Array<Object>}
 */
export const getRecentTransactions = (transactions = [], limit = 5) => {
    if (!Array.isArray(transactions) || transactions.length === 0) return [];

    const copy = [...transactions];
    copy.sort((a, b) => {
        const timeB = getTransactionDate(b)?.getTime() || 0;
        const timeA = getTransactionDate(a)?.getTime() || 0;
        return timeB - timeA;
    });

    return copy.slice(0, Math.max(0, limit));
};

/**
 * Calculates spending, remaining balance, and usage percentage for a single budget
 * in the specified calendar month and year.
 * 
 * @param {Object} budget - Budget record { limit, category, period }
 * @param {Array<Object>} transactions - List of transactions
 * @param {Date|string|number} [targetDate=new Date()] - Date determining the active calendar month and year
 * @returns {{
 *   spent: number,
 *   limit: number,
 *   remaining: number,
 *   percentage: number,
 *   isExceeded: boolean,
 *   isWarning: boolean,
 *   status: 'normal' | 'warning' | 'exceeded',
 *   targetMonth: number,
 *   targetYear: number
 * }}
 */
export const calculateBudgetSpending = (budget, transactions = [], targetDate = new Date()) => {
    const rawDate = targetDate instanceof Date ? targetDate : new Date(targetDate);
    const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
    const targetMonth = validDate.getMonth();
    const targetYear = validDate.getFullYear();

    const limit = getSafeAmount(budget?.limit);
    const category = (budget?.category && typeof budget.category === 'string')
        ? budget.category.trim()
        : 'All Categories';

    const txList = Array.isArray(transactions) ? transactions : [];
    let rawSpent = 0;

    for (let i = 0; i < txList.length; i++) {
        const tx = txList[i];
        if (!tx || typeof tx !== 'object') continue;
        if (tx.type !== 'expense') continue;

        const txDate = getTransactionDate(tx);
        if (!txDate) continue;

        if (txDate.getMonth() !== targetMonth || txDate.getFullYear() !== targetYear) {
            continue;
        }

        const txCategory = (typeof tx.category === 'string' && tx.category.trim())
            ? tx.category.trim()
            : 'Other';

        if (category === 'All Categories' || txCategory === category) {
            rawSpent += getSafeAmount(tx.amount);
        }
    }

    const spent = roundToTwo(rawSpent);
    const remaining = roundToTwo(limit - spent);
    const percentage = limit > 0
        ? Number(((spent / limit) * 100).toFixed(1))
        : 0;

    const isExceeded = percentage >= 100;
    const isWarning = percentage >= 80 && percentage < 100;
    const status = isExceeded ? 'exceeded' : (isWarning ? 'warning' : 'normal');

    return {
        spent,
        limit,
        remaining,
        percentage,
        isExceeded,
        isWarning,
        status,
        targetMonth,
        targetYear
    };
};

/**
 * Calculates aggregate summary metrics across all active budgets.
 * Prevents double-counting in summary calculations when multiple budgets overlap
 * on categories by de-duplicating transactions.
 * 
 * @param {Array<Object>} budgets - List of user budgets
 * @param {Array<Object>} transactions - List of transactions
 * @param {Date|string|number} [targetDate=new Date()] - Active date
 * @returns {{
 *   totalLimit: number,
 *   totalSpent: number,
 *   totalRemaining: number,
 *   overallPercentage: number,
 *   isExceeded: boolean,
 *   isWarning: boolean,
 *   status: 'normal' | 'warning' | 'exceeded',
 *   budgetCount: number
 * }}
 */
export const calculateBudgetsSummary = (budgets = [], transactions = [], targetDate = new Date()) => {
    const budgetList = Array.isArray(budgets) ? budgets : [];
    const txList = Array.isArray(transactions) ? transactions : [];

    const rawDate = targetDate instanceof Date ? targetDate : new Date(targetDate);
    const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
    const targetMonth = validDate.getMonth();
    const targetYear = validDate.getFullYear();

    let rawTotalLimit = 0;
    for (let i = 0; i < budgetList.length; i++) {
        rawTotalLimit += getSafeAmount(budgetList[i]?.limit);
    }
    const totalLimit = roundToTwo(rawTotalLimit);

    if (budgetList.length === 0) {
        return {
            totalLimit: 0,
            totalSpent: 0,
            totalRemaining: 0,
            overallPercentage: 0,
            isExceeded: false,
            isWarning: false,
            status: 'normal',
            budgetCount: 0
        };
    }

    // Determine which categories are covered by active budgets
    const coversAll = budgetList.some(b => b?.category === 'All Categories');
    const coveredCategories = new Set(
        budgetList
            .map(b => (typeof b?.category === 'string' ? b.category.trim() : ''))
            .filter(Boolean)
    );

    // Track matching transactions by unique ID to prevent double counting
    const matchedTxMap = new Map();

    for (let i = 0; i < txList.length; i++) {
        const tx = txList[i];
        if (!tx || typeof tx !== 'object') continue;
        if (tx.type !== 'expense') continue;

        const txDate = getTransactionDate(tx);
        if (!txDate) continue;
        if (txDate.getMonth() !== targetMonth || txDate.getFullYear() !== targetYear) {
            continue;
        }

        const txCategory = (typeof tx.category === 'string' && tx.category.trim())
            ? tx.category.trim()
            : 'Other';

        if (coversAll || coveredCategories.has(txCategory)) {
            const key = tx._id || tx.id || `idx-${i}`;
            if (!matchedTxMap.has(key)) {
                matchedTxMap.set(key, getSafeAmount(tx.amount));
            }
        }
    }

    let rawTotalSpent = 0;
    for (const amt of matchedTxMap.values()) {
        rawTotalSpent += amt;
    }

    const totalSpent = roundToTwo(rawTotalSpent);
    const totalRemaining = roundToTwo(totalLimit - totalSpent);
    const overallPercentage = totalLimit > 0
        ? Number(((totalSpent / totalLimit) * 100).toFixed(1))
        : 0;

    const isExceeded = overallPercentage >= 100;
    const isWarning = overallPercentage >= 80 && overallPercentage < 100;
    const status = isExceeded ? 'exceeded' : (isWarning ? 'warning' : 'normal');

    return {
        totalLimit,
        totalSpent,
        totalRemaining,
        overallPercentage,
        isExceeded,
        isWarning,
        status,
        budgetCount: budgetList.length
    };
};

/**
 * Calculates progress metrics for an individual savings goal.
 * Rule: Progress never exceeds 100%, even when a goal is overfunded.
 * When the target is reached or exceeded, remaining amount is strictly 0,
 * and actual saved amount is preserved.
 * 
 * @param {Object} goal - Savings goal record { targetAmount, currentAmount }
 * @returns {{
 *   target: number,
 *   saved: number,
 *   remaining: number,
 *   percentage: number,
 *   isCompleted: boolean,
 *   progressWidth: number
 * }}
 */
export const calculateGoalProgress = (goal) => {
    const target = getSafeAmount(goal?.targetAmount);
    const saved = getSafeAmount(goal?.currentAmount);

    const isCompleted = target > 0 ? saved >= target : false;
    const remaining = roundToTwo(Math.max(0, target - saved));

    const rawPercentage = target > 0
        ? Number(((saved / target) * 100).toFixed(1))
        : 0;

    // Progress percentage capped strictly at 100%
    const percentage = Math.min(100, Math.max(0, rawPercentage));
    const progressWidth = percentage;

    return {
        target,
        saved,
        remaining,
        percentage,
        isCompleted,
        progressWidth
    };
};

/**
 * Calculates aggregate summary metrics across all savings goals.
 * 
 * @param {Array<Object>} goals - List of savings goals
 * @returns {{
 *   totalTarget: number,
 *   totalSaved: number,
 *   totalRemaining: number,
 *   overallPercentage: number,
 *   completedCount: number,
 *   inProgressCount: number,
 *   goalCount: number
 * }}
 */
export const calculateGoalsSummary = (goals = []) => {
    const goalList = Array.isArray(goals) ? goals : [];

    let rawTotalTarget = 0;
    let rawTotalSaved = 0;

    for (let i = 0; i < goalList.length; i++) {
        rawTotalTarget += getSafeAmount(goalList[i]?.targetAmount);
        rawTotalSaved += getSafeAmount(goalList[i]?.currentAmount);
    }

    const totalTarget = roundToTwo(rawTotalTarget);
    const totalSaved = roundToTwo(rawTotalSaved);
    const totalRemaining = roundToTwo(Math.max(0, totalTarget - totalSaved));

    const rawPercentage = totalTarget > 0
        ? Number(((totalSaved / totalTarget) * 100).toFixed(1))
        : 0;

    const overallPercentage = Math.min(100, Math.max(0, rawPercentage));

    let completedCount = 0;
    for (let i = 0; i < goalList.length; i++) {
        const target = getSafeAmount(goalList[i]?.targetAmount);
        const saved = getSafeAmount(goalList[i]?.currentAmount);
        if (target > 0 && saved >= target) {
            completedCount++;
        }
    }

    const inProgressCount = goalList.length - completedCount;

    return {
        totalTarget,
        totalSaved,
        totalRemaining,
        overallPercentage,
        completedCount,
        inProgressCount,
        goalCount: goalList.length
    };
};

/**
 * Normalizes a recurring amount to an estimated monthly equivalent.
 * Weekly: * (52 / 12)
 * Monthly: * 1
 * Yearly: / 12
 * 
 * @param {number} amount
 * @param {'weekly'|'monthly'|'yearly'} frequency
 * @returns {number}
 */
export const normalizeToMonthly = (amount, frequency) => {
    const safe = getSafeAmount(amount);
    if (frequency === 'weekly') {
        return roundToTwo(safe * (52 / 12));
    }
    if (frequency === 'yearly') {
        return roundToTwo(safe / 12);
    }
    return safe; // default monthly
};

/**
 * Calculates recurring rules summary including projected monthly expenses,
 * projected monthly income, active/paused/ended counts, and due count.
 * 
 * @param {Array<Object>} rules
 * @param {Date} [referenceDate]
 * @returns {{
 *   totalRules: number,
 *   activeCount: number,
 *   pausedCount: number,
 *   endedCount: number,
 *   monthlyProjectedExpense: number,
 *   monthlyProjectedIncome: number,
 *   netMonthlyProjected: number,
 *   dueCount: number
 * }}
 */
export const calculateRecurringSummary = (rules = [], referenceDate = new Date()) => {
    const list = Array.isArray(rules) ? rules : [];
    const refTime = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
        ? referenceDate.getTime()
        : Date.now();

    let activeCount = 0;
    let pausedCount = 0;
    let endedCount = 0;
    let rawMonthlyExpense = 0;
    let rawMonthlyIncome = 0;
    let dueCount = 0;

    for (let i = 0; i < list.length; i++) {
        const rule = list[i];
        if (!rule) continue;

        const status = rule.status || 'active';
        if (status === 'paused') {
            pausedCount++;
        } else if (status === 'ended') {
            endedCount++;
        } else {
            activeCount++;
            const monthlyAmount = normalizeToMonthly(rule.amount, rule.frequency);
            if (rule.type === 'income') {
                rawMonthlyIncome += monthlyAmount;
            } else {
                rawMonthlyExpense += monthlyAmount;
            }

            if (rule.nextOccurrence) {
                const nextTime = new Date(rule.nextOccurrence).getTime();
                if (!isNaN(nextTime) && nextTime <= refTime) {
                    dueCount++;
                }
            }
        }
    }

    const monthlyProjectedExpense = roundToTwo(rawMonthlyExpense);
    const monthlyProjectedIncome = roundToTwo(rawMonthlyIncome);
    const netMonthlyProjected = roundToTwo(monthlyProjectedIncome - monthlyProjectedExpense);

    return {
        totalRules: list.length,
        activeCount,
        pausedCount,
        endedCount,
        monthlyProjectedExpense,
        monthlyProjectedIncome,
        netMonthlyProjected,
        dueCount
    };
};

/**
 * Generates human-friendly relative label for scheduled occurrences.
 * 
 * @param {Date|string} nextOccurrence
 * @param {'active'|'paused'|'ended'} status
 * @param {Date} [referenceDate]
 * @returns {{ label: string, isDue: boolean, tone: 'danger'|'warning'|'neutral'|'success' }}
 */
export const getOccurrenceStatusInfo = (nextOccurrence, status = 'active', referenceDate = new Date()) => {
    if (status === 'ended') {
        return { label: 'Ended', isDue: false, tone: 'neutral' };
    }
    if (status === 'paused') {
        return { label: 'Paused', isDue: false, tone: 'warning' };
    }

    if (!nextOccurrence) {
        return { label: 'Not scheduled', isDue: false, tone: 'neutral' };
    }

    const occDate = new Date(nextOccurrence);
    if (isNaN(occDate.getTime())) {
        return { label: 'Invalid date', isDue: false, tone: 'neutral' };
    }

    const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();

    const occDay = new Date(occDate.getFullYear(), occDate.getMonth(), occDate.getDate()).getTime();
    const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
    const diffDays = Math.round((occDay - today) / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
        return {
            label: `Overdue (${Math.abs(diffDays)}d ago)`,
            isDue: true,
            tone: 'danger'
        };
    }
    if (diffDays === 0) {
        return {
            label: 'Due Today',
            isDue: true,
            tone: 'warning'
        };
    }
    if (diffDays === 1) {
        return {
            label: 'Due Tomorrow',
            isDue: false,
            tone: 'neutral'
        };
    }
    return {
        label: `In ${diffDays} days`,
        isDue: false,
        tone: 'neutral'
    };
};

/**
 * Calculates savings rate percentage safely.
 * Returns null (N/A) if totalIncome is zero or negative.
 * 
 * @param {number} totalIncome
 * @param {number} totalExpense
 * @returns {number|null} Savings rate percentage or null if income is zero
 */
export const calculateSavingsRate = (totalIncome, totalExpense) => {
    const inc = Number(totalIncome);
    const exp = Number(totalExpense);
    if (!Number.isFinite(inc) || inc <= 0) {
        return null;
    }
    const safeExp = Number.isFinite(exp) && exp >= 0 ? exp : 0;
    return roundToTwo(((inc - safeExp) / inc) * 100);
};

/**
 * Calculates start and end Date objects for report date range presets.
 * Supports: 'this-month', 'last-month', 'last-3-months', 'last-6-months', and 'custom'.
 * 
 * @param {string} preset
 * @param {string} [customStart] - 'YYYY-MM-DD'
 * @param {string} [customEnd] - 'YYYY-MM-DD'
 * @param {Date} [referenceDate] - Baseline date
 * @returns {{
 *   startDate: Date,
 *   endDate: Date,
 *   isValid: boolean,
 *   errorMessage: string
 * }}
 */
export const getDateRangeBounds = (preset = 'this-month', customStart = '', customEnd = '', referenceDate = new Date()) => {
    const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
        ? new Date(referenceDate)
        : new Date();

    const currentYear = ref.getFullYear();
    const currentMonth = ref.getMonth();

    if (preset === 'this-month') {
        const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        return { startDate, endDate, isValid: true, errorMessage: '' };
    }

    if (preset === 'last-month') {
        const startDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
        return { startDate, endDate, isValid: true, errorMessage: '' };
    }

    if (preset === 'last-3-months') {
        // Current month and preceding 2 calendar months = 3 months total
        const startDate = new Date(currentYear, currentMonth - 2, 1, 0, 0, 0, 0);
        const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        return { startDate, endDate, isValid: true, errorMessage: '' };
    }

    if (preset === 'last-6-months') {
        // Current month and preceding 5 calendar months = 6 months total
        const startDate = new Date(currentYear, currentMonth - 5, 1, 0, 0, 0, 0);
        const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        return { startDate, endDate, isValid: true, errorMessage: '' };
    }

    if (preset === 'custom') {
        if (!customStart || !customEnd) {
            return {
                startDate: new Date(currentYear, currentMonth, 1, 0, 0, 0, 0),
                endDate: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
                isValid: false,
                errorMessage: 'Please select both start and end dates.'
            };
        }

        const startParts = customStart.split('-').map(Number);
        const endParts = customEnd.split('-').map(Number);

        if (startParts.length !== 3 || endParts.length !== 3) {
            return {
                startDate: new Date(),
                endDate: new Date(),
                isValid: false,
                errorMessage: 'Invalid date format.'
            };
        }

        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
        // Include the ENTIRE selected end date
        const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return {
                startDate: new Date(),
                endDate: new Date(),
                isValid: false,
                errorMessage: 'Invalid date values provided.'
            };
        }

        if (startDate.getTime() > endDate.getTime()) {
            return {
                startDate,
                endDate,
                isValid: false,
                errorMessage: 'Start date cannot be after end date.'
            };
        }

        return { startDate, endDate, isValid: true, errorMessage: '' };
    }

    // Default fallback to this month
    const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate, isValid: true, errorMessage: '' };
};

/**
 * Filters transactions strictly within the specified Date range [startDate, endDate].
 * 
 * @param {Array<Object>} transactions
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array<Object>}
 */
export const filterTransactionsByDateRange = (transactions = [], startDate, endDate) => {
    if (!Array.isArray(transactions) || !startDate || !endDate) return [];
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return transactions.filter((tx) => {
        const txDate = getTransactionDate(tx);
        if (!txDate) return false;
        const txMs = txDate.getTime();
        return txMs >= startMs && txMs <= endMs;
    });
};

/**
 * Builds chronological month-by-month financial series spanning from startDate to endDate.
 * Handles single-month, multi-month, and cross-year periods cleanly.
 * 
 * @param {Array<Object>} transactions - Already filtered to date range
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {{
 *   series: Array<{
 *     key: string,
 *     name: string,
 *     shortName: string,
 *     year: number,
 *     monthIndex: number,
 *     income: number,
 *     expense: number,
 *     balance: number,
 *     savingsRate: number|null
 *   }>,
 *   maxMonthlyValue: number
 * }}
 */
export const generateMonthlyReportSeries = (transactions = [], startDate, endDate) => {
    if (!startDate || !endDate) {
        return { series: [], maxMonthlyValue: 100 };
    }

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    const series = [];
    let curYear = startYear;
    let curMonth = startMonth;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
        const monthName = MONTH_NAMES[curMonth] || '';
        series.push({
            key: `${curYear}-${String(curMonth + 1).padStart(2, '0')}`,
            name: `${monthName} ${curYear}`,
            shortName: monthName,
            year: curYear,
            monthIndex: curMonth,
            income: 0,
            expense: 0,
            balance: 0,
            savingsRate: null
        });

        curMonth++;
        if (curMonth > 11) {
            curMonth = 0;
            curYear++;
        }
    }

    const seriesMap = new Map();
    for (let i = 0; i < series.length; i++) {
        seriesMap.set(series[i].key, series[i]);
    }

    const txList = Array.isArray(transactions) ? transactions : [];
    for (let i = 0; i < txList.length; i++) {
        const tx = txList[i];
        const date = getTransactionDate(tx);
        if (!date) continue;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthBucket = seriesMap.get(key);
        if (!monthBucket) continue;

        const amt = getSafeAmount(tx.amount);
        if (tx.type === 'income') {
            monthBucket.income += amt;
        } else {
            monthBucket.expense += amt;
        }
    }

    let maxVal = 100;
    for (let i = 0; i < series.length; i++) {
        const item = series[i];
        item.income = roundToTwo(item.income);
        item.expense = roundToTwo(item.expense);
        item.balance = roundToTwo(item.income - item.expense);
        item.savingsRate = calculateSavingsRate(item.income, item.expense);

        if (item.income > maxVal) maxVal = item.income;
        if (item.expense > maxVal) maxVal = item.expense;
    }

    return { series, maxMonthlyValue: maxVal };
};

/**
 * Sanitizes a single cell value for CSV export according to RFC 4180
 * and neutralizes spreadsheet formula injection (=, +, -, @, \t, \r).
 * 
 * @param {any} raw
 * @returns {string}
 */
export const sanitizeCSVField = (raw) => {
    if (raw === null || raw === undefined) return '';
    let str = String(raw);

    // Neutralize formula injection triggers (=, +, -, @, \t, \r)
    const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
    const trimmed = str.trimStart();
    if (str.length > 0 && (formulaTriggers.includes(str[0]) || (trimmed.length > 0 && formulaTriggers.includes(trimmed[0])))) {
        str = `'${str}`;
    }

    // Wrap in quotes and escape internal quotes if delimiter or newline is present
    if (/[",\r\n]/.test(str)) {
        str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
};

/**
 * Generates an RFC 4180 compliant CSV string from an array of transaction records.
 * Neutralizes spreadsheet formula injection on untrusted user text.
 * 
 * @param {Array<Object>} transactions - List of transactions to export
 * @param {string} [currencyCode='USD'] - Active currency code for header
 * @returns {string} CSV formatted string
 */
export const generateTransactionsCSV = (transactions = [], currencyCode = 'USD') => {
    const list = Array.isArray(transactions) ? transactions : [];
    const header = `Date,Description,Type,Category,Amount (${currencyCode})`;

    const rows = list.map((tx) => {
        const date = getTransactionDate(tx);
        const dateStr = date ? date.toISOString().split('T')[0] : 'N/A';
        const desc = sanitizeCSVField(tx?.description || '');
        const type = sanitizeCSVField(tx?.type || 'expense');
        const cat = sanitizeCSVField(tx?.category || 'Other');
        const amt = Number(tx?.amount || 0).toFixed(2);
        return `${dateStr},${desc},${type},${cat},${amt}`;
    });

    return [header, ...rows].join('\r\n');
};

/**
 * Computes the percentage and absolute difference between current and previous values.
 * Safeguards against division by zero, NaN, and Infinity.
 * 
 * @param {number} current - Current period value
 * @param {number} previous - Baseline period value
 * @returns {{
 *   percentage: number|null,
 *   delta: number,
 *   status: 'increased'|'decreased'|'unchanged'|'new'
 * }}
 */
export const computePercentageChange = (current, previous) => {
    const curr = Number.isFinite(Number(current)) ? Number(current) : 0;
    const prev = Number.isFinite(Number(previous)) ? Number(previous) : 0;

    if (prev === 0 && curr === 0) {
        return { percentage: 0, delta: 0, status: 'unchanged' };
    }
    if (prev === 0 && curr > 0) {
        return { percentage: null, delta: roundToTwo(curr), status: 'new' };
    }
    if (prev > 0 && curr === 0) {
        return { percentage: -100, delta: roundToTwo(-prev), status: 'decreased' };
    }
    const delta = roundToTwo(curr - prev);
    const percentage = roundToTwo(((curr - prev) / prev) * 100);
    return {
        percentage,
        delta,
        status: percentage > 0 ? 'increased' : percentage < 0 ? 'decreased' : 'unchanged'
    };
};

/**
 * Calculates current calendar-month and previous calendar-month financial aggregates,
 * including equivalent elapsed period (pace) comparisons, safe division by zero, and history classification.
 * 
 * @param {Array<Object>} transactions - List of transactions
 * @param {Date} [referenceDate=new Date()] - Deterministic baseline reference date
 * @returns {{
 *   historyState: 'no_transactions'|'current_month_only'|'previous_month_only'|'both_months'|'other_history_only',
 *   currentMonth: {
 *     label: string,
 *     shortLabel: string,
 *     year: number,
 *     monthIndex: number,
 *     daysElapsed: number,
 *     totalDays: number,
 *     isComplete: boolean,
 *     income: number,
 *     expense: number,
 *     balance: number,
 *     savingsRate: number|null,
 *     transactionCount: number
 *   },
 *   previousMonth: {
 *     label: string,
 *     shortLabel: string,
 *     year: number,
 *     monthIndex: number,
 *     totalDays: number,
 *     income: number,
 *     expense: number,
 *     balance: number,
 *     savingsRate: number|null,
 *     transactionCount: number
 *   },
 *   fullMonthComparison: {
 *     incomeChange: { percentage: number|null, delta: number, status: string },
 *     expenseChange: { percentage: number|null, delta: number, status: string },
 *     isComparable: boolean
 *   },
 *   elapsedPaceComparison: {
 *     daysCompared: number,
 *     currentElapsedDay: number,
 *     currentElapsedExpense: number,
 *     prevElapsedExpense: number,
 *     currentElapsedIncome: number,
 *     prevElapsedIncome: number,
 *     expenseChange: { percentage: number|null, delta: number, status: string },
 *     incomeChange: { percentage: number|null, delta: number, status: string },
 *     isApplicable: boolean
 *   }
 * }}
 */
export const calculateMonthOverMonthComparison = (transactions = [], referenceDate = new Date()) => {
    const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
        ? new Date(referenceDate)
        : new Date();

    const currentYear = ref.getFullYear();
    const currentMonth = ref.getMonth();
    const refDay = ref.getDate();

    // Current month boundaries
    const currentStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const currentEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    const daysInCurrentMonth = currentEnd.getDate();

    // Elapsed period in current month: start of month through end of reference day
    const currentElapsedEnd = new Date(currentYear, currentMonth, refDay, 23, 59, 59, 999);
    const isCurrentMonthComplete = refDay >= daysInCurrentMonth && ref.getTime() >= currentEnd.getTime();

    // Previous month boundaries
    const prevStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
    const prevEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    const daysInPrevMonth = prevEnd.getDate();
    const prevYear = prevStart.getFullYear();
    const prevMonth = prevStart.getMonth();

    // Equivalent elapsed day in previous month (safely handles leap years and shorter months)
    const prevElapsedDay = Math.min(refDay, daysInPrevMonth);
    const prevElapsedEnd = new Date(prevYear, prevMonth, prevElapsedDay, 23, 59, 59, 999);

    const fullMonthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentMonthLabel = `${fullMonthNames[currentMonth]} ${currentYear}`;
    const prevMonthLabel = `${fullMonthNames[prevMonth]} ${prevYear}`;

    const txList = Array.isArray(transactions) ? transactions : [];

    // Filter transactions
    const currentTxs = filterTransactionsByDateRange(txList, currentStart, currentEnd);
    const prevTxs = filterTransactionsByDateRange(txList, prevStart, prevEnd);

    // Elapsed subsets for pace comparison
    const currentElapsedTxs = filterTransactionsByDateRange(txList, currentStart, currentElapsedEnd);
    const prevElapsedTxs = filterTransactionsByDateRange(txList, prevStart, prevElapsedEnd);

    // Classify history state
    let historyState = 'no_transactions';
    if (txList.length > 0) {
        const hasCurrent = currentTxs.length > 0;
        const hasPrev = prevTxs.length > 0;
        if (hasCurrent && hasPrev) {
            historyState = 'both_months';
        } else if (hasCurrent && !hasPrev) {
            historyState = 'current_month_only';
        } else if (!hasCurrent && hasPrev) {
            historyState = 'previous_month_only';
        } else {
            historyState = 'other_history_only';
        }
    }

    // Current month totals
    const currentTotals = calculateTotals(currentTxs);
    const currentSavingsRate = calculateSavingsRate(currentTotals.totalIncome, currentTotals.totalExpense);

    // Previous month totals
    const prevTotals = calculateTotals(prevTxs);
    const prevSavingsRate = calculateSavingsRate(prevTotals.totalIncome, prevTotals.totalExpense);

    // Elapsed pace totals
    const currentElapsedTotals = calculateTotals(currentElapsedTxs);
    const prevElapsedTotals = calculateTotals(prevElapsedTxs);

    // Full month changes (with explicit disclosure of elapsed progress)
    const incomeChange = computePercentageChange(currentTotals.totalIncome, prevTotals.totalIncome);
    const expenseChange = computePercentageChange(currentTotals.totalExpense, prevTotals.totalExpense);

    // Equivalent elapsed pace changes
    const paceExpenseChange = computePercentageChange(currentElapsedTotals.totalExpense, prevElapsedTotals.totalExpense);
    const paceIncomeChange = computePercentageChange(currentElapsedTotals.totalIncome, prevElapsedTotals.totalIncome);

    return {
        historyState,
        currentMonth: {
            label: currentMonthLabel,
            shortLabel: `${MONTH_NAMES[currentMonth]} ${currentYear}`,
            year: currentYear,
            monthIndex: currentMonth,
            daysElapsed: refDay,
            totalDays: daysInCurrentMonth,
            isComplete: isCurrentMonthComplete,
            income: currentTotals.totalIncome,
            expense: currentTotals.totalExpense,
            balance: currentTotals.balance,
            savingsRate: currentSavingsRate,
            transactionCount: currentTxs.length
        },
        previousMonth: {
            label: prevMonthLabel,
            shortLabel: `${MONTH_NAMES[prevMonth]} ${prevYear}`,
            year: prevYear,
            monthIndex: prevMonth,
            totalDays: daysInPrevMonth,
            income: prevTotals.totalIncome,
            expense: prevTotals.totalExpense,
            balance: prevTotals.balance,
            savingsRate: prevSavingsRate,
            transactionCount: prevTxs.length
        },
        fullMonthComparison: {
            incomeChange,
            expenseChange,
            isComparable: historyState === 'both_months'
        },
        elapsedPaceComparison: {
            daysCompared: prevElapsedDay,
            currentElapsedDay: refDay,
            currentElapsedExpense: currentElapsedTotals.totalExpense,
            prevElapsedExpense: prevElapsedTotals.totalExpense,
            currentElapsedIncome: currentElapsedTotals.totalIncome,
            prevElapsedIncome: prevElapsedTotals.totalIncome,
            expenseChange: paceExpenseChange,
            incomeChange: paceIncomeChange,
            isApplicable: historyState === 'both_months' && !isCurrentMonthComplete
        }
    };
};

/**
 * Calculates category-level spending shifts between the current and previous calendar months.
 * Strictly limits category movers to the 3 most meaningful changes.
 * 
 * @param {Array<Object>} transactions
 * @param {Date} [referenceDate=new Date()]
 * @returns {{
 *   historyState: string,
 *   topCategoryThisMonth: { category: string, amount: number, percentage: number, color: string }|null,
 *   topMovers: Array<{
 *     category: string,
 *     currentAmount: number,
 *     previousAmount: number,
 *     delta: number,
 *     percentageChange: number|null,
 *     changeStatus: string,
 *     currentShare: number,
 *     color: string
 *   }>,
 *   allCategoriesCount: number,
 *   currentExpenseTotal: number,
 *   prevExpenseTotal: number
 * }}
 */
export const calculateCategoryMoMTrends = (transactions = [], referenceDate = new Date()) => {
    const comparison = calculateMonthOverMonthComparison(transactions, referenceDate);
    const { historyState, currentMonth, previousMonth } = comparison;

    const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
        ? new Date(referenceDate)
        : new Date();

    const currentYear = ref.getFullYear();
    const currentMonthIdx = ref.getMonth();

    const currentStart = new Date(currentYear, currentMonthIdx, 1, 0, 0, 0, 0);
    const currentEnd = new Date(currentYear, currentMonthIdx + 1, 0, 23, 59, 59, 999);
    const prevStart = new Date(currentYear, currentMonthIdx - 1, 1, 0, 0, 0, 0);
    const prevEnd = new Date(currentYear, currentMonthIdx, 0, 23, 59, 59, 999);

    const txList = Array.isArray(transactions) ? transactions : [];
    const currentTxs = filterTransactionsByDateRange(txList, currentStart, currentEnd);
    const prevTxs = filterTransactionsByDateRange(txList, prevStart, prevEnd);

    const currentExpenses = currentTxs.filter((tx) => tx?.type === 'expense');
    const prevExpenses = prevTxs.filter((tx) => tx?.type === 'expense');

    const currentBreakdown = calculateCategoryBreakdown(currentExpenses);
    const prevBreakdown = calculateCategoryBreakdown(prevExpenses);

    const currentMap = {};
    for (let i = 0; i < currentBreakdown.length; i++) {
        currentMap[currentBreakdown[i].category] = currentBreakdown[i].amount;
    }

    const prevMap = {};
    for (let i = 0; i < prevBreakdown.length; i++) {
        prevMap[prevBreakdown[i].category] = prevBreakdown[i].amount;
    }

    const allCategories = Array.from(new Set([...Object.keys(currentMap), ...Object.keys(prevMap)]));

    const shifts = allCategories.map((cat) => {
        const currAmt = currentMap[cat] || 0;
        const prevAmt = prevMap[cat] || 0;
        const delta = roundToTwo(currAmt - prevAmt);
        const change = computePercentageChange(currAmt, prevAmt);
        const currItem = currentBreakdown.find((b) => b.category === cat);
        const currPercentage = currItem ? currItem.percentage : 0;

        return {
            category: cat,
            currentAmount: currAmt,
            previousAmount: prevAmt,
            delta,
            percentageChange: change.percentage,
            changeStatus: change.status,
            currentShare: currPercentage,
            color: getCategoryColor(cat)
        };
    });

    // Rank by absolute magnitude of change
    shifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // Limit to the three most meaningful changes
    const topMovers = shifts.slice(0, 3);

    // Identify top category this month
    const topCategoryThisMonth = currentBreakdown.length > 0 ? currentBreakdown[0] : null;

    return {
        historyState,
        topCategoryThisMonth,
        topMovers,
        allCategoriesCount: allCategories.length,
        currentExpenseTotal: currentMonth.expense,
        prevExpenseTotal: previousMonth.expense
    };
};

/**
 * Generates concise, factual financial observations strictly derived from authenticated user data.
 * Does not invent insights when historical data is missing or insufficient.
 * 
 * @param {Array<Object>} transactions
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array<{
 *   id: string,
 *   type: 'info'|'positive'|'warning'|'neutral',
 *   title: string,
 *   message: string
 * }>}
 */
export const generateDashboardInsights = (transactions = [], referenceDate = new Date()) => {
    const comparison = calculateMonthOverMonthComparison(transactions, referenceDate);
    const { historyState, currentMonth, previousMonth, elapsedPaceComparison, fullMonthComparison } = comparison;
    const categoryTrends = calculateCategoryMoMTrends(transactions, referenceDate);

    const insights = [];

    if (historyState === 'no_transactions') {
        return [
            {
                id: 'no_transactions',
                type: 'info',
                title: 'Welcome to Vaultex',
                message: 'No transactions recorded yet. Add an income or expense to see monthly trends and financial insights.'
            }
        ];
    }

    if (historyState === 'previous_month_only') {
        return [
            {
                id: 'no_current_activity',
                type: 'neutral',
                title: `${currentMonth.label} — No Activity Yet`,
                message: `No transactions recorded yet for ${currentMonth.label}. In ${previousMonth.label}, you recorded ${previousMonth.transactionCount} transactions (expenses: ${previousMonth.expense}).`
            },
            {
                id: 'record_current',
                type: 'info',
                title: 'Start Tracking This Month',
                message: `Record your first transaction for ${currentMonth.label} to unlock month-over-month comparisons.`
            }
        ];
    }

    if (historyState === 'other_history_only') {
        return [
            {
                id: 'dormant_activity',
                type: 'neutral',
                title: 'No Recent Monthly Activity',
                message: `No transactions recorded for ${currentMonth.label} or ${previousMonth.label}. Prior transactions remain safely preserved in your history.`
            }
        ];
    }

    if (historyState === 'current_month_only') {
        // Cash Flow Observation
        if (currentMonth.income > 0) {
            const isPositive = currentMonth.balance >= 0;
            insights.push({
                id: 'current_cash_flow',
                type: isPositive ? 'positive' : 'warning',
                title: isPositive ? 'Positive Net Cash Flow' : 'Net Outflow Notice',
                message: isPositive
                    ? `Net savings of ${currentMonth.balance} recorded for ${currentMonth.label}${currentMonth.savingsRate !== null ? ` (${currentMonth.savingsRate}% savings rate)` : ''}.`
                    : `Expenses exceed income by ${Math.abs(currentMonth.balance)} in ${currentMonth.label}.`
            });
        } else if (currentMonth.expense > 0) {
            insights.push({
                id: 'current_cash_flow',
                type: 'neutral',
                title: 'Recorded Expenses',
                message: `Recorded ${currentMonth.expense} in expenses for ${currentMonth.label} with zero recorded income.`
            });
        }

        // Top Category Observation
        if (categoryTrends.topCategoryThisMonth) {
            insights.push({
                id: 'top_category',
                type: 'info',
                title: 'Top Expense Category',
                message: `${categoryTrends.topCategoryThisMonth.category} is your highest expense area at ${categoryTrends.topCategoryThisMonth.amount} (${categoryTrends.topCategoryThisMonth.percentage}% of spending).`
            });
        }

        // History Notice
        insights.push({
            id: 'history_notice',
            type: 'info',
            title: 'Initial Month of Tracking',
            message: `You are tracking ${currentMonth.label}. Month-over-month comparisons will unlock once you have consecutive monthly records.`
        });

        return insights;
    }

    // Both months present: full comparative insights
    // 1. Spending Pace / MoM Change
    if (elapsedPaceComparison.isApplicable) {
        const pace = elapsedPaceComparison.expenseChange;
        if (pace.status === 'decreased') {
            insights.push({
                id: 'spending_pace',
                type: 'positive',
                title: 'Spending Pacing Down',
                message: `Through day ${elapsedPaceComparison.daysCompared}, spending is down ${Math.abs(pace.percentage)}% (${elapsedPaceComparison.currentElapsedExpense} vs ${elapsedPaceComparison.prevElapsedExpense}) compared to the same period in ${previousMonth.shortLabel}.`
            });
        } else if (pace.status === 'increased') {
            insights.push({
                id: 'spending_pace',
                type: 'warning',
                title: 'Spending Pacing Higher',
                message: `Through day ${elapsedPaceComparison.daysCompared}, spending is up ${pace.percentage}% (${elapsedPaceComparison.currentElapsedExpense} vs ${elapsedPaceComparison.prevElapsedExpense}) compared to the same period in ${previousMonth.shortLabel}.`
            });
        } else if (pace.status === 'new') {
            insights.push({
                id: 'spending_pace',
                type: 'neutral',
                title: 'New Spending Window',
                message: `Recorded ${elapsedPaceComparison.currentElapsedExpense} in spending through day ${elapsedPaceComparison.daysCompared}, compared to no expenses in the same period last month.`
            });
        } else {
            insights.push({
                id: 'spending_pace',
                type: 'neutral',
                title: 'Spending Pacing Stable',
                message: `Through day ${elapsedPaceComparison.daysCompared}, spending is on par with the same period in ${previousMonth.shortLabel}.`
            });
        }
    } else if (currentMonth.isComplete) {
        const fullChange = fullMonthComparison.expenseChange;
        if (fullChange.status === 'decreased') {
            insights.push({
                id: 'spending_full',
                type: 'positive',
                title: 'Lower Monthly Spending',
                message: `Total monthly expenses in ${currentMonth.label} dropped ${Math.abs(fullChange.percentage)}% (${currentMonth.expense} vs ${previousMonth.expense}) compared to ${previousMonth.shortLabel}.`
            });
        } else if (fullChange.status === 'increased') {
            insights.push({
                id: 'spending_full',
                type: 'warning',
                title: 'Higher Monthly Spending',
                message: `Total monthly expenses in ${currentMonth.label} rose ${fullChange.percentage}% (${currentMonth.expense} vs ${previousMonth.expense}) compared to ${previousMonth.shortLabel}.`
            });
        }
    }

    // 2. Cash Flow & Savings Rate
    if (currentMonth.income > 0) {
        const isPositive = currentMonth.balance >= 0;
        insights.push({
            id: 'cash_flow_health',
            type: isPositive ? 'positive' : 'warning',
            title: isPositive ? 'Net Positive Cash Flow' : 'Monthly Deficit Alert',
            message: isPositive
                ? `Net cash flow is +${currentMonth.balance} in ${currentMonth.label}${currentMonth.savingsRate !== null ? ` with a ${currentMonth.savingsRate}% savings rate` : ''}.`
                : `Net outflow of -${Math.abs(currentMonth.balance)} in ${currentMonth.label}; expenses exceed income.`
        });
    }

    // 3. Top Category Shift (Most meaningful mover)
    if (categoryTrends.topMovers.length > 0) {
        const topMover = categoryTrends.topMovers[0];
        if (topMover.delta > 0) {
            insights.push({
                id: 'category_shift',
                type: 'warning',
                title: `${topMover.category} Spending Rose`,
                message: `${topMover.category} spending increased by ${topMover.delta} compared to ${previousMonth.shortLabel} (${topMover.currentAmount} vs ${topMover.previousAmount}).`
            });
        } else if (topMover.delta < 0) {
            insights.push({
                id: 'category_shift',
                type: 'positive',
                title: `${topMover.category} Savings`,
                message: `${topMover.category} spending decreased by ${Math.abs(topMover.delta)} compared to ${previousMonth.shortLabel} (${topMover.currentAmount} vs ${topMover.previousAmount}).`
            });
        }
    }

    return insights;
};

/**
 * Formats a date into a clean, relative human-readable timestamp string.
 * @param {string|Date|number} dateInput - Date value
 * @returns {string} Formatted relative time
 */
export const formatRelativeTime = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Calculates pagination metadata and slices items for the current page.
 * Safely bounds requested page between 1 and totalPages.
 *
 * @param {Array<any>} items - Full items list
 * @param {number} currentPage - Requested 1-based page number
 * @param {number} pageSize - Number of items per page (default 10)
 * @returns {{
 *   currentPage: number,
 *   totalPages: number,
 *   totalItems: number,
 *   startIndex: number,
 *   endIndex: number,
 *   paginatedItems: Array<any>,
 *   hasNextPage: boolean,
 *   hasPrevPage: boolean
 * }}
 */
export const calculatePagination = (items = [], currentPage = 1, pageSize = 10) => {
    const safeItems = Array.isArray(items) ? items : [];
    const safePageSize = Math.max(1, Number(pageSize) || 10);
    const totalItems = safeItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

    const safePage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

    const startIndex = (safePage - 1) * safePageSize;
    const endIndex = Math.min(startIndex + safePageSize, totalItems);
    const paginatedItems = safeItems.slice(startIndex, endIndex);

    return {
        currentPage: safePage,
        totalPages,
        totalItems,
        startIndex,
        endIndex,
        paginatedItems,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1
    };
};
