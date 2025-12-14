// Market Pulse Logic

// Mock Data
const CHART_DATA = [
    { day: 'Mon', val: 45 },
    { day: 'Tue', val: 52 },
    { day: 'Wed', val: 49 },
    { day: 'Thu', val: 85 },
    { day: 'Fri', val: 102 },
    { day: 'Sat', val: 95 },
    { day: 'Sun', val: 127 }
];

const KEYWORDS = [
    { text: "#CleanBeauty", size: "text-2xl", color: "text-emerald-400" },
    { text: "#VeganSkincare", size: "text-xl", color: "text-blue-400" },
    { text: "#GlowUp", size: "text-lg", color: "text-purple-400" },
    { text: "#Sustainable", size: "text-lg", color: "text-slate-300" },
    { text: "#FlashSale", size: "text-sm", color: "text-red-400" },
    { text: "#NewRoutine", size: "text-base", color: "text-slate-400" }
];

// DOM Refs
const dom = {
    chartContainer: document.getElementById('trend-chart'),
    cloudContainer: document.getElementById('cloud-container')
};

// -- Functions --

function init() {
    drawTrendChart();
    renderWordCloud();
}

function renderWordCloud() {
    if(!dom.cloudContainer) return;
    
    dom.cloudContainer.innerHTML = '';
    KEYWORDS.forEach(kw => {
        const span = document.createElement('span');
        span.className = `${kw.size} ${kw.color} font-bold opacity-80 hover:opacity-100 cursor-pointer transition-opacity`;
        span.innerText = kw.text;
        dom.cloudContainer.appendChild(span);
    });
}

function drawTrendChart() {
    if(!dom.chartContainer) return;

    const width = dom.chartContainer.clientWidth;
    const height = dom.chartContainer.clientHeight;
    const padding = 20;

    // Scale
    const maxVal = Math.max(...CHART_DATA.map(d => d.val)) * 1.2;
    const xStep = (width - padding * 2) / (CHART_DATA.length - 1);

    // Points
    const points = CHART_DATA.map((d, i) => {
        return {
            x: padding + i * xStep,
            y: height - padding - (d.val / maxVal) * (height - padding * 2),
            val: d.val,
            label: d.day
        };
    });

    // Create Path (Cubic Bezier for smoothness)
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        
        // Control points for bezier
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p1.x - (p1.x - p0.x) / 2;
        const cp2y = p1.y;

        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    // Fill Path (for gradient area)
    const fillPathD = `${pathD} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`;

    // Generate SVG
    const svg = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" overflow="visible">
        <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#6366f1" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
            </linearGradient>
        </defs>
        
        <!-- Grid Lines -->
        <line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="#334155" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${width-padding}" y2="${padding}" stroke="#334155" stroke-width="1" stroke-dasharray="4" opacity="0.3" />

        <!-- Area Fill -->
        <path d="${fillPathD}" fill="url(#chartGradient)" />

        <!-- Line -->
        <path d="${pathD}" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" />

        <!-- Points & Labels -->
        ${points.map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#0f172a" stroke="#6366f1" stroke-width="2" class="hover:r-6 transition-all" />
            <text x="${p.x}" y="${height-5}" fill="#94a3b8" font-size="10" text-anchor="middle">${p.label}</text>
            <text x="${p.x}" y="${p.y - 10}" fill="white" font-size="10" text-anchor="middle" font-weight="bold">${p.val}</text>
        `).join('')}
    </svg>
    `;

    dom.chartContainer.innerHTML = svg;
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);