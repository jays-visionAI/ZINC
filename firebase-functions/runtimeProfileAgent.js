/**
 * Runtime Profile Agent - Agent Architecture v5.0
 * 
 * AI-based dynamic LLM tier selection.
 * Analyzes task complexity and selects optimal tier from:
 * - 1_economy: Simple tasks (translations, formatting)
 * - 2_balanced: General content generation
 * - 3_standard: Analysis, research
 * - 4_premium: High-quality creative
 * - 5_ultra: Complex reasoning tasks
 */

// Tier Definitions with Complexity Scores
const TIER_DEFINITIONS = {
    '1_economy': {
        name: 'ECONOMY',
        maxComplexity: 2,
        description: 'Simple translations, formatting, basic queries',
        creditMultiplier: 0.2
    },
    '2_balanced': {
        name: 'BALANCED',
        maxComplexity: 4,
        description: 'General content generation, summaries',
        creditMultiplier: 1.0
    },
    '3_standard': {
        name: 'STANDARD',
        maxComplexity: 6,
        description: 'Analysis, research, structured content',
        creditMultiplier: 2.0
    },
    '4_premium': {
        name: 'PREMIUM',
        maxComplexity: 8,
        description: 'High-quality creative, nuanced writing',
        creditMultiplier: 3.0
    },
    '5_ultra': {
        name: 'ULTRA',
        maxComplexity: 10,
        description: 'Complex reasoning, multi-step analysis',
        creditMultiplier: 5.0
    }
};

// Task Type to Tier Mapping (Heuristics)
const TASK_TYPE_HINTS = {
    // Research tasks
    'research': '3_standard',
    'seo_watcher': '2_balanced',

    // Planning tasks
    'planner': '3_standard',

    // Creation tasks
    'creator_text': '3_standard',
    'creator_image': '2_balanced',
    'creator_video': '2_balanced',

    // Validation tasks
    'compliance': '4_premium',  // Needs precision
    'evaluator': '3_standard',

    // Publishing tasks
    'publisher': '2_balanced',
    'knowledge_curator': '2_balanced',

    // Management tasks
    'manager': '3_standard',
    'router': '1_economy'  // Simple routing decisions
};

// Quality Tier Override Mapping
const QUALITY_TIER_OVERRIDES = {
    'BOOST': '4_premium',
    'ULTRA': '5_ultra',
    'ECONOMY': '1_economy'
};

/**
 * Runtime Profile Agent Class
 * Analyzes task complexity and selects optimal tier
 */
class RuntimeProfileAgent {
    constructor(db, callLLM = null) {
        this.db = db;
        this.callLLM = callLLM;
        this.configCache = null;
        this.cacheTime = 0;
        this.CACHE_DURATION = 60000; // 1 minute cache
    }

