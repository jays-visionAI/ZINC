/**
 * Brand Mind Map - D3.js Interactive Visualization & Manager
 * @author ZYNK Studio
 * Refactored Version 2.0 (Strict Data-Driven)
 */

// --- Firebase Setup ---
// db is initialized in firebase-config.js
let currentUser = null;

// --- Configuration ---
const CONFIG = {
    colors: {
        root: '#ec4899', // Pink-500
        branch: '#8b5cf6', // Violet-500
        leaf: '#6366f1', // Indigo-500
        text: '#f8fafc', // Slate-50
        textMuted: '#94a3b8', // Slate-400
        bg: '#020617', // Slate-950
        link: '#334155',  // Slate-700
        selected: '#22d3ee' // Cyan-400 (Highlight)
    },
    duration: 500
};

// --- Global State ---
let rootData = null; // Single Source of Truth
let currentMetadata = null;
let svg, g, zoomKey;
let treeLayout;
let rootHierarchy;
let activeNodeData = null; // Store Data Object (Persistent), NOT D3 Node
let contextNodeData = null; // Context target for Toolbar (Hover takes precedence)
let selectedData = new Set(); // Set of Data Objects
let clipboardData = null;
let globalProjectGroups = [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Visuals
    initCanvas();
    setupEventListeners();

    // 2. Parse URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const dataKey = urlParams.get('dataKey');
    const pId = urlParams.get('projectId');
    const mId = urlParams.get('planId');

    // 3. Auth Check & Data Load
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadSidebarData(); // Always load sidebar

            if (pId && mId) {
                // Mode B: Direct Link / Saved Plan (Firestore)
                loadMapByID(pId, mId);
                currentMetadata = { projectId: pId, mapId: mId };
            } else if (dataKey) {
                // Mode A: Loaded from LocalStorage
                loadFromLocalStorage(dataKey);
            } else {
                // Mode C: No Context / New
                showPlaceholder(true);
            }
        } else {
            console.warn("User not logged in.");
            if (dataKey) {
                loadFromLocalStorage(dataKey);
            } else {
                // Show Login Prompt or Mock?
                // For safety in dev, show placeholder
                showPlaceholder(true);
            }
        }
    });
});

