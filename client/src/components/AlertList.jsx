import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/apiClient';

const AlertList = ({ refreshTrigger, onEdit }) => {
    const [alerts, setAlerts] = useState([]);

    const fetchAlerts = async () => {
        try {
            const data = await apiFetch('/alerts');
            setAlerts(data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const deleteAlert = async (id) => {
        try {
            await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
            fetchAlerts();
        } catch (error) {
            console.error('Error deleting alert:', error);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, [refreshTrigger]);

    const getRarityColor = (rarity) => {
        switch (rarity) {
            case 'unique': return 'bg-gray-900 border-gray-700 text-white';
            case 'super_rare': return 'bg-blue-900/30 border-blue-500/30 text-blue-300';
            case 'rare': return 'bg-red-900/30 border-red-500/30 text-red-300';
            default: return 'bg-yellow-900/30 border-yellow-500/30 text-yellow-300';
        }
    }

    return (
        <div className="bg-sorare-card border border-sorare-border p-8 rounded-2xl shadow-xl animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-sorare-text flex items-center gap-2">
                <span className="bg-sorare-accent/20 p-2 rounded-lg text-sorare-accent">⚡</span>
                Active Parsers
            </h2>

            {alerts.length === 0 ? (
                <div className="text-center py-10 bg-sorare-dark/50 rounded-xl border border-sorare-border border-dashed">
                    <p className="text-sorare-muted text-lg">No active alerts running.</p>
                    <p className="text-sm text-sorare-muted/50 mt-1">Create one above to start sniping.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="group flex justify-between items-center bg-sorare-cardHover border border-sorare-border hover:border-sorare-accent/50 p-5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-sorare-accent/5">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-sorare-card to-sorare-dark border border-sorare-border font-bold text-sorare-muted">
                                    {alert.playerSlug.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-white group-hover:text-sorare-accent transition-colors">
                                        {alert.playerSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getRarityColor(alert.rarity)} uppercase tracking-wider`}>
                                            {alert.rarity}
                                        </span>
                                        {alert.season && (
                                            <span className="px-2 py-0.5 rounded text-xs font-bold border bg-gray-800 border-gray-600 text-gray-300">
                                                {alert.season}
                                            </span>
                                        )}
                                        <span className="text-sm text-sorare-muted ml-1">
                                            Below <span className="text-white font-mono font-bold">{alert.priceThreshold} {alert.currency}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={() => onEdit(alert)}
                                    className="p-2 text-sorare-accent hover:bg-sorare-accent/10 rounded-lg transition-all"
                                    title="Edit Alert"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => deleteAlert(alert.id)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Delete Alert"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AlertList;
