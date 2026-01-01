const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent (V5 - Ultra Robust)
 * Handles visual planning, asset generation, and HTML assembly.
 * Hardened against Firestore limits and content truncation.
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
    const knowledgeBase = (context || 'No specific context provided.').substring(0, 12000); // Limit context size

    const {
        imageStyle: advImageStyle,
        colorTone = 'Vibrant',
        lighting = 'Studio',
        aspectRatio = '16:9',
        customPrompt = ''
    } = advancedOptions;

    const finalImageCount = Math.min(parseInt(inputsImageCount) || 2, 6);
    const imageStyle = advImageStyle || style || 'Photorealistic';

    const cleanAspectRatio = (ratio) => {
        const match = String(ratio || '16:9').match(/(\d+:\d+)/);
        return match ? match[1] : '16:9';
    };
    const targetRatio = cleanAspectRatio(aspectRatio);

    console.log(`[UniversalCreator] 🚀 Generating ${normalizedType} for: "${topic}"`);

    // === STRATEGY PATTERN ===
    let strategy = {
        role: "Creative Director",
        visualTask: "Identify 2 key visuals.",
        htmlTask: "Create a webpage.",
        visualIds: [{ id: "HERO_IMAGE", desc: "Main visual" }]
    };

    if (normalizedType === 'pitch_deck') {
        strategy = {
            role: "Presentation Designer",
            visualTask: `Identify 4 visuals (Cover, Problem, Solution, Team) for a ${slideCountNum}-slide deck.`,
            htmlTask: `Create a ${slideCountNum}-SLIDE Pitch Deck. Use id="slide-1" to id="slide-${slideCountNum}" with Snap-scroll.`,
            visualIds: [{ id: "COVER_IMAGE", desc: "Title slide" }, { id: "VISUAL_1", desc: "Solution" }]
        };
    } else if (normalizedType === 'one_pager') {
        strategy = {
            role: "Executive Designer",
            visualTask: "Identify 2 key visuals: Header and a supporting shot.",
            htmlTask: "Create a professional Executive One-Pager (A4 Portrait). Multi-column, rich information.",
            visualIds: [{ id: "HEADER_BG", desc: "Header" }, { id: "VISUAL_1", desc: "Context" }]
        };
    } else if (normalizedType === 'product_brochure') {
        strategy = {
            role: "Product Marketing Designer",
            visualTask: "Identify 3 items: Hero Product Shot, Feature Detail, and a Lifestyle Usage shot.",
            htmlTask: "Create a modern multi-section product brochure with a sticky header and smooth scroll sections.",
            visualIds: [
                { id: "HERO_IMAGE", desc: "Main product hero shot" },
                { id: "FEATURE_IMAGE", desc: "Detail of a key feature" },
                { id: "LIFESTYLE_IMAGE", desc: "Product in use by customers" }
            ]
        };
    } else if (normalizedType === 'promo_images') {
        const count = Math.min(finalImageCount, 4);
        const vIds = [];
        for (let i = 1; i <= count; i++) vIds.push({ id: `PROMO_${i}`, desc: `Variation ${i}` });
        strategy = {
            role: "Art Director",
            visualTask: `Identify ${count} campaign variations.`,
            htmlTask: `Create a gallery showcase for ${count} images in a premium grid.`,
            visualIds: vIds
        };
    } else {
        strategy = {
            role: "News Editor",
            visualTask: "Identify a header and a shot for news.",
            htmlTask: "Generate a document-style news release.",
            visualIds: [{ id: "PR_HERO", desc: "News visual" }]
        };
    }

    // 1. VISUAL PLANNING
    let requestedImageCount = Math.max(finalImageCount, strategy.visualIds.length);
    if (requestedImageCount > 8) requestedImageCount = 8;

    const visualPlanPrompt = `Plan ${requestedImageCount} visuals for "${topic}" (${normalizedType}). Style: ${imageStyle}. Return JSON: {"visuals": [{"id": "...", "desc": "...", "prompt": "..."}]}`;

    let visualPlan = { visuals: [] };
    try {
        const planResult = await executeLLM("System: Designer JSON", visualPlanPrompt);
        const jsonMatch = planResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) visualPlan = JSON.parse(jsonMatch[0]);
    } catch (e) {
        visualPlan.visuals = strategy.visualIds.slice(0, requestedImageCount).map(v => ({ id: v.id, prompt: v.desc }));
    }

    // 2. ASSET GENERATION
    const assetMap = {};
    const fallbackDim = targetRatio === '16:9' ? '1600x900' : '1080x1080';

    await Promise.all(visualPlan.visuals.slice(0, requestedImageCount).map(async (visual) => {
        if (executivePhotoUrl && (visual.id.includes('HERO') || visual.id.includes('COVER'))) {
            assetMap[visual.id] = executivePhotoUrl; return;
        }
        try {
            assetMap[visual.id] = await generateWithVertexAI(`${visual.prompt}, ${imageStyle} style, high quality`, 'imagen-3.0-generate-001', { aspectRatio: targetRatio });
        } catch (err) {
            assetMap[visual.id] = `https://source.unsplash.com/${fallbackDim}/?${encodeURIComponent(topic.substring(0, 20))},business&sig=${Math.random()}`;
        }
    }));

    // 3. HTML ASSEMBLY
    const archetypes = {
        'visionary': { name: 'Visionary', style: `body { background: #0f172a; color: #f8fafc; } .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }`, rules: "Dark, sleek, futuristic." },
        'executive': { name: 'Executive', style: `body { background: #fff; color: #1e293b; } .glass { background: #f8fafc; border: 1px solid #e2e8f0; }`, rules: "Clean, corporate, professional." },
        'disruptor': { name: 'Disruptor', style: `body { background: #000; color: #fff; } .glass { border: 2px solid #fff; }`, rules: "Bold, high-contrast." },
        'journalistic': { name: 'Journalistic', style: `body { font-family: 'EB Garamond', serif; background: #fff; color: #000; } .document-body { max-width: 800px; margin: 0 auto; padding: 40px; }`, rules: "Classic news layout." }
    };

    const styleMap = { 'modern tech': 'visionary', 'futuristic': 'visionary', 'minimalist': 'executive', 'corporate': 'executive', 'creative bold': 'disruptor', 'luxury': 'visionary' };
    const isNews = normalizedType.includes('press') || normalizedType.includes('news');
    let archetype = isNews ? archetypes.journalistic : (archetypes[styleMap[style.toLowerCase()]] || archetypes.visionary);

    const basePrompt = `
    TASK: ${strategy.htmlTask} (Language: Match Input)
    TOPIC: ${topic}. STYLE: ${style}. ARCHETYPE: ${archetype.name} (${archetype.rules})
    CONTENT: 
    """
    ${knowledgeBase}
    """
    REQUIRED TOKENS: [${visualPlan.visuals.map(v => `{{${v.id}}}`).join(', ')}]
    
    - RETURN ONLY PURE HTML. NO markdown.
    - BE CONCISE (Max 4000 words). Do not repeat content.
    - Style: ${archetype.style}
    - Use Font Awesome & Inter font.
    `;

    let htmlResult;
    try {
        if (plan.useArena) {
            console.log('[UniversalCreator] 🛡️ Arena Mode');
            const draft = await executeLLM(`Designer: ${archetype.name}`, basePrompt + "\n(DRAFT PHASE)");
            const critique = await executeLLM("Director", `Critique this HTML briefly: ${draft.substring(0, 4000)}`);
            htmlResult = await executeLLM(`Designer: ${archetype.name}`, `DRAFT: ${draft.substring(0, 8000)}\nCRITIQUE: ${critique}\nFINAL TASK: Deliver polished HTML. BE CONCISE.`);
        } else {
            htmlResult = await executeLLM(`Designer: ${archetype.name}`, basePrompt);
        }
    } catch (e) {
        htmlResult = `<!-- ERROR: ${e.message} -->`;
    }

    // 4. INJECTION & TOTAL PROTECTION
    htmlResult = String(htmlResult || '').replace(/```html/g, '').replace(/```/g, '').trim();

    // Inject images
    Object.keys(assetMap).forEach(key => {
        const val = assetMap[key];
        htmlResult = htmlResult.replace(new RegExp(`{{ ?${key} ?}}`, 'g'), val);
    });

    // FINAL SIZE PROTECTION (Firestore Limit is ~1,048,487 bytes)
    // We aim for 850k to be safe with some margin for metadata.
    const ABSOLUTE_SAFE_LIMIT = 850000;
    if (htmlResult.length > ABSOLUTE_SAFE_LIMIT) {
        console.warn(`[UniversalCreator] ‼️ CRITICAL SIZE ALERT: ${htmlResult.length} chars. Truncating to ${ABSOLUTE_SAFE_LIMIT}.`);
        // Find a safe spot to cut (end of a tag)
        const lastTag = htmlResult.lastIndexOf('>', ABSOLUTE_SAFE_LIMIT);
        htmlResult = htmlResult.substring(0, lastTag > 0 ? lastTag + 1 : ABSOLUTE_SAFE_LIMIT) + "\n<!-- TRUNCATED BY SIZE SAFETY SYSTEM --></body></html>";
    }

    console.log(`[UniversalCreator] ✅ Finished. Final Size: ${htmlResult.length}`);
    return htmlResult;
}

module.exports = { createCreativeContent };
