export type TimeRange = '7D' | '30D';
export type Channel = 'News' | 'Social' | 'Video';

export interface Evidence {
    id: string;
    title: string;
    publisher: string;
    date: string;
    snippet: string;
    url: string;
}

export interface Trend {
    id: string;
    name: string;
    velocity: number; // Percentage growth
    volume: number; // Raw count
    sentiment: number; // -1 to 1 (Net sentiment)
    confidence: number; // 0 to 1
    history: number[]; // For sparkline
    summary: string;
    drivers: string[];
    evidence: Evidence[];
}

export interface TrendState {
    status: 'idle' | 'loading' | 'success' | 'error' | 'empty';
    data: Trend[];
    lastUpdated?: Date;
}
