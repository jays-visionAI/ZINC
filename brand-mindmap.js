/**
 * Brand Mind Map - D3.js Interactive Visualization & Manager
 * @author ZYNK Studio
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
        selected: '#ffffff' // White for selection
    },
    nodeRadius: 6,
    duration: 500
};

// --- Global State ---
let rootData = null; // Current Mind Map Data
let currentMetadata = null; // { projectId, mapId, docId }
let svg, g, zoomKey;
let i = 0;
let treemap;
let root; // Hierarchy root
let activeNode = null;
let selectedNodes = new Set();

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Init Visuals
    initCanvas();

    // 1. Parse URL Params IMMEDIATELY
    const urlParams = new URLSearchParams(window.location.search);
    const dataKey = urlParams.get('dataKey');
    const pId = urlParams.get('projectId');
    const mId = urlParams.get('planId');

    // Setup metadata early
    if (pId || mId) {
        currentMetadata = { projectId: pId, mapId: mId };
        if (pId && mId) currentMetadata.isLocal = false;
    }

    // 2. Auth Check & Data Load
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadSidebarData(); // Always load sidebar

            if (dataKey) {
                // Mode A: Loaded from Knowledge Hub Text Generation (localStorage)
                loadFromLocalStorage(dataKey);
            } else if (pId && mId) {
                // Mode B: Direct Link / Saved Plan (Firestore)
                loadMapByID(pId, mId);
            } else {
                // Mode C: No Context
                showPlaceholder(true);
            }
        } else {
            console.warn("User not logged in.");
            // If we have local dataKey, we *could* show it even if logged out?
            // For now, allow local view, block DB view
            if (dataKey) {
                loadFromLocalStorage(dataKey);
            } else {
                // Redirect to login or show mock
                loadMockData();
                loadSidebarMock();
            }
        }
    });

    // Toolbar Events
    document.getElementById('btn-zoom-in').onclick = () => svg.transition().call(zoomKey.scaleBy, 1.2);
    document.getElementById('btn-zoom-out').onclick = () => svg.transition().call(zoomKey.scaleBy, 0.8);
    document.getElementById('btn-fit-view').onclick = fitView;

    // Inspector Edit Events
    document.getElementById('inp-name').addEventListener('input', (e) => updateActiveNode('name', e.target.innerText));
    document.getElementById('inp-desc').addEventListener('input', (e) => updateActiveNode('description', e.target.innerText));
});

// --- Data Loading Logic ---

async function loadSidebarData() {
    const listContainer = document.getElementById('sidebar-projects-list');

    try {
        // 1. Get Projects (This part depends on your DB structure/permissions)
        // Trying to get all projects (you might want to filter by owner/member)
        const projectsSnap = await db.collection('projects').get();
        const projectGroups = [];

        // 2. For each project, get Brand Mind Map plans
        for (const pDoc of projectsSnap.docs) {
            const pData = pDoc.data();

            // Query for mind maps (removed orderBy to avoid index requirement)
            const mapsSnap = await db.collection(`projects/${pDoc.id}/contentPlans`)
                .where('type', '==', 'brand_mind_map')
                .get();

            if (!mapsSnap.empty) {
                const maps = mapsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Client-side sorting (Newest first)
                maps.sort((a, b) => {
                    const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt)) : 0;
                    const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt)) : 0;
                    return timeB - timeA;
                });

                projectGroups.push({
                    projectId: pDoc.id,
                    projectName: pData.projectName || "Untitled Project",
                    maps: maps
                });
            }
        }

        // Store for Modal usage
        globalProjectGroups = projectGroups;

        renderSidebar(projectGroups);

    } catch (error) {
        console.error("Error loading sidebar data:", error);
        listContainer.innerHTML = `<div class="text-center text-red-400 text-xs p-4">Error loading projects.<br>${error.message}</div>`;
    }
}

function renderSidebar(groups) {
    const container = document.getElementById('sidebar-projects-list');
    container.innerHTML = '';

    if (groups.length === 0) {
        container.innerHTML = `<div class="text-center text-slate-500 text-xs p-4">No Mind Maps found.<br>Create one to get started.</div>`;
        return;
    }

    groups.forEach(group => {
        // Project Header
        const section = document.createElement('div');
        section.className = 'mb-6';

        const header = document.createElement('div');
        header.className = 'px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2';
        header.innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            ${group.projectName}
        `;
        section.appendChild(header);

        // Map List
        const list = document.createElement('div');
        list.className = 'space-y-1';

        group.maps.forEach(map => {
            const item = document.createElement('div');
            item.className = 'sidebar-item group flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700';
            item.onclick = () => loadMapFromFirestore(group, map);

            // Creation Date
            let dateStr = 'Recently';
            if (map.createdAt) {
                const d = map.createdAt.toDate ? map.createdAt.toDate() : new Date(map.createdAt);
                dateStr = d.toLocaleDateString();
            }

            item.innerHTML = `
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium text-slate-300 group-hover:text-white truncate">${map.parameters?.topic || map.title || "Untitled Map"}</div>
                    <div class="text-[10px] text-slate-500">${dateStr}</div>
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
    // 1. Set Metadata
    currentMetadata = {
        projectId: project.projectId,
        mapId: map.id,
        mapTitle: map.parameters?.topic || map.title
    };

    // 2. Set Data
    // Check if 'mindMapData' exists in the plan document. 
    // In ZINC logic, plans have versions. We usually display the latest version.
    // Assuming 'mindMapData' is at top level or in 'versions' array.
    // Let's assume the map object PASSED IN already has data (since we queried the docs).

    let mapData = map.mindMapData;

    // Fallback: Check versions
    if (!mapData && map.versions && map.versions.length > 0) {
        // Get latest version with data
        const v = map.versions.slice().reverse().find(v => v.mindMapData);
        if (v) mapData = v.mindMapData;
    }

    // Fallback: Mock if still null
    if (!mapData) {
        console.warn("No mindMapData found in this plan. Loading demo.");
        rootData = { name: currentMetadata.mapTitle, children: [{ name: "No Data", children: [] }] };
    } else {
        rootData = mapData;
    }

    // 3. Update UI Headers
    document.getElementById('current-project-name').innerText = project.projectName;
    document.getElementById('current-doc-type').innerText = 'Brand Strategy';
    document.getElementById('current-map-title').innerText = currentMetadata.mapTitle;

    // 4. Render
    showPlaceholder(false);
    render();

    // Highlight sidebar item
    // (Implementation optional for logic simplicity)
}

async function deleteMap(e, projectId, mapId) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this Mind Map plan?")) return;

    try {
        await db.collection(`projects/${projectId}/contentPlans`).doc(mapId).delete();
        // Refresh Sidebar
        loadSidebarData();
        // If current map, clear view
        if (currentMetadata && currentMetadata.mapId === mapId) {
            showPlaceholder(true);
        }
    } catch (err) {
        alert("Error deleting map: " + err.message);
    }
}

function loadFromLocalStorage(key) {
    const stored = localStorage.getItem(key);
    if (!stored) return;

    try {
        const parsed = JSON.parse(stored);
        rootData = parsed;
        currentMetadata = { mapTitle: rootData.name || "Imported Map", isLocal: true };

        document.getElementById('current-project-name').innerText = "Local Storage";
        document.getElementById('current-map-title').innerText = rootData.name;

        showPlaceholder(false);
        render();
    } catch (e) { console.error(e); }
}

function loadMockData() {
    rootData = {
        "name": "VisionChain",
        "children": [
            { "name": "Core Identity", "children": [{ "name": "Mission" }, { "name": "Vision" }] },
            { "name": "Target Audience", "children": [{ "name": "SOLOpreneurs" }] }
        ]
    };
    render();
}

function loadSidebarMock() {
    renderSidebar([
        {
            projectId: "mock_p1",
            projectName: "Demo Project Alpha",
            maps: [
                { id: "m1", title: "Launch Strategy", createdAt: new Date() },
                { id: "m2", title: "Brand Core", createdAt: new Date() }
            ]
        }
    ]);
}

function showPlaceholder(show) {
    const placeholder = document.getElementById('canvas-placeholder');
    const container = document.getElementById('mindmap-container');

    if (show) {
        placeholder.classList.remove('hidden');
        if (g) g.style('display', 'none');
    } else {
        placeholder.classList.add('hidden');
        if (g) g.style('display', 'block');
    }
}

function initCanvas() {
    // ... same as before, but ensure 'g' is handled correctly
    // Add Zoom Behavior
    zoomKey = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg = d3.select('#mindmap-container').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .on('click', (event) => {
            if (event.target.tagName === 'svg') {
                selectedNodes.clear();
                updateSelectionVisuals();
            }
        })
        .call(zoomKey)
        .on('dblclick.zoom', null);

    g = svg.append('g');

    // Initialize Tree Layout
    treemap = d3.tree().nodeSize([40, 240]);
}

// --- Rendering Logic (Reused from previous step) ---
function render() {
    if (!rootData) return;

    // Reset G content? No, maintain transitions? 
    // For switching maps, we should probably clear or handle cleanly.
    // If we want smooth transition, it's hard with totally different data.
    // Let's clear for simplicity when switching maps.

    // But D3 update pattern can handle data change.

    root = d3.hierarchy(rootData, d => d.children);
    root.x0 = document.getElementById('mindmap-container').clientHeight / 2;
    root.y0 = 100;

    update(root);
    fitView();
}

// ... update(), click(), drag(), etc. (COPY PREVIOUS LOGIC) ...
// Since write_to_file overwrites, I must include the FULL logic.

function update(source) {
    const treeData = treemap(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    nodes.forEach(d => { d.y = d.depth * 280; });

    const node = g.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++i));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('id', d => `node-${d.id}`)
        .attr('transform', d => `translate(${source.y0},${source.x0})`)
        .on('click', click);

    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style('fill', d => d._children ? CONFIG.colors.leaf : CONFIG.colors.bg)
        .style('stroke', d => getNodeColor(d))
        .style('stroke-width', '2px')
        .style('cursor', 'pointer');

    // Drag Behavior (Updated with multi-select logic)
    const dragBehavior = d3.drag()
        .on("start", (event, d) => {
            if (event.active) return;
            d3.select(`#node-${d.id}`).raise();
            if (!selectedNodes.has(d) && !event.sourceEvent.shiftKey && !event.sourceEvent.ctrlKey && !event.sourceEvent.metaKey) {
                selectedNodes.clear();
                selectedNodes.add(d);
                updateSelectionVisuals();
            } else if (!selectedNodes.has(d)) {
                selectedNodes.add(d);
                updateSelectionVisuals();
            }
        })
        .on("drag", (event, d) => {
            const transform = d3.zoomTransform(svg.node());
            const scale = transform.k || 1;
            const dx = event.dx / scale;
            const dy = event.dy / scale;

            let nodesToMove = selectedNodes;
            if (nodesToMove.size === 0) nodesToMove = new Set([d]);

            nodesToMove.forEach(node => {
                node.y += dx;
                node.x += dy;
                d3.select(`#node-${node.id}`).attr("transform", `translate(${node.y},${node.x})`);
            });

            g.selectAll('path.link').attr('d', l => diagonal(l.source, l.target));
        });

    nodeEnter.call(dragBehavior);

    nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('x', d => d.children || d._children ? -15 : 15)
        .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
        .text(d => d.data.name)
        .style('fill', CONFIG.colors.textMuted)
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .style('font-size', '13px')
        .style('font-weight', '500');

    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition().duration(CONFIG.duration)
        .attr('transform', d => `translate(${d.y},${d.x})`);

    nodeUpdate.select('circle.node')
        .attr('r', d => d.depth === 0 ? 12 : 8)
        .style('fill', d => d._children ? getNodeColor(d) : CONFIG.colors.bg);

    nodeUpdate.select('text')
        .style('fill-opacity', 1)
        .style('opacity', 1)
        .text(d => d.data.name);

    updateSelectionVisuals();

    const nodeExit = node.exit().transition().duration(CONFIG.duration)
        .attr('transform', d => `translate(${source.y},${source.x})`)
        .remove();

    nodeExit.select('circle').attr('r', 1e-6);
    nodeExit.select('text').style('fill-opacity', 1e-6);

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

    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
}

function getNodeColor(d) {
    if (d.depth === 0) return CONFIG.colors.root;
    let p = d;
    while (p.depth > 1) p = p.parent;
    const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    let hash = 0;
    const str = p.data.name || '';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function click(event, d) {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
        if (selectedNodes.has(d)) selectedNodes.delete(d);
        else selectedNodes.add(d);
        updateSelectionVisuals();
        if (selectedNodes.size === 1) inspectNode(d);
        return;
    }
    if (selectedNodes.has(d) && selectedNodes.size > 1) {
        selectedNodes.clear();
        selectedNodes.add(d);
    } else {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
        selectedNodes.clear();
        selectedNodes.add(d);
    }
    updateSelectionVisuals();
    inspectNode(d);
}

function updateSelectionVisuals() {
    g.selectAll('circle.node')
        .style('stroke', d => getNodeColor(d))
        .style('stroke-width', '2px')
        .style('stroke-dasharray', null);

    g.selectAll('text').style('fill', CONFIG.colors.textMuted);

    selectedNodes.forEach(d => {
        const nodeGroup = d3.select(`#node-${d.id}`);
        nodeGroup.select('circle')
            .style('stroke', CONFIG.colors.selected)
            .style('stroke-width', '3px')
            .style('stroke-dasharray', '2,2');

        nodeGroup.select('text').style('fill', CONFIG.colors.text);
    });
}

function inspectNode(d) {
    activeNode = d;
    const placeholder = document.getElementById('inspector-placeholder');
    const content = document.getElementById('inspector-content');
    const body = document.getElementById('inspector-body');

    placeholder.classList.add('hidden');
    content.classList.remove('hidden');
    body.classList.remove('hidden');

    document.getElementById('inp-name').innerText = d.data.name;
    document.getElementById('inp-desc').innerText = d.data.description || "No description available.";

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
        if (field === 'name') update(root);
    }
}

function fitView() {
    const container = document.getElementById('mindmap-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.transition().duration(750).call(zoomKey.transform, d3.zoomIdentity.translate(width / 4, height / 2).scale(1));
}

// Global actions
window.saveChanges = async function () {
    if (!currentUser) return alert("Please log in to save changes.");

    // We need at least a Project ID to know where to save
    const projectId = currentMetadata?.projectId;
    if (!projectId) {
        // If no project context, maybe prompt user to select one? 
        // For now, simpler to alert.
        return alert("No project selected. Please open this map from a project context or create a new map.");
    }

    // Prepare Data
    const title = rootData.name || "Untitled Mind Map";
    const mapId = currentMetadata?.mapId;

    // Button Feedback
    const btn = document.getElementById('btn-save');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="animate-pulse">Saving...</span>`;
    btn.disabled = true;

    try {
        const saveData = {
            type: 'brand_mind_map',
            title: title,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            mindMapData: rootData, // The actual tree structure
            // Also update search keywords or plain text description if needed
        };

        if (mapId) {
            // --- UPDATE EXISTING ---
            await db.collection(`projects/${projectId}/contentPlans`).doc(mapId).update(saveData);

            // Visual Feedback
            btn.innerHTML = `<span class="text-emerald-400">Saved!</span>`;
        } else {
            // --- CREATE NEW (From Draft) ---
            saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            saveData.uid = currentUser.uid;

            // Add initial version structure if needed strictly
            saveData.versions = [{
                createdAt: new Date().toISOString(),
                mindMapData: rootData
            }];

            const docRef = await db.collection(`projects/${projectId}/contentPlans`).add(saveData);

            // Switch from Draft to Saved Mode
            currentMetadata.mapId = docRef.id;
            currentMetadata.isLocal = false;
            currentMetadata.mapTitle = title;

            // Optionally update URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('planId', docRef.id);
            newUrl.searchParams.delete('dataKey'); // No longer needed
            window.history.pushState({}, '', newUrl);

            // Refresh Sidebar to show the new map
            await loadSidebarData();

            btn.innerHTML = `<span class="text-emerald-400">Created!</span>`;
        }
    } catch (e) {
        console.error("Save Error:", e);
        alert("Failed to save changes: " + e.message);
        btn.innerHTML = `<span class="text-rose-400">Error!</span>`;
    } finally {
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }, 2000);
    }
}

// --- Modal Logic ---
window.createNewMap = function () {
    const modal = document.getElementById('modal-new-map');
    const select = document.getElementById('new-map-project');
    const input = document.getElementById('new-map-name');

    // Reset fields
    input.value = '';
    select.innerHTML = '<option value="" disabled selected>Select a project...</option>';

    // Populate projects
    if (globalProjectGroups && globalProjectGroups.length > 0) {
        globalProjectGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.projectId;
            option.textContent = group.projectName;
            select.appendChild(option);
        });
    }

    // If currently in a project, pre-select it
    if (currentMetadata && currentMetadata.projectId) {
        select.value = currentMetadata.projectId;
    }

    modal.classList.remove('hidden');
    input.focus();
}

window.closeNewMapModal = function () {
    document.getElementById('modal-new-map').classList.add('hidden');
}

window.submitNewMap = async function () {
    const name = document.getElementById('new-map-name').value.trim();
    const projectId = document.getElementById('new-map-project').value;

    if (!name) return alert("Please enter a map name.");
    if (!projectId) return alert("Please select a project.");

    // UI Loading State
    const btn = document.querySelector('button[onclick="submitNewMap()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span>Creating...</span>`;
    btn.disabled = true;

    try {
        const newMapData = {
            type: 'brand_mind_map',
            title: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            uid: currentUser.uid,
            projectId: projectId,
            // Initialize with empty structure
            versions: [
                {
                    createdAt: new Date().toISOString(),
                    mindMapData: { name: name, children: [] }
                }
            ],
            mindMapData: { name: name, children: [] }
        };

        const docRef = await db.collection(`projects/${projectId}/contentPlans`).add(newMapData);

        // Refresh sidebar to show new item
        await loadSidebarData();

        closeNewMapModal();

        // Load the newly created map
        loadMapByID(projectId, docRef.id);

    } catch (e) {
        console.error("Creation Error:", e);
        alert("Error creating map: " + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Helpers reused from previous
window.fnAddChild = function () {
    if (!activeNode) return;
    const newNode = { name: "New Node" };
    if (!activeNode.children && !activeNode._children) activeNode.children = [];
    if (activeNode.children) activeNode.children.push(newNode);
    else activeNode._children.push(newNode);
    update(activeNode);
}

window.fnDeleteNode = function () {
    if (!activeNode || !activeNode.parent) return;
    const parent = activeNode.parent;
    const children = parent.children || parent._children;
    const index = children.indexOf(activeNode);
    if (index > -1) children.splice(index, 1);
    activeNode = null;
    selectedNodes.clear();
    updateSelectionVisuals();
    update(parent);
}

// Helper: Load map by ID (for direct links)
async function loadMapByID(pId, mId) {
    try {
        // Show loading state
        document.getElementById('mindmap-container').style.opacity = '0.5';

        const doc = await db.collection(`projects/${pId}/contentPlans`).doc(mId).get();

        if (doc.exists) {
            const data = doc.data();
            let pName = "Loading Project...";

            try {
                const pDoc = await db.collection('projects').doc(pId).get();
                if (pDoc.exists) pName = pDoc.data().projectName;
            } catch (e) { console.warn("Could not fetch project name", e); }

            loadMapFromFirestore(
                { projectId: pId, projectName: pName },
                { id: mId, ...data }
            );
        } else {
            console.error("Map document not found");
            document.getElementById('canvas-placeholder').innerHTML = '<div class="text-center p-4">Mind Map not found or deleted.</div>';
            showPlaceholder(true);
        }
    } catch (e) {
        console.error("Error loading map by ID:", e);
        showPlaceholder(true);
    } finally {
        document.getElementById('mindmap-container').style.opacity = '1';
    }
}
