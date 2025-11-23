// command-center.js - ZINC Command Center Logic

// DOM Elements
const hiveGrid = document.getElementById('hive-grid');
const createProjectFab = document.getElementById('create-project-fab');
const createProjectModal = document.getElementById('create-project-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelCreateBtn = document.getElementById('cancel-create-btn');
const createProjectForm = document.getElementById('create-project-form');

// Stat Elements
const statTotalProjects = document.getElementById('stat-total-projects');
const statTotalAgents = document.getElementById('stat-total-agents');
const statPendingApprovals = document.getElementById('stat-pending-approvals');

// State
let currentUser = null;
let hivesUnsubscribe = null;

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Listen for Auth State Changes
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log("Dashboard: User logged in:", user.uid);
            subscribeToClientHives(user.uid);
            setupEventListeners();
        } else {
            console.log("Dashboard: No user, redirecting...");
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    // FAB & Modal
    if (createProjectFab) {
        // FAB Disabled as per user request
        // createProjectFab.addEventListener('click', openModal);
        createProjectFab.style.cursor = 'default';
        createProjectFab.style.opacity = '0.5';
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', closeModal);
    }

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === createProjectModal) {
            closeModal();
        }
    });

    // Form Submit
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', handleCreateProject);
    }
}

// --- Firestore Logic ---

function subscribeToClientHives(userId) {
    if (hivesUnsubscribe) {
        hivesUnsubscribe(); // Unsubscribe from previous listener if any
    }

    const db = firebase.firestore();

    // Seed sample data if needed
    seedVisionChainData(userId);

    // Listen to 'clientHives' collection for current user
    hivesUnsubscribe = db.collection('clientHives')
        .where('ownerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const hives = [];
            snapshot.forEach(doc => {
                hives.push({ id: doc.id, ...doc.data() });
            });

            renderHiveGrid(hives);
            updatePortfolioStats(hives);
        }, (error) => {
            console.error("Error fetching client hives:", error);
            if (error.code === 'failed-precondition') {
                console.warn("Firestore index might be missing. Check console for link.");
            }
        });
}

