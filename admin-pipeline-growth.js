// admin-pipeline-growth.js - Step 5: Growth
window.initPipelineGrowth = async function (currentUser) {
    console.log('[Pipeline: Growth] Initializing...');

    const sliders = [
        { id: 'agent-manager-temp', label: 'label-manager-temp' },
        { id: 'agent-compliance-temp', label: 'label-compliance-temp' },
        { id: 'agent-kpi-temp', label: 'label-kpi-temp' }
    ];

    sliders.forEach(s => {
        const slider = document.getElementById(s.id);
        const label = document.getElementById(s.label);
        if (slider && label) {
            slider.addEventListener('input', () => { label.textContent = slider.value; });
        }
    });

    await loadGrowthSettings();
    const btnSave = document.getElementById('save-growth-settings');
    if (btnSave) {
        btnSave.addEventListener('click', async () => { await saveGrowthSettings(); });
    }
};

async function loadGrowthSettings() {
    try {
        const doc = await db.collection('pipelineSettings').doc('growth').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.manager) {
                document.getElementById('agent-manager-model').value = data.manager.model || 'gpt-4o';
                document.getElementById('agent-manager-temp').value = data.manager.temperature || 0.2;
                document.getElementById('label-manager-temp').textContent = data.manager.temperature || 0.2;
                document.getElementById('agent-manager-prompt').value = data.manager.systemPrompt || '';
            }
            if (data.compliance) {
                document.getElementById('agent-compliance-model').value = data.compliance.model || 'gpt-4o-mini';
                document.getElementById('agent-compliance-temp').value = data.compliance.temperature || 0.0;
                document.getElementById('label-compliance-temp').textContent = data.compliance.temperature || 0.0;
                document.getElementById('agent-compliance-prompt').value = data.compliance.systemPrompt || '';
            }
            if (data.kpi) {
                document.getElementById('agent-kpi-model').value = data.kpi.model || 'gpt-4o';
                document.getElementById('agent-kpi-temp').value = data.kpi.temperature || 0.1;
                document.getElementById('label-kpi-temp').textContent = data.kpi.temperature || 0.1;
                document.getElementById('agent-kpi-prompt').value = data.kpi.systemPrompt || '';
            }
        }
    } catch (err) { console.error('Error loading growth settings:', err); }
}

async function saveGrowthSettings() {
    const btnSave = document.getElementById('save-growth-settings');
    btnSave.disabled = true;
    const settings = {
        manager: {
            model: document.getElementById('agent-manager-model').value,
            temperature: parseFloat(document.getElementById('agent-manager-temp').value),
            systemPrompt: document.getElementById('agent-manager-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        compliance: {
            model: document.getElementById('agent-compliance-model').value,
            temperature: parseFloat(document.getElementById('agent-compliance-temp').value),
            systemPrompt: document.getElementById('agent-compliance-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        kpi: {
            model: document.getElementById('agent-kpi-model').value,
            temperature: parseFloat(document.getElementById('agent-kpi-temp').value),
            systemPrompt: document.getElementById('agent-kpi-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    };
    try {
        await db.collection('pipelineSettings').doc('growth').set(settings, { merge: true });
        if (window.showNotification) window.showNotification('Growth Pipeline Settings saved!', 'success');
    } catch (err) { alert('Error: ' + err.message); }
    finally { btnSave.disabled = false; }
}
