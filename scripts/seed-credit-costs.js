
// scripts/seed-credit-costs.js
// Defines the initial credit costs for various system actions.

// NOTE: db initialized inside function to ensure firebase is ready
// const db = firebase.firestore(); 

const CREDIT_COSTS = [
    // Brand Brain
    { id: 'brand_brain_analyze', name: 'Analyze Brand Identity', cost: 50, category: 'Brand Brain', description: 'Deep analysis of uploaded brand files' },
    // ... (rest of array is fine)

    { id: 'brand_brain_generate_voice', name: 'Generate Brand Voice', cost: 30, category: 'Brand Brain', description: 'AI generation of brand voice guidelines' },

    // Knowledge Hub
    { id: 'knowledge_process_doc', name: 'Process Document', cost: 10, category: 'Knowledge Hub', description: 'OCR and embedding generation per file' },

    // Market Pulse
    { id: 'market_investigation', name: 'New Investigation', cost: 100, category: 'Market Pulse', description: 'Live web search and competitor analysis' },
    { id: 'market_content_gen', name: 'Generate Social Content', cost: 20, category: 'Market Pulse', description: 'Creating a single post or meme' },

    // Strategy War Room
    { id: 'strategy_gen_campaign', name: 'Generate Campaign Strategy', cost: 200, category: 'Strategy', description: 'Comprehensive campaign planning' },

    // Studio
    { id: 'studio_create_agent', name: 'Create Sub-Agent', cost: 500, category: 'Studio', description: 'Initializing a new specialized sub-agent' },
    { id: 'studio_exec_task', name: 'Execute Agent Task', cost: 50, category: 'Studio', description: 'Standard task execution by an agent' }
];

const PRICING_PLANS = [
    { id: 'starter', name: 'Starter', price: 0, baseCredits: 100, seats: 1, agentLimit: 1, bonusRate: 0.0, description: 'For individuals exploring ZYNK' },
    { id: 'growth', name: 'Growth', price: 29, baseCredits: 1000, seats: 3, agentLimit: 5, bonusRate: 0.1, description: 'For small teams scaling up' },
    { id: 'scale', name: 'Scale', price: 99, baseCredits: 5000, seats: 10, agentLimit: 20, bonusRate: 0.2, description: 'For growing businesses' },
    { id: 'enterprise', name: 'Enterprise', price: 0, baseCredits: 99999, seats: 999, agentLimit: 999, bonusRate: 0.3, description: 'Custom solutions' }
];

const TOPUP_PACKS = [
    { id: 'pack_small', name: 'Starter Pack', price: 10, baseCredits: 500, order: 1 },
    { id: 'pack_medium', name: 'Pro Pack', price: 50, baseCredits: 3000, order: 2 },
    { id: 'pack_large', name: 'Business Pack', price: 100, baseCredits: 7000, order: 3 }
];

async function seedCreditCosts() {
    console.log("🚀 Starting Full System Seed...");

    if (typeof firebase === 'undefined') {
        alert("Firebase SDK not loaded!");
        return;
    }

    const db = firebase.firestore();

    try {
        const batch = db.batch();

        // 1. Seed Costs
        for (const item of CREDIT_COSTS) {
            const ref = db.collection('system_credit_costs').doc(item.id);
            batch.set(ref, item, { merge: true });
        }

        // 2. Seed Plans
        for (const plan of PRICING_PLANS) {
            const ref = db.collection('system_pricing_plans').doc(plan.id);
            batch.set(ref, plan, { merge: true });
        }

        // 3. Seed Packs
        for (const pack of TOPUP_PACKS) {
            const ref = db.collection('system_topup_packs').doc(pack.id);
            batch.set(ref, pack, { merge: true });
        }

        await batch.commit();
        console.log("✅ All Pricing/Credit Data seeded.");
        alert("System Defaults Seeded Successfully!\n\n(Costs, Plans, and Packs loaded)");

        // Reload page UI if function exists
        if (typeof loadPricingData === 'function') {
            loadPricingData();
        } else {
            window.location.reload();
        }

    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        alert("Seeding Failed: " + error.message);
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.seedCreditCosts = seedCreditCosts;
}
