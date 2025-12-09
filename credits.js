/**
 * ZYNK Credits System - Global Utility
 * 모든 페이지에서 사용하는 크레딧 관리 시스템
 */

// ============================================================
// CREDITS STATE
// ============================================================
const ZYNKCredits = {
    plan: 'free',
    credits: 0,
    dailyLimit: 10,
    creditsUsedToday: 0,
    planDetails: null,
    initialized: false,

    // Credit costs for operations
    COSTS: {
        // Chat & Knowledge
        chat_message: 1,
        generate_summary: 2,
        source_analysis: 1,

        // Content Plans
        content_plan_quick: 1,
        content_plan_strategy: 10,
        content_plan_knowledge: 5,
        content_plan_create: 15,

        // Images
        image_flux: 1,
        image_stability: 1,
        image_dalle: 5,
        image_ideogram: 6,

        // Agent Execution
        agent_execution: 2,
        full_pipeline: 10,
        content_publish: 5
    },

    // Plan features
    FEATURES: {
        basic_chat: ['free', 'starter', 'pro', 'enterprise'],
        link_sources: ['free', 'starter', 'pro', 'enterprise'],
        note_sources: ['free', 'starter', 'pro', 'enterprise'],
        drive_sources: ['starter', 'pro', 'enterprise'],
        content_plans: ['starter', 'pro', 'enterprise'],
        image_gen: ['starter', 'pro', 'enterprise'],
        scheduling: ['pro', 'enterprise'],
        analytics: ['pro', 'enterprise'],
        custom_agents: ['enterprise'],
        api_access: ['enterprise']
    }
};

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize credits system - call this on page load
 */
async function initCreditsSystem() {
    if (ZYNKCredits.initialized) return;

    try {
        await loadUserCredits();
        ZYNKCredits.initialized = true;
        console.log('[Credits] System initialized:', ZYNKCredits);
    } catch (error) {
        console.error('[Credits] Initialization failed:', error);
        // Set defaults
        ZYNKCredits.credits = 50;
        ZYNKCredits.plan = 'free';
        ZYNKCredits.dailyLimit = 10;
    }
}

/**
 * Load user credits from server
 */
async function loadUserCredits() {
    try {
        const getUserCredits = firebase.functions().httpsCallable('getUserCredits');
        const result = await getUserCredits({});

        if (result.data.success) {
            ZYNKCredits.plan = result.data.plan;
            ZYNKCredits.credits = result.data.credits;
            ZYNKCredits.dailyLimit = result.data.dailyLimit;
            ZYNKCredits.creditsUsedToday = result.data.creditsUsedToday;
            ZYNKCredits.planDetails = result.data.planDetails;

            updateCreditsDisplay();
            return true;
        }
        return false;
    } catch (error) {
        console.error('[Credits] Error loading:', error);
        return false;
    }
}

// ============================================================
// CREDIT OPERATIONS
// ============================================================

/**
 * Check if user has enough credits for an operation
 * @param {string} operation - Operation type
 * @param {number} customCost - Override cost (optional)
 * @returns {boolean} - True if user can proceed
 */
function hasEnoughCredits(operation, customCost = null) {
    const cost = customCost || ZYNKCredits.COSTS[operation] || 1;
    return ZYNKCredits.credits >= cost;
}

/**
 * Check and deduct credits for an operation
 * Shows upgrade modal if insufficient
 * @param {string} operation - Operation type
 * @param {number} customCost - Override cost (optional)
 * @returns {Promise<boolean>} - True if credits were deducted
 */
async function checkAndDeductCredits(operation, customCost = null) {
    const cost = customCost || ZYNKCredits.COSTS[operation] || 1;

    // Check credits locally first
    if (ZYNKCredits.credits < cost) {
        showUpgradeModal('insufficient_credits', cost);
        return false;
    }

    // Check daily limit
    if (ZYNKCredits.creditsUsedToday + cost > ZYNKCredits.dailyLimit) {
        showUpgradeModal('daily_limit', cost);
        return false;
    }

    try {
        const deductCredits = firebase.functions().httpsCallable('deductCredits');
        const result = await deductCredits({ operation, amount: cost });

        if (result.data.success) {
            ZYNKCredits.credits = result.data.remaining;
            ZYNKCredits.creditsUsedToday += cost;
            updateCreditsDisplay();
            return true;
        } else {
            if (result.data.error === 'insufficient_credits') {
                showUpgradeModal('insufficient_credits', cost);
            } else if (result.data.error === 'daily_limit_exceeded') {
                showUpgradeModal('daily_limit', cost);
            }
            return false;
        }
    } catch (error) {
        console.error('[Credits] Deduction error:', error);
        // Allow operation to proceed on error (fail open)
        return true;
    }
}

/**
 * Check if user has access to a feature
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
function hasFeatureAccess(feature) {
    const allowedPlans = ZYNKCredits.FEATURES[feature] || ['enterprise'];
    return allowedPlans.includes(ZYNKCredits.plan);
}

/**
 * Check feature access and show upgrade modal if needed
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
function checkFeatureAccess(feature) {
    if (!hasFeatureAccess(feature)) {
        showUpgradeModal('feature', 0);
        return false;
    }
    return true;
}

// ============================================================
// UI COMPONENTS
// ============================================================

/**
 * Update credits display in the UI
 */
