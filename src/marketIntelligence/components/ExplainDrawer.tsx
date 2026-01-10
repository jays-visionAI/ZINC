import React from 'react';
import { Trend } from '../types';
import { X, ExternalLink, Bookmark, FileText, AlertTriangle } from 'lucide-react';

interface ExplainDrawerProps {
    trend: Trend | null;
    onClose: () => void;
    isOpen: boolean;
}

export const ExplainDrawer: React.FC<ExplainDrawerProps> = ({ trend, onClose, isOpen }) => {
    if (!trend) return null;

    const lowConfidence = trend.evidence.length < 3;

    return (
        <div
            className={`
        fixed inset-x-0 bottom-0 z-50 
        md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-96
        bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}
      `}
        >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/30 backdrop-blur-sm">
                <div>
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">Explain Trend</div>
                    <h2 className="text-lg font-semibold text-white leading-tight">{trend.name}</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="p-5 overflow-y-auto h-[calc(100%-130px)] space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                <section>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Why it's rising</h3>
                    <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                        {trend.summary}
                    </p>
                </section>

                <section>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Drivers</h3>
                    <ul className="space-y-2">
                        {trend.drivers.map((driver, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                                {driver}
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
                        <span>Evidence</span>
                        <span className="text-slate-600">{trend.evidence.length} sources</span>
                    </h3>

                    {lowConfidence && (
                        <div className="mb-3 p-2 bg-amber-900/20 border border-amber-500/30 rounded flex items-center gap-2 text-xs text-amber-200">
                            <AlertTriangle size={14} />
                            <span>Low evidence count. Confidence reduced.</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        {trend.evidence.map((ev) => (
                            <a
                                key={ev.id}
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group p-3 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs text-cyan-500 font-medium">{ev.publisher}</span>
                                    <ExternalLink size={12} className="text-slate-600 group-hover:text-slate-400" />
                                </div>
                                <h4 className="text-sm font-medium text-slate-200 group-hover:text-white mb-1 line-clamp-1">{ev.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2">{ev.snippet}</p>
                                <div className="mt-2 text-[10px] text-slate-600">{ev.date}</div>
                            </a>
                        ))}
                    </div>
                </section>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-sm font-medium text-slate-400 transition-colors">
                    <Bookmark size={16} />
                    Save
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all">
                    <FileText size={16} />
                    Full Report
                </button>
            </div>
        </div>
    );
};
