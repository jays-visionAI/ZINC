// utils-brand-brain.js
// Brand Brain Integration Utility
// Handles context retrieval and prompt enrichment

(function () {
    'use strict';

    /**
     * Query the Brand Brain for relevant context
     * @param {string} projectId - Project ID
     * @param {string} query - The query string (usually the task prompt)
     * @param {Object} options - Query options
     * @param {string} [options.mode='light'] - Context mode ('light' | 'full' | 'none')
     * @param {number} [options.maxTokens=500] - Max tokens for context
     * @param {string} [options.language='en'] - Language code
     * @returns {Promise<Array>} Array of context snippets
     */
    window.queryBrandBrain = async function (projectId, query, options = {}) {
        const { mode = 'light', maxTokens = 500 } = options;

        if (mode === 'none') {
            return [];
        }

        console.log(`[Brand Brain] Querying for project ${projectId} (Mode: ${mode})`);

        // Mock Implementation for Phase 1
        // In a real implementation, this would call a cloud function wrapping Pinecone/Weaviate

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        const mockContexts = [
            {
                source: 'brand_guidelines.pdf',
                text: 'Our brand voice is professional yet approachable. We value transparency and innovation.',
                score: 0.92
            },
            {
                source: 'website_about_us',
                text: 'Founded in 2024, ZYNK aims to revolutionize AI agent orchestration.',
                score: 0.88
            }
        ];

        if (mode === 'full') {
            // Return more detailed or raw chunks
            return mockContexts;
        } else {
            // Light mode: maybe just the top result or summarized
            return [mockContexts[0]];
        }
    };

    /**
     * Enrich the system prompt with Brand Brain context
     * @param {string} systemPrompt - Original system prompt
     * @param {Array} brandContexts - Array of context objects from queryBrandBrain
     * @returns {string} Enriched system prompt
     */
    window.enrichSystemPromptWithBrandContext = function (systemPrompt, brandContexts) {
        if (!brandContexts || brandContexts.length === 0) {
            return systemPrompt;
        }

        const contextString = brandContexts.map(c => `- ${c.text} (Source: ${c.source})`).join('\n');

        return `${systemPrompt}\n\n### Brand Context (from Brand Brain)\nUse the following context to align with the brand's voice and knowledge:\n${contextString}\n`;
    };

    console.log('[Brand Brain] Utility loaded');
})();
