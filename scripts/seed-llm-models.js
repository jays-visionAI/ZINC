/**
 * Seed Script: systemLLMModels & featurePolicies
 * PRD 11.6 - LLM Router + Booster + Credit Ledger
 * 
 * Run in browser console after logging in as Admin
 */

window.seedLLMRouterData = async function () {
    const db = firebase.firestore();
    const batch = db.batch();

    console.log('🚀 Starting PRD 11.6 Data Seeding...');

    // ==========================================
    // 1. systemLLMModels - Model Catalog with Cost
    // ==========================================
    const models = [
        // OpenAI Models
        {
            id: 'gpt-4o',
            provider: 'openai',
            modelId: 'gpt-4o',
            displayName: 'GPT-4o (Omni)',
            description: 'Most powerful OpenAI model',
            tier: 'standard',
            costPer1kInputTokens: 0.005,
            costPer1kOutputTokens: 0.015,
            creditPer1kTokens: 1.0,
            maxContextTokens: 128000,
            capabilities: ['chat', 'vision', 'function_calling'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'gpt-4o-mini',
            provider: 'openai',
            modelId: 'gpt-4o-mini',
            displayName: 'GPT-4o Mini',
            description: 'Fast, cost-effective model',
            tier: 'economy',
            costPer1kInputTokens: 0.00015,
            costPer1kOutputTokens: 0.0006,
            creditPer1kTokens: 0.2,
            maxContextTokens: 128000,
            capabilities: ['chat', 'vision'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'gpt-5',
            provider: 'openai',
            modelId: 'gpt-5',
            displayName: 'GPT-5',
            description: 'Next-gen GPT model',
            tier: 'premium',
            costPer1kInputTokens: 0.01,
            costPer1kOutputTokens: 0.03,
            creditPer1kTokens: 5.0,
            maxContextTokens: 200000,
            capabilities: ['chat', 'vision', 'reasoning'],
            isActive: true,
            isDefault: true
        },
        {
            id: 'gpt-5.2',
            provider: 'openai',
            modelId: 'gpt-5.2',
            displayName: 'GPT-5.2 (Boost)',
            description: 'Booster mode premium model',
            tier: 'premium',
            costPer1kInputTokens: 0.012,
            costPer1kOutputTokens: 0.035,
            creditPer1kTokens: 7.0,
            maxContextTokens: 250000,
            capabilities: ['chat', 'vision', 'reasoning'],
            isActive: true,
            isDefault: false
        },
        // Anthropic Models
        {
            id: 'claude-3-5-sonnet',
            provider: 'anthropic',
            modelId: 'claude-3-5-sonnet-20241022',
            displayName: 'Claude 3.5 Sonnet',
            description: 'Fastest reasoning model',
            tier: 'standard',
            costPer1kInputTokens: 0.003,
            costPer1kOutputTokens: 0.015,
            creditPer1kTokens: 1.2,
            maxContextTokens: 200000,
            capabilities: ['chat', 'vision', 'coding'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'claude-3-opus',
            provider: 'anthropic',
            modelId: 'claude-3-opus-20240229',
            displayName: 'Claude 3 Opus',
            description: 'Most powerful Claude model',
            tier: 'premium',
            costPer1kInputTokens: 0.015,
            costPer1kOutputTokens: 0.075,
            creditPer1kTokens: 3.5,
            maxContextTokens: 200000,
            capabilities: ['chat', 'vision'],
            isActive: true,
            isDefault: false
        },
        // Google Gemini Models
        {
            id: 'gemini-1.5-pro',
            provider: 'gemini',
            modelId: 'gemini-1.5-pro',
            displayName: 'Gemini 1.5 Pro',
            description: 'Advanced reasoning and long context',
            tier: 'standard',
            costPer1kInputTokens: 0.00125,
            costPer1kOutputTokens: 0.005,
            creditPer1kTokens: 0.8,
            maxContextTokens: 2000000,
            capabilities: ['chat', 'vision', 'pdf'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'gemini-2.0-flash',
            provider: 'gemini',
            modelId: 'gemini-2.0-flash-exp',
            displayName: 'Gemini 2.0 Flash',
            description: 'Real-time efficiency',
            tier: 'economy',
            costPer1kInputTokens: 0.0001,
            costPer1kOutputTokens: 0.0004,
            creditPer1kTokens: 0.15,
            maxContextTokens: 1000000,
            capabilities: ['chat', 'vision'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'gemini-2.5-flash',
            provider: 'gemini',
            modelId: 'gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            description: 'Optimized speed and quality',
            tier: 'standard',
            costPer1kInputTokens: 0.00015,
            costPer1kOutputTokens: 0.0006,
            creditPer1kTokens: 0.5,
            maxContextTokens: 1000000,
            capabilities: ['chat', 'vision'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'gemini-2.5-pro-boost',
            provider: 'gemini',
            modelId: 'gemini-2.5-pro',
            displayName: 'Gemini 2.5 Pro (Boost)',
            description: 'Enhanced intelligence for complex tasks',
            tier: 'premium',
            costPer1kInputTokens: 0.002,
            costPer1kOutputTokens: 0.008,
            creditPer1kTokens: 2.0,
            maxContextTokens: 2000000,
            capabilities: ['chat', 'vision', 'reasoning'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'gemini-3-pro-preview',
            provider: 'gemini',
            modelId: 'gemini-3-pro-preview',
            displayName: 'Gemini 3.0 Pro (Preview)',
            description: 'The future of large-scale reasoning',
            tier: 'premium',
            costPer1kInputTokens: 0.005,
            costPer1kOutputTokens: 0.02,
            creditPer1kTokens: 5.0,
            maxContextTokens: 2000000,
            capabilities: ['chat', 'vision', 'reasoning'],
            isActive: true,
            isDefault: false
        },
        // DeepSeek Models
        {
            id: 'deepseek-v3',
            provider: 'deepseek',
            modelId: 'deepseek-chat',
            displayName: 'DeepSeek-V3',
            description: 'Extreme efficiency and quality',
            tier: 'standard',
            costPer1kInputTokens: 0.0001,
            costPer1kOutputTokens: 0.0002,
            creditPer1kTokens: 0.5,
            maxContextTokens: 64000,
            capabilities: ['chat', 'coding', 'text'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'deepseek-r1',
            provider: 'deepseek',
            modelId: 'deepseek-reasoner',
            displayName: 'DeepSeek-R1 (Reasoning)',
            description: 'Advanced Chain-of-Thought reasoning',
            tier: 'ultra',
            costPer1kInputTokens: 0.0005,
            costPer1kOutputTokens: 0.002,
            creditPer1kTokens: 2.0,
            maxContextTokens: 128000,
            capabilities: ['chat', 'reasoning', 'math', 'coding'],
            isActive: true,
            isDefault: true
        },
        {
            id: 'deepseek-v3.2-exp',
            provider: 'deepseek',
            modelId: 'deepseek-chat',
            displayName: 'DeepSeek-V3.2-Exp',
            description: 'Latest Experimental V3.2',
            tier: 'premium',
            costPer1kInputTokens: 0.00015,
            costPer1kOutputTokens: 0.0003,
            creditPer1kTokens: 0.8,
            maxContextTokens: 64000,
            capabilities: ['chat', 'coding', 'text'],
            isActive: true,
            isDefault: false
        },
        {
            id: 'deepseek-r1-zero',
            provider: 'deepseek',
            modelId: 'deepseek-r1-zero',
            displayName: 'DeepSeek-R1-Zero',
            description: 'Initial search reasoning model',
            tier: 'premium',
            costPer1kInputTokens: 0.0004,
            costPer1kOutputTokens: 0.0015,
            creditPer1kTokens: 1.5,
            maxContextTokens: 64000,
            capabilities: ['chat', 'reasoning'],
            isActive: true,
            isDefault: false
        }
    ];



    console.log('🧹 Cleaning up old systemLLMModels...');
    const existingModels = await db.collection('systemLLMModels').get();
    existingModels.forEach(doc => {
        batch.delete(doc.ref);
    });

    console.log('📦 Seeding systemLLMModels...');
    for (const model of models) {
        const ref = db.collection('systemLLMModels').doc(model.id);
        batch.set(ref, {
            ...model,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // ==========================================
    // 2. featurePolicies - Feature-based Model Routing
    // ==========================================
    const policies = [
        // Studio Features
        {
            id: 'studio.content_gen',
            featureName: 'Content Generation',
            category: 'studio',
            description: 'General content creation in Studio',
            defaultTier: {
                provider: 'openai',
                model: 'gpt-5',
                creditMultiplier: 1.0
            },
            boostTier: {
                provider: 'gemini',
                model: 'gemini-3-pro-preview',
                creditMultiplier: 2.5
            },
            forceTier: null, // No forced model
            isActive: true
        },
        {
            id: 'studio.ad_copy',
            featureName: 'Ad Copy Generation',
            category: 'studio',
            description: 'Advertising copy and marketing text',
            defaultTier: {
                provider: 'openai',
                model: 'gpt-5',
                creditMultiplier: 1.0
            },
            boostTier: {
                provider: 'openai',
                model: 'gpt-5.2',
                creditMultiplier: 2.5
            },
            forceTier: null,
            isActive: true
        },
        {
            id: 'studio.ad_copy_finalize',
            featureName: 'Ad Copy Finalization',
            category: 'studio',
            description: 'Final polish for ad copy - always uses premium',
            defaultTier: {
                provider: 'openai',
                model: 'gpt-5.2',
                creditMultiplier: 2.5
            },
            boostTier: {
                provider: 'openai',
                model: 'gpt-5.2',
                creditMultiplier: 2.5
            },
            forceTier: {
                provider: 'openai',
                model: 'gpt-5.2',
                creditMultiplier: 2.5
            },
            isActive: true
        },
        {
            id: 'studio.social_post',
            featureName: 'Social Media Posts',
            category: 'studio',
            description: 'Social media content creation',
            defaultTier: {
                provider: 'openai',
                model: 'gpt-5',
                creditMultiplier: 1.0
            },
            boostTier: {
                provider: 'openai',
                model: 'gpt-5.2',
                creditMultiplier: 2.5
            },
            forceTier: null,
            isActive: true
        },
        // Brand Brain Features
        {
            id: 'brandbrain.analysis',
            featureName: 'Brand Analysis',
            category: 'brandbrain',
            description: 'Brand document analysis',
            defaultTier: {
                provider: 'gemini',
                model: 'gemini-1.5-flash',
                creditMultiplier: 0.5
            },
            boostTier: {
                provider: 'gemini',
                model: 'gemini-3-pro-preview',
                creditMultiplier: 2.5
            },
            forceTier: null,
            isActive: true
        },
        {
            id: 'brandbrain.strategy',
            featureName: 'Strategy Generation',
            category: 'brandbrain',
            description: 'Brand strategy creation',
            defaultTier: {
                provider: 'openai',
                model: 'gpt-5',
                creditMultiplier: 1.0
            },
            boostTier: {
                provider: 'openai',
                model: 'gpt-5.2',
                creditMultiplier: 2.5
            },
            forceTier: null,
            isActive: true
        },
        // Market Pulse Features
        {
            id: 'marketpulse.trend_analysis',
            featureName: 'Trend Analysis',
            category: 'marketpulse',
            description: 'Market trend summarization',
            defaultTier: {
                provider: 'gemini',
                model: 'gemini-2.0-flash-exp',
                creditMultiplier: 0.5
            },
            boostTier: {
                provider: 'gemini',
                model: 'gemini-3-pro-preview',
                creditMultiplier: 2.5
            },
            forceTier: null,
            isActive: true
        },
        // Chatbot Features
        {
            id: 'chatbot.helpdesk',
            featureName: 'Helpdesk Chatbot',
            category: 'chatbot',
            description: 'ZYNK helpdesk assistant',
            defaultTier: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                creditMultiplier: 0.3
            },
            boostTier: {
                provider: 'openai',
                model: 'gpt-5',
                creditMultiplier: 1.0
            },
            forceTier: null,
            isActive: true
        },
        // The Arena Features
        {
            id: 'arena.debate',
            featureName: 'Arena Debate',
            category: 'arena',
            description: 'Multi-agent debate simulation',
            defaultTier: {
                provider: 'openai',
                model: 'gpt-5',
                creditMultiplier: 1.0
            },
            boostTier: {
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                creditMultiplier: 1.5
            },
            forceTier: null,
            isActive: true
        }
    ];

    console.log('📦 Seeding featurePolicies...');
    for (const policy of policies) {
        const ref = db.collection('featurePolicies').doc(policy.id);
        batch.set(ref, {
            ...policy,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // ==========================================
    // 3. Commit Batch
    // ==========================================
    await batch.commit();

    console.log('✅ PRD 11.6 Data Seeding Complete!');

    // Auto-refresh UI if functions are available
    if (typeof window.refreshLLMModels === 'function') await window.refreshLLMModels();
    if (typeof window.refreshFeaturePolicies === 'function') await window.refreshFeaturePolicies();

    alert(`Success! Successfully seeded ${models.length} Models and ${policies.length} Policies.\nThe Global Routing dropdowns should now be updated.`);

    return {
        success: true,
        models: models.length,
        policies: policies.length
    };
};

// Also expose a reset function
window.resetLLMRouterData = async function () {
    if (!confirm('⚠️ This will DELETE all systemLLMModels and featurePolicies. Continue?')) {
        return;
    }

    const db = firebase.firestore();

    // Delete systemLLMModels
    const modelsSnap = await db.collection('systemLLMModels').get();
    for (const doc of modelsSnap.docs) {
        await doc.ref.delete();
    }
    console.log(`Deleted ${modelsSnap.size} models`);

    // Delete featurePolicies
    const policiesSnap = await db.collection('featurePolicies').get();
    for (const doc of policiesSnap.docs) {
        await doc.ref.delete();
    }
    console.log(`Deleted ${policiesSnap.size} policies`);

    // Re-seed
    return await window.seedLLMRouterData();
};

console.log('📌 PRD 11.6 Seed Script Loaded');
console.log('   Run: seedLLMRouterData()');
console.log('   Reset: resetLLMRouterData()');
