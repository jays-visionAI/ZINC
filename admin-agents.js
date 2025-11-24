// admin-agents.js

(function () {
    let agents = [];
    let filteredAgents = [];
    let unsubscribeAgents = null;

    window.initAgents = function (user) {
        console.log("Initializing Agents Master Page...");

        // Cleanup previous listener if exists
        if (unsubscribeAgents) {
            unsubscribeAgents();
            unsubscribeAgents = null;
        }

        // Reset state
        agents = [];
        filteredAgents = [];

        loadAgents();
        setupEventListeners();
    };

    function setupEventListeners() {
        // Search & Filter
        const searchInput = document.getElementById("agent-search");
        const categoryFilter = document.getElementById("filter-category");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (categoryFilter) categoryFilter.addEventListener("change", handleFilters);

        // Use Event Delegation for better reliability
        document.body.addEventListener('click', function (e) {
            // Add Agent Button
            if (e.target.id === 'add-agent-btn' || e.target.closest('#add-agent-btn')) {
                console.log("Add Agent button clicked (via delegation)");
                openModal();
            }

            // Close Button
            if (e.target.id === 'modal-close' || e.target.closest('#modal-close')) {
                closeModal();
            }

            // Cancel Button
            if (e.target.id === 'modal-cancel') {
                closeModal();
            }

            // Save Button
            if (e.target.id === 'modal-save') {
                saveAgent();
            }

            // Modal Background
            if (e.target.id === 'agent-modal') {
                closeModal();
            }
        });
    }

    function loadAgents() {
        const tbody = document.getElementById("agents-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading agents...</td></tr>';

        // Listen to 'agents' collection (Master Agents)
        unsubscribeAgents = db.collection("agents")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                // Check if we are still on the agents page
                if (!document.getElementById("agents-table-body")) {
                    if (unsubscribeAgents) unsubscribeAgents();
                    return;
                }

                agents = [];
                snapshot.forEach(doc => {
                    agents.push({ id: doc.id, ...doc.data() });
                });

                filteredAgents = [...agents];
                handleFilters();
            }, (error) => {
                console.error("Error loading agents:", error);
                if (document.getElementById("agents-table-body")) {
                    document.getElementById("agents-table-body").innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444;">Error loading agents: ${error.message}</td></tr>`;
                }
            });
    }

    function handleFilters() {
        const searchInput = document.getElementById("agent-search");
        const categoryFilter = document.getElementById("filter-category");

        if (!searchInput || !categoryFilter) return;

        const searchTerm = searchInput.value.toLowerCase();
        const categoryValue = categoryFilter.value;

        filteredAgents = agents.filter(a => {
            const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm) ||
                (a.role || "").toLowerCase().includes(searchTerm);
            const matchesCategory = categoryValue === "all" || a.category === categoryValue;

            return matchesSearch && matchesCategory;
        });

        renderAgentsTable();
    }

    function renderAgentsTable() {
        const tbody = document.getElementById("agents-table-body");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (filteredAgents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No agents found</td></tr>';
            return;
        }

        filteredAgents.forEach(a => {
            const tr = document.createElement("tr");

            const date = a.createdAt ? new Date(a.createdAt.seconds * 1000).toLocaleDateString() : "-";

            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            ${a.iconUrl ? `<img src="${a.iconUrl}" style="width: 100%; height: 100%; object-fit: cover;">` :
                    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`}
                        </div>
                        <span style="font-weight: 500; color: #fff;">${a.name || "Unnamed"}</span>
                    </div>
                </td>
                <td><span class="admin-status-badge admin-status-active">${a.category || "General"}</span></td>
                <td>${a.role || "-"}</td>
                <td>${a.model || "gpt-3.5-turbo"}</td>
                <td>
                    <div class="star-rating">
                        ${generateStars(a.rating || 5)}
                    </div>
                </td>
                <td>${date}</td>
                <td>
                    <button class="admin-btn-secondary" onclick="editAgent('${a.id}')">Edit</button>
                    <button class="admin-btn-secondary" style="background: #ef4444; margin-left: 8px;" onclick="deleteAgent('${a.id}', '${a.name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function generateStars(rating) {
        let stars = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<span class="star-filled">★</span>';
            } else {
                stars += '<span class="star-empty">★</span>';
            }
        }
        return stars;
    }

    // Modal Functions
    function openModal(agent = null) {
        console.log("openModal called");
        const modal = document.getElementById("agent-modal");
        const title = document.getElementById("modal-title");
        const form = document.getElementById("agent-form");

        console.log("Modal element found:", !!modal);

        if (!modal) {
            console.error("Agent modal element not found!");
            return;
        }

        form.reset();

        if (agent) {
            title.textContent = "Edit Agent";
            document.getElementById("agent-id").value = agent.id;
            document.getElementById("agent-name").value = agent.name || "";
            document.getElementById("agent-category").value = agent.category || "Marketing";
            document.getElementById("agent-role").value = agent.role || "";
            document.getElementById("agent-model").value = agent.model || "gpt-3.5-turbo";
            document.getElementById("agent-prompt").value = agent.systemPrompt || "";
            document.getElementById("agent-icon").value = agent.iconUrl || "";
        } else {
            title.textContent = "Add New Agent";
            document.getElementById("agent-id").value = "";
        }

        // Force display styles
        modal.style.display = "flex";
        modal.style.opacity = "1";
        modal.style.visibility = "visible";
        modal.style.zIndex = "9999";
        console.log("Modal display set to flex");
    }

    function closeModal() {
        const modal = document.getElementById("agent-modal");
        if (modal) modal.style.display = "none";
    }

    async function saveAgent() {
        const saveBtn = document.getElementById("modal-save");
        const id = document.getElementById("agent-id").value;

        const agentData = {
            name: document.getElementById("agent-name").value,
            category: document.getElementById("agent-category").value,
            role: document.getElementById("agent-role").value,
            model: document.getElementById("agent-model").value,
            systemPrompt: document.getElementById("agent-prompt").value,
            iconUrl: document.getElementById("agent-icon").value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!agentData.name || !agentData.role || !agentData.systemPrompt) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            if (id) {
                // Update existing
                await db.collection("agents").doc(id).update(agentData);
            } else {
                // Create new
                agentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("agents").add(agentData);
            }

            closeModal();
            // No need to reload, listener will handle it

        } catch (error) {
            console.error("Error saving agent:", error);
            alert(`Error saving agent: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Agent";
        }
    }

    // Expose global functions
    window.editAgent = (id) => {
        const agent = agents.find(a => a.id === id);
        if (agent) openModal(agent);
    };

    window.deleteAgent = async (id, name) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            await db.collection("agents").doc(id).delete();
        } catch (error) {
            console.error("Error deleting agent:", error);
            alert(`Error deleting agent: ${error.message}`);
        }
    };

    // Run immediately on first load
    window.initAgents();

})();
