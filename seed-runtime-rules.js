// seed-runtime-rules.js
// Runtime Profile Rules Seeder
// Based on: .docs/runtime-profile-cleanup-plan.md

const logsDiv = document.getElementById('logs');
const seedBtn = document.getElementById('seed-btn');
const ruleCountDiv = document.getElementById('rule-count');

function log(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `log log-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    div.textContent = `[${timestamp}] ${msg}`;
    logsDiv.appendChild(div);
    logsDiv.scrollTop = logsDiv.scrollHeight;
    console.log(`[${type.toUpperCase()}] ${msg}`);
}

// Master Reference: 12 Engine Types with their tier configurations
// Source: .docs/runtime-profile-cleanup-plan.md
const ENGINE_RULES = [
    {
        id: 'rpr_planner_global_v1',
        engine_type: 'planner',
        language: 'global',
        description: 'Strategic content planning and scheduling',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4-turbo',
                temperature: 0.9,
                max_tokens: 3000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.7,
                max_tokens: 2000
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.3,
                max_tokens: 2000
            }
        }
    },
    {
        id: 'rpr_research_global_v1',
        engine_type: 'research',
        language: 'global',
        description: 'Market analysis and trend research',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4-turbo',
                temperature: 0.8,
                max_tokens: 4000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.6,
                max_tokens: 3000
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.2,
                max_tokens: 3000
            }
        }
    },
    {
        id: 'rpr_creator_text_global_v1',
        engine_type: 'creator_text',
        language: 'global',
        description: 'Text content generation',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4-turbo',
                temperature: 1.0,
                max_tokens: 2000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.8,
                max_tokens: 1500
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.5,
                max_tokens: 1500
            }
        }
    },
    {
        id: 'rpr_creator_image_global_v1',
        engine_type: 'creator_image',
        language: 'global',
        description: 'Image generation and design',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'dall-e-3',
                temperature: 0.9,
                max_tokens: 1000
            },
            balanced: {
                provider: 'openai',
                model_id: 'dall-e-3',
                temperature: 0.7,
                max_tokens: 1000
            },
            precise: {
                provider: 'openai',
                model_id: 'dall-e-3',
                temperature: 0.5,
                max_tokens: 1000
            }
        }
    },
    {
        id: 'rpr_creator_video_global_v1',
        engine_type: 'creator_video',
        language: 'global',
        description: 'Video script and storyboard generation',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4-turbo',
                temperature: 0.9,
                max_tokens: 3000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.7,
                max_tokens: 2500
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.5,
                max_tokens: 2500
            }
        }
    },
    {
        id: 'rpr_engagement_global_v1',
        engine_type: 'engagement',
        language: 'global',
        description: 'Comment and interaction management',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4-turbo',
                temperature: 0.8,
                max_tokens: 500
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.7,
                max_tokens: 300
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.5,
                max_tokens: 300
            }
        }
    },
    {
        id: 'rpr_compliance_global_v1',
        engine_type: 'compliance',
        language: 'global',
        description: 'Fact checking and safety verification',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.3,
                max_tokens: 2000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.2,
                max_tokens: 2000
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.1,
                max_tokens: 2000
            }
        }
    },
    {
        id: 'rpr_evaluator_global_v1',
        engine_type: 'evaluator',
        language: 'global',
        description: 'Quality assessment and scoring',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.5,
                max_tokens: 2000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.3,
                max_tokens: 1500
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.1,
                max_tokens: 1500
            }
        }
    },
    {
        id: 'rpr_manager_global_v1',
        engine_type: 'manager',
        language: 'global',
        description: 'Final approval and decision making',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.6,
                max_tokens: 1500
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.4,
                max_tokens: 1000
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.2,
                max_tokens: 1000
            }
        }
    },
    {
        id: 'rpr_kpi_global_v1',
        engine_type: 'kpi',
        language: 'global',
        description: 'Performance optimization and analytics',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.5,
                max_tokens: 2500
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.3,
                max_tokens: 2000
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.1,
                max_tokens: 2000
            }
        }
    },
    {
        id: 'rpr_seo_watcher_global_v1',
        engine_type: 'seo_watcher',
        language: 'global',
        description: 'SEO policy monitoring and optimization',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.4,
                max_tokens: 2000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.3,
                max_tokens: 1500
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.2,
                max_tokens: 1500
            }
        }
    },
    {
        id: 'rpr_knowledge_curator_global_v1',
        engine_type: 'knowledge_curator',
        language: 'global',
        description: 'Brand memory and knowledge management',
        tiers: {
            creative: {
                provider: 'openai',
                model_id: 'gpt-4-turbo',
                temperature: 0.6,
                max_tokens: 4000
            },
            balanced: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.5,
                max_tokens: 3000
            },
            precise: {
                provider: 'openai',
                model_id: 'gpt-4',
                temperature: 0.3,
                max_tokens: 3000
            }
        }
    }
];

async function loadCurrentRuleCount() {
    try {
        if (!firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        const db = firebase.firestore();
        const snapshot = await db.collection('runtimeProfileRules').get();
        ruleCountDiv.textContent = snapshot.size;
        log(`Current rules in database: ${snapshot.size}`, 'info');
    } catch (error) {
        console.error(error);
        ruleCountDiv.textContent = 'Error';
        log(`Error loading rule count: ${error.message}`, 'error');
    }
}

async function startSeeding() {
    if (!confirm('Are you sure you want to DELETE ALL runtime profile rules and recreate them?')) {
        return;
    }

    seedBtn.disabled = true;
    log('🚀 Starting seeding process...', 'info');

    try {
        if (!firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        const db = firebase.firestore();

        // Step 1: Delete existing rules
        log('📋 Fetching existing rules...', 'info');
        const snapshot = await db.collection('runtimeProfileRules').get();

        if (!snapshot.empty) {
            log(`⚠️  Found ${snapshot.size} existing rules. Deleting...`, 'warning');
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            log('✅ All existing rules deleted.', 'success');
        } else {
            log('ℹ️  No existing rules found.', 'info');
        }

        // Step 2: Create new rules
        log('🔨 Creating new rules from master reference...', 'info');
        const batch = db.batch();
        let count = 0;

        for (const rule of ENGINE_RULES) {
            const ruleData = {
                ...rule,
                is_active: true,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = db.collection('runtimeProfileRules').doc(rule.id);
            batch.set(docRef, ruleData);
            count++;

            log(`  ✓ ${rule.engine_type.padEnd(20)} → ${rule.id}`, 'debug');
        }

        await batch.commit();

        log(`✨ Successfully created ${count} runtime profile rules!`, 'success');
        log('', 'info');
        log('📊 Summary:', 'info');
        log(`   - Total Rules: ${count}`, 'info');
        log(`   - Tiers per Rule: 3 (creative, balanced, precise)`, 'info');
        log(`   - Total Configurations: ${count * 3}`, 'info');
        log(`   - Language: global (base)`, 'info');
        log('', 'info');
        log('🎯 This replaces hundreds of individual runtime profiles!', 'success');
        log('✅ Seeding complete. You can now close this page.', 'success');

        // Reload count
        await loadCurrentRuleCount();

    } catch (error) {
        console.error(error);
        log(`❌ Error: ${error.message}`, 'error');
        if (error.stack) {
            log(`Stack: ${error.stack}`, 'debug');
        }
    } finally {
        seedBtn.disabled = false;
    }
}

// Load current count on page load
window.addEventListener('load', () => {
    setTimeout(loadCurrentRuleCount, 1000);
});
