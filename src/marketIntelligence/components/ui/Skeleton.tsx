import React from 'react';

export const SkeletonCard: React.FC = () => (
    <div className="bg-surface/50 border border-border rounded-xl p-4 h-[180px] animate-pulse relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <div className="h-5 w-1/2 bg-surfaceHighlight rounded"></div>
            <div className="h-5 w-16 bg-surfaceHighlight rounded-full"></div>
        </div>
        <div className="h-8 w-24 bg-surfaceHighlight rounded mb-4"></div>
        <div className="h-2 w-full bg-surfaceHighlight rounded mb-6"></div>
        <div className="flex justify-between items-end mt-auto">
            <div className="h-4 w-16 bg-surfaceHighlight rounded"></div>
            <div className="h-8 w-24 bg-surfaceHighlight rounded"></div>
        </div>
    </div>
);

export const SkeletonMap: React.FC = () => (
    <div className="w-full h-[300px] bg-surface/30 border border-border rounded-xl animate-pulse flex items-center justify-center">
        <div className="text-muted/50 text-sm">Loading Visualization...</div>
    </div>
);
