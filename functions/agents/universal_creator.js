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
    } else if (normalizedType === 'promo_images' || normalizedType === 'images') {
        const count = Math.min(finalImageCount, 6);
        strategy = {
            role: "Award-winning Ad Agency Art Director",
            visualTask: `Identify ${count} ultra-premium, high-impact campaign variations.`,
            htmlTask: `Create a high-end, futuristic dark-mode showcase. Use a Bento Grid or sophisticated Gallery layout for ${count} campaign assets. 
            DESIGN RULES:
            - Use Glassmorphism (blur + borders) for all cards.
            - Use polished, high-contrast typography (Inter / Space Grotesk).
            - Add subtle glowing mesh gradients in the background.
            - Each asset must have a BOLD TITLE, a short conceptual 'Insight' text, and a high-impact background image card.
            - Ensure the layout feels like a premium portfolio or high-end brand landing page.`,
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
    const fallbackDim = targetRatio === '16:9' ? '1600/900' : '1080/1080'; // Changed x to / for LoremFlicker
    await Promise.all(visualPlan.visuals.map(async (v) => {
        if (executivePhotoUrl && (v.id.includes('HERO') || v.id.includes('COVER'))) {
            assetMap[v.id] = executivePhotoUrl; return;
        }
        try {
            assetMap[v.id] = await generateWithVertexAI(`${v.prompt}, ${imageStyle}, high quality, cinematic lighting`, 'imagen-3.0-generate-001', { aspectRatio: targetRatio });
        } catch (err) {
            // Updated to use LoremFlicker as Unsplash Source is deprecated
            assetMap[v.id] = `https://loremflickr.com/${fallbackDim}/${encodeURIComponent(topic.substring(0, 20).split(' ')[0] || 'tech')}?lock=${Math.floor(Math.random() * 1000)}`;
        }
    }));

    // 3. HTML ASSEMBLY (Multi-Archetype system with Random Variance)
    const archetypes = {
        'visionary': {
            name: 'Visionary',
            style: `body { background: #020617; color: #f8fafc; font-family: 'Space Grotesk', 'Inter', sans-serif; } 
                   .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; }`,
            rules: "Ultra-dark, high-end tech vibe, mesh gradients, rounded 24px corners."
        },
        'nebula': {
            name: 'Nebula',
            style: `body { background: #000; color: #fff; font-family: 'Inter', sans-serif; } 
                   .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px dashed rgba(255,255,255,0.2); border-radius: 12px; }`,
            rules: "Deep space theme, magenta/purple accents, dashed borders, heavy blur."
        },
        'cyberpunk': {
            name: 'Cyberpunk',
            style: `body { background: #050505; color: #00ffcc; font-family: 'Space Grotesk', sans-serif; } 
                   .glass { background: #111; border: 2px solid #00ffcc; box-shadow: 4px 4px 0px #ff0055; border-radius: 0px; }`,
            rules: "High-contrast neon, yellow/pink/cyan accents, brutalist blocks, no rounded corners."
        },
        'minimal': {
            name: 'Minimalist Light',
            style: `body { background: #fdfdfd; color: #171717; font-family: 'Inter', sans-serif; } 
                   .glass { background: #fff; border: 1px solid #e5e5e5; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px; }`,
            rules: "Apple-style clean, high whitespace, subtle shadows, greyscale with one accent color."
        },
        'executive': { name: 'Executive', style: `body { background: #fff; color: #1e293b; } .glass { background: #f8fafc; border: 1px solid #e2e8f0; }`, rules: "Corporate, clean blue/white." },
        'disruptor': { name: 'Disruptor', style: `body { background: #000; color: #fff; } .glass { border: 2px solid #fff; }`, rules: "Brutalist, high-contrast." },
        'journalistic': { name: 'Journalistic', style: `body { font-family: 'EB Garamond', serif; background: #fff; color: #000; padding: 40px; } .document-body { max-width: 800px; margin: 0 auto; }`, rules: "Linear serif document." }
    };

    // Random Variance Logic
    const archetypeKeys = Object.keys(archetypes).filter(k => k !== 'journalistic');
    const randomKey = archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)];

    const styleKey = {
        'modern tech': 'visionary',
        'futuristic': 'nebula',
        'minimalist': 'minimal',
        'corporate': 'executive',
        'creative bold': 'cyberpunk'
    }[style.toLowerCase()] || randomKey;

    const arc = normalizedType.includes('press') ? archetypes.journalistic : (archetypes[styleKey] || archetypes.visionary);

    // Mesh Gradient Randomizer
    const gradientVariants = [
        'rgba(99,102,241,0.15)', // Indigo
        'rgba(236,72,153,0.12)', // Pink
        'rgba(34,211,238,0.15)', // Cyan
        'rgba(168,85,247,0.13)', // Purple
        'rgba(244,63,94,0.1)',   // Rose
    ];
    const pickedGradient = gradientVariants[Math.floor(Math.random() * gradientVariants.length)];
    const meshGlow = `.mesh-glow { position: fixed; width: 60vw; height: 60vw; background: radial-gradient(circle, ${pickedGradient} 0%, transparent 70%); filter: blur(80px); z-index: -1; pointer-events: none; }`;
    arc.style += `\n${meshGlow}`;

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
    - Include: Tailwind, Font-Awesome, Inter font, Space Grotesk font (https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap).
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
    const backupImg = `https://loremflickr.com/${fallbackDim}/${fallbackKeyword}`;

    // Replace any leftover {{tokens}}
    html = html.replace(/{{[A-Z_0-9 ]+}}/gi, () => `${backupImg}?lock=${Math.floor(Math.random() * 1000)}`);

    // Replace via.placeholder.com or similar if LLM used them
    html = html.replace(/https?:\/\/via\.placeholder\.com[^\s"'>]+/g, () => `${backupImg}?lock=${Math.floor(Math.random() * 1000)}`);

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
