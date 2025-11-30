// utils-channel-guidelines.js
// Channel Guidelines Resolution Utility
// Resolves channel-specific guidelines from SubAgentTemplate

(function () {
    'use strict';

    /**
     * Resolve channel guidelines for a sub-agent instance
     * @param {Object} template - SubAgentTemplate
     * @param {string} targetChannel - Target channel type (e.g., 'instagram', 'x')
     * @returns {Object} Channel guidelines or defaults
     */
    window.resolveChannelGuidelines = function (template, targetChannel) {
        console.log(`[Channel Guidelines] Resolving for channel: ${targetChannel}`);

        if (!template || !template.channelGuidelines || template.channelGuidelines.length === 0) {
            console.warn('[Channel Guidelines] No guidelines defined, using defaults');
            return getDefaultGuidelines(targetChannel);
        }

        // Find matching guideline
        const guideline = template.channelGuidelines.find(
            g => g.channelType === targetChannel
        );

        if (!guideline) {
            console.warn(`[Channel Guidelines] No guideline for ${targetChannel}, using defaults`);
            return getDefaultGuidelines(targetChannel);
        }

        console.log(`[Channel Guidelines] Found guideline for ${targetChannel}:`, guideline);
        return guideline;
    };

    /**
     * Get default guidelines for a channel type
     * @param {string} channelType - Channel type
     * @returns {Object} Default guidelines
     */
    function getDefaultGuidelines(channelType) {
        const defaults = {
            instagram: {
                channelType: 'instagram',
                tone: 'casual',
                maxLength: 2200,
                useHashtags: true,
                emojiStyle: 'moderate',
                preferredFormats: ['post', 'reel', 'story'],
                callToAction: true,
                platformRules: {
                    aspectRatio: '1:1',
                    captionStyle: 'above-fold'
                }
            },
            x: {
                channelType: 'x',
                tone: 'concise',
                maxLength: 280,
                useHashtags: false,
                emojiStyle: 'minimal',
                preferredFormats: ['tweet', 'thread'],
                callToAction: false,
                platformRules: {
                    threadSupport: true,
                    mediaLimit: 4
                }
            },
            youtube: {
                channelType: 'youtube',
                tone: 'detailed',
                maxLength: 5000,
                useHashtags: true,
                emojiStyle: 'moderate',
                preferredFormats: ['video', 'short'],
                callToAction: true,
                platformRules: {
                    aspectRatio: '16:9'
                }
            },
            blog: {
                channelType: 'blog',
                tone: 'professional',
                maxLength: 10000,
                useHashtags: false,
                emojiStyle: 'none',
                preferredFormats: ['article', 'listicle'],
                callToAction: true
            }
        };

        return defaults[channelType] || {
            channelType,
            tone: 'professional',
            maxLength: 2000,
            useHashtags: false,
            emojiStyle: 'minimal',
            callToAction: false
        };
    }

    /**
     * Apply channel guidelines to system prompt
     * @param {string} systemPrompt - Base system prompt
     * @param {Object} guidelines - Channel guidelines
     * @returns {string} Enriched system prompt
     */
    window.applyGuidelinesToPrompt = function (systemPrompt, guidelines) {
        if (!guidelines) return systemPrompt;

        const guidelineText = `

### Channel Guidelines (${guidelines.channelType.toUpperCase()})
Apply these guidelines to all content:
- **Tone**: ${guidelines.tone}
- **Max Length**: ${guidelines.maxLength} characters
- **Hashtags**: ${guidelines.useHashtags ? 'Include relevant hashtags' : 'No hashtags'}
- **Emoji Style**: ${guidelines.emojiStyle}
${guidelines.callToAction ? '- **Call-to-Action**: Include a clear CTA' : ''}
${guidelines.preferredFormats ? `- **Preferred Formats**: ${guidelines.preferredFormats.join(', ')}` : ''}
${guidelines.platformRules ? `\n**Platform-Specific Rules**:\n${JSON.stringify(guidelines.platformRules, null, 2)}` : ''}
`;

        return systemPrompt + guidelineText;
    };

    /**
     * Cache effective guidelines in instance
     * @param {string} instanceId - SubAgentInstance ID
     * @param {Object} guidelines - Resolved guidelines
     */
    window.cacheEffectiveGuidelines = async function (instanceId, guidelines) {
        try {
            await db.collection('subAgentInstances').doc(instanceId).update({
                effectiveGuidelines: guidelines,
                updatedAt: firebase.firestore.Timestamp.now()
            });
            console.log(`[Channel Guidelines] Cached for instance: ${instanceId}`);
        } catch (error) {
            console.error('[Channel Guidelines] Failed to cache:', error);
        }
    };

    console.log('[Channel Guidelines] Utility loaded');
})();
