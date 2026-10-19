/**
 * Financial calculation and aggregation utilities.
 * Pure functions with zero UI or state dependencies.
 */

/**
 * Calculates total income, total expense, net balance, and filtered transaction lists.
 * 
 * @param {Array<Object>} transactions - List of transaction objects
 * @returns {{
 *   income: Array<Object>,
 *   expense: Array<Object>,
 *   totalIncome: number,
 *   totalExpense: number,
 *   balance: number
 * }}
 */
export const calculateTotals = (transactions = []) => {
    const txList = Array.isArray(transactions) ? transactions : [];

    const income = txList.filter((t) => t && t.type === 'income');
    const expense = txList.filter((t) => t && t.type === 'expense');

    const totalIncome = income.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalExpense = expense.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const balance = totalIncome - totalExpense;

    return {
        income,
        expense,
        totalIncome,
        totalExpense,
        balance
    };
};
