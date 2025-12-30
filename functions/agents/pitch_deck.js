```javascript
const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Pitch Deck Specialist Agent (v2 - Robust Token Replacement)
 */
async function createPitchDeck(inputs, context, plan, executeLLM) {
    const { pitchTitle, pitchPurpose, targetAudience, pitchOverview, slideCount, pitchStyle } = inputs;
    console.log('[Creator:PitchDeck] 🚀 Starting specialized pitch deck generation (v2)...');

    // 1. VISUAL PLANNING (Define what we need)
    const visualPlanPrompt = `
    You are a Creative Director planning a pitch deck.
    Project: ${ pitchTitle } (${ pitchStyle } style)

Task: Identify 3 - 4 KEY visuals needed for this deck(e.g., Cover, Graph, Product Shot).
    Return JSON only:
{
    "visuals": [
        { "id": "COVER_IMAGE", "prompt": "Minimalist corporate cover..." },
        { "id": "VISUAL_1", "prompt": "Bar chart showing growth..." },
        { "id": "VISUAL_2", "prompt": "Network diagram..." }
    ]
} `;

    let visualPlan = { visuals: [] };
    try {
        const planResult = await executeLLM("You are a JSON-speaking Design Director.", visualPlanPrompt);
        const jsonMatch = planResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) visualPlan = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.warn('[Creator:PitchDeck] Planning failed, using default plan.');
        visualPlan.visuals = [
            { id: "COVER_IMAGE", prompt: `High quality cover for ${ pitchTitle }, ${ pitchStyle }` },
            { id: "VISUAL_1", prompt: `Business concept visualization, ${ pitchStyle } ` },
            { id: "VISUAL_2", prompt: `Technology background abstract, ${ pitchStyle } ` }
        ];
    }

    // 2. GENERATE ASSETS (Parallel with Fallback)
    console.log(`[Creator:PitchDeck] 🎨 Generating ${ visualPlan.visuals.length } assets...`);
    const assetMap = {};
    
    await Promise.all(visualPlan.visuals.map(async (visual) => {
        try {
            // Try Vertex AI (Imagen 4/3)
            const imageUrl = await generateWithVertexAI(visual.prompt + `, ${ pitchStyle } style, high resolution, 4k, clean`, 'imagen-4.0-generate-001');
            assetMap[visual.id] = imageUrl;
        } catch (err) {
            console.warn(`[Creator:PitchDeck] Image gen failed for ${ visual.id }, using fallback.`);
            // Fallback: Unsplash with relevant keywords
            const keyword = encodeURIComponent(pitchTitle.split(' ')[0] || 'business');
            assetMap[visual.id] = `https://source.unsplash.com/1600x900/?${keyword},tech,abstract&sig=${Math.random()}`;
        }
    }));

// 3. HTML ASSEMBLY (With Placeholders)
// We tell LLM to use {{ID}} instead of URLs. This prevents syntax errors.
const assetInstructions = visualPlan.visuals.map(v => `- For ${v.id}, use strictly: "{{${v.id}}}"`).join('\n');

const systemPrompt = `
    You are a Senior Frontend Developer & UI Designer.
    Write a single HTML file for a Pitch Deck using Tailwind CSS.
    
    DESIGN RULES:
    - Use 'Inter' font.
    - Theme: ${pitchStyle} (Prefer Dark Mode / Glassmorphism).
    - Layout: Full-screen slides (<section class="h-screen snap-center...">).
    - Typography: Large, bold headings. Minimal text.
    - Color Palette: Use slate-900 for bg, violet-500/emerald-500 for accents.
    
    IMAGE RULES:
    - Do NOT invent image URLs.
    - Use EXACT placeholders provided below for 'src' attributes or 'background-image'.
    ${assetInstructions}
    - If you need an image not listed, use a colored gradient div.
    
    Output pure HTML only. No markdown.
    `;

const taskPrompt = `
    Create a ${slideCount}-slide Pitch Deck for: "${pitchTitle}"
    Overview: ${pitchOverview}
    
    Slides:
    1. Cover (Use {{COVER_IMAGE}} as fullscreen background)
    2. Problem
    3. Solution (Use {{VISUAL_1}} if relevant)
    4. Market
    5. Product (Use {{VISUAL_2}} if relevant)
    6. Business Model
    7. Team
    8. Contact
    
    Ensure the layout is stunning and modern.
    `;

console.log('[Creator:PitchDeck] 🏗️ Assembling HTML...');
let htmlResult = await executeLLM(systemPrompt, taskPrompt);

// Clean Markdown
htmlResult = htmlResult.replace(/```html/g, '').replace(/```/g, '').trim();

// 4. TOKEN REPLACEMENT (The Magic Fix)
// Replace all placeholders with actual generated URLs
console.log('[Creator:PitchDeck] 🔗 Injecting asset URLs...');
Object.keys(assetMap).forEach(key => {
    const url = assetMap[key];
    // Replace {{KEY}}
    const regex = new RegExp(`{{${key}}}`, 'g');
    htmlResult = htmlResult.replace(regex, url);
});

return htmlResult;
}

module.exports = { createPitchDeck };
```