    /**
     * Analyze task and determine optimal tier
     * @param {Object} options - Analysis options
     * @param {string} options.taskType - Agent type (e.g., 'research', 'creator_text')
     * @param {string} options.prompt - Task prompt/content
     * @param {string} options.qualityHint - User quality preference ('DEFAULT', 'BOOST', 'ULTRA')
     * @param {Object} options.context - Additional context (projectId, etc.)
     * @returns {Object} - {tier, reasoning, estimatedCost}
     */
    async analyze(options) {
        const {
            taskType,
            prompt = '',
            qualityHint = 'DEFAULT',
            context = {}
        } = options;

        console.log(`[RuntimeProfileAgent] Analyzing: taskType=${taskType}, qualityHint=${qualityHint}, promptLength=${prompt.length}`);

        // Step 1: Check for quality tier override
        if (qualityHint && QUALITY_TIER_OVERRIDES[qualityHint.toUpperCase()]) {
            const overrideTier = QUALITY_TIER_OVERRIDES[qualityHint.toUpperCase()];
            console.log(`[RuntimeProfileAgent] Quality override applied: ${overrideTier}`);
            return {
                tier: overrideTier,
                reasoning: `User requested ${qualityHint} quality`,
                method: 'quality_override',
                estimatedCreditMultiplier: TIER_DEFINITIONS[overrideTier].creditMultiplier
            };
        }

        // Step 2: Apply heuristics (fast path)
        const heuristicResult = this.applyHeuristics(taskType, prompt, context);
        if (heuristicResult.confidence >= 0.8) {
            console.log(`[RuntimeProfileAgent] Heuristics confident: ${heuristicResult.tier} (${heuristicResult.confidence})`);
            return {
                tier: heuristicResult.tier,
                reasoning: heuristicResult.reasoning,
                method: 'heuristics',
                confidence: heuristicResult.confidence,
                estimatedCreditMultiplier: TIER_DEFINITIONS[heuristicResult.tier].creditMultiplier
            };
        }

        // Step 3: LLM Analysis (if heuristics uncertain and LLM available)
        if (this.callLLM && heuristicResult.confidence < 0.5) {
            try {
                const llmResult = await this.analyzWithLLM(taskType, prompt, context);
                console.log(`[RuntimeProfileAgent] LLM analysis: ${llmResult.tier}`);
                return {
                    tier: llmResult.tier,
                    reasoning: llmResult.reasoning,
                    method: 'llm_analysis',
                    estimatedCreditMultiplier: TIER_DEFINITIONS[llmResult.tier].creditMultiplier
                };
            } catch (error) {
                console.warn('[RuntimeProfileAgent] LLM analysis failed, falling back to heuristics:', error.message);
            }
        }

        // Step 4: Fallback to heuristic result
        return {
            tier: heuristicResult.tier,
            reasoning: heuristicResult.reasoning,
            method: 'heuristics_fallback',
            confidence: heuristicResult.confidence,
            estimatedCreditMultiplier: TIER_DEFINITIONS[heuristicResult.tier].creditMultiplier
        };
    }

    /**
     * Apply heuristic rules for quick tier selection
     */
    applyHeuristics(taskType, prompt, context) {
        let tier = '3_standard'; // Default tier
        let confidence = 0.6;
        let reasons = [];

        // Rule 1: Task type hint
        if (TASK_TYPE_HINTS[taskType]) {
            tier = TASK_TYPE_HINTS[taskType];
            confidence = 0.7;
            reasons.push(`Task type '${taskType}' suggests ${TIER_DEFINITIONS[tier].name}`);
        }

        // Rule 2: Prompt length analysis
        const promptLength = prompt.length;
        if (promptLength < 100) {
            // Very short prompt - likely simple task
            if (tier !== '1_economy') {
                tier = Math.max(parseInt(tier[0]) - 1, 1) + tier.slice(1);
            }
            confidence = Math.min(confidence + 0.1, 0.9);
            reasons.push(`Short prompt (${promptLength} chars) suggests simpler task`);
        } else if (promptLength > 2000) {
            // Long prompt - likely complex task
            const currentLevel = parseInt(tier[0]);
            if (currentLevel < 4) {
                tier = (currentLevel + 1) + '_' + (currentLevel === 3 ? 'premium' : TIER_DEFINITIONS[`${currentLevel + 1}_${Object.keys(TIER_DEFINITIONS).find(k => k.startsWith(currentLevel + 1 + '_'))?.split('_')[1]}`]?.name.toLowerCase());
                // Fallback if tier name lookup fails
                if (!TIER_DEFINITIONS[tier]) {
                    tier = '4_premium';
                }
            }
            confidence = Math.min(confidence + 0.1, 0.9);
            reasons.push(`Long prompt (${promptLength} chars) suggests complex task`);
        }

        // Rule 3: Keyword analysis for complexity
        const complexityKeywords = ['analyze', 'compare', 'evaluate', 'strategy', 'comprehensive', 'detailed', 'in-depth'];
        const simpleKeywords = ['translate', 'format', 'list', 'summarize', 'brief'];

        const promptLower = prompt.toLowerCase();
        const complexKeywordCount = complexityKeywords.filter(kw => promptLower.includes(kw)).length;
        const simpleKeywordCount = simpleKeywords.filter(kw => promptLower.includes(kw)).length;

        if (complexKeywordCount > 2 && tier !== '5_ultra') {
            const currentLevel = parseInt(tier[0]);
            if (currentLevel < 5) {
                tier = this.getTierByLevel(Math.min(currentLevel + 1, 5));
            }
            confidence = Math.min(confidence + 0.15, 0.95);
            reasons.push(`Complex keywords detected (${complexKeywordCount})`);
        } else if (simpleKeywordCount > 2 && tier !== '1_economy') {
            const currentLevel = parseInt(tier[0]);
            if (currentLevel > 1) {
                tier = this.getTierByLevel(Math.max(currentLevel - 1, 1));
            }
            confidence = Math.min(confidence + 0.1, 0.9);
            reasons.push(`Simple keywords detected (${simpleKeywordCount})`);
        }

        return {
            tier,
            confidence,
            reasoning: reasons.join('; ') || 'Default selection'
        };
    }

