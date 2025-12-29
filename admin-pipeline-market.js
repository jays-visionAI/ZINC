// admin-pipeline-market.js - Step 1: Market Pulse
window.initPipelineMarket = async function (currentUser) {
    console.log('[Pipeline: Market Pulse] Initializing...');

    const sliders = [
        { id: 'agent-research-temp', label: 'label-research-temp' },
        { id: 'agent-seo-temp', label: 'label-seo-temp' }
    ];

    sliders.forEach(s => {
        const slider = document.getElementById(s.id);
        const label = document.getElementById(s.label);
        if (slider && label) {
            slider.addEventListener('input', () => { label.textContent = slider.value; });
        }
    });

    await loadMarketSettings();

    const btnSave = document.getElementById('save-market-settings');
    if (btnSave) {
        btnSave.addEventListener('click', async () => { await saveMarketSettings(); });
    }
};

async function loadMarketSettings() {
    try {
        const doc = await db.collection('pipelineSettings').doc('market_pulse').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.research) {
                document.getElementById('agent-research-model').value = data.research.model || 'deepseek-chat';
                document.getElementById('agent-research-temp').value = data.research.temperature || 0.7;
                document.getElementById('label-research-temp').textContent = data.research.temperature || 0.7;
                document.getElementById('agent-research-prompt').value = data.research.systemPrompt || '';
            }
            if (data.seo) {
                document.getElementById('agent-seo-model').value = data.seo.model || 'gpt-4o-mini';
                document.getElementById('agent-seo-temp').value = data.seo.temperature || 0.3;
                document.getElementById('label-seo-temp').textContent = data.seo.temperature || 0.3;
                document.getElementById('agent-seo-prompt').value = data.seo.systemPrompt || '';
            }
        }
    } catch (err) { console.error('Error loading market settings:', err); }
}

async function saveMarketSettings() {
    const btnSave = document.getElementById('save-market-settings');
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    const settings = {
        research: {
            model: document.getElementById('agent-research-model').value,
            temperature: parseFloat(document.getElementById('agent-research-temp').value),
            systemPrompt: document.getElementById('agent-research-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        seo: {
            model: document.getElementById('agent-seo-model').value,
            temperature: parseFloat(document.getElementById('agent-seo-temp').value),
            systemPrompt: document.getElementById('agent-seo-prompt').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    };

    try {
        await db.collection('pipelineSettings').doc('market_pulse').set(settings, { merge: true });
        if (window.showNotification) window.showNotification('Market Pulse Settings saved!', 'success');
    } catch (err) { alert('Error saving: ' + err.message); }
    finally { btnSave.disabled = false; btnSave.textContent = 'Save Market Settings'; }
}
