const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent (V6 - Final Stability)
 * Refined the Arena loop and added surgical size control.
 */
async function createCreativeContent(inputs, context, plan, executeLLM, type, advancedOptions = {}) {
    const {
        topic,
        style = 'Modern',
        audience = 'General Audience',
        slideCount = 5,
        newsType,
        executivePhotoUrl,
        imageCount: inputsImageCount
    } = inputs;

    const slideCountNum = parseInt(slideCount) || 5;
    const normalizedType = String(type || '').toLowerCase().trim();
    const knowledgeBase = (context || 'No specific context.').substring(0, 15000);

    const {
        imageStyle: advImageStyle,
        colorTone = 'Vibrant',
        lighting = 'Studio',
        aspectRatio = '16:9',
        customPrompt = ''
    } = advancedOptions;

    const finalImageCount = Math.min(parseInt(inputsImageCount) || 3, 6);
    const imageStyle = advImageStyle || style || 'Photorealistic';
    const targetRatio = String(aspectRatio || '16:9').match(/(\d+:\d+)/)?.[1] || '16:9';

    console.log(`[UniversalCreator] 🚀 Type: ${normalizedType} | Topic: ${topic}`);

    // === STRATEGY DEFINITION ===
    let strategy = {
        role: "Creative Director",
        visualTask: "Identify key visuals.",
        htmlTask: "Create a modern webpage.",
        visualIds: [{ id: "HERO_MAIN", desc: "Hero shot" }]
    };

    if (normalizedType === 'pitch_deck') {
        strategy = {
            role: "Investor Presentation Designer",
            visualTask: "Identify Cover, Problem, Solution, and Market visuals.",
            htmlTask: `Create a ${slideCountNum}-slide Pitch Deck. Use one <section id="slide-N"> per slide. Vertical snap-scroll.`,
            visualIds: [{ id: "COVER", desc: "Cover" }, { id: "SOLUTION", desc: "Solution" }]
        };
    } else if (normalizedType === 'one_pager') {
        strategy = {
            role: "Executive Document Designer",
            visualTask: "Identify Header and 1 conceptual visual.",
            htmlTask: "Create a rich A4-style Executive One-Pager. 2-column layout, dense copy.",
            visualIds: [{ id: "HEADER", desc: "Header" }, { id: "DETAIL", desc: "Detail" }]
        };
    } else if (normalizedType === 'product_brochure') {
        strategy = {
            role: "Product Marketing Expert",
            visualTask: "Identify Hero, Feature, and Lifestyle shots.",
            htmlTask: "Create a smooth-scrolling product brochure with feature cards and a specs table.",
            visualIds: [{ id: "HERO", desc: "Hero" }, { id: "FEATURE", desc: "Feature" }, { id: "LIFESTYLE", desc: "Lifestyle" }]
        };
    } else if (normalizedType === 'promo_images') {
        const count = Math.min(finalImageCount, 4);
        strategy = {
            role: "Ad Agency Art Director",
            visualTask: `Identify ${count} campaign variations.`,
            htmlTask: `Create a dark-mode gallery-style showcase for ${count} campaign assets.`,
            visualIds: Array.from({ length: count }, (_, i) => ({ id: `PROMO_${i + 1}`, desc: `Ad ${i + 1}` }))
        };
    } else {
        strategy = {
            role: "Senior News Editor",
            visualTask: "Identify 1 header and 1 supporting news shot.",
            htmlTask: "Generate a professional, linear document press release.",
            visualIds: [{ id: "PR_HERO", desc: "Headline image" }]
        };
    }

    // 1. VISUAL PLANNING
    const visualPlanPrompt = `Plan ${strategy.visualIds.length} visuals for "${topic}". Json only: {"visuals": [{"id": "...", "desc": "...", "prompt": "..."}]}`;
    let visualPlan = { visuals: [] };
    try {
        const res = await executeLLM("Designer", visualPlanPrompt);
        visualPlan = JSON.parse(res.match(/\{[\s\S]*\}/)[0]);
    } catch (e) {
        visualPlan.visuals = strategy.visualIds.map(v => ({ id: v.id, prompt: v.desc }));
    }

    // 2. ASSET GENERATION
    const assetMap = {};
    const fallbackDim = targetRatio === '16:9' ? '1600x900' : '1080x1080';
    await Promise.all(visualPlan.visuals.map(async (v) => {
        if (executivePhotoUrl && (v.id.includes('HERO') || v.id.includes('COVER'))) {
            assetMap[v.id] = executivePhotoUrl; return;
        }
        try {
            assetMap[v.id] = await generateWithVertexAI(`${v.prompt}, ${imageStyle}, high quality`, 'imagen-3.0-generate-001', { aspectRatio: targetRatio });
        } catch (err) {
            assetMap[v.id] = `https://source.unsplash.com/${fallbackDim}/?${encodeURIComponent(topic.substring(0, 20))},business&s=${Math.random()}`;
        }
    }));

    // 3. HTML ASSEMBLY
    const archetypes = {
        'visionary': { name: 'Visionary', style: `body { background: #0f172a; color: #f8fafc; } .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }`, rules: "Dark, futuristic, neon accents." },
        'executive': { name: 'Executive', style: `body { background: #fff; color: #1e293b; } .glass { background: #f8fafc; border: 1px solid #e2e8f0; }`, rules: "Corporate, clean blue/white." },
        'disruptor': { name: 'Disruptor', style: `body { background: #000; color: #fff; } .glass { border: 2px solid #fff; }`, rules: "Brutalist, high-contrast." },
        'journalistic': { name: 'Journalistic', style: `body { font-family: 'EB Garamond', serif; background: #fff; color: #000; padding: 40px; } .document-body { max-width: 800px; margin: 0 auto; }`, rules: "Linear serif document." }
    };
    const styleKey = { 'modern tech': 'visionary', 'futuristic': 'visionary', 'minimalist': 'executive', 'corporate': 'executive', 'creative bold': 'disruptor' }[style.toLowerCase()] || 'visionary';
    const arc = normalizedType.includes('press') ? archetypes.journalistic : (archetypes[styleKey] || archetypes.visionary);

    const baseTask = `
    Create: ${strategy.htmlTask} (Language: Auto)
    Topic: ${topic}. Archetype: ${arc.name}. 
    Context: """${knowledgeBase}"""
    Image Tokens: [${visualPlan.visuals.map(v => `{{${v.id}}}`).join(', ')}]
    
    === PRINT & PDF RULES ===
    - Use "break-inside: avoid" CSS on all major sections/cards to prevents half-cut content in PDF.
    - Ensure A4-friendly widths (approx 800px-1000px).
    
    === OUTPUT RULES ===
    - RETURN ONLY PURE HTML. NO markdown. NO introductory text. NO summary.
    - Target exactly 1 premium document.
    - Style: ${arc.style}
    - Include: Tailwind, Font-Awesome, Inter font.
    `;

    let html;
    try {
        if (plan.useArena) {
            console.log('[UniversalCreator] 🛡️ Arena Enabled');
            const draft = await executeLLM(`Designer: ${arc.name}`, baseTask + "\nDraft professional HTML.");
            const review = await executeLLM("Director", `Critique briefly: ${draft.substring(0, 3000)}`);
            html = await executeLLM(`Designer: ${arc.name}`, `Draft: ${draft.substring(0, 10000)}\nReview: ${review}\nFINAL: Deliver polished HTML. NO COMMENTARY. NO SUMMARY. STICK TO CODE.`);
        } else {
            html = await executeLLM(`Designer: ${arc.name}`, baseTask);
        }
    } catch (e) {
        html = `<!-- Error: ${e.message} -->`;
    }

    // 4. CLEANUP & EXTRACTION (More aggressive)
    html = String(html || '').replace(/```html/g, '').replace(/```/g, '').trim();

    // Surgical Extraction: Extract only from <html> back to </html> OR first < to last >
    const htmlStart = html.toLowerCase().indexOf('<html');
    const htmlEnd = html.toLowerCase().lastIndexOf('</html>');

    if (htmlStart !== -1 && htmlEnd !== -1) {
        html = html.substring(htmlStart, htmlEnd + 7);
    } else {
        const firstTag = html.indexOf('<');
        const lastTag = html.lastIndexOf('>');
        if (firstTag !== -1 && lastTag !== -1) {
            html = html.substring(firstTag, lastTag + 1);
        }
    }

    // Inject Print Fixes globally
    const printFix = `
    <style>
        @media print {
            section, .card, .glass, tr, li { break-inside: avoid !important; page-break-inside: avoid !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            /* Fix for Gradient Text Bleeding in PDF */
            .z-gradient-text { 
                background-clip: initial !important; 
                -webkit-background-clip: initial !important; 
                background-image: none !important; 
                -webkit-text-fill-color: initial !important; 
                color: #6366f1 !important; /* Semi-generic fallback color */
            }
        }
        section, .card, .glass { break-inside: avoid; }
    </style>
    `;
    if (html.includes('</head>')) {
        html = html.replace('</head>', `${printFix}</head>`);
    } else if (html.includes('<body>')) {
        html = html.replace('<body>', `<body>${printFix}`);
    } else {
        html = printFix + html;
    }

    // Surgical Token Injection (Case-Insensitive)
    Object.keys(assetMap).forEach(k => {
        const val = assetMap[k];
        const regex = new RegExp(`{{ ?${k} ?}}`, 'gi');
        html = html.replace(regex, val);
    });

    // Universal Fallback: Catch any remains {{STUFF}} or broken placeholder URLs
    const fallbackKeyword = encodeURIComponent(topic.substring(0, 30).split(' ')[0] || 'business');
    const unsplashBase = `https://source.unsplash.com/${fallbackDim}/?${fallbackKeyword}`;

    // Replace any leftover {{tokens}}
    html = html.replace(/{{[A-Z_0-9 ]+}}/gi, () => `${unsplashBase},abstract&sig=${Math.random()}`);

    // Replace via.placeholder.com or similar if LLM used them
    html = html.replace(/https?:\/\/via\.placeholder\.com[^\s"'>]+/g, () => `${unsplashBase},premium&sig=${Math.random()}`);

    const LIMIT = 850000;
    if (html.length > LIMIT) {
        console.warn(`[UniversalCreator] Truncating ${html.length} -> ${LIMIT}`);
        const split = html.lastIndexOf('>', LIMIT);
        html = html.substring(0, split > 1000 ? split + 1 : LIMIT) + "<!-- Truncated --></body></html>";
    }

    console.log(`[UniversalCreator] Final size: ${html.length}`);
    return html;
}

module.exports = { createCreativeContent };
