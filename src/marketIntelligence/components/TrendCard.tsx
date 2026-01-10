import React from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Trend } from '../types';
import { Badge } from './ui/Badge';

interface TrendCardProps {
    trend: Trend;
    onClick: (trend: Trend) => void;
    isActive: boolean;
}

export const TrendCard: React.FC<TrendCardProps> = ({ trend, onClick, isActive }) => {
    const data = trend.history.map((val, i) => ({ i, val }));

    const isPositive = trend.velocity >= 0;
    const strokeColor = isPositive ? '#06b6d4' : '#f43f5e';

    return (
        <div
            onClick={() => onClick(trend)}
            className={`
        group relative p-5 rounded-xl border cursor-pointer transition-all duration-300
        flex flex-col
        ${isActive
                    ? 'bg-slate-800 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                }
      `}
        >
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1 pr-2 group-hover:text-cyan-400 transition-colors">
                    {trend.name}
                </h3>
                <Badge value={trend.velocity} />
            </div>

            <div className="mb-5">
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-white tracking-tight">
                        {(trend.volume / 1000).toFixed(1)}k
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Volume</span>
                </div>
            </div>

            <div className="mb-auto">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">
                    <span>Net Sentiment</span>
                    <span className={trend.sentiment > 0 ? 'text-cyan-400' : 'text-rose-400'}>
                        {trend.sentiment > 0 ? '+' : ''}{trend.sentiment}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out shadow-lg"
                        style={{
                            width: `${((trend.sentiment + 1) / 2) * 100}%`,
                            background: trend.sentiment > 0
                                ? 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)'
                                : 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)'
                        }}
                    />
                </div>
            </div>

            <div className="flex justify-between items-end h-12 mt-4 pt-4 border-t border-white/5">
                <div className="flex flex-col justify-end pb-1">
                    <Badge value={trend.confidence} type="confidence" className="opacity-80 group-hover:opacity-100" />
                </div>

                <div className="w-24 h-full opacity-80 group-hover:opacity-100 transition-opacity filter drop-shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`gradient-${trend.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke={strokeColor}
                                strokeWidth={2}
                                fill={`url(#gradient-${trend.id})`}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
