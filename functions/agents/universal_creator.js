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
        contentTone = 'Professional',
        imageStyle = 'Photorealistic',
        iconStyle = 'Heroicons',
        includeCharts = 'None',
        layoutDensity = 'Balanced',
        imageCount = '2',
        glassmorphism = true,
        floatingBlobs = true,
        colorTone = 'Vibrant',
        lighting = 'Studio',
        customPrompt = ''
    } = advancedOptions;

    console.log(`[UniversalCreator] 🚀 Starting generation for type: ${type} (${style})...`);
    console.log(`[UniversalCreator] ⚙️ Advanced Options: colorScheme=${colorScheme}, tone=${contentTone}, imageStyle=${imageStyle}, charts=${includeCharts}`);
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
            
    🚨 STRICT RULE: You MUST output exactly ${slideCount} <section> elements. No more, no less.
    
    CRITICAL REQUIREMENTS:
    - Each section is ONE slide with class="min-h-screen flex items-center snap-start"
    - The body MUST have a dot-navigation container <nav class="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3"> with ${slideCount} dots linking to #slide-1, #slide-2, etc.
    - Each <section> MUST have an id="slide-N" (where N is 1 to ${slideCount}).
    - Mandatory Slides (Sequential):
      1. Title/Cover (id="slide-1")
      2. Problem Statement (id="slide-2")
      3. Solution (id="slide-3")
      4. Features/Benefits (id="slide-4")
      5. ...continue with Traction, Market, Team, Business Model, etc. 
      ${slideCount}. Final CTA / Contact Us (id="slide-${slideCount}")

    DO NOT bypass this count. If you fail to create exactly ${slideCount} sections, you have failed the task.`,
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
    } else if (type === 'promo_images') {
        const count = parseInt(imageCount) || 1;
        const vIds = [];
        for (let i = 1; i <= count; i++) {
            vIds.push({ id: `PROMO_IMG_${i}`, desc: `Promotional asset variation ${i}` });
        }
        strategy = {
            role: "Advertising Art Director",
            visualTask: `Identify ${count} distinct visual compositions for the promotional concept "${topic}". Each should vary in angle or focus but maintain consistent branding.`,
            htmlTask: `Create a sleek, gallery-style showcase for ${count} promotional images. 
            Include a sophisticated header, a minimalist grid to display the images, and a section for "Usage Guidelines" or "Campaign Details".
            - Background: Deep slate or dark mode.
            - Layout: Use a responsive grid (grid-cols-1 ${count > 1 ? 'md:grid-cols-2' : ''}) for the images.
            - Details: Add a "Copy to Clipboard" or "Download Asset" button simulation for each image.`,
            visualIds: vIds
        };
    }

    // 1. VISUAL PLANNING
    // Calculate total images to generate based on user preference or strategy defaults
    let requestedImageCount = parseInt(imageCount) || strategy.visualIds.length;
    if (type === 'pitch_deck') {
        requestedImageCount = Math.min(parseInt(imageCount) * 2, 8) || Math.min(slideCount, 8);
    }

    const visualPlanPrompt = `
    You are a ${strategy.role} and Visual Experience Director.
    Project Topic: ${topic}
    Document Format: ${type}
    Style: ${style}
    Image Style: ${imageStyle} (MANDATORY: Follow this art style strictly)
    Target Audience: ${audience}
    Preferred Color Tone: ${colorTone || 'Professional'}
    Preferred Lighting: ${lighting || 'Cinematic'}

    KNOWLEDGE BASE / CONTEXT:
    """
    ${context || 'No specific context.'}
    """

    TASK:
    ${strategy.visualTask}
    
    You need to plan EXACTLY ${requestedImageCount} high-quality visuals for this project in the style of "${imageStyle}".

    REQUIREMENTS for each visual:
    1. id: Unique identifier (e.g., HERO_BG, FEATURE_1, SLIDE_3_IMAGE)
    2. desc: What this image represents in the document
    3. prompt: A VERY DETAILED prompt for Vertex AI Imagen 4.0. 
       - Style: ${imageStyle}. Do not deviate from this.
       - Include: Subject description, lighting (${lighting}), color palette (${colorTone}), composition (e.g., wide shot, macro), and mood.
       - Avoid text in images.
       - Focus on high-end production quality.

    Return JSON only:
    {
        "visuals": [
             {"id": "...", "desc": "...", "prompt": "..."}
        ]
    }`;

    let visualPlan = { visuals: [] };
    try {
        console.log(`[UniversalCreator] 🧠 Planning ${requestedImageCount} visuals in ${imageStyle} style...`);
        const planResult = await executeLLM("You are a JSON-speaking Design Director.", visualPlanPrompt);
        const jsonMatch = planResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            visualPlan = JSON.parse(jsonMatch[0]);
            visualPlan.visuals = visualPlan.visuals.slice(0, 10);
        }
    } catch (e) {
        console.warn('[UniversalCreator] Planning failed, using default plan.', e.message);
        visualPlan.visuals = [];
        for (let i = 0; i < requestedImageCount; i++) {
            const v = strategy.visualIds[i % strategy.visualIds.length];
            visualPlan.visuals.push({
                id: `${v.id}_${i}`,
                prompt: `High quality ${v.desc} for ${topic} in ${imageStyle} style, ${colorTone || 'vibrant'} tones, ${lighting || 'natural'} lighting.`
            });
        }
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
    - Document Format: ${type}
    - Target Audience: ${audience}
    - Style: ${style} (Premium, Executive-level quality)
    - Tone of Voice: ${contentTone} (EXTREMELY IMPORTANT: Stick to this tone)

    KNOWLEDGE BASE CONTENT (EXTRACTED FROM UPLOADED DOCUMENTS):
    """
    ${context || 'Use general professional content.'}
    """

    === CUSTOMIZATION (User Selected) ===
    🎨 COLOR SCHEME: ${colorScheme}
    → ${colorInstructions[colorScheme] || colorInstructions['Indigo/Purple (Default)']}
    
    🔷 ICON STYLE: ${iconStyle}
    → Use ${iconStyle} SVG icons (inline SVGs or reliable CDN icons).
    
    📐 LAYOUT DENSITY: ${layoutDensity}
    ${layoutDensity === 'Spacious' ? '→ Use generous padding (p-12, py-24, gap-12)' : ''}
    ${layoutDensity === 'Balanced' ? '→ Use standard padding (p-8, py-16, gap-8)' : ''}
    ${layoutDensity === 'Compact' ? '→ Use minimal padding (p-4, py-8, gap-4)' : ''}
    
    🪟 GLASSMORPHISM: ${glassmorphism ? 'YES - Use glass effect cards (bg-white/5 backdrop-blur)' : 'NO - Use solid cards'}
    🫧 FLOATING BLOBS: ${floatingBlobs ? 'YES - Include decorative gradient orbs' : 'NO - Skip decorative blobs'}

    📊 DATA VISUALIZATION: ${includeCharts}
    ${includeCharts === 'Bar Charts' ? '→ Create elegant pure CSS/Tailwind bar charts to visualize key metrics.' : ''}
    ${includeCharts === 'Line Graphs' ? '→ Create stylized CSS line graph components for trends.' : ''}
    ${includeCharts === 'Progress Rings' ? '→ Use circular progress SVGs for percentage-based data.' : ''}
    ${includeCharts === 'Infographic Cards' ? '→ Use icon-heavy infographic blocks for data points.' : ''}
    
    ${customPrompt ? `
    💬 ADDITIONAL INSTRUCTIONS FROM USER:
    """
    ${customPrompt}
    """
    (IMPORTANT: Follow these user instructions carefully!)
    ` : ''}

    QUALITY REQUIREMENTS:
    1. EXTRAPOLATE: Expand on the Knowledge Base content. Turn bullet points into compelling professional copy in a ${contentTone} tone.
    2. VISUAL HIERARCHY: Use modern design principles (gradients, whitespace, varying typography weights).
    3. BRAND CONSISTENCY: Maintain ${colorScheme} throughout all elements.
    4. IMAGE USAGE: Distribute the provided image tokens [${visualPlan.visuals.map(v => v.id).join(', ')}] across the document where they make the most sense. Use them in a way that matches the "${imageStyle}" style.
    5. SLIDE STRUCTURE (if applicable): Ensure exactly ${slideCount} slides with distinct purposes.
    
    Make it look like a $50,000 custom digital product!
    `;

    console.log('[UniversalCreator] 🏗️ Assembling HTML...');
    let htmlResult;
    try {
        htmlResult = await executeLLM(systemPrompt, taskPrompt);
    } catch (e) {
        console.error('[UniversalCreator] HTML Assembly failed:', e.message);
        htmlResult = `
            <!DOCTYPE html>
            <html lang="en">
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-slate-900 text-white p-10 font-sans">
                <div class="max-w-4xl mx-auto glass rounded-2xl p-10 text-center">
                    <h1 class="text-4xl font-bold mb-4">Content Generated</h1>
                    <p class="text-slate-400 mb-8">We successfully planned your visuals, but the final assembly had issues. You can still see your planned assets below.</p>
                    <div class="grid grid-cols-2 gap-4">
                        ${visualPlan.visuals.map(v => `<div class="bg-slate-800 p-4 rounded-xl"><img src="{{${v.id}}}" class="rounded-lg mb-2"><p class="text-xs text-slate-500">${v.desc}</p></div>`).join('')}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Ensure htmlResult is a string
    htmlResult = String(htmlResult || '');

    // Clean Markdown
    htmlResult = htmlResult.replace(/```html/g, '').replace(/```/g, '').trim();

    // 4. TOKEN REPLACEMENT
    console.log('[UniversalCreator] 🔗 Injecting asset URLs...');
    Object.keys(assetMap).forEach(key => {
        const urlValue = String(assetMap[key] || '');
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlResult = htmlResult.replace(regex, urlValue);
        // Also try with spaces (LLM sometimes adds spaces)
        const regexWithSpaces = new RegExp(`{{ ${key} }}`, 'g');
        htmlResult = htmlResult.replace(regexWithSpaces, urlValue);
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
    return htmlResult || '';
}

module.exports = { createCreativeContent };
