import React, { useState, useEffect } from 'react';
import AlertForm from './components/AlertForm';
import AlertList from './components/AlertList';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { apiFetch } from './api/apiClient';

function App() {
    const { token, user, loading, logout, fetchUser } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingAlert, setEditingAlert] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

    // Telegram connect states
    const [connectingTelegram, setConnectingTelegram] = useState(false);
    const [connectionCode, setConnectionCode] = useState('');
    const [botUsername, setBotUsername] = useState('');
    const [pollInterval, setPollInterval] = useState(null);
    const [telegramChatId, setTelegramChatId] = useState('');

    useEffect(() => {
        if (user && user.telegramChatId) {
            setTelegramChatId(user.telegramChatId);
        }
    }, [user]);

    useEffect(() => {
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [pollInterval]);

    if (loading) {
        return <div className="min-h-screen bg-sorare-dark flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-sorare-accent animate-spin"></div></div>;
    }

    if (!token) {
        return <Login />;
    }

    const handleAlertCreated = () => {
        setRefreshTrigger(prev => prev + 1);
        setEditingAlert(null);
    };

    const handleEdit = (alert) => {
        setEditingAlert(alert);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingAlert(null);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/auth/me', {
                method: 'PUT',
                body: JSON.stringify({ telegramChatId })
            });
            await fetchUser();
            setShowProfile(false);
        } catch (error) {
            alert('Failed to update profile: ' + error.message);
        }
    };

    const handleConnectTelegram = async () => {
        try {
            setConnectingTelegram(true);

            // Get Bot Username
            const botRes = await fetch('/api/telegram/bot-info');
            const botData = await botRes.json();
            setBotUsername(botData.username);

            // Create Code
            const codeRes = await fetch('/api/telegram/create-code', { method: 'POST' });
            const codeData = await codeRes.json();
            setConnectionCode(codeData.code);

            // Start Polling
            const interval = setInterval(async () => {
                const res = await fetch(`/api/telegram/check-code/${codeData.code}`);
                const data = await res.json();
                if (data.chatId) {
                    setTelegramChatId(data.chatId.toString());
                    setConnectingTelegram(false);
                    clearInterval(interval);
                    setPollInterval(null);
                }
            }, 2000);
            setPollInterval(interval);

        } catch (error) {
            console.error('Error connecting Telegram:', error);
            setConnectingTelegram(false);
        }
    };

    return (
        <div className="min-h-screen bg-sorare-dark text-sorare-text p-6 md:p-12 font-sans selection:bg-sorare-accent selection:text-white">
            <header className="max-w-4xl mx-auto mb-16 relative">
                <div className="absolute top-0 right-0 flex items-center gap-4">
                    <button
                        onClick={() => setShowProfile(true)}
                        className="text-sm border border-sorare-border px-4 py-2 rounded-lg hover:border-sorare-accent hover:text-sorare-accent transition-all flex items-center gap-2"
                    >
                        {user?.telegramChatId ? <span className="text-green-500">✓ Linked</span> : <span className="text-yellow-500">Profile Settings</span>}
                    </button>
                    <button
                        onClick={logout}
                        className="text-sm bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all font-bold"
                    >
                        Sign Out
                    </button>
                </div>
                <div className="text-center pt-8 animate-fade-in">
                    <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
                        Sorare <span className="text-transparent bg-clip-text bg-gradient-to-r from-sorare-accent to-sorare-secondary">Sniper</span>
                    </h1>
                    <p className="text-sorare-muted text-xl max-w-xl mx-auto leading-relaxed">
                        Welcome {user?.email}! Automate your market strategy. Get instant alerts via Telegram.
                    </p>
                </div>
            </header>

            {!user?.telegramChatId && !showProfile && (
                <div className="max-w-4xl mx-auto mb-8 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <p className="text-yellow-400 mb-2 font-medium">Wait! You haven't linked your Telegram account yet.</p>
                    <button
                        onClick={() => setShowProfile(true)}
                        className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-400 transition-colors"
                    >
                        Link Telegram Account Now
                    </button>
                </div>
            )}

            {showProfile && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-sorare-card border border-sorare-border max-w-md w-full rounded-2xl p-8 relative">
                        <button
                            onClick={() => setShowProfile(false)}
                            className="absolute top-4 right-4 text-sorare-muted hover:text-white"
                        >✕</button>
                        <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div>
                                <label className="block text-gray-400 mb-2 font-medium">Email</label>
                                <input type="text" disabled value={user?.email || ''} className="w-full bg-sorare-dark/50 border border-sorare-border rounded-lg p-3 text-gray-500 cursor-not-allowed" />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-gray-400 font-medium">Telegram Chat ID</label>
                                    {!connectingTelegram && !telegramChatId && (
                                        <button
                                            type="button"
                                            onClick={handleConnectTelegram}
                                            className="text-xs font-bold text-sorare-accent hover:text-sorare-secondary transition-colors"
                                        >
                                            ⊕ GET AUTOMATICALLY
                                        </button>
                                    )}
                                </div>
                                {connectingTelegram ? (
                                    <div className="bg-sorare-dark/50 border border-sorare-accent/30 rounded-lg p-4 animate-pulse">
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <p className="text-sm text-white font-medium">1. Open Telegram</p>
                                            <a
                                                href={`https://t.me/${botUsername}?start=${connectionCode}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-sorare-accent text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-sorare-secondary transition-all"
                                            >
                                                SEND MESSAGE TO @{botUsername}
                                            </a>
                                            <p className="text-xs text-sorare-muted">
                                                Or send <code className="bg-gray-800 px-1 rounded text-sorare-accent">{connectionCode}</code> to bot.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all"
                                        placeholder="12345678"
                                        value={telegramChatId}
                                        onChange={(e) => setTelegramChatId(e.target.value)}
                                        required
                                    />
                                )}
                                <p className="text-xs text-sorare-muted mt-2">
                                    All your active alerts will be sent to this Telegram ID.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-sorare-accent hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all"
                            >
                                Save Profile
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <main className="w-full mx-auto space-y-8">
                <div className="max-w-5xl mx-auto">
                    <AlertForm
                        onAlertCreated={handleAlertCreated}
                        editingAlert={editingAlert}
                        onCancelEdit={handleCancelEdit}
                    />
                </div>
                <div className="max-w-screen-2xl mx-auto">
                    <AlertList
                        refreshTrigger={refreshTrigger}
                        onEdit={handleEdit}
                    />
                </div>
            </main>

            <footer className="max-w-4xl mx-auto mt-20 text-center text-sorare-muted text-sm pb-10">
                <p>© 2026 Sorare Sniper. Not affiliated with Sorare SAS.</p>
            </footer>
        </div>
    );
}

export default App;
