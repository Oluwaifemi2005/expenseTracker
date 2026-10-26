import apiClient from './client.js';

/**
 * Register a new user account.
 * Corresponds to: POST /api/auth/register
 * Sets HTTP-only authentication cookie on success.
 * 
 * @param {Object} userData - { name, email, password }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const registerUser = ({ name, email, password }) => {
    return apiClient.post('/auth/register', { name, email, password });
};

/**
 * Log in to an existing user account.
 * Corresponds to: POST /api/auth/login
 * Sets HTTP-only authentication cookie on success.
 * 
 * @param {Object} credentials - { email, password }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const loginUser = ({ email, password }) => {
    return apiClient.post('/auth/login', { email, password });
};

/**
 * Log out the currently authenticated user.
 * Corresponds to: POST /api/auth/logout
 * Clears the HTTP-only authentication cookie on the server.
 * 
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const logoutUser = () => {
    return apiClient.post('/auth/logout');
};

/**
 * Retrieve the profile of the currently authenticated user.
 * Corresponds to: GET /api/auth/me
 * 
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getMe = () => {
    return apiClient.get('/auth/me');
};
