const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * ZYNK Core: Cognitive Router
 * Handles Model Agnosticism and Strategy Planning
 */

class CognitiveRouter {
    constructor() {
        // Default configurations for different tiers
        this.models = {
            eco: {
                provider: 'openai',
                model: 'gpt-4o-mini', // Fast, cheap
                temperature: 0.7
            },
            balanced: {
                provider: 'openai',
                model: 'gpt-4o', // Standard high quality
                temperature: 0.7
            },
            pro: {
                provider: 'openai',
                model: 'gpt-4o', // High quality (could be o1-preview in future)
                temperature: 0.9 // Higher creativity for Pro
            }
        };
    }

    /**
     * Select the best model based on the plan
     * @param {string} mode - 'eco', 'balanced', 'pro'
     * @returns {object} Model configuration
     */
    route(mode = 'balanced') {
        const selectedMode = this.models[mode] ? mode : 'balanced';
        console.log(`[CognitiveRouter] Routing request to [${selectedMode}] tier.`);
        return this.models[selectedMode];
    }
}

class StrategyPlanner {
    constructor() {
        // We no longer need an internal router since we use the global LLMRouter
    }

    /**
     * Plan the execution strategy based on request complexity and user mode
     * @param {object} requestData 
     * @returns {object} Execution Plan
     */
    plan(requestData) {
        const { mode, taskType } = requestData;

        // 1. Determine Performance Mode (User Override or Default)
        let performanceMode = (mode || 'balanced').toLowerCase();

        // 2. Identify Complexity
        const isComplexTask = this.isStrategicTask(taskType);

        // 3. Construct Workflow
        // If Eco mode, force simple path even for complex tasks
        if (performanceMode === 'eco') {
            return {
                mode: 'eco',
                qualityTier: 'ECONOMY',
                useArena: false, // Skip debate
                steps: ['generate']
            };
        }

        // If Pro mode or Complex Task -> Use Arena
        if (performanceMode === 'pro' || (performanceMode === 'balanced' && isComplexTask)) {
            return {
                mode: 'pro',
                qualityTier: 'BOOST',
                useArena: true, // Enable debate loop
                rounds: performanceMode === 'pro' ? 3 : 1, // Pro gets more rounds
                steps: ['context', 'debate', 'synthesis']
            };
        }

        // Default Balanced Simple
        return {
            mode: 'balanced',
            qualityTier: 'BALANCED',
            useArena: false,
            steps: ['generate']
        };
    }

    isStrategicTask(taskType) {
        // Strategic tasks benefit from The Arena
        const strategicTypes = [
            'campaign_brief', 'brand_positioning', 'competitor_analysis',
            'crisis_response', 'pitch_deck', 'press_release', 'one_pager',
            'promo_images', 'product_brochure'
        ];
        return strategicTypes.includes(taskType);
    }
}

module.exports = {
    CognitiveRouter: new CognitiveRouter(),
    StrategyPlanner: new StrategyPlanner()
};
