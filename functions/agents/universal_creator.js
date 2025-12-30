const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent
 * Handles visual planning, asset generation, and HTML assembly for various content types.
 * Supported Types: 'pitch_deck', 'product_brochure', 'one_pager'
 */
async function createCreativeContent(inputs, context, plan, executeLLM, type, advancedOptions = {}) {
    const { topic, style = 'Modern', audience, slideCount = 5 } = inputs;

    // Extract advanced customization options
    const {
        colorScheme = 'Indigo/Purple (Default)',
        animationLevel = 'Medium',
        iconStyle = 'Font Awesome',
        layoutDensity = 'Balanced',
        imageCount = '2',
        glassmorphism = true,
        floatingBlobs = true,
        customPrompt = ''
    } = advancedOptions;

    console.log(`[UniversalCreator] 🚀 Starting generation for type: ${type} (${style})...`);
    console.log(`[UniversalCreator] ⚙️ Advanced Options: colorScheme=${colorScheme}, animations=${animationLevel}, icons=${iconStyle}`);
    if (customPrompt) console.log(`[UniversalCreator] 💬 Custom Prompt: ${customPrompt.substring(0, 100)}...`);

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
            visualTask: `Identify 3-4 KEY visuals for a ${slideCount}-slide pitch deck (e.g., Cover Image, Data Chart, Product/Team Photo).`,
            htmlTask: `Create EXACTLY ${slideCount} slides for a Pitch Deck. 
            
CRITICAL REQUIREMENTS:
- You MUST create exactly ${slideCount} <section> elements
- Each section is ONE slide with class="min-h-screen flex items-center"
- Use snap-scroll layout: container with "snap-y snap-mandatory overflow-y-auto h-screen"
- Slide structure example:
  Slide 1: Title/Cover (with hero image)
  Slide 2: Problem Statement
  Slide 3: Solution Overview
  Slide 4: Key Features/Benefits
  Slide 5: Traction/Metrics (if applicable)
  ...continue until exactly ${slideCount} slides

DO NOT create more or fewer than ${slideCount} slides. Count them: 1, 2, 3... ${slideCount}.`,
            visualIds: [{ id: "COVER_IMAGE", desc: "Title slide background" }, { id: "VISUAL_1", desc: "Data chart or metrics" }, { id: "VISUAL_2", desc: "Product/Team/Concept" }]
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
    You are a WORLD-CLASS Frontend Developer & UI Designer creating award-winning, premium web designs.
    
    === MANDATORY INCLUDES ===
    Always start with this exact <head> content:
    \`\`\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
            * { font-family: 'Inter', sans-serif; }
            .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
            .gradient-text { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .hover-lift { transition: all 0.3s ease; }
            .hover-lift:hover { transform: translateY(-8px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            .animate-fade-in { animation: fadeIn 0.6s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .glow { box-shadow: 0 0 40px rgba(99, 102, 241, 0.3); }
        </style>
    </head>
    \`\`\`

    === DESIGN SYSTEM (MANDATORY) ===
    
    1. COLOR PALETTE:
       - Background: bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950
       - Cards: glass class (glassmorphism effect)
       - Primary: indigo-500, purple-500
       - Accent: emerald-400, cyan-400
       - Text: white, slate-300, slate-400
    
    2. TYPOGRAPHY:
       - Hero Title: text-5xl md:text-7xl font-extrabold gradient-text
       - Section Titles: text-3xl md:text-4xl font-bold text-white
       - Subtitles: text-xl text-slate-300
       - Body: text-base text-slate-400 leading-relaxed
    
    3. GLASSMORPHISM CARDS:
       - Use: class="glass rounded-2xl p-8 hover-lift animate-fade-in"
       - Add gradient borders: border-gradient-to-r from-indigo-500/50 to-purple-500/50
    
    4. ICONS (Font Awesome 6):
       - Use icons for EVERY feature/benefit: <i class="fas fa-check-circle text-emerald-400 mr-3"></i>
       - Section headers: <i class="fas fa-rocket text-indigo-400"></i>
       - Stats: <i class="fas fa-chart-line text-cyan-400"></i>
       - Common icons: fa-shield, fa-bolt, fa-globe, fa-users, fa-cog, fa-star, fa-trophy
    
    5. HERO SECTION:
       - Full viewport height: min-h-screen
       - Background image: {{${strategy.visualIds[0].id}}} with dark overlay
       - Gradient overlay: bg-gradient-to-b from-black/70 via-black/50 to-slate-900
       - Center content with flex items-center justify-center
       - Add floating decorative elements (absolute positioned gradient blobs)
    
    6. SECTION LAYOUTS:
       - Use CSS Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
       - Alternating sections with subtle background variations
       - Each section: py-20 px-6 md:px-12
       - Add section dividers with gradient lines
    
    7. ANIMATIONS & INTERACTIVITY:
       - All cards: hover-lift class
       - Buttons: hover:scale-105 transition-all duration-300
       - Stats: text-5xl font-bold gradient-text with counter effect styling
    
    8. DECORATIVE ELEMENTS:
       - Add floating gradient orbs: absolute rounded-full blur-3xl bg-indigo-500/20
       - Subtle grid patterns or dot patterns as backgrounds
       - Gradient divider lines between sections

    === IMAGE TOKENS ===
    ${assetInstructions}
    - CRITICAL: Use {{${strategy.visualIds[0].id}}} as the hero background-image
    - NEVER use placeholder URLs. ONLY use the tokens above.

    === OUTPUT ===
    Pure HTML only. No markdown. No explanations. Start with <!DOCTYPE html>.
    `;

    // Build color scheme instruction based on user selection
    const colorInstructions = {
        'Indigo/Purple (Default)': 'Use indigo-500, purple-500 for primary accents.',
        'Blue/Cyan': 'Use blue-500, cyan-400 for primary accents.',
        'Green/Teal': 'Use emerald-500, teal-400 for primary accents.',
        'Orange/Red': 'Use orange-500, red-400 for primary accents.',
        'Monochrome': 'Use slate-500, gray-400 for primary accents (black/white theme).',
        'Custom Gradient': 'Use a unique gradient combination that fits the brand.'
    };

    const animationInstructions = {
        'None': 'Do not include any animations or hover effects.',
        'Subtle': 'Include minimal hover effects (opacity changes only).',
        'Medium': 'Include hover-lift effects and fade-in animations.',
        'Rich': 'Include elaborate animations: hover-lift, fade-in, floating blobs, gradient shifts, and micro-interactions.'
    };

    const taskPrompt = `
    ${strategy.htmlTask}

    PROJECT DETAILS:
    - Topic: ${topic}
    - Target Audience: ${audience}
    - Style: ${style} (Premium, Executive-level quality)

    KNOWLEDGE BASE CONTENT:
    """
    ${context || 'Use general professional content.'}
    """

    === CUSTOMIZATION (User Selected) ===
    🎨 COLOR SCHEME: ${colorScheme}
    → ${colorInstructions[colorScheme] || colorInstructions['Indigo/Purple (Default)']}
    
    ✨ ANIMATION LEVEL: ${animationLevel}
    → ${animationInstructions[animationLevel] || animationInstructions['Medium']}
    
    🔷 ICON STYLE: ${iconStyle}
    ${iconStyle === 'Font Awesome' ? '→ Use Font Awesome 6 icons (<i class="fas fa-...">)' : ''}
    ${iconStyle === 'Heroicons' ? '→ Use Heroicons SVG icons' : ''}
    ${iconStyle === 'No Icons' ? '→ Do not include icons' : ''}
    
    📐 LAYOUT DENSITY: ${layoutDensity}
    ${layoutDensity === 'Spacious' ? '→ Use generous padding (p-12, py-24, gap-12)' : ''}
    ${layoutDensity === 'Balanced' ? '→ Use standard padding (p-8, py-16, gap-8)' : ''}
    ${layoutDensity === 'Compact' ? '→ Use minimal padding (p-4, py-8, gap-4)' : ''}
    
    🪟 GLASSMORPHISM: ${glassmorphism ? 'YES - Use glass effect cards (bg-white/5 backdrop-blur)' : 'NO - Use solid cards'}
    🫧 FLOATING BLOBS: ${floatingBlobs ? 'YES - Include decorative gradient orbs' : 'NO - Skip decorative blobs'}
    
    ${customPrompt ? `
    💬 ADDITIONAL INSTRUCTIONS FROM USER:
    """
    ${customPrompt}
    """
    (IMPORTANT: Follow these user instructions carefully!)
    ` : ''}

    QUALITY REQUIREMENTS:
    1. Create a STUNNING design that would win design awards
    2. Follow the customization options above precisely
    3. Create visual hierarchy with varied font sizes and weights
    4. Footer with zynk-watermark class
    
    SECTION STRUCTURE:
    - Hero (full viewport, image background, big title)
    - Key Benefits (3-4 cards with icons)
    - Features Grid (detailed feature cards)
    - Statistics/Metrics (big numbers with icons)
    - Call to Action (gradient button, compelling copy)
    - Footer (minimal, elegant)
    
    Make it look like a $50,000 custom website, not a template!
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

    // Fix img tags with empty src, relative paths, or no http
    htmlResult = htmlResult.replace(/<img([^>]*)src=["'](?!http|data:)([^"']*)["']([^>]*)>/gi, (match, before, src, after) => {
        const randomImg = `https://source.unsplash.com/800x600/?${fallbackKeyword},abstract&sig=${Math.random()}`;
        return `<img${before}src="${randomImg}"${after}>`;
    });

    // Fix img tags with completely empty src
    htmlResult = htmlResult.replace(/<img([^>]*)src=["']["']([^>]*)>/gi, (match, before, after) => {
        const randomImg = `https://source.unsplash.com/800x600/?${fallbackKeyword},tech&sig=${Math.random()}`;
        return `<img${before}src="${randomImg}"${after}>`;
    });

    // Fix img tags WITHOUT src attribute at all (only has alt)
    htmlResult = htmlResult.replace(/<img\s+alt=["']([^"']+)["']([^>]*)>/gi, (match, alt, rest) => {
        const randomImg = `https://source.unsplash.com/800x600/?${fallbackKeyword},${encodeURIComponent(alt.split(' ')[0])}&sig=${Math.random()}`;
        return `<img src="${randomImg}" alt="${alt}"${rest}>`;
    });

    // Replace [Text] markdown-style image placeholders with actual images
    htmlResult = htmlResult.replace(/\[([A-Za-z0-9\s]+(?:Diagram|Image|Illustration|Photo|Chart|Graph|Icon|Visual|Shot|Picture))\]/gi, (match, text) => {
        const keyword = encodeURIComponent(text.split(' ')[0] || 'chart');
        const randomImg = `https://source.unsplash.com/800x500/?${keyword},abstract&sig=${Math.random()}`;
        return `<img src="${randomImg}" alt="${text}" class="w-full max-w-md rounded-lg shadow-lg mx-auto my-4">`;
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
