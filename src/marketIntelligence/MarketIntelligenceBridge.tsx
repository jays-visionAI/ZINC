import React from 'react';
import { createRoot } from 'react-dom/client';
import { MarketTrendsSection } from './components/MarketTrendsSection';

/**
 * Bridge function to mount the React Market Intelligence component 
 * into a non-React (Vanilla JS) application.
 */
export function mountMarketIntelligence(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[MarketIntelligence] Container #${containerId} not found.`);
        return;
    }

    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <div className="dark">
                <MarketTrendsSection />
            </div>
        </React.StrictMode>
    );

    return root;
}

// Auto-expose to window for easy access from marketPulse.js
(window as any).mountMarketIntelligence = mountMarketIntelligence;
