// ZYNK Agent OS - CreatorTextEngine (PRD 5.1)
// Generates text Content from ContentBriefs

class CreatorTextEngine {
    constructor(projectId, db) {
        this.projectId = projectId;
        this.db = db;
        this.engineType = 'creator_text';
        this.config = null;
    }

    /**
     * Initialize: Load engine config from Firestore
     */
    async init() {
        const configDoc = await this.db
            .collection(`projects/${this.projectId}/engineConfigs`)
            .doc(this.engineType)
            .get();

        if (!configDoc.exists) {
            throw new Error(`CreatorTextEngine config not found for project: ${this.projectId}`);
        }

        this.config = configDoc.data();
        console.log(`✅ CreatorTextEngine initialized (v${this.config.engineVersion})`);
    }

    /**
     * Generate text Content from a ContentBrief
     * @param {string} briefId - ContentBrief ID
     * @returns {Object} Content document
     */
    async generateContent(briefId) {
        // Load brief
        const briefDoc = await this.db
            .collection(`projects/${this.projectId}/contentBriefs`)
            .doc(briefId)
            .get();

        if (!briefDoc.exists) {
            throw new Error(`ContentBrief not found: ${briefId}`);
        }

        const brief = briefDoc.data();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        // Load behaviour pack and RULEs
        const behaviourPack = await this._loadBehaviourPack(brief.platform);
        const rules = await this._loadRules(brief.platform, brief.format);

        // Merge pack + rules
        const mergedGuidelines = this._mergeGuidelines(behaviourPack, rules);

        // Generate content based on brief + guidelines
        const textPayload = await this._generateText(brief, mergedGuidelines);

        const contentId = `cont_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const content = {
            orgId: brief.orgId,
            projectId: this.projectId,
            contentId: contentId,

            type: 'text',
            sourceEngine: this.engineType,
            sourceEngineVersion: this.config.engineVersion,

            briefId: briefId,
            campaignId: brief.campaignId,

            platform: brief.platform,
            format: brief.format,

            status: 'draft',

            textPayload: textPayload,

            seoMetadata: brief.seoIntent?.enabled ? {
                enabled: true,
                primaryKeyword: brief.seoIntent.primaryKeyword,
                metaTitle: textPayload.title,
                metaDescription: textPayload.hook
            } : { enabled: false },

            localization: {
                language: this.config.languagePreferences?.primary || 'en'
            },

            renderMeta: {
                estimatedReadingTimeSec: Math.ceil(textPayload.body.length / 250 * 60),
                characterCount: textPayload.body.length
            },

            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Save to Firestore
        await this.db
            .collection(`projects/${this.projectId}/contents`)
            .doc(contentId)
            .set(content);

        // Update brief status
        await this.db
            .collection(`projects/${this.projectId}/contentBriefs`)
            .doc(briefId)
            .update({ status: 'generated' });

        console.log(`✅ Content created: ${contentId} (${content.platform} ${content.format})`);
        return content;
    }

    // ========================================
    // Helper Methods
    // ========================================

    async _loadBehaviourPack(platform) {
        // Simplified loader for Phase 1
        try {
            const packDoc = await this.db
                .collection('behaviourPacks')
                .doc('bp_creator_text_v1')
                .get();

            if (packDoc.exists) {
                console.log(`✅ Loaded behaviour pack for ${platform}`);
                return packDoc.data().payload;
            }
        } catch (error) {
            console.warn('⚠️ Could not load behaviour pack:', error);
        }

        return {
            tone: 'professional',
            templates: ['Hook - Value - CTA']
        };
    }

    async _loadRules(platform, format) {
        // Query learnings (RULE Store) by platform and format
        try {
            const rulesSnapshot = await this.db
                .collection(`projects/${this.projectId}/learnings`)
                .where('platform', '==', platform)
                .where('type', '==', 'TEXT_RULE')
                .where('status', '==', 'active')
                .limit(5)
                .get();

            const rules = [];
            rulesSnapshot.forEach(doc => {
                const rule = doc.data();
                if (rule.confidence > 0.7) { // Only high-confidence rules
                    rules.push(rule);
                }
            });

            console.log(`✅ Loaded ${rules.length} RULEs for ${platform}`);
            return rules;
        } catch (error) {
            console.warn('⚠️ Could not load RULEs:', error);
            return [];
        }
    }

    _mergeGuidelines(behaviourPack, rules) {
        // Merge behaviour pack with learned rules
        const merged = { ...behaviourPack };

        // Apply rules (simplified - just add patterns)
        merged.learnedPatterns = rules.map(r => r.pattern);

        return merged;
    }

    async _generateText(brief, guidelines) {
        // In a real implementation, this would call an LLM
        // For Phase 1, we'll use a template-based approach

        const templates = {
            thread: this._generateThread(brief, guidelines),
            long_post: this._generateLongPost(brief, guidelines),
            reel: this._generateReelCaption(brief, guidelines)
        };

        return templates[brief.format] || templates.long_post;
    }

    _generateThread(brief, guidelines) {
        const hook = this._generateHook(brief);
        const body = `Thread about ${brief.topic}:\n\n${brief.coreMessage}\n\nKey points:\n- Point 1\n- Point 2\n- Point 3`;

        return {
            title: brief.topic,
            body: body,
            hook: hook,
            cta: brief.cta,
            hashtags: this._generateHashtags(brief)
        };
    }

    _generateLongPost(brief, guidelines) {
        const hook = this._generateHook(brief);
        const body = `${hook}\n\n${brief.coreMessage}\n\nThis is a longer form post that provides detailed information about the topic. It follows the ${brief.tone} tone and targets ${brief.platform} audience.\n\nKey insights:\n1. First insight\n2. Second insight\n3. Third insight`;

        return {
            title: brief.topic,
            body: body,
            hook: hook,
            cta: brief.cta,
            hashtags: this._generateHashtags(brief)
        };
    }

    _generateReelCaption(brief, guidelines) {
        return {
            title: brief.topic,
            body: `${brief.coreMessage}\n\n${brief.cta}`,
            hook: this._generateHook(brief),
            cta: brief.cta,
            hashtags: this._generateHashtags(brief)
        };
    }

    _generateHook(brief) {
        const hooks = {
            curiosity: `What if I told you about ${brief.topic}?`,
            problem: `Struggling with ${brief.topic}? Here's what you need to know.`,
            value: `The ultimate guide to ${brief.topic}.`
        };
        return hooks[brief.hookIntent] || hooks.value;
    }

    _generateHashtags(brief) {
        // Simple hashtag generation from topic
        const words = brief.topic.toLowerCase().split(' ');
        return words.slice(0, 3).map(w => `#${w.replace(/[^a-z0-9]/g, '')}`);
    }
}

// Export for use in browser context
if (typeof window !== 'undefined') {
    window.CreatorTextEngine = CreatorTextEngine;
}