function updateCreditsDisplay() {
    const creditCountEl = document.getElementById('credit-count');
    const creditDisplayEl = document.getElementById('credit-display');

    if (creditCountEl) {
        creditCountEl.textContent = ZYNKCredits.credits;
    }

    if (creditDisplayEl) {
        // Update styling based on remaining credits
        creditDisplayEl.classList.remove(
            'border-red-500', 'text-red-400',
            'border-amber-500', 'text-amber-400',
            'border-slate-700', 'text-slate-400',
            'border-red-500/50', 'border-amber-500/50'
        );

        if (ZYNKCredits.credits <= 10) {
            creditDisplayEl.classList.add('border-red-500/50', 'text-red-400');
        } else if (ZYNKCredits.credits <= 25) {
            creditDisplayEl.classList.add('border-amber-500/50', 'text-amber-400');
        } else {
            creditDisplayEl.classList.add('border-slate-700', 'text-slate-400');
        }

        // Add plan badge
        const badge = getPlanBadge(ZYNKCredits.plan);
        creditDisplayEl.innerHTML = `${badge} <span id="credit-count">${ZYNKCredits.credits}</span> credits`;
    }
}

/**
 * Get plan badge emoji
 */
function getPlanBadge(plan) {
    switch (plan) {
        case 'enterprise': return '💎';
        case 'pro': return '⭐';
        case 'starter': return '🚀';
        default: return '🪙';
    }
}

/**
 * Create credits display element (for pages that don't have one)
 * @returns {HTMLElement}
 */
function createCreditsDisplay() {
    const container = document.createElement('span');
    container.id = 'credit-display';
    container.className = 'text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700';
    container.innerHTML = `🪙 <span id="credit-count">${ZYNKCredits.credits}</span> credits`;
    return container;
}

/**
 * Show upgrade modal
 */
function showUpgradeModal(reason, requiredCredits) {
    // Remove existing modal
    document.getElementById('zynk-upgrade-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm';
    modal.id = 'zynk-upgrade-modal';

    let title, message, icon;
    if (reason === 'insufficient_credits') {
        title = 'Not Enough Credits';
        message = `This action requires ${requiredCredits} credits. You have ${ZYNKCredits.credits} remaining.`;
        icon = '🪙';
    } else if (reason === 'daily_limit') {
        title = 'Daily Limit Reached';
        message = `You've used ${ZYNKCredits.creditsUsedToday}/${ZYNKCredits.dailyLimit} credits today. Upgrade for higher limits.`;
        icon = '⏰';
    } else {
        title = 'Upgrade Required';
        message = 'This feature requires a higher plan.';
        icon = '💎';
    }

    modal.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 text-center shadow-2xl">
            <div class="text-5xl mb-4">${icon}</div>
            <h3 class="text-xl font-bold text-white mb-2">${title}</h3>
            <p class="text-slate-400 text-sm mb-6">${message}</p>
            
            <div class="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-4 mb-6 border border-indigo-500/30">
                <p class="text-xs text-slate-400 mb-2">Upgrade to Pro for:</p>
                <ul class="text-sm text-white space-y-1 text-left pl-4">
                    <li>✓ 2,000 credits/month</li>
                    <li>✓ 500 daily limit</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Priority support</li>
                </ul>
                <p class="text-lg font-bold text-indigo-400 mt-3">$49/month</p>
            </div>
            
            <div class="flex gap-3">
                <button onclick="closeUpgradeModal()" class="flex-1 py-2.5 text-slate-400 hover:text-white text-sm rounded-lg border border-slate-700 hover:border-slate-600">
                    Maybe Later
                </button>
                <button onclick="openBillingPage()" class="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-medium">
                    Upgrade Now
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUpgradeModal();
    });

    // Close on escape
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeUpgradeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * Close upgrade modal
 */
function closeUpgradeModal() {
    document.getElementById('zynk-upgrade-modal')?.remove();
}

/**
 * Open billing page
 */
function openBillingPage() {
    closeUpgradeModal();
    window.location.href = 'settings.html?tab=billing';
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get cost for an operation
 */
function getOperationCost(operation) {
    return ZYNKCredits.COSTS[operation] || 1;
}

/**
 * Format credits count with badge
 */
function formatCredits(count) {
    if (count <= 10) return `<span class="text-red-400">${count}</span>`;
    if (count <= 25) return `<span class="text-amber-400">${count}</span>`;
    return `<span class="text-emerald-400">${count}</span>`;
}

/**
 * Get upgrade CTA based on current plan
 */
function getUpgradeCTA() {
    switch (ZYNKCredits.plan) {
        case 'free': return { plan: 'Starter', price: '$19/mo' };
        case 'starter': return { plan: 'Pro', price: '$49/mo' };
        case 'pro': return { plan: 'Enterprise', price: '$199/mo' };
        default: return null;
    }
}

// ============================================================
// AUTO-INITIALIZATION
// ============================================================

// Initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase auth
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                initCreditsSystem();
            }
        });
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZYNKCredits, initCreditsSystem, checkAndDeductCredits, hasFeatureAccess };
}

console.log('[Credits] credits.js loaded');
