import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from 'recharts';
import { Trend } from '../types';

interface TrendMapProps {
    trends: Trend[];
    onSelect: (trend: Trend) => void;
    selectedId?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50 ring-1 ring-white/10">
                <p className="font-bold text-white mb-1">{data.name}</p>
                <p className="text-slate-400">Vol: <span className="text-white">{(data.volume / 1000).toFixed(1)}k</span></p>
                <p className="text-slate-400">Vel: <span className="text-white">{data.velocity}%</span></p>
            </div>
        );
    }
    return null;
};

export const TrendMap: React.FC<TrendMapProps> = ({ trends, onSelect, selectedId }) => {

    return (
        <div className="h-[320px] w-full bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            <h4 className="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Trend Matrix
            </h4>

            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <ReferenceLine x={0} stroke="#1e293b" strokeDasharray="4 4" />
                    <ReferenceLine y={50000} stroke="#1e293b" strokeDasharray="4 4" />

                    <XAxis
                        type="number"
                        dataKey="velocity"
                        name="Velocity"
                        unit="%"
                        stroke="#475569"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                    >
                        <Label value="Velocity" offset={0} position="insideBottom" style={{ fill: '#475569', fontSize: '10px', textTransform: 'uppercase' }} />
                    </XAxis>
                    <YAxis
                        type="number"
                        dataKey="volume"
                        name="Volume"
                        stroke="#475569"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(value) => `${value / 1000}k`}
                        tickLine={false}
                        axisLine={false}
                    >
                        <Label value="Volume" angle={-90} position="insideLeft" style={{ fill: '#475569', fontSize: '10px', textTransform: 'uppercase' }} />
                    </YAxis>
                    <ZAxis type="number" dataKey="volume" range={[60, 400]} name="Volume" />

                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} />

                    <Scatter data={trends} onClick={(node) => onSelect(node as unknown as Trend)}>
                        {trends.map((entry, index) => {
                            const color = entry.sentiment > 0.2 ? '#06b6d4' : entry.sentiment < -0.2 ? '#f43f5e' : '#8b5cf6';
                            const isSelected = selectedId === entry.id;

                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={color}
                                    fillOpacity={isSelected ? 1 : 0.7}
                                    stroke={isSelected ? '#fff' : color}
                                    strokeWidth={isSelected ? 2 : 0}
                                    className="transition-all duration-300 cursor-pointer hover:opacity-100 hover:filter hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                />
                            );
                        })}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            <div className="absolute top-8 right-8 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Dominant</div>
            <div className="absolute bottom-8 right-8 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Emerging</div>
            <div className="absolute bottom-8 left-12 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Niche</div>
            <div className="absolute top-8 left-12 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Saturated</div>
        </div>
    );
};
