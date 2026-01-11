/**
 * Script to migrate LLM configurations to DeepSeek
 * Updates systemSettings/llmConfig to prioritize DeepSeek for all tiers
 */

const admin = require('firebase-admin');

// Initialize Admin SDK for ZINC
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'zinc-c790f'
    });
}

const db = admin.firestore();

async function migrateToDeepSeek() {
    console.log('[Migration] Starting DeepSeek prioritized routing update...');

    const llmConfigRef = db.collection('systemSettings').doc('llmConfig');

    const deepSeekConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        defaultModels: {
            text: {
                provider: 'deepseek',
                model: 'deepseek-chat'
            },
            boost: {
                provider: 'deepseek',
                model: 'deepseek-reasoner'
            },
            economy: {
                provider: 'deepseek',
                model: 'deepseek-chat'
            }
        },
        tagMappings: {
            reasoning_optimized: {
                provider: 'deepseek',
                model: 'deepseek-reasoner'
            },
            speed_optimized: {
                provider: 'deepseek',
                model: 'deepseek-chat'
            },
            creative_optimized: {
                provider: 'deepseek',
                model: 'deepseek-chat'
            }
        },
        tiers: {
            '1_economy': { provider: 'deepseek', model: 'deepseek-chat', creditMultiplier: 0.2 },
            '2_balanced': { provider: 'deepseek', model: 'deepseek-chat', creditMultiplier: 1.0 },
            '3_standard': { provider: 'deepseek', model: 'deepseek-chat', creditMultiplier: 2.0 },
            '4_premium': { provider: 'deepseek', model: 'deepseek-reasoner', creditMultiplier: 3.0 },
            '5_ultra': { provider: 'deepseek', model: 'deepseek-reasoner', creditMultiplier: 5.0 }
        }
    };

    try {
        await llmConfigRef.set(deepSeekConfig, { merge: true });
        console.log('[Migration] Successfully updated systemSettings/llmConfig to DeepSeek');

        // Also update individual feature policies if they exist (optional but thorough)
        const featurePolicies = await db.collection('featurePolicies').get();
        const batch = db.batch();
        let count = 0;

        featurePolicies.forEach(doc => {
            const data = doc.data();
            // If they are not already forced to something else
            if (data.provider !== 'openai' && data.provider !== 'anthropic' && data.provider !== 'google') {
                batch.update(doc.ref, {
                    provider: 'deepseek',
                    model_id: data.model_id === 'reasoning_optimized' ? 'reasoning_optimized' : 'deepseek-chat'
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`[Migration] Updated ${count} feature policies to DeepSeek`);
        }

        console.log('[Migration] All tasks completed.');
    } catch (error) {
        console.error('[Migration] Failed:', error);
    }
}

migrateToDeepSeek();
