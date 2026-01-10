import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Layers, Activity } from 'lucide-react';
import { Trend, TrendState, TimeRange, Channel } from '../types';
import { MOCK_TRENDS } from '../constants';
import { TrendCard } from './TrendCard';
import { TrendMap } from './TrendMap';
import { ExplainDrawer } from './ExplainDrawer';
import { SkeletonCard, SkeletonMap } from './ui/Skeleton';

export const MarketTrendsSection: React.FC = () => {
    const [state, setState] = useState<TrendState>({ status: 'idle', data: [] });
    const [timeRange, setTimeRange] = useState<TimeRange>('7D');
    const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['News', 'Social']);
    const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);

    const toggleChannel = (c: Channel) => {
        setSelectedChannels(prev =>
            prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
        );
    };

    const loadData = (mockError = false) => {
        setState(prev => ({ ...prev, status: 'loading' }));

        setTimeout(() => {
            if (mockError) {
                setState({ status: 'error', data: [] });
            } else {
                setState({ status: 'success', data: MOCK_TRENDS, lastUpdated: new Date() });
            }
        }, 1200);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRefresh = () => {
        setSelectedTrendId(null);
        loadData();
    };

    const selectedTrend = state.data.find(t => t.id === selectedTrendId) || null;
    const isDrawerOpen = !!selectedTrendId;

    const renderContent = () => {
        if (state.status === 'loading') {
            return (
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                    <div className="col-span-12">
                        <SkeletonMap />
                    </div>
                </div>
            );
        }

        if (state.status === 'error') {
            return (
                <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                    <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                    <h3 className="text-lg font-medium text-white">Failed to load trends</h3>
                    <p className="text-slate-500 text-sm mb-4">Network connection interrupted.</p>
                    <button
                        onClick={() => loadData()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors border border-slate-700"
                    >
                        Retry Analysis
                    </button>
                </div>
            );
        }

        if (state.status === 'success' && state.data.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-[400px] bg-slate-900/20 rounded-xl">
                    <Layers className="w-10 h-10 text-slate-500 mb-3" />
                    <p className="text-slate-500">No trends match your filters.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-12 gap-6 pb-20 md:pb-0">
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
                    {state.data.map(trend => (
                        <TrendCard
                            key={trend.id}
                            trend={trend}
                            onClick={(t) => setSelectedTrendId(t.id === selectedTrendId ? null : t.id)}
                            isActive={selectedTrendId === trend.id}
                        />
                    ))}
                </div>

                <div className="col-span-12">
                    <TrendMap
                        trends={state.data}
                        onSelect={(t) => setSelectedTrendId(t.id)}
                        selectedId={selectedTrendId || undefined}
                    />
                </div>
            </div>
        );
    };

    return (
        <section className="relative w-full max-w-7xl mx-auto bg-slate-950 p-6 lg:p-8 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden min-h-[850px]">

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
                        <Activity className="text-cyan-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Market Intelligence <span className="text-slate-500 font-normal ml-2 text-lg">(Enterprise)</span></h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">AI Orchestrated Trends • Global Monitoring</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex">
                        {(['7D', '30D'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeRange === range
                                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/5'
                                        : 'text-slate-500 hover:text-white'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-8 bg-slate-800 hidden md:block"></div>

                    <div className="flex gap-2">
                        {(['News', 'Social', 'Video'] as Channel[]).map((channel) => (
                            <button
                                key={channel}
                                onClick={() => toggleChannel(channel)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedChannels.includes(channel)
                                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-500 hover:text-white'
                                    }`}
                            >
                                {channel}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-8 bg-slate-800 hidden md:block"></div>

                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold tracking-wide uppercase"
                        title="Refresh Analysis"
                    >
                        <RefreshCw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} />
                        {state.status === 'loading' ? 'Syncing...' : 'Refresh'}
                    </button>
                </div>
            </header>

            <div className={`transition-all duration-500 ease-in-out ${isDrawerOpen ? 'md:mr-[24rem]' : ''}`}>
                {renderContent()}
            </div>

            <ExplainDrawer
                trend={selectedTrend}
                isOpen={isDrawerOpen}
                onClose={() => setSelectedTrendId(null)}
            />

        </section>
    );
};
