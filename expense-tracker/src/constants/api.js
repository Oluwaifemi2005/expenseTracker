// Vaultex Centralized API Configuration
// In Vite, environment variables exposed to client-side code must start with VITE_
// and are accessed via import.meta.env instead of process.env.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
