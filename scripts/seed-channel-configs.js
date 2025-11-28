// Seed Sample Channel Agent Configs
// Creates example configurations for X channel with overrides

(async function seedChannelConfigs() {
    console.log("📝 Seeding Sample Channel Agent Configs...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const projectId = "default_project";
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const userId = firebase.auth().currentUser?.uid || "demo_user";

    const sampleConfigs = [
        {
            instanceId: "inst_x_main",
            channelId: "x",
            channelAgentTemplateId: "x_growth_saas_v1",

            overrides: {
                goals: {
                    followers: 0.2,
                    engagement: 0.4,
                    clicks: 0.3,
                    impressions: 0.1
                },

                planner: {
                    postFrequency: "high",
                    formatMix: {
                        shortTweet: 50,
                        thread: 90,
                        imagePost: 40,
                        videoPost: 15
                    },
                    experimentIntensity: "high",
                    avgThreadLength: 9
                },

                creator_text: {
                    tonePreset: "bold",
                    hookStyle: ["contrarian", "stat", "value_prop"],
                    emojiUsage: "moderate",
                    hashtagCount: 4,
                    ctaIntensity: "aggressive"
                },

                engagement: {
                    autoReplyLevel: "high",
                    dailyReplyCap: 120,
                    replyToMentions: true,
                    replyToKeywords: ["pricing", "demo", "trial", "discount"],
                    escalationTriggers: ["complaint", "pricing_inquiry"]
                }
            }
        },
        {
            instanceId: "inst_x_conservative",
            channelId: "x",
            channelAgentTemplateId: "x_corporate_v1",

            overrides: {
                goals: {
                    followers: 0.3,
                    engagement: 0.3,
                    clicks: 0.2,
                    impressions: 0.2
                },

                planner: {
                    postFrequency: "low",
                    formatMix: {
                        shortTweet: 70,
                        thread: 50,
                        imagePost: 60,
                        videoPost: 5
                    },
                    experimentIntensity: "low",
                    avgThreadLength: 5
                },

                creator_text: {
                    tonePreset: "professional",
                    hookStyle: ["question", "value_prop"],
                    emojiUsage: "minimal",
                    hashtagCount: 2,
                    ctaIntensity: "soft"
                },

                engagement: {
                    autoReplyLevel: "low",
                    dailyReplyCap: 30,
                    replyToMentions: true,
                    replyToKeywords: [],
                    escalationTriggers: ["complaint", "negative_sentiment", "support_question"]
                }
            }
        },
        {
            instanceId: "inst_instagram_main",
            channelId: "instagram",
            channelAgentTemplateId: "instagram_lifestyle_v1",

            overrides: {
                goals: {
                    followers: 0.25,
                    engagement: 0.35,
                    clicks: 0.2,
                    impressions: 0.2
                },

                planner: {
                    postFrequency: "medium",
                    formatMix: {
                        reel: 80,
                        carousel: 60,
                        feedPost: 40,
                        story: 100
                    }
                },

                creator_text: {
                    tonePreset: "humorous",
                    emojiUsage: "high",
                    hashtagCount: 11
                }
            }
        }
    ];

    try {
        const batch = db.batch();

        sampleConfigs.forEach(config => {
            const docRef = db
                .collection(`projects/${projectId}/channelAgentConfigs`)
                .doc(config.instanceId);

            const data = {
                projectId: projectId,
                instanceId: config.instanceId,
                channelId: config.channelId,
                channelAgentTemplateId: config.channelAgentTemplateId,
                overrides: config.overrides,
                lastEditedBy: userId,
                lastEditedAt: timestamp,
                createdAt: timestamp
            };

            batch.set(docRef, data);
            console.log(`  ✅ Queued: ${config.instanceId} (${config.channelId})`);
        });

        await batch.commit();
        console.log(`\n✨ Successfully created ${sampleConfigs.length} channel configs!`);
        alert(`✅ ${sampleConfigs.length} channel configs created!`);

    } catch (error) {
        console.error("❌ Error creating configs:", error);
        alert(`Error: ${error.message}`);
    }
})();
