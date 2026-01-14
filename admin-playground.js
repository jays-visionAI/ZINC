// admin-playground.js
// Agent Playground - Test agents before production deployment

(function () {
    'use strict';
    console.log("[AgentPlayground] Initializing...");

    let registryAgents = [];
    let selectedAgent = null;
    let selectedVersion = null;
    let isRunning = false;

    // Initialize


    // Load agents from Registry
    window.loadPlaygroundAgents = async function () {
        const listContainer = document.getElementById('playground-agent-list');
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.4);">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
                <p>Loading agents...</p>
            </div>
        `;

        try {
            // [Fix] Fetch all documents without sorting to avoid index requirements
            const snapshot = await db.collection('agentRegistry').get();

            registryAgents = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Client-side status filter
                if (data.status === 'active') {
                    registryAgents.push({ id: doc.id, ...data });
                }
            });

            // Client-side sorting
            registryAgents.sort((a, b) => {
                const catDiff = a.category.localeCompare(b.category);
                if (catDiff !== 0) return catDiff;
                return a.name.localeCompare(b.name);
            });

            console.log(`[AgentPlayground] Loaded ${registryAgents.length} agents`);
            renderAgentList(registryAgents);
        } catch (error) {
            console.error("[AgentPlayground] Error loading agents:", error);
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f85149;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                    <p>Failed to load agents</p>
                    <p style="font-size: 12px;">${error.message}</p>
                </div>
            `;
        }
    };

    // Filter agents by category - Deprecated: Now just re-renders all
    window.filterPlaygroundAgents = function () {
        renderAgentList(registryAgents);
    };

    // Render agent list
    function renderAgentList(agents) {
        const container = document.getElementById('playground-agent-list');

        if (agents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.4);">
                    <i class="fas fa-inbox" style="font-size: 24px;"></i>
                    <p>No agents found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = agents.map(agent => {
            const isSelected = selectedAgent?.id === agent.id;

            return `
                <div class="playground-agent-item" 
                     style="padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
                            background: ${isSelected ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255,255,255,0.03)'};
                            border: 1px solid ${isSelected ? '#4ecdc4' : 'rgba(255,255,255,0.08)'};"
                     onclick="selectPlaygroundAgent('${agent.id}')"
                     onmouseover="this.style.background='${isSelected ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255,255,255,0.06)'}'"
                     onmouseout="this.style.background='${isSelected ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255,255,255,0.03)'}'">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 14px; color: #fff;">${agent.name}</div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.5); font-family: 'JetBrains Mono', monospace;">${agent.id}</div> 
                        </div>
                        ${isSelected ? '<i class="fas fa-check-circle" style="color: #4ecdc4;"></i>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Select an agent
    window.selectPlaygroundAgent = async function (agentId) {
        selectedAgent = registryAgents.find(a => a.id === agentId);
        if (!selectedAgent) return;

        // Update UI
        document.getElementById('playground-selected-agent').style.display = 'block';
        document.getElementById('playground-selected-name').textContent = selectedAgent.name;
        document.getElementById('playground-selected-category').textContent = `${selectedAgent.category} • ${agentId}`;

        // Re-render list to show selection
        filterPlaygroundAgents();

        // Load production version
        document.getElementById('playground-prompt-preview').textContent = 'Loading prompt...';

        try {
            // Query for production version
            const versionsSnap = await db.collection('agentVersions')
                .where('agentId', '==', agentId)
                .where('isProduction', '==', true)
                .limit(1)
                .get();

            if (versionsSnap.empty) {
                document.getElementById('playground-prompt-preview').textContent = 'No production version found for this agent.';
                selectedVersion = null;
                document.getElementById('playground-run-btn').disabled = true;
                return;
            }

            selectedVersion = { id: versionsSnap.docs[0].id, ...versionsSnap.docs[0].data() };

            // Update prompt preview
            document.getElementById('playground-prompt-preview').textContent = selectedVersion.systemPrompt || '(No prompt defined)';

            // Update model/temperature from version config
            if (selectedVersion.config?.model) {
                document.getElementById('playground-model').value = selectedVersion.config.model;
            }
            if (selectedVersion.config?.temperature !== undefined) {
                document.getElementById('playground-temperature').value = selectedVersion.config.temperature;
            }

            // Enable run button
            document.getElementById('playground-run-btn').disabled = false;

        } catch (error) {
            console.error("[AgentPlayground] Error loading version:", error);
            document.getElementById('playground-prompt-preview').textContent = `Error: ${error.message}`;
            document.getElementById('playground-run-btn').disabled = true;
        }
    };


    // Image attachment state
    let currentAttachedImages = [];

    // Initialize logic
    function initDragAndDrop() {
        const dropZone = document.getElementById('playground-drop-zone');
        const userMsg = document.getElementById('playground-user-message');
        const overlay = document.getElementById('playground-drag-overlay');

        if (!dropZone || !userMsg) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                overlay.style.display = 'flex';
                dropZone.style.border = '2px dashed #4ecdc4';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                overlay.style.display = 'none';
                dropZone.style.border = '2px dashed rgba(78, 205, 196, 0.2)';
            }, false);
        });

        dropZone.addEventListener('drop', handleDrop, false);

        // Paste support
        userMsg.addEventListener('paste', handlePaste);
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handlePaste(e) {
        if (e.clipboardData && e.clipboardData.items) {
            const items = e.clipboardData.items;
            const files = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    files.push(items[i].getAsFile());
                }
            }
            if (files.length > 0) {
                handleFiles(files);
            }
        }
    }

    window.handlePlaygroundFileSelect = function (input) {
        handleFiles(input.files);
    };

    function handleFiles(files) {
        if (files.length === 0) return;

        // Calculate how many we can add
        const remainingSlots = 5 - currentAttachedImages.length;
        if (remainingSlots <= 0) {
            alert('Maximum 5 images allowed.');
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        if (files.length > remainingSlots) {
            alert(`Only ${remainingSlots} more image(s) allowed. First ${remainingSlots} added.`);
        }

        let processedCount = 0;

        filesToProcess.forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert(`Skipped non-image file: ${file.name}`);
                processedCount++;
                return;
            }

            const reader = new FileReader();
            reader.onloadend = function () {
                currentAttachedImages.push(reader.result); // base64 string
                processedCount++;
                if (processedCount === filesToProcess.length) {
                    updateImagePreviews();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function updateImagePreviews() {
        const previewContainer = document.getElementById('playground-image-preview');
        const list = document.getElementById('playground-preview-list');

        if (!previewContainer || !list) return;

        if (currentAttachedImages.length === 0) {
            previewContainer.style.display = 'none';
            list.innerHTML = '';
            return;
        }

        previewContainer.style.display = 'block';
        list.innerHTML = currentAttachedImages.map((src, index) => `
            <div style="position: relative; display: inline-block;">
                <img src="${src}" 
                    style="height: 60px; width: auto; border-radius: 4px; border: 1px solid #333; object-fit: cover;">
                <button onclick="removePlaygroundImage(${index})"
                    style="position: absolute; top: -6px; right: -6px; background: #f85149; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    window.removePlaygroundImage = function (index) {
        if (index >= 0 && index < currentAttachedImages.length) {
            currentAttachedImages.splice(index, 1);
            updateImagePreviews();
        }
    };

    window.clearPlaygroundImage = function () {
        currentAttachedImages = [];
        updateImagePreviews();
        const fileInput = document.getElementById('playground-file-input');
        if (fileInput) fileInput.value = '';
    };

    // Modified initPlayground to include DnD init
    window.initPlayground = function (user) {
        console.log("[AgentPlayground] Loading playground...");
        loadPlaygroundAgents();
        setTimeout(initDragAndDrop, 100); // Async init
    };

    // Run test
    window.runPlaygroundTest = async function () {
        if (!selectedAgent || !selectedVersion || isRunning) return;

        const userMessage = document.getElementById('playground-user-message').value.trim();
        const hasImages = currentAttachedImages.length > 0;

        if (!userMessage && !hasImages) {
            alert('Please enter a message or attach an image');
            return;
        }

        const model = document.getElementById('playground-model').value;
        const temperature = parseFloat(document.getElementById('playground-temperature').value);

        const outputDiv = document.getElementById('playground-output');
        const statsDiv = document.getElementById('playground-output-stats');
        const runBtn = document.getElementById('playground-run-btn');

        // Update UI
        isRunning = true;
        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
        outputDiv.innerHTML = '<span style="color: #4ecdc4;">⏳ Executing agent...</span>';
        statsDiv.textContent = '';

        const startTime = Date.now();

        try {
            // Determine provider
            let provider = '';
            if (model.startsWith('claude')) provider = 'anthropic';
            else if (model.startsWith('deepseek')) provider = 'deepseek';
            else if (model.includes('gemini') || model.includes('imagen') || model.includes('veo') || model.includes('nano')) provider = 'google';

            // Default fallback if not matched
            if (!provider) provider = 'deepseek';

            // Call the LLM via Cloud Function
            const response = await firebase.functions().httpsCallable('generateLLMResponse')({
                provider: provider,
                model: model,
                systemPrompt: selectedVersion.systemPrompt,
                userMessage: userMessage,
                images: currentAttachedImages, // Send array of images
                temperature: temperature,
                source: 'agent_playground'
            });

            const duration = Date.now() - startTime;
            const resData = response.data;

            if (resData.success) {
                let content = resData.response;
                if (typeof content === 'string') content = content.trim();

                console.log("[AgentPlayground] Response:", content);

                // Detect content type
                const isImageModel = model.includes('imagen') || model.includes('nano');
                const isVideoModel = model.includes('veo');
                const isUrl = typeof content === 'string' && (content.startsWith('http') || content.startsWith('data:image'));
                const mdImageMatch = typeof content === 'string' && content.match(/!\[.*?\]\((.*?)\)/);

                if (isVideoModel) {
                    // Video Rendering (Veo)
                    let videoUrl = content;
                    if (mdImageMatch) videoUrl = mdImageMatch[1];

                    outputDiv.innerHTML = `
                        <div style="text-align:center; padding: 20px;">
                            <video controls autoplay loop style="max-width:100%; max-height: 400px; border-radius:8px; border: 1px solid #333;">
                                <source src="${videoUrl}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                            <div style="margin-top:12px; font-size:12px; color:#888;">
                                <i class="fas fa-video"></i> Generated Video • <a href="${videoUrl}" target="_blank" style="color:#4ecdc4;">Download</a>
                            </div>
                        </div>
                     `;
                } else if (isImageModel || isUrl || mdImageMatch) {
                    // Image Rendering
                    let imageUrl = content;
                    if (mdImageMatch) imageUrl = mdImageMatch[1];

                    outputDiv.innerHTML = `
                        <div style="text-align:center; padding: 20px;">
                            <img src="${imageUrl}" 
                                 style="max-width:100%; max-height: 400px; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.3); cursor: pointer;" 
                                 onclick="window.open(this.src)" 
                                 title="Click to open full size"
                                 onerror="this.onerror=null; this.src=''; this.parentElement.innerHTML='<p style=\'color:#f85149\'>Failed to load image. URL expired or invalid.</p><p style=\'font-size:10px\'>'+'${imageUrl}'+'</p>';">
                            <div style="margin-top:12px; font-size:12px; color:#888;">
                                <i class="fas fa-image"></i> Generated Image • <a href="${imageUrl}" target="_blank" style="color:#4ecdc4;">Open Original</a>
                            </div>
                        </div>
                    `;
                } else {
                    // Text Rendering
                    outputDiv.innerHTML = escapeHtml(content);
                }

                // Display actual model used from response if available
                const actualModel = resData.model || model;
                statsDiv.textContent = `✓ Completed in ${(duration / 1000).toFixed(2)}s • ${actualModel}`;
                statsDiv.style.color = '#3fb950';
            } else {
                outputDiv.innerHTML = `<span style="color: #f85149;">Error: ${resData.error || 'Unknown error'}</span>`;
                statsDiv.textContent = `✗ Failed after ${(duration / 1000).toFixed(2)}s`;
                statsDiv.style.color = '#f85149';
            }

        } catch (error) {
            console.error("[AgentPlayground] Test failed:", error);
            const duration = Date.now() - startTime;
            outputDiv.innerHTML = `<span style="color: #f85149;">Error: ${error.message}</span>`;
            statsDiv.textContent = `✗ Failed after ${(duration / 1000).toFixed(2)}s`;
            statsDiv.style.color = '#f85149';
        } finally {
            isRunning = false;
            runBtn.disabled = false;
            runBtn.innerHTML = '<i class="fas fa-play"></i> Run Test';
        }
    };

    // Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

})();
