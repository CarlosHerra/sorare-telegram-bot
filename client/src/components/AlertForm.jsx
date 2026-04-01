import React, { useState, useEffect } from 'react';
import PlayerSearch from './PlayerSearch';
import { apiFetch } from '../api/apiClient';

export default function AlertForm({ onAlertCreated, editingAlert, onCancelEdit }) {
    const [formData, setFormData] = useState({
        player: null,
        rarity: 'limited',
        priceThreshold: '',
        currency: 'EUR',
        season: ''
    });

    const [formKey, setFormKey] = useState(0);

    // Populate form when editingAlert changes
    useEffect(() => {
        if (editingAlert) {
            setFormData({
                player: { slug: editingAlert.playerSlug, displayName: editingAlert.playerSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') },
                rarity: editingAlert.rarity,
                priceThreshold: editingAlert.priceThreshold.toString(),
                currency: editingAlert.currency,
                season: editingAlert.season || ''
            });
        } else {
            setFormData(prev => ({
                ...prev,
                player: null,
                priceThreshold: '',
                season: ''
            }));
            setFormKey(prev => prev + 1);
        }
    }, [editingAlert]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.player) {
            alert('Please select a player');
            return;
        }

        try {
            const payload = {
                ...formData,
                playerSlug: formData.player.slug 
            };
            delete payload.player;

            const url = editingAlert ? `/alerts/${editingAlert.id}` : '/alerts';
            const method = editingAlert ? 'PUT' : 'POST';

            await apiFetch(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (onAlertCreated) onAlertCreated();

            if (!editingAlert) {
                setFormData({
                    player: null,
                    rarity: 'limited',
                    priceThreshold: '',
                    currency: 'EUR',
                    season: ''
                });
                setFormKey(prev => prev + 1);
            }

            alert(editingAlert ? 'Alert Updated! 🚀' : 'Alert Created Successfully! 🚀');
        } catch (error) {
            console.error('Error processing alert:', error);
            alert(`Failed: ${error.message}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`bg-sorare-card border ${editingAlert ? 'border-sorare-accent shadow-sorare-accent/20 scale-102 transition-all duration-500' : 'border-sorare-border'} p-8 rounded-2xl shadow-2xl mb-12 animate-slide-up`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sorare-accent to-sorare-secondary">
                    {editingAlert ? 'Edit Price Alert' : 'Create New Price Alert'}
                </h2>
                {editingAlert && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="text-sorare-muted hover:text-white transition-colors text-sm font-bold flex items-center gap-1"
                    >
                        ✕ CANCEL EDIT
                    </button>
                )}
            </div>

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
            </div>

            <button
                type="submit"
                className="mt-8 w-full bg-gradient-to-r from-sorare-accent to-sorare-secondary hover:opacity-90 transform hover:-translate-y-0.5 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-sorare-accent/20"
            >
                {editingAlert ? 'Save Changes' : 'Start Tracking'}
            </button>
        </form>
    );
}
