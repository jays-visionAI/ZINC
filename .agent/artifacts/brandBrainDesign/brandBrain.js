// Vanilla JS Application Logic (Pure JS)

// --- Mock Data ---
const MOCK_SOURCES = [
  { id: '1', type: 'drive', title: 'Brand_Guidelines_v2.pdf', description: 'Logo usage, color palette', status: 'synced', date: '2d ago' },
  { id: '2', type: 'drive', title: 'Product_Catalog_2024.pptx', description: 'Q1 Launch lineup specs', status: 'pending', date: '1h ago' },
  { id: '3', type: 'link', title: 'Competitor Analysis', description: 'Notion page link', status: 'synced', date: '5d ago' },
  { id: '4', type: 'note', title: 'Winter Campaign Idea', description: 'Draft concepts for holiday', status: 'pending', date: 'Just now' },
];

// --- Icons (SVG Strings) ---
const ICONS = {
    drive: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></svg>`,
    link: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    note: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    hardDriveSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></svg>`
}

// --- State ---
const state = {
    kbActiveTab: 'drive',
    identityExpanded: true,
    toneIntensity: 0.7,
    syncPending: 2,
    isSyncing: false
};

// --- DOM References (Cached) ---
const dom = {
    weeklyCheckin: document.getElementById('weekly-checkin'),
    btnSkipCheckin: document.getElementById('btn-skip-checkin'),
    
    // Knowledge Base
    kbContentArea: document.getElementById('kb-content-area'),
    kbTabs: document.querySelectorAll('.tab-btn'),
    btnAddSource: document.getElementById('btn-add-source'),
    btnAddSourceText: document.getElementById('btn-add-source-text'),

    // Identity
    cardIdentity: document.getElementById('card-identity'),
    identityHeader: document.getElementById('identity-header'),
    identityChevron: document.getElementById('identity-chevron'),
    identityContent: document.getElementById('identity-content'),

    // Strategy
    toneSlider: document.getElementById('tone-slider'),
    toneFill: document.getElementById('tone-fill'),
    toneKnob: document.getElementById('tone-knob'),
    toneLabel: document.getElementById('tone-label'),

    // Sync
    syncStatusDisplay: document.getElementById('sync-status-display'),
    syncList: document.getElementById('sync-list'),
    btnSync: document.getElementById('btn-sync'),
    btnSyncText: document.getElementById('btn-sync-text'),
    iconSync: document.getElementById('icon-sync'),
    lastSyncedText: document.getElementById('last-synced-text')
};

// --- Functions ---

function init() {
    renderKnowledgeBase();
    setupEventListeners();
    updateToneSliderUI(); // Initial render
}

function setupEventListeners() {
    // Check-in
    if (dom.btnSkipCheckin) {
        dom.btnSkipCheckin.addEventListener('click', () => {
            if (dom.weeklyCheckin) {
                dom.weeklyCheckin.classList.add('opacity-0', '-translate-y-4', 'h-0', 'mb-0', 'p-0', 'border-0');
                setTimeout(() => dom.weeklyCheckin.remove(), 500);
            }
        });
    }

    // Knowledge Base Tabs
    dom.kbTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const type = target.dataset.type;
            setKbTab(type);
        });
    });

    // Identity Toggle
    if (dom.identityHeader) {
        dom.identityHeader.addEventListener('click', () => {
            state.identityExpanded = !state.identityExpanded;
            if(state.identityExpanded) {
                dom.cardIdentity.classList.add('row-span-2');
                dom.identityContent.style.display = 'block';
                dom.identityChevron.innerHTML = `<path d="m18 15-6-6-6 6"/>`; // Chevron Up
            } else {
                dom.cardIdentity.classList.remove('row-span-2');
                dom.identityContent.style.display = 'none';
                dom.identityChevron.innerHTML = `<path d="m6 9 6 6 6-6"/>`; // Chevron Down
            }
        });
    }

    // Tone Slider
    if (dom.toneSlider) {
        dom.toneSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            state.toneIntensity = val;
            updateToneSliderUI();
        });
    }

    // Sync Button
    if (dom.btnSync) {
        dom.btnSync.addEventListener('click', () => {
            if (state.syncPending === 0 || state.isSyncing) return;
            
            state.isSyncing = true;
            updateSyncUI();

            // Simulate Async Operation
            setTimeout(() => {
                state.isSyncing = false;
                state.syncPending = 0;
                updateSyncUI();
            }, 2000);
        });
    }
}

// -- Knowledge Base Logic --

function setKbTab(type) {
    state.kbActiveTab = type;
    
    // Update Tab Styles
    dom.kbTabs.forEach(tab => {
        if(tab.dataset.type === type) {
            tab.className = 'tab-btn flex-1 py-3 flex justify-center items-center gap-2 text-sm font-medium transition-all border-b-2 border-indigo-500 text-indigo-400 bg-slate-800/30';
        } else {
            tab.className = 'tab-btn flex-1 py-3 flex justify-center items-center gap-2 text-sm font-medium transition-all border-b-2 border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20';
        }
    });

    // Update Add Button Text
    const label = type === 'drive' ? 'from Drive' : type === 'link' ? 'Link' : 'Note';
    if (dom.btnAddSourceText) {
        dom.btnAddSourceText.textContent = `Add ${label}`;
    }

    renderKnowledgeBase();
}

