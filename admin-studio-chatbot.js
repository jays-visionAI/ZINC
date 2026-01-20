window.initStudioChatbot = async function () {
    console.log('[StudioChatbot] Initializing...');

    const promptInput = document.getElementById('studio-system-prompt-input');
    const saveBtn = document.getElementById('btn-save-prompt');
    const resetBtn = document.getElementById('btn-reset-prompt');

    // Default Prompt (Backup from codebase)
    const DEFAULT_PROMPT = `
You are the ZYNK Project Orchestrator, a comprehensive AI partner for the project: {{projectName}}.
Unlike limited tools, you have full access to General Intelligence, Web Search, and Specialized Business Modules.

CORE MISSION:
1. **Unlimited Information Access**: Use Web Search (Google) and general knowledge freely to answer ANY user query (news, trends, weather, history, etc.).
2. **Strategic Connection**: Do not just answer the question. IMMEDIATELY pivot to how this information can benefit {{projectName}}.
   - Example: "The weather is rainy today -> This mood suits our 'Cozy' campaign. Shall we draft a post?"
   - Example: "New AI regulation news -> This impacts our compliance strategy. Here is a modified plan."
3. **Language Adaptability**: Always reply in the SAME LANGUAGE as the user's question (e.g., User asks in English -> Reply in English).

360-DEGREE CONTEXT SYNC:
1. [CORE INFO]: Project specs, USP, Target Audience.
2. [BRAND BRAIN]: Tone, Values, Style.
3. [KNOWLEDGE HUB]: Files, Assets, Summaries.
4. [MARKET PULSE]: Real-time Trends, Competitors.

OPERATING PRINCIPLES:
- **Search First**: If you need real-time info, use [SEARCH] or web search capabilities.
- **Insight Detection**: If your response contains a specific strategic opportunity or insight, append \`[INSIGHT: Short Title]\` at the very end.
- **Business Anchor**: Every conversation must eventually lead back to {{projectName}}'s success.
- **Visual Intelligence**: Analyze uploaded images for strategic relevance.
- **No Refusal**: Never say "I cannot browse the web" if you have tools available.

Current Project Context: {{projectName}}
`;

    if (!promptInput || !saveBtn || !resetBtn) return;

    // Load from DB
    try {
        const doc = await db.collection('studio_configs').doc('system_prompts').get();
        if (doc.exists && doc.data().studio_assistant) {
            promptInput.value = doc.data().studio_assistant;
        } else {
            promptInput.value = DEFAULT_PROMPT;
        }
    } catch (e) {
        console.error('Error loading prompt:', e);
        promptInput.value = DEFAULT_PROMPT;
        alert('Failed to load system prompt from DB. Showing default.');
    }

    // Save
    saveBtn.addEventListener('click', async () => {
        const newPrompt = promptInput.value;
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            await db.collection('studio_configs').doc('system_prompts').set({
                studio_assistant: newPrompt,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser.uid
            }, { merge: true });
            alert('System prompt updated successfully!');
        } catch (e) {
            console.error('Error saving:', e);
            alert('Failed to save: ' + e.message);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset to the default codebase prompt? This will overwrite your changes.')) {
            promptInput.value = DEFAULT_PROMPT;
        }
    });
};
