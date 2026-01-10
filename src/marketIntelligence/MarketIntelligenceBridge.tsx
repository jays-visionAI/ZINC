import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MarketTrendsSection } from './components/MarketTrendsSection';

// State container to allow external updates
const MarketIntelligenceWrapper: React.FC = () => {
    const [config, setConfig] = useState<{ projectId?: string; keywords: string[]; data: any[] }>({
        keywords: [],
        data: []
    });

    // Handle updates from Vanilla JS
    useEffect(() => {
        (window as any).refreshMarketIntelligence = (projectId: string, keywords: string[], data: any[] = []) => {
            setConfig({ projectId, keywords, data });
        };
    }, []);

    return (
        <div className="dark">
            <MarketTrendsSection projectId={config.projectId} keywords={config.keywords} data={config.data} />
        </div>
    );
};

export function mountMarketIntelligence(containerId: string, initialKeywords: string[] = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <MarketIntelligenceWrapper />
        </React.StrictMode>
    );

    // If keywords provided immediately
    setTimeout(() => {
        if ((window as any).refreshMarketIntelligence && initialKeywords.length > 0) {
            (window as any).refreshMarketIntelligence(null, initialKeywords);
        }
    }, 100);

    return root;
}

(window as any).mountMarketIntelligence = mountMarketIntelligence;
