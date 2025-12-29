// admin-pipeline.js - Logic for 5-Step Pipeline Settings

window.initPipeline = async function (currentUser) {
    console.log('[Pipeline Settings] Initializing...');

    // 1. Tab Switching Logic
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content visibility
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `tab-${tabId}`);
            });
        });
    });

    // 2. Slider Labels
    const sliders = [
        { id: 'agent-standard-temp', label: 'label-standard-temp' },
        { id: 'agent-depth-temp', label: 'label-depth-temp' }
    ];

    sliders.forEach(s => {
        const slider = document.getElementById(s.id);
        const label = document.getElementById(s.label);
        if (slider && label) {
            slider.addEventListener('input', () => {
                label.textContent = slider.value;
            });
        }
    });

    // 3. Load Data from Firestore
    await loadPipelineSettings();

    // 4. Save Logic
    const btnSave = document.getElementById('save-knowledge-settings');
    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            await savePipelineSettings();
        });
    }
};

async function loadPipelineSettings() {
    console.log('[Pipeline] Loading settings from Firestore...');
    try {
        const doc = await db.collection('pipelineSettings').doc('knowledge_hub').get();

        if (doc.exists) {
            const data = doc.data();
            console.log('[Pipeline] Data found:', data);

            // Standard Agent
            if (data.standard) {
                document.getElementById('agent-standard-model').value = data.standard.model || 'gpt-4o';
                document.getElementById('agent-standard-temp').value = data.standard.temperature || 0.2;
                document.getElementById('label-standard-temp').textContent = data.standard.temperature || 0.2;
                document.getElementById('agent-standard-prompt').value = data.standard.systemPrompt || '';
            }

            // Depth Agent
            if (data.depth) {
                document.getElementById('agent-depth-model').value = data.depth.model || 'gpt-4o';
                document.getElementById('agent-depth-temp').value = data.depth.temperature || 0.3;
                document.getElementById('label-depth-temp').textContent = data.depth.temperature || 0.3;
                document.getElementById('agent-depth-prompt').value = data.depth.systemPrompt || '';
            }
        } else {
            console.log('[Pipeline] No settings found, using defaults.');
            // Set defaults if empty
            document.getElementById('agent-standard-prompt').value = "You are a Brand Intelligence AI. Analyze the provided source documents and generate a comprehensive brand summary in JSON format.";
            document.getElementById('agent-depth-prompt').value = "You are a Senior Strategic Brand Analyst. Your task is to generate a deep, A4-length comprehensive report (approx. 1500-2000 words) based on the provided Knowledge Hub data. Break down the report into: 1. Core Vision & Philosophy, 2. Technical Stack & Innovation, 3. Market Positioning, 4. Competitive Moat, 5. Future Roadmap. Be extremely detailed and academic in tone.";
        }
    } catch (err) {
        console.error('[Pipeline] Error loading settings:', err);
    }
}

async function savePipelineSettings() {
    const btnSave = document.getElementById('save-knowledge-settings');
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    const settings = {
        standard: {
            model: document.getElementById('agent-standard-model').value,
            temperature: parseFloat(document.getElementById('agent-standard-temp').value),
            systemPrompt: document.getElementById('agent-standard-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        depth: {
            model: document.getElementById('agent-depth-model').value,
            temperature: parseFloat(document.getElementById('agent-depth-temp').value),
            systemPrompt: document.getElementById('agent-depth-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    };

    try {
        await db.collection('pipelineSettings').doc('knowledge_hub').set(settings, { merge: true });
        // showNotification is a global helper in admin panel
        if (window.showNotification) window.showNotification('Step 1 Pipeline Settings saved!', 'success');
        else alert('Settings saved successfully!');
    } catch (err) {
        console.error('[Pipeline] Error saving settings:', err);
        alert('Error saving settings: ' + err.message);
    } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Save Pipeline Settings';
    }
}