function setupEventListeners() {
    // Toolbar Events (Zoom)
    document.getElementById('btn-zoom-in').onclick = () => svg.transition().call(zoomKey.scaleBy, 1.2);
    document.getElementById('btn-zoom-out').onclick = () => svg.transition().call(zoomKey.scaleBy, 0.8);
    document.getElementById('btn-fit-view').onclick = fitView;

    // Node Toolbar Events (Correctly bound)
    document.getElementById('btn-node-add').addEventListener('click', (e) => { e.stopPropagation(); addChildNode(); });
    document.getElementById('btn-node-copy').addEventListener('click', (e) => { e.stopPropagation(); copyBranch(); });
    document.getElementById('btn-node-paste').addEventListener('click', (e) => { e.stopPropagation(); pasteBranch(); });
    document.getElementById('btn-node-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteNode(); });

    // Inspector Edit Events
    document.getElementById('inp-name').addEventListener('input', (e) => updateActiveNodeData('name', e.target.value));
    document.getElementById('inp-desc').addEventListener('input', (e) => updateActiveNodeData('description', e.target.innerText));
    document.getElementById('inp-memo').addEventListener('input', (e) => updateActiveNodeData('memo', e.target.value));
}

// --- Data Loading Logic ---

async function loadSidebarData() {
    const listContainer = document.getElementById('sidebar-projects-list');
    if (!listContainer) return;

    try {
        const projectsSnap = await db.collection('projects').get();
        const projectGroups = [];

        for (const pDoc of projectsSnap.docs) {
            const pData = pDoc.data();
            const mapsSnap = await db.collection(`projects/${pDoc.id}/contentPlans`)
                .where('type', '==', 'brand_mind_map')
                .get(); // Removing orderBy to be safe

            if (!mapsSnap.empty) {
                const maps = mapsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort
                maps.sort((a, b) => {
                    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
                    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
                    return tB - tA;
                });

                projectGroups.push({
                    projectId: pDoc.id,
                    projectName: pData.projectName || "Untitled Project",
                    maps: maps
                });
            }
        }
        globalProjectGroups = projectGroups;
        renderSidebar(projectGroups);

    } catch (error) {
        console.error("Error loading sidebar data:", error);
    }
}

function renderSidebar(groups) {
    const container = document.getElementById('sidebar-projects-list');
    container.innerHTML = '';

    if (groups.length === 0) {
        container.innerHTML = `<div class="text-center text-slate-500 text-xs p-4">No Mind Maps found.</div>`;
        return;
    }

    const activeMapId = currentMetadata?.mapId;

    groups.forEach(group => {
        const section = document.createElement('div');
        section.className = 'mb-6';
        section.innerHTML = `<div class="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>${group.projectName}</div>`;

        const list = document.createElement('div');
        list.className = 'space-y-1';

        group.maps.forEach(map => {
            const isActive = map.id === activeMapId;
            const item = document.createElement('div');
            item.className = `group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-indigo-500/20 border border-indigo-500/50' : 'hover:bg-slate-800 border border-transparent hover:border-slate-700'}`;

            item.onclick = () => {
                // Update Metadata
                currentMetadata = { projectId: group.projectId, mapId: map.id, mapTitle: map.title };
                // Also update URL silently
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('projectId', group.projectId);
                newUrl.searchParams.set('planId', map.id);
                window.history.pushState({}, '', newUrl);

                loadMapFromFirestore(group, map);
                // Re-render sidebar to update active state
                renderSidebar(groups);
            };

            let dateStr = 'Recently';
            if (map.createdAt) {
                const d = new Date(map.createdAt.seconds * 1000);
                dateStr = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }

            const versionBadge = map.version ? `<span class="ml-1.5 px-1 py-px rounded border border-slate-600 text-[9px] text-slate-400 font-normal opacity-75">${map.version}</span>` : '';

            item.innerHTML = `
                <div class="flex-1 min-w-0">
                    <div class="flex items-center text-xs font-medium ${isActive ? 'text-white' : 'text-slate-300'} group-hover:text-white truncate">
                        <span class="truncate">${map.title || "Untitled Map"}</span>
                        ${versionBadge}
                    </div>
                    <div class="text-[10px] text-slate-500 mt-0.5">${dateStr}</div>
                </div>
                 <button onclick="deleteMap(event, '${group.projectId}', '${map.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all" title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            list.appendChild(item);
        });
        section.appendChild(list);
        container.appendChild(section);
    });
}

function loadMapFromFirestore(project, map) {
    let mapData = map.mindMapData;

    // Version fallback
    if (!mapData && map.versions && map.versions.length > 0) {
        const v = map.versions.slice().reverse().find(v => v.mindMapData);
        if (v) mapData = v.mindMapData;
    }

    if (!mapData) {
        console.warn("No data in map, using dummy.");
        rootData = { name: map.title || "New Map", children: [] };
    } else {
        rootData = mapData; // Direct reference

        // CHECK PERSISTENCE: If loaded data has layout, prevent auto-layout reset
        const hasLayout = rootData.layout || (rootData.children && rootData.children.some(c => c.layout));
        if (hasLayout) {
            rootData.layoutInitialized = true;
        }
    }

    // UI Updates
    document.getElementById('current-project-name').innerText = project.projectName;
    document.getElementById('current-map-title').innerText = map.title || "Brand Mind Map";

    showPlaceholder(false);

    // Initial Render
    renderTree();
    deselectNode(); // Reset UI & Show Map Summary
}

// --- VISUALIZATION LOGIC (THE CORE REFACTOR) ---

function initCanvas() {
    const container = document.getElementById('mindmap-container');

    // cleanup existing
    d3.select('#mindmap-container svg').remove();

    svg = d3.select(container).append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .on('click', (event) => {
            // Click on background -> Deselect
            if (event.target.tagName === 'svg') {
                deselectNode();
            }
        });

    g = svg.append('g');

    // Zoom
    zoomKey = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoomKey).on('dblclick.zoom', null);

    // Tree Layout
    treeLayout = d3.tree().nodeSize([50, 250]); // Height, Width
}

// Render the entire tree from scratch based on rootData
function renderTree() {
    if (!rootData) return;

    // 0. Ensure IDs for stability
    ensureIds(rootData);

    // 1. Hierarchy Setup
    rootHierarchy = d3.hierarchy(rootData, d => d.children);

    // 2. Layout Strategy: HYBRID
    // If we have saved coordinates, USE THEM. Do not re-run tree layout.
    // If we don't, run tree layout once to initialize.

    if (!rootData.layoutInitialized) {
        // Initial Layout Calculation
        const treeData = treeLayout(rootHierarchy);
        treeData.descendants().forEach(d => {
            if (!d.data.layout) {
                // Initial positioning: D3 Tree (Vertical x/y) -> Mapped to our Horiz View (y, x)
                d.data.layout = { x: d.x, y: d.y };
            }
        });
        rootData.layoutInitialized = true;
    }

    // 3. Apply Coordinates from Data (Strict Force)
    rootHierarchy.descendants().forEach(d => {
        if (!d.data.layout) d.data.layout = { x: d.x || 0, y: d.y || 0 }; // Fallback
        d.x = d.data.layout.x;
        d.y = d.data.layout.y;
    });

    const nodes = rootHierarchy.descendants();
    const links = rootHierarchy.links();

    // 3. Clear Canvas (Simplifying update logic)
    // We keep transitions simple: clear and redraw.
    // D3's enter/exit is great but complex for structural editing.
    // For 100-200 nodes, full redraw is < 16ms.
    g.selectAll('*').remove(); // NUCLEAR OPTION - GUARANTEES SYNC

    // 4. Draw Links
    g.selectAll('path.link')
        .data(links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', d => {
            return `M${d.source.y},${d.source.x}
                    C${(d.source.y + d.target.y) / 2},${d.source.x}
                     ${(d.source.y + d.target.y) / 2},${d.target.x}
                     ${d.target.y},${d.target.x}`;
        })
        .style('fill', 'none')
        .style('stroke', CONFIG.colors.link)
        .style('stroke-width', '1.5px');

    // 5. Draw Nodes
    const node = g.selectAll('g.node')
        .data(nodes, d => d.data.id) // Key function for stability
        .enter().append('g')
        .attr('class', 'node')
        .attr('id', d => `node-${d.data.id}`) // Stable DOM ID
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .on('click', onNodeClick)
        .on('dblclick', (e) => { e.stopPropagation(); e.preventDefault(); }) // Block double click
        .on('mouseenter', (event, d) => {
            // Show Toolbar on Hover
            if (!isDragging) {
                contextNodeData = d.data;
                updateToolbarPosition(d.data);
            }
        })
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded)
        );

    // 6. Node Shapes
    node.each(function (d) {
        const group = d3.select(this);
        const hasChild = d.children && d.children.length > 0;
        const name = d.data.name || "Node";
        const color = getNodeColor(d);

        if (hasChild || d.depth === 0) {
            // Pill Shape
            const width = Math.max(80, name.length * 8 + 24);
            const height = 32;

            group.append('rect')
                .attr('class', 'shape')
                .attr('x', -width / 2)
                .attr('y', -height / 2)
                .attr('width', width)
                .attr('height', height)
                .attr('rx', 16)
                .attr('ry', 16)
                .style('fill', color)
                .style('stroke', '#fff')
                .style('stroke-width', '2px')
                .style('cursor', 'pointer');

            group.append('text')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .text(name)
                .style('fill', '#fff')
                .style('font-size', '12px')
                .style('font-weight', 'bold')
                .style('pointer-events', 'none');
        } else {
            // Circle Shape
            group.append('circle')
                .attr('class', 'shape')
                .attr('r', 8)
                .style('fill', CONFIG.colors.bg)
                .style('stroke', color)
                .style('stroke-width', '2px')
                .style('cursor', 'pointer');

            group.append('text')
                .attr('dy', '0.35em')
                .attr('x', 14)
                .attr('text-anchor', 'start')
                .text(name)
                .style('fill', CONFIG.colors.textMuted)
                .style('font-size', '13px')
                .style('pointer-events', 'none');
        }
    });

    // Restore Selection if possible
    if (activeNodeData) {
        // Find the new D3 node that matches activeNodeData's data
        // This is tricky because object references might persist or change depending on D3.
        // But d.data should be the same object reference from rootData.
        const newActive = nodes.find(n => n.data === activeNodeData);
        if (newActive) {
            // activeNodeData is already the data object, no need to reassign.
            // Just ensure selection state is rendered correctly.
            renderSelectionState();
        } else {
            deselectNode();
        }
    }
}

// --- Interaction Handlers ---

function onNodeClick(event, d) {
    if (hasMoved) {
        event.stopPropagation();
        return;
    }
    event.stopPropagation();

    // Sync context for actions
    contextNodeData = d.data;

    if (event.shiftKey) {
        if (selectedData.has(d.data)) {
            selectedData.delete(d.data);
            if (activeNodeData === d.data) activeNodeData = null;
        } else {
            selectedData.add(d.data);
            activeNodeData = d.data;
        }
    } else {
        selectedData.clear();
        selectedData.add(d.data);
        activeNodeData = d.data;
    }

    renderSelectionState();
}

function renderSelectionState() {
    g.selectAll('.node').each(function (d) {
        const isSelected = selectedData.has(d.data);
        const group = d3.select(this);
        const shape = group.select('.shape');

        if (isSelected) {
            shape.style('stroke', CONFIG.colors.selected)
                .style('stroke-dasharray', '4,2')
                .style('stroke-width', '3px');
        } else {
            shape.style('stroke', getNodeColor(d))
                .style('stroke-dasharray', null)
                .style('stroke-width', '2px');
        }
    });

    if (activeNodeData && selectedData.has(activeNodeData)) {
        // Need D3 node wrapper to pass to inspector? No, data is enough.
        // But Toolbar placement needs DOM.
        updateToolbarPosition(activeNodeData);
        updateInspector(activeNodeData);
    } else {
        document.getElementById('node-toolbar').classList.add('hidden');
        document.getElementById('inspector-placeholder').classList.remove('hidden');
        document.getElementById('inspector-content').classList.add('hidden');
        document.getElementById('source-card').classList.add('hidden');
    }
}

function highlightNode(d) {
    // Unused, logic moved to renderSelectionState
}

function deselectNode() {
    selectedData.clear();
    activeNodeData = null;
    renderSelectionState();
    updateInspectorMapInfo();
}

function updateInspectorMapInfo() {
    const titleEl = document.getElementById('insp-map-title');
    const statsEl = document.getElementById('insp-map-stats');

    if (titleEl && rootData) {
        titleEl.innerText = rootData.name || currentMetadata?.mapTitle || "Untitled Map";

        // Calculate Node Count
        let count = 0;
        const traverse = (n) => { count++; if (n.children) n.children.forEach(traverse); };
        traverse(rootData);

        if (statsEl) statsEl.innerText = `${count} Nodes in total`;
    }
}

function updateToolbarPosition(data) {
    const toolbar = document.getElementById('node-toolbar');

    // Find DOM by ID
    const nodeEl = document.getElementById(`node-${data.id}`);
    if (!nodeEl) {
        toolbar.classList.add('hidden');
        return;
    }

    toolbar.classList.remove('hidden');

    const rect = nodeEl.getBoundingClientRect();
    const containerRect = document.getElementById('mindmap-container').getBoundingClientRect();

    const left = rect.left - containerRect.left + rect.width / 2;
    const top = rect.top - containerRect.top - 20; // 20px above

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;

    // Paste Btn Logic
    const btnPaste = document.getElementById('btn-node-paste');
    if (clipboardData) btnPaste.classList.remove('hidden');
    else btnPaste.classList.add('hidden');

    // Multi-select Logic for Buttons
    const btnAdd = document.getElementById('btn-node-add');
    if (selectedData.size > 1) {
        // Disable Add for multi-selection but keep visible
        btnAdd.classList.add('opacity-40', 'pointer-events-none');
    } else {
        btnAdd.classList.remove('opacity-40', 'pointer-events-none');
        btnAdd.classList.remove('opacity-30'); // remove old class if present
    }
}

function updateInspector(data) {
    document.getElementById('inspector-placeholder').classList.add('hidden');
    document.getElementById('inspector-content').classList.remove('hidden');
    document.getElementById('inspector-body').classList.remove('hidden');

    document.getElementById('inp-name').value = data.name;

    // Badge
    const type = data.type || 'CONCEPT';
    const badge = document.getElementById('inp-type-badge');
    if (badge) badge.innerText = type;

    document.getElementById('inp-desc').innerText = data.description || "No description provided.";
    document.getElementById('inp-memo').value = data.memo || "";

    const ref = data.sourceReference || data.source || data.ref;
    const sourceCard = document.getElementById('source-card');
    if (ref) {
        sourceCard.classList.remove('hidden');
        document.getElementById('source-title').innerText = ref.title || "Unknown Source";
        document.getElementById('source-snippet').innerText = `"${(ref.snippet || "").substring(0, 150)}..."`;
    } else {
        sourceCard.classList.add('hidden');
    }
}

// --- DRAG LOGIC ---

let isDragging = false;
let hasMoved = false;
let dragStartX, dragStartY;

function dragStarted(event, d) {
    isDragging = true;
    hasMoved = false;
    dragStartX = event.x;
    dragStartY = event.y;

    document.getElementById('node-toolbar').classList.add('hidden'); // Hide toolbar during drag
    d3.select(this).raise();

    // Select on drag start? Maybe. But let's keep it clean.
    // If not selected, select it?
    if (!selectedData.has(d.data)) {
        activeNodeData = d.data;
    }
    contextNodeData = d.data;
    renderSelectionState();
}

function dragged(event, d) {
    if (!isDragging) return;

    // Check movement threshold logic (Accumulated distance)
    if (!hasMoved) {
        // D3 v6: event.x is absolute coordinate (or relative to parent).
        // Safest is to track delta accumulation or distance from start.
        // Assuming event.x/y works as expected in drag.
        const dist = Math.hypot(event.x - dragStartX, event.y - dragStartY);
        if (dist < 5) return; // Too small, ignore
        hasMoved = true;
    }

    // Multi-move Support
    if (!selectedData.has(d.data)) {
        selectedData.clear();
        selectedData.add(d.data);
        activeNodeData = d.data;
        renderSelectionState();
    }

    const dx = event.dx;
    const dy = event.dy;

    selectedData.forEach(data => {
        if (!data.layout) data.layout = { x: 0, y: 0 };
        data.layout.y += dx; // Horizontal
        data.layout.x += dy; // Vertical
    });

    // Efficient DOM Update by ID
    g.selectAll('.node').filter(n => selectedData.has(n.data))
        .attr('transform', n => `translate(${n.data.layout.y}, ${n.data.layout.x})`);

    updateLinkPositions();
}

function updateLinkPositions() {
    g.selectAll('path.link').attr('d', d => {
        // Sync with data.layout
        const sx = d.source.data.layout?.x ?? d.source.x;
        const sy = d.source.data.layout?.y ?? d.source.y;
        const tx = d.target.data.layout?.x ?? d.target.x;
        const ty = d.target.data.layout?.y ?? d.target.y;

        return `M${sy},${sx}
                 C${(sy + ty) / 2},${sx}
                  ${(sy + ty) / 2},${tx}
                  ${ty},${tx}`;
    });
}

function dragEnded(event, d) {
    isDragging = false;
    if (!hasMoved) return; // Treat as click

    if (d.depth === 0) { // Root cannot be moved
        renderTree();
        return;
    }

    // Hit Testing for Reparenting
    const nodes = g.selectAll('.node').data();
    let target = null;
    let minDist = 80;

    for (const n of nodes) {
        if (n === d) continue; // Self
        if (n === d.parent) continue; // Current parent

        // Cycle Check (Cannot drop on own descendant)
        let p = n;
        while (p) {
            if (p === d) { p = null; break; } // n is descendant of d
            p = p.parent;
        }
        if (!p && n !== rootHierarchy) continue; // n was descendant

        const dx = event.x - n.y; // Node coordinates are flipped in tree layout?
        // Wait, event.x/y are relative to parent G (transformed).
        // n.x, n.y are layout coordinates.
        // D3 Tree: x=vertical, y=horizontal usually.
        // My transform was translate(d.y, d.x).
        // So visual X = d.y, visual Y = d.x.

        // drag event provides x, y in local coordinates.
        // Distance check:
        const dist = Math.hypot((event.x - n.y), (event.y - n.x));

        if (dist < minDist) {
            minDist = dist;
            target = n;
        }
    }

    if (target) {
        // REPARENTING LOGIC
        // 1. Remove from old parent
        const oldSiblings = d.parent.data.children;
        const idx = oldSiblings.indexOf(d.data);
        if (idx > -1) oldSiblings.splice(idx, 1);

        // 2. Add to new parent
        if (!target.data.children) target.data.children = [];
        target.data.children.push(d.data);

        // 3. Render
        renderTree();
    } else {
        // Snap back
        renderTree();
    }
}


// --- CRUD OPERATIONS ---

// Helper to ensure IDs exist on all nodes
function ensureIds(node) {
    if (!node.id) node.id = Math.random().toString(36).substr(2, 9);
    if (node.children) node.children.forEach(ensureIds);
}

// Global CRUD Helpers for Toolbar
window.addChildNode = function () {
    const targetData = contextNodeData || activeNodeData;
    if (!targetData) return;

    // Use targetData instead of activeNodeData
    const activeData = targetData;

    // Smart Placement Logic
    let newX = 0, newY = 0;

    if (activeData.layout) {
        const parentX = activeData.layout.x;
        const parentY = activeData.layout.y;

        if (activeData.children && activeData.children.length > 0) {
            // Has siblings: Place below the last sibling
            const lastChild = activeData.children[activeData.children.length - 1];
            if (lastChild.layout) {
                newX = lastChild.layout.x + 50;
                newY = lastChild.layout.y;
            } else {
                newX = parentX + 50;
                newY = parentY + 200;
            }
        } else {
            // First child: Place to the right
            newX = parentX;
            newY = parentY + 200;
        }
    }

    const newNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: "New Node",
        children: [],
        layout: { x: newX, y: newY }
    };

    if (!activeData.children) activeData.children = [];
    activeData.children.push(newNode);

    renderTree();

    // Auto-select the new node
    selectedData.clear();
    selectedData.add(newNode);
    activeNodeData = newNode;
    contextNodeData = newNode; // Sync context
    renderSelectionState();
};

window.deleteNode = function () {
    if (selectedData.size === 0) return;

    if (confirm(`Delete ${selectedData.size} selected node(s)?`)) {
        let deletedCount = 0;

        // Helper to remove single node
        const removeRecursive = (parent, childToRemove) => {
            if (parent.children) {
                const idx = parent.children.indexOf(childToRemove);
                if (idx > -1) {
                    parent.children.splice(idx, 1);
                    return true;
                }
                return parent.children.some(c => removeRecursive(c, childToRemove));
            }
            return false;
        };

        // Convert Set to Array to avoid issues during modification
        const targets = Array.from(selectedData);

        targets.forEach(target => {
            if (target === rootData) {
                console.warn("Cannot delete root.");
            } else {
                if (removeRecursive(rootData, target)) {
                    deletedCount++;
                }
            }
        });

        if (deletedCount > 0) {
            activeNodeData = null;
            selectedData.clear();
            renderTree();
            deselectNode(); // Hide toolbar
        }
    }
};

window.copyBranch = function () {
    if (selectedData.size === 0) return;

    // Deep clone helper
    const clone = (d) => ({ ...d, id: Math.random().toString(36).substr(2, 9), children: d.children ? d.children.map(clone) : [] });

    // Store as Array
    clipboardData = Array.from(selectedData).map(d => clone(d));

    // Feedback
    const btn = document.getElementById('btn-node-copy');
    if (btn) btn.style.color = '#34d399';
    setTimeout(() => { if (btn) btn.style.color = ''; }, 500);

    // Immediately show Paste button
    if (contextNodeData || activeNodeData) {
        updateToolbarPosition(contextNodeData || activeNodeData);
    }
};

window.pasteBranch = function () {
    if (!activeNodeData || !clipboardData) return;

    // Handle both Single Object and Array (Migration support)
    const itemsToPaste = Array.isArray(clipboardData) ? clipboardData : [clipboardData];

    // Re-ID Helper
    const reId = (d) => { d.id = Math.random().toString(36).substr(2, 9); if (d.children) d.children.forEach(reId); };

    itemsToPaste.forEach((item, index) => {
        const newData = JSON.parse(JSON.stringify(item));
        reId(newData);

        // Place near parent with offset
        if (activeNodeData.layout) {
            newData.layout = {
                x: activeNodeData.layout.x + 50 + (index * 20),
                y: activeNodeData.layout.y + 150 + (index * 20)
            };
        }

        if (!activeNodeData.children) activeNodeData.children = [];
        activeNodeData.children.push(newData);
    });

    renderTree();
};

function updateActiveNodeData(field, value) {
    if (activeNodeData) {
        activeNodeData[field] = value;
        if (field === 'name') renderTree();
    }
}

// --- HELPERS ---

function getNodeColor(d) {
    if (d.depth === 0) return CONFIG.colors.root;
    let p = d;
    while (p.depth > 1) p = p.parent;
    const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    // Hash string based color
    let hash = 0;
    const str = p.data.name || '';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function fitView() {
    if (!g) return;
    const container = document.getElementById('mindmap-container');
    const bBox = g.node().getBBox();
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (bBox.width === 0) return;

    const scale = Math.min(width / bBox.width, height / bBox.height) * 0.8;
    const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-bBox.x - bBox.width / 2, -bBox.y - bBox.height / 2);

    svg.transition().duration(750).call(zoomKey.transform, transform);
}

function showPlaceholder(show) {
    const p = document.getElementById('canvas-placeholder');
    if (show) p.classList.remove('hidden');
    else p.classList.add('hidden');
}

// --- Global Actions (Save/ID Logic) ---
// Save function (from previous step, tweaked)
window.saveChanges = async function () {
    if (!currentUser) return alert("Please log in.");
    if (!currentMetadata) return alert("No context.");

    const btn = document.getElementById('btn-save');
    const prev = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    try {
        const { projectId, mapId } = currentMetadata;
        const saveData = {
            type: 'brand_mind_map',
            title: rootData.name,
            mindMapData: rootData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (mapId) {
            await db.collection(`projects/${projectId}/contentPlans`).doc(mapId).update(saveData);
            btn.innerHTML = 'Saved!';
        } else {
            // New logic
            // ... (Usually handled by submitNewMap)
            btn.innerHTML = 'Saved!';
        }
    } catch (e) {
        console.error(e);
        btn.innerHTML = 'Error';
    } finally {
        setTimeout(() => { btn.innerHTML = prev; btn.disabled = false; }, 1500);
    }
}

// Keep loadMapByID legacy wrapper
async function loadMapByID(pId, mId) {
    try {
        document.getElementById('global-loading').classList.remove('hidden');
        const doc = await db.collection(`projects/${pId}/contentPlans`).doc(mId).get();
        if (doc.exists) {
            loadMapFromFirestore({ projectId: pId, projectName: "Project" }, { id: mId, ...doc.data() });
        }
    } finally {
        document.getElementById('global-loading').classList.add('hidden');
    }
}

// Keep Local Storage Loader
function loadFromLocalStorage(key) {
    const s = localStorage.getItem(key);
    if (s) {
        rootData = JSON.parse(s);
        currentMetadata = { isLocal: true };
        renderTree();
        showPlaceholder(false);
    }
}

// Modal Logic (Assignments)
window.createNewMap = function () { document.getElementById('modal-new-map').classList.remove('hidden'); };
window.closeNewMapModal = function () { document.getElementById('modal-new-map').classList.add('hidden'); };
window.submitNewMap = async function () {
    // ... Implement as before or cleaner ...
    // Basic implementation for continuity
    const name = document.getElementById('new-map-name').value;
    const pid = document.getElementById('new-map-project').value;
    if (!name || !pid) return;

    const newMap = {
        title: name,
        type: 'brand_mind_map',
        projectId: pid,
        uid: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        mindMapData: { name: name, children: [] }
    };

    const ref = await db.collection(`projects/${pid}/contentPlans`).add(newMap);
    window.closeNewMapModal();
    loadMapByID(pid, ref.id);
};

// Deletion Logic
window.deleteMap = async function (e, pid, mid) {
    e.stopPropagation();
    if (confirm("Delete this map?")) {
        await db.collection(`projects/${pid}/contentPlans`).doc(mid).delete();
        loadSidebarData();
    }
};
