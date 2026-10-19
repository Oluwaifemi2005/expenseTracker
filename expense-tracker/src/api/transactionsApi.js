import axios from 'axios';
import { API_BASE_URL } from '../constants/api.js';

const TRANSACTIONS_ENDPOINT = `${API_BASE_URL}/transactions`;

/**
 * Fetch all transaction records from the Express REST API.
 * Corresponds to: GET /api/transactions
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getTransactions = () => {
    return axios.get(TRANSACTIONS_ENDPOINT);
};

/**
 * Create a new transaction record in the database.
 * Corresponds to: POST /api/transactions
 * @param {Object} txData - Transaction data containing description, amount, type, category
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createTransaction = (txData) => {
    return axios.post(TRANSACTIONS_ENDPOINT, {
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
    return axios.put(`${TRANSACTIONS_ENDPOINT}/${id}`, {
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
    return axios.delete(`${TRANSACTIONS_ENDPOINT}/${id}`);
};
