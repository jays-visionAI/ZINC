// admin-runtime-profiles.js
// Runtime Profile Management
// Logic: Router-Centric (No explicit Tiers, No specific Model Names in Admin)

(function () {
    console.log("[RuntimeProfiles] JS Loaded - Version: 3.0 (Router-Centric Abstraction) - CLEAN");
    let db = firebase.firestore();
    let profiles = [];
    let filteredProfiles = [];
    let unsubscribe = null;
    const projectId = "default_project";

    // --- Dynamic Script Loading ---
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    async function loadDependencies() {
        try {
            await loadScript('utils-runtime-profile.js');
            console.log('[RuntimeProfiles] Dependencies loaded');
            return true;
        } catch (error) {
            console.error('[RuntimeProfiles] Error loading dependencies:', error);
            return false;
        }
    }

    window.initRuntimeProfiles = async function (user) {
        console.log("Initializing Runtime Profiles Page...");
        const loaded = await loadDependencies();
        if (!loaded) return;

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        profiles = [];
        filteredProfiles = [];

        loadProfiles();
        setupEventListeners();
    };

    // --- Helpers ---
    function maximize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Alias for existing code using capitalization
    const capitalize = maximize;

    function populateDropdowns() {
        const langSelect = document.getElementById('profile-language');
        if (!langSelect) return;
        langSelect.innerHTML = '<option value="english">ENGLISH</option><option value="korean">KOREAN</option><option value="spanish">SPANISH</option><option value="japanese">JAPANESE</option>';
    }

    // --- Dynamic Input Logic ---
    window.toggleModelInputMode = function () {
        const providerEl = document.getElementById('profile-provider');
        if (!providerEl) return;

        const provider = providerEl.value;
        const textInput = document.getElementById('profile-model');
        const selectInput = document.getElementById('profile-model-select');

        if (!textInput || !selectInput) {
            console.warn("[RuntimeProfiles] Model input elements not found.");
            return;
        }

        if (provider === 'llm_router') {
            textInput.style.display = 'none';
            selectInput.style.display = 'block';
            textInput.removeAttribute('required');
        } else {
            textInput.style.display = 'block';
            selectInput.style.display = 'none';
            textInput.setAttribute('required', 'true');
        }
    };

    // --- Modal Logic ---
    function openModal(profileData = null) {
        const modal = document.getElementById('profile-modal');
        const form = document.getElementById('profile-form');
        const title = document.getElementById('modal-title');

        populateDropdowns();
        form.reset();

        // Default: Create Mode
        if (!profileData) {
            title.textContent = 'Create Runtime Profile';
            document.getElementById('profile-id').disabled = false;
            document.getElementById('profile-provider').value = 'llm_router';
            document.getElementById('profile-model').value = 'gpt-4o';
            document.getElementById('profile-model-select').value = 'reasoning_optimized';
        } else {
            // Edit Mode
            title.textContent = 'Edit Runtime Profile';
            document.getElementById('profile-doc-id').value = profileData.docId;
            document.getElementById('profile-id').value = profileData.id;
            document.getElementById('profile-id').disabled = true;

            document.getElementById('profile-name').value = profileData.name || '';
            document.getElementById('profile-desc').value = profileData.description || '';
            document.getElementById('profile-language').value = profileData.language || 'english';
            document.getElementById('profile-status').value = profileData.status || 'active';

            // Config
            document.getElementById('profile-provider').value = profileData.provider || 'llm_router';
            document.getElementById('profile-model').value = profileData.model_id || '';

            // If it's one of the abstract tags, set the select
            const knownTags = ['reasoning_optimized', 'creative_optimized', 'technical_optimized', 'speed_optimized', 'image_optimized'];
            if (knownTags.includes(profileData.model_id)) {
                document.getElementById('profile-model-select').value = profileData.model_id;
            }

            // Capabilities
            document.getElementById('cap-chat').checked = profileData.capabilities?.chat || false;
            document.getElementById('cap-vision').checked = profileData.capabilities?.vision || false;
            document.getElementById('cap-embedding').checked = profileData.capabilities?.embedding || false;
            document.getElementById('cap-image').checked = profileData.capabilities?.image_generation || false;
        }

        toggleModelInputMode();
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);
    }

    async function saveProfile(e) {
        e.preventDefault();
        const btn = document.getElementById('modal-save');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const docId = document.getElementById('profile-doc-id').value;
            const profileId = document.getElementById('profile-id').value;

            if (!profileId) throw new Error("Profile ID is required");

            // Model Resolution
            const provider = document.getElementById('profile-provider').value;
            let finalModelId = '';
            if (provider === 'llm_router') {
                finalModelId = document.getElementById('profile-model-select').value;
            } else {
                finalModelId = document.getElementById('profile-model').value;
            }

            const data = {
                id: profileId,
                runtime_profile_id: profileId,
                name: document.getElementById('profile-name').value,
                description: document.getElementById('profile-desc').value,
                language: document.getElementById('profile-language').value,
                status: document.getElementById('profile-status').value,

                provider: provider,
                model_id: finalModelId,

                capabilities: {
                    chat: document.getElementById('cap-chat').checked,
                    vision: document.getElementById('cap-vision').checked,
                    embedding: document.getElementById('cap-embedding').checked,
                    image_generation: document.getElementById('cap-image').checked
                },
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!docId) {
                // Create
                data.created_at = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('runtimeProfileRules').doc(profileId).set(data);
            } else {
                // Update
                await db.collection('runtimeProfileRules').doc(docId).update(data);
            }

            closeModal();
            // alert('Saved!'); // Optional feedback
        } catch (error) {
            console.error("Error saving:", error);
            alert("Error: " + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Profile';
        }
    }

    function closeModal() {
        const modal = document.getElementById('profile-modal');
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 200);
    }

    // --- Loading & Rendering ---
    function loadProfiles() {
        const tbody = document.getElementById("profiles-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

        unsubscribe = db.collection('runtimeProfileRules').onSnapshot(snap => {
            profiles = [];
            snap.forEach(doc => profiles.push({ docId: doc.id, ...doc.data() }));

            // Sort by updated_at desc
            profiles.sort((a, b) => (b.updated_at?.seconds || 0) - (a.updated_at?.seconds || 0));

            filteredProfiles = [...profiles];
            handleFilters();
        });
    }

    function handleFilters() {
        const searchInput = document.getElementById("profile-search");
        const capFilter = document.getElementById("filter-capability");

        let searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        let selectedCap = capFilter ? capFilter.value : 'all';

        filteredProfiles = profiles.filter(p => {
            const matchesSearch = (p.id || '').toLowerCase().includes(searchTerm) ||
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No profiles found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredProfiles.map(rule => {
            let engineDisplay = '';

            if (rule.provider === 'llm_router') {
                engineDisplay = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="color:#fff; font-weight:500;">LLM Router / ${rule.model_id.replace('_optimized', '').toUpperCase()}</span>
                        <span style="color:#a855f7; font-size:11px;">● Auto-Resolved by System</span>
                    </div>
                 `;
            } else if (rule.provider) {
                engineDisplay = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="color:#fff; font-weight:500;">${capitalize(rule.provider)} / ${rule.model_id}</span>
                        <span style="color:#16e0bd; font-size:11px;">● Router Auto-Scaling</span>
                    </div>
                 `;
            } else {
                engineDisplay = '<span style="color:gray;">Not Configured</span>';
            }

            return `
                <tr style="cursor:pointer;" onclick="viewRuleDetails('${rule.docId}')">
                    <td>
                        <div style="color:#16e0bd; font-weight:600;">${rule.id}</div>
                        <div style="color:rgba(255,255,255,0.5); font-size:11px;">${rule.name || ''}</div>
                    </td>
                    <td>${rule.language || 'Global'}</td>
                    <td>${engineDisplay}</td>
                    <td>
                        <span class="admin-badge ${rule.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                            ${capitalize(rule.status || 'unknown')}
                        </span>
                    </td>
                    <td>${rule.updated_at ? new Date(rule.updated_at.seconds * 1000).toLocaleDateString() : '-'}</td>
                    <td><button class="admin-btn-secondary" onclick="event.stopPropagation(); viewRuleDetails('${rule.id}')">Edit</button></td>
                </tr>
             `;
        }).join('');
    }

    // Global Exposure
    window.viewRuleDetails = function (docId) {
        const profile = profiles.find(p => p.docId === docId || p.id === docId);
        if (profile) openModal(profile);
    };

    function setupEventListeners() {
        // Clean up old listeners (simple way: clone node, or just re-add since we reloaded script)
        // In SPA, best to rely on initRuntimeProfiles re-binding.

        const searchInput = document.getElementById("profile-search");
        const capFilter = document.getElementById("filter-capability");
        const addBtn = document.getElementById("add-profile-btn");
        const form = document.getElementById('profile-form');
        const closeModalBtn = document.getElementById('close-modal-btn');

        if (addBtn) addBtn.onclick = () => openModal(null);
        if (searchInput) searchInput.oninput = handleFilters;
        if (capFilter) capFilter.onchange = handleFilters;

        // Modal Actions
        if (closeModalBtn) closeModalBtn.onclick = closeModal;

        const cancelBtn = document.getElementById('modal-cancel');
        if (cancelBtn) cancelBtn.onclick = closeModal;

        const saveBtn = document.getElementById('modal-save');
        if (saveBtn) {
            saveBtn.onclick = (e) => {
                // Manually trigger save, bypassing form submit weirdness
                saveProfile(e);
            };
        }

        if (form) form.onsubmit = saveProfile; // Keep backup
    }

})();
