export const INCOME_CATEGORIES = [
    'Salary',
    'Freelance',
    'Business',
    'Investments',
    'Gifts',
    'Other'
];

export const EXPENSE_CATEGORIES = [
    'Food & Dining',
    'Transportation',
    'Housing & Rent',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Education',
    'Personal Care',
    'Other'
];

// Unified category color palette across all views (Transactions, Analytics, Donut, and Badges)
export const CATEGORY_COLORS = {
    'Food & Dining': '#f59e0b',
    'Transportation': '#3b82f6',
    'Housing & Rent': '#8b5cf6',
    'Utilities': '#06b6d4',
    'Entertainment': '#ec4899',
    'Healthcare': '#ef4444',
    'Shopping': '#10b981',
    'Education': '#6366f1',
    'Personal Care': '#14b8a6',
    'Salary': '#10b981',
    'Freelance': '#0ea5e9',
    'Business': '#6366f1',
    'Investments': '#8b5cf6',
    'Gifts': '#f43f5e',
    'Other': '#64748b'
};

export const DEFAULT_CATEGORY_COLOR = '#64748b';

/**
 * Returns the standardized hex color for a given category name,
 * with safe fallback to DEFAULT_CATEGORY_COLOR for unknown or missing categories.
 * 
 * @param {string} category - Category name
 * @returns {string} Hex color code
 */
export const getCategoryColor = (category) => {
    if (!category || typeof category !== 'string') {
        return DEFAULT_CATEGORY_COLOR;
    }
    return CATEGORY_COLORS[category.trim()] || DEFAULT_CATEGORY_COLOR;
};
