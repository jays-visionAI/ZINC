const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent
 * Handles visual planning, asset generation, and HTML assembly for various content types.
 * Supported Types: 'pitch_deck', 'product_brochure', 'one_pager'
 */
async function createCreativeContent(inputs, context, plan, executeLLM, type) {
    const { topic, style = 'Modern', audience, slideCount = 5 } = inputs;
    console.log(`[UniversalCreator] 🚀 Starting generation for type: ${type} (${style})...`);

    // === STRATEGY PATTERN: Define prompts based on type ===
    let strategy = {
        role: "Creative Director",
        visualTask: "Identify key visuals.",
        htmlTask: "Create a webpage.",
        visualIds: [{ id: "GENERIC_VISUAL_1", desc: "General concept image" }, { id: "GENERIC_VISUAL_2", desc: "Abstract background" }] // Default fallback
    };

    if (type === 'pitch_deck') {
        strategy = {
            role: "Presentation Designer",
            visualTask: `Identify 3 - 4 KEY visuals for a ${slideCount} - slide deck(e.g., Cover, Graph, Product).`,
            htmlTask: `Create a ${slideCount} -slide Pitch Deck.Use full - screen sections(<section class="h-screen snap-center...">).`,
            visualIds: [{ id: "COVER_IMAGE", desc: "Title slide background" }, { id: "VISUAL_1", desc: "Data chart" }, { id: "VISUAL_2", desc: "Product/Concept" }]
        };
    } else if (type === 'product_brochure') {
        strategy = {
            role: "Marketing Designer",
            visualTask: "Identify 3 KEY visuals: 1. Hero Product Shot, 2. Feature Close-up, 3. Lifestyle/Usage Shot.",
            htmlTask: "Create a modern Product Brochure. Use a hero header, grid feature section, spec table, and footer.",
            visualIds: [{ id: "HERO_IMAGE", desc: "Main product shot" }, { id: "FEATURE_1", desc: "Feature detail" }, { id: "LIFESTYLE_SHOT", desc: "Usage context" }]
        };
    } else if (type === 'one_pager') {
        strategy = {
            role: "Corporate Communication Expert",
            visualTask: "Identify 2 visuals: 1. Header Abstract/Photo, 2. Process Diagram or Infographic.",
            htmlTask: "Create a professional Executive One-Pager (A4 style layout). Dense information, clear hierarchy, sidebars.",
            visualIds: [{ id: "HEADER_BG", desc: "Header background" }, { id: "INFOGRAPHIC_1", desc: "Process/Stats diagram" }]
        };
    }

    // 1. VISUAL PLANNING
    const visualPlanPrompt = `
    You are a ${strategy.role}.
    Project Topic: ${topic}
    Style: ${style}

    KNOWLEDGE BASE / CONTEXT:
    """
    ${context || 'No specific context.'}
    """

    Task: ${strategy.visualTask}

    Return JSON only:
    {
        "visuals": [
    {"id": "${strategy.visualIds[0].id}", "prompt": "Detailed description for Vertex AI..." },
    // ... more visuals based on task
    ]
    }`;

    let visualPlan = { visuals: [] };
    try {
        const planResult = await executeLLM("You are a JSON-speaking Design Director.", visualPlanPrompt);
        const jsonMatch = planResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) visualPlan = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.warn('[UniversalCreator] Planning failed, using default plan.');
        // Fallback using preset IDs from strategy
        visualPlan.visuals = strategy.visualIds.map(v => ({
            id: v.id,
            prompt: `High quality ${v.desc} for ${topic}, ${style} style.`
        }));
    }

    // 2. GENERATE ASSETS
    console.log(`[UniversalCreator] 🎨 Generating ${visualPlan.visuals.length} assets...`);
    const assetMap = {};

    await Promise.all(visualPlan.visuals.map(async (visual) => {
        try {
            const prompt = `${visual.prompt}, ${style} style, professional, 4k, clean, high resolution`;
            const imageUrl = await generateWithVertexAI(prompt, 'imagen-4.0-generate-001');
            assetMap[visual.id] = imageUrl;
        } catch (err) {
            console.warn(`[UniversalCreator] Image gen failed for ${visual.id}, using fallback.`);
            const keyword = encodeURIComponent(topic.split(' ')[0] || 'business');
            assetMap[visual.id] = `https://source.unsplash.com/1600x900/?${keyword},tech&sig=${Math.random()}`;
        }
    }));

    // 3. HTML ASSEMBLY
    const assetInstructions = visualPlan.visuals.map(v => `- For ${v.id}: use exactly "{{${v.id}}}"`).join('\n');

    const systemPrompt = `
    You are an Expert Frontend Developer & UI Designer specializing in premium, modern web design.
    
    CRITICAL REQUIREMENTS:
    1. Start with <!DOCTYPE html> and include Tailwind CSS CDN in <head>:
       <script src="https://cdn.tailwindcss.com"></script>
       <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    2. DARK MODE DESIGN (MANDATORY):
       - Body: bg-slate-900 text-white
       - Cards: bg-slate-800/50 backdrop-blur border border-slate-700
       - Headings: text-white, text-2xl/3xl font-bold
       - Text: text-slate-300
       - Accents: Use gradient (from-indigo-500 to-purple-600) for buttons/highlights
    
    3. LAYOUT:
       - Use 'Inter' font-family for all text
       - Add generous padding (p-8, p-12)
       - Use modern shadows (shadow-xl, shadow-2xl)
       - Sections: Add gradient overlays, rounded corners (rounded-2xl)
    
    4. HERO HEADER (MANDATORY):
       - Full-width header with background image using {{${strategy.visualIds[0].id}}}
       - Use: style="background-image: url('{{${strategy.visualIds[0].id}}}')"
       - Add dark overlay: bg-black/50 or bg-gradient-to-b from-black/70
       - Large title with text-4xl or text-5xl font-bold
    
    5. IMAGE USAGE (CRITICAL):
    ${assetInstructions}
       - You MUST use at least one image token as background-image in the header.
       - NEVER invent URLs like via.placeholder.com or picsum.photos. ONLY use the tokens above.
    
    6. OUTPUT: Pure HTML only. No markdown fences. No explanations.
    `;

    const taskPrompt = `
    ${strategy.htmlTask}

    Topic: ${topic}
    Audience: ${audience}

    CORE CONTENT (Use this Source Material):
    """
    ${context || 'No context provided.'}
    """

    DESIGN REQUIREMENTS:
    - Create a visually STUNNING, premium design that would impress executives
    - Use the dark mode color scheme (bg-slate-900 base)
    - Add subtle gradient accents (indigo/purple/blue)
    - Include smooth hover effects on interactive elements
    - Use cards with glass-morphism effect (bg-white/10 backdrop-blur)
    - Add icons from Font Awesome or Heroicons where appropriate
    - Include a professional footer with the zynk-watermark class
    
    MANDATORY: Use {{${strategy.visualIds[0].id}}} as background-image in the hero/header section.
    `;

    console.log('[UniversalCreator] 🏗️ Assembling HTML...');
    let htmlResult = await executeLLM(systemPrompt, taskPrompt);

    // Clean Markdown
    htmlResult = htmlResult.replace(/```html/g, '').replace(/```/g, '').trim();

    // 4. TOKEN REPLACEMENT
    console.log('[UniversalCreator] 🔗 Injecting asset URLs...');
    Object.keys(assetMap).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlResult = htmlResult.replace(regex, assetMap[key]);
        // Also try with spaces (LLM sometimes adds spaces)
        const regexWithSpaces = new RegExp(`{{ ${key} }}`, 'g');
        htmlResult = htmlResult.replace(regexWithSpaces, assetMap[key]);
    });

    // 5. FALLBACK CLEANUP: Replace any remaining placeholder URLs LLM invented
    console.log('[UniversalCreator] 🧹 Cleaning up stray placeholder URLs...');
    const placeholderPatterns = [
        /https?:\/\/via\.placeholder\.com[^\s"')]+/g,
        /https?:\/\/picsum\.photos[^\s"')]+/g,
        /https?:\/\/placehold\.[^\s"')]+/g,
        /https?:\/\/placeholder\.[^\s"')]+/g,
        /{{[A-Z_0-9]+}}/g // Any remaining unreplaced tokens
    ];

    const fallbackKeyword = encodeURIComponent(topic.split(' ')[0] || 'technology');
    placeholderPatterns.forEach(pattern => {
        htmlResult = htmlResult.replace(pattern, `https://source.unsplash.com/1600x900/?${fallbackKeyword},business&sig=${Math.random()}`);
    });

    // 6. AGGRESSIVE IMAGE REPAIR: Fix broken/empty img src attributes
    console.log('[UniversalCreator] 🔧 Repairing broken images...');
    // Match img tags with empty src, relative paths, or no http
    htmlResult = htmlResult.replace(/<img([^>]*)src=["'](?!http|data:)([^"']*)["']([^>]*)>/gi, (match, before, src, after) => {
        const randomImg = `https://source.unsplash.com/800x600/?${fallbackKeyword},abstract&sig=${Math.random()}`;
        return `<img${before}src="${randomImg}"${after}>`;
    });
    // Also fix img tags with completely empty src
    htmlResult = htmlResult.replace(/<img([^>]*)src=["']["']([^>]*)>/gi, (match, before, after) => {
        const randomImg = `https://source.unsplash.com/800x600/?${fallbackKeyword},tech&sig=${Math.random()}`;
        return `<img${before}src="${randomImg}"${after}>`;
    });

    // 7. FORCE TAILWIND CSS: Inject CDN if not present
    if (!htmlResult.includes('tailwindcss.com') && !htmlResult.includes('tailwind.css')) {
        console.log('[UniversalCreator] 💉 Injecting Tailwind CSS CDN...');
        const tailwindCDN = `<script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: white; }</style>`;

        if (htmlResult.includes('</head>')) {
            htmlResult = htmlResult.replace('</head>', `${tailwindCDN}</head>`);
        } else if (htmlResult.includes('<body')) {
            htmlResult = htmlResult.replace('<body', `<head>${tailwindCDN}</head><body`);
        } else {
            htmlResult = `<!DOCTYPE html><html><head>${tailwindCDN}</head><body class="bg-slate-900 text-white p-8">${htmlResult}</body></html>`;
        }
    }

    console.log('[UniversalCreator] ✅ HTML generation complete.');
    return htmlResult;
}

module.exports = { createCreativeContent };
