// dashboard.js - ZINC Command Center Logic

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
        createProjectFab.addEventListener('click', openModal);
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

    if (hives.length === 0) {
        renderEmptyState();
        return;
    }

    hives.forEach(hive => {
        const card = createHiveCard(hive);
        hiveGrid.appendChild(card);
    });
}

function renderEmptyState() {
    hiveGrid.innerHTML = `
        <div class="create-project-card" onclick="openModal()" style="grid-column: 1 / -1; height: 300px;">
            <div class="create-icon" style="font-size: 3rem; margin-bottom: 1rem;">+</div>
            <div class="create-text" style="font-size: 1.2rem;">Create Your First Hive</div>
            <p style="color: var(--color-text-tertiary); margin-top: 0.5rem;">Launch a new project to start monitoring.</p>
        </div>
    `;
}

function createHiveCard(hive) {
    const card = document.createElement('div');

    // Determine classes based on status/category
    const statusClass = hive.status === 'ATTENTION' ? 'status-attention' : 'status-nominal';
    const badgeClass = hive.status === 'ATTENTION' ? 'attention' : 'nominal';
    const categoryLower = hive.category.toLowerCase();
    const tagClass = (categoryLower === 'blockchain' || categoryLower === 'general') ? categoryLower : 'general';

    // Format numbers
    const followerGrowth = hive.followerGrowth30d || 0;
    const followerDelta = hive.followerGrowthDelta || 0;
    const engagement = hive.engagementRate || 0;
    const engagementDelta = hive.engagementDelta || 0;

    card.className = `client-card ${statusClass}`;
    card.innerHTML = `
        <div class="card-header">
            <div class="client-info">
                <div style="width:24px;height:24px;background:${hive.colorHex || '#3B82F6'};border-radius:50%;"></div>
                <span class="client-name">${hive.name}</span>
            </div>
            <span class="status-badge ${badgeClass}">${hive.status}</span>
        </div>
        <div class="card-tags">
            <span class="tag ${tagClass}">${hive.category}</span>
        </div>
        <div class="card-metrics">
            <div class="metric-item">
                <span class="metric-label">Follower Growth (30d)</span>
                <span class="metric-value">${followerGrowth}% <span class="trend-up">▲ ${followerDelta}%</span></span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Engagement Rate</span>
                <span class="metric-value">${engagement}% <span class="trend-up">▲ ${engagementDelta}%</span></span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Pending Approvals</span>
                <span class="metric-value">${hive.pendingApprovals || 0}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Agent Health</span>
                <span class="metric-value">${hive.agentHealthCurrent || 0}/${hive.agentHealthMax || 0}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-mission" onclick="jumpToMission('${hive.id}')">Jump to Mission Control</button>
            <button class="btn-settings">⚙</button>
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
