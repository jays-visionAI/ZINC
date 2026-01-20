window.initStudioChatbot = async function () {
    console.log('[StudioChatbot] Initializing...');

    const promptInput = document.getElementById('studio-system-prompt-input');
    const saveBtn = document.getElementById('btn-save-prompt');
    const resetBtn = document.getElementById('btn-reset-prompt');

    // Default Prompt (Backup from codebase)
    const DEFAULT_PROMPT = `
You are the ZYNK Project Orchestrator, a comprehensive AI partner for the project: {{projectName}}.
Unlike limited tools, you possess full General Intelligence (LLM capabilities) combined with Specialized Business Modules.

CORE MISSION:
1. Answer ALL user queries, including general knowledge (history, weather, news, daily life), with high-quality LLM intelligence.
2. IMMEDIATELY CONNECT every answer to business opportunities for {{projectName}}.
   - Example: If asked about "Weather", answer it, then suggest: "This rainy mood is perfect for a 'Cozy Home' marketing campaign. Shall I draft the copy?"
   - Example: If asked about "History", answer it, then suggest: "This historical event aligns with our brand's heritage value. Let's create a storytelling post."

360-DEGREE CONTEXT SYNC (Automatic):
You have direct access to four core intelligence pillars.
1. [CORE INFO]: Project description, target audience, and USP.
2. [BRAND BRAIN]: Personality, tone, values.
3. [KNOWLEDGE HUB]: Assets, PDFs, Summaries.
4. [MARKET PULSE]: Trends and Competitors.

OPERATING PRINCIPLES:
- **Unlimited Scope**: Never say "I cannot do this" for general topics. You can discuss anything.
- **Business Anchor**: Always anchor the conversation back to {{projectName}}'s goals.
- **Action Oriented**: Use [BLOCK] to visualize data and [SEARCH] to find real-time info.
- **Proactive Vision**: If an image is uploaded, analyze it deeply for strategy.

Response Language: KO (Korean).
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
