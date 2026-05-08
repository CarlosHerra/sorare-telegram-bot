import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

function GalleryTracker() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [cards, setCards] = useState([]);
    const [globalConfigs, setGlobalConfigs] = useState([]);
    const [cardTrackers, setCardTrackers] = useState([]);
    const [error, setError] = useState(null);

    const rarities = ['limited', 'rare', 'super_rare', 'unique'];

    useEffect(() => {
        if (user?.sorareUsername) {
            fetchGalleryData();
        }
    }, [user]);

    const fetchGalleryData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [cardsRes, globalsRes, trackersRes] = await Promise.all([
                apiFetch('/gallery/cards'),
                apiFetch('/gallery/global-config'),
                apiFetch('/gallery/card-tracking')
            ]);
            setCards(cardsRes);
            setGlobalConfigs(globalsRes);
            setCardTrackers(trackersRes);
        } catch (err) {
            setError(err.message || 'Failed to load gallery tracking data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGlobal = async (rarity, thresholdValue, currency, enabled) => {
        try {
            await apiFetch('/gallery/global-config', {
                method: 'POST',
                body: JSON.stringify({ rarity, thresholdValue: parseFloat(thresholdValue), currency, enabled })
            });
            await fetchGalleryData(); // Refresh UI
        } catch (err) {
            alert('Failed to save global config: ' + err.message);
        }
    };

    const handleSaveCardTracker = async (playerSlug, rarity, thresholdValue, currency, enabled) => {
         try {
            await apiFetch('/gallery/card-tracking', {
                method: 'POST',
                body: JSON.stringify({ playerSlug, rarity, thresholdValue: parseFloat(thresholdValue), currency, enabled })
            });
            await fetchGalleryData(); // Refresh UI
        } catch (err) {
            alert('Failed to save card config: ' + err.message);
        }
    };

    if (!user?.sorareUsername) {
        return (
            <div className="bg-sorare-card border border-sorare-border rounded-xl p-8 text-center animate-fade-in shadow-xl">
                <div className="text-4xl mb-4">🖼️</div>
                <h2 className="text-2xl font-bold text-white mb-2">Setup Required</h2>
                <p className="text-sorare-muted mb-6">
                    Connect your Sorare Username in Profile Settings to use the Gallery Tracker.
                </p>
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg inline-block text-left text-sm max-w-lg">
                    <strong>How it works:</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>We fetch your Sorare gallery automatically.</li>
                        <li>Set global or player-specific target prices (e.g. 0.05 ETH).</li>
                        <li>When the market floor hits your target, get a Telegram alert.</li>
                        <li>List your card and take profit!</li>
                    </ul>
                </div>
            </div>
        );
    }

    if (loading) {
         return (
             <div className="bg-sorare-card border border-sorare-border rounded-xl p-12 text-center animate-pulse">
                <div className="w-8 h-8 rounded-full border-t-2 border-sorare-accent animate-spin mx-auto mb-4"></div>
                <p className="text-sorare-muted">Scanning gallery for {user.sorareUsername}...</p>
             </div>
         );
    }

    return (
        <div className="animate-fade-in space-y-8">
            <div className="bg-sorare-card border border-sorare-border rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">Global Target Thresholds</h2>
                <p className="text-sm text-sorare-muted mb-6">
                    Set a fixed floor price target for all cards of a given rarity in your gallery. 
                    If the market floor hits this price, you get an alert.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rarities.map(rarity => {
                        const config = globalConfigs.find(c => c.rarity.toLowerCase() === rarity) || { enabled: 0, thresholdValue: '', currency: 'ETH' };
                        const [val, setVal] = useState(config.thresholdValue || '');
                        
                        return (
                            <div key={rarity} className={`p-4 rounded-xl border ${config.enabled ? 'border-sorare-accent bg-sorare-card' : 'border-sorare-border bg-sorare-dark/50'} transition-all`}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="capitalize font-bold text-white ">{rarity.replace('_', ' ')}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.enabled ? true : false}
                                        onChange={(e) => handleSaveGlobal(rarity, val || 0, config.currency, e.target.checked)}
                                      />
                                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sorare-accent"></div>
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" step="0.0001"
                                        className="w-full bg-sorare-dark border border-sorare-border rounded-lg p-2 text-white focus:border-sorare-accent focus:ring-1 focus:ring-sorare-accent outline-none text-sm"
                                        placeholder="Target (ETH)"
                                        value={val}
                                        onChange={(e) => setVal(e.target.value)}
                                        onBlur={(e) => handleSaveGlobal(rarity, e.target.value, config.currency, config.enabled)}
                                        disabled={!config.enabled}
                                    />
                                    <span className="text-xs text-sorare-muted font-bold">ETH</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Your Gallery <span className="bg-sorare-dark text-sorare-muted text-xs px-2 py-1 rounded border border-sorare-border">{cards.length} Cards</span>
                </h2>
                
                {error && <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cards.map(card => {
                        const tracker = cardTrackers.find(c => c.playerSlug === card.playerSlug && c.rarity.toLowerCase() === card.rarity.toLowerCase()) || { enabled: 0, thresholdValue: '' };
                        const isGlobalEnabled = globalConfigs.some(g => g.rarity.toLowerCase() === card.rarity.toLowerCase() && g.enabled);
                        
                        return (
                            <div key={card.cardSlug} className={`bg-sorare-card border ${tracker.enabled ? 'border-sorare-secondary shadow-lg shadow-sorare-secondary/10' : 'border-sorare-border'} rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-sorare-accent group`}>
                                <div className="flex items-start gap-3">
                                    {card.playerPictureUrl ? (
                                        <img src={card.playerPictureUrl} alt={card.playerDisplayName} className="w-12 h-12 rounded-lg object-cover bg-sorare-dark" />
                                    ) : (
                                        <div className="w-12 h-12 bg-sorare-dark rounded-lg flex items-center justify-center text-sorare-muted font-bold border border-sorare-border">
                                            {card.playerDisplayName.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold truncate text-sm" title={card.playerDisplayName}>
                                            {card.playerDisplayName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded
                                                ${card.rarity.toLowerCase() === 'limited' ? 'bg-[#f5a623]/20 text-[#f5a623]' : ''}
                                                ${card.rarity.toLowerCase() === 'rare' ? 'bg-[#d0021b]/20 text-[#d0021b]' : ''}
                                                ${card.rarity.toLowerCase() === 'super_rare' ? 'bg-[#4a90e2]/20 text-[#4a90e2]' : ''}
                                                ${card.rarity.toLowerCase() === 'unique' ? 'bg-[#000000]/40 text-[#ffffff] border border-gray-600' : ''}
                                            `}>
                                                {card.rarity.replace('_', ' ')}
                                            </span>
                                            {card.seasonYear && <span className="text-[10px] text-sorare-muted bg-sorare-dark px-1.5 py-0.5 rounded">{card.seasonYear}</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-3 border-t border-sorare-dark mt-auto space-y-2 relative">
                                    {/* Override badge */}
                                    {tracker.enabled && <span className="absolute -top-3 -right-2 bg-sorare-secondary text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">CUSTOM</span>}
                                    {!tracker.enabled && isGlobalEnabled && <span className="absolute -top-3 -right-2 bg-gray-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">GLOBAL</span>}
                                    
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-sorare-muted font-medium">Custom Tracker</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={tracker.enabled ? true : false}
                                            onChange={(e) => handleSaveCardTracker(card.playerSlug, card.rarity, tracker.thresholdValue || 0, 'ETH', e.target.checked)}
                                          />
                                          <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sorare-secondary"></div>
                                        </label>
                                    </div>

                                    {tracker.enabled && (
                                        <div className="flex gap-2 animate-fade-in relative z-10">
                                            <input 
                                                type="number" step="0.0001"
                                                className="w-full bg-sorare-border/50 border border-sorare-border rounded p-1.5 text-white focus:border-sorare-secondary focus:ring-1 focus:ring-sorare-secondary outline-none text-xs"
                                                placeholder="Target (ETH)"
                                                defaultValue={tracker.thresholdValue}
                                                onBlur={(e) => handleSaveCardTracker(card.playerSlug, card.rarity, e.target.value, 'ETH', tracker.enabled)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                {cards.length === 0 && !loading && !error && (
                    <div className="text-center text-sorare-muted py-12 bg-sorare-dark/50 rounded-xl border border-sorare-border">
                        No cards found in your Sorare gallery.
                    </div>
                )}
            </div>
        </div>
    );
}

export default GalleryTracker;
