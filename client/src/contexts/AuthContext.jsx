import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // On mount: pick up token or error from OAuth callback URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const urlError = params.get('auth_error');

        if (urlToken) {
            setToken(urlToken);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlError) {
            setAuthError(decodeURIComponent(urlError));
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            fetchUser();
        } else {
            localStorage.removeItem('token');
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const data = await apiFetch('/auth/me');
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user', error);
            setToken(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid credentials');
        setToken(data.token);
    };

    const register = async (email, password) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setToken(data.token);
    };

    const clearAuthError = () => setAuthError(null);

    const logout = () => {
        setToken(null);
        setAuthError(null);
    };

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            authError, clearAuthError,
            login, register,
            logout, fetchUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};
