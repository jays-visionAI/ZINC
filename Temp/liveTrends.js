
// Live Trends Logic

// Mock Data
const TREND_DATA = [
    { id: 1, keyword: "#CleanBeauty", growth: 340, volume: 12500, sentiment: 'positive', data: [45, 60, 75, 80, 110, 140, 180, 200, 250, 300, 320, 340] },
    { id: 2, keyword: "#VeganSkincare", growth: 120, volume: 8400, sentiment: 'positive', data: [30, 35, 40, 45, 50, 55, 60, 80, 90, 100, 110, 120] },
    { id: 3, keyword: "@CompetitorA", growth: 85, volume: 5200, sentiment: 'neutral', data: [20, 20, 25, 30, 40, 60, 80, 85, 80, 75, 80, 85] },
    { id: 4, keyword: "#ESG_Beauty", growth: 45, volume: 3100, sentiment: 'positive', data: [10, 12, 15, 18, 20, 25, 30, 35, 40, 42, 44, 45] },
    { id: 5, keyword: "#NaturalIngredients", growth: -12, volume: 9000, sentiment: 'negative', data: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 48] },
    { id: 6, keyword: "#GlassSkin", growth: 25, volume: 6000, sentiment: 'positive', data: [40, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68] },
];

let selectedId = 1;

// DOM Refs
const dom = {
    leaderboard: document.getElementById('leaderboard'),
    detailTitle: document.getElementById('detail-title'),
    detailChart: document.getElementById('detail-chart'),
    heatmapGrid: document.getElementById('heatmap-grid'),
    aiRecs: document.getElementById('ai-recommendations')
};

// Functions
function init() {
    renderLeaderboard();
    renderMainChart(selectedId);
    renderHeatmap();
}

function renderLeaderboard() {
    if(!dom.leaderboard) return;
    dom.leaderboard.innerHTML = '';

    TREND_DATA.forEach(item => {
        const el = document.createElement('div');
        const isSelected = item.id === selectedId;
        
        el.className = `p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
            isSelected 
            ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
        }`;
        
        el.onclick = () => {
            selectedId = item.id;
            renderLeaderboard(); // Re-render to update active state
            renderMainChart(selectedId);
        };

        const growthColor = item.growth > 0 ? 'text-orange-400' : 'text-slate-500';
        const growthIcon = item.growth > 0 ? '🔺' : '🔻';

        el.innerHTML = `
            <div>
                <div class="font-bold text-slate-200 text-sm">${item.keyword}</div>
                <div class="text-[10px] text-slate-500 mt-0.5">${(item.volume / 1000).toFixed(1)}k mentions</div>
            </div>
            <div class="text-right">
                <div class="font-bold ${growthColor} text-sm">${growthIcon} ${Math.abs(item.growth)}%</div>
                <div class="w-16 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div class="h-full bg-orange-500" style="width: ${Math.min(Math.abs(item.growth), 100)}%"></div>
                </div>
            </div>
        `;
        dom.leaderboard.appendChild(el);
    });
}

function renderMainChart(id) {
    if(!dom.detailChart || !dom.detailTitle) return;
    
    const item = TREND_DATA.find(d => d.id === id);
    dom.detailTitle.innerText = item.keyword;

    const data = item.data;
    const width = dom.detailChart.clientWidth;
    const height = 300; // Fixed height for chart area
    const padding = 20;

    const maxVal = Math.max(...data) * 1.1;
    const xStep = (width - padding * 2) / (data.length - 1);

    // Generate Points
    const points = data.map((val, i) => {
        return {
            x: padding + i * xStep,
            y: height - padding - (val / maxVal) * (height - padding * 2)
        };
    });

    // Create Path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p1.x - (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    
    // Area Fill
    const fillD = `${pathD} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`;

    const svg = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="fireGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#f97316" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
                </linearGradient>
            </defs>
            
            <path d="${fillD}" fill="url(#fireGradient)" />
            <path d="${pathD}" fill="none" stroke="#f97316" stroke-width="3" />
            
            ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#0f172a" stroke="#f97316" stroke-width="2" />`).join('')}
        </svg>
    `;
    
    dom.detailChart.innerHTML = svg;
}

function renderHeatmap() {
    if(!dom.heatmapGrid) return;
    dom.heatmapGrid.innerHTML = '';

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Create Table Structure
    const table = document.createElement('div');
    table.className = "grid grid-cols-[auto_repeat(24,1fr)] gap-1";
    
    // Header Row (Hours)
    table.innerHTML += `<div class="text-[10px] text-slate-500 p-1"></div>`;
    for(let i=0; i<24; i+=2) {
        table.innerHTML += `<div class="col-span-2 text-[9px] text-slate-600 text-center">${i}h</div>`;
    }

    // Rows
    days.forEach(day => {
        let rowHtml = `<div class="text-[10px] font-bold text-slate-500 py-1 pr-2 text-right">${day}</div>`;
        for(let h=0; h<24; h++) {
            // Random sentiment generation for visual
            const rand = Math.random();
            let color = 'bg-slate-800'; // No data / Neutral
            if (rand > 0.7) color = 'bg-emerald-500'; // Pos
            else if (rand < 0.1) color = 'bg-red-500'; // Neg
            else if (rand > 0.4) color = 'bg-slate-600'; // Neu

            // Opacity for variation
            const opacity = Math.max(0.3, Math.random()).toFixed(2);
            
            rowHtml += `<div class="h-6 rounded-sm ${color} heatmap-cell transition-transform cursor-pointer" style="opacity: ${opacity}" title="${day} ${h}:00"></div>`;
        }
        table.innerHTML += rowHtml;
    });

    dom.heatmapGrid.appendChild(table);
}

document.addEventListener('DOMContentLoaded', init);