    /**
     * Get tier ID by level number
     */
    getTierByLevel(level) {
        const tierMap = {
            1: '1_economy',
            2: '2_balanced',
            3: '3_standard',
            4: '4_premium',
            5: '5_ultra'
        };
        return tierMap[level] || '3_standard';
    }

    /**
     * Use LLM to analyze task complexity (for uncertain cases)
     */
    async analyzWithLLM(taskType, prompt, context) {
        const analysisPrompt = `Analyze the following task and determine its complexity level.

Task Type: ${taskType}
Task Content: ${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}

Complexity Levels:
1. ECONOMY: Simple translations, formatting, basic queries
2. BALANCED: General content generation, summaries
3. STANDARD: Analysis, research, structured content
4. PREMIUM: High-quality creative, nuanced writing
5. ULTRA: Complex reasoning, multi-step analysis

Respond with ONLY a JSON object:
{"level": 1-5, "reasoning": "brief explanation"}`;

        const messages = [
            { role: 'system', content: 'You are a task complexity analyzer. Respond only with JSON.' },
            { role: 'user', content: analysisPrompt }
        ];

        // Use a lightweight model for meta-analysis
        const result = await this.callLLM('google', 'gemini-2.0-flash-exp', messages, 0.1);

        try {
            const parsed = JSON.parse(result.content || result.text || '{}');
            const level = Math.max(1, Math.min(5, parseInt(parsed.level) || 3));
            return {
                tier: this.getTierByLevel(level),
                reasoning: parsed.reasoning || 'LLM analysis'
            };
        } catch (e) {
            console.warn('[RuntimeProfileAgent] Failed to parse LLM response:', e.message);
            return {
                tier: '3_standard',
                reasoning: 'LLM analysis fallback'
            };
        }
    }

    /**
     * Get tier configuration from Firestore
     */
    async getTierConfig(tierId) {
        if (!this.db) return TIER_DEFINITIONS[tierId] || TIER_DEFINITIONS['3_standard'];

        const now = Date.now();
        if (this.configCache && (now - this.cacheTime) < this.CACHE_DURATION) {
            return this.configCache[tierId] || TIER_DEFINITIONS[tierId];
        }

        try {
            const doc = await this.db.collection('systemSettings').doc('llmConfig').get();
            if (doc.exists) {
                const data = doc.data();
                const tiers = data?.defaultModels?.tiers || data?.defaultModels?.text?.tiers || {};
                this.configCache = tiers;
                this.cacheTime = now;
                return tiers[tierId] || TIER_DEFINITIONS[tierId];
            }
        } catch (error) {
            console.warn('[RuntimeProfileAgent] Failed to fetch tier config:', error.message);
        }

        return TIER_DEFINITIONS[tierId] || TIER_DEFINITIONS['3_standard'];
    }

    /**
     * Get all tier configurations
     */
    async getAllTierConfigs() {
        if (!this.db) return TIER_DEFINITIONS;

        try {
            const doc = await this.db.collection('systemSettings').doc('llmConfig').get();
            if (doc.exists) {
                const data = doc.data();
                return data?.defaultModels?.tiers || data?.defaultModels?.text?.tiers || TIER_DEFINITIONS;
            }
        } catch (error) {
            console.warn('[RuntimeProfileAgent] Failed to fetch all tier configs:', error.message);
        }

        return TIER_DEFINITIONS;
    }
}

module.exports = { RuntimeProfileAgent, TIER_DEFINITIONS, TASK_TYPE_HINTS };
