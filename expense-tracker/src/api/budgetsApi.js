import apiClient from './client.js';

/**
 * Fetch all budgets from the Express REST API.
 * Corresponds to: GET /api/budgets
 * Automatically sends session credentials and returns user-scoped records.
 * 
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getBudgets = () => {
    return apiClient.get('/budgets');
};

/**
 * Create a new budget record in the database.
 * Corresponds to: POST /api/budgets
 * @param {Object} budgetData - Budget data containing name, limit, category, period
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createBudget = (budgetData) => {
    return apiClient.post('/budgets', {
        name: budgetData.name,
        limit: Number(budgetData.limit),
        category: budgetData.category,
        period: budgetData.period || 'monthly'
    });
};

/**
 * Update an existing budget record by its MongoDB _id.
 * Corresponds to: PUT /api/budgets/:id
 * @param {string} id - The MongoDB _id of the budget
 * @param {Object} budgetData - Updated budget fields
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateBudget = (id, budgetData) => {
    const payload = {};
    if (budgetData.name !== undefined) payload.name = budgetData.name;
    if (budgetData.limit !== undefined) payload.limit = Number(budgetData.limit);
    if (budgetData.category !== undefined) payload.category = budgetData.category;
    if (budgetData.period !== undefined) payload.period = budgetData.period;

    return apiClient.put(`/budgets/${id}`, payload);
};

/**
 * Delete a budget record by its MongoDB _id.
 * Corresponds to: DELETE /api/budgets/:id
 * @param {string} id - The MongoDB _id of the budget to delete
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteBudget = (id) => {
    return apiClient.delete(`/budgets/${id}`);
};
