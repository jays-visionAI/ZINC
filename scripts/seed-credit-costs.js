
// scripts/seed-credit-costs.js
// Defines the initial credit costs for various system actions.

const db = firebase.firestore();

const CREDIT_COSTS = [
    // Brand Brain
    { id: 'brand_brain_analyze', name: 'Analyze Brand Identity', cost: 50, category: 'Brand Brain', description: 'Deep analysis of uploaded brand files' },
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

async function seedCreditCosts() {
    console.log("🚀 Starting Credit Costs Seed...");

    try {
        const batch = db.batch();
        for (const item of CREDIT_COSTS) {
            const ref = db.collection('system_credit_costs').doc(item.id);
            batch.set(ref, item, { merge: true });
        }
        await batch.commit();
        console.log("✅ Credit Costs seeded.");
        alert("Credit Costs Seeded Successfully!");

    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        alert("Seeding Failed: " + error.message);
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.seedCreditCosts = seedCreditCosts;
}
