// admin-pipeline-studio.js - Step 4: Studio
window.initPipelineStudio = async function (currentUser) {
    console.log('[Pipeline: Studio] Initializing...');

    const sliders = [
        { id: 'agent-creator-temp', label: 'label-creator-temp' },
        { id: 'agent-text-temp', label: 'label-text-temp' },
        { id: 'agent-image-temp', label: 'label-image-temp' }
    ];

    sliders.forEach(s => {
        const slider = document.getElementById(s.id);
        const label = document.getElementById(s.label);
        if (slider && label) {
            slider.addEventListener('input', () => { label.textContent = slider.value; });
        }
    });

    await loadStudioSettings();
    const btnSave = document.getElementById('save-studio-settings');
    if (btnSave) {
        btnSave.addEventListener('click', async () => { await saveStudioSettings(); });
    }
};

async function loadStudioSettings() {
    try {
        const doc = await db.collection('pipelineSettings').doc('studio').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.creator) {
                document.getElementById('agent-creator-model').value = data.creator.model || 'gpt-4o';
                document.getElementById('agent-creator-temp').value = data.creator.temperature || 0.7;
                document.getElementById('label-creator-temp').textContent = data.creator.temperature || 0.7;
                document.getElementById('agent-creator-prompt').value = data.creator.systemPrompt || '';
            }
            if (data.text) {
                document.getElementById('agent-text-model').value = data.text.model || 'gpt-4o';
                document.getElementById('agent-text-temp').value = data.text.temperature || 0.8;
                document.getElementById('label-text-temp').textContent = data.text.temperature || 0.8;
                document.getElementById('agent-text-prompt').value = data.text.systemPrompt || '';
            }
            if (data.image) {
                document.getElementById('agent-image-model').value = data.image.model || 'gpt-4o';
                document.getElementById('agent-image-temp').value = data.image.temperature || 0.6;
                document.getElementById('label-image-temp').textContent = data.image.temperature || 0.6;
                document.getElementById('agent-image-prompt').value = data.image.systemPrompt || '';
            }
        }
    } catch (err) { console.error('Error loading studio settings:', err); }
}

async function saveStudioSettings() {
    const btnSave = document.getElementById('save-studio-settings');
    btnSave.disabled = true;
    const settings = {
        creator: {
            model: document.getElementById('agent-creator-model').value,
            temperature: parseFloat(document.getElementById('agent-creator-temp').value),
            systemPrompt: document.getElementById('agent-creator-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        text: {
            model: document.getElementById('agent-text-model').value,
            temperature: parseFloat(document.getElementById('agent-text-temp').value),
            systemPrompt: document.getElementById('agent-text-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        image: {
            model: document.getElementById('agent-image-model').value,
            temperature: parseFloat(document.getElementById('agent-image-temp').value),
            systemPrompt: document.getElementById('agent-image-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    };
    try {
        await db.collection('pipelineSettings').doc('studio').set(settings, { merge: true });
        if (window.showNotification) window.showNotification('Studio Pipeline Settings saved!', 'success');
    } catch (err) { alert('Error: ' + err.message); }
    finally { btnSave.disabled = false; }
}
