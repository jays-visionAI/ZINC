// admin-channel-profiles.js
// Channel Profile Management Page

(function () {
    console.log("🔹 admin-channel-profiles.js loaded!");
    let profiles = [];
    let unsubscribe = null;

    window.initChannelProfiles = function (user) {
        console.log("Initializing Channel Profiles Page...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        profiles = [];

        // Move modal to body level (must be outside #admin-content for proper overlay)
        setTimeout(() => {
            const modal = document.getElementById('channel-modal');
            if (modal && modal.parentElement.id === 'admin-content') {
                console.log("🔹 Moving modal to body on init...");
                document.body.appendChild(modal);
            }
        }, 100);

        loadProfiles();
        setupEventListeners();
    };

    function setupEventListeners() {
        const searchInput = document.getElementById("channel-search");
        const modalClose = document.getElementById("modal-close");
        const modalCancel = document.getElementById("modal-cancel");
        const modalSave = document.getElementById("modal-save");

        if (searchInput) searchInput.addEventListener("input", handleSearch);
        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalCancel) modalCancel.addEventListener('click', closeModal);
        if (modalSave) modalSave.addEventListener('click', saveProfile);
    }

    function loadProfiles() {
        const tbody = document.getElementById("channels-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading profiles...</td></tr>';

        unsubscribe = db.collection('channelProfiles')
            .onSnapshot((snapshot) => {
                let rawProfiles = [];
                snapshot.forEach(doc => {
                    rawProfiles.push({ id: doc.id, ...doc.data() });
                });

                // Deduplicate: Group by name, keep best version
                const uniqueMap = new Map();

                rawProfiles.forEach(p => {
                    const name = p.name ? p.name.trim() : 'Unknown';

                    if (!uniqueMap.has(name)) {
                        uniqueMap.set(name, p);
                    } else {
                        const existing = uniqueMap.get(name);
                        if (isBetterProfile(p, existing)) {
                            uniqueMap.set(name, p);
                        }
                    }
                });

                profiles = Array.from(uniqueMap.values());

                // Sort by name
                profiles.sort((a, b) => a.name.localeCompare(b.name));

                renderTable(profiles);
            }, (error) => {
                console.error("Error loading profiles:", error);
                if (document.getElementById("channels-table-body")) {
                    document.getElementById("channels-table-body").innerHTML =
                        `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error: ${error.message}</td></tr>`;
                }
            });
    }

    function isBetterProfile(candidate, existing) {
        // 1. Prefer valid version format (e.g. v1.0.0 over vv1.0.0)
        const validVersionRegex = /^v\d+\.\d+\.\d+$/;
        const candValid = validVersionRegex.test(candidate.version);
        const existValid = validVersionRegex.test(existing.version);

        if (candValid && !existValid) return true;
        if (!candValid && existValid) return false;

        // 2. Prefer having updatedAt
        if (candidate.updatedAt && !existing.updatedAt) return true;
        if (!candidate.updatedAt && existing.updatedAt) return false;

        // 3. Prefer newer updatedAt
        if (candidate.updatedAt && existing.updatedAt) {
            const candDate = candidate.updatedAt.toDate ? candidate.updatedAt.toDate() : new Date(candidate.updatedAt);
            const existDate = existing.updatedAt.toDate ? existing.updatedAt.toDate() : new Date(existing.updatedAt);
            return candDate > existDate;
        }

        // 4. Fallback: Prefer shorter ID (assuming 'discord' is better than 'channel_discord_123')
        return candidate.id.length < existing.id.length;
    }

    function handleSearch() {
        const searchTerm = document.getElementById("channel-search").value.toLowerCase();
        const filtered = profiles.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.id.toLowerCase().includes(searchTerm)
        );
        renderTable(filtered);
    }

    function renderTable(data) {
        const tbody = document.getElementById("channels-table-body");
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No profiles found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(p => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${getChannelIcon(p.id)}
                        <strong>${p.name}</strong>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${(p.contentTypes || []).map(t =>
            `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 10px;">${t}</span>`
        ).join('')}
                    </div>
                </td>
                <td>${p.interactionStyle?.tone || '-'}</td>
                <td>
                    ${Object.keys(p.kpiWeights || {}).slice(0, 2).join(', ')}...
                </td>
                <td>
                    <span style="background: rgba(22, 224, 189, 0.2); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                        v${p.version || '1.0.0'}
                    </span>
                </td>
                <td>${formatDate(p.updatedAt)}</td>
                <td>
                    <button onclick="editProfile('${p.id}')" class="admin-btn-secondary" style="padding: 4px 8px; font-size: 12px;">
                        Edit
                    </button>
                    <button onclick="deleteProfile('${p.id}')" class="admin-btn-danger" style="padding: 4px 8px; font-size: 12px; margin-left: 4px; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.deleteProfile = async function (id) {
        if (!confirm('Are you sure you want to delete this channel profile? This cannot be undone.')) return;

        try {
            await db.collection('channelProfiles').doc(id).delete();
            console.log("✅ Profile deleted:", id);
            // UI updates automatically via onSnapshot
        } catch (error) {
            console.error("Error deleting profile:", error);
            alert("Error deleting profile: " + error.message);
        }
    };

    function getChannelIcon(id) {
        const icons = {
            instagram: '📸',
            x: '🐦',
            youtube: '▶️',
            medium: '📝',
            linkedin: '💼',
            facebook: '📘',
            tiktok: '🎵',
            pinterest: '📌',
            reddit: '🤖',
            threads: '🧵',
            snapchat: '👻',
            discord: '💬',
            telegram: '✈️'
        };
        return icons[id] || '🌐';
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Modal Functions
    window.editProfile = function (id) {
        console.log("🔹 editProfile called with id:", id);
        console.log("🔹 profiles array:", profiles);
        const profile = profiles.find(p => p.id === id);
        console.log("🔹 found profile:", profile);
        if (!profile) {
            console.error("❌ Profile not found for id:", id);
            return;
        }

        // Check if modal exists
        let modal = document.getElementById('channel-modal');
        console.log("🔹 Modal element:", modal);

        if (!modal) {
            console.error("❌ Modal element not found in DOM!");
            alert("Error: Modal not found. Please refresh the page.");
            return;
        }

        // Ensure modal is in body (not inside admin-content)
        if (modal.parentElement.id === 'admin-content') {
            console.log("🔹 Moving modal to body...");
            document.body.appendChild(modal);
        }

        document.getElementById('channel-id').value = profile.id;
        document.getElementById('channel-name').value = profile.name;
        document.getElementById('channel-content-types').value = (profile.contentTypes || []).join(', ');
        document.getElementById('channel-version').value = profile.version || '1.0.0';

        // JSON fields
        document.getElementById('channel-length-rules').value = JSON.stringify(profile.lengthRules || {}, null, 2);
        document.getElementById('channel-interaction-style').value = JSON.stringify(profile.interactionStyle || {}, null, 2);
        document.getElementById('channel-seo-rules').value = JSON.stringify(profile.seoRules || {}, null, 2);
        document.getElementById('channel-kpi-weights').value = JSON.stringify(profile.kpiWeights || {}, null, 2);

        console.log("🔹 Opening modal...");
        modal.style.display = 'flex';
        modal.classList.add('open');
    };

    function closeModal() {
        const modal = document.getElementById('channel-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('open');
        }
    }

    async function saveProfile() {
        const id = document.getElementById('channel-id').value;
        const saveBtn = document.getElementById('modal-save');

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const contentTypes = document.getElementById('channel-content-types').value.split(',').map(s => s.trim()).filter(Boolean);
            const currentVersion = document.getElementById('channel-version').value;

            // Parse JSON fields
            const lengthRules = JSON.parse(document.getElementById('channel-length-rules').value);
            const interactionStyle = JSON.parse(document.getElementById('channel-interaction-style').value);
            const seoRules = JSON.parse(document.getElementById('channel-seo-rules').value);
            const kpiWeights = JSON.parse(document.getElementById('channel-kpi-weights').value);

            // Get current profile for backup
            const currentProfileDoc = await db.collection('channelProfiles').doc(id).get();
            const currentProfile = currentProfileDoc.data();

            // Auto-increment version (patch version)
            const versionParts = currentVersion.split('.');
            const major = parseInt(versionParts[0]) || 1;
            const minor = parseInt(versionParts[1]) || 0;
            const patch = parseInt(versionParts[2]) || 0;
            const newVersion = `${major}.${minor}.${patch + 1}`;

            // Backup current version to history
            if (currentProfile) {
                await db.collection('channelProfileVersions').add({
                    profileId: id,
                    version: currentProfile.version,
                    data: currentProfile,
                    archivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    archivedBy: firebase.auth().currentUser?.email || 'unknown'
                });
            }

            // Update profile with new version
            await db.collection('channelProfiles').doc(id).update({
                contentTypes,
                lengthRules,
                interactionStyle,
                seoRules,
                kpiWeights,
                version: newVersion,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser?.email || 'unknown'
            });

            console.log(`✅ Profile updated: ${currentVersion} → ${newVersion}`);
            alert(`Profile updated successfully!\nVersion: ${currentVersion} → ${newVersion}`);
            closeModal();

        } catch (error) {
            console.error("Error saving profile:", error);
            alert(`Error: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Profile';
        }
    }

})();
