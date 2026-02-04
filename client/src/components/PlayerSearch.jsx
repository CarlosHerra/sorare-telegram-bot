import React, { useState, useEffect, useRef } from 'react';

const PlayerSearch = ({ onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.length >= 3) {
                setLoading(true);
                try {
                    const res = await fetch(`/api/players/search?query=${query}`);
                    const data = await res.json();
                    setResults(data);
                    setIsOpen(true);
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500); // Debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (player) => {
        setQuery(player.displayName); // Assuming 'displayName' is the standard name field
        onSelect(player);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <label className="block text-sm mb-1 text-sorare-text font-medium">Search Player</label>
            <div className="relative">
                <input
                    type="text"
                    className="w-full p-3 pl-4 rounded-xl bg-sorare-card border border-sorare-border focus:border-sorare-accent focus:ring-1 focus:ring-sorare-accent focus:outline-none transition-all text-white placeholder-sorare-muted"
                    placeholder="e.g. Kylian Mbappé..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {loading && (
                    <div className="absolute right-3 top-3.5">
                        <div className="animate-spin h-5 w-5 border-2 border-sorare-accent rounded-full border-t-transparent"></div>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <ul className="absolute z-10 w-full mt-2 bg-sorare-card border border-sorare-border rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-fade-in">
                    {results.map((player) => (
                        <li
                            key={player.slug}
                            onClick={() => handleSelect(player)}
                            className="p-3 hover:bg-sorare-cardHover cursor-pointer flex items-center gap-3 transition-colors border-b border-sorare-border last:border-0"
                        >
                            {player.pictureUrl && (
                                <img src={player.pictureUrl} alt={player.displayName} className="w-8 h-8 rounded-full object-cover bg-gray-800" />
                            )}
                            <div>
                                <p className="font-semibold text-white">{player.displayName}</p>
                                <p className="text-xs text-sorare-muted">{player.slug}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {isOpen && results.length === 0 && !loading && query.length >= 3 && (
                <div className="absolute z-10 w-full mt-2 bg-sorare-card border border-sorare-border rounded-xl p-4 text-center text-sorare-muted shadow-xl">
                    No players found.
                </div>
            )}
        </div>
    );
};

export default PlayerSearch;