function renderKnowledgeBase() {
    if(!dom.kbContentArea) return;
    
    dom.kbContentArea.innerHTML = '';
    
    const sources = MOCK_SOURCES.filter(s => s.type === state.kbActiveTab);

    // Drive Header
    if (state.kbActiveTab === 'drive') {
        const driveHeader = document.createElement('div');
        driveHeader.className = "bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 mb-4 flex items-start gap-3";
        driveHeader.innerHTML = `
            <div class="p-2 bg-blue-500/20 rounded-full text-blue-400">
                ${ICONS.hardDriveSmall}
            </div>
            <div>
                <h4 class="text-sm font-semibold text-blue-300">Google Drive Connected</h4>
                <p class="text-xs text-blue-200/60 mt-1">Large files (PDF, PPTX) are processed via Drive integration.</p>
            </div>
        `;
        dom.kbContentArea.appendChild(driveHeader);
    }

    if (sources.length === 0) {
        dom.kbContentArea.innerHTML += `
            <div class="text-center py-10">
                <p class="text-slate-600 text-sm">No sources found.</p>
            </div>
        `;
        return;
    }

    sources.forEach(source => {
        const item = document.createElement('div');
        item.className = "group bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all mb-3";
        
        let iconHtml = '';
        let iconClass = '';
        
        if (source.type === 'drive') {
            iconHtml = ICONS.drive;
            iconClass = 'bg-green-500/10 text-green-500';
        } else if (source.type === 'link') {
            iconHtml = ICONS.link;
            iconClass = 'bg-blue-500/10 text-blue-500';
        } else {
            iconHtml = ICONS.note;
            iconClass = 'bg-yellow-500/10 text-yellow-500';
        }

        const spinnerHtml = source.status === 'pending' 
            ? `<span class="text-[10px] text-amber-500 flex items-center gap-1"><span class="animate-spin">${ICONS.refresh}</span> Sync Pending</span>` 
            : '';

        item.innerHTML = `
            <div class="flex justify-between items-start">
              <div class="flex items-start gap-3">
                 <div class="p-2 rounded-lg ${iconClass}">
                     ${iconHtml}
                 </div>
                 <div>
                    <h3 class="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                        ${source.title}
                    </h3>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-1">${source.description}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                            ${source.date}
                        </span>
                        ${spinnerHtml}
                    </div>
                 </div>
              </div>
              
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                    ${ICONS.refresh}
                </button>
                <button class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded">
                    ${ICONS.trash}
                </button>
              </div>
            </div>
        `;
        dom.kbContentArea.appendChild(item);
    });
}

// -- Strategy Logic --

function updateToneSliderUI() {
    if(!dom.toneFill || !dom.toneKnob || !dom.toneLabel) return;
    
    const pct = state.toneIntensity * 100;
    dom.toneFill.style.width = `${pct}%`;
    dom.toneKnob.style.left = `${pct}%`;
    
    if (state.toneIntensity < 0.3) {
        dom.toneLabel.textContent = 'Conservative';
    } else if (state.toneIntensity > 0.7) {
        dom.toneLabel.textContent = 'Aggressive';
    } else {
        dom.toneLabel.textContent = 'Balanced';
    }
}

// -- Sync Logic --

function updateSyncUI() {
    if(!dom.syncStatusDisplay || !dom.btnSync || !dom.iconSync || !dom.btnSyncText) return;

    if (state.isSyncing) {
        dom.btnSyncText.textContent = 'Syncing...';
        dom.iconSync.classList.add('animate-spin');
        dom.btnSync.classList.add('cursor-not-allowed', 'opacity-80');
        return;
    }

    dom.iconSync.classList.remove('animate-spin');
    dom.btnSync.classList.remove('cursor-not-allowed', 'opacity-80');

    if (state.syncPending > 0) {
        // Pending State
        dom.syncStatusDisplay.innerHTML = `
            <span class="text-2xl font-bold text-white block">${state.syncPending} Updates</span>
            <span class="text-sm text-indigo-200/60">Pending synchronization with Hive Mind</span>
        `;
        dom.btnSync.className = "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25";
        dom.btnSyncText.textContent = "Sync with Hive Mind";
        if(dom.syncList) dom.syncList.style.display = 'block';
    } else {
        // Synced State
        dom.syncStatusDisplay.innerHTML = `
            <div class="mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span class="text-lg font-medium text-emerald-100">All Systems Synced</span>
            </div>
        `;
        dom.btnSync.className = "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg bg-slate-800 text-slate-500 cursor-not-allowed";
        dom.btnSyncText.textContent = "Sync with Hive Mind";
        if(dom.syncList) dom.syncList.style.display = 'none';
        if(dom.lastSyncedText) dom.lastSyncedText.textContent = "Last Synced: Just now";
    }
}

// --- Bootstrap ---
document.addEventListener('DOMContentLoaded', init);