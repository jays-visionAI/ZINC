/**
 * Brand Mind Map - D3.js Interactive Visualization
 * @author ZYNK Studio
 */

// --- Configuration ---
const CONFIG = {
    colors: {
        root: '#ec4899', // Pink-500
        branch: '#8b5cf6', // Violet-500
        leaf: '#6366f1', // Indigo-500
        text: '#f8fafc', // Slate-50
        textMuted: '#94a3b8', // Slate-400
        bg: '#020617', // Slate-950
        link: '#334155'  // Slate-700
    },
    nodeRadius: 6,
    duration: 500
};

// --- Mock Data (Testing Fallback) ---
const MOCK_DATA = {
    "name": "VisionChain",
    "type": "root",
    "children": [
        {
            "name": "Core Identity",
            "children": [
                {
                    "name": "Mission",
                    "description": "To democratize AI for small businesses through accessible automation tools.",
                    "sourceReference": { "title": "Company_Manifesto_v2.pdf", "snippet": "Our mission is to democratize access to advanced AI tools..." }
                },
                { "name": "Vision", "description": "A world where creativity is limited only by imagination, not technical skill." }
            ]
        },
        {
            "name": "Target Audience",
            "children": [
                { "name": "SOLOpreneurs", "description": "Individual creators managing everything alone." },
                { "name": "Agencies", "description": "Small boutique marketing firms." }
            ]
        },
        {
            "name": "Brand Values",
            "children": [
                { "name": "Transparency", "sourceReference": { "title": "Brand_Values.docx", "snippet": "We believe in radical transparency in our algorithms..." } },
                { "name": "Speed" },
                { "name": "Empowerment" }
            ]
        }
    ]
};

// --- Global State ---
let rootData = null;
let svg, g, zoomKey;
let i = 0;
let treemap;
let root; // Hierarchy root
let activeNode = null; // Currently inspected node

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initData();
    initCanvas();
    render();

    // Toolbar Events
    document.getElementById('btn-zoom-in').onclick = () => svg.transition().call(zoomKey.scaleBy, 1.2);
    document.getElementById('btn-zoom-out').onclick = () => svg.transition().call(zoomKey.scaleBy, 0.8);
    document.getElementById('btn-fit-view').onclick = fitView;

    // Inspector Edit Events
    document.getElementById('inp-name').addEventListener('input', (e) => updateActiveNode('name', e.target.innerText));
    document.getElementById('inp-desc').addEventListener('input', (e) => updateActiveNode('description', e.target.innerText));
});

function initData() {
    // Try to get data from URL params or LocalStorage
    // For now, use Mock Data if nothing found
    const urlParams = new URLSearchParams(window.location.search);
    const dataKey = urlParams.get('dataKey');

    let loadedData = null;
    if (dataKey) {
        const stored = localStorage.getItem(dataKey);
        if (stored) loadedData = JSON.parse(stored);
    }

    // Also check for a generic 'currentMindMap' key
    if (!loadedData) {
        const generic = localStorage.getItem('currentMindMap');
        if (generic) loadedData = JSON.parse(generic);
    }

    rootData = loadedData || MOCK_DATA;

    document.getElementById('map-subtitle').textContent = rootData.name || "Brand Strategy";
}

