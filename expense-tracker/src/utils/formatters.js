import { CURRENCY_CONFIG } from '../constants/theme.js';

/**
 * Formats a monetary number into a localized currency string.
 * Uses Intl.NumberFormat with an explicit fallback for custom formatting.
 * 
 * @param {number|string} val - Numeric value to format
 * @param {string} currency - Currency code ('NGN', 'USD', 'EUR', 'GBP')
 * @returns {string} Formatted currency string (e.g. "₦1,200.00" or "$50.00")
 */
export const formatCurrency = (val, currency = 'NGN') => {
    const num = Number(val) || 0;
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.NGN;
    try {
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    } catch {
        const isNegative = num < 0;
        const absVal = Math.abs(num);
        const formatted = absVal.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return `${isNegative ? '-' : ''}${config.symbol}${formatted}`;
    }
};

/**
 * Formats an ISO date string into user-friendly date and time components.
 * 
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {{ date: string, time: string }} e.g. { date: "Oct 19, 2026", time: "09:25 AM" }
 */
export const formatTxDate = (dateStr) => {
    if (!dateStr) return { date: 'Recent', time: 'Just now' };
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: 'Recent', time: 'Just now' };
        return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    } catch {
        return { date: 'Recent', time: 'Just now' };
    }
};
