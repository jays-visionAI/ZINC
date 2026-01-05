// Seed Script: Create initial ZYNK Agent Registry
// Run this using: node scripts/seed-agent-registry.js

let serviceAccount;
try {
    serviceAccount = require('../serviceAccountKey.json');
} catch (e) {
    // Optional: serviceAccountKey.json might not exist if using ADC or Emulator
    console.log("ℹ️  No serviceAccountKey.json found, skipping...");
}

let admin;
try {
    admin = require('firebase-admin');
} catch (e) {
    try {
        admin = require('../functions/node_modules/firebase-admin');
    } catch (e2) {
        console.error("❌ Could not find 'firebase-admin' module. Please run 'npm install' in the functions directory.");
        process.exit(1);
    }
}

// Initialize Firebase Admin
// Initialize Firebase Admin
if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: "zinc-c790f"
        });
    } catch (e) {
        console.log("ADC failed, trying local service account...");
        // Fallback for local dev without ADC set up
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: "zinc-c790f"
            });
        } catch (e2) {
            console.error("Failed to initialize Firebase Admin. Ensure you have GOOGLE_APPLICATION_CREDENTIALS set or a serviceAccountKey.json in root.");
            process.exit(1);
        }
    }
}

const db = admin.firestore();

(async function seedAgentRegistry() {
    console.log("🌱 Starting Agent Registry seed...");


    const coreAgents = [
        // --- 1. Intelligence Head ---
        {
            id: "INT-MKT-SCOUT",
            name: "Market Scout",
            category: "Intelligence",
            description: "Surveys external market data, trends, and competitor activities to provide context.",
            status: "active",
            currentVersion: "v1.0.0"
        },
        {
            id: "INT-KB-RAG",
            name: "Knowledge Agent (RAG)",
            category: "Intelligence",
            description: "Retrieves specific chunks from the internal Knowledge Hub with citations.",
            status: "active",
            currentVersion: "v1.0.0"
        },

        // --- 2. Design Head ---
        {
            id: "DSN-NRV-DSGN",
            name: "Narrative Designer",
            category: "Design",
            description: "Structures the storyline and content flow using frameworks like PAS or SWOT.",
            status: "active",
            currentVersion: "v1.0.0"
        },
        {
            id: "DSN-VIS-DIR",
            name: "Visual Director",
            category: "Design",
            description: "Defines the aesthetic guidelines, color palettes, and typography suitable for the brand.",
            status: "active",
            currentVersion: "v1.0.0"
        },
        {
            id: "DSN-STR-ARCH",
            name: "Structure Architect",
            category: "Design",
            description: "Architects the JSON layout structure (tables, bento grids) for the final output.",
            status: "active",
            currentVersion: "v1.0.0"
        },

        // --- 3. QA Head ---
        {
            id: "QA-VIS-QC",
            name: "Aesthetic Critic (Vision)",
            category: "QA",
            description: "Uses Vision AI to critique screenshots for design flaws (contrast, alignment, whitespace).",
            status: "active",
            currentVersion: "v1.0.0"
        },
        {
            id: "QA-REV-HND",
            name: "Revision Handler",
            category: "QA",
            description: "Interprets user feedback or QA critique to generate surgical edit instructions.",
            status: "active",
            currentVersion: "v1.0.0"
        },

        // --- 4. Strategy Head (Legacy Mapping) ---
        {
            id: "STG-DECK-MSTR",
            name: "Pitch Deck Strategist",
            category: "Strategy",
            description: "Master strategist for creating investor pitch decks. (Legacy: ContentStrategist)",
            status: "active",
            currentVersion: "v1.0.0"
        },
        {
            id: "STG-ONE-PAGER",
            name: "One Pager Strategist",
            category: "Strategy",
            description: "Specialist in condensing information into high-impact single-page documents.",
            status: "active",
            currentVersion: "v1.0.0"
        }
    ];

    try {
        const batch = db.batch();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        for (const agent of coreAgents) {
            // 1. Create Agent Registry Entry
            const registryRef = db.collection("agentRegistry").doc(agent.id);
            batch.set(registryRef, {
                name: agent.name,
                category: agent.category,
                description: agent.description,
                status: agent.status,
                currentProductionVersion: agent.currentVersion,
                createdAt: timestamp,
                updatedAt: timestamp
            });

            // 2. Create Initial Version Entry (v1.0.0)
            const versionRef = db.collection("agentVersions").doc(); // Auto-ID
            batch.set(versionRef, {
                agentId: agent.id,
                version: "1.0.0",
                isProduction: true,
                status: "production",
                config: {
                    model: "deepseek-reasoner", // Default baseline
                    temperature: 0.7
                },
                systemPrompt: "You are " + agent.name + ". " + agent.description + "\n(This is a placeholder prompt. Please update via Admin UI.)",
                changelog: "Initial creation via seed script.",
                createdAt: timestamp
            });

            console.log(`✅ Queued: ${agent.name} + v1.0.0`);
        }

        await batch.commit();
        console.log(`✨ Successfully seeded ${coreAgents.length} agents into Agent Registry!`);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
})();
