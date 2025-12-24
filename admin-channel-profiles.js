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

        const iconUpload = document.getElementById("channel-icon-upload");
        if (iconUpload) iconUpload.addEventListener('change', handleIconUpload);

        const addBtn = document.getElementById("add-channel-btn");
        if (addBtn) addBtn.addEventListener('click', openAddChannelModal);
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

    async function handleIconUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const previewContainer = document.getElementById('icon-preview-container');
        const hiddenInput = document.getElementById('channel-icon-svg');

        previewContainer.innerHTML = '<span style="font-size: 12px; color: #aaa;">Processing...</span>';

        if (file.type === 'image/svg+xml') {
            const text = await file.text();
            hiddenInput.value = text;
            previewContainer.innerHTML = text;
            const svg = previewContainer.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
            }
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // 1. Initial draw to analyze
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const removeBg = document.getElementById('remove-bg-checkbox')?.checked;
                    const trimSquare = document.getElementById('trim-square-checkbox')?.checked;
                    const roundCorners = document.getElementById('round-corners-checkbox')?.checked;

                    // 2. Background Removal
                    if (removeBg) {
                        const data = imageData.data;
                        // Sample corners
                        const corners = [
                            { r: data[0], g: data[1], b: data[2] }, // top-left
                            { r: data[(canvas.width - 1) * 4], g: data[(canvas.width - 1) * 4 + 1], b: data[(canvas.width - 1) * 4 + 2] }, // top-right
                        ];

                        corners.forEach(bg => {
                            const isWhite = (bg.r > 240 && bg.g > 240 && bg.b > 240);
                            const isBlack = (bg.r < 20 && bg.g < 20 && bg.b < 20);

                            if (isWhite || isBlack) {
                                const tolerance = 30;
                                for (let i = 0; i < data.length; i += 4) {
                                    const r = data[i], g = data[i + 1], b = data[i + 2];
                                    if (Math.abs(r - bg.r) < tolerance && Math.abs(g - bg.g) < tolerance && Math.abs(b - bg.b) < tolerance) {
                                        data[i + 3] = 0;
                                    }
                                }
                            }
                        });
                        ctx.putImageData(imageData, 0, 0);
                    }

                    // 3. Trimming
                    let targetX = 0, targetY = 0, targetWidth = img.width, targetHeight = img.height;
                    if (trimSquare) {
                        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                        let found = false;

                        for (let y = 0; y < canvas.height; y++) {
                            for (let x = 0; x < canvas.width; x++) {
                                const alpha = data[(y * canvas.width + x) * 4 + 3];
                                if (alpha > 10) {
                                    minX = Math.min(minX, x);
                                    minY = Math.min(minY, y);
                                    maxX = Math.max(maxX, x);
                                    maxY = Math.max(maxY, y);
                                    found = true;
                                }
                            }
                        }

                        if (found) {
                            const padding = 2;
                            targetX = Math.max(0, minX - padding);
                            targetY = Math.max(0, minY - padding);
                            targetWidth = Math.min(canvas.width - targetX, (maxX - minX) + (padding * 2));
                            targetHeight = Math.min(canvas.height - targetY, (maxY - minY) + (padding * 2));
                        }
                    }

                    // 4. Create Normalized SVG (Centered 100x100)
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = targetWidth;
                    tempCanvas.height = targetHeight;
                    tempCanvas.getContext('2d').drawImage(canvas, targetX, targetY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

                    const finalBase64 = tempCanvas.toDataURL('image/png');

                    // Calculate scaling to fit in 100x100 keeping aspect ratio
                    const scale = Math.min(90 / targetWidth, 90 / targetHeight);
                    const drawWidth = targetWidth * scale;
                    const drawHeight = targetHeight * scale;
                    const xOffset = (100 - drawWidth) / 2;
                    const yOffset = (100 - drawHeight) / 2;

                    let svgString = '';
                    if (roundCorners) {
                        const radius = Math.min(drawWidth, drawHeight) * 0.15; // 15% radius
                        const clipId = `round-clip-${Date.now()}`;
                        svgString = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="${clipId}">
      <rect x="${xOffset}" y="${yOffset}" width="${drawWidth}" height="${drawHeight}" rx="${radius}" ry="${radius}" />
    </clipPath>
  </defs>
  <image href="${finalBase64}" x="${xOffset}" y="${yOffset}" width="${drawWidth}" height="${drawHeight}" clip-path="url(#${clipId})" />
</svg>`;
                    } else {
                        svgString = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <image href="${finalBase64}" x="${xOffset}" y="${yOffset}" width="${drawWidth}" height="${drawHeight}" />
</svg>`;
                    }

                    hiddenInput.value = svgString;
                    previewContainer.innerHTML = svgString;
                    const svg = previewContainer.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('width', '100%');
                        svg.setAttribute('height', '100%');
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert("Please upload an SVG, PNG, or JPG file.");
            previewContainer.innerHTML = '❌';
        }
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
                        <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 6px; background: rgba(255,255,255,0.05); flex-shrink: 0;">
                            ${getChannelIcon(p.id, p).replace('<svg', '<svg style="width:100%; height:100%;"')} 
                        </div>
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

    function getChannelIcon(id, profile) {
        if (profile && profile.icon) return profile.icon;

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
    // Modal Functions
    function openAddChannelModal() {
        const modal = document.getElementById('channel-modal');
        if (!modal) return;

        // Reset form
        document.getElementById('channel-form').reset();
        document.getElementById('channel-id').value = ''; // Empty for new
        document.getElementById('channel-id-input').value = '';
        document.getElementById('channel-icon-svg').value = '';
        document.getElementById('icon-preview-container').innerHTML = '<span style="font-size: 24px;">🌐</span>';

        // UI State for Add
        document.getElementById('modal-title').textContent = 'Add Channel Profile';
        document.getElementById('channel-id-group').style.display = 'block'; // Show ID input

        modal.style.display = 'flex';
        modal.classList.add('open');
    }

    window.editProfile = function (id) {
        // ... (logging omitted)
        const profile = profiles.find(p => p.id === id);
        if (!profile) return;

        let modal = document.getElementById('channel-modal');
        if (!modal) return;

        // Ensure modal is in body
        if (modal.parentElement.id === 'admin-content') {
            document.body.appendChild(modal);
        }

        // UI State for Edit
        document.getElementById('modal-title').textContent = 'Edit Channel Profile';
        document.getElementById('channel-id-group').style.display = 'none'; // Hide ID input (use hidden field)

        document.getElementById('channel-id').value = profile.id;
        document.getElementById('channel-name').value = profile.name;
        document.getElementById('channel-content-types').value = (profile.contentTypes || []).join(', ');
        document.getElementById('channel-version').value = profile.version || '1.0.0';

        // Preload Icon
        const hiddenInput = document.getElementById('channel-icon-svg');
        const previewContainer = document.getElementById('icon-preview-container');
        const fileInput = document.getElementById('channel-icon-upload');

        fileInput.value = ''; // Reset file input
        hiddenInput.value = profile.icon || '';

        if (profile.icon && profile.icon.trim().startsWith('<svg')) {
            previewContainer.innerHTML = profile.icon;
            // Force size in preview
            const svg = previewContainer.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
            }
        } else {
            previewContainer.innerHTML = '<span style="font-size: 24px;">🌐</span>';
        }

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
        let id = document.getElementById('channel-id').value;
        const newIdInput = document.getElementById('channel-id-input').value;

        // If no hidden ID, use the manual input (Creation Mode)
        if (!id && newIdInput) {
            id = newIdInput.trim();
        }

        if (!id) {
            alert("Channel ID is required!");
            return;
        }

        const saveBtn = document.getElementById('modal-save');

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const name = document.getElementById('channel-name').value;
            const contentTypes = document.getElementById('channel-content-types').value.split(',').map(s => s.trim()).filter(Boolean);
            const currentVersion = document.getElementById('channel-version').value;

            // Parse JSON fields
            let lengthRules = {}, interactionStyle = {}, seoRules = {}, kpiWeights = {};
            try { lengthRules = JSON.parse(document.getElementById('channel-length-rules').value || '{}'); } catch (e) { }
            try { interactionStyle = JSON.parse(document.getElementById('channel-interaction-style').value || '{}'); } catch (e) { }
            try { seoRules = JSON.parse(document.getElementById('channel-seo-rules').value || '{}'); } catch (e) { }
            try { kpiWeights = JSON.parse(document.getElementById('channel-kpi-weights').value || '{}'); } catch (e) { }

            // Get current profile for backup (if exists)
            const docRef = db.collection('channelProfiles').doc(id);
            const currentProfileDoc = await docRef.get();
            const currentProfile = currentProfileDoc.exists ? currentProfileDoc.data() : null;

            // Versioning Logic
            let newVersion = currentVersion;
            if (currentProfile) {
                // Auto-increment version for updates
                const versionParts = (currentVersion || '1.0.0').split('.');
                const major = parseInt(versionParts[0]) || 1;
                const minor = parseInt(versionParts[1]) || 0;
                const patch = parseInt(versionParts[2]) || 0;
                newVersion = `${major}.${minor}.${patch + 1}`;

                // Backup
                // Backup (Soft Fail)
                try {
                    await db.collection('channelProfileVersions').add({
                        profileId: id,
                        version: currentProfile.version,
                        data: currentProfile,
                        archivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        archivedBy: firebase.auth().currentUser?.email || 'unknown'
                    });
                } catch (backupError) {
                    console.warn("⚠️ Failed to create version backup (Permission Issue?):", backupError);
                    // Continue to save profile anyway
                }
            } else {
                newVersion = '1.0.0'; // Default for new
            }

            // Construct Data
            const profileData = {
                id: id,
                name: name,
                displayName: name,
                contentTypes,
                lengthRules,
                interactionStyle,
                seoRules,
                kpiWeights,
                icon: document.getElementById('channel-icon-svg').value,
                version: newVersion,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser?.email || 'unknown',
                status: 'active' // Default active
            };

            // Use set with merge
            await docRef.set(profileData, { merge: true });

            console.log(`✅ Profile saved: ${id} (v${newVersion})`);
            alert(`Channel Profile '${id}' saved successfully!`);
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
