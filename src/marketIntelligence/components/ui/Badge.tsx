import React from 'react';

interface BadgeProps {
    value: number;
    type?: 'velocity' | 'confidence';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ value, type = 'velocity', className = '' }) => {
    if (type === 'confidence') {
        const colorClass = value > 0.8
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : value > 0.5
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${colorClass} ${className} tracking-wide`}>
                CONF: {value.toFixed(2)}
            </span>
        );
    }

    const isPositive = value >= 0;
    const colorClass = isPositive
        ? 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20'
        : 'text-rose-400 bg-rose-950/30 border-rose-500/20';
    const icon = isPositive ? '▲' : '▼';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${colorClass} ${className} shadow-sm`}>
            <span className="text-[9px]">{icon}</span>
            {Math.abs(value)}%
        </span>
    );
};
