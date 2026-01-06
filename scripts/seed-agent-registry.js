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
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "fetch_market_data", label: "Fetch Market Data", description: "Query external APIs for market trends", color: "#3b82f6" },
                { step: 2, action: "analyze_competitors", label: "Analyze Competitors", description: "Extract competitor positioning", color: "#10b981" },
                { step: 3, action: "generate_insights", label: "Generate Insights", description: "Synthesize findings into actionable insights", color: "#8b5cf6" }
            ]
        },
        {
            id: "INT-KB-RAG",
            name: "Knowledge Agent (RAG)",
            category: "Intelligence",
            description: "Retrieves specific chunks from the internal Knowledge Hub with citations.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js", "knowledgeHub.js"],
            procedures: [
                { step: 1, action: "parse_query", label: "Parse Query", description: "Understand the user's information need", color: "#3b82f6" },
                { step: 2, action: "vector_search", label: "Vector Search", description: "Search Knowledge Hub embeddings", color: "#f59e0b" },
                { step: 3, action: "rank_results", label: "Rank Results", description: "Score relevance of retrieved chunks", color: "#10b981" },
                { step: 4, action: "format_response", label: "Format with Citations", description: "Return answer with source citations", color: "#8b5cf6" }
            ]
        },

        // --- 2. Design Head ---
        {
            id: "DSN-NRV-DSGN",
            name: "Narrative Designer",
            category: "Design",
            description: "Structures the storyline and content flow using frameworks like PAS or SWOT.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js", "studio.js"],
            procedures: [
                { step: 1, action: "extract_knowledge", label: "Extract Knowledge Hub Data", description: "Load relevant brand and project context", color: "#3b82f6" },
                { step: 2, action: "analyze_patterns", label: "Analyze Pattern & Trends", description: "Identify key themes and messaging angles", color: "#10b981" },
                { step: 3, action: "combine_brief", label: "Combine with Project Brief", description: "Merge insights with campaign objectives", color: "#8b5cf6" },
                { step: 4, action: "generate_narrative", label: "Generate Multi-Channel Narrative", description: "Output structured content for each platform", color: "#f43f5e" }
            ]
        },
        {
            id: "DSN-VIS-DIR",
            name: "Visual Director",
            category: "Design",
            description: "Defines the aesthetic guidelines, color palettes, and typography suitable for the brand.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "load_brand_identity", label: "Load Brand Identity", description: "Fetch brand colors, fonts, and guidelines", color: "#3b82f6" },
                { step: 2, action: "analyze_context", label: "Analyze Content Context", description: "Understand the content type and platform", color: "#10b981" },
                { step: 3, action: "generate_style", label: "Generate Style Guide", description: "Output visual specifications", color: "#8b5cf6" }
            ]
        },
        {
            id: "DSN-STR-ARCH",
            name: "Structure Architect",
            category: "Design",
            description: "Architects the JSON layout structure (tables, bento grids) for the final output.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "parse_content", label: "Parse Content Elements", description: "Identify text, images, and data points", color: "#3b82f6" },
                { step: 2, action: "select_layout", label: "Select Layout Template", description: "Choose grid/table/card structure", color: "#10b981" },
                { step: 3, action: "generate_json", label: "Generate JSON Layout", description: "Output structured layout definition", color: "#8b5cf6" }
            ]
        },

        // --- 3. QA Head ---
        {
            id: "QA-VIS-QC",
            name: "Aesthetic Critic (Vision)",
            category: "QA",
            description: "Uses Vision AI to critique screenshots for design flaws (contrast, alignment, whitespace).",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "capture_screenshot", label: "Capture Screenshot", description: "Render content to image", color: "#3b82f6" },
                { step: 2, action: "vision_analysis", label: "Vision AI Analysis", description: "Analyze design using GPT-4V or Gemini Vision", color: "#f59e0b" },
                { step: 3, action: "score_aesthetics", label: "Score Aesthetics", description: "Rate contrast, alignment, whitespace", color: "#10b981" },
                { step: 4, action: "generate_feedback", label: "Generate Feedback", description: "Output specific improvement suggestions", color: "#f43f5e" }
            ]
        },
        {
            id: "QA-REV-HND",
            name: "Revision Handler",
            category: "QA",
            description: "Interprets user feedback or QA critique to generate surgical edit instructions.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "parse_feedback", label: "Parse Feedback", description: "Understand user or QA critique", color: "#3b82f6" },
                { step: 2, action: "identify_targets", label: "Identify Edit Targets", description: "Locate specific elements to modify", color: "#10b981" },
                { step: 3, action: "generate_edits", label: "Generate Edit Instructions", description: "Output precise modification commands", color: "#8b5cf6" }
            ]
        },

        // --- 4. Strategy Head (Legacy Mapping) ---
        {
            id: "STG-DECK-MSTR",
            name: "Pitch Deck Strategist",
            category: "Strategy",
            description: "Master strategist for creating investor pitch decks. (Legacy: ContentStrategist)",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["scripts/pitchDeckAgent.js", "services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "analyze_business", label: "Analyze Business Model", description: "Extract key business information", color: "#3b82f6" },
                { step: 2, action: "structure_narrative", label: "Structure Pitch Narrative", description: "Apply investor-friendly storytelling framework", color: "#10b981" },
                { step: 3, action: "generate_slides", label: "Generate Slide Content", description: "Create content for each slide type", color: "#8b5cf6" },
                { step: 4, action: "optimize_flow", label: "Optimize Flow", description: "Ensure logical progression and impact", color: "#f43f5e" }
            ]
        },
        {
            id: "STG-ONE-PAGER",
            name: "One Pager Strategist",
            category: "Strategy",
            description: "Specialist in condensing information into high-impact single-page documents.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "extract_essentials", label: "Extract Essentials", description: "Identify most critical information", color: "#3b82f6" },
                { step: 2, action: "prioritize_content", label: "Prioritize Content", description: "Rank by importance and impact", color: "#10b981" },
                { step: 3, action: "condense_messaging", label: "Condense Messaging", description: "Distill to concise, powerful statements", color: "#8b5cf6" }
            ]
        },

        // --- 5. Studio Pipeline Agents (New) ---
        {
            id: "STU-ORCHESTRATOR",
            name: "Studio Orchestrator",
            category: "Studio",
            description: "Manages the content generation workflow, routing tasks to appropriate sub-agents.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js", "studio.js"],
            procedures: [
                { step: 1, action: "parse_request", label: "Parse Generation Request", description: "Understand content type and requirements", color: "#3b82f6" },
                { step: 2, action: "load_context", label: "Load Brand & Knowledge Context", description: "Fetch all relevant project data", color: "#f59e0b" },
                { step: 3, action: "route_agents", label: "Route to Sub-Agents", description: "Dispatch to Creator, Designer, etc.", color: "#10b981" },
                { step: 4, action: "aggregate_results", label: "Aggregate Results", description: "Combine outputs from all agents", color: "#8b5cf6" },
                { step: 5, action: "quality_check", label: "Quality Check", description: "Validate output before delivery", color: "#f43f5e" }
            ]
        },
        {
            id: "STU-CREATOR-TEXT",
            name: "Text Creator",
            category: "Studio",
            description: "Generates text content for various channels (SNS, Blog, Email, etc.).",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "receive_brief", label: "Receive Content Brief", description: "Get channel, tone, and requirements", color: "#3b82f6" },
                { step: 2, action: "apply_brand_voice", label: "Apply Brand Voice", description: "Inject brand personality and guidelines", color: "#10b981" },
                { step: 3, action: "generate_content", label: "Generate Content", description: "Create channel-optimized text", color: "#8b5cf6" },
                { step: 4, action: "format_output", label: "Format for Channel", description: "Apply platform-specific formatting", color: "#f43f5e" }
            ]
        },
        {
            id: "STU-CREATOR-IMAGE",
            name: "Image Creator",
            category: "Studio",
            description: "Generates visual content using AI image generation (Imagen, DALL-E, etc.).",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js", "functions/generateImage.js"],
            procedures: [
                { step: 1, action: "analyze_visual_needs", label: "Analyze Visual Needs", description: "Determine image requirements", color: "#3b82f6" },
                { step: 2, action: "generate_prompt", label: "Generate Image Prompt", description: "Create optimized prompt for AI model", color: "#10b981" },
                { step: 3, action: "call_image_api", label: "Call Image Generation API", description: "Execute image generation", color: "#f59e0b" },
                { step: 4, action: "post_process", label: "Post-Process Image", description: "Apply branding and adjustments", color: "#8b5cf6" }
            ]
        },

        // --- 6. Growth Pipeline Agents (New) ---
        {
            id: "GRW-MANAGER",
            name: "Growth Manager",
            category: "Growth",
            description: "Evaluates content performance and suggests optimization strategies.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "collect_metrics", label: "Collect Performance Metrics", description: "Gather engagement and conversion data", color: "#3b82f6" },
                { step: 2, action: "analyze_patterns", label: "Analyze Patterns", description: "Identify what's working and what's not", color: "#10b981" },
                { step: 3, action: "generate_recommendations", label: "Generate Recommendations", description: "Suggest content and strategy improvements", color: "#8b5cf6" }
            ]
        },
        {
            id: "GRW-REASONER",
            name: "Strategy Reasoner",
            category: "Growth",
            description: "Uses deep reasoning to develop long-term content strategies.",
            status: "active",
            currentVersion: "v1.0.0",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "review_history", label: "Review Content History", description: "Analyze past performance data", color: "#3b82f6" },
                { step: 2, action: "identify_opportunities", label: "Identify Opportunities", description: "Find gaps and growth areas", color: "#10b981" },
                { step: 3, action: "develop_strategy", label: "Develop Strategy", description: "Create comprehensive content roadmap", color: "#8b5cf6" },
                { step: 4, action: "prioritize_actions", label: "Prioritize Actions", description: "Rank recommendations by impact", color: "#f43f5e" }
            ]
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
                sourceFiles: agent.sourceFiles || [],
                createdAt: timestamp,
                updatedAt: timestamp
            });

            // 2. Create Initial Version Entry (v1.0.0) with Procedures
            const versionRef = db.collection("agentVersions").doc(`${agent.id}-v1-0-0`);
            batch.set(versionRef, {
                agentId: agent.id,
                version: "1.0.0",
                isProduction: true,
                status: "production",
                config: {
                    model: "deepseek-reasoner", // Default baseline
                    temperature: 0.7
                },
                procedures: agent.procedures || [],
                systemPrompt: "You are " + agent.name + ". " + agent.description + "\n(This is a placeholder prompt. Please update via Admin UI.)",
                changelog: "Initial creation via seed script with procedures.",
                createdAt: timestamp
            });

            console.log(`✅ Queued: ${agent.name} + v1.0.0 (${agent.procedures?.length || 0} procedures)`);
        }

        await batch.commit();
        console.log(`✨ Successfully seeded ${coreAgents.length} agents into Agent Registry!`);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
})();
