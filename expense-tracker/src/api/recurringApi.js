import apiClient from './client.js';

/**
 * Fetch all recurring transaction rules for the authenticated user.
 * Corresponds to: GET /api/recurring
 * 
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getRecurringRules = () => {
    return apiClient.get('/recurring');
};

/**
 * Create a new recurring transaction rule.
 * Corresponds to: POST /api/recurring
 * 
 * @param {Object} ruleData - { name, amount, type, category, frequency, startDate, endDate, status }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createRecurringRule = (ruleData) => {
    return apiClient.post('/recurring', {
        name: ruleData.name,
        amount: Number(ruleData.amount),
        type: ruleData.type || 'expense',
        category: ruleData.category,
        frequency: ruleData.frequency,
        startDate: ruleData.startDate,
        endDate: ruleData.endDate || null,
        status: ruleData.status || 'active'
    });
};

/**
 * Update an existing recurring transaction rule.
 * Corresponds to: PUT /api/recurring/:id
 * 
 * @param {string} id - Rule _id
 * @param {Object} ruleData - Fields to update
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateRecurringRule = (id, ruleData) => {
    const payload = {};
    if (ruleData.name !== undefined) payload.name = ruleData.name;
    if (ruleData.amount !== undefined) payload.amount = Number(ruleData.amount);
    if (ruleData.type !== undefined) payload.type = ruleData.type;
    if (ruleData.category !== undefined) payload.category = ruleData.category;
    if (ruleData.frequency !== undefined) payload.frequency = ruleData.frequency;
    if (ruleData.startDate !== undefined) payload.startDate = ruleData.startDate;
    if (ruleData.endDate !== undefined) payload.endDate = ruleData.endDate || null;
    if (ruleData.status !== undefined) payload.status = ruleData.status;

    return apiClient.put(`/recurring/${id}`, payload);
};

/**
 * Toggle active / paused status for a recurring rule.
 * Corresponds to: PATCH /api/recurring/:id/status
 * 
 * @param {string} id - Rule _id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const toggleRecurringStatus = (id) => {
    return apiClient.patch(`/recurring/${id}/status`);
};

/**
 * Trigger on-demand processing of due occurrences for the authenticated user.
 * Corresponds to: POST /api/recurring/process-due
 * 
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const processDueRecurring = () => {
    return apiClient.post('/recurring/process-due');
};

/**
 * Delete a recurring rule. Previously generated transactions are preserved.
 * Corresponds to: DELETE /api/recurring/:id
 * 
 * @param {string} id - Rule _id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteRecurringRule = (id) => {
    return apiClient.delete(`/recurring/${id}`);
};
