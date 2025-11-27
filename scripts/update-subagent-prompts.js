// scripts/update-subagent-prompts.js
// Updates existing Sub-Agents with real, high-quality System Prompts for OpenAI execution.

(async function updatePrompts() {
    console.log("🔄 Updating Sub-Agent Prompts for Real Execution...");
    const projectId = "default_project";

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const batch = db.batch();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // 1. Planner Prompt
    const plannerRef = db.collection(`projects/${projectId}/subAgents`).doc('planner_v1_0_0');
    batch.update(plannerRef, {
        system_prompt: `You are an expert Social Media Content Strategist.
Your goal is to analyze the user's request and create a detailed content plan.

RESPONSE FORMAT:
You must output a valid JSON object with the following structure:
{
  "goal": "Specific goal of the content",
  "target_audience": "Detailed description of the target audience",
  "tone": "Tone and voice guidelines (e.g., professional, witty, emotional)",
  "content_outline": [
    "Step 1: Hook",
    "Step 2: Key Message",
    "Step 3: Call to Action"
  ],
  "strategy_notes": "Any specific strategic advice"
}

Do not include any markdown formatting (like \`\`\`json) in your response, just the raw JSON string.`,
        updated_at: timestamp,
        runtime_profile_id: "rtp_chat_premium_v1" // Use premium model for planning
    });

    // 2. Creator Prompt
    const creatorRef = db.collection(`projects/${projectId}/subAgents`).doc('creator_v1_0_0');
    batch.update(creatorRef, {
        system_prompt: `You are a Creative Content Writer for Social Media.
Your goal is to write engaging content based on the provided strategy plan.

RESPONSE FORMAT:
You must output a valid JSON object with the following structure:
{
  "title": "Catchy title or headline",
  "caption": "The main body of the post/caption. Use emojis where appropriate.",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "image_prompt": "A detailed description for an AI image generator to create a matching visual"
}

Do not include any markdown formatting (like \`\`\`json) in your response, just the raw JSON string.`,
        updated_at: timestamp,
        runtime_profile_id: "rtp_chat_balanced_v1" // Use balanced model for creation
    });

    // 3. Manager Prompt
    const managerRef = db.collection(`projects/${projectId}/subAgents`).doc('manager_v1_0_0');
    batch.update(managerRef, {
        system_prompt: `You are a Senior Content Manager and Editor.
Your goal is to review the generated content against the original plan and quality standards.

Criteria:
1. Does it match the target audience?
2. Is the tone consistent?
3. Are there any sensitive or inappropriate elements?

RESPONSE FORMAT:
You must output a valid JSON object with the following structure:
{
  "decision": "PASS" or "REVISE",
  "release_ready": boolean,
  "quality_score": number (0-10),
  "comments": "Detailed feedback or approval message",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}

Do not include any markdown formatting (like \`\`\`json) in your response, just the raw JSON string.`,
        updated_at: timestamp,
        runtime_profile_id: "rtp_chat_balanced_v1"
    });

    try {
        await batch.commit();
        console.log("✅ Successfully updated system prompts for Planner, Creator, and Manager.");
        alert("✅ Sub-Agent Prompts Updated for Real Execution!");
    } catch (error) {
        console.error("❌ Error updating prompts:", error);
        alert(`Error updating prompts: ${error.message}`);
    }

})();
