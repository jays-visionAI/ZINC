// Dashboard Logic

// DOM Elements
const projectGrid = document.querySelector('.hive-grid');
const createProjectBtn = document.getElementById('create-project-fab'); // We'll add this ID to HTML
const createModal = document.getElementById('create-project-modal'); // We'll add this ID to HTML
const closeModalBtn = document.getElementById('close-modal-btn'); // We'll add this ID to HTML
const createProjectForm = document.getElementById('create-project-form'); // We'll add this ID to HTML
const cancelCreateBtn = document.getElementById('cancel-create-btn'); // We'll add this ID to HTML

// State
let currentUser = null;
let projectsUnsubscribe = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Auth Listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            subscribeToProjects(user.uid);
            setupEventListeners();
        } else {
            // Redirect handled in command-center.html script, but good to be safe
            window.location.href = 'index.html';
        }
    });
});

// Event Listeners
function setupEventListeners() {
    // FAB Click
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', openModal);
    }

    // Close Modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', closeModal);
    }

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === createModal) {
            closeModal();
        }
    });

    // Form Submit
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', handleCreateProject);
    }
}

// Firestore: Subscribe to Projects
function subscribeToProjects(userId) {
    if (projectsUnsubscribe) {
        projectsUnsubscribe();
    }

    const db = firebase.firestore();

    // Order by createdAt desc to show newest first
    projectsUnsubscribe = db.collection('projects')
        .where('ownerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            renderProjects(snapshot.docs);
        }, (error) => {
            console.error("Error fetching projects:", error);
            // If error is due to missing index, we might need to create one. 
            // For now, let's try without ordering if it fails, or just log it.
            if (error.code === 'failed-precondition') {
                console.warn("Index might be missing. Check console link.");
            }
        });
}

// Render Projects
function renderProjects(docs) {
    if (!projectGrid) return;

    projectGrid.innerHTML = ''; // Clear existing content

    if (docs.length === 0) {
        // Show Empty State if no projects
        projectGrid.innerHTML = `
            <div class="create-project-card" onclick="openModal()">
                <div class="create-icon">+</div>
                <div class="create-text">Create New Project</div>
            </div>
        `;
        return;
    }

    docs.forEach(doc => {
        const project = doc.data();
        const card = createProjectCard(project);
        projectGrid.appendChild(card);
    });
}

// Create Project Card HTML
function createProjectCard(project) {
    const card = document.createElement('div');
    const statusClass = project.status === 'ATTENTION' ? 'status-attention' : 'status-nominal';
    const statusBadgeClass = project.status === 'ATTENTION' ? 'attention' : 'nominal';
    const categoryClass = project.category.toLowerCase() === 'blockchain' ? 'blockchain' : 'general';

    // Random color for icon if not set
    const iconColor = project.color || '#3B82F6';

    card.className = `client-card ${statusClass}`;
    card.innerHTML = `
        <div class="card-header">
            <div class="client-info">
                <div style="width:24px;height:24px;background:${iconColor};border-radius:50%;"></div>
                <span class="client-name">${project.projectName}</span>
            </div>
            <span class="status-badge ${statusBadgeClass}">${project.status}</span>
        </div>
        <div class="card-tags">
            <span class="tag ${categoryClass}">${project.category}</span>
        </div>
        <div class="card-metrics">
            <div class="metric-item">
                <span class="metric-label">Follower Growth (30d)</span>
                <span class="metric-value">${project.metrics.followerGrowth}% <span class="trend-up">▲ ${project.metrics.followerGrowth}%</span></span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Engagement Rate</span>
                <span class="metric-value">${project.metrics.engagementRate}% <span class="trend-up">▲ ${project.metrics.engagementRate}%</span></span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Pending Approvals</span>
                <span class="metric-value">${project.metrics.pendingApprovals}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Agent Health</span>
                <span class="metric-value">${project.metrics.agentHealth}/${project.metrics.agentHealthMax || 5}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-mission">Jump to Mission Control</button>
            <button class="btn-settings">⚙</button>
        </div>
    `;
    return card;
}

// Handle Create Project
async function handleCreateProject(e) {
    e.preventDefault();

    const nameInput = document.getElementById('project-name');
    const categoryInput = document.getElementById('project-category');

    if (!nameInput.value || !categoryInput.value) return;

    const submitBtn = createProjectForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
        const db = firebase.firestore();

        // Random metrics for demo purposes
        const newProject = {
            ownerId: currentUser.uid,
            projectName: nameInput.value,
            category: categoryInput.value,
            status: 'NOMINAL', // Default
            metrics: {
                followerGrowth: 0,
                engagementRate: 0,
                pendingApprovals: 0,
                agentHealth: 5,
                agentHealthMax: 5
            },
            color: getRandomColor(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('projects').add(newProject);

        closeModal();
        createProjectForm.reset();

    } catch (error) {
        console.error("Error creating project:", error);
        alert("Failed to create project. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Modal Functions
function openModal() {
    if (createModal) {
        createModal.style.display = 'flex';
        // Trigger reflow for animation
        setTimeout(() => {
            createModal.classList.add('show');
        }, 10);
    }
}

function closeModal() {
    if (createModal) {
        createModal.classList.remove('show');
        setTimeout(() => {
            createModal.style.display = 'none';
        }, 300); // Wait for transition
    }
}

// Utility
function getRandomColor() {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
    return colors[Math.floor(Math.random() * colors.length)];
}
