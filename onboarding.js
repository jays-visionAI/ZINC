/**
 * onboarding.js
 * 
 * Logic for the ZYNK User Onboarding Wizard.
 * - Handles step-by-step navigation
 * - Implements Region-Based Filtering (Option A)
 * - Persists onboarding data to Firestore
 */

const state = {
    currentStep: 1,
    totalSteps: 3,
    userPersona: null,
    socialChannels: {},
    goals: [],
    detectedRegion: 'GLOBAL'
};

const dom = {
    content: document.getElementById('wizard-content'),
    nextBtn: document.getElementById('btn-next'),
    backBtn: document.getElementById('btn-back'),
    skipBtn: document.getElementById('btn-skip'),
    stepIndicator: document.getElementById('step-indicator'),
    stepTitle: document.getElementById('step-title'),
    progressLine: document.getElementById('progress-line'),
    stepMeta: document.getElementById('step-meta')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    detectRegion();
    renderStep();
    setupEventListeners();
});

function detectRegion() {
    const lang = navigator.language || navigator.userLanguage;
    if (lang.startsWith('ko')) {
        state.detectedRegion = 'KR';
        console.log("🌏 Detected Region: Korea (KR)");
    } else {
        state.detectedRegion = 'GLOBAL';
        console.log("🌏 Detected Region: Global");
    }
}

function setupEventListeners() {
    dom.nextBtn.addEventListener('click', handleNext);
    dom.backBtn.addEventListener('click', handleBack);
    dom.skipBtn.addEventListener('click', handleSkip);
}

function handleNext() {
    if (state.currentStep < state.totalSteps) {
        state.currentStep++;
        renderStep('right');
    } else {
        completeOnboarding();
    }
}

function handleBack() {
    if (state.currentStep > 1) {
        state.currentStep--;
        renderStep('left');
    }
}

function handleSkip() {
    if (state.currentStep === 2) {
        handleNext(); // Just proceed to next step
    }
}

function renderStep(direction) {
    // Update Progress
    const progress = (state.currentStep / state.totalSteps) * 100;
    dom.progressLine.style.width = `${progress}%`;
    dom.stepIndicator.textContent = `Step ${state.currentStep} of ${state.totalSteps}`;

    // Show/Hide Buttons
    dom.backBtn.classList.toggle('invisible', state.currentStep === 1);
    dom.skipBtn.classList.toggle('hidden', state.currentStep !== 2);
    dom.nextBtn.textContent = state.currentStep === state.totalSteps ? 'Start Journey' : 'Next Step';

    // Animation Class
    const animClass = direction === 'right' ? 'step-enter-right' : (direction === 'left' ? 'step-enter-left' : '');
    dom.content.innerHTML = '';
    const container = document.createElement('div');
    container.className = animClass;

    if (state.currentStep === 1) {
        state.userPersona = state.userPersona || 'creator'; // Default
        dom.stepTitle.textContent = 'Persona Selection';
        dom.stepMeta.textContent = 'Tell us who you are so we can tailor your experience.';
        renderPersonaSelection(container);
    } else if (state.currentStep === 2) {
        dom.stepTitle.textContent = 'Connect Channels';
        dom.stepMeta.textContent = 'Link your social accounts for competitor analysis.';
        renderChannelConnection(container);
    } else if (state.currentStep === 3) {
        dom.stepTitle.textContent = 'Success Goals';
        dom.stepMeta.textContent = 'What are your primary objectives on ZYNK?';
        renderGoalSelection(container);
    }

    dom.content.appendChild(container);
}

