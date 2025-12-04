// admin-runtime-profiles.js
// Runtime Profile Management

(function () {
    console.log("[RuntimeProfiles] JS Loaded - Version: 2.1 (Version Control Added)");
    let db = firebase.firestore();
    let profiles = [];
    let filteredProfiles = [];
    let unsubscribe = null;
    const projectId = "default_project"; // In real app, this might be global or system-level

    // --- Dynamic Script Loading ---
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src = "${src}"]`)) {
                console.log(`[RuntimeProfiles] Script already loaded: ${src} `);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`[RuntimeProfiles] Loaded: ${src} `);
                resolve();
            };
            script.onerror = () => {
                console.error(`[RuntimeProfiles] Failed to load: ${src} `);
                reject(new Error(`Failed to load ${src} `));
            };
            document.head.appendChild(script);
        });
    }

    async function loadDependencies() {
        try {
            // Load utils first, then migration script
            await loadScript('utils-runtime-profile.js');
            await loadScript('migrate-runtime-profiles.js');
            console.log('[RuntimeProfiles] All dependencies loaded');
            return true;
        } catch (error) {
            console.error('[RuntimeProfiles] Error loading dependencies:', error);
            alert('Failed to load required scripts. Please refresh the page.');
            return false;
        }
    }

    window.initRuntimeProfiles = async function (user) {
        console.log("Initializing Runtime Profiles Page...");

        // Load dependencies first
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

    // --- v2.0 Helpers ---

    function populateDropdowns() {
        const roleSelect = document.getElementById('profile-role');
        const langSelect = document.getElementById('profile-language');

        if (!roleSelect || !langSelect) return;

        // Clear existing
        roleSelect.innerHTML = '';
        langSelect.innerHTML = '';

        // Populate Roles
        if (window.RuntimeProfileUtils) {
            window.RuntimeProfileUtils.ROLE_TYPES.forEach(role => {
                const option = document.createElement('option');
                option.value = role;
                option.textContent = role;
                roleSelect.appendChild(option);
            });

            // Populate Languages
            window.RuntimeProfileUtils.LANGUAGES.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang;
                option.textContent = lang.toUpperCase();
                langSelect.appendChild(option);
            });
        }
    }

    function updateProfileIdPreview() {
        const role = document.getElementById('profile-role').value;
        const lang = document.getElementById('profile-language').value;
        const tier = document.getElementById('profile-tier').value;
        const idInput = document.getElementById('profile-id');
        const costHintInput = document.getElementById('profile-cost-hint');

        if (window.RuntimeProfileUtils && role && lang && tier) {
            const newId = window.RuntimeProfileUtils.buildRuntimeProfileId(role, lang, tier);
            // Only update if creating new or if user hasn't manually edited it (optional policy)
            // For v2, we enforce the naming convention, so we always update it in create mode.
            if (!document.getElementById('profile-doc-id').value) {
                idInput.value = newId;
            }
            costHintInput.value = tier; // Simple mapping for now
        }
    }

    function setupEventListeners() {
        const searchInput = document.getElementById("profile-search");
        const capFilter = document.getElementById("filter-capability");
        const addBtn = document.getElementById("add-profile-btn");

        // Disable Create Profile button (Read-only mode)
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.title = "Rule creation is disabled. Use Firestore Console or Seeder tool.";
            addBtn.style.opacity = "0.5";
            addBtn.style.cursor = "not-allowed";
            addBtn.addEventListener("click", (e) => {
                e.preventDefault();
                alert("⚠️ Runtime Profile Rules are Read-only\n\nTo create or modify rules, please use:\n• Firestore Console\n• Seed Runtime Profile Rules tool\n• Migration scripts");
            });
        }

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (capFilter) capFilter.addEventListener("change", handleFilters);
    }

    function loadProfiles() {
        const tbody = document.getElementById("profiles-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading runtime profile rules...</td></tr>';

        // Phase 2: Use runtimeProfileRules collection (Admin-only, Read-only)
        unsubscribe = db.collection('runtimeProfileRules')
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
                    if (!a.updatedAt) return 1;
                    if (!b.updatedAt) return -1;
                    return b.updatedAt.seconds - a.updatedAt.seconds;
                });

                filteredProfiles = [...profiles];
                handleFilters();
            }, (error) => {
                console.error("Error loading runtime profile rules:", error);
                if (document.getElementById("profiles-table-body")) {
                    `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error: ${error.message}<br><small>Make sure you're logged in as Admin and 'runtimeProfileRules' collection exists.</small></td></tr>`;
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
            const matchesSearch = (p.id || '').toLowerCase().includes(searchTerm) ||
                (p.runtime_profile_id || '').toLowerCase().includes(searchTerm) ||
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No runtime profile rules found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredProfiles.map(rule => {
            // Build tiers summary (using 'models' from Rule schema)
            const models = rule.models || rule.tiers || {};
            const tiersSummary = ['balanced', 'creative', 'precise']
                .filter(tier => models[tier])
                .map(tier => {
                    const config = models[tier];
                    return `<div style="font-size: 11px; margin-bottom: 4px;">
                        <strong>${capitalize(tier)}:</strong> ${config.model_id || 'N/A'} 
                        (${config.max_tokens || 0} tokens, temp: ${config.temperature || 0})
                    </div>`;
                }).join('');

            return `
            <tr style="cursor: pointer;" onclick="viewRuleDetails('${rule.docId}')">
                <td>
                    <strong style="font-size: 14px; color: #16e0bd;">${rule.id}</strong>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">Engine: ${rule.engine_type || 'N/A'}</div>
                </td>
                <td>
                    <div style="font-size: 13px;">Global</div>
                    ${rule.language_overrides ? `<div style="font-size: 10px; color: rgba(255,255,255,0.4);">+ ${Object.keys(rule.language_overrides).length} overrides</div>` : ''}
                </td>
                <td style="font-size: 12px;">
                    ${tiersSummary || '<span style="color: rgba(255,255,255,0.3);">No tiers defined</span>'}
                </td>
                <td>${getStatusBadge(rule.status || 'active')}</td>
                <td style="font-size: 12px; color: rgba(255,255,255,0.5);">${formatDate(rule.updatedAt)}</td>
                <td>
                    <span style="font-size: 11px; color: rgba(255,255,255,0.4);">Read-only</span>
                </td>
            </tr>
        `}).join('');
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
            economy: '#22c55e',
            balanced: '#fbbf24',
            premium: '#ef4444'
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
        const saveBtn = document.getElementById('modal-save');
        const saveAsNewBtn = document.getElementById('modal-save-as-new');

        // Ensure dropdowns are populated
        populateDropdowns();

        form.reset();

        // Reset button visibility
        if (saveBtn) saveBtn.style.display = 'inline-block';
        if (saveAsNewBtn) saveAsNewBtn.style.display = 'none';

        if (profileData) {
            // EDIT MODE - Make core fields READ-ONLY
            title.textContent = 'Edit Runtime Profile (Read-Only)';

            docIdInput.value = profileData.docId || '';
            profileIdInput.value = profileData.id || profileData.runtime_profile_id || '';
            profileIdInput.disabled = true; // Always disabled in edit

            document.getElementById('profile-name').value = profileData.name || '';
            document.getElementById('profile-desc').value = profileData.description || '';

            // Core immutable fields - READ ONLY
            const providerSelect = document.getElementById('profile-provider');
            const modelInput = document.getElementById('profile-model');
            const roleSelect = document.getElementById('profile-role');
            const langSelect = document.getElementById('profile-language');
            const tierSelect = document.getElementById('profile-tier');

            providerSelect.value = profileData.provider || 'openai';
            providerSelect.disabled = true;

            modelInput.value = profileData.model_id || '';
            modelInput.readOnly = true;

            if (profileData.role_type) {
                roleSelect.value = profileData.role_type;
                roleSelect.disabled = true;
            }
            if (profileData.language) {
                langSelect.value = profileData.language;
                langSelect.disabled = true;
            }
            if (profileData.tier) {
                tierSelect.value = profileData.tier;
                tierSelect.disabled = true;
            }

            // Capabilities - READ ONLY
            const capChat = document.getElementById('cap-chat');
            const capVision = document.getElementById('cap-vision');
            const capEmbedding = document.getElementById('cap-embedding');
            const capImage = document.getElementById('cap-image');

            capChat.checked = profileData.capabilities?.chat || false;
            capChat.disabled = true;
            capVision.checked = profileData.capabilities?.vision || false;
            capVision.disabled = true;
            capEmbedding.checked = profileData.capabilities?.embedding || false;
            capEmbedding.disabled = true;
            capImage.checked = profileData.capabilities?.image_generation || false;
            capImage.disabled = true;

            // Status - EDITABLE (can deprecate)
            document.getElementById('profile-status').value = profileData.status || 'active';

            // Show "Save as New Version" button instead of "Save"
            if (saveBtn) saveBtn.style.display = 'none';
            if (saveAsNewBtn) {
                console.log("[VersionControl] Attaching listener to Save as New button", saveAsNewBtn);
                saveAsNewBtn.style.display = 'inline-block';
                // Remove existing listener to prevent duplicates
                saveAsNewBtn.removeEventListener('click', saveAsNewVersion);
                // Attach new listener
                saveAsNewBtn.addEventListener('click', saveAsNewVersion);
            } else {
                console.error("[VersionControl] Save as New button NOT FOUND in openModal");
            }

        } else {
            // CREATE MODE - All fields editable
            title.textContent = 'Create Runtime Profile';

            docIdInput.value = '';
            profileIdInput.value = '';
            profileIdInput.disabled = false;

            // Enable all fields
            document.getElementById('profile-provider').disabled = false;
            document.getElementById('profile-model').readOnly = false;
            document.getElementById('profile-role').disabled = false;
            document.getElementById('profile-language').disabled = false;
            document.getElementById('profile-tier').disabled = false;

            document.getElementById('cap-chat').disabled = false;
            document.getElementById('cap-vision').disabled = false;
            document.getElementById('cap-embedding').disabled = false;
            document.getElementById('cap-image').disabled = false;

            // Trigger ID generation for defaults
            updateProfileIdPreview();

            // Show normal "Save" button
            if (saveBtn) saveBtn.style.display = 'inline-block';
            if (saveAsNewBtn) saveAsNewBtn.style.display = 'none';
        }

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);
    }

    function closeModal() {
        const modal = document.getElementById('profile-modal');
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    async function saveAsNewVersion(e) {
        e.preventDefault();
        console.log("[VersionControl] saveAsNewVersion started");
        const btn = document.getElementById('modal-save-as-new');
        btn.disabled = true;
        btn.textContent = 'Saving New Version...';

        try {
            const oldDocId = document.getElementById('profile-doc-id').value;
            const oldProfileId = document.getElementById('profile-id').value;

            console.log(`[VersionControl] Old Doc ID: ${oldDocId}, Old Profile ID: ${oldProfileId} `);

            if (!oldDocId) throw new Error("Original Document ID is missing");

            // Get current profile data to find version
            console.log("[VersionControl] Fetching old profile data...");
            const oldProfileDoc = await db.collection('runtimeProfileRules').doc(oldDocId).get();

            if (!oldProfileDoc.exists) {
                throw new Error(`Original profile document not found: ${oldDocId} `);
            }

            const oldData = oldProfileDoc.data();
            console.log("[VersionControl] Old Data fetched:", oldData);

            // Calculate new version
            let currentVersion = 1;
            const versionMatch = oldProfileId.match(/_v(\d+)$/);
            if (versionMatch) {
                currentVersion = parseInt(versionMatch[1]);
            } else if (oldData.version_number) {
                currentVersion = oldData.version_number;
            }

            const newVersion = currentVersion + 1;

            // Generate new ID: remove old version suffix if present, add new one
            let baseId = oldProfileId.replace(/_v\d+$/, '');
            // If original ID didn't have version suffix but followed pattern, use it as base
            if (!baseId.endsWith('_v1')) {
                // It might be rtp_..._v1 already, regex handles it.
                // If it was rtp_..._v1, baseId is rtp_...
            }

            const newProfileId = `${baseId}_v${newVersion} `;

            const data = {
                id: newProfileId,
                runtime_profile_id: newProfileId,
                name: document.getElementById('profile-name').value,
                description: document.getElementById('profile-desc').value,

                // Immutable fields from old data (to ensure consistency)
                role_type: oldData.role_type,
                language: oldData.language,
                tier: oldData.tier,
                provider: oldData.provider,
                model_id: oldData.model_id,
                capabilities: oldData.capabilities,
                cost_hint: oldData.cost_hint,

                // Versioning Metadata
                version_number: newVersion,
                supersedes_profile_id: oldProfileId,
                superseded_by_profile_id: null,
                is_locked: true, // New versions are locked by default

                status: document.getElementById('profile-status').value,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 1. Check for existing Active profile with same Role/Lang/Tier
            if (data.status === 'active') {
                const activeSnapshot = await db.collection('runtimeProfileRules')
                    .where('role_type', '==', data.role_type)
                    .where('language', '==', data.language)
                    .where('tier', '==', data.tier)
                    .where('status', '==', 'active')
                    .get();

                if (!activeSnapshot.empty) {
                    // Deprecate existing active profiles
                    const batch = db.batch();
                    activeSnapshot.forEach(doc => {
                        batch.update(doc.ref, {
                            status: 'deprecated',
                            updated_at: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    await batch.commit();
                    console.log(`[VersionControl] Deprecated ${activeSnapshot.size} old active profiles.`);
                }
            }

            // 2. Create New Profile
            await db.collection('runtimeProfileRules').doc(newProfileId).set(data);

            // 3. Update Old Profile to point to new one
            await db.collection('runtimeProfileRules').doc(oldDocId).update({
                superseded_by_profile_id: newProfileId,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            closeModal();
            alert(`✅ New Version Saved: ${newProfileId} `);

        } catch (error) {
            console.error("Error saving new version:", error);
            alert(`Error: ${error.message} `);
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Save as New Version';
        }
    }
    // Expose for debugging
    window.saveAsNewVersion = saveAsNewVersion;

    async function saveProfile(e) {
        e.preventDefault();
        const btn = document.getElementById('modal-save');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const docId = document.getElementById('profile-doc-id').value;
            const profileId = document.getElementById('profile-id').value;

            if (!profileId) throw new Error("Profile ID is required");

            // Common Data
            const data = {
                name: document.getElementById('profile-name').value,
                description: document.getElementById('profile-desc').value,
                status: document.getElementById('profile-status').value,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (docId) {
                // UPDATE MODE (Limited fields)
                // Core fields are read-only in UI, so we don't include them in update
                // to prevent tampering via console.
                await db.collection('runtimeProfileRules').doc(docId).update(data);
            } else {
                // CREATE MODE (All fields)
                data.id = profileId;
                data.runtime_profile_id = profileId;

                // v2.0 Fields
                data.role_type = document.getElementById('profile-role').value;
                data.language = document.getElementById('profile-language').value;
                data.tier = document.getElementById('profile-tier').value;

                data.provider = document.getElementById('profile-provider').value;
                data.model_id = document.getElementById('profile-model').value;

                data.capabilities = {
                    chat: document.getElementById('cap-chat').checked,
                    vision: document.getElementById('cap-vision').checked,
                    embedding: document.getElementById('cap-embedding').checked,
                    image_generation: document.getElementById('cap-image').checked
                };

                data.cost_hint = { tier: data.tier };
                data.version_number = 1;
                data.is_locked = true; // Lock immediately upon creation
                data.created_at = firebase.firestore.FieldValue.serverTimestamp();

                // Check for Active conflict
                if (data.status === 'active') {
                    const activeSnapshot = await db.collection('runtimeProfileRules')
                        .where('role_type', '==', data.role_type)
                        .where('language', '==', data.language)
                        .where('tier', '==', data.tier)
                        .where('status', '==', 'active')
                        .get();

                    if (!activeSnapshot.empty) {
                        const confirm = window.confirm(
                            `There is already an active profile for [${data.role_type} / ${data.language} / ${data.tier}].\n\nDo you want to deprecate the old one and activate this new one ? `
                        );
                        if (confirm) {
                            const batch = db.batch();
                            activeSnapshot.forEach(doc => {
                                batch.update(doc.ref, { status: 'deprecated' });
                            });
                            await batch.commit();
                        } else {
                            data.status = 'testing'; // Fallback to testing
                            alert("New profile saved as 'Testing' to avoid conflict.");
                        }
                    }
                }

                await db.collection('runtimeProfileRules').doc(profileId).set(data);
            }

            closeModal();
            alert('✅ Profile saved successfully!');
        } catch (error) {
            console.error("Error saving profile:", error);
            alert(`Error: ${error.message} `);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Profile';
        }
    }

    // --- Helper Functions ---

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    }

    window.editProfile = function (docId) {
        alert("⚠️ Runtime Profile Rules are Read-only\n\nThis screen is for viewing rules only.\nTo modify rules, please use Firestore Console or Seeder tools.");
    };

    window.viewRuleDetails = function (docId) {
        const rule = profiles.find(p => p.docId === docId);
        if (!rule) return;

        const models = rule.models || rule.tiers || {};
        let tiersDetail = '';

        ['balanced', 'creative', 'precise'].forEach(tier => {
            if (models[tier]) {
                const config = models[tier];
                tiersDetail += `\n\n${tier.toUpperCase()}:\n`;
                tiersDetail += `  Model: ${config.model_id || 'N/A'}\n`;
                tiersDetail += `  Max Tokens: ${config.max_tokens || 0}\n`;
                tiersDetail += `  Temperature: ${config.temperature || 0}\n`;
                tiersDetail += `  Provider: ${config.provider || 'N/A'}`;
            }
        });

        if (rule.language_overrides) {
            tiersDetail += `\n\nLANGUAGE OVERRIDES:\n${JSON.stringify(rule.language_overrides, null, 2)}`;
        }

        alert(`📋 Runtime Profile Rule Details\n\nRule ID: ${rule.id}\nEngine Type: ${rule.engine_type || 'N/A'}\nLanguage: ${rule.language || 'global'}\nStatus: ${rule.status || 'active'}${tiersDetail}\n\n⚠️ This is a read-only view.`);
    };

})();
