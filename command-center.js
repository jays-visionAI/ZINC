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
    let selectedWizardChannels = [];
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

            // 🪙 Initialize Credits System
            if (typeof initCreditsSystem === 'function') {
                initCreditsSystem();
            }
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

    async function goToStep(step) {
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

            // [NEW] Render Channel Selector
            if (window.ChannelSelector) {
                // Default channels if empty
                if (selectedWizardChannels.length === 0) {
                    selectedWizardChannels = ['x', 'instagram']; // Defaults
                }

                await window.ChannelSelector.render('wizard-channel-selector', selectedWizardChannels, (channel, isSelected, list) => {
                    selectedWizardChannels = list;
                    if (list.length > 0) {
                        document.getElementById('channel-selection-error').style.display = 'none';
                    }
                });
            }
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
        // Step 3 is now Channel Selection, handled in finalizeProject
    }

    // 🔹 Step 4 Logic (Summary & Finalize)
    function updateSummary() {
        document.getElementById("summary-name").textContent = document.getElementById("business-name").value;
        document.getElementById("summary-industry").textContent = document.getElementById("industry").value;
        document.getElementById("summary-assets").textContent = `${uploadedFiles.length} files`;
    }

    // =====================================================
    // 🧠 UNIFIED BRAIN: Auto-Initialize Core Agent Team
    // =====================================================
    const CORE_SUBAGENT_DEFINITIONS = [
        { role_type: 'manager', role_name: 'Content Manager', display_order: 1, stage: 'final' },
        { role_type: 'planner', role_name: 'Content Planner', display_order: 2, stage: 'planning' },
        { role_type: 'research', role_name: 'Researcher', display_order: 3, stage: 'research' },
        { role_type: 'knowledge_curator', role_name: 'Knowledge Curator', display_order: 4, stage: 'research' },
        { role_type: 'seo_watcher', role_name: 'SEO Watcher', display_order: 5, stage: 'research' },
        { role_type: 'kpi', role_name: 'KPI Engine', display_order: 6, stage: 'research' },
        { role_type: 'creator_text', role_name: 'Text Creator', display_order: 7, stage: 'creation' },
        { role_type: 'creator_image', role_name: 'Image Creator', display_order: 8, stage: 'creation' },
        { role_type: 'creator_video', role_name: 'Video Creator', display_order: 9, stage: 'creation' },
        { role_type: 'compliance', role_name: 'Compliance Officer', display_order: 10, stage: 'validation' },
        { role_type: 'seo_optimizer', role_name: 'SEO Optimizer', display_order: 11, stage: 'validation' },
        { role_type: 'evaluator', role_name: 'Quality Evaluator', display_order: 12, stage: 'validation' }
    ];

    async function initializeCoreAgentTeam(projectId) {
        console.log('[UnifiedBrain] 🚀 Starting Core Agent Team initialization for project:', projectId);

        try {
            // 1. Create Project Agent Team Instance
            console.log('[UnifiedBrain] Step 1: Creating team instance document...');
            const teamRef = await db.collection('projectAgentTeamInstances').add({
                projectId: projectId,
                name: 'Core Team',
                description: 'Unified Brain - Project\'s dedicated agent team',
                isActive: true,
                defaultLLMProvider: 'openai', // Uses Global Routing Defaults at runtime
                defaultLLMModel: 'gpt-4o-mini',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const teamId = teamRef.id;
            console.log('[UnifiedBrain] ✅ Step 1 Complete - Created team instance:', teamId);

            // 2. Populate 12 Sub-Agents (use individual adds for better error handling)
            console.log('[UnifiedBrain] Step 2: Creating 12 sub-agents...');
            const subAgentPromises = CORE_SUBAGENT_DEFINITIONS.map(def =>
                db.collection('projectAgentTeamInstances')
                    .doc(teamId)
                    .collection('subAgents')
                    .add({
                        role_type: def.role_type,
                        role_name: def.role_name,
                        display_order: def.display_order,
                        execution_stage: def.stage,
                        is_active: true,
                        system_prompt: '', // Uses default prompts from Global Settings
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
            );
            await Promise.all(subAgentPromises);
            console.log('[UnifiedBrain] ✅ Step 2 Complete - Created 12 sub-agents');

            // 3. Link Team to Project
            console.log('[UnifiedBrain] Step 3: Linking team to project...');
            await db.collection('projects').doc(projectId).update({
                coreAgentTeamInstanceId: teamId,
                totalAgents: 12
            });
            console.log('[UnifiedBrain] ✅ Step 3 Complete - Linked team to project');

            console.log('[UnifiedBrain] 🎉 Core Agent Team initialization COMPLETE:', teamId);
            return teamId;

        } catch (error) {
            console.error('[UnifiedBrain] ❌ CRITICAL ERROR initializing Core Agent Team:', error);
            console.error('[UnifiedBrain] Error details:', error.message, error.code);
            // Re-throw so finalizeProject knows about it
            throw error;
        }
    }

    async function finalizeProject() {
        console.log("Finalizing project, draftId:", draftId);

        if (!draftId) {
            console.error("No draft ID found, attempting to create new project...");
            await saveDraftStep1();
            if (!draftId) throw new Error("Could not create project. Please try again.");
            return;
        }

        // [NEW] Validate Channels
        if (selectedWizardChannels.length === 0) {
            document.getElementById('channel-selection-error').style.display = 'block';
            throw new Error('Please select at least one channel.');
        }

        try {
            // Finalize Project Document
            const data = {
                isDraft: false,
                targetChannels: selectedWizardChannels,
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

            // 🧠 AUTO-INITIALIZE CORE AGENT TEAM (Unified Brain)
            await initializeCoreAgentTeam(draftId);

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

        // Helper to get industry label
        const getIndustryLabel = (key, customLabel) => {
            if (key === 'other' || key === 'Custom') {
                return customLabel || 'Other';
            }
            if (!key) return 'General';

            const ind = availableIndustries.find(i => i.key === key);
            if (!ind) return key;

            const currentLang = localStorage.getItem('language') || 'en';
            return currentLang === 'ko' && ind.labelKo ? ind.labelKo : ind.labelEn;
        };

        // 1. Render Project Cards
        projects.forEach(p => {
            const card = document.createElement("div");
            card.className = `client-card status-${p.status ? p.status.toLowerCase() : 'nominal'}${p.agentStatus === 'running' ? ' agent-running' : ''}`;

            // Status Color Map
            let statusColor = "var(--color-success)";
            let statusBg = "rgba(16, 185, 129, 0.1)";
            if (p.status === "Attention") { statusColor = "var(--color-warning)"; statusBg = "rgba(245, 158, 11, 0.1)"; }
            if (p.status === "Stopped") { statusColor = "#EF4444"; statusBg = "rgba(239, 68, 68, 0.1)"; }

            // Channels Logic
            const channels = p.targetChannels || [];

            // Channel Icons HTML
            const channelIconsHtml = channels.map(ch => `
                <div class="channel-badge" title="${ch}">
                    <div style="width:14px; height:14px; display:inline-block;">${window.ChannelSelector?.getIcon(ch) || ''}</div>
                    <!-- Hover remove button handled via CSS/JS delegation or simple confirm -->
                </div>
            `).join('');

            card.innerHTML = `
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
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
                    <button class="btn-brain" onclick="openProjectAgentSettingsById('${p.id}')" title="Agent Setting Prompt" style="width:32px; height:32px; border-radius:8px; background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.3); display:flex; align-items:center; justify-content:center; cursor:pointer;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
                            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="card-tags" style="margin-top:12px;">
                    <span class="tag blockchain">${getIndustryLabel(p.industry, p.industryCustomLabel)}</span>
                    <span class="tag general">${p.primaryLanguage === 'ko' ? 'Korean' : 'English'}</span>
                </div>

                <!-- [NEW] Channels Section -->
                <div style="margin-top: 16px;">
                    <div style="font-size:11px; color:rgba(255,255,255,0.4); margin-bottom:6px; font-weight:600;">ACTIVE CHANNELS</div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        ${channelIconsHtml}
                        <button class="btn-add-channel" onclick="openChannelManagerModal('${p.id}')" title="Manage Channels">+</button>
                    </div>
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
                    <!-- [NEW] Run/Pause Button handled by toggleProjectAgent -->
                    <button id="btn-run-${p.id}" 
                            class="btn-mission ${p.agentStatus === 'running' ? 'active' : ''}" 
                            onclick="toggleProjectAgent('${p.id}', this)" 
                            style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; ${p.agentStatus === 'running' ? 'background: rgba(239, 68, 68, 0.2); color: #fca5a5; border-color: rgba(239, 68, 68, 0.4);' : ''}">
                        ${p.agentStatus === 'running'
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> <span class="run-text">PAUSE</span>`
                    : `<svg class="run-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> <span class="run-text">RUN</span>`
                }
                    </button>
                    <!-- [Changed] Settings Gear Icon -->
                    <button class="btn-settings" onclick="event.stopPropagation(); window.openProjectSettingsModal('${p.id}', '${p.projectName}')" title="Project Settings">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
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

// =====================================================
// 🧠 Agent Setting Prompt Modal (Global Functions)
// =====================================================

/**
 * Open Agent Settings Modal for a specific project
 * @param {string} projectId 
 */
window.openProjectAgentSettingsById = async function (projectId) {
    // Check if modal exists, if not create it
    let modal = document.getElementById('agent-brain-modal');
    if (!modal) {
        createAgentBrainModal();
        modal = document.getElementById('agent-brain-modal');
    }

    const directiveInput = document.getElementById('brain-directive');
    const subAgentsList = document.getElementById('brain-subagents-list');

    // Store project ID for save
    modal.dataset.projectId = projectId;

    // Show modal
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));

    directiveInput.value = 'Loading...';
    subAgentsList.innerHTML = '<div style="text-align:center; padding: 20px; color: rgba(255,255,255,0.5);">Loading configuration...</div>';

    try {
        const db = firebase.firestore();

        // 1. Load Project Data
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) throw new Error('Project not found');

        const projectData = projectDoc.data();

        // Update modal title with project name
        document.getElementById('brain-modal-title').textContent = `Agent Setting Prompt - ${projectData.projectName || 'Project'}`;

        // 2. Load Directive
        directiveInput.value = projectData.teamDirective || '';

        // 3. Load Sub-Agents from Core Team
        let coreTeamId = projectData.coreAgentTeamInstanceId;

        // v5.0: Auto-create Core Team for legacy projects
        if (!coreTeamId) {
            console.log('[AgentBrain] No Core Team found for legacy project, creating one...');
            subAgentsList.innerHTML = '<div style="text-align:center; padding: 20px; color: rgba(255,255,255,0.5);">Setting up agent team for this project...</div>';

            coreTeamId = await initializeCoreAgentTeamForLegacyProject(projectId, projectData);

            if (!coreTeamId) {
                // Fallback: Load from Standard Agent Profiles directly
                console.log('[AgentBrain] Using Standard Agent Profiles as fallback');
                await loadStandardAgentProfilesAsFallback(subAgentsList);
                return;
            }
        }

        modal.dataset.coreTeamId = coreTeamId;

        const subAgentsSnap = await db.collection('projectAgentTeamInstances')
            .doc(coreTeamId)
            .collection('subAgents')
            .orderBy('display_order', 'asc')
            .get();

        const subAgents = [];
        subAgentsSnap.forEach(doc => subAgents.push({ id: doc.id, ...doc.data() }));

        // 4. Render Sub-Agents
        if (subAgents.length === 0) {
            // Empty team - load from Standard Profiles
            console.log('[AgentBrain] Empty team, loading from Standard Profiles');
            await loadStandardAgentProfilesAsFallback(subAgentsList);
        } else {
            renderBrainSubAgents(subAgents);
        }

    } catch (error) {
        console.error('Error loading agent settings:', error);
        alert('Failed to load settings: ' + error.message);
        closeAgentBrainModal();
    }
};

/**
 * v5.0: Initialize Core Agent Team for legacy projects
 */
async function initializeCoreAgentTeamForLegacyProject(projectId, projectData) {
    try {
        const db = firebase.firestore();

        // Create a new Core Agent Team Instance
        const teamRef = db.collection('projectAgentTeamInstances').doc();
        const teamId = teamRef.id;

        await teamRef.set({
            projectId: projectId,
            teamName: `${projectData.projectName || 'Project'} Core Team`,
            teamType: 'core',
            directive: projectData.teamDirective || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Load Standard Agent Profiles and create sub-agents
        const standardProfilesDoc = await db.collection('systemSettings').doc('standardAgentProfiles').get();
        const standardProfiles = standardProfilesDoc.exists && standardProfilesDoc.data().agents
            ? standardProfilesDoc.data().agents
            : getDefaultAgentProfiles();

        const batch = db.batch();
        let order = 0;

        for (const [agentId, profile] of Object.entries(standardProfiles)) {
            if (profile.isEnabled !== false) {
                const subAgentRef = teamRef.collection('subAgents').doc(agentId);
                batch.set(subAgentRef, {
                    name: profile.displayName || agentId,
                    agentType: agentId,
                    system_prompt: profile.systemPrompt || '',
                    temperature: profile.temperature || 0.7,
                    display_order: order++,
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        await batch.commit();

        // Update project with Core Team ID
        await db.collection('projects').doc(projectId).update({
            coreAgentTeamInstanceId: teamId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('[AgentBrain] Core Team created for legacy project:', teamId);
        return teamId;

    } catch (error) {
        console.error('[AgentBrain] Failed to create Core Team for legacy project:', error);
        return null;
    }
}

/**
 * v5.0: Load Standard Agent Profiles as fallback
 */
async function loadStandardAgentProfilesAsFallback(container) {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('systemSettings').doc('standardAgentProfiles').get();

        const profiles = doc.exists && doc.data().agents
            ? doc.data().agents
            : getDefaultAgentProfiles();

        const subAgents = Object.entries(profiles).map(([id, profile], index) => ({
            id,
            name: profile.displayName || id,
            agentType: id,
            system_prompt: profile.systemPrompt || '',
            temperature: profile.temperature || 0.7,
            display_order: index,
            isActive: profile.isEnabled !== false
        }));

        renderBrainSubAgents(subAgents);

    } catch (error) {
        console.error('[AgentBrain] Failed to load Standard Profiles:', error);
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #ef4444;">Error loading agent profiles</div>';
    }
}

/**
 * v5.0: Default Agent Profiles (fallback)
 */
function getDefaultAgentProfiles() {
    return {
        research: { displayName: 'Research Agent', systemPrompt: 'You are a research specialist.', temperature: 0.5, isEnabled: true },
        seo_watcher: { displayName: 'SEO Watcher', systemPrompt: 'You are an SEO analyst.', temperature: 0.4, isEnabled: true },
        planner: { displayName: 'Planner', systemPrompt: 'You are a content strategist.', temperature: 0.6, isEnabled: true },
        creator_text: { displayName: 'Text Creator', systemPrompt: 'You are a content writer.', temperature: 0.7, isEnabled: true },
        creator_image: { displayName: 'Image Creator', systemPrompt: 'You generate image prompts.', temperature: 0.7, isEnabled: true },
        creator_video: { displayName: 'Video Creator', systemPrompt: 'You create video scripts.', temperature: 0.7, isEnabled: true },
        compliance: { displayName: 'Compliance', systemPrompt: 'You verify content compliance.', temperature: 0.3, isEnabled: true },
        evaluator: { displayName: 'Evaluator', systemPrompt: 'You evaluate content quality.', temperature: 0.5, isEnabled: true },
        publisher: { displayName: 'Publisher', systemPrompt: 'You format content for publishing.', temperature: 0.5, isEnabled: true },
        knowledge_curator: { displayName: 'Knowledge Curator', systemPrompt: 'You manage brand knowledge.', temperature: 0.4, isEnabled: true },
        manager: { displayName: 'Manager', systemPrompt: 'You coordinate agent workflows.', temperature: 0.5, isEnabled: true },
        router: { displayName: 'Router', systemPrompt: 'You route tasks to agents.', temperature: 0.3, isEnabled: true }
    };
}

function createAgentBrainModal() {
    const modal = document.createElement('div');
    modal.id = 'agent-brain-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 900px; width: 90%; background: #13131a; border: 1px solid rgba(255,255,255,0.1); max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 16px;">
            <div class="modal-header" style="flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;">
                <h3 id="brain-modal-title" style="margin: 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                    🧠 Agent Setting Prompt
                    <span style="background: linear-gradient(135deg, #16e0bd, #8b5cf6); padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; color: #000;">v5.0</span>
                </h3>
                <button onclick="closeAgentBrainModal()" style="background: none; border: none; color: rgba(255,255,255,0.6); font-size: 28px; cursor: pointer; line-height: 1;">×</button>
            </div>
            <div class="modal-body" style="overflow-y: auto; flex: 1; padding: 24px;">
                
                <!-- Template Selection Section -->
                <div style="margin-bottom: 24px; padding: 16px; background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px;">
                    <label style="display: block; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                        ✨ Quick Start Template
                    </label>
                    <div style="color: rgba(255,255,255,0.5); font-size: 12px; margin-bottom: 12px;">
                        템플릿을 선택하면 Team Goal과 Sub-Agent 지시사항이 자동 입력됩니다. 선택 후 수정 가능합니다.
                    </div>
                    <div id="brain-template-buttons" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                        <button onclick="applyBrainTemplate('b2b_saas')" class="brain-template-btn" data-template="b2b_saas" style="padding: 12px 8px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; transition: all 0.2s; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">📊</div>
                            <div style="font-size: 12px; font-weight: 600;">B2B SaaS</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.5);">기술 전문성</div>
                        </button>
                        <button onclick="applyBrainTemplate('ecommerce')" class="brain-template-btn" data-template="ecommerce" style="padding: 12px 8px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; transition: all 0.2s; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">🛍️</div>
                            <div style="font-size: 12px; font-weight: 600;">E-Commerce</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.5);">제품 중심</div>
                        </button>
                        <button onclick="applyBrainTemplate('enterprise')" class="brain-template-btn" data-template="enterprise" style="padding: 12px 8px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; transition: all 0.2s; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">🏢</div>
                            <div style="font-size: 12px; font-weight: 600;">Enterprise</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.5);">전문적 신뢰</div>
                        </button>
                        <button onclick="applyBrainTemplate('creative')" class="brain-template-btn" data-template="creative" style="padding: 12px 8px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; transition: all 0.2s; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">🎨</div>
                            <div style="font-size: 12px; font-weight: 600;">Creative</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.5);">감성 트렌디</div>
                        </button>
                    </div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-bottom: 8px;">🎯 Active Directive (Team Goal)</label>
                    <textarea id="brain-directive" rows="4" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; color: #fff; font-size: 14px; resize: vertical;" placeholder="e.g., Increase brand awareness by posting daily news about AI trends..."></textarea>
                    <div style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 4px;">Target specific goals for the entire team to focus on.</div>
                </div>
                
                <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 24px 0;"></div>
                
                <div>
                    <label style="display: block; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-bottom: 8px;">🤖 Sub-Agents Configuration</label>
                    <div style="color: rgba(255,255,255,0.5); font-size: 12px; margin-bottom: 12px;">Fine-tune the behavior and personality of each agent.</div>
                    <div id="brain-subagents-list" style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="text-align:center; padding: 20px; color: rgba(255,255,255,0.5);">Loading sub-agents...</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.08); padding: 20px 24px; display: flex; justify-content: center; gap: 16px;">
                <button onclick="closeAgentBrainModal()" style="flex: 1; max-width: 200px; padding: 12px 24px; border-radius: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer;">Cancel</button>
                <button onclick="saveAgentBrainSettings()" style="flex: 1; max-width: 200px; padding: 12px 24px; border-radius: 10px; background: linear-gradient(135deg, #8b5cf6, #a855f7); border: none; color: #fff; font-weight: 600; cursor: pointer;">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add hover effect for template buttons
    const style = document.createElement('style');
    style.textContent = `
        .brain-template-btn:hover {
            background: rgba(139, 92, 246, 0.2) !important;
            border-color: rgba(139, 92, 246, 0.5) !important;
            transform: translateY(-2px);
        }
        .brain-template-btn.selected {
            background: rgba(139, 92, 246, 0.3) !important;
            border-color: #8b5cf6 !important;
        }
    `;
    document.head.appendChild(style);
}

function renderBrainSubAgents(subAgents) {
    const list = document.getElementById('brain-subagents-list');

    if (subAgents.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: rgba(255,255,255,0.5);">No sub-agents found.</div>';
        return;
    }

    list.innerHTML = subAgents.map(agent => {
        const roleName = agent.role_name || agent.name || agent.agentType || agent.role_type || agent.id || 'Agent';
        const roleType = agent.role_type || agent.agentType || agent.id || '';
        const executionStage = agent.execution_stage || (agent.stage) || 'Agent';

        return `
        <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                    <div style="font-weight: 600; color: #fff; font-size: 15px;">${roleName}</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px;">
                        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #3B82F6; margin-right: 6px;"></span>
                        ${agent.model_id || 'Default Model'}
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: rgba(255,255,255,0.7);">
                    ${executionStage}
                </div>
            </div>
            <div>
                <label style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 6px; display: block;">📝 Behavior Instructions</label>
                <textarea class="brain-agent-prompt" 
                    data-id="${agent.id}" 
                    data-role-name="${roleName}"
                    data-role-type="${roleType}"
                    data-stage="${executionStage}"
                    data-order="${agent.display_order || 0}"
                    rows="3" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; font-family: 'Menlo', monospace;" placeholder="Define how this agent should act...">${agent.system_prompt || ''}</textarea>
            </div>
        </div>
    `}).join('');
}

window.closeAgentBrainModal = function () {
    const modal = document.getElementById('agent-brain-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 200);
    }
};

window.saveAgentBrainSettings = async function () {
    const modal = document.getElementById('agent-brain-modal');
    const projectId = modal?.dataset.projectId;
    const coreTeamId = modal?.dataset.coreTeamId;

    if (!projectId) {
        alert('Project ID not found');
        return;
    }

    const btn = modal.querySelector('.modal-footer button:last-child');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const db = firebase.firestore();
        const batch = db.batch();

        // 1. Update Directive at project level
        const directive = document.getElementById('brain-directive').value;
        batch.update(db.collection('projects').doc(projectId), {
            teamDirective: directive,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update Sub-Agents
        if (coreTeamId) {
            const promptInputs = document.querySelectorAll('.brain-agent-prompt');
            promptInputs.forEach(input => {
                const agentId = input.dataset.id;
                const newPrompt = input.value;

                // ROBUSTNESS: Use set with merge:true to create if missing
                batch.set(
                    db.collection('projectAgentTeamInstances').doc(coreTeamId).collection('subAgents').doc(agentId),
                    {
                        role_name: input.dataset.roleName || '',
                        role_type: input.dataset.roleType || agentId,
                        execution_stage: input.dataset.stage || 'creation',
                        display_order: parseInt(input.dataset.order || '0'),
                        system_prompt: newPrompt,
                        is_active: true,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
            });
        }

        await batch.commit();
        alert('✅ Settings saved successfully!');
        closeAgentBrainModal();

    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

// =====================================================
// 📋 Brain Modal Templates (v5.0)
// =====================================================

const BRAIN_TEMPLATES = {
    b2b_saas: {
        name: 'B2B SaaS',
        icon: '📊',
        teamGoal: `우리는 B2B SaaS 기업입니다. 다음 목표에 집중해주세요:

1. 기술적 전문성을 바탕으로 한 콘텐츠 제작
2. 잠재 고객의 문제 해결 중심 접근
3. 업계 트렌드와 인사이트 공유
4. 고객 사례 및 성공 스토리 강조
5. 전환율 최적화를 위한 CTA 포함`,
        subAgents: {
            research: '경쟁사 SaaS 제품 분석, 업계 트렌드 조사, 기술 동향 파악에 집중하세요.',
            planner: 'B2B 구매 여정을 고려한 콘텐츠 캘린더를 설계하세요. 인지-고려-결정 단계별 콘텐츠를 계획하세요.',
            creator_text: '기술적 정확성과 전문성을 유지하면서도 이해하기 쉬운 언어를 사용하세요. 데이터와 수치를 활용해 신뢰성을 높이세요.',
            creator_image: '깔끔하고 프로페셔널한 비주얼을 만드세요. 다이어그램, 인포그래픽, 제품 스크린샷을 활용하세요.',
            evaluator: 'B2B 마케팅 KPI (리드 생성, 전환율, 참여도)를 기준으로 평가하세요.'
        }
    },
    ecommerce: {
        name: 'E-Commerce',
        icon: '🛍️',
        teamGoal: `우리는 E-Commerce 비즈니스입니다. 다음 목표에 집중해주세요:

1. 제품의 매력과 가치를 극대화
2. 구매 욕구를 자극하는 시각적 콘텐츠
3. 시즌/트렌드에 맞는 시의적절한 콘텐츠
4. 사용자 생성 콘텐츠(UGC) 활용
5. 명확하고 매력적인 프로모션 메시지`,
        subAgents: {
            research: '제품 카테고리 트렌드, 경쟁사 프로모션, 소비자 리뷰 분석에 집중하세요.',
            planner: '쇼핑 시즌, 할인 이벤트, 신제품 출시 일정을 고려한 캘린더를 설계하세요.',
            creator_text: '제품의 장점을 간결하고 매력적으로 표현하세요. 긴급성과 희소성을 활용해 구매를 유도하세요.',
            creator_image: '제품이 주인공이 되는 고품질 이미지를 만드세요. 라이프스타일 컷과 상품 상세 이미지를 적절히 활용하세요.',
            evaluator: 'E-Commerce KPI (CTR, 전환율, 장바구니 추가율)를 기준으로 평가하세요.'
        }
    },
    enterprise: {
        name: 'Enterprise',
        icon: '🏢',
        teamGoal: `우리는 대기업/엔터프라이즈입니다. 다음 목표에 집중해주세요:

1. 브랜드 신뢰도와 권위 구축
2. 전문적이고 일관된 톤앤매너
3. 업계 리더십과 혁신 강조
4. CSR 및 기업 가치 커뮤니케이션
5. 스테이크홀더를 고려한 균형 잡힌 메시지`,
        subAgents: {
            research: '산업 동향, 규제 변화, 경쟁사 동향, 주주 관심사에 대한 심층 분석을 수행하세요.',
            planner: '기업 이벤트, IR 일정, 업계 컨퍼런스를 고려한 전략적 콘텐츠 일정을 수립하세요.',
            creator_text: '격조 있고 전문적인 언어를 사용하세요. 데이터와 성과를 객관적으로 제시하세요.',
            creator_image: '기업 브랜드 가이드라인을 철저히 준수하세요. 프로페셔널하고 품격 있는 비주얼을 만드세요.',
            compliance: '법무팀 검토 기준을 숙지하고, 규제 준수와 브랜드 일관성을 특히 신경 쓰세요.',
            evaluator: '브랜드 인지도, 미디어 노출, 스테이크홀더 참여도 KPI를 기준으로 평가하세요.'
        }
    },
    creative: {
        name: 'Creative',
        icon: '🎨',
        teamGoal: `우리는 창의적이고 트렌디한 브랜드입니다. 다음 목표에 집중해주세요:

1. 감성적이고 공감가는 스토리텔링
2. 트렌드를 선도하는 크리에이티브
3. 바이럴 가능성 높은 콘텐츠
4. MZ세대와 소통하는 언어와 포맷
5. 브랜드 개성과 유머 표현`,
        subAgents: {
            research: '밈, 트렌드, 바이럴 콘텐츠, 인플루언서 동향을 실시간으로 모니터링하세요.',
            planner: '트렌드 사이클을 고려한 민첩한 콘텐츠 계획을 수립하세요. 실시간 마케팅 기회를 놓치지 마세요.',
            creator_text: '젊고 트렌디한 언어를 사용하세요. 유머, 밈, 인터넷 용어를 적절히 활용하세요.',
            creator_image: '대담하고 시선을 사로잡는 비주얼을 만드세요. 컬러풀하고 다이나믹한 디자인을 지향하세요.',
            creator_video: '쇼츠/릴스에 최적화된 짧고 임팩트 있는 영상 개념을 설계하세요.',
            evaluator: '참여율, 공유 수, 댓글 품질, 바이럴 가능성을 기준으로 평가하세요.'
        }
    }
};

window.applyBrainTemplate = function (templateId) {
    const template = BRAIN_TEMPLATES[templateId];
    if (!template) {
        console.error('Template not found:', templateId);
        return;
    }

    // Highlight selected button
    document.querySelectorAll('.brain-template-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`.brain-template-btn[data-template="${templateId}"]`);
    if (selectedBtn) selectedBtn.classList.add('selected');

    // Apply Team Goal
    const directiveEl = document.getElementById('brain-directive');
    if (directiveEl) {
        directiveEl.value = template.teamGoal;
        // Trigger a visual feedback
        directiveEl.style.transition = 'background 0.3s';
        directiveEl.style.background = 'rgba(139, 92, 246, 0.2)';
        setTimeout(() => {
            directiveEl.style.background = 'rgba(0,0,0,0.3)';
        }, 500);
    }

    // Apply Sub-Agent prompts
    Object.entries(template.subAgents).forEach(([agentKey, prompt]) => {
        // Try to find matching textarea by role type, ID patterns, or element ID
        const possibleIds = [
            `agent-prompt-${agentKey}`,
            agentKey
        ];

        let textarea = document.querySelector(`.brain-agent-prompt[data-role-type="${agentKey}"]`);

        if (!textarea) {
            for (const id of possibleIds) {
                textarea = document.querySelector(`.brain-agent-prompt[data-id*="${agentKey}"]`) ||
                    document.getElementById(id);
                if (textarea) break;
            }
        }

        if (textarea && textarea.tagName === 'TEXTAREA') {
            textarea.value = prompt;
            textarea.style.transition = 'background 0.3s';
            textarea.style.background = 'rgba(139, 92, 246, 0.2)';
            setTimeout(() => {
                textarea.style.background = 'rgba(0,0,0,0.3)';
            }, 500);
        }
    });

    console.log(`✅ Applied template: ${template.name}`);
};

/**
 * Open Project Settings (placeholder)
 */
window.openProjectSettings = function (projectId) {
    alert('Project Settings for: ' + projectId + '\n\nThis feature is coming soon!');
};

// =====================================================
// 📡 Channel Manager Modal
// =====================================================

window.openChannelManagerModal = async function (projectId) {
    let modal = document.getElementById('channel-manager-modal');
    if (!modal) {
        createChannelManagerModal();
        modal = document.getElementById('channel-manager-modal');
    }

    modal.dataset.projectId = projectId;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));

    // Reset UI
    const container = document.getElementById('modal-channel-selector');
    container.innerHTML = '<div style="text-align:center; padding:20px; color:gray;">Loading...</div>';

    try {
        const db = firebase.firestore();
        const doc = await db.collection('projects').doc(projectId).get();
        if (!doc.exists) throw new Error("Project not found");

        const data = doc.data();
        const currentChannels = data.targetChannels || [];

        // Render Selector
        if (window.ChannelSelector) {
            await window.ChannelSelector.render('modal-channel-selector', currentChannels, (ch, selected, list) => {
                // Just update internal state if needed, actual save is on 'Save' button
                modal.dataset.tempChannels = JSON.stringify(list);
            });
            // Initialize temp state
            modal.dataset.tempChannels = JSON.stringify(currentChannels);
        }

    } catch (e) {
        console.error("Error opening channel manager:", e);
        alert("Error: " + e.message);
        closeChannelManagerModal();
    }
};

function createChannelManagerModal() {
    const modal = document.createElement('div');
    modal.id = 'channel-manager-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 600px; width: 95%; background: #13131a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 18px; color: #fff;">📡 Manage Channels</h3>
                <button onclick="closeChannelManagerModal()" style="background: none; border: none; color: gray; font-size: 24px; cursor: pointer;">×</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
                <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 16px;">
                    Select the channels where this project's agents should be active.
                </p>
                <div id="modal-channel-selector"></div>
            </div>
            <div class="modal-footer" style="padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; gap: 12px;">
                <button onclick="closeChannelManagerModal()" style="padding: 10px 20px; border-radius: 8px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer;">Cancel</button>
                <button onclick="saveChannelManager()" style="padding: 10px 20px; border-radius: 8px; background: var(--color-cyan); border: none; color: #000; font-weight: bold; cursor: pointer;">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.closeChannelManagerModal = function () {
    const modal = document.getElementById('channel-manager-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 200);
    }
};

window.saveChannelManager = async function () {
    const modal = document.getElementById('channel-manager-modal');
    const projectId = modal.dataset.projectId;
    const tempChannels = JSON.parse(modal.dataset.tempChannels || '[]');

    // Validation
    if (tempChannels.length === 0) {
        alert("Please select at least one channel.");
        return;
    }

    const btn = modal.querySelector('.modal-footer button:last-child');
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        await firebase.firestore().collection('projects').doc(projectId).update({
            targetChannels: tempChannels,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Refresh UI handled by snapshot listener
        closeChannelManagerModal();
    } catch (e) {
        console.error("Error saving channels:", e);
        alert("Failed to save: " + e.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

// =====================================================
// ▶️ Run Project Agents
// =====================================================
// =====================================================
// ▶️ Run/Pause Project Agents (Toggle Logic)
// =====================================================
window.toggleProjectAgent = async function (projectId, btn) {
    // Find the card element to apply the glow effect
    const card = btn.closest('.client-card');
    const isRunning = btn.classList.contains('active');

    // Disable button during transition to prevent double-clicks
    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner">...</span>'; // Simple loading indicator

    try {
        if (!isRunning) {
            // STATE: START RUNNING
            if (!confirm("🚀 Ready to run agents on selected channels?\n\nThis will trigger the content generation workflow.")) {
                btn.disabled = false;
                btn.innerHTML = originalContent;
                return;
            }

            // 1. Update Firestore
            await firebase.firestore().collection('projects').doc(projectId).update({
                agentStatus: 'running',
                lastRunStarted: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. UI Updates (Optimistic update, though snapshot listener handles it too)
            // btn.classList.add('active'); ... (handled by render/snapshot)

            console.log(`[Run] Agent started for project ${projectId}...`);

        } else {
            // STATE: PAUSE (STOP)

            // 1. Update Firestore
            await firebase.firestore().collection('projects').doc(projectId).update({
                agentStatus: 'paused',
                lastRunStopped: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. UI Updates
            // btn.classList.remove('active'); ... (handled by render/snapshot)

            console.log(`[Pause] Agent stopped for project ${projectId}.`);
        }
    } catch (error) {
        console.error("Error toggling agent status:", error);
        alert("Failed to update status: " + error.message);
        btn.innerHTML = originalContent; // Revert on error
    } finally {
        btn.disabled = false;
        // The actual UI update will happen via the onSnapshot listener calling renderProjectCards
    }
};

window.deleteProject = async function (projectId) {
    if (!confirm("⚠️ Are you sure you want to delete this project?\n\nThis action cannot be undone.")) {
        return;
    }

    try {
        await firebase.firestore().collection('projects').doc(projectId).delete();
        // UI will update automatically via onSnapshot
    } catch (error) {
        console.error("Error deleting project:", error);
        alert("Failed to delete project: " + error.message);
    }
};

// Deprecated old function kept just in case
window.runProjectAgents = window.toggleProjectAgent;

// Inject Global Styles for Project Card Channels
(function injectCardStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .channel-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.7);
            transition: all 0.2s;
        }
        .channel-badge:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
            transform: translateY(-1px);
        }
        .btn-add-channel {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: transparent;
            border: 1px dashed rgba(255,255,255,0.2);
            color: rgba(255,255,255,0.5);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;
        }
        .btn-add-channel:hover {
            border-color: var(--color-cyan);
            color: var(--color-cyan);
            background: rgba(6, 182, 212, 0.1);
        }
        
        /* Agent Running Glow Effect */
        .client-card.agent-running {
            border-color: #3b82f6 !important; /* Blue-500 */
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), inset 0 0 10px rgba(59, 130, 246, 0.2);
            animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
            0% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
            50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.8); }
            100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
        }

        /* Delete Button Hover */
        .btn-delete:hover {
            border-color: #ef4444 !important;
            color: #ef4444 !important;
            background: rgba(239, 68, 68, 0.1) !important;
        }
    `;
    document.head.appendChild(style);
})();

// =====================================================
// ⚙️ Project Settings Modal
// =====================================================

window.openProjectSettingsModal = async function (projectId, projectName) {
    let modal = document.getElementById('project-settings-modal');
    if (!modal) {
        createProjectSettingsModal();
        modal = document.getElementById('project-settings-modal');
    }

    modal.dataset.projectId = projectId;
    document.getElementById('project-settings-title').textContent = `Settings: ${projectName}`;

    // Load current interval
    const select = document.getElementById('scheduler-interval-select');
    select.disabled = true;

    try {
        const doc = await firebase.firestore().collection('projects').doc(projectId).get();
        if (doc.exists) {
            const data = doc.data();
            select.value = data.schedulerInterval || '60'; // Default 60 mins
        }
    } catch (e) {
        console.error("Error loading project settings:", e);
    } finally {
        select.disabled = false;
    }

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
};

function createProjectSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'project-settings-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 500px; width: 90%; background: #13131a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <h3 id="project-settings-title" style="margin: 0; font-size: 18px; color: #fff;">Project Settings</h3>
                <button onclick="closeProjectSettingsModal()" style="background: none; border: none; color: gray; font-size: 24px; cursor: pointer;">×</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
                
                <!-- Scheduler Settings -->
                <div style="margin-bottom: 32px;">
                    <label style="display: block; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                        ⏱️ Agent Execution Frequency
                    </label>
                    <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                        <select id="scheduler-interval-select" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                            <option value="60">Every 1 Hour (Fastest)</option>
                            <option value="360">Every 6 Hours</option>
                            <option value="720">Every 12 Hours</option>
                            <option value="1440">Every 24 Hours</option>
                        </select>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">
                            💡 Higher frequency consumes more credits.
                        </div>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div>
                    <label style="display: block; color: #ef4444; font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                        ⚠️ Danger Zone
                    </label>
                    <div style="background: rgba(239, 68, 68, 0.05); padding: 16px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2);">
                        <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 12px;">
                            Deleting a project is irreversible. All data and agents will be removed.
                        </div>
                        <button onclick="deleteProjectFromModal()" style="width: 100%; padding: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            Delete Project
                        </button>
                    </div>
                </div>

            </div>
            <div class="modal-footer" style="padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; gap: 12px;">
                <button onclick="closeProjectSettingsModal()" style="padding: 10px 20px; border-radius: 8px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer;">Cancel</button>
                <button onclick="saveProjectSettings()" style="padding: 10px 20px; border-radius: 8px; background: var(--color-cyan); border: none; color: #000; font-weight: bold; cursor: pointer;">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.closeProjectSettingsModal = function () {
    const modal = document.getElementById('project-settings-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 200);
    }
};

window.saveProjectSettings = async function () {
    const modal = document.getElementById('project-settings-modal');
    const projectId = modal.dataset.projectId;
    const interval = document.getElementById('scheduler-interval-select').value;

    const btn = modal.querySelector('.modal-footer button:last-child');
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        await firebase.firestore().collection('projects').doc(projectId).update({
            schedulerInterval: parseInt(interval),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeProjectSettingsModal();
        // UI auto-updates via listener
    } catch (e) {
        console.error("Failed to save settings:", e);
        alert("Error: " + e.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

window.deleteProjectFromModal = async function () {
    const modal = document.getElementById('project-settings-modal');
    const projectId = modal.dataset.projectId;

    // Call the existing global delete function
    await window.deleteProject(projectId);
    closeProjectSettingsModal();
};

