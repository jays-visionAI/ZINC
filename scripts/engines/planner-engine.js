// ZYNK Agent OS - PlannerEngine (PRD 5.1)
// Generates Campaigns and ContentBriefs from user requests

class PlannerEngine {
    constructor(projectId, db) {
        this.projectId = projectId;
        this.db = db;
        this.engineType = 'planner';
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
            throw new Error(`PlannerEngine config not found for project: ${this.projectId}`);
        }

        this.config = configDoc.data();
        console.log(`✅ PlannerEngine initialized (v${this.config.engineVersion})`);
    }

    /**
     * Generate a Campaign from user request
     * @param {Object} request - User request with intent, goal, platforms, etc.
     * @returns {Object} Campaign document
     */
    async generateCampaign(request) {
        const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        // Extract platforms from request or use config defaults
        const platforms = request.platforms || this.config.defaultPlatforms || ['x', 'instagram'];

        // Determine campaign type
        const campaignType = this._detectCampaignType(request);

        const campaign = {
            orgId: this.config.orgId,
            projectId: this.projectId,
            campaignId: campaignId,

            name: request.campaignName || `Campaign - ${new Date().toISOString().split('T')[0]}`,
            type: campaignType, // 'launch', 'evergreen', 'event', etc.
            goal: request.goal || 'engagement',

            status: 'draft',
            platforms: platforms,

            timeframe: {
                startAt: request.startDate || null,
                endAt: request.endDate || null
            },

            targetAudience: request.targetAudience || 'General audience',
            riskProfileOverride: null,

            kpiTargets: request.kpiTargets || {
                impressions: 50000,
                engagementRate: 0.03
            },

            plannerMeta: {
                sourceEngine: this.engineType,
                createdByEngineVersion: this.config.engineVersion,
                notes: request.notes || null
            },

            structureSummary: {
                phases: this._generateCampaignPhases(campaignType, request)
            },

            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Save to Firestore
        await this.db
            .collection(`projects/${this.projectId}/campaigns`)
            .doc(campaignId)
            .set(campaign);

        console.log(`✅ Campaign created: ${campaignId} (${campaign.name})`);
        return campaign;
    }

    /**
     * Generate ContentBriefs for a Campaign
     * @param {string} campaignId - Campaign ID
     * @param {number} count - Number of briefs to generate
     * @returns {Array} Array of ContentBrief documents
     */
    async generateContentBriefs(campaignId, count = 5) {
        // Load campaign
        const campaignDoc = await this.db
            .collection(`projects/${this.projectId}/campaigns`)
            .doc(campaignId)
            .get();

        if (!campaignDoc.exists) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }

        const campaign = campaignDoc.data();
        const briefs = [];
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        // Load behaviour pack (simplified for Phase 1)
        const behaviourPack = await this._loadBehaviourPack('creator_text', campaign.platforms[0]);

        // Generate briefs per platform
        for (let i = 0; i < count; i++) {
            const platform = campaign.platforms[i % campaign.platforms.length];
            const briefId = `brief_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const brief = {
                orgId: campaign.orgId,
                projectId: this.projectId,
                briefId: briefId,
                campaignId: campaignId,

                sourceEngine: this.engineType,
                status: 'draft',

                platform: platform,
                format: this._selectFormat(platform),
                modality: 'text',

                topic: campaign.name,
                coreMessage: `Campaign message for ${campaign.targetAudience}`,
                angle: behaviourPack?.recommendedAngles?.[0] || 'informative',
                tone: behaviourPack?.tone || 'professional',

                hookIntent: 'curiosity',
                cta: 'Learn more',

                seoIntent: {
                    enabled: false,
                    primaryKeyword: null,
                    secondaryKeywords: []
                },

                linkAssets: {
                    referenceLinks: [],
                    productIds: []
                },

                automationMode: 'auto',
                complianceFlags: [],

                createdAt: timestamp,
                updatedAt: timestamp
            };

            briefs.push(brief);

            // Save to Firestore
            await this.db
                .collection(`projects/${this.projectId}/contentBriefs`)
                .doc(briefId)
                .set(brief);
        }

        console.log(`✅ Generated ${briefs.length} content briefs for campaign: ${campaignId}`);
        return briefs;
    }

    // ========================================
    // Helper Methods
    // ========================================

    _detectCampaignType(request) {
        if (request.type) return request.type;

        const keywords = request.description?.toLowerCase() || '';
        if (keywords.includes('launch')) return 'launch';
        if (keywords.includes('event')) return 'event';
        if (keywords.includes('promotion')) return 'promotion';
        return 'evergreen';
    }

    _generateCampaignPhases(type, request) {
        // Simplified phase generation
        if (type === 'launch') {
            return [
                { name: 'Pre-Launch', order: 1, description: 'Teaser & Warmup' },
                { name: 'Launch', order: 2, description: 'Main Launch Event' },
                { name: 'Post-Launch', order: 3, description: 'Follow-up & Engagement' }
            ];
        } else if (type === 'event') {
            return [
                { name: 'Awareness', order: 1, description: 'Build anticipation' },
                { name: 'Event', order: 2, description: 'Live event coverage' }
            ];
        } else {
            return [
                { name: 'Content Creation', order: 1, description: 'Ongoing content production' }
            ];
        }
    }

    _selectFormat(platform) {
        const formats = {
            'x': 'thread',
            'instagram': 'reel',
            'linkedin': 'long_post',
            'youtube': 'short'
        };
        return formats[platform] || 'post';
    }

    async _loadBehaviourPack(engineType, platform) {
        // Simplified loader for Phase 1
        // In production, this would query based on engineType + platform + channel
        try {
            const packDoc = await this.db
                .collection('behaviourPacks')
                .doc('bp_creator_text_v1')
                .get();

            if (packDoc.exists) {
                console.log(`✅ Loaded behaviour pack: bp_creator_text_v1`);
                return packDoc.data().payload;
            }
        } catch (error) {
            console.warn('⚠️ Could not load behaviour pack, using defaults:', error);
        }

        return {
            tone: 'professional',
            recommendedAngles: ['informative', 'story', 'how-to']
        };
    }
}

// Export for use in browser context
if (typeof window !== 'undefined') {
    window.PlannerEngine = PlannerEngine;
}
