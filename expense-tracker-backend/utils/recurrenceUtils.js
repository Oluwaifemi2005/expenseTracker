/**
 * Recurrence schedule utilities for calculating next occurrences,
 * preserving anchor days across short months and leap years,
 * and normalizing occurrence date keys.
 */

/**
 * Formats a Date object to 'YYYY-MM-DD' in UTC to provide a stable, timezone-independent occurrence key.
 * @param {Date|string|number} date 
 * @returns {string} e.g. "2026-11-01"
 */
function toOccurrenceKey(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        throw new Error('Invalid date provided to toOccurrenceKey');
    }
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculates the next occurrence date advancing from the previous scheduled occurrence.
 * Correctly preserves the original day-of-month anchor across short months and leap years.
 * 
 * @param {Date|string|number} currentOccurrence - The occurrence date being advanced from
 * @param {'weekly'|'monthly'|'yearly'} frequency - Schedule cadence
 * @param {number} anchorDay - The original day of the month (1-31)
 * @returns {Date} The next scheduled occurrence
 */
function getNextOccurrenceDate(currentOccurrence, frequency, anchorDay) {
    const curr = new Date(currentOccurrence);
    if (isNaN(curr.getTime())) {
        throw new Error('Invalid currentOccurrence date provided');
    }

    const safeAnchor = Math.max(1, Math.min(31, Number(anchorDay) || curr.getUTCDate()));
    const currYear = curr.getUTCFullYear();
    const currMonth = curr.getUTCMonth(); // 0-indexed (0 = Jan, 11 = Dec)
    const currHours = curr.getUTCHours();
    const currMinutes = curr.getUTCMinutes();
    const currSeconds = curr.getUTCSeconds();
    const currMillis = curr.getUTCMilliseconds();

    if (frequency === 'weekly') {
        return new Date(curr.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (frequency === 'monthly') {
        const nextMonthTotal = currMonth + 1;
        const targetYear = currYear + Math.floor(nextMonthTotal / 12);
        const targetMonth = nextMonthTotal % 12;

        // Day count in target month (day 0 of following month)
        const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const targetDay = Math.min(safeAnchor, daysInTargetMonth);

        return new Date(Date.UTC(targetYear, targetMonth, targetDay, currHours, currMinutes, currSeconds, currMillis));
    }

    if (frequency === 'yearly') {
        const targetYear = currYear + 1;
        const targetMonth = currMonth;
        const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const targetDay = Math.min(safeAnchor, daysInTargetMonth);

        return new Date(Date.UTC(targetYear, targetMonth, targetDay, currHours, currMinutes, currSeconds, currMillis));
    }

    throw new Error(`Unsupported frequency: ${frequency}`);
}

/**
 * Checks if a scheduled occurrence exceeds the rule's optional end date.
 * @param {Date} occurrenceDate 
 * @param {Date|null} endDate 
 * @returns {boolean}
 */
function isOccurrencePastEndDate(occurrenceDate, endDate) {
    if (!endDate) return false;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return false;
    return new Date(occurrenceDate).getTime() > end.getTime();
}

module.exports = {
    toOccurrenceKey,
    getNextOccurrenceDate,
    isOccurrencePastEndDate
};
