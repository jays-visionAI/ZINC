// admin-pipeline-brand.js - Step 2: Brand Brain
window.initPipelineBrand = async function (currentUser) {
    console.log('[Pipeline: Brand Brain] Initializing...');

    const tempSlider = document.getElementById('agent-planner-temp');
    const tempLabel = document.getElementById('label-planner-temp');
    if (tempSlider && tempLabel) {
        tempSlider.addEventListener('input', () => { tempLabel.textContent = tempSlider.value; });
    }

    await loadBrandSettings();

    const btnSave = document.getElementById('save-brand-settings');
    if (btnSave) {
        btnSave.addEventListener('click', async () => { await saveBrandSettings(); });
    }
};

async function loadBrandSettings() {
    try {
        const doc = await db.collection('pipelineSettings').doc('brand_brain').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.planner) {
                document.getElementById('agent-planner-model').value = data.planner.model || 'gpt-4o';
                document.getElementById('agent-planner-temp').value = data.planner.temperature || 0.5;
                document.getElementById('label-planner-temp').textContent = data.planner.temperature || 0.5;
                document.getElementById('agent-planner-prompt').value = data.planner.systemPrompt || '';
            }
        }
    } catch (err) { console.error('Error loading brand settings:', err); }
}

async function saveBrandSettings() {
    const btnSave = document.getElementById('save-brand-settings');
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    const settings = {
        planner: {
            model: document.getElementById('agent-planner-model').value,
            temperature: parseFloat(document.getElementById('agent-planner-temp').value),
            systemPrompt: document.getElementById('agent-planner-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    };

    try {
        await db.collection('pipelineSettings').doc('brand_brain').set(settings, { merge: true });
        if (window.showNotification) window.showNotification('Brand Brain Settings saved!', 'success');
    } catch (err) { alert('Error saving: ' + err.message); }
    finally { btnSave.disabled = false; btnSave.textContent = 'Save Brand Brain Settings'; }
}
