import React, { useState } from 'react';
import AlertForm from './components/AlertForm';
import AlertList from './components/AlertList';

function App() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleAlertCreated = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="min-h-screen bg-sorare-dark text-sorare-text p-6 md:p-12 font-sans selection:bg-sorare-accent selection:text-white">
            <header className="max-w-4xl mx-auto mb-16 text-center animate-fade-in">
                <div className="inline-block p-1 rounded-full bg-gradient-to-r from-sorare-accent to-sorare-secondary mb-4">
                    <span className="block px-4 py-1 bg-sorare-dark rounded-full text-sm font-bold tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-sorare-accent to-sorare-secondary">
                        Beta v1.0
                    </span>
                </div>
                <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
                    Sorare <span className="text-transparent bg-clip-text bg-gradient-to-r from-sorare-accent to-sorare-secondary">Sniper</span>
                </h1>
                <p className="text-sorare-muted text-xl max-w-xl mx-auto leading-relaxed">
                    Automate your market strategy. Get instant alerts for underpriced cards via Telegram.
                </p>
            </header>

            <main className="max-w-4xl mx-auto space-y-8">
                <AlertForm onAlertCreated={handleAlertCreated} />
                <AlertList refreshTrigger={refreshTrigger} />
            </main>

            <footer className="max-w-4xl mx-auto mt-20 text-center text-sorare-muted text-sm pb-10">
                <p>© 2024 Sorare Sniper. Not affiliated with Sorare SAS.</p>
            </footer>
        </div>
    );
}

export default App;
