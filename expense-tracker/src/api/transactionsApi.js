import apiClient from './client.js';

/**
 * Fetch all transaction records from the Express REST API.
 * Corresponds to: GET /api/transactions
 * Automatically sends session credentials and returns user-scoped records.
 * 
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getTransactions = () => {
    return apiClient.get('/transactions');
};

/**
 * Create a new transaction record in the database.
 * Corresponds to: POST /api/transactions
 * @param {Object} txData - Transaction data containing description, amount, type, category
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createTransaction = (txData) => {
    return apiClient.post('/transactions', {
        ...txData,
        amount: Number(txData.amount)
    });
};

/**
 * Update an existing transaction record by its MongoDB _id.
 * Corresponds to: PUT /api/transactions/:id
 * @param {string} id - The MongoDB _id of the transaction
 * @param {Object} txData - Updated transaction fields (description, amount, type, category)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateTransaction = (id, txData) => {
    return apiClient.put(`/transactions/${id}`, {
        description: txData.description,
        amount: Number(txData.amount),
        type: txData.type,
        category: txData.category
    });
};

/**
 * Delete a transaction record by its MongoDB _id.
 * Corresponds to: DELETE /api/transactions/:id
 * @param {string} id - The MongoDB _id of the transaction to delete
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteTransaction = (id) => {
    return apiClient.delete(`/transactions/${id}`);
};

/**
 * Preview an uploaded CSV transactions file with server-side validation.
 * Corresponds to: POST /api/transactions/import-preview
 * @param {string} csvContent
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const previewTransactionsImport = (csvContent) => {
    return apiClient.post('/transactions/import-preview', { csvContent });
};

/**
 * Import validated transactions from CSV.
 * Corresponds to: POST /api/transactions/import
 * @param {{ csvContent: string, importMode?: 'valid_only'|'all_or_nothing', skipExistingDuplicates?: boolean, skipInFileDuplicates?: boolean }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const importTransactions = (payload) => {
    return apiClient.post('/transactions/import', payload);
};

