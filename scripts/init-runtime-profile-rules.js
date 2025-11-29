// scripts/init-runtime-profile-rules.js
// Initialize Runtime Profile Rules for all 12 engine types

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 12 Engine Types with their default configurations
const ENGINE_RULES = [
    {
        id: 'rule_planner_v1',
        engine_type: 'planner',
        name: 'Planner Default Rule',
        description: 'Strategic content planning and scheduling',
        models: {
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
        },
        language_overrides: {
            'ja': {
                balanced: {
                    provider: 'anthropic',
                    model_id: 'claude-3-sonnet-20240229'
                }
            }
        }
    },
    {
        id: 'rule_research_v1',
        engine_type: 'research',
        name: 'Research Default Rule',
        description: 'Market analysis and trend research',
        models: {
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
        id: 'rule_creator_text_v1',
        engine_type: 'creator_text',
        name: 'Text Creator Default Rule',
        description: 'Text content generation',
        models: {
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
        id: 'rule_creator_image_v1',
        engine_type: 'creator_image',
        name: 'Image Creator Default Rule',
        description: 'Image generation and design',
        models: {
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
        id: 'rule_creator_video_v1',
        engine_type: 'creator_video',
        name: 'Video Creator Default Rule',
        description: 'Video script and storyboard generation',
        models: {
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
        id: 'rule_engagement_v1',
        engine_type: 'engagement',
        name: 'Engagement Default Rule',
        description: 'Comment and interaction management',
        models: {
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
        id: 'rule_compliance_v1',
        engine_type: 'compliance',
        name: 'Compliance Default Rule',
        description: 'Fact checking and safety verification',
        models: {
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
        id: 'rule_evaluator_v1',
        engine_type: 'evaluator',
        name: 'Evaluator Default Rule',
        description: 'Quality assessment and scoring',
        models: {
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
        id: 'rule_manager_v1',
        engine_type: 'manager',
        name: 'Manager Default Rule',
        description: 'Final approval and decision making',
        models: {
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
        id: 'rule_kpi_v1',
        engine_type: 'kpi',
        name: 'KPI Default Rule',
        description: 'Performance optimization and analytics',
        models: {
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
        id: 'rule_seo_watcher_v1',
        engine_type: 'seo_watcher',
        name: 'SEO Watcher Default Rule',
        description: 'SEO policy monitoring and optimization',
        models: {
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
        id: 'rule_knowledge_curator_v1',
        engine_type: 'knowledge_curator',
        name: 'Knowledge Curator Default Rule',
        description: 'Brand memory and knowledge management',
        models: {
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
        },
        language_overrides: {
            'zh': {
                balanced: {
                    provider: 'openai',
                    model_id: 'gpt-4-turbo'
                }
            }
        }
    }
];

async function initializeRuntimeProfileRules() {
    console.log('🚀 Initializing Runtime Profile Rules...\n');

    const batch = db.batch();
    let count = 0;

    for (const rule of ENGINE_RULES) {
        const ruleData = {
            ...rule,
            status: 'active',
            version: '1.0.0',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            created_by: 'system'
        };

        const docRef = db.collection('runtimeProfileRules').doc(rule.id);
        batch.set(docRef, ruleData);
        count++;

        console.log(`✅ ${rule.engine_type.padEnd(20)} → ${rule.id}`);
    }

    await batch.commit();

    console.log(`\n✨ Successfully created ${count} runtime profile rules!`);
    console.log('\n📊 Summary:');
    console.log(`   - Total Rules: ${count}`);
    console.log(`   - Tiers per Rule: 3 (creative, balanced, precise)`);
    console.log(`   - Total Configurations: ${count * 3}`);
    console.log(`   - Supports: 12 languages dynamically`);
    console.log(`\n🎯 This replaces ${count * 12 * 3} individual runtime profiles!`);
}

// Run initialization
initializeRuntimeProfileRules()
    .then(() => {
        console.log('\n✅ Initialization complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