// --- STEP 1: Persona Selection ---
function renderPersonaSelection(container) {
    const personas = [
        { id: 'creator', icon: '🎬', label: 'Creator / Influencer', desc: 'Growing my personal audience' },
        { id: 'business', icon: '🏪', label: 'Small Business', desc: 'Managing my brand profile' },
        { id: 'agency', icon: '📊', label: 'Marketing Agency', desc: 'Managing multiple client brands' },
        { id: 'personal', icon: '👤', label: 'Personal Brand', desc: 'Building professional authority' }
    ];

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
    personas.forEach(p => {
        const isSelected = state.userPersona === p.id;
        html += `
            <label class="cursor-pointer group">
                <input type="radio" name="persona" value="${p.id}" class="hidden peer" ${isSelected ? 'checked' : ''} onchange="state.userPersona = this.value">
                <div class="glass-card persona-card p-6 rounded-2xl border peer-checked:border-cyan-500 peer-checked:bg-cyan-500/5 transition-all">
                    <div class="text-4xl mb-4">${p.icon}</div>
                    <div class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">${p.label}</div>
                    <div class="text-sm text-slate-500">${p.desc}</div>
                </div>
            </label>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// --- STEP 2: Channel Connection ---
async function renderChannelConnection(container) {
    container.innerHTML = `
        <div class="flex items-center justify-center h-48">
            <div class="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
    `;

    const channels = await window.ChannelProfilesUtils.loadAvailableChannels();

    // Filtering Logic (Option A)
    const globalChannels = channels.filter(c => c.region !== 'KR');
    const krChannels = channels.filter(c => c.region === 'KR');

    let html = `
        <div class="space-y-8">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                ${globalChannels.map(c => renderChannelItem(c)).join('')}
            </div>
    `;

    if (state.detectedRegion === 'KR' && krChannels.length > 0) {
        html += `
            <div class="pt-6 border-t border-slate-900">
                <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Regional Platforms</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${krChannels.map(c => renderChannelItem(c)).join('')}
                </div>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

function renderChannelItem(channel) {
    return `
        <div class="glass-card p-4 rounded-xl flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xl">
                ${channel.icon || '🔗'}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-white truncate">${channel.displayName || channel.name}</div>
                <div class="text-[10px] text-slate-500 uppercase tracking-wider">Connect</div>
            </div>
            <button onclick="alert('Connection API placeholder')" class="w-6 h-6 rounded-full bg-slate-800 hover:bg-cyan-500/20 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
            </button>
        </div>
    `;
}

// --- STEP 3: Goals Selection ---
function renderGoalSelection(container) {
    const goals = [
        { id: 'grow', icon: '📈', label: 'Grow Audience', desc: 'Reach more people faster' },
        { id: 'engage', icon: '💬', label: 'Higher Engagement', desc: 'Deepen community interaction' },
        { id: 'competitor', icon: '🕵️', label: 'Beat Competitors', desc: 'Analyze & outsmart rivals' },
        { id: 'automate', icon: '🤖', label: 'Content Automation', desc: 'Save time with AI agents' }
    ];

    let html = `<div class="grid grid-cols-1 gap-3">`;
    goals.forEach(g => {
        const isChecked = state.goals.includes(g.id);
        html += `
            <label class="cursor-pointer group block">
                <input type="checkbox" value="${g.id}" class="hidden peer" ${isChecked ? 'checked' : ''} onchange="toggleGoal('${g.id}')">
                <div class="glass-card p-5 rounded-2xl border flex items-center gap-4 peer-checked:border-violet-500 peer-checked:bg-violet-500/5 transition-all">
                    <div class="text-2xl">${g.icon}</div>
                    <div class="flex-1">
                        <div class="text-base font-bold text-white group-hover:text-violet-400 transition-colors">${g.label}</div>
                        <div class="text-xs text-slate-500">${g.desc}</div>
                    </div>
                    <div class="w-6 h-6 rounded-md border border-slate-700 flex items-center justify-center peer-checked:bg-violet-500 peer-checked:border-violet-500">
                        <svg class="w-4 h-4 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    </div>
                </div>
            </label>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function toggleGoal(id) {
    if (state.goals.includes(id)) {
        state.goals = state.goals.filter(g => g !== id);
    } else {
        state.goals.push(id);
    }
}

// --- FINALIZATION ---
async function completeOnboarding() {
    dom.nextBtn.disabled = true;
    dom.nextBtn.innerHTML = `<span class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2 inline-block"></span> Saving...`;

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert("Session expired. Please sign in again.");
            window.location.href = 'login.html';
            return;
        }

        const db = firebase.firestore();
        await db.collection('users').doc(user.uid).set({
            onboardingCompleted: true,
            onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            persona: state.userPersona,
            region: state.detectedRegion,
            goals: state.goals,
            // socialChannels can be added here if connected
        }, { merge: true });

        console.log("✅ Onboarding data saved!");
        window.location.href = 'index.html';
    } catch (error) {
        console.error("❌ Onboarding failed:", error);
        alert("Failed to save your profile. Please try again.");
        dom.nextBtn.disabled = false;
        dom.nextBtn.textContent = 'Start Journey';
    }
}
