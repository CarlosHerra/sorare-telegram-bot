import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-sorare-dark flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-sorare-card border border-sorare-border p-8 rounded-2xl shadow-2xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sorare-accent to-sorare-secondary"></div>
                <h2 className="text-3xl font-black text-white mb-2 text-center tracking-tight">
                    Sorare <span className="text-transparent bg-clip-text bg-gradient-to-r from-sorare-accent to-sorare-secondary">Sniper</span>
                </h2>
                <p className="text-sorare-muted text-center mb-8">
                    {isLogin ? 'Sign in to access your alerts' : 'Create an account to start sniping'}
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

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
                        className="w-full bg-gradient-to-r from-sorare-accent to-sorare-secondary hover:opacity-90 transform hover:-translate-y-0.5 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-sorare-accent/20 mt-4"
                    >
                        {isLogin ? 'Sign In' : 'Create Account'}
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

                <div className="mt-8 border-t border-gray-800 pt-6">
                    <p className="text-center text-xs text-gray-500 mb-4">Or continue with</p>
                    <button 
                        disabled
                        className="w-full bg-white/5 border border-gray-700 text-gray-400 py-2 rounded-lg text-sm flex items-center justify-center gap-2 opacity-50 cursor-not-allowed cursor-pointer transition-all"
                        title="Google Login coming soon"
                    >
                        Google (Coming Soon)
                    </button>
                </div>
            </div>
        </div>
    );
}
