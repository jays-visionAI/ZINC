// command-center.js

document.addEventListener("DOMContentLoaded", () => {
    const hiveGrid = document.getElementById("hive-grid");
    const modal = document.getElementById("create-project-modal");
    const closeBtn = document.getElementById("close-modal-btn");
    const form = document.getElementById("create-project-form");

    // Wizard Elements
    const steps = document.querySelectorAll(".wizard-step");
    const indicators = document.querySelectorAll(".step-indicator");
    const btnNext = document.getElementById("next-step-btn");
    const btnPrev = document.getElementById("prev-step-btn");
    const btnLaunch = document.getElementById("launch-btn");

    // State
    let currentStep = 1;
    let draftId = null;
    let uploadedFiles = [];
    let currentUser = null;
    let availableIndustries = [];

    // 🔹 Auth Listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadProjects(); // Load non-draft projects
            loadIndustries(); // Load industry options
            // Note: We don't auto-check drafts here anymore, 
            // we check when user clicks "Add New Project"
        } else {
            // Redirect handled in HTML script
        }
    });

    // 🔹 Modal Logic
    const openModal = () => {
        console.log("openModal called");
        if (!modal) {
            console.error("Modal element not found!");
            return;
        }
        // Check for drafts first
        checkExistingDraft();
    };

    const closeModal = () => {
        if (!modal) return;
        modal.classList.remove("open");
    };

    // Close events
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // 🔹 Wizard Navigation
    btnNext.addEventListener("click", async () => {
        if (currentStep === 1) {
            if (!validateStep1()) return;
            await saveDraftStep1();
            goToStep(2);
        } else if (currentStep === 2) {
            await saveDraftStep2();
            updateSummary();
            goToStep(3);
        }
    });

    btnPrev.addEventListener("click", () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (currentStep === 3) {
            await finalizeProject();
        }
    });

    function goToStep(step) {
        currentStep = step;

        // Update UI Steps
        steps.forEach(el => el.classList.remove("active"));
        document.getElementById(`step-${step}`).classList.add("active");

        // Update Indicators
        indicators.forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove("active", "completed");
            if (s === step) el.classList.add("active");
            if (s < step) el.classList.add("completed");
        });

        // Update Buttons
        if (step === 1) {
            btnPrev.style.display = "none";
            btnNext.style.display = "block";
            btnLaunch.style.display = "none";
        } else if (step === 2) {
            btnPrev.style.display = "block";
            btnNext.style.display = "block";
            btnLaunch.style.display = "none";
        } else if (step === 3) {
            btnPrev.style.display = "block";
            btnNext.style.display = "none";
            btnLaunch.style.display = "block";
        }
    }

    // 🔹 Industry Loading
    function loadIndustries() {
        db.collection("industries")
            .where("isActive", "==", true)
            // .orderBy("order", "asc") // Removed to avoid index requirement
            .get()
            .then((snapshot) => {
                availableIndustries = [];
                snapshot.forEach(doc => {
                    availableIndustries.push({ id: doc.id, ...doc.data() });
                });

                // Client-side sort
                availableIndustries.sort((a, b) => (a.order || 0) - (b.order || 0));

                populateIndustryDropdown();
            })
            .catch((error) => {
                console.error("Error loading industries:", error);
                document.getElementById("industry").innerHTML = '<option value="">Failed to load industries</option>';
            });
    }

    function populateIndustryDropdown() {
        const select = document.getElementById("industry");
        if (!select) return;

        const currentLang = localStorage.getItem('language') || 'en';

        if (availableIndustries.length === 0) {
            select.innerHTML = '<option value="" disabled selected>No industries available</option>';
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Select Industry</option>';

        availableIndustries.forEach(ind => {
            const option = document.createElement('option');
            option.value = ind.key;
            option.textContent = currentLang === 'ko' && ind.labelKo ? ind.labelKo : ind.labelEn;
            option.dataset.allowCustomInput = ind.allowCustomInput || false;
            select.appendChild(option);
        });

        // Handle industry change - show/hide custom input
        select.addEventListener('change', handleIndustryChange);
    }

    function handleIndustryChange() {
        const select = document.getElementById("industry");
        const customContainer = document.getElementById("custom-industry-container");
        const customInput = document.getElementById("industry-custom");

        const selectedOption = select.options[select.selectedIndex];
        const allowCustom = selectedOption?.dataset.allowCustomInput === 'true';

        if (allowCustom) {
            customContainer.style.display = 'block';
            customInput.required = true;
        } else {
            customContainer.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    // 🔹 Step 1 Logic
    function validateStep1() {
        const name = document.getElementById("project-name").value;
        const industry = document.getElementById("industry").value;
        const lang = document.getElementById("primary-language").value;
        const customIndustry = document.getElementById("industry-custom");

        if (!name || !industry || !lang) {
            alert("Please fill in all required fields (*)");
            return false;
        }

        // Check if custom input is required but empty
        const selectedOption = document.getElementById("industry").options[document.getElementById("industry").selectedIndex];
        if (selectedOption?.dataset.allowCustomInput === 'true' && !customIndustry.value.trim()) {
            alert("Please specify your industry");
            return false;
        }

        return true;
    }

    async function saveDraftStep1() {
        if (!currentUser) return;

        const industryKey = document.getElementById("industry").value;
        const customInput = document.getElementById("industry-custom").value.trim();

        const data = {
            ownerId: currentUser.uid,
            projectName: document.getElementById("project-name").value,
            websiteUrl: document.getElementById("website-url").value,
            industry: industryKey,
            targetMarket: document.getElementById("target-market").value,
            primaryLanguage: document.getElementById("primary-language").value,
            isDraft: true,
            draftStep: 1,
            stepProgress: 1,
            status: "Normal",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add custom industry label if applicable
        if (customInput) {
            data.industryCustomLabel = customInput;
        }

        try {
            if (draftId) {
                await db.collection("projects").doc(draftId).update(data);
            } else {
                const docRef = await db.collection("projects").add({
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                draftId = docRef.id;
            }
        } catch (error) {
            console.error("Error saving draft step 1:", error);
            alert("Failed to save draft. Please try again.");
        }
    }

    // 🔹 Step 2 Logic (File Upload)
    const fileInput = document.getElementById("asset-files");
    const dropZone = document.getElementById("file-drop-zone");
    const fileList = document.getElementById("file-list");

    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFiles);

    function handleFiles(e) {
        const files = Array.from(e.target.files);
        uploadedFiles = [...uploadedFiles, ...files];
        renderFileList();
    }

    function renderFileList() {
        fileList.innerHTML = "";
        uploadedFiles.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "file-item";
            item.innerHTML = `
                <span>${file.name}</span>
                <span style="cursor:pointer; color:var(--color-warning)" onclick="removeFile(${index})">&times;</span>
            `;
            fileList.appendChild(item);
        });
    }

    window.removeFile = (index) => {
        uploadedFiles.splice(index, 1);
        renderFileList();
    };

    async function saveDraftStep2() {
        if (!draftId) return;

        // Upload files to Storage
        const assetFileUrls = [];
        // Note: In a real app, we'd upload to Storage here. 
        // For this demo, we'll simulate or use simple references if storage is not fully set up.
        // Assuming storage IS initialized in firebase-config.js

        try {
            for (const file of uploadedFiles) {
                const storageRef = storage.ref(`projects/${draftId}/${file.name}`);
                await storageRef.put(file);
                const url = await storageRef.getDownloadURL();
                assetFileUrls.push(url);
            }
        } catch (e) {
            console.warn("Storage upload failed or not configured, skipping files:", e);
        }

        const data = {
            description: document.getElementById("project-description").value,
            assetFileUrls: assetFileUrls,
            draftStep: 2,
            stepProgress: 2,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("projects").doc(draftId).update(data);
    }

    // 🔹 Step 3 Logic
    function updateSummary() {
        document.getElementById("summary-name").textContent = document.getElementById("project-name").value;
        document.getElementById("summary-industry").textContent = document.getElementById("industry").value;
        document.getElementById("summary-target").textContent = document.getElementById("target-market").value || "N/A";
        document.getElementById("summary-assets").textContent = `${uploadedFiles.length} files`;
    }

    async function finalizeProject() {
        if (!draftId) return;

        const data = {
            isDraft: false,
            draftStep: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Reset created at to launch time
            status: "Normal",
            // Initialize metrics
            followerGrowth30d: 0,
            followerGrowthDelta: 0,
            engagementRate: 0,
            engagementRateDelta: 0,
            pendingApprovals: 0,
            agentHealthCurrent: 100,
            agentHealthMax: 100,
            stepProgress: 3,
            totalAgents: 0,
            avgFollowerGrowth30d: 0,
            avgEngagementRate: 0,
            totalContentCreated: 0,
            totalContentApproved: 0,
            avgApprovalRate: 0,
            kpiLastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("projects").doc(draftId).update(data);
        closeModal();
        // loadProjects listener will auto-update the grid
    }

    async function checkExistingDraft() {
        console.log("checkExistingDraft called");
        if (!currentUser) {
            initProjectWizard(); // If no user, start fresh
            return;
        }

        try {
            const snapshot = await db.collection("projects")
                .where("ownerId", "==", currentUser.uid) // Changed from userId to ownerId
                .where("isDraft", "==", true)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const draft = snapshot.docs[0];
                showResumeDraftDialog(draft.id, draft.data());
            } else {
                initProjectWizard(); // Start fresh
            }
        } catch (error) {
            console.error("Error checking drafts:", error);
            initProjectWizard(); // Fallback to fresh start
        }
    }

    function showResumeDraftDialog(id, data) {
        const resumeModal = document.getElementById("resume-draft-modal");
        const nameDisplay = document.getElementById("draft-name-display");
        const btnResume = document.getElementById("btn-resume-draft");
        const btnFresh = document.getElementById("btn-start-fresh");

        nameDisplay.textContent = data.projectName || "Untitled Project";
        resumeModal.classList.add("open");

        // Clean up old listeners
        const newBtnResume = btnResume.cloneNode(true);
        const newBtnFresh = btnFresh.cloneNode(true);
        btnResume.parentNode.replaceChild(newBtnResume, btnResume);
        btnFresh.parentNode.replaceChild(newBtnFresh, btnFresh);

        newBtnResume.addEventListener("click", () => {
            resumeModal.classList.remove("open");
            resumeDraft(id, data);
        });

        newBtnFresh.addEventListener("click", () => {
            resumeModal.classList.remove("open");
            clearDraftAndStartFresh(id);
        });
    }

    function resumeDraft(id, data) {
        draftId = id;

        // Pre-fill Step 1
        document.getElementById("project-name").value = data.projectName || "";
        document.getElementById("website-url").value = data.websiteUrl || "";
        document.getElementById("target-market").value = data.targetMarket || "";
        document.getElementById("primary-language").value = data.primaryLanguage || "en";

        if (data.industry) {
            document.getElementById("industry").value = data.industry;
            // Trigger change event to handle custom input visibility
            const event = new Event('change');
            document.getElementById("industry").dispatchEvent(event);

            if (data.industryCustomLabel) {
                document.getElementById("industry-custom").value = data.industryCustomLabel;
            }
        }

        // Pre-fill Step 2
        if (data.description) {
            document.getElementById("project-description").value = data.description;
        }

        // Note: Files cannot be pre-filled due to browser security, 
        // but we could show previously uploaded files list if we stored them.

        // Open modal and go to saved step
        modal.classList.add("open");

        // Determine step to resume
        let targetStep = data.draftStep || 1;
        // If step 2 was saved, we go to step 2. If step 1 saved, go to step 2 (since step 1 is done).
        // Logic: if draftStep is 1, it means step 1 was saved, so user is ready for step 2.
        // If draftStep is 2, user was on step 2.

        // Actually, let's just go to the step they were working on.
        // If they saved step 1, they are now on step 2.
        if (targetStep === 1) currentStep = 2;
        else currentStep = targetStep;

        // Ensure we don't go beyond step 2 for drafts
        if (currentStep > 2) currentStep = 2;

        goToStep(currentStep);
    }

    async function clearDraftAndStartFresh(id) {
        if (confirm("Are you sure? This will delete your saved draft.")) {
            try {
                await db.collection("projects").doc(id).delete();
                draftId = null;
                initProjectWizard();
            } catch (error) {
                console.error("Error deleting draft:", error);
                alert("Failed to delete draft.");
            }
        }
    }

    // 🔹 Initialization Logic
    // 🔹 Initialization Logic
    // 🔹 Initialization Logic
    function initProjectWizard() {
        console.log("Initializing wizard...");
        try {
            modal.classList.add("open");
            currentStep = 1;
            draftId = null;
            uploadedFiles = [];
            renderFileList(); // Clear file list UI
            form.reset();

            const customContainer = document.getElementById("custom-industry-container");
            if (customContainer) {
                customContainer.style.display = 'none';
            }

            goToStep(1);
        } catch (error) {
            console.error("Error initializing wizard:", error);
            // Ensure modal opens even if error occurs
            if (modal) modal.classList.add("open");
        }
    }


    // 🔹 Command Center Grid Logic
    function loadProjects() {
        if (!currentUser) return;

        // Note: Removed orderBy to avoid requiring a composite index immediately.
        // Sorting is done in client-side for now.
        db.collection("projects")
            .where("ownerId", "==", currentUser.uid)
            .where("isDraft", "==", false)
            .onSnapshot((snapshot) => {
                const projects = [];
                snapshot.forEach(doc => {
                    projects.push({ id: doc.id, ...doc.data() });
                });

                // Client-side sort
                projects.sort((a, b) => {
                    const tA = a.createdAt ? a.createdAt.seconds : 0;
                    const tB = b.createdAt ? b.createdAt.seconds : 0;
                    return tB - tA;
                });

                renderProjectCards(projects);
                updatePortfolioStats(projects);
            }, (error) => {
                console.error("Error loading projects:", error);
                // Even if error, ensure Add button is visible
                renderAddProjectCard();
            });
    }

    function renderProjectCards(projects) {
        hiveGrid.innerHTML = "";

        // 1. Add New Project Card
        renderAddProjectCard();

        // 2. Render Project Cards
        projects.forEach(p => {
            const card = document.createElement("div");
            card.className = `client-card status-${p.status ? p.status.toLowerCase() : 'nominal'}`;

            // Status Color Map
            let statusColor = "var(--color-success)";
            let statusBg = "rgba(16, 185, 129, 0.1)";
            if (p.status === "Attention") { statusColor = "var(--color-warning)"; statusBg = "rgba(245, 158, 11, 0.1)"; }
            if (p.status === "Stopped") { statusColor = "#EF4444"; statusBg = "rgba(239, 68, 68, 0.1)"; }

            card.innerHTML = `
                <div class="card-header">
                    <div class="client-info">
                        <div class="client-icon" style="background: ${statusBg}; color: ${statusColor}; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                            ${p.projectName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="client-name">${p.projectName}</div>
                            <div class="status-badge" style="color:${statusColor}; border-color:${statusColor}33; background:${statusBg}">
                                ${p.status || 'Normal'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-tags" style="margin-top:12px;">
                    <span class="tag blockchain">${p.industry || 'General'}</span>
                    <span class="tag general">${p.primaryLanguage === 'ko' ? 'Korean' : 'English'}</span>
                </div>

                <div class="card-metrics">
                    <div class="metric-item">
                        <div class="metric-label">Follower Growth</div>
                        <div class="metric-value">
                            ${p.followerGrowth30d || 0}%
                            <span class="${(p.followerGrowthDelta || 0) >= 0 ? 'trend-up' : 'trend-down'}">
                                ${(p.followerGrowthDelta || 0) >= 0 ? '↑' : '↓'} ${Math.abs(p.followerGrowthDelta || 0)}%
                            </span>
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Engagement Rate</div>
                        <div class="metric-value">
                            ${p.engagementRate || 0}%
                            <span class="${(p.engagementRateDelta || 0) >= 0 ? 'trend-up' : 'trend-down'}">
                                ${(p.engagementRateDelta || 0) >= 0 ? '↑' : '↓'} ${Math.abs(p.engagementRateDelta || 0)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn-mission">Jump to Mission Control</button>
                    <button class="btn-settings">⚙️</button>
                </div>
            `;
            hiveGrid.appendChild(card);
        });
    }

    function renderAddProjectCard() {
        // Prevent duplicate add buttons if called multiple times
        if (hiveGrid.querySelector('.add-project-card')) return;

        const card = document.createElement("div");
        card.className = "client-card add-project-card";
        card.innerHTML = `
            <div class="add-project-inner">
                <div class="add-project-icon">+</div>
                <div class="add-project-label">Add New Project</div>
            </div>
        `;
        card.addEventListener("click", openModal);

        // Always insert as first child
        if (hiveGrid.firstChild) {
            hiveGrid.insertBefore(card, hiveGrid.firstChild);
        } else {
            hiveGrid.appendChild(card);
        }
    }

    function updatePortfolioStats(projects) {
        document.getElementById("stat-total-projects").textContent = projects.length;
        document.getElementById("stat-total-agents").textContent = projects.length * 2; // Mock

        const totalPending = projects.reduce((sum, p) => sum + (p.pendingApprovals || 0), 0);
        document.getElementById("stat-pending-approvals").textContent = totalPending;
    }

    // 🔹 Language Switching Logic (Preserved)
    const btnEn = document.getElementById('btn-lang-en');
    const btnKo = document.getElementById('btn-lang-ko');

    function updateLanguageUI(lang) {
        if (btnEn && btnKo) {
            if (lang === 'en') {
                btnEn.classList.add('active');
                btnEn.style.cssText = 'background: var(--color-cyan); color: #000; font-weight: bold;';
                btnKo.classList.remove('active');
                btnKo.style.cssText = '';
            } else {
                btnKo.classList.add('active');
                btnKo.style.cssText = 'background: var(--color-cyan); color: #000; font-weight: bold;';
                btnEn.classList.remove('active');
                btnEn.style.cssText = '';
            }
        }

        // Update Add Project Card Text if it exists
        const addProjectLabel = document.querySelector('.add-project-label');
        if (addProjectLabel) {
            addProjectLabel.textContent = lang === 'ko' ? '새 프로젝트 추가' : 'Add New Project';
        }
    }

    if (btnEn) {
        btnEn.addEventListener('click', () => {
            translatePage('en');
            updateLanguageUI('en');
        });
    }

    if (btnKo) {
        btnKo.addEventListener('click', () => {
            translatePage('ko');
            updateLanguageUI('ko');
        });
    }

    // Initialize Language UI
    if (typeof currentLang !== 'undefined') {
        updateLanguageUI(currentLang);
        translatePage(currentLang);
    }

    // 🔹 Initial Render (Fallback)
    // Render the Add Project card immediately so it's visible even before auth/data loads
    renderAddProjectCard();
});
