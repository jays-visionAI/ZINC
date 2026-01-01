const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent (V6 - Final Stability)
 * Refined the Arena loop and added surgical size control.
 */
async function createCreativeContent(inputs, context, plan, executeLLM, type, advancedOptions = {}) {
    const {
        topic,
        campaignMessage = '',
        templateType = 'event_poster',
        style = 'Modern',
        audience = 'General Audience',
        slideCount = 5,
        newsType,
        executivePhotoUrl,
        imageCount: inputsImageCount,
        knowledgeContext = ''  // User-edited context from One Pager
    } = inputs;

    const slideCountNum = parseInt(slideCount) || 5;
    const normalizedType = String(type || '').toLowerCase().trim();

    // Merge user's knowledge context with system context
    const combinedContext = knowledgeContext
        ? `${knowledgeContext}\n\n---\n\n${context || ''}`
        : (context || 'No specific context.');
    const knowledgeBase = combinedContext.substring(0, 15000);

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

    // === PITCH DECK: Enhanced Content Strategy ===
    let pitchDeckContent = null;
    if (normalizedType === 'pitch_deck') {
        console.log(`[UniversalCreator] 🎯 Pitch Deck: ${slideCountNum} slides`);

        // Step 1: LLM Content Strategist - Create structured slide content
        try {
            const contentStrategyPrompt = `You are a top-tier pitch deck strategist who has helped raise $500M+ in funding.

COMPANY/PRODUCT: "${topic}"
DETAILS: "${campaignMessage}"
CONTEXT: """${knowledgeBase.substring(0, 4000)}"""
NUMBER OF SLIDES: ${slideCountNum}

Create a compelling investor pitch deck outline. Return JSON only:
{
    "companyName": "Company/Product Name",
    "tagline": "One powerful sentence that captures the vision",
    "slides": [
        {
            "slideNumber": 1,
            "slideType": "cover",
            "headline": "Bold statement or company name",
            "subheadline": "Tagline or value proposition",
            "visualNote": "What image would work here"
        },
        {
            "slideNumber": 2,
            "slideType": "problem",
            "headline": "The Problem We're Solving",
            "bullets": ["Pain point 1", "Pain point 2", "Pain point 3"],
            "impactStat": "Key statistic that shows the problem scale",
            "visualNote": "Problem visualization idea"
        },
        {
            "slideNumber": 3,
            "slideType": "solution",
            "headline": "Our Solution",
            "description": "2-3 sentences explaining how you solve the problem",
            "keyBenefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
            "visualNote": "Product/solution visualization"
        },
        {
            "slideNumber": 4,
            "slideType": "market",
            "headline": "Market Opportunity",
            "tam": "Total Addressable Market estimate",
            "sam": "Serviceable Addressable Market",
            "som": "Serviceable Obtainable Market",
            "growthRate": "Market growth percentage",
            "visualNote": "Market size visualization"
        },
        {
            "slideNumber": 5,
            "slideType": "traction",
            "headline": "Traction & Milestones",
            "metrics": ["Metric 1: Value", "Metric 2: Value"],
            "milestones": ["Milestone achieved 1", "Milestone achieved 2"],
            "visualNote": "Growth chart or achievement icons"
        }
    ]
}

RULES:
- Make headlines punchy and memorable (max 5 words)
- Bullets should be concise but impactful
- Include realistic numbers if available from context, otherwise use compelling placeholders
- Each slide should tell part of a compelling story
- Adjust slide types based on requested slide count
- Return ONLY valid JSON`;

            const contentResult = await executeLLM("ContentStrategist", contentStrategyPrompt);
            pitchDeckContent = JSON.parse(contentResult.match(/\{[\s\S]*\}/)[0]);
            console.log(`[UniversalCreator] ✅ Content Strategy complete: ${pitchDeckContent.slides?.length || 0} slides`);
        } catch (e) {
            console.error(`[UniversalCreator] ⚠️ Content Strategy failed:`, e.message);
            pitchDeckContent = null;
        }

        strategy = {
            role: "Investor Presentation Designer",
            visualTask: "Identify Cover, Problem, Solution, and Market visuals.",
            htmlTask: `Create a ${slideCountNum}-slide Pitch Deck. Use one <section id="slide-N"> per slide. Vertical snap-scroll.`,
            visualIds: [{ id: "COVER", desc: "Cover" }, { id: "SOLUTION", desc: "Solution" }],
            contentStrategy: pitchDeckContent
        };
    } else if (normalizedType === 'one_pager') {
        console.log(`[UniversalCreator] 📄 One Pager: Infographic Mode`);

        // === ONE PAGER: Infographic Strategist ===
        let onePagerContent = null;
        try {
            const infographicPrompt = `You are a world-class Visual Communication Expert and Infographic Designer.
Your specialty: Distilling complex information into powerful 1-2 page visual documents.

TOPIC: "${topic}"
DETAILS: "${campaignMessage}"
CONTEXT: """${knowledgeBase.substring(0, 5000)}"""

Design an executive one-pager that transforms ideas into visual impact. Return JSON only:
{
    "documentTitle": "Clear, compelling title",
    "subtitle": "One-line value proposition or context",
    "visualStrategy": "Describe the overall visual approach (e.g., 'Grid-based infographic with icon-driven sections')",
    
    "sections": [
        {
            "sectionType": "hero",
            "layout": "full-width" | "split",
            "headline": "Bold statement (max 8 words)",
            "subheadline": "Supporting context in one sentence",
            "visualElement": {
                "type": "image" | "icon-grid" | "stat-display",
                "description": "What to show visually"
            }
        },
        {
            "sectionType": "key-metrics",
            "layout": "3-column" | "4-column",
            "headline": "Section title",
            "metrics": [
                {"value": "85%", "label": "Customer Satisfaction", "icon": "star"},
                {"value": "$2.5M", "label": "Revenue Generated", "icon": "chart-line"},
                {"value": "500+", "label": "Active Users", "icon": "users"}
            ]
        },
        {
            "sectionType": "process",
            "layout": "horizontal-flow" | "vertical-steps",
            "headline": "How It Works",
            "steps": [
                {"number": 1, "title": "Step Title", "description": "Brief description", "icon": "icon-name"},
                {"number": 2, "title": "Step Title", "description": "Brief description", "icon": "icon-name"}
            ]
        },
        {
            "sectionType": "features",
            "layout": "bento-grid" | "icon-list",
            "headline": "Key Features",
            "features": [
                {"title": "Feature Name", "description": "One-line benefit", "icon": "icon-name"},
                {"title": "Feature Name", "description": "One-line benefit", "icon": "icon-name"}
            ]
        },
        {
            "sectionType": "comparison",
            "layout": "table" | "before-after",
            "headline": "Why Choose Us",
            "leftColumn": {"title": "Before", "points": ["Pain point 1", "Pain point 2"]},
            "rightColumn": {"title": "After", "points": ["Benefit 1", "Benefit 2"]}
        },
        {
            "sectionType": "cta",
            "layout": "centered",
            "headline": "Ready to Get Started?",
            "primaryAction": "Contact Us",
            "secondaryInfo": "support@company.com | +82-2-1234-5678"
        }
    ],
    
    "designNotes": {
        "primaryColor": "hex color for accent",
        "layoutType": "magazine" | "corporate" | "modern-minimal" | "data-heavy",
        "iconStyle": "line" | "solid" | "duotone",
        "visualHierarchy": "Description of what should catch the eye first, second, third"
    }
}

INFOGRAPHIC DESIGN PRINCIPLES:
1. VISUAL HIERARCHY: Most important info should be largest/most prominent
2. DATA VISUALIZATION: Numbers should be visualized, not just listed
3. ICON USAGE: Every section should have relevant icons (use Font Awesome names)
4. WHITE SPACE: Leave room to breathe - don't cram everything
5. SCAN-ABILITY: Reader should grasp key points in 30 seconds
6. 1-2 PAGE LIMIT: Max 6-8 sections, prioritize ruthlessly

Return ONLY valid JSON.`;

            const infographicResult = await executeLLM("InfographicStrategist", infographicPrompt);
            onePagerContent = JSON.parse(infographicResult.match(/\{[\s\S]*\}/)[0]);
            console.log(`[UniversalCreator] ✅ Infographic Strategy complete: ${onePagerContent.sections?.length || 0} sections`);
        } catch (e) {
            console.error(`[UniversalCreator] ⚠️ Infographic Strategy failed:`, e.message);
            onePagerContent = null;
        }

        strategy = {
            role: "Executive Document Designer & Infographic Expert",
            visualTask: "Identify Header and 1 conceptual visual.",
            htmlTask: "Create a visually impactful A4-style Executive One-Pager. Use infographic elements: icon grids, metric displays, process flows, bento layouts. Max 2 pages when printed.",
            visualIds: [{ id: "HEADER", desc: "Header" }, { id: "DETAIL", desc: "Detail" }],
            contentStrategy: onePagerContent
        };
    } else if (normalizedType === 'product_brochure') {
        strategy = {
            role: "Product Marketing Expert",
            visualTask: "Identify Hero, Feature, and Lifestyle shots.",
            htmlTask: "Create a smooth-scrolling product brochure with feature cards and a specs table.",
            visualIds: [{ id: "HERO", desc: "Hero" }, { id: "FEATURE", desc: "Feature" }, { id: "LIFESTYLE", desc: "Lifestyle" }]
        };
    } else if (normalizedType === 'promo_images' || normalizedType === 'images' || normalizedType === 'templates') {
        // Layered-Gen: Use Template Archive system with LLM-powered copywriting
        const { getTemplateWithContent, getBackgroundPrompt, TEMPLATE_ARCHIVE } = require('../utils/templateArchive');

        const templateType = inputs.templateType || 'event_poster';
        const templateStyle = inputs.templateStyle || 'modern_tech';

        console.log(`[UniversalCreator] 🎨 Promo Template: ${templateType}/${templateStyle}`);
        console.log(`[UniversalCreator] 📝 User input - Topic: "${topic}", Message: "${campaignMessage}"`);

        // === STEP 1: LLM as Senior Marketing Copywriter ===
        let contentFields = {
            headline: topic || 'Event Title',
            subtext: campaignMessage || '',
            eventType: templateType.replace(/_/g, ' ').toUpperCase(),
            date: '',
            location: '',
            ctaText: 'Learn More'
        };

        try {
            const copywriterPrompt = `You are a world-class marketing copywriter. Create compelling promotional content for the following:

TEMPLATE TYPE: ${templateType.replace(/_/g, ' ')}
USER'S TOPIC: "${topic}"
USER'S DETAILS: "${campaignMessage}"
BRAND CONTEXT: ${knowledgeBase.substring(0, 2000)}

Generate promotional content in JSON format:
{
    "headline": "A powerful, attention-grabbing headline (max 6 words, impactful and memorable)",
    "subtext": "2-3 compelling lines that create urgency or excitement",
    "eventType": "Badge/category label (e.g., PRODUCT LAUNCH, EXCLUSIVE EVENT, LIMITED OFFER)",
    "date": "Formatted date if mentioned, or empty string",
    "location": "Location if mentioned, or empty string", 
    "ctaText": "Action-oriented button text (e.g., Reserve Now, Get Started, Join Free)",
    "imagePrompt": "Detailed visual description for AI image generation - describe the ideal background image (no text in image)"
}

RULES:
- Headline: Make it punchy, memorable, and action-oriented. NOT just the user's topic verbatim.
- Subtext: Add value propositions, not just repeat what user said.
- CTA: Strong action verbs that create urgency.
- ImagePrompt: Describe mood, colors, objects, atmosphere - specific to the content.

Return ONLY the JSON object.`;

            const copyResult = await executeLLM("Copywriter", copywriterPrompt);
            const parsed = JSON.parse(copyResult.match(/\{[\s\S]*\}/)[0]);

            contentFields = {
                headline: parsed.headline || topic || 'Event Title',
                subtext: parsed.subtext || campaignMessage || '',
                eventType: parsed.eventType || contentFields.eventType,
                date: parsed.date || '',
                location: parsed.location || '',
                ctaText: parsed.ctaText || 'Learn More'
            };

            // Use LLM-generated image prompt if available
            var customImagePrompt = parsed.imagePrompt || '';

            console.log(`[UniversalCreator] ✅ LLM Copywriting complete:`, contentFields);
        } catch (e) {
            console.error('[UniversalCreator] ⚠️ LLM Copywriting failed, using raw input:', e.message);
            var customImagePrompt = '';
        }

        // === STEP 2: Generate Background Image ===
        const basePrompt = getBackgroundPrompt(templateType, templateStyle, topic);
        const finalImagePrompt = customImagePrompt
            ? `${customImagePrompt}, ${imageStyle} style, no text, professional quality, 4K`
            : `${basePrompt}, ${imageStyle}, high quality, no text`;

        console.log(`[UniversalCreator] 🖼️ Image prompt: ${finalImagePrompt.substring(0, 100)}...`);

        let backgroundUrl = '';
        try {
            backgroundUrl = await generateWithVertexAI(finalImagePrompt, 'imagen-3.0-generate-001', { aspectRatio: '9:16' });
            console.log(`[UniversalCreator] ✅ Image generated: ${backgroundUrl.substring(0, 50)}...`);
        } catch (err) {
            console.error('[UniversalCreator] ⚠️ Image generation failed:', err.message);
            backgroundUrl = `https://picsum.photos/900/1600?random=${Math.floor(Math.random() * 1000)}`;
        }

        // === STEP 3: Combine Template + Content ===
        const finalHtml = getTemplateWithContent(templateType, templateStyle, contentFields, backgroundUrl);

        console.log(`[UniversalCreator] 🎉 Template generation complete!`);
        return finalHtml;

    } else {
        strategy = {
            role: "Senior News Editor",
            visualTask: "Identify 1 header and 1 supporting news shot.",
            htmlTask: "Generate a professional, linear document press release.",
            visualIds: [{ id: "PR_HERO", desc: "Headline image" }]
        };
    }

    // 1. VISUAL PLANNING
    const campaignContext = campaignMessage ? `\nCampaign vision: "${campaignMessage}"` : '';
    const visualPlanPrompt = `Plan ${strategy.visualIds.length} visuals for "${topic}".${campaignContext}\nJson only: {"visuals": [{"id": "...", "desc": "...", "prompt": "..."}]}`;
    let visualPlan = { visuals: [] };
    try {
        const res = await executeLLM("Designer", visualPlanPrompt);
        visualPlan = JSON.parse(res.match(/\{[\s\S]*\}/)[0]);
    } catch (e) {
        visualPlan.visuals = strategy.visualIds.map(v => ({ id: v.id, prompt: campaignMessage || v.desc }));
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

    // Build content strategy section if available
    let contentStrategySection = '';

    // Pitch Deck: Slides format
    if (strategy.contentStrategy && strategy.contentStrategy.slides) {
        contentStrategySection = `
    === CONTENT STRATEGY (MUST FOLLOW) ===
    Company: ${strategy.contentStrategy.companyName || topic}
    Tagline: ${strategy.contentStrategy.tagline || ''}
    
    SLIDES TO CREATE:
    ${strategy.contentStrategy.slides.map(s => `
    Slide ${s.slideNumber} (${s.slideType?.toUpperCase()}):
    - Headline: "${s.headline || ''}"
    - ${s.subheadline ? `Subheadline: "${s.subheadline}"` : ''}
    - ${s.bullets ? `Key Points: ${s.bullets.join(' | ')}` : ''}
    - ${s.description ? `Description: "${s.description}"` : ''}
    - ${s.keyBenefits ? `Benefits: ${s.keyBenefits.join(' | ')}` : ''}
    - ${s.impactStat ? `Impact Stat: "${s.impactStat}"` : ''}
    - ${s.tam ? `TAM: ${s.tam}` : ''}
    - ${s.metrics ? `Metrics: ${s.metrics.join(' | ')}` : ''}
    `).join('\n')}
    
    YOU MUST use the exact headlines, bullets, and content provided above.
    `;
        console.log('[UniversalCreator] 📋 Pitch Deck Content Strategy injected');
    }

    // One Pager: Infographic sections format
    if (strategy.contentStrategy && strategy.contentStrategy.sections) {
        const cs = strategy.contentStrategy;
        contentStrategySection = `
    === INFOGRAPHIC STRATEGY (MUST FOLLOW) ===
    Document Title: ${cs.documentTitle || topic}
    Subtitle: ${cs.subtitle || ''}
    Visual Approach: ${cs.visualStrategy || 'Modern infographic with icon-driven sections'}
    
    ${cs.designNotes ? `
    DESIGN DIRECTION:
    - Primary Color: ${cs.designNotes.primaryColor || '#6366f1'}
    - Layout Type: ${cs.designNotes.layoutType || 'modern-minimal'}
    - Icon Style: ${cs.designNotes.iconStyle || 'solid'}
    - Visual Hierarchy: ${cs.designNotes.visualHierarchy || 'Title > Metrics > Features > CTA'}
    ` : ''}
    
    SECTIONS TO CREATE (IN ORDER):
    ${cs.sections.map((s, i) => {
            let sectionDesc = `
    ${i + 1}. ${s.sectionType?.toUpperCase()} SECTION (Layout: ${s.layout || 'auto'})
       - Headline: "${s.headline || ''}"`;

            if (s.subheadline) sectionDesc += `\n       - Subheadline: "${s.subheadline}"`;
            if (s.metrics) sectionDesc += `\n       - METRICS (use large numbers with icons):\n         ${s.metrics.map(m => `• ${m.value} - ${m.label} [icon: fa-${m.icon}]`).join('\n         ')}`;
            if (s.steps) sectionDesc += `\n       - PROCESS STEPS (use numbered flow):\n         ${s.steps.map(st => `${st.number}. ${st.title}: ${st.description} [icon: fa-${st.icon}]`).join('\n         ')}`;
            if (s.features) sectionDesc += `\n       - FEATURES (use icon grid/bento):\n         ${s.features.map(f => `• ${f.title}: ${f.description} [icon: fa-${f.icon}]`).join('\n         ')}`;
            if (s.leftColumn && s.rightColumn) sectionDesc += `\n       - COMPARISON:\n         LEFT (${s.leftColumn.title}): ${s.leftColumn.points?.join(', ')}\n         RIGHT (${s.rightColumn.title}): ${s.rightColumn.points?.join(', ')}`;
            if (s.primaryAction) sectionDesc += `\n       - CTA Button: "${s.primaryAction}"`;
            if (s.secondaryInfo) sectionDesc += `\n       - Contact: ${s.secondaryInfo}`;

            return sectionDesc;
        }).join('\n')}
    
    INFOGRAPHIC CONTRAST RULES:
    - If Section/Card background is LIGHT (white/gray-50):
        * Section titles MUST be text-slate-950 or text-black.
        * Metric numbers MUST be high-contrast (e.g., text-blue-700, text-slate-900).
        * Labels & Descriptions MUST be text-slate-800 or text-slate-900. NEVER use text-white or text-gray-400.
    - If Section/Card background is DARK (black/navy-900):
        * Section titles MUST be text-white or text-yellow-400.
        * Metric numbers MUST be bright (e.g., text-white, text-cyan-300).
        * Labels & Descriptions MUST be text-gray-100 or text-white. NEVER use text-black or text-slate-800.
    - ICON COLORS: Icons must use a color that stands out from the background (e.g., in a white card, use a saturated blue/purple icon, not a pale one).
    
    INFOGRAPHIC GENERAL RULES:
    - Use Font Awesome icons (fa-solid) for every section.
    - Display metrics as LARGE numbers (text-4xl or bigger).
    - Max 2 printed pages. Must be scannable in 30 seconds.
    - Use grid layouts (CSS Grid or Flexbox).
    `;
        console.log('[UniversalCreator] 📋 One Pager Infographic Strategy injected');
    }

    const baseTask = `
    Create: ${strategy.htmlTask} (Language: Auto)
    Topic: ${topic}. Archetype: ${arc.name}. 
    Context: """${knowledgeBase}"""
    Image Tokens: [${visualPlan.visuals.map(v => `{{${v.id}}}`).join(', ')}]
    ${contentStrategySection}
    === PRINT & PDF RULES ===
    - Use "break-inside: avoid" CSS on all major sections/cards to prevents half-cut content in PDF.
    - Ensure A4-friendly widths (approx 800px-1000px).
    
    === TEXT CONTRAST & ACCESSIBILITY RULES (CRITICAL) ===
    - DARK THEMES (Visionary, Nebula, Cyberpunk, Disruptor): 
        * Body text MUST be white or extremely light gray (e.g., text-slate-100, text-white).
        * Headings MUST be bright (white, neon, or light vibrant colors).
        * NEVER let Tailwind's default dark gray (text-slate-800, text-gray-700) appear on dark backgrounds. 
        * IF background is dark (#000, #020617, etc.), FORCE all labels and descriptions to be text-gray-200 or lighter.
    - LIGHT THEMES (Minimalist, Executive, Journalistic):
        * Body text MUST be dark gray or black (e.g., text-slate-900, text-black).
        * Headings MUST be dark.
        * NEVER use white or light gray text on light backgrounds.
    - INFOGRAPHIC CONTRAST:
        * Small labels below icons and section headers ("How It Works", "Key Features") are often too dark. FORCE them to be high-contrast.
    - Minimum contrast ratio: 7:1 for best accessibility. When in doubt, use PURE WHITE on PURE BLACK or vice-versa.
    
    === OUTPUT RULES ===
    - RETURN ONLY PURE HTML. NO markdown. NO introductory text. NO summary.
    - Target exactly 1 premium document.
    - Style: ${arc.style}
    - Include: Tailwind, Font-Awesome, Inter font, Space Grotesk font (https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap).
    `;

    // 3. HTML ASSEMBLY (Multi-Archetype system with Arena Refinement)
    // Forced High-Quality mode for One Pagers and Pitch Decks
    const useEnhancedAudit = (normalizedType === 'one_pager' || normalizedType === 'pitch_deck');

    let html;
    try {
        if (plan.useArena || useEnhancedAudit) {
            console.log(`[UniversalCreator] 🛡️ Arena & Quality Audit Enabled for: ${normalizedType}`);

            // Step 1: Designer Creates Draft
            const draft = await executeLLM(`Designer: ${arc.name}`, baseTask + "\nDraft professional HTML.");

            // Step 2: Specialized Auditor Checks Contrast & Legibility
            const auditPrompt = `
                You are a WCAG 2.1 Accessibility Auditor. Analyze the provided HTML for color contrast and legibility.
                
                HTML SCRIPT:
                ${draft.substring(0, 6000)}
                
                CRITICAL CHECKLIST:
                - SEARCH for background classes (bg-white, bg-slate-50, etc.) and check if text inside is too light (text-gray-200, text-blue-100, text-white).
                - IF you see light text on light background OR dark text on dark background, you MUST FAIL it.
                - Check if small labels or infographic descriptions are readable.
                
                RESPONSE FORMAT:
                If contrast is perfect: "PASS"
                If contrast is bad: "FAIL: [Reasoning and specific elements to fix]"
            `;
            const auditResult = await executeLLM("Auditor", auditPrompt);

            if (auditResult.toUpperCase().includes("FAIL")) {
                console.log(`[UniversalCreator] ⚠️ Contrast Audit FAILED: ${auditResult}`);
                // Step 3: Designer Fixes based on Auditor Feedback
                html = await executeLLM(`Designer: ${arc.name}`, `
                    YOUR PREVIOUS DRAFT HAD CONTRAST ISSUES:
                    ${auditResult}
                    
                    TASK: Regenerate the HTML with EXPLICIT HIGH CONTRAST using TEXT COLORS ONLY.
                    - PROHIBITED: Do NOT use background colors (bg-gray-200, bg-slate-100, etc.) behind text to fix contrast. It looks like an ugly highlight.
                    - PROHIBITED: No text-shadows or outlines. 
                    - REQUIREMENT: Change the actual 'color' or 'text-color' class of the font.
                    - IF BACKGROUND IS LIGHT: Use text-slate-950 or text-black for ALL text and labels.
                    - IF BACKGROUND IS DARK: Use text-white or text-gray-100 for ALL text and labels.
                    - Ensure the design remains CLEAN, PROFESSIONAL, and PREMIUM. No 'dirty' backgrounds behind labels.
                    
                    DELIVER POLISHED, HIGH-CONTRAST, CLEAN HTML. NO COMMENTARY.
                `);
            } else {
                console.log('[UniversalCreator] ✅ Contrast Audit PASSED');
                html = draft;
            }
        } else {
            html = await executeLLM(`Designer: ${arc.name}`, baseTask);
        }
    } catch (e) {
        html = `<!-- Error in generation: ${e.message} -->`;
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
