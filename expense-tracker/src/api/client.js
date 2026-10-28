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

// Attach Authorization Bearer token as fallback for environments where third-party cookies are blocked (e.g. mobile Safari/Chrome)
apiClient.interceptors.request.use(
    (config) => {
        try {
            const token = localStorage.getItem('vaultex_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch {
            // Gracefully ignore storage access errors (e.g. private browsing storage restrictions)
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default apiClient;
