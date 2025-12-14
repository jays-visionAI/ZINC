// Strategy War Room Logic

// Mock Data
const INITIAL_DOS = [
    "Emphasize sustainability and eco-friendly packaging",
    "Highlight vegan ingredients clearly",
    "Use inclusive language"
];

const INITIAL_DONTS = [
    "Mention competitors directly by name",
    "Make unverified medical claims (FDA compliance)",
    "Use aggressive sales tactics (FOMO)"
];

const RADAR_DATA = {
    labels: ['Witty', 'Formal', 'Empathetic', 'Technical', 'Bold'],
    values: [70, 30, 85, 40, 60] // Out of 100
};

// DOM Refs
const dom = {
    radarContainer: document.getElementById('radar-chart-container'),
    dosContainer: document.getElementById('dos-container'),
    dontsContainer: document.getElementById('donts-container')
};

// -- Functions --

function init() {
    drawRadarChart();
    renderTags(dom.dosContainer, INITIAL_DOS, 'emerald');
    renderTags(dom.dontsContainer, INITIAL_DONTS, 'red');
}

function renderTags(container, tags, color) {
    container.innerHTML = '';
    tags.forEach(tag => {
        const el = document.createElement('div');
        el.className = `group flex justify-between items-center p-2 rounded border border-${color}-500/10 bg-${color}-500/5 hover:bg-${color}-500/10 transition-colors cursor-default`;
        el.innerHTML = `
            <span class="text-xs text-${color}-200/80">${tag}</span>
            <button class="opacity-0 group-hover:opacity-100 text-${color}-400 hover:text-${color}-300 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 12"/></svg>
            </button>
        `;
        container.appendChild(el);
    });
}

function drawRadarChart() {
    const size = 200; // coordinate space size
    const center = size / 2;
    const radius = 80;
    const sides = 5;
    const angleStep = (Math.PI * 2) / sides;

    // Helper to get coordinates
    const getPoint = (value, index) => {
        // -PI/2 to start at top
        const angle = (index * angleStep) - (Math.PI / 2);
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Generate Points for Data
    let pointsString = "";
    RADAR_DATA.values.forEach((val, i) => {
        const p = getPoint(val, i);
        pointsString += `${p.x},${p.y} `;
    });

    // Generate Background Grid (Web)
    let gridSvg = "";
    [0.2, 0.4, 0.6, 0.8, 1].forEach(scale => {
        let gridPoints = "";
        for(let i=0; i<sides; i++) {
            const p = getPoint(100 * scale, i);
            gridPoints += `${p.x},${p.y} `;
        }
        gridSvg += `<polygon points="${gridPoints}" fill="none" stroke="#334155" stroke-width="1" opacity="0.5" />`;
    });

    // Axis Lines
    let axisSvg = "";
    for(let i=0; i<sides; i++) {
        const p = getPoint(100, i);
        axisSvg += `<line x1="${center}" y1="${center}" x2="${p.x}" y2="${p.y}" stroke="#334155" stroke-width="1" />`;
        
        // Labels
        const labelP = getPoint(115, i); // Push label out a bit
        axisSvg += `<text x="${labelP.x}" y="${labelP.y}" fill="#94a3b8" font-size="10" text-anchor="middle" alignment-baseline="middle">${RADAR_DATA.labels[i]}</text>`;
    }

    const svgContent = `
        <svg viewBox="0 0 ${size} ${size}" class="w-full h-full">
            ${gridSvg}
            ${axisSvg}
            <polygon points="${pointsString}" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" stroke-width="2" />
            ${RADAR_DATA.values.map((val, i) => {
                const p = getPoint(val, i);
                return `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#8b5cf6" />`;
            }).join('')}
        </svg>
    `;

    dom.radarContainer.innerHTML = svgContent;
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);