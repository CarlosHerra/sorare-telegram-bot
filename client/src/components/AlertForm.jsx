import React, { useState, useEffect } from 'react';
import PlayerSearch from './PlayerSearch';

export default function AlertForm({ onAlertCreated }) {
    const [formData, setFormData] = useState({
        player: null,
        rarity: 'limited',
        priceThreshold: '',
        currency: 'EUR',
        season: '',
        telegramChatId: localStorage.getItem('sorare_telegram_chat_id') || ''
    });

    const [formKey, setFormKey] = useState(0);
    const [connectingTelegram, setConnectingTelegram] = useState(false);
    const [connectionCode, setConnectionCode] = useState('');
    const [botUsername, setBotUsername] = useState('');
    const [pollInterval, setPollInterval] = useState(null);

    useEffect(() => {
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [pollInterval]);

    // Update localStorage when telegramChatId changes
    useEffect(() => {
        if (formData.telegramChatId) {
            localStorage.setItem('sorare_telegram_chat_id', formData.telegramChatId);
        }
    }, [formData.telegramChatId]);

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
                    setFormData(prev => ({ ...prev, telegramChatId: data.chatId.toString() }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.player) {
            alert('Please select a player');
            return;
        }

        try {
            const payload = {
                ...formData,
                playerSlug: formData.player.slug // Extract slug from selected player object
            };
            // Remove the full player object from payload
            delete payload.player;

            const response = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                if (onAlertCreated) onAlertCreated();
                setFormData({
                    player: null,
                    rarity: 'limited',
                    priceThreshold: '',
                    currency: 'EUR',
                    season: '',
                    telegramChatId: formData.telegramChatId // Keep the chat ID
                });
                // Let's use a key hack for now to reset PlayerSearch.
                setFormKey(prev => prev + 1);

                alert('Alert Created Successfully! 🚀');
            } else {
                alert('Failed to create alert');
            }
        } catch (error) {
            console.error('Error creating alert:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-sorare-card border border-sorare-border p-8 rounded-2xl shadow-2xl mb-12 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-sorare-accent to-sorare-secondary">
                Create New Price Alert
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-gray-400 mb-2 font-medium">Player Name</label>
                    <PlayerSearch
                        key={formKey}
                        onSelect={(player) => setFormData({ ...formData, player })}
                    />
                </div>

                <div>
                    <label className="block text-gray-400 mb-2 font-medium">Rarity</label>
                    <select
                        value={formData.rarity}
                        onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                        className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all"
                    >
                        <option value="limited">Limited</option>
                        <option value="rare">Rare</option>
                        <option value="super_rare">Super Rare</option>
                        <option value="unique">Unique</option>
                    </select>
                </div>

                <div>
                    <label className="block text-gray-400 mb-2 font-medium">Currency</label>
                    <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all"
                    >
                        <option value="EUR">EUR (€)</option>
                        <option value="ETH">ETH (Ξ)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-gray-400 mb-2 font-medium">Price Threshold ({formData.currency})</label>
                    <input
                        type="number"
                        step="0.0001"
                        value={formData.priceThreshold}
                        onChange={(e) => setFormData({ ...formData, priceThreshold: e.target.value })}
                        className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all"
                        placeholder={formData.currency === 'ETH' ? "0.01" : "50"}
                        required
                    />
                </div>

                <div>
                    <label className="block text-gray-400 mb-2 font-medium">Season (Optional)</label>
                    <input
                        type="number"
                        min="2018"
                        max="2030"
                        className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all"
                        placeholder="e.g. 2023"
                        value={formData.season || ''}
                        onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    />
                </div>

                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-gray-400 font-medium">Telegram Chat ID</label>
                        {!connectingTelegram && !formData.telegramChatId && (
                            <button
                                type="button"
                                onClick={handleConnectTelegram}
                                className="text-xs font-bold text-sorare-accent hover:text-sorare-secondary transition-colors flex items-center gap-1"
                            >
                                <span className="text-lg">⊕</span> GET AUTOMATICALLY
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
                                    Alternatively, send <code className="bg-gray-800 px-1 rounded text-sorare-accent font-bold">{connectionCode}</code> to the bot.
                                </p>
                                <div className="mt-2 text-[10px] text-sorare-accent uppercase tracking-widest font-bold">
                                    Waiting for message...
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                className={`w-full bg-sorare-dark border ${formData.telegramChatId ? 'border-green-500/50' : 'border-sorare-border'} rounded-lg p-3 text-white focus:ring-2 focus:ring-sorare-accent focus:border-transparent transition-all`}
                                placeholder="12345678"
                                value={formData.telegramChatId}
                                onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                                required
                            />
                            {formData.telegramChatId && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xs font-bold flex items-center gap-1">
                                    ✓ LINKED
                                </span>
                            )}
                        </div>
                    )}

                    <p className="text-xs text-sorare-muted mt-2">
                        {formData.telegramChatId ? "Successfully linked. You'll receive alerts here." : "* Start a chat with your bot first to allow messages."}
                    </p>
                </div>
            </div>

            <button
                type="submit"
                className="mt-8 w-full bg-gradient-to-r from-sorare-accent to-sorare-secondary hover:opacity-90 transform hover:-translate-y-0.5 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-sorare-accent/20"
            >
                Start Tracking
            </button>
        </form>
    );
}
