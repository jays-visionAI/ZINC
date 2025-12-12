/**
 * admin-chatbot.js
 * Logic for the Admin Chatbot Settings Tab
 */

// Textarea height persistence via localStorage
function initTextareaResize() {
    const textareas = document.querySelectorAll('textarea.admin-input[id]');

    textareas.forEach(textarea => {
        const storageKey = `textarea_height_${textarea.id}`;

        // Restore saved height
        const savedHeight = localStorage.getItem(storageKey);
        if (savedHeight) {
            textarea.style.height = savedHeight;
        }

        // Save height on resize using ResizeObserver
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const height = entry.target.style.height || entry.target.offsetHeight + 'px';
                localStorage.setItem(storageKey, height);
            }
        });

        resizeObserver.observe(textarea);
    });
}

// ============================================
// TAB SWITCHING (Internal to Chatbot Tab)
// ============================================

function initChatbotTabs() {
    const tabs = document.querySelectorAll('.chatbot-tab');

    tabs.forEach(tab => {
        // Remove old listeners to prevent duplicates if re-initialized
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);

        newTab.addEventListener('click', () => {
            const targetTab = newTab.dataset.tab;

            // Update tab styles (underline style)
            document.querySelectorAll('.chatbot-tab').forEach(t => {
                t.style.borderBottom = '2px solid transparent';
                t.style.color = 'rgba(255,255,255,0.5)';
                t.style.fontWeight = '400';
                t.classList.remove('active');
            });

            newTab.style.borderBottom = '2px solid #16e0bd';
            newTab.style.color = '#fff';
            newTab.style.fontWeight = '600';
            newTab.classList.add('active');

            // Show/hide content
            document.getElementById('subtab-chatbot-general').style.display = targetTab === 'general' ? 'block' : 'none';
            document.getElementById('subtab-chatbot-page-context').style.display = targetTab === 'page-context' ? 'block' : 'none';
            document.getElementById('subtab-chatbot-voice').style.display = targetTab === 'voice' ? 'block' : 'none';

            // Initialize tab content
            if (targetTab === 'page-context') {
                loadPageContextList();
            } else if (targetTab === 'voice') {
                loadVoiceSettings();
            }
        });
    });
}

// ============================================
// PAGE CONTEXT MANAGEMENT
// ============================================

let currentPageContextId = null;
let currentPageContextData = null;
let currentTips = [];

