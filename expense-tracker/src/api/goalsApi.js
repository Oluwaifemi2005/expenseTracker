import apiClient from './client.js';

/**
 * Fetch all savings goals from the Express REST API.
 * Corresponds to: GET /api/goals
 * 
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getGoals = () => {
    return apiClient.get('/goals');
};

/**
 * Create a new savings goal in the database.
 * Corresponds to: POST /api/goals
 * 
 * @param {Object} goalData - Goal data { name, targetAmount, currentAmount, targetDate, category }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createGoal = (goalData) => {
    return apiClient.post('/goals', {
        name: goalData.name,
        targetAmount: Number(goalData.targetAmount),
        currentAmount: goalData.currentAmount !== undefined && goalData.currentAmount !== "" ? Number(goalData.currentAmount) : 0,
        targetDate: goalData.targetDate || null,
        category: goalData.category || 'General'
    });
};

/**
 * Update an existing savings goal by its MongoDB _id.
 * Corresponds to: PUT /api/goals/:id
 * 
 * @param {string} id - Goal _id
 * @param {Object} goalData - Updated fields
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateGoal = (id, goalData) => {
    const payload = {};
    if (goalData.name !== undefined) payload.name = goalData.name;
    if (goalData.targetAmount !== undefined) payload.targetAmount = Number(goalData.targetAmount);
    if (goalData.currentAmount !== undefined) payload.currentAmount = Number(goalData.currentAmount);
    if (goalData.targetDate !== undefined) payload.targetDate = goalData.targetDate;
    if (goalData.category !== undefined) payload.category = goalData.category;

    return apiClient.put(`/goals/${id}`, payload);
};

/**
 * Atomically adjust contributions (add or subtract funds) for a goal.
 * Corresponds to: POST /api/goals/:id/adjust
 * 
 * @param {string} id - Goal _id
 * @param {Object} data - { amount: number, type: 'add' | 'subtract' }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const adjustContribution = (id, data) => {
    return apiClient.post(`/goals/${id}/adjust`, {
        amount: Number(data.amount),
        type: data.type
    });
};

/**
 * Delete a savings goal by its MongoDB _id.
 * Corresponds to: DELETE /api/goals/:id
 * 
 * @param {string} id - Goal _id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteGoal = (id) => {
    return apiClient.delete(`/goals/${id}`);
};
