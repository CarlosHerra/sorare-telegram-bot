import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const { login, register, authError, clearAuthError } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSorareOAuth = () => {
        window.location.href = '/api/auth/sorare';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const displayError = error || authError;

    return (
        <div className="min-h-screen bg-sorare-dark flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-sorare-card border border-sorare-border p-8 rounded-2xl shadow-2xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sorare-accent to-sorare-secondary"></div>
                <img src="/logo.png" alt="Sorare Sniper" className="w-16 h-16 mx-auto mb-4 rounded-xl shadow-lg shadow-sorare-accent/20" />
                <h2 className="text-3xl font-black text-white mb-2 text-center tracking-tight">
                    Sorare <span className="text-transparent bg-clip-text bg-gradient-to-r from-sorare-accent to-sorare-secondary">Sniper</span>
                </h2>
                <p className="text-sorare-muted text-center mb-8">
                    {isLogin ? 'Sign in to access your alerts' : 'Create an account to start sniping'}
                </p>

                {displayError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                        {displayError}
                        {authError && (
                            <button onClick={clearAuthError} className="ml-2 text-red-300 hover:text-white underline text-xs">dismiss</button>
                        )}
                    </div>
                )}

                {/* Primary: OAuth "Login with Sorare" button */}
                <button
                    onClick={handleSorareOAuth}
                    className="w-full bg-gradient-to-r from-sorare-accent to-sorare-secondary hover:opacity-90 transform hover:-translate-y-0.5 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-sorare-accent/20 flex items-center justify-center gap-3 text-lg mb-2"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6C8.7 6 6 8.7 6 12s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10.5c-2.5 0-4.5-2-4.5-4.5S9.5 7.5 12 7.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5z" fill="currentColor"/>
                        <path d="M12 9.5L10.5 12H13.5L12 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Login with Sorare
                </button>

                <p className="text-center text-xs text-gray-500 mb-6">
                    You'll be redirected to <strong className="text-gray-400">sorare.com</strong> to authorize this app.
                </p>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-gray-800"></div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-gray-800"></div>
                </div>

                {/* Secondary: Local email/password login */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-2 text-sm font-medium">Email</label>
                        <input
                            type="email"
                            className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2 text-sm font-medium">Password</label>
                        <input
                            type="password"
                            className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-sorare-border hover:border-sorare-accent/50 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 rounded-full border-t-2 border-white animate-spin"></span>
                                {isLogin ? 'Signing in...' : 'Creating account...'}
                            </span>
                        ) : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sorare-muted hover:text-white transition-colors text-sm"
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