async function loadPageContextList() {
    const select = document.getElementById('page-context-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select a page --</option>';

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('chatbotPageContext').orderBy('order').get();

        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${data.name?.en || doc.id} (${data.isActive ? '✅' : '❌'})`;
            select.appendChild(option);
        });

        console.log(`[Admin] Loaded ${snapshot.size} page contexts`);
    } catch (error) {
        console.error('[Admin] Failed to load page contexts:', error);
    }
}

async function loadPageContext(pageId) {
    if (!pageId) {
        document.getElementById('page-context-editor').style.display = 'none';
        return;
    }

    try {
        const db = firebase.firestore();
        const doc = await db.collection('chatbotPageContext').doc(pageId).get();

        if (!doc.exists) {
            alert('Page context not found');
            return;
        }

        currentPageContextId = pageId;
        currentPageContextData = doc.data();
        currentTips = currentPageContextData.tips || [];

        // Populate form
        document.getElementById('ctx-name-en').value = currentPageContextData.name?.en || '';
        document.getElementById('ctx-name-ko').value = currentPageContextData.name?.ko || '';
        document.getElementById('ctx-desc-en').value = currentPageContextData.description?.en || '';
        document.getElementById('ctx-desc-ko').value = currentPageContextData.description?.ko || '';
        document.getElementById('ctx-is-active').checked = currentPageContextData.isActive !== false;

        // Render tips
        renderTips();

        document.getElementById('page-context-editor').style.display = 'block';

    } catch (error) {
        console.error('[Admin] Failed to load page context:', error);
        alert('Error loading page context');
    }
}

function renderTips() {
    const container = document.getElementById('tips-container');
    container.innerHTML = '';

    currentTips.forEach((tip, index) => {
        const tipEl = document.createElement('div');
        tipEl.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;';
        tipEl.innerHTML = `
            <input type="text" class="admin-input tip-en" data-index="${index}" placeholder="Tip in English..." value="${tip.en || ''}">
            <input type="text" class="admin-input tip-ko" data-index="${index}" placeholder="팁 (한국어)..." value="${tip.ko || ''}">
            <button type="button" class="admin-btn-secondary btn-remove-tip" data-index="${index}" style="padding: 8px 12px; color: #ef4444;">🗑️</button>
        `;
        container.appendChild(tipEl);
    });

    // Add event listeners
    container.querySelectorAll('.tip-en, .tip-ko').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const lang = e.target.classList.contains('tip-en') ? 'en' : 'ko';
            if (!currentTips[idx]) currentTips[idx] = {};
            currentTips[idx][lang] = e.target.value;
        });
    });

    container.querySelectorAll('.btn-remove-tip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            currentTips.splice(idx, 1);
            renderTips();
        });
    });
}

function addTip() {
    currentTips.push({ en: '', ko: '' });
    renderTips();
}

async function savePageContext() {
    if (!currentPageContextId) return;

    const data = {
        name: {
            en: document.getElementById('ctx-name-en').value,
            ko: document.getElementById('ctx-name-ko').value
        },
        description: {
            en: document.getElementById('ctx-desc-en').value,
            ko: document.getElementById('ctx-desc-ko').value
        },
        tips: currentTips.filter(t => t.en || t.ko),
        isActive: document.getElementById('ctx-is-active').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const db = firebase.firestore();
        await db.collection('chatbotPageContext').doc(currentPageContextId).update(data);

        alert('✅ Page context saved!');
        loadPageContextList();
    } catch (error) {
        console.error('[Admin] Failed to save page context:', error);
        alert('❌ Error saving page context');
    }
}

// ============================================
// VOICE SETTINGS
// ============================================

async function loadVoiceSettings() {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('chatbotConfig').doc('default').get();

        if (doc.exists) {
            const config = doc.data();
            document.getElementById('voice-input-enabled').checked = config.voiceInputEnabled || false;
            document.getElementById('voice-output-enabled').checked = config.voiceOutputEnabled || false;
        }
    } catch (error) {
        console.error('[Admin] Failed to load voice settings:', error);
    }
}

async function saveVoiceSettings() {
    try {
        const db = firebase.firestore();
        await db.collection('chatbotConfig').doc('default').update({
            voiceEnabled: true,
            voiceInputEnabled: document.getElementById('voice-input-enabled').checked,
            voiceOutputEnabled: document.getElementById('voice-output-enabled').checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('✅ Voice settings saved!');
    } catch (error) {
        console.error('[Admin] Failed to save voice settings:', error);
        alert('❌ Error saving voice settings');
    }
}


// Initialize Function
function initChatbotAdmin() {
    console.log('[Chatbot Admin] Initializing tabs and event listeners...');

    initTextareaResize();
    initChatbotTabs(); // This now uses IDs like "subtab-chatbot-general"

    // Page Context Events
    const select = document.getElementById('page-context-select');
    if (select) {
        // Clone to remove old listeners
        const newSelect = select.cloneNode(true);
        select.parentNode.replaceChild(newSelect, select);
        newSelect.addEventListener('change', (e) => loadPageContext(e.target.value));
    }

    const btnRefresh = document.getElementById('btn-refresh-pages');
    if (btnRefresh) btnRefresh.onclick = loadPageContextList;

    const btnAddTip = document.getElementById('btn-add-tip');
    if (btnAddTip) btnAddTip.onclick = addTip;

    const btnSaveCtx = document.getElementById('btn-save-page-context');
    if (btnSaveCtx) btnSaveCtx.onclick = savePageContext;

    // Voice Events
    const btnSaveVoice = document.getElementById('btn-save-voice');
    if (btnSaveVoice) btnSaveVoice.onclick = saveVoiceSettings;

    console.log('[Chatbot Admin] Initialization complete');
}

// Ensure global exposure
window.initChatbot = initChatbotAdmin;
