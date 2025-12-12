/**
 * ZYNK Core: The Arena
 * Implements the Adversarial Loop (Generate -> Critique -> Synthesize)
 */

const PERSONA_PROMPTS = {
    disruptor: `You are 'The Disruptor'. Your goal is to maximize attention, viral potential, and trend alignment. 
    You ignore safety and tradition. You want to shock, provoke, and capture the market's Fear/Greed. 
    Use punchy, short sentences. Focus on high-risk, high-reward angles.`,

    purist: `You are 'The Purist'. Your goal is to strictly adhere to the Brand Guidelines and maintain absolute trust. 
    You ignore trends if they are risky. You value consistency, professional tone, and long-term brand equity. 
    Reject anything that sounds like clickbait.`,

    critic: `You are 'The Critic'. You are a devil's advocate. Your job is NOT to write, but to destroy arguments. 
    Find logical fallacies, potential PR risks, and boring execution. Be harsh but constructive.`,

    judge: `You are 'The Judge'. Your goal is to synthesize the best possible content from the debate. 
    Balance the attention-grabbing hooks of the Disruptor with the safety of the Purist. 
    Your final output must be polished, coherent, and ready for publication.`
};

class AdversarialLoop {
    /**
     * @param {function} executeLLM - Function(messages, config) returning Promise<string>
     */
    constructor(executeLLM) {
        this.executeLLM = executeLLM;
    }

    /**
     * Run the debate loop
     * @param {string} userRequest 
     * @param {string} contextData 
     * @param {object} config - { rounds: 1, models: {} }
     */
    async run(userRequest, contextData, config) {
        console.log('[TheArena] Starting Adversarial Loop...');
        const { rounds = 1, models } = config; // Models config from Router

        // 1. Parallel Generation (The Extremes)
        console.log('[TheArena] Round 1: Generating Extremes');

        const [disruptorDraft, puristDraft] = await Promise.all([
            this._agentAct('disruptor', userRequest, contextData, models.pro),
            this._agentAct('purist', userRequest, contextData, models.balanced)
        ]);

        let discussionHistory = `
        User Request: ${userRequest}
        Context: ${contextData}
        
        [Disruptor Draft]: ${disruptorDraft}
        [Purist Draft]: ${puristDraft}
        `;

        // 2. Critique Round (If rounds > 1)
        if (rounds > 1) {
            console.log('[TheArena] Round 2: Critique');
            const critique = await this._agentAct('critic',
                "Critique both drafts. Point out risks in Disruptor and boredom in Purist.",
                discussionHistory,
                models.pro
            );
            discussionHistory += `\n[Critic's Analysis]: ${critique}`;
        }

        // 3. Synthesis (The Judge)
        console.log('[TheArena] Round 3: Synthesis');
        const finalOutput = await this._agentAct('judge',
            "Synthesize the Final Cut. Combine Disruptor's hook with Purist's safety.",
            discussionHistory,
            models.pro
        );

        return {
            finalOutput,
            logs: discussionHistory,
            agents: {
                disruptor: disruptorDraft,
                purist: puristDraft
            }
        };
    }

    async _agentAct(personaKey, task, context, modelConfig) {
        const systemPrompt = PERSONA_PROMPTS[personaKey];
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context:\n${context}\n\nTask:\n${task}` }
        ];

        try {
            return await this.executeLLM(messages, modelConfig);
        } catch (error) {
            console.error(`[TheArena] Agent ${personaKey} failed:`, error);
            return `[Error generating ${personaKey} output]`;
        }
    }
}

module.exports = { AdversarialLoop, PERSONA_PROMPTS };
