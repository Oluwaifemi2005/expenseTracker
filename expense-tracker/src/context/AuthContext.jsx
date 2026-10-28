import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from './authContextInstance';
import { getMe, loginUser, registerUser, logoutUser } from '../api/authApi';
import apiClient from '../api/client';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'

    // Guard against concurrent 401 requests causing duplicate logout triggers or redirect loops
    const isHandlingExpiryRef = useRef(false);

    /**
     * Clear user session state and display the session expired message.
     * Guarded with isHandlingExpiryRef to prevent race conditions from concurrent 401s.
     */
    const handleSessionExpired = useCallback((customMessage) => {
        if (isHandlingExpiryRef.current) {
            return;
        }
        isHandlingExpiryRef.current = true;

        try {
            localStorage.removeItem('vaultex_token');
        } catch {
            // Ignore storage errors
        }

        const message = customMessage || 'Your session has expired. Please log in again to continue.';
        setUser(null);
        setSessionExpiredMessage(message);
        setAuthModalMode('login');

        // Proactively clear cookie on backend without throwing if already invalid
        logoutUser().catch(() => {});

        setTimeout(() => {
            isHandlingExpiryRef.current = false;
        }, 800);
    }, []);

    // Check existing session on mount or explicit re-verification
    const checkAuth = useCallback(() => {
        getMe()
            .then((response) => {
                if (response.data && response.data.user) {
                    setUser(response.data.user);
                    setSessionExpiredMessage('');
                } else {
                    try {
                        localStorage.removeItem('vaultex_token');
                    } catch {}
                    setUser(null);
                }
            })
            .catch((error) => {
                try {
                    localStorage.removeItem('vaultex_token');
                } catch {}
                const message = error.response?.data?.message;
                // If the JWT expired on the backend, inform the user
                if (error.response?.status === 401 && message && message.toLowerCase().includes('expired')) {
                    handleSessionExpired(message);
                } else {
                    // Unauthenticated visitor with no prior token
                    setUser(null);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [handleSessionExpired]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Global Axios 401 interceptor on protected resources
    useEffect(() => {
        const interceptor = apiClient.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    const url = error.config ? error.config.url : '';
                    const isAuthEndpoint = url && (
                        url.includes('/auth/login') ||
                        url.includes('/auth/register') ||
                        url.includes('/auth/me')
                    );

                    // When any protected resource (like /transactions) returns 401, session has expired
                    if (!isAuthEndpoint) {
                        const message = error.response.data?.message;
                        handleSessionExpired(message || 'Your session has expired. Please log in again.');
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            apiClient.interceptors.response.eject(interceptor);
        };
    }, [handleSessionExpired]);

    const login = async ({ email, password }) => {
        try {
            const response = await loginUser({ email, password });
            if (response.data && response.data.user) {
                if (response.data.token) {
                    try {
                        localStorage.setItem('vaultex_token', response.data.token);
                    } catch {}
                }
                setUser(response.data.user);
                setSessionExpiredMessage('');
                setIsAuthModalOpen(false);
                return { success: true, user: response.data.user };
            }
            return { success: false, message: 'Invalid response from server.' };
        } catch (error) {
            const data = error.response?.data;
            const message = data?.message ||
                (data?.errors && data.errors[0]?.message) ||
                (!error.response ? 'Unable to connect to the server. Please ensure the backend is running.' : 'Login failed. Please check your credentials.');
            return {
                success: false,
                message,
                errors: data?.errors
            };
        }
    };

    const register = async ({ name, email, password }) => {
        try {
            const response = await registerUser({ name, email, password });
            if (response.data && response.data.user) {
                if (response.data.token) {
                    try {
                        localStorage.setItem('vaultex_token', response.data.token);
                    } catch {}
                }
                setUser(response.data.user);
                setSessionExpiredMessage('');
                setIsAuthModalOpen(false);
                return { success: true, user: response.data.user };
            }
            return { success: false, message: 'Invalid response from server.' };
        } catch (error) {
            const data = error.response?.data;
            const message = data?.message ||
                (data?.errors && data.errors[0]?.message) ||
                (!error.response ? 'Unable to connect to the server. Please ensure the backend is running.' : 'Registration failed. Please try again.');
            return {
                success: false,
                message,
                errors: data?.errors
            };
        }
    };

    const logout = async () => {
        if (isHandlingExpiryRef.current) return;
        isHandlingExpiryRef.current = true;

        try {
            await logoutUser();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            try {
                localStorage.removeItem('vaultex_token');
            } catch {}
            setUser(null);
            setSessionExpiredMessage('');
            setAuthModalMode('login');
            setTimeout(() => {
                isHandlingExpiryRef.current = false;
            }, 400);
        }
    };

    const clearSessionExpiredMessage = () => {
        setSessionExpiredMessage('');
    };

    const openLoginModal = () => {
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
    };

    const openRegisterModal = () => {
        setAuthModalMode('register');
        setIsAuthModalOpen(true);
    };

    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
    };

    const value = {
        user,
        loading,
        isAuthenticated: Boolean(user),
        sessionExpiredMessage,
        clearSessionExpiredMessage,
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        login,
        register,
        logout,
        checkAuth,
        openLoginModal,
        openRegisterModal,
        closeAuthModal
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
