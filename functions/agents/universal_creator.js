const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent (V4 - Robust Synthesis)
 * Handles visual planning, asset generation, and HTML assembly for various content types.
 * Optimized for Premium quality without hitting Firestore limits.
 */
async function createCreativeContent(inputs, context, plan, executeLLM, type, advancedOptions = {}) {
    const {
        topic,
        style = 'Modern',
        audience = 'General Business',
        slideCount = 5,
        newsType,
        executivePhotoUrl,
        imageCount: inputsImageCount
    } = inputs;

    const slideCountNum = parseInt(slideCount) || 5;
    const normalizedType = String(type || '').toLowerCase().trim();

    // Context processing
    const knowledgeBase = context || 'No specific context provided.';

    // Extract advanced customization options
    const {
        imageStyle: advImageStyle,
        colorTone = 'Vibrant',
        lighting = 'Studio',
        aspectRatio = '16:9',
        customPrompt = ''
    } = advancedOptions;

    const finalImageCount = parseInt(inputsImageCount) || 2;
    const imageStyle = advImageStyle || style || 'Photorealistic';

    const cleanAspectRatio = (ratio) => {
        if (!ratio) return '16:9';
        const match = ratio.match(/(\d+:\d+)/);
        return match ? match[1] : '16:9';
    };
    const targetRatio = cleanAspectRatio(aspectRatio);

    console.log(`[UniversalCreator] 🚀 Generating ${normalizedType} for: "${topic}"`);

    // === STRATEGY PATTERN ===
    let strategy = {
        role: "Creative Director",
        visualTask: "Identify key visuals.",
        htmlTask: "Create a webpage.",
        visualIds: [{ id: "HERO_IMAGE", desc: "Main visual" }]
    };

    if (normalizedType === 'pitch_deck') {
        strategy = {
            role: "Presentation Designer",
            visualTask: `Identify 4-5 KEY visuals (Cover, Problem, Solution, Team, CTA) for a ${slideCountNum}-slide deck.`,
            htmlTask: `Create a PREMIUN ${slideCountNum}-SLIDE Pitch Deck. 
            RULES: 
            - Exactly ${slideCountNum} <section> elements with class "min-h-screen flex items-center snap-start".
            - Each section MUST have id="slide-1" through id="slide-${slideCountNum}".
            - Include a floating nav for slide selection.
            - Ensure high-contrast text and cinematic visuals.`,
            visualIds: [{ id: "COVER_IMAGE", desc: "Title slide background" }, { id: "SOLUTION_IMAGE", desc: "Product/Solution visual" }]
        };
    } else if (normalizedType === 'one_pager') {
        strategy = {
            role: "Executive Copywriter & Designer",
            visualTask: "Identify 2 key visuals: A professional header/abstract visual and a supporting conceptual shot.",
            htmlTask: "Create a professional Executive One-Pager (A4 Portrait feel). Use a multi-column layout, clear hierarchy, and bold section headers. Focus on DENSE, VALUABLE information.",
            visualIds: [{ id: "HEADER_BG", desc: "Top header background" }, { id: "CONTENT_VISUAL", desc: "Supporting visual" }]
        };
    } else if (normalizedType === 'product_brochure') {
        strategy = {
            role: "Product Marketing Designer",
            visualTask: "Identify 3 items: Hero Product Shot, Feature Detail, and a Lifestyle Usage shot.",
            htmlTask: "Create a modern multi-section product brochure with a sticky header and smooth scroll sections.",
            visualIds: [{ id: "HERO_IMAGE", desc: "Main product shot" }]
        };
    } else if (normalizedType === 'promo_images') {
        const count = Math.min(finalImageCount || 2, 4);
        const vIds = [];
        for (let i = 1; i <= count; i++) vIds.push({ id: `PROMO_${i}`, desc: `Campaign Variation ${i}` });
        strategy = {
            role: "Advertising Art Director",
            visualTask: `Identify ${count} distinct visual compositions for this campaign.`,
            htmlTask: `Create a responsive gallery showcase for ${count} promotional assets. Use a dark, premium grid layout.`,
            visualIds: vIds
        };
    } else {
        strategy = {
            role: "Senior News Editor",
            visualTask: "Identify a dramatic header image and 1 supporting shot for a press release.",
            htmlTask: "Generate a linear, document-style news release. Focus on typography and formal readability.",
            visualIds: [{ id: "PR_HERO", desc: "Main news visual" }]
        };
    }

    // 1. VISUAL PLANNING
    let requestedImageCount = Math.max(finalImageCount, strategy.visualIds.length);
    if (normalizedType === 'pitch_deck') requestedImageCount = Math.min(Math.max(requestedImageCount, 3), 8);

    const visualPlanPrompt = `
    You are a JSON-speaking Design Director. 
    Topic: ${topic}. Format: ${normalizedType}.
    Style: ${imageStyle}. Lighting: ${lighting}. Tones: ${colorTone}.
    Requirement: Plan exactly ${requestedImageCount} visuals.
    Return JSON only: {"visuals": [{"id": "...", "desc": "...", "prompt": "..."}]}`;

    let visualPlan = { visuals: [] };
    try {
        const planResult = await executeLLM("System: Designer", visualPlanPrompt);
        const jsonMatch = planResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) visualPlan = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.warn('[UniversalCreator] Plan fallback.');
        for (let i = 0; i < requestedImageCount; i++) {
            const v = strategy.visualIds[i % strategy.visualIds.length];
            visualPlan.visuals.push({ id: `${v.id}_${i}`, prompt: `${v.desc} for ${topic}` });
        }
    }

    // 2. ASSET GENERATION
    const assetMap = {};
    const getFallbackDim = (ratio) => ratio === '16:9' ? '1600x900' : '1080x1080';
    const fallbackDim = getFallbackDim(targetRatio);

    await Promise.all(visualPlan.visuals.map(async (visual) => {
        // Executive photo injection
        if (executivePhotoUrl && (visual.id.includes('HERO') || visual.id.includes('COVER'))) {
            assetMap[visual.id] = executivePhotoUrl; return;
        }
        try {
            assetMap[visual.id] = await generateWithVertexAI(`${visual.prompt}, high resolution, ${imageStyle} style, 8k, no text`, 'imagen-3.0-generate-001', { aspectRatio: targetRatio });
        } catch (err) {
            assetMap[visual.id] = `https://source.unsplash.com/${fallbackDim}/?${encodeURIComponent(topic.split(' ')[0])},business,tech&sig=${Math.random()}`;
        }
    }));

    // 3. HTML ASSEMBLY (THE ARENA V2)
    const archetypes = {
        'visionary': { name: 'Visionary', style: `body { background: #0f172a; color: #f8fafc; } .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); }`, systemRules: "Dark mode, neon accents, futuristic glassmorphism." },
        'executive': { name: 'Executive', style: `body { background: #ffffff; color: #1e293b; } .glass { background: #f8fafc; border: 1px solid #e2e8f0; }`, systemRules: "Clean, corporate, professional blue accents, sharp typography." },
        'disruptor': { name: 'Disruptor', style: `body { background: #000000; color: #ffffff; } .glass { border: 2px solid #fff; }`, systemRules: "High-contrast, brutalist, bold typography." },
        'journalistic': { name: 'Journalistic', style: `body { font-family: 'EB Garamond', serif; background: #fff; color: #000; } .document-body { max-width: 850px; margin: 0 auto; padding: 60px; line-height: 1.6; }`, systemRules: "Classic news layout, focus on serif fonts and linear flow." }
    };

    const styleMap = { 'modern tech': 'visionary', 'futuristic': 'visionary', 'minimalist': 'executive', 'corporate': 'executive', 'creative bold': 'disruptor', 'luxury': 'visionary', 'modern': 'visionary' };
    const isNews = normalizedType.includes('press') || normalizedType.includes('news');
    let selectedArchetype = isNews ? archetypes.journalistic : (archetypes[styleMap[style.toLowerCase()]] || archetypes.visionary);

    let finalSystemPrompt = `You are a World-Class UI/UX Designer. Archetype: ${selectedArchetype.name}. Rules: ${selectedArchetype.systemRules}`;

    let assemblyTask = `
    TASK: ${strategy.htmlTask}
    TOPIC: ${topic}
    AUDIENCE: ${audience}
    REQUIRED CONTENT BASE:
    """
    ${knowledgeBase.substring(0, 10000)}
    """
    
    === DESIGN REQUIREMENTS ===
    - Use EXACTLY these image tokens where appropriate: [${visualPlan.visuals.map(v => v.id).map(id => `{{${id}}}`).join(', ')}]
    - Language: Match the input language (Korean/English).
    - Use Tailwind CSS freely for a PREMIUM look.
    - Include Font Awesome (https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css).
    - Apply this global background/style: ${selectedArchetype.style}
    - RETURN ONLY PURE HTML.
    `;

    let htmlResult;
    if (plan.useArena) {
        try {
            console.log('[UniversalCreator] 🛡️ Arena: Generating Draft...');
            const draft = await executeLLM(finalSystemPrompt, assemblyTask + "\n(Phase: Create a detailed, content-rich draft.)");

            console.log('[UniversalCreator] 🛡️ Arena: Auditing...');
            const critique = await executeLLM("Director", `Critique this HTML (3 points for improvement in Copy/Branding/Layout): ${draft.substring(0, 5000)}`);

            console.log('[UniversalCreator] 🛡️ Arena: Synthesizing Final...');
            htmlResult = await executeLLM(finalSystemPrompt, `
                ORIGINAL TASK: ${assemblyTask}
                DRAFT TO REFINE: ${draft.substring(0, 15000)}
                CRITIQUE: ${critique}
                
                ACTION: Deliver the FINAL, POLISHED HTML. 
                - DO NOT omit sections. 
                - DO NOT simplify excessively. 
                - ENSURE all image tokens {{...}} are used.
            `);
        } catch (err) {
            htmlResult = await executeLLM(finalSystemPrompt, assemblyTask);
        }
    } else {
        htmlResult = await executeLLM(finalSystemPrompt, assemblyTask);
    }

    // 4. CLEANUP & INJECTION
    htmlResult = String(htmlResult || '').replace(/```html/g, '').replace(/```/g, '').trim();

    // Safety size check
    if (htmlResult.length > 950000) {
        htmlResult = htmlResult.substring(0, 950000) + "<!-- Truncated -->";
    }

    // Token Injection
    Object.keys(assetMap).forEach(key => {
        const url = String(assetMap[key] || '');
        const r1 = new RegExp(`{{${key}}}`, 'g');
        const r2 = new RegExp(`{{ ${key} }}`, 'g');
        htmlResult = htmlResult.replace(r1, url).replace(r2, url);
    });

    console.log(`[UniversalCreator] ✅ Generation complete. Length: ${htmlResult.length}`);
    return htmlResult;
}

module.exports = { createCreativeContent };
