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
    let agentTemplates = [];

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

            const originalText = btnNext.textContent;
            try {
                btnNext.classList.add("btn-loading");
                await saveDraftStep1();
                goToStep(2);
            } catch (error) {
                console.error("Error in step 1:", error);
                alert("An error occurred. Please try again.");
            } finally {
                btnNext.classList.remove("btn-loading");
            }
        } else if (currentStep === 2) {
            const originalText = btnNext.textContent;
            try {
                btnNext.classList.add("btn-loading");
                await saveDraftStep2();
                // Skip Step 3 (Agent Team), go directly to Summary
                updateSummary();
                goToStep(3);
            } catch (error) {
                console.error("Error in step 2:", error);
                alert("An error occurred. Please try again.");
            } finally {
                btnNext.classList.remove("btn-loading");
            }
        }
    });

    btnPrev.addEventListener("click", () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    });

    btnLaunch.addEventListener("click", async () => {
        if (currentStep === 3) {
            const originalText = btnLaunch.textContent;
            try {
                btnLaunch.classList.add("btn-loading");
                await finalizeProject();
            } catch (error) {
                console.error("Error finalizing project:", error);
                alert("Failed to launch project. Please try again.");
            } finally {
                btnLaunch.classList.remove("btn-loading");
            }
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

    // 🔹 Step 1 Logic (PRD 11.0 - Project Brief)
    function validateStep1() {
        const businessName = document.getElementById("business-name").value.trim();
        const industry = document.getElementById("industry").value;
        const mainProduct = document.getElementById("main-product").value.trim();
        const targetMarkets = document.getElementById("target-markets").value.trim();
        const primaryObjective = document.getElementById("primary-objective").value;
        const preferredTone = document.getElementById("preferred-tone").value;

        // Check languages (at least one must be selected)
        const selectedLanguages = Array.from(document.querySelectorAll('.language-checkbox:checked'))
            .map(cb => cb.value);

        if (!businessName) {
            alert("Please enter your Business / Brand Name");
            return false;
        }

        if (!industry) {
            alert("Please select an Industry");
            return false;
        }

        if (!mainProduct) {
            alert("Please enter your Main Product / Service");
            return false;
        }

        if (!targetMarkets) {
            alert("Please enter Target Markets");
            return false;
        }

        if (!primaryObjective) {
            alert("Please select a Primary Objective");
            return false;
        }

        if (!preferredTone) {
            alert("Please select a Preferred Tone");
            return false;
        }

        if (selectedLanguages.length === 0) {
            alert("Please select at least one language");
            return false;
        }

        // Check if custom input is required but empty
        const selectedOption = document.getElementById("industry").options[document.getElementById("industry").selectedIndex];
        const customIndustry = document.getElementById("industry-custom");
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

        // Parse target markets (comma-separated)
        const targetMarketsRaw = document.getElementById("target-markets").value.trim();
        const targetMarkets = targetMarketsRaw.split(',').map(m => m.trim()).filter(m => m);

        // Get selected languages
        const languages = Array.from(document.querySelectorAll('.language-checkbox:checked'))
            .map(cb => cb.value);

        const data = {
            userId: currentUser.uid,
            // PRD 11.0 Project Brief fields
            businessName: document.getElementById("business-name").value.trim(),
            industry: industryKey,
            mainProduct: document.getElementById("main-product").value.trim(),
            websiteUrl: document.getElementById("website-url").value.trim(),
            targetMarkets: targetMarkets,
            primaryObjective: document.getElementById("primary-objective").value,
            preferredTone: document.getElementById("preferred-tone").value,
            languages: languages,
            // Legacy compatibility
            projectName: document.getElementById("business-name").value.trim(), // Same as businessName
            primaryLanguage: languages[0] || 'en', // First language as primary
            // Draft state
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
            throw error;
        }
    }

    // 🔹 Step 2 Logic (File Upload)
    const fileInput = document.getElementById("asset-files");
    const dropZone = document.getElementById("file-drop-zone");
    const fileList = document.getElementById("file-list");

    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFiles);

    // Drag & Drop Events
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const files = Array.from(e.dataTransfer.files).map(file => ({
            file: file,
            name: file.name,
            url: null,
            uploaded: false
        }));
        uploadedFiles = [...uploadedFiles, ...files];
        renderFileList();
    });

    function handleFiles(e) {
        const files = Array.from(e.target.files).map(file => ({
            file: file,
            name: file.name,
            url: null,
            uploaded: false
        }));
        uploadedFiles = [...uploadedFiles, ...files];
        renderFileList();
    }

    function renderFileList() {
        fileList.innerHTML = "";
        uploadedFiles.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "file-item";
            item.innerHTML = `
                <span>${file.name} ${file.uploaded ? '✅' : ''}</span>
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
            console.log(`Starting upload for ${uploadedFiles.length} files...`);
            for (let i = 0; i < uploadedFiles.length; i++) {
                const fileObj = uploadedFiles[i];

                if (fileObj.uploaded && fileObj.url) {
                    console.log(`Skipping already uploaded file: ${fileObj.name}`);
                    assetFileUrls.push(fileObj.url);
                    continue;
                }

                console.log(`Uploading ${fileObj.name} to projects/${draftId}/${fileObj.name}`);
                const storageRef = storage.ref(`projects/${draftId}/${fileObj.name}`);
                await storageRef.put(fileObj.file);
                const url = await storageRef.getDownloadURL();

                console.log(`Upload successful: ${url}`);

                // Update local state
                uploadedFiles[i].url = url;
                uploadedFiles[i].uploaded = true;

                assetFileUrls.push(url);
            }
            renderFileList(); // Update UI to show checkmarks
        } catch (e) {
            console.error("Storage upload failed:", e);
            console.warn("Check if Firebase Storage is enabled in console and rules are set.");
            // Don't block the flow, but alert the user
            alert(`File upload failed: ${e.message}. Proceeding without files.`);
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

    // 🔹 Step 3 Logic (Agent Team Selection)
    async function loadAgentTemplates() {
        const grid = document.getElementById('agent-template-grid');
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading Templates...</div>';

        try {
            const snapshot = await db.collection('agentSetTemplates')
                .where('status', '==', 'active')
                .get();

            agentTemplates = [];
            snapshot.forEach(doc => {
                agentTemplates.push({ id: doc.id, ...doc.data() });
            });

            if (agentTemplates.length === 0) {
                grid.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No active templates found.</div>';
                return;
            }

            renderTemplateGrid();
        } catch (error) {
            console.error("Error loading templates:", error);
            grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Error loading templates.</div>';
        }
    }

    function renderTemplateGrid() {
        const grid = document.getElementById('agent-template-grid');
        const selectedId = document.getElementById('selected-template-id').value;

        grid.innerHTML = agentTemplates.map(tpl => {
            const isSelected = tpl.id === selectedId;
            const roleCount = tpl.roles ? tpl.roles.length : 0;

            return `
            <div class="template-card ${isSelected ? 'selected' : ''}" 
                 onclick="selectTemplate('${tpl.id}')"
                 style="background: rgba(255,255,255,0.05); border: 1px solid ${isSelected ? '#16e0bd' : 'rgba(255,255,255,0.1)'}; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.2s; position: relative;">
                
                <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: ${isSelected ? '#16e0bd' : 'white'};">${tpl.name}</div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 16px; min-height: 40px;">${tpl.description || 'No description'}</div>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${roleCount} Agents</span>
                    <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${tpl.channel_type || 'Multi-channel'}</span>
                </div>

                ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; color: #16e0bd;">✓</div>' : ''}
            </div>
            `;
        }).join('');
    }

    window.selectTemplate = function (id) {
        document.getElementById('selected-template-id').value = id;
        renderTemplateGrid();
    };

    async function saveDraftStep3() {
        if (!draftId) return;
        const selectedTemplateId = document.getElementById("selected-template-id").value;

        await db.collection("projects").doc(draftId).update({
            selectedTemplateId: selectedTemplateId,
            draftStep: 3,
            stepProgress: 3,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // 🔹 Step 4 Logic (Summary & Finalize)
    function updateSummary() {
        document.getElementById("summary-name").textContent = document.getElementById("business-name").value;
        document.getElementById("summary-industry").textContent = document.getElementById("industry").value;
        document.getElementById("summary-assets").textContent = `${uploadedFiles.length} files`;
    }

    async function finalizeProject() {
        console.log("Finalizing project, draftId:", draftId);

        if (!draftId) {
            console.error("No draft ID found, attempting to create new project...");
            await saveDraftStep1();
            if (!draftId) throw new Error("Could not create project. Please try again.");
            return;
        }

        try {
            // Finalize Project Document
            const data = {
                isDraft: false,
                draftStep: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: "Normal",
                // Initialize metrics
                followerGrowth30d: 0,
                followerGrowthDelta: 0,
                engagementRate: 0,
                engagementRateDelta: 0,
                pendingApprovals: 0,
                agentHealthCurrent: 100,
                agentHealthMax: 100,
                stepProgress: 3, // Completed (3 steps now)
                totalAgents: 0, // Will be set when agent team is deployed
                avgFollowerGrowth30d: 0,
                avgEngagementRate: 0,
                totalContentCreated: 0,
                totalContentApproved: 0,
                avgApprovalRate: 0,
                kpiLastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection("projects").doc(draftId).update(data);
            console.log("Project finalized successfully");
            closeModal();
            // loadProjects listener will auto-update the grid
        } catch (error) {
            console.error("Error finalizing project:", error);
            throw error;
        }
    }

    async function checkExistingDraft() {
        console.log("checkExistingDraft called");
        if (!currentUser) {
            initProjectWizard(); // If no user, start fresh
            return;
        }

        try {
            const snapshot = await db.collection("projects")
                .where("userId", "==", currentUser.uid)
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
            window.clearDraftAndStartFresh(id);
        });
    }

    window.resumeDraft = function (id, data) {
        draftId = id;

        // Pre-fill Step 1 (PRD 11.0 Project Brief)
        document.getElementById("business-name").value = data.businessName || data.projectName || "";
        document.getElementById("project-description").value = data.description || "";
        document.getElementById("main-product").value = data.mainProduct || "";
        document.getElementById("website-url").value = data.websiteUrl || "";

        // Target markets (array to comma-separated string)
        if (data.targetMarkets && Array.isArray(data.targetMarkets)) {
            document.getElementById("target-markets").value = data.targetMarkets.join(', ');
        } else {
            document.getElementById("target-markets").value = data.targetMarket || "";
        }

        document.getElementById("primary-objective").value = data.primaryObjective || "";
        document.getElementById("preferred-tone").value = data.preferredTone || "";

        // Restore languages
        if (data.languages && Array.isArray(data.languages)) {
            document.querySelectorAll('.language-checkbox').forEach(cb => {
                cb.checked = data.languages.includes(cb.value);
            });
        } else if (data.primaryLanguage) {
            // Fallback to legacy primaryLanguage
            document.querySelectorAll('.language-checkbox').forEach(cb => {
                cb.checked = cb.value === data.primaryLanguage;
            });
        }

        if (data.industry) {
            document.getElementById("industry").value = data.industry;
            // Trigger change event to handle custom input visibility
            const event = new Event('change');
            document.getElementById("industry").dispatchEvent(event);

            if (data.industryCustomLabel) {
                document.getElementById("industry-custom").value = data.industryCustomLabel;
            }
        }

        // Pre-fill Step 2 (moved to Step 2 in wizard, but description is now in Step 1)
        // Assets are handled separately

        // Pre-fill Step 3
        if (data.selectedTemplateId) {
            document.getElementById("selected-template-id").value = data.selectedTemplateId;
        }

        // Open modal and go to saved step
        modal.classList.add("open");

        let targetStep = data.draftStep || 1;
        // Logic: if draftStep is 1, user finished step 1, so go to 2.
        if (targetStep === 1) currentStep = 2;
        else if (targetStep === 2) currentStep = 3;
        else if (targetStep === 3) currentStep = 4;
        else currentStep = targetStep;

        if (currentStep > 4) currentStep = 4;

        goToStep(currentStep);
    };

    window.clearDraftAndStartFresh = async function (id) {
        // Removed confirm() as the user choice in the dialog is sufficient confirmation
        try {
            await db.collection("projects").doc(id).delete();
            draftId = null;
            window.initProjectWizard();
        } catch (error) {
            console.error("Error deleting draft:", error);
            alert("Failed to delete draft.");
        }
    };

    // 🔹 Initialization Logic
    window.initProjectWizard = function () {
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
            .where("userId", "==", currentUser.uid)
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

            }, (error) => {
                console.error("Error loading projects:", error);
                // Even if error, ensure Add button is visible
                renderAddProjectCard();
            });
    }

    function renderProjectCards(projects) {
        hiveGrid.innerHTML = "";

        // 1. Render Project Cards
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
                    <button class="btn-mission" onclick="localStorage.setItem('currentProjectId', '${p.id}'); window.location.href='project-detail.html?id=${p.id}'">Jump to Mission Control</button>
                    <button class="btn-settings">⚙️</button>
                </div>
            `;
            hiveGrid.appendChild(card);
        });

        // 2. Add New Project Card (Last)
        renderAddProjectCard();
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
        // Always append as last child
        hiveGrid.appendChild(card);
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

    // 🔹 Mobile Sidebar Toggle Logic
    const initMobileSidebar = () => {
        const toggleBtn = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');

        // Create Overlay if it doesn't exist
        let overlay = document.querySelector('.dashboard-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'dashboard-overlay';
            document.body.appendChild(overlay);
        }

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
                toggleBtn.classList.toggle('active'); // Animate hamburger
            });

            // Close when clicking overlay
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                toggleBtn.classList.remove('active');
            });

            // Close when clicking a menu item
            // Using event delegation since menu items might be dynamic
            sidebar.addEventListener('click', (e) => {
                if (e.target.closest('a')) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                    toggleBtn.classList.remove('active');
                }
            });
        }
    };

    // Initialize Mobile Sidebar
    initMobileSidebar();
});
