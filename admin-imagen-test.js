/**
 * admin-imagen-test.js
 * Logic for Imagen Model Unit Testing Page
 */

async function initImagenTest(currentUser) {
    console.log("[ImagenTest] Initializing...");

    const projectSelect = document.getElementById('test-project-select');
    const modelSelect = document.getElementById('imagen-model-select');
    const promptInput = document.getElementById('imagen-prompt');
    const generateBtn = document.getElementById('btn-generate-image');
    const resultContainer = document.getElementById('imagen-result-container');
    const logsContainer = document.getElementById('imagen-logs');

    // 1. Load Projects (Context)
    await loadProjects();

    // 2. Event Listeners
    generateBtn.addEventListener('click', handleGeneration);
    document.getElementById('clear-test-logs').addEventListener('click', () => {
        logsContainer.innerHTML = '';
    });

    async function loadProjects() {
        try {
            log('Loading projects...', 'info');
            const snapshot = await db.collection('projects')
                .where('userId', '==', currentUser.uid)
                .orderBy('updatedAt', 'desc')
                .limit(10)
                .get();

            projectSelect.innerHTML = '';
            if (snapshot.empty) {
                const opt = document.createElement('option');
                opt.text = "No projects found";
                projectSelect.add(opt);
                return;
            }

            snapshot.forEach(doc => {
                const p = doc.data();
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.text = `${p.name} (${doc.id.substr(0, 6)}...)`;
                projectSelect.add(opt);
            });
            log(`Loaded ${snapshot.size} projects. Selected default.`, 'success');
        } catch (err) {
            log(`Failed to load projects: ${err.message}`, 'error');
            // Fallback for non-indexed queries
            if (err.message.includes('requires an index')) {
                const opt = document.createElement('option');
                opt.value = "admin-fallback-project";
                opt.text = "Admin Fallback Project (No Index)";
                projectSelect.add(opt);
            }
        }
    }

    async function handleGeneration() {
        const projectId = projectSelect.value;
        const model = modelSelect.value;
        const prompt = promptInput.value.trim();
        const negativePrompt = document.getElementById('imagen-negative-prompt').value.trim();

        if (!projectId) {
            alert("Please select a project context.");
            return;
        }
        if (!prompt) {
            alert("Please enter a prompt.");
            return;
        }

        // Reset UI
        resultContainer.innerHTML = '<div class="placeholder-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>Generating Image...</p></div>';
        generateBtn.disabled = true;
        const startTime = Date.now();

        log(`Starting generation...`, 'info');
        log(`Model: ${model}`, 'info');
        log(`Prompt: "${prompt}"`, 'info');

        try {
            // Construct Task Prompt with optional modifications
            let finalPrompt = prompt;
            if (negativePrompt) {
                finalPrompt += ` --no ${negativePrompt}`; // DALL-E style or implicit
            }

            // Call Cloud Function "executeSubAgent"
            // We reuse the existing generic agent endpoint but route it to our image model
            const executeSubAgent = firebase.functions().httpsCallable('executeSubAgent');

            const payload = {
                projectId: projectId,
                teamId: 'admin-test-lab',
                subAgentId: 'imagen-tester',
                agentRole: 'Visual Artist', // Hint for some logic
                model: model, // This triggers the routing in callLLM
                taskPrompt: finalPrompt,
                systemPrompt: "You are an AI Artist. Generate an image based on the prompt.",
                temperature: 1.0
            };

            const result = await executeSubAgent(payload);
            const data = result.data;

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            if (data.success) {
                log(`Generation success! (${duration}s)`, 'success');
                displayResult(data.output || data.content); // Output might be URL or Base64 or HTML?

                // Update Meta
                document.getElementById('result-meta').style.display = 'flex';
                document.getElementById('meta-model').textContent = model;
                document.getElementById('meta-time').textContent = `${duration}s`;

            } else {
                throw new Error(data.error || 'Unknown failure');
            }

        } catch (err) {
            console.error(err);
            log(`Error: ${err.message}`, 'error');
            resultContainer.innerHTML = `<div class="placeholder-state" style="color:red"><i class="fas fa-exclamation-circle fa-3x"></i><p>Failed: ${err.message}</p></div>`;

            if (err.details && err.details.rawError) {
                log(`Raw Error: ${err.details.rawError}`, 'error');
            }
        } finally {
            generateBtn.disabled = false;
        }
    }

    function displayResult(content) {
        // Content might be a direct URL, Base64 ID, or Markdown image syntax
        console.log("Result Content:", content);

        let imageUrl = content;

        // 1. Check if content is Markdown image: ![alt](url)
        const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
        if (mdMatch && mdMatch[1]) {
            imageUrl = mdMatch[1];
        }

        // 2. Check if it's a Storage Path (gs:// or /projects/...) - Assume signed URL or public URL logic needed
        // For now, assume callLLM returns a public URL or Signed URL.
        // If NanoBananaPro returns a storage path, we might need to resolve it.
        // But let's assume it returns a usable URL or base64 for now.

        if (imageUrl.startsWith('http') || imageUrl.startsWith('data:image')) {
            resultContainer.innerHTML = `<img src="${imageUrl}" alt="Generated Image" onclick="window.open(this.src)">`;
        } else {
            // Text fallback
            resultContainer.innerHTML = `<div style="padding:20px; color:#fff; white-space:pre-wrap;">${content}</div>`;
            log("Warning: Output does not look like an image URL.", 'warn');
        }
    }

    function log(msg, type = 'info') {
        const div = document.createElement('div');
        div.className = `log-${type}`;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
}

// Expose to window for admin.js loader
window.initImagenTest = initImagenTest;
