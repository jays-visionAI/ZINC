const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Pitch Deck Specialist Agent
 * Responsible for planning visual hierarchy, creating infographics, and coding the final HTML deck.
 */
async function createPitchDeck(inputs, context, plan, executeLLM) {
    const { pitchTitle, pitchPurpose, targetAudience, pitchOverview, slideCount, pitchStyle } = inputs;
    console.log('[Creator:PitchDeck] 🚀 Starting specialized pitch deck generation...');

    // 1. VISUAL PLANNING & INFOGRAPHIC DESIGN
    // We first ask the LLM to design the "Visual Strategy" before generating images.
    const visualPlanPrompt = `
    You are a World-Class Presentation Designer & Data Visualization Expert.
    
    PROJECT CONTEXT:
    - Title: ${pitchTitle}
    - Purpose: ${pitchPurpose}
    - Overview: ${pitchOverview}
    - Style: ${pitchStyle} (Modern, Tech, Premium)
    
    TASK:
    Design a robust visual strategy for a ${slideCount}-slide pitch deck.
    For each key slide, determine if a specific INFOGRAPHIC or DATA VISUALIZATION is needed to explain the concept better than text.
    
    Identify exactly 3-4 KEY VISUALS needed (e.g., "Market Growth Chart", "Architecture Diagram", "Competitive Quadrant").
    
    OUTPUT JSON FORMAT ONLY:
    {
        "visuals": [
            {
                "id": "visual_1",
                 "type": "chart/diagram/photo",
                 "slide_context": "Slide 3: Market Opportunity",
                 "image_prompt": "A minimalist 3D bar chart showing exponential growth from 2023 to 2030, glowing purple bars on dark background, text labels '2M', '50M', '500M'. High-tech aesthetic."
            },
            ...
        ]
    }
    `;

    console.log('[Creator:PitchDeck] 🧠 Planning visuals...');
    let visualPlan = { visuals: [] };

    try {
        // Fast inference for planning
        const planResult = await executeLLM(
            "You are a JSON-speaking Design Director.",
            visualPlanPrompt
        );
        // Clean JSON
        const jsonMatch = planResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            visualPlan = JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.warn('[Creator:PitchDeck] Visual planning failed, falling back to heuristics:', e);
        // Fallback visuals
        visualPlan.visuals = [
            { id: "cover", image_prompt: `High-end abstract background for pitch deck titled ${pitchTitle}, ${pitchStyle} style, cinematic lighting.` },
            { id: "visual_1", image_prompt: `Futuristic data visualization representing market growth, ${pitchStyle} style.` }
        ];
    }

    // 2. GENERATE ASSETS (Parallel)
    console.log(`[Creator:PitchDeck] 🎨 Generating ${visualPlan.visuals.length} infographics/images via Vertex AI (Imagen 4)...`);

    const assetPromises = visualPlan.visuals.map(async (visual) => {
        try {
            // Force "Infographic style" keywords if it looks like a chart
            let prompt = visual.image_prompt;
            if (visual.type === 'chart' || visual.type === 'diagram') {
                prompt = `Professional Infographic: ${prompt}. Clean vector style, ${pitchStyle} color palette, white background or dark mode depending on style, high resolution via Imagen 4.`;
            }

            const imageUrl = await generateWithVertexAI(prompt, 'imagen-4.0-generate-001'); // Use latest model
            return { ...visual, url: imageUrl };
        } catch (err) {
            console.warn(`[Creator:PitchDeck] Failed to generate ${visual.id}:`, err.message);
            return { ...visual, url: null }; // handled in HTML generation
        }
    });

    const generatedAssets = await Promise.all(assetPromises);
    const validAssets = generatedAssets.filter(a => a.url);

    // 3. FINAL HTML ASSEMBLY
    // Now we give the LLM the assets and ask it to build the deck.
    const assetMap = validAssets.map(a => `- Use ${a.url} for ${a.slide_context || a.id}`).join('\n');

    const systemPrompt = `
    You are an Expert Frontend Developer & UI Designer.
    Your task is to write a single HTML file containing a full Pitch Deck presentation using Tailwind CSS.
    
    DESIGN SYSTEM:
    - Use 'Inter' font.
    - Style: ${pitchStyle} (Dark Mode preferred for Tech).
    - Use gradients, glassmorphism, and subtle animations.
    - Each slide must be a <section> with class "min-h-screen flex flex-col...".
    
    ASSET USAGE (CRITICAL):
    You have generated the following custom visuals. You MUST embed them using <img> tags or background-image styles where appropriate.
    ${assetMap}
    
    If an asset is missing for a slide, use a beautiful CSS gradient or a reliable unsplash placeholder (source.unsplash.com/random?tech).
    `;

    const taskPrompt = `
    Create a ${slideCount}-slide Pitch Deck for:
    Title: ${pitchTitle}
    Overview: ${pitchOverview}
    
    Include:
    1. Cover Slide
    2. Problem
    3. Solution
    4. Market (Use Visual 1 if avail)
    5. Product (Use Visual 2 if avail)
    6. Business Model
    7. Team
    8. Ask
    
    The output must be pure HTML code only. No markdown fences.
    ADD "zynk-watermark" class div at the bottom right.
    `;

    console.log('[Creator:PitchDeck] 🏗️ Assembling HTML...');
    const htmlResult = await executeLLM(systemPrompt, taskPrompt);

    return htmlResult;
}

module.exports = { createPitchDeck };
