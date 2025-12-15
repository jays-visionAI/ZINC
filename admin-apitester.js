
// ==========================================
// API TESTER UTILITIES (New Tab Logic)
// ==========================================

async function initApiTester() {
    console.log("🧪 Initializing API Tester...");
    await autoFillGeminiKey();
}

/**
 * Auto-fill Gemini Key from System Providers if available
 */
async function autoFillGeminiKey() {
    if (!window.LLMProviderService) return;
    try {
        const providers = await window.LLMProviderService.getProviders();
        // Look for 'gemini' or 'google'
        const googleProvider = providers.find(p => p.provider === 'google' || p.provider === 'gemini');

        if (googleProvider && googleProvider.apiKey) {
            document.getElementById('test-gemini-key').value = googleProvider.apiKey;
            console.log("✅ Auto-filled Gemini Key from System");
        } else {
            console.log("⚠️ No Google/Gemini provider found in system to auto-fill.");
        }
    } catch (e) {
        console.error("Failed to auto-load key:", e);
    }
}

/**
 * Execute Gemini Model List (User's logic adapted)
 */
async function runGeminiModelList() {
    const key = document.getElementById('test-gemini-key').value.trim();
    const statusEl = document.getElementById('test-gemini-list-status');
    const outEl = document.getElementById('test-gemini-list-output');

    if (!key) {
        alert("Please enter an API Key first.");
        return;
    }

    statusEl.innerHTML = '<span style="color:#f59e0b">⏳ Fetching models...</span>';
    outEl.textContent = "";

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
        const res = await fetch(url, { method: "GET" });
        const text = await res.text();

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const data = JSON.parse(text);
        const models = data.models || [];

        // Filter and Format
        const summary = models.map(m => `• ${m.name} (${m.displayName})`).join('\n');

        outEl.textContent = JSON.stringify(data, null, 2); // Show full JSON for debugging
        statusEl.innerHTML = `<span style="color:#10b981">✅ OK. Found ${models.length} models.</span>`;

        // Auto-select a likely candidate for generation test
        const bestModel = models.find(m => m.name.includes('gemini-2.0-flash-exp')) || models.find(m => m.name.includes('gemini-1.5-pro'));
        if (bestModel) {
            document.getElementById('test-gemini-model-id').value = bestModel.name.replace('models/', '');
        }

    } catch (e) {
        statusEl.innerHTML = `<span style="color:#ef4444">❌ Error</span>`;
        outEl.textContent = e.message;
    }
}

/**
 * Execute Gemini Generation Test
 */
async function runGeminiGeneration() {
    const key = document.getElementById('test-gemini-key').value.trim();
    const modelId = document.getElementById('test-gemini-model-id').value.trim();
    const prompt = document.getElementById('test-gemini-prompt').value.trim();

    const statusEl = document.getElementById('test-gemini-gen-status');
    const outEl = document.getElementById('test-gemini-gen-output');

    if (!key || !modelId || !prompt) {
        alert("Missing Key, Model ID, or Prompt.");
        return;
    }

    statusEl.innerHTML = '<span style="color:#f59e0b">⏳ Generating...</span>';
    outEl.textContent = "";

    try {
        // Handle "models/" prefix if user omitted it, actually the API is flexible but "models/" is standard in URL path usually or just the ID
        // The user script did: models/${modelId}:generateContent

        const cleanModelId = modelId.replace('models/', '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelId}:generateContent?key=${encodeURIComponent(key)}`;

        const body = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const text = await res.text();
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const data = JSON.parse(text);
        outEl.textContent = JSON.stringify(data, null, 2);

        // Quick extraction
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer) {
            statusEl.innerHTML = `<span style="color:#10b981">✅ Success!</span> <span style="color:#fff">"${answer.substring(0, 50)}..."</span>`;
        } else {
            statusEl.innerHTML = `<span style="color:#10b981">✅ Success (Raw JSON)</span>`;
        }

    } catch (e) {
        statusEl.innerHTML = `<span style="color:#ef4444">❌ Error</span>`;
        outEl.textContent = e.message;
    }
}

// Make global
window.initApiTester = initApiTester;
window.autoFillGeminiKey = autoFillGeminiKey;
window.runGeminiModelList = runGeminiModelList;
window.runGeminiGeneration = runGeminiGeneration;
