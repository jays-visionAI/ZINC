// admin-runtime-profiles.js
// Runtime Profile Management

(function () {
    let profiles = [];
    let filteredProfiles = [];
    let unsubscribe = null;
    const projectId = "default_project"; // In real app, this might be global or system-level

    window.initRuntimeprofiles = function (user) {
        console.log("Initializing Runtime Profiles Page...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        profiles = [];
        filteredProfiles = [];

        loadProfiles();
        setupEventListeners();
    };

    function setupEventListeners() {
        const searchInput = document.getElementById("profile-search");
        const capFilter = document.getElementById("filter-capability");
        const addBtn = document.getElementById("add-profile-btn");
        const modalClose = document.getElementById("modal-close");
        const modalCancel = document.getElementById("modal-cancel");
        const modalSave = document.getElementById("modal-save");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (capFilter) capFilter.addEventListener("change", handleFilters);
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                console.log("Create Profile Button Clicked");
                openModal();
            });
        }
        if (modalClose) modalClose.addEventListener("click", closeModal);
        if (modalCancel) modalCancel.addEventListener("click", closeModal);
        if (modalSave) modalSave.addEventListener("click", saveProfile);
    }

    function loadProfiles() {
        const tbody = document.getElementById("profiles-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading profiles...</td></tr>';

        // Note: Runtime Profiles might be stored at root level or project level depending on design.
        // Based on PRD, they seem to be global definitions referenced by ID.
        // We'll store them in a root collection `runtimeProfiles` or project-level for now.
        // Let's assume project-level for Phase 2 simplicity, or root if we want them shared.
        // PRD says: /runtimeProfiles/{runtimeProfileId} -> Root collection implies shared.
        // But for safety in this demo, let's use `projects/${projectId}/runtimeProfiles` or just `runtimeProfiles`.
        // Let's stick to `projects/${projectId}/runtimeProfiles` to avoid permission issues in this env, 
        // or `runtimeProfiles` if we want to follow PRD strictly. 
        // Let's use `projects/${projectId}/runtimeProfiles` for now to keep it contained.

        unsubscribe = db.collection(`projects/${projectId}/runtimeProfiles`)
            .onSnapshot((snapshot) => {
                if (!document.getElementById("profiles-table-body")) {
                    if (unsubscribe) unsubscribe();
                    return;
                }

                profiles = [];
                snapshot.forEach(doc => {
                    profiles.push({ docId: doc.id, ...doc.data() });
                });

                profiles.sort((a, b) => {
                    if (!a.updated_at) return 1;
                    if (!b.updated_at) return -1;
                    return b.updated_at.seconds - a.updated_at.seconds;
                });

                filteredProfiles = [...profiles];
                handleFilters();
            }, (error) => {
                console.error("Error loading profiles:", error);
                if (document.getElementById("profiles-table-body")) {
                    document.getElementById("profiles-table-body").innerHTML =
                        `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error: ${error.message}</td></tr>`;
                }
            });
    }

    function handleFilters() {
        const searchInput = document.getElementById("profile-search");
        const capFilter = document.getElementById("filter-capability");

        if (!searchInput || !capFilter) return;

        const searchTerm = searchInput.value.toLowerCase();
        const selectedCap = capFilter.value;

        filteredProfiles = profiles.filter(p => {
            const matchesSearch = (p.runtime_profile_id || '').toLowerCase().includes(searchTerm) ||
                (p.name || '').toLowerCase().includes(searchTerm) ||
                (p.provider || '').toLowerCase().includes(searchTerm);

            const matchesCap = selectedCap === 'all' || (p.capabilities && p.capabilities[selectedCap]);

            return matchesSearch && matchesCap;
        });

        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById("profiles-table-body");
        if (!tbody) return;

        if (filteredProfiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No profiles found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredProfiles.map(p => `
            <tr style="cursor: pointer;" onclick="editProfile('${p.docId}')">
                <td>
                    <strong style="font-size: 14px; color: #16e0bd;">${p.runtime_profile_id}</strong>
                    <div style="font-size: 13px; margin-top: 2px;">${p.name}</div>
                </td>
                <td>
                    <div style="font-size: 13px;">${capitalize(p.provider)}</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5);">${p.model_id}</div>
                </td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${renderCapabilities(p.capabilities)}
                    </div>
                </td>
                <td>${getCostBadge(p.cost_hint?.tier)}</td>
                <td>${getStatusBadge(p.status)}</td>
                <td style="font-size: 12px; color: rgba(255,255,255,0.5);">${formatDate(p.updated_at)}</td>
                <td onclick="event.stopPropagation();">
                    <button onclick="editProfile('${p.docId}')" class="admin-btn-icon">✏️</button>
                </td>
            </tr>
        `).join('');
    }

    function renderCapabilities(caps) {
        if (!caps) return '-';
        const badges = [];
        if (caps.chat) badges.push('<span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Chat</span>');
        if (caps.vision) badges.push('<span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Vision</span>');
        if (caps.embedding) badges.push('<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Embed</span>');
        if (caps.image_generation) badges.push('<span style="background: rgba(236, 72, 153, 0.2); color: #f472b6; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Img</span>');
        return badges.join('');
    }

    function getCostBadge(tier) {
        const colors = {
            cheap: '#22c55e',
            medium: '#fbbf24',
            expensive: '#ef4444'
        };
        const color = colors[tier] || '#94a3b8';
        return `<span style="color: ${color}; font-weight: 600; font-size: 12px;">${capitalize(tier || 'unknown')}</span>`;
    }

    function getStatusBadge(status) {
        const colors = {
            active: '#22c55e',
            testing: '#fbbf24',
            deprecated: '#ef4444'
        };
        const color = colors[status] || '#94a3b8';
        return `<span style="border: 1px solid ${color}; color: ${color}; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${capitalize(status || 'unknown')}</span>`;
    }

    // --- Modal Logic ---

    function openModal(profileData = null) {
        console.log("Opening Modal", profileData);
        const modal = document.getElementById('profile-modal');
        const form = document.getElementById('profile-form');
        const title = document.getElementById('modal-title');
        const docIdInput = document.getElementById('profile-doc-id');
        const profileIdInput = document.getElementById('profile-id');

        form.reset();
        profileIdInput.disabled = false; // Enable for new profile

        if (profileData) {
            docIdInput.value = profileData.docId || ''; // Use docId from the profiles array
            profileIdInput.value = profileData.runtime_profile_id || '';
            profileIdInput.disabled = true; // Disable ID for editing
            document.getElementById('profile-name').value = profileData.name || '';
            document.getElementById('profile-desc').value = profileData.description || '';
            document.getElementById('profile-provider').value = profileData.provider || 'openai';
            document.getElementById('profile-model').value = profileData.model_id || '';
            document.getElementById('cap-chat').checked = profileData.capabilities?.chat || false;
            document.getElementById('cap-vision').checked = profileData.capabilities?.vision || false;
            document.getElementById('cap-embedding').checked = profileData.capabilities?.embedding || false;
            document.getElementById('cap-image').checked = profileData.capabilities?.image_generation || false;
            document.getElementById('profile-cost').value = profileData.cost_hint?.tier || 'medium';
            document.getElementById('profile-status').value = profileData.status || 'active';
            title.textContent = 'Edit Runtime Profile';
        } else {
            // Create Mode: Explicitly clear hidden IDs to prevent overwrite
            docIdInput.value = '';
            document.getElementById('profile-id').value = ''; // Clear Profile ID for new entry

            title.textContent = 'Create Runtime Profile';
        }

        modal.style.display = 'flex';
        // Use CSS class for opacity animation
        setTimeout(() => modal.classList.add('open'), 10);
    };

    function closeModal() {
        const modal = document.getElementById('profile-modal');
        modal.classList.remove('open');
        // Wait for fade animation before hiding
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    };

    window.editProfile = function (docId) {
        const profile = profiles.find(p => p.docId === docId);
        if (profile) {
            openModal(profile);
        }
    };

    async function saveProfile(e) {
        e.preventDefault();
        const btn = document.getElementById('modal-save');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const docId = document.getElementById('profile-doc-id').value;
            const profileId = document.getElementById('profile-id').value;

            if (!profileId) throw new Error("Profile ID is required");

            const data = {
                runtime_profile_id: profileId,
                name: document.getElementById('profile-name').value,
                description: document.getElementById('profile-desc').value,
                provider: document.getElementById('profile-provider').value,
                model_id: document.getElementById('profile-model').value,
                capabilities: {
                    chat: document.getElementById('cap-chat').checked,
                    vision: document.getElementById('cap-vision').checked,
                    embedding: document.getElementById('cap-embedding').checked,
                    image_generation: document.getElementById('cap-image').checked
                },
                cost_hint: {
                    tier: document.getElementById('profile-cost').value
                },
                status: document.getElementById('profile-status').value,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (docId) {
                // Update
                await db.collection(`projects/${projectId}/runtimeProfiles`).doc(docId).update(data);
            } else {
                // Create
                data.created_at = firebase.firestore.FieldValue.serverTimestamp();
                data.profile_version = '1.0.0';
                // Use profileId as doc ID for simplicity
                await db.collection(`projects/${projectId}/runtimeProfiles`).doc(profileId).set(data);
            }

            closeModal();
            alert('✅ Profile saved successfully!');
        } catch (error) {
            console.error("Error saving profile:", error);
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Profile';
        }
    }

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    }

})();
