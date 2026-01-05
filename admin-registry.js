// admin-registry.js
// Agent Registry Dashboard (List View)
// Logic: Display Agent Classes, Manage Seed Data

(function () {
    console.log("[AgentRegistry] JS Loaded");
    let registry = [];
    let filteredRegistry = [];
    let unsubscribe = null;

    // Core Agents Data for Client-Side Seeding
    const coreAgentsSeed = [
        // Strategy
        { id: "STG-GEN", name: "General Strategist", category: "Strategy", status: "active", currentProductionVersion: "1.0.0", description: "Analyzes inputs to formulate cross-channel strategies." },
        { id: "INT-MKT-SCOUT", name: "Market Scout", category: "Intelligence", status: "active", currentProductionVersion: "1.0.0", description: "Surveys external market data, trends, and competitor activities." },

        // Writers (Channel Sepcialists)
        { id: "WRT-LINKEDIN", name: "LinkedIn Writer", category: "Writer", status: "active", currentProductionVersion: "1.0.0", description: "Professional, engagement-focused LinkedIn content creator." },
        { id: "WRT-INSTA", name: "Instagram Writer", category: "Writer", status: "active", currentProductionVersion: "1.0.0", description: "Visual, hashtag-heavy, casual tone for Instagram." },
        { id: "WRT-SEO-BLOG", name: "SEO Blog Writer", category: "Writer", status: "active", currentProductionVersion: "1.0.0", description: "Long-form, structured, keyword-optimized blog writer." },

        // Designers
        { id: "DSN-PHOTO", name: "Photo Realist", category: "Design", status: "active", currentProductionVersion: "1.0.0", description: "Generates photorealistic images for social media." },
        { id: "DSN-ART", name: "Digital Artist", category: "Design", status: "active", currentProductionVersion: "1.0.0", description: "Creates creative/abstract art for blogs." },

        // Legacy / Others
        { id: "QA-VIS-QC", name: "Aesthetic Critic (Vision)", category: "QA", status: "active", currentProductionVersion: "1.0.0", description: "Uses Vision AI to critique screenshots." }
    ];

    window.initRegistry = function (user) {
        console.log("Initializing Agent Registry Dashboard...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        loadRegistry();
        setupEventListeners();
    };

    function loadRegistry() {
        const tbody = document.getElementById("profiles-table-body"); // Reuse ID from template
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7">Loading Registry...</td></tr>';

        unsubscribe = db.collection('agentRegistry').onSnapshot(snap => {
            registry = [];
            snap.forEach(doc => registry.push({ docId: doc.id, ...doc.data() }));

            // Sort by Category then Name
            registry.sort((a, b) => {
                if (a.category !== b.category) return a.category.localeCompare(b.category);
                return a.name.localeCompare(b.name);
            });

            filteredRegistry = [...registry];
            renderTable();
        });
    }

    function renderTable() {
        const tbody = document.getElementById("profiles-table-body");
        if (!tbody) return;

        if (filteredRegistry.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding: 40px;">
                        <div style="margin-bottom: 10px; color: #aaa;">No agents found in Registry</div>
                        <button onclick="seedRegistry()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                            🌱 Seed Core Agents
                        </button>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = filteredRegistry.map(agent => {
            return `
                <tr style="cursor:pointer;" onclick="window.location.hash = 'registry-detail/${agent.id}'">
                    <td>
                        <div style="color:#16e0bd; font-weight:600;">${agent.name}</div>
                        <div style="color:rgba(255,255,255,0.5); font-size:11px;">${agent.id}</div>
                    </td>
                    <td><span class="category-badge">${agent.category}</span></td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#fff; font-weight:500;">v${agent.currentProductionVersion || '0.0.0'}</span>
                            <span style="color:#a855f7; font-size:11px;">● Production Info</span>
                        </div>
                    </td>
                    <td>
                        <span class="admin-badge ${agent.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                            ${(agent.status || 'unknown').toUpperCase()}
                        </span>
                    </td>
                    <td>${agent.updatedAt ? new Date(agent.updatedAt.seconds * 1000).toLocaleDateString() : '-'}</td>
                    <td>
                        <button class="admin-btn-secondary" onclick="event.stopPropagation(); window.location.hash = 'registry-detail/${agent.id}'">Manage</button>
                    </td>
                </tr>
             `;
        }).join('');
    }

    // --- Client-Side Seeding Logic ---
    window.seedRegistry = async function () {
        if (!confirm("Are you sure you want to seed the default ZYNK Core Agents? This will create new records if they don't exist.")) return;

        const btn = document.querySelector('button[onclick="seedRegistry()"]');
        if (btn) btn.textContent = "Seeding...";

        try {
            const batch = db.batch();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            let count = 0;

            for (const agent of coreAgentsSeed) {
                // Check existence (optimistic) - actually just overwrite for seed
                const regRef = db.collection("agentRegistry").doc(agent.id);
                batch.set(regRef, {
                    ...agent,
                    createdAt: timestamp,
                    updatedAt: timestamp
                }, { merge: true });

                // Also ensure a v1.0.0 exists
                const verId = db.collection("agentVersions").doc().id;
                // We can't easily check for existing version in a batch without reading first.
                // For simplicity in this fallback tool, we'll just create a new version entry if the registry is empty.
                // Or better: Just create the registry entry. The detailed version creation might be too complex for a blind batch.
                // Let's create a v1.0.0 ONLY if we are creating the registry entry from scratch.
                // But merge: true makes that hard to know.

                // Let's just create a version doc with a specific ID to avoid dupes? No, versions are usually auto-id.
                // Let's create one Initial Version for each.
                const initVerRef = db.collection("agentVersions").doc(`${agent.id}-v1-0-0`);
                batch.set(initVerRef, {
                    agentId: agent.id,
                    version: "1.0.0",
                    isProduction: true,
                    status: "production",
                    config: { model: "deepseek-reasoner", temperature: 0.7 },
                    systemPrompt: `You are ${agent.name}. ${agent.description}`,
                    changelog: "Initial seed via Admin UI",
                    createdAt: timestamp
                }, { merge: true });

                count++;
            }

            await batch.commit();
            alert(`✅ Successfully seeded ${count} agents!`);
            // loadRegistry() will auto-update via listener

        } catch (e) {
            console.error(e);
            alert("Seeding failed: " + e.message);
        }
    };

    function setupEventListeners() {
        const searchInput = document.getElementById("profile-search");
        const categorySelect = document.getElementById("registry-category-filter");

        function applyFilters() {
            const term = searchInput ? searchInput.value.toLowerCase() : "";
            const category = categorySelect ? categorySelect.value : "all";

            filteredRegistry = registry.filter(agent => {
                const matchesSearch = agent.name.toLowerCase().includes(term) ||
                    agent.id.toLowerCase().includes(term) ||
                    agent.category.toLowerCase().includes(term);

                const matchesCategory = category === "all" || agent.category === category;

                return matchesSearch && matchesCategory;
            });
            renderTable();
        }

        if (searchInput) {
            searchInput.placeholder = "Search agents...";
            searchInput.oninput = applyFilters;
        }

        if (categorySelect) {
            categorySelect.onchange = applyFilters;
        }
    }

})();
