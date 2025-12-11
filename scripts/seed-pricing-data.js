
// scripts/seed-pricing-data.js
// Run this in the browser console or include temporarily in index.html to seed data.

const db = firebase.firestore();

const PRICING_PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 19,
        baseCredits: 400,
        seats: 1,
        agentLimit: 1,
        bonusRate: 0,
        order: 1
    },
    growth: {
        id: 'growth',
        name: 'Growth',
        price: 49,
        baseCredits: 1500,
        seats: 2,
        agentLimit: 3,
        bonusRate: 0.10, // 10% bonus
        order: 2
    },
    scale: {
        id: 'scale',
        name: 'Scale',
        price: 199,
        baseCredits: 8000,
        seats: 5,
        agentLimit: 5,
        bonusRate: 0.20, // 20% bonus
        order: 3
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: null, // Custom
        baseCredits: null, // Custom
        seats: 9999, // Unlimited/Custom
        agentLimit: null, // Custom
        bonusRate: 0.30, // 30% bonus
        order: 4
    }
};

const TOPUP_PACKS = [
    { id: 'pack_1000', name: '1,000 Credit Pack', price: 55, baseCredits: 1000, order: 1 },
    { id: 'pack_3000', name: '3,000 Credit Pack', price: 150, baseCredits: 3000, order: 2 },
    { id: 'pack_5000', name: '5,000 Credit Pack', price: 240, baseCredits: 5000, order: 3 },
    { id: 'pack_10000', name: '10,000 Credit Pack', price: 480, baseCredits: 10000, order: 4 }
];

async function seedPricingData() {
    console.log("🚀 Starting Pricing Data Seed...");

    try {
        // 1. Seed Plans
        const plansBatch = db.batch();
        for (const [key, plan] of Object.entries(PRICING_PLANS)) {
            const ref = db.collection('system_pricing_plans').doc(key);
            plansBatch.set(ref, plan, { merge: true });
        }
        await plansBatch.commit();
        console.log("✅ Subscription Plans seeded.");

        // 2. Seed Packs
        const packsBatch = db.batch();
        for (const pack of TOPUP_PACKS) {
            const ref = db.collection('system_topup_packs').doc(pack.id);
            packsBatch.set(ref, pack, { merge: true });
        }
        await packsBatch.commit();
        console.log("✅ Top-up Packs seeded.");

        console.log("🎉 Seeding Complete!");
        alert("Pricing Data Seeded Successfully!");

    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        alert("Seeding Failed: " + error.message);
    }
}

// Check if running in browser environment with firebase loaded
if (typeof firebase !== 'undefined') {
    // Expose to window for manual execution
    window.seedPricingData = seedPricingData;
}
