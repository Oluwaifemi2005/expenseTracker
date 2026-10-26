import axios from 'axios';
import { API_BASE_URL } from '../constants/api.js';

/**
 * Pre-configured Axios client for Vaultex REST API.
 * Configured with withCredentials: true so HTTP-only session cookies
 * are transmitted automatically across CORS requests.
 */
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default apiClient;