async function seedVisionChainData(userId) {
    const db = firebase.firestore();
    const hivesRef = db.collection('clientHives');

    // Check if VisionChain already exists to avoid duplicates
    const snapshot = await hivesRef.where('ownerId', '==', userId).where('name', '==', 'VisionChain').get();
    if (!snapshot.empty) return;

    console.log("Seeding VisionChain data...");
    const visionChain = {
        ownerId: userId,
        name: "VisionChain",
        category: "Blockchain",
        status: "NOMINAL",
        followerGrowth30d: 12.5,
        followerGrowthDelta: 12.5,
        engagementRate: 4.8,
        engagementDelta: 4.8,
        pendingApprovals: 10,
        agentHealthCurrent: 2,
        agentHealthMax: 2,
        colorHex: "#3B82F6",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await hivesRef.add(visionChain);
}

async function handleCreateProject(e) {
    e.preventDefault();

    const nameInput = document.getElementById('project-name');
    const categoryInput = document.getElementById('project-category');

    if (!nameInput.value || !categoryInput.value) return;

    const submitBtn = createProjectForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
        const db = firebase.firestore();

        // Default values for new project
        const newProject = {
            ownerId: currentUser.uid,
            name: nameInput.value,
            category: categoryInput.value,
            status: "NOMINAL",
            followerGrowth30d: 0,
            followerGrowthDelta: 0,
            engagementRate: 0,
            engagementDelta: 0,
            pendingApprovals: 0,
            agentHealthCurrent: 0,
            agentHealthMax: 5, // Default max health
            colorHex: getRandomColor(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('clientHives').add(newProject);

        closeModal();
        createProjectForm.reset();
        // Snapshot listener will auto-update UI

    } catch (error) {
        console.error("Error creating project:", error);
        alert("Failed to create project. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// --- Rendering Logic ---

function renderHiveGrid(hives) {
    if (!hiveGrid) return;
    hiveGrid.innerHTML = '';

    // Render existing hives
    hives.forEach(hive => {
        const card = createHiveCard(hive);
        hiveGrid.appendChild(card);
    });

    // Always append "Add Project" panel
    // If hives exist, it goes at the end. If empty, it's the first item.
    // User request: "If empty, show in first blank". This logic satisfies that.
    const addPanel = document.createElement('div');
    addPanel.className = 'add-project-panel';
    addPanel.onclick = openModal;
    addPanel.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <div class="add-project-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </div>
            <span style="color: var(--color-text-secondary); font-weight: 600;">Add New Project</span>
        </div>
    `;
    hiveGrid.appendChild(addPanel);
}

function createHiveCard(hive) {
    const card = document.createElement('div');
    card.className = 'hive-card';

    // Status Badge Logic
    const isAttention = hive.status === 'ATTENTION';
    const statusClass = isAttention ? 'attention' : '';

    // Delta Logic (Simplified for demo)
    const followerDeltaClass = (hive.followerGrowthDelta >= 0) ? 'positive' : 'negative';
    const engagementDeltaClass = (hive.engagementDelta >= 0) ? 'positive' : 'negative';
    const followerArrow = (hive.followerGrowthDelta >= 0) ? '▲' : '▼';
    const engagementArrow = (hive.engagementDelta >= 0) ? '▲' : '▼';

    card.innerHTML = `
        <div class="hive-card-header">
            <div class="hive-header-left">
                <div class="hive-title-row">
                    <div class="hive-icon">🌍</div>
                    <div class="hive-name">${hive.name}</div>
                </div>
                <div class="hive-tag">${hive.category}</div>
            </div>
            <div class="hive-status-badge ${statusClass}">${hive.status}</div>
        </div>
        
        <div class="hive-stats-grid">
            <!-- Follower Growth -->
            <div class="hive-stat-item">
                <div class="stat-icon-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Follower Growth (30d)</div>
                    <div class="stat-value-row">
                        <span class="stat-value">${hive.followerGrowth30d}%</span>
                        <span class="stat-delta ${followerDeltaClass}">${followerArrow} ${Math.abs(hive.followerGrowthDelta)}%</span>
                    </div>
                </div>
            </div>
            <!-- Engagement Rate -->
            <div class="hive-stat-item">
                <div class="stat-icon-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Engagement Rate</div>
                    <div class="stat-value-row">
                        <span class="stat-value">${hive.engagementRate}%</span>
                        <span class="stat-delta ${engagementDeltaClass}">${engagementArrow} ${Math.abs(hive.engagementDelta)}%</span>
                    </div>
                </div>
            </div>
            <!-- Pending Approvals -->
            <div class="hive-stat-item">
                <div class="stat-icon-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Pending Approvals</div>
                    <div class="stat-value-row">
                        <span class="stat-value">${hive.pendingApprovals}</span>
                    </div>
                </div>
            </div>
            <!-- Agent Health -->
            <div class="hive-stat-item">
                <div class="stat-icon-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Agent Health</div>
                    <div class="stat-value-row">
                        <span class="stat-value">${hive.agentHealthCurrent}/${hive.agentHealthMax}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="hive-card-actions">
            <button class="btn-mission-control" onclick="jumpToMission('${hive.id}')">Jump to Mission Control</button>
            <button class="btn-settings">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
        </div>
    `;
    return card;
}

function updatePortfolioStats(hives) {
    const totalProjects = hives.length;

    // Sum up agent max health (as proxy for total agents)
    const totalAgents = hives.reduce((sum, hive) => sum + (hive.agentHealthMax || 0), 0);

    // Sum up pending approvals
    const totalPending = hives.reduce((sum, hive) => sum + (hive.pendingApprovals || 0), 0);

    if (statTotalProjects) statTotalProjects.textContent = totalProjects;
    if (statTotalAgents) statTotalAgents.textContent = totalAgents;
    if (statPendingApprovals) statPendingApprovals.textContent = totalPending;
}

// --- UI Helpers ---

function openModal() {
    if (createProjectModal) {
        createProjectModal.style.display = 'flex';
        setTimeout(() => createProjectModal.classList.add('show'), 10);
    }
}

function closeModal() {
    if (createProjectModal) {
        createProjectModal.classList.remove('show');
        setTimeout(() => {
            createProjectModal.style.display = 'none';
        }, 300);
    }
}

function getRandomColor() {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function jumpToMission(hiveId) {
    console.log(`Jumping to Mission Control for Hive ID: ${hiveId}`);
    // Placeholder for future navigation
    // window.location.href = `mission-control.html?id=${hiveId}`;
}