function initCanvas() {
    const container = document.getElementById('mindmap-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Zoom Behavior
    zoomKey = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg = d3.select('#mindmap-container').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .call(zoomKey)
        .on('dblclick.zoom', null);

    g = svg.append('g');

    // Initialize Tree Layout
    treemap = d3.tree().nodeSize([40, 240]); // [height, width] spacing
}

// --- Rendering Logic ---
function render() {
    // Convert to hierarchy
    root = d3.hierarchy(rootData, d => d.children);
    root.x0 = document.getElementById('mindmap-container').clientHeight / 2;
    root.y0 = 100;

    // Collapse logic if needed (optional initial state)
    // if (root.children) root.children.forEach(collapse);

    update(root);

    // Initial center
    fitView();
}

function update(source) {
    const treeData = treemap(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    // Fixed depth positioning
    nodes.forEach(d => { d.y = d.depth * 280; });

    // --- Nodes ---
    const node = g.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++i));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${source.y0},${source.x0})`)
        .on('click', click);

    // Node Circle
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style('fill', d => d._children ? CONFIG.colors.leaf : CONFIG.colors.bg)
        .style('stroke', d => getNodeColor(d))
        .style('stroke-width', '2px')
        .style('cursor', 'move'); // Changed to move cursor

    // --- Drag Behavior ---
    const dragBehavior = d3.drag()
        .on("start", (event, d) => {
            if (event.active) return; // Ignore if already active
            d3.select(event.sourceEvent.target.parentNode).raise(); // Bring to front
        })
        .on("drag", (event, d) => {
            // Update coordinates (Horizontal Tree: x is vertical, y is horizontal in data)
            // But 'event.dx/dy' are screen coordinates.
            // Screen X = d.y, Screen Y = d.x
            d.y += event.dx;
            d.x += event.dy;

            // Move Node
            d3.select(event.sourceEvent.target.parentNode)
                .attr("transform", `translate(${d.y},${d.x})`);

            // Update Links (Incoming & Outgoing)
            g.selectAll('path.link')
                .filter(l => l.source.id === d.id || l.target.id === d.id)
                .attr('d', l => diagonal(l.source, l.target));
        });

    nodeEnter.call(dragBehavior);

    // Labels
    nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('x', d => d.children || d._children ? -15 : 15)
        .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
        .text(d => d.data.name)
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '13px')
        .style('font-weight', '500')
        .style('fill', CONFIG.colors.textMuted)
        .style('opacity', 0)
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)')
        .style('cursor', 'pointer');

    // Update
    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition().duration(CONFIG.duration)
        .attr('transform', d => `translate(${d.y},${d.x})`);

    nodeUpdate.select('circle.node')
        .attr('r', d => d.depth === 0 ? 12 : 8)
        .style('fill', d => d._children ? getNodeColor(d) : CONFIG.colors.bg)
        .style('stroke', d => getNodeColor(d)) // Dynamic color based on branch
        .attr('cursor', 'pointer');

    nodeUpdate.select('text')
        .style('fill-opacity', 1)
        .style('opacity', 1)
        .style('font-weight', d => d === activeNode ? '700' : '500')
        .style('fill', d => d === activeNode ? CONFIG.colors.text : CONFIG.colors.textMuted)
        .text(d => d.data.name); // Refresh name in case of edit

    // Exit
    const nodeExit = node.exit().transition().duration(CONFIG.duration)
        .attr('transform', d => `translate(${source.y},${source.x})`)
        .remove();

    nodeExit.select('circle').attr('r', 1e-6);
    nodeExit.select('text').style('fill-opacity', 1e-6);

    // --- Links ---
    const link = g.selectAll('path.link')
        .data(links, d => d.target.id);

    const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
        })
        .style('fill', 'none')
        .style('stroke', CONFIG.colors.link)
        .style('stroke-width', '1.5px');

    const linkUpdate = linkEnter.merge(link);

    linkUpdate.transition().duration(CONFIG.duration)
        .attr('d', d => diagonal(d.source, d.target));

    link.exit().transition().duration(CONFIG.duration)
        .attr('d', d => {
            const o = { x: source.x, y: source.y };
            return diagonal(o, o);
        })
        .remove();

    // Store positions
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Curved path generator
function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
}

// Color logic
function getNodeColor(d) {
    if (d.depth === 0) return CONFIG.colors.root;
    // Walk up to find the level-1 parent to determine branch color
    let p = d;
    while (p.depth > 1) p = p.parent;

    // Consistent color hashing based on name
    const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    let hash = 0;
    const str = p.data.name || '';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// --- Interaction ---
function click(event, d) {
    // Toggle children
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }

    inspectNode(d);
    update(d);
}

function inspectNode(d) {
    activeNode = d;

    const inspector = document.getElementById('inspector');
    const placeholder = document.getElementById('inspector-placeholder');
    const content = document.getElementById('inspector-content');
    const body = document.getElementById('inspector-body');

    placeholder.classList.add('hidden');
    content.classList.remove('hidden');
    body.classList.remove('hidden');

    // Populate Fields
    document.getElementById('inp-name').innerText = d.data.name;
    document.getElementById('inp-desc').innerText = d.data.description || "No description provided.";

    // Source Reference
    const sourceCard = document.getElementById('source-card');
    if (d.data.sourceReference) {
        sourceCard.classList.remove('hidden');
        document.getElementById('source-title').innerText = d.data.sourceReference.title || "Unknown Document";
        document.getElementById('source-snippet').innerText = `"${d.data.sourceReference.snippet}"`;
    } else {
        sourceCard.classList.add('hidden');
    }
}

function updateActiveNode(field, value) {
    if (activeNode) {
        activeNode.data[field] = value;
        // If name changed, update graph text immediately
        if (field === 'name') {
            update(root);
        }
    }
}

function fitView() {
    const container = document.getElementById('mindmap-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.transition().duration(750).call(zoomKey.transform, d3.zoomIdentity.translate(width / 4, height / 2).scale(1));
}

// --- Toolbar Actions ---
window.saveChanges = function () {
    // In a integrated page, this would call Firestore.
    // For standalone, we save to local storage.
    localStorage.setItem('currentMindMap', JSON.stringify(rootData));

    // Visual Feedback
    const btn = document.querySelector('button[onclick="saveChanges()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="text-emerald-400">Saved!</span>`;
    setTimeout(() => btn.innerHTML = originalText, 2000);
}

window.fnAddChild = function () {
    if (!activeNode) return;

    const newNode = { name: "New Node", description: "Edit me" };
    if (!activeNode.children && !activeNode._children) {
        activeNode.children = [];
    }

    // Add to children (handle hidden children state)
    if (activeNode.children) {
        activeNode.children.push(newNode);
    } else {
        activeNode._children.push(newNode);
    }

    update(activeNode);
    // Auto-inspect new node? Maybe too complex for d3 update cycle
}

window.fnDeleteNode = function () {
    if (!activeNode || !activeNode.parent) return; // Can't delete root

    const parent = activeNode.parent;
    const children = parent.children || parent._children;

    // Remove from data
    const index = children.indexOf(activeNode);
    if (index > -1) {
        children.splice(index, 1);
    }

    activeNode = null;
    document.getElementById('inspector-content').classList.add('hidden');
    document.getElementById('inspector-body').classList.add('hidden');
    document.getElementById('inspector-placeholder').classList.remove('hidden');

    update(parent);
}
