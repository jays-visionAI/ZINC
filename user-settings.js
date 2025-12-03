// user-settings.js

document.addEventListener("DOMContentLoaded", () => {
    // Auth Check
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initSettings(user);
        } else {
            window.location.href = "index.html";
        }
    });
});

let currentUser = null;
const SUPPORTED_PROVIDERS = [
    { id: 'instagram', name: 'Instagram', icon: '📸' },
    { id: 'x', name: 'X (Twitter)', icon: '🐦' },
    { id: 'youtube', name: 'YouTube', icon: '▶️' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'openai', name: 'OpenAI', icon: '🧠' },
    { id: 'anthropic', name: 'Anthropic', icon: '🤖' }
];

function initSettings(user) {
    currentUser = user;

    // Fill General Tab
    document.getElementById("display-name").value = user.displayName || "No Name";
    document.getElementById("email").value = user.email || "";

    // Load API Credentials
    loadApiCredentials();

    // Setup Modal Form
    document.getElementById("add-credential-form").addEventListener("submit", handleAddCredential);
}

// Tab Switching
window.switchTab = function (tabName) {
    // Update Tab UI
    document.querySelectorAll('.settings-tab').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.tab === tabName) el.classList.add('active');
    });

    // Update Content Visibility
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
    });
    document.getElementById(`tab-${tabName}`).style.display = 'block';
}

// Load Credentials
async function loadApiCredentials() {
    const container = document.getElementById("api-channels-container");
    if (!currentUser) return;

    try {
        const snapshot = await db.collection("userApiCredentials")
            .where("userId", "==", currentUser.uid)
            .orderBy("createdAt", "desc")
            .get();

        const credentials = [];
        snapshot.forEach(doc => {
            credentials.push({ id: doc.id, ...doc.data() });
        });

        renderApiSettings(credentials);
    } catch (error) {
        console.error("Error loading credentials:", error);
        container.innerHTML = `<div style="color: #ef4444; padding: 20px;">Error loading credentials: ${error.message}</div>`;
    }
}

function renderApiSettings(credentials) {
    const container = document.getElementById("api-channels-container");
    container.innerHTML = "";

    SUPPORTED_PROVIDERS.forEach(provider => {
        const providerCreds = credentials.filter(c => c.provider === provider.id);

        const section = document.createElement("div");
        section.className = "channel-section";
        section.innerHTML = `
            <div class="channel-header">
                <div class="channel-icon" style="background: rgba(255,255,255,0.1);">${provider.icon}</div>
                <h4 style="margin: 0; color: white;">${provider.name}</h4>
                <button class="admin-btn-secondary" style="margin-left: auto; padding: 4px 12px; font-size: 12px;" 
                    onclick="openAddModal('${provider.id}', '${provider.name}')">
                    + Add Credential
                </button>
            </div>
        `;

        if (providerCreds.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.style.padding = "16px";
            emptyState.style.background = "rgba(255,255,255,0.02)";
            emptyState.style.borderRadius = "8px";
            emptyState.style.color = "rgba(255,255,255,0.3)";
            emptyState.style.fontSize = "13px";
            emptyState.textContent = "No credentials configured.";
            section.appendChild(emptyState);
        } else {
            providerCreds.forEach(cred => {
                const card = document.createElement("div");
                card.className = "credential-card";

                const lastUsed = cred.lastUsedAt ? new Date(cred.lastUsedAt.seconds * 1000).toLocaleDateString() : 'Never';

                card.innerHTML = `
                    <div class="credential-info">
                        <h4>${cred.label}</h4>
                        <div class="credential-meta">
                            <span>Key: ${cred.maskedKey}</span>
                            <span>•</span>
                            <span>Last used: ${lastUsed}</span>
                        </div>
                    </div>
                    <div class="credential-actions">
                        <button class="admin-btn-secondary" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);"
                            onclick="deleteCredential('${cred.id}')">Delete</button>
                    </div>
                `;
                section.appendChild(card);
            });
        }

        container.appendChild(section);
    });
}

// Modal Logic
window.openAddModal = function (providerId, providerName) {
    document.getElementById("add-credential-modal").classList.add("open");
    document.getElementById("modal-provider").value = providerId;
    document.getElementById("modal-provider-display").value = providerName;
    document.getElementById("cred-label").value = "";
    document.getElementById("cred-key").value = "";
    document.getElementById("cred-desc").value = "";
    document.getElementById("cred-label").focus();
}

window.closeAddModal = function () {
    document.getElementById("add-credential-modal").classList.remove("open");
}

async function handleAddCredential(e) {
    e.preventDefault();

    if (!currentUser) return;

    const provider = document.getElementById("modal-provider").value;
    const label = document.getElementById("cred-label").value;
    const key = document.getElementById("cred-key").value;
    const desc = document.getElementById("cred-desc").value;

    // Simple masking logic
    let maskedKey = "";
    if (key.length > 8) {
        maskedKey = key.substring(0, 4) + "****" + key.substring(key.length - 4);
    } else {
        maskedKey = "****";
    }

    const btn = e.target.querySelector("button[type='submit']");
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        // TODO: In production, encrypt key via Cloud Functions + KMS
        // For PoC, we store maskedKey and assume key is handled securely elsewhere (or stored in a separate secure collection)
        // Here we simulate secure storage by NOT storing the raw key in the main object if possible, 
        // but for this demo we'll just store the masked version and metadata.

        await db.collection("userApiCredentials").add({
            userId: currentUser.uid,
            provider: provider,
            label: label,
            description: desc,
            maskedKey: maskedKey,
            // encryptedKey: encrypt(key), // Placeholder for real implementation
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            usageCount: 0
        });

        closeAddModal();
        loadApiCredentials(); // Reload list
    } catch (error) {
        console.error("Error saving credential:", error);
        alert("Failed to save credential: " + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.deleteCredential = async function (id) {
    if (!confirm("Are you sure you want to delete this credential? This may break connected agents.")) return;

    try {
        await db.collection("userApiCredentials").doc(id).delete();
        loadApiCredentials();
    } catch (error) {
        console.error("Error deleting credential:", error);
        alert("Failed to delete credential.");
    }
}
