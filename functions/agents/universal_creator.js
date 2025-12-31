const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent
 * Handles visual planning, asset generation, and HTML assembly for various content types.
 * Supported Types: 'pitch_deck', 'product_brochure', 'one_pager'
 */
async function createCreativeContent(inputs, context, plan, executeLLM, type, advancedOptions = {}) {
    const { topic, style = 'Modern', audience, slideCount = 5, newsType, visualSubject, executivePhotoUrl, executiveName } = inputs;

    // Check if we have a user-uploaded executive photo
    const hasExecutivePhoto = executivePhotoUrl && newsType === 'New Executive Hire';
    if (hasExecutivePhoto) {
        console.log(`[UniversalCreator] 📸 Using user-uploaded executive photo: ${executivePhotoUrl}`);
    }

    // Extract advanced customization options
    const {
        colorScheme = 'Indigo/Purple (Default)',
        contentTone = 'Professional',
        imageStyle: advImageStyle, // Rename to check against inputs.style
        iconStyle = 'Heroicons',
        includeCharts = 'None',
        layoutDensity = 'Balanced',
        imageCount = '2',
        glassmorphism = true,
        floatingBlobs = true,
        colorTone = 'Vibrant',
        lighting = 'Studio',
        aspectRatio = '16:9',
        customPrompt = ''
    } = advancedOptions;

    // PRD Fix: Priority to user grid selection (inputs.style) if advanced imageStyle is not set
    const imageStyle = advImageStyle || style || 'Photorealistic';

    // Helper to clean aspect ratio string (e.g., "1:1 (Square)" -> "1:1")
    const cleanAspectRatio = (ratio) => {
        if (!ratio) return '16:9';
        const match = ratio.match(/(\d+:\d+)/);
        return match ? match[1] : '16:9';
    };
    const targetRatio = cleanAspectRatio(aspectRatio);

    // Normalize type for robust comparison
    const normalizedType = String(type || '').toLowerCase().trim();

    console.log(`[UniversalCreator] 🚀 Starting generation for type: ${normalizedType} (${style})...`);
    console.log(`[UniversalCreator] ⚙️ Advanced Options: ratio=${targetRatio}, imageStyle=${imageStyle}, lighting=${lighting}, tone=${colorTone}`);
    if (customPrompt) console.log(`[UniversalCreator] 💬 Custom Prompt: ${customPrompt.substring(0, 100)}...`);

    // === STRATEGY PATTERN: Define prompts based on type ===
    let strategy = {
        role: "Creative Director",
        visualTask: "Identify key visuals.",
        htmlTask: "Create a webpage.",
        visualIds: [{ id: "GENERIC_VISUAL_1", desc: "General concept image" }, { id: "GENERIC_VISUAL_2", desc: "Abstract background" }] // Default fallback
    };

    if (normalizedType === 'pitch_deck') {
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
    } else if (normalizedType === 'product_brochure') {
        strategy = {
            role: "Marketing Designer",
            visualTask: "Identify 3 KEY visuals: 1. Hero Product Shot, 2. Feature Close-up, 3. Lifestyle/Usage Shot.",
            htmlTask: "Create a modern Product Brochure. Use a hero header, grid feature section, spec table, and footer.",
            visualIds: [{ id: "HERO_IMAGE", desc: "Main product shot" }, { id: "FEATURE_1", desc: "Feature detail" }, { id: "LIFESTYLE_SHOT", desc: "Usage context" }]
        };
    } else if (normalizedType === 'one_pager') {
        strategy = {
            role: "Corporate Communication Expert",
            visualTask: "Identify 2 visuals: 1. Header Abstract/Photo, 2. Process Diagram or Infographic.",
            htmlTask: "Create a professional Executive One-Pager (A4 style layout). Dense information, clear hierarchy, sidebars.",
            visualIds: [{ id: "HEADER_BG", desc: "Header background" }, { id: "INFOGRAPHIC_1", desc: "Process/Stats diagram" }]
        };
    } else if (normalizedType === 'promo_images') {
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
    } else if (normalizedType.includes('press') || normalizedType.includes('news')) {
        strategy = {
            role: "Senior News Wire Editor",
            visualTask: `Identify 1-2 impact visuals for a professional news wire release about "${topic}". One header image and one supporting shot.`,
            htmlTask: "Generate a PURE linear news article. NO marketing sections, NO buttons, NO slides.",
            visualIds: [{ id: "PR_HERO", desc: "Main news headline visual" }, { id: "PR_DETAIL_1", desc: "Supporting news image" }]
        };
    }

    // 1. VISUAL PLANNING
    // Calculate total images to generate based on user preference or strategy defaults
    let requestedImageCount = parseInt(imageCount) || strategy.visualIds.length;
    if (normalizedType === 'pitch_deck') {
        requestedImageCount = Math.min(parseInt(imageCount) * 2, 8) || Math.min(slideCount, 8);
    }

    const visualPlanPrompt = `
    You are a ${strategy.role} and Visual Experience Director.
    Project Topic: ${topic}
    Document Format: ${normalizedType}
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
    console.log(`[UniversalCreator] 🎨 Generating ${visualPlan.visuals.length} assets at ${targetRatio}...`);
    const assetMap = {};

    // Helper to get fallback dimensions based on aspect ratio
    const getFallbackDim = (ratio) => {
        if (ratio === '1:1') return '1080x1080';
        if (ratio === '9:16') return '1080x1920';
        if (ratio === '4:3') return '1200x900';
        if (ratio === '3:2') return '1200x800';
        return '1600x900';
    };
    const fallbackDim = getFallbackDim(targetRatio);

    await Promise.all(visualPlan.visuals.map(async (visual) => {
        // Use uploaded executive photo for PR_HERO if available
        if (hasExecutivePhoto && (visual.id === 'PR_HERO' || visual.id === 'PR_HERO_0')) {
            console.log(`[UniversalCreator] 📸 Using uploaded executive photo for ${visual.id}`);
            assetMap[visual.id] = executivePhotoUrl;
            return;
        }

        try {
            const prompt = `${visual.prompt}, ${style} style, professional, 4k, clean, high resolution`;
            const imageUrl = await generateWithVertexAI(prompt, 'imagen-4.0-generate-001', {
                aspectRatio: targetRatio
            });
            assetMap[visual.id] = imageUrl;
        } catch (err) {
            console.warn(`[UniversalCreator] Image gen failed for ${visual.id}, using fallback.`);
            const keyword = encodeURIComponent(topic.split(' ')[0] || 'business');
            assetMap[visual.id] = `https://source.unsplash.com/${fallbackDim}/?${keyword},tech&sig=${Math.random()}`;
        }
    }));

    // 3. HTML ASSEMBLY
    const assetInstructions = visualPlan.visuals.map(v => `- For ${v.id}: use exactly "{{${v.id}}}"`).join('\n');

    // --- DESIGN ARCHETYPE SYSTEM ---
    const archetypes = {
        'visionary': {
            name: 'Visionary (Neo-Tech)',
            style: `
                body { background: radial-gradient(circle at top right, #1e1b4b, #0f172a); color: #f8fafc; }
                .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
                .accent-text { background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-color: rgba(129, 140, 248, 0.4); }
            `,
            systemRules: "Style: Dark, futuristic, high-end tech. Features: Gradients, glassmorphism, subtle glows. Background: bg-slate-950."
        },
        'executive': {
            name: 'Executive (Corporate)',
            style: `
                body { background-color: #fcfcfc; color: #1e293b; }
                .glass { background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .accent-text { color: #1e40af; }
                .card-hover:hover { border-color: #3b82f6; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            `,
            systemRules: "Style: Clean, corporate, trustworthy. Features: White backgrounds, solid cards, deep navy/blue accents. Typography: Sharp Sans-serif."
        },
        'disruptor': {
            name: 'Disruptor (Bold)',
            style: `
                body { background-color: #000000; color: #ffffff; }
                .glass { background: #111; border: 2px solid #fff; }
                .accent-text { color: #facc15; text-transform: uppercase; font-weight: 900; }
                .card-hover:hover { background: #facc15; color: #000; border-color: #000; }
            `,
            systemRules: "Style: Brutalist, high-contrast, energetic. Features: Black & White with one bright accent color (Yellow/Neon). Solid heavy borders."
        },
        'minimalist': {
            name: 'Minimalist (Artistic)',
            style: `
                body { background-color: #f5f5f5; color: #262626; }
                .glass { background: transparent; border: 1px solid #d4d4d4; }
                .accent-text { color: #000; font-weight: 300; letter-spacing: 0.1em; }
                .card-hover:hover { border-color: #000; }
            `,
            systemRules: "Style: High-whitespace, thin lines, minimalist. Features: Greyscale, no gradients, very simple borders. Background: bg-stone-50."
        },
        'journalistic': {
            name: 'Journalistic (Minimalist Word Doc)',
            style: `
                body { font-family: 'EB Garamond', serif; background-color: #fff; color: #000; }
                .document-body { max-width: 800px; margin: 0 auto; padding: 60px 40px; text-align: justify; }
                .meta-header { font-family: 'Inter', sans-serif; font-weight: 800; text-transform: uppercase; margin-bottom: 40px; font-size: 0.9rem; letter-spacing: 0.05em; }
                .headline { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 2.25rem; line-height: 1.2; margin-bottom: 20px; color: #000; }
                .subheadline { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 1.25rem; line-height: 1.4; margin-bottom: 40px; color: #444; }
                .dateline { font-weight: 900; text-transform: uppercase; margin-right: 10px; font-family: 'Inter', sans-serif; }
                .boilerplate { border-top: 1px solid #eee; margin-top: 60px; padding-top: 40px; font-size: 1.05rem; }
                .quote { border-left: 2px solid #000; padding: 10px 0 10px 30px; margin: 40px 0; font-style: italic; font-size: 1.25rem; color: #222; }
                p { margin-bottom: 1.5rem; line-height: 1.8; font-size: 1.2rem; }
                img { width: 100%; border-radius: 4px; margin: 40px 0; }
                .end-mark { text-align: center; margin-top: 60px; font-weight: 900; font-size: 1.5rem; }
            `,
            systemRules: "Style: Minimalist Word-processor document. Features: NO website elements. NO buttons. NO hero sections. Standard linear text flow."
        }
    };

    // --- ARCHETYPE SELECTION ---
    let selectedArchetype;
    const isNews = normalizedType.includes('press') || normalizedType.includes('news');

    if (isNews) {
        selectedArchetype = archetypes['journalistic'];
    } else {
        const options = ['visionary', 'executive', 'disruptor', 'minimalist'];
        const randomKey = options[Math.floor(Math.random() * options.length)];
        selectedArchetype = archetypes[randomKey];
    }

    // --- PROMPT BRANCHING ---
    let finalSystemPrompt;
    let finalTaskPrompt;

    if (isNews) {
        finalSystemPrompt = `
    You are a SENIOR NEWS EDITOR at a major global news agency.
    Your task is to write a PROFESSIONAL PRESS RELEASE in a minimalist, WORD-PROCESSOR format.
    
    === CRITICAL: NOT A WEBSITE ===
    - DO NOT use Tailwind layout classes like 'flex', 'grid', 'justify-center', 'items-center' for the overall structure.
    - DO NOT use 'hero sections', 'cards', or 'bento grids'.
    - DO NOT use modern UI buttons, icons, or navigation menus.
    - THE RESULT MUST LOOK LIKE A PRINTED DOCUMENT or a PAGE IN MS WORD.
    
    === STRUCTURE ===
    1. TOP: "FOR IMMEDIATE RELEASE" in the top-left, all caps, bold.
    2. TITLE: Massive, bold headline followed by a descriptive sub-headline.
    3. DATELINE: [CITY, State] — [Current Date] — (The article text MUST start immediately after the second dash on the same line).
    4. CONTENT: 5-8 paragraphs of serious, journalistic prose. No bullet points unless absolutely necessary for data.
    5. IMAGES: Embed {{PR_HERO}} after the sub-headline and {{PR_DETAIL_1}} naturally in the middle of the body text. Use standard <img> tags.
    6. BOILERPLATE: A clean "About [Company]" section at the end.
    7. CONTACT: Media contact information.
    8. END: Centered "###" mark.
    
    === HEAD ===
    \`\`\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>${selectedArchetype.style}</style>
    </head>
    \`\`\`
    `;

        finalTaskPrompt = `
    Generate the Press Release document for: ${topic}
    News Category: ${newsType}
    Context:
    """
    ${context || 'Professional media announcement.'}
    """

    === OUTPUT RULES ===
    - Wrap everything in a <div class="document-body">.
    - Start with <div class="meta-header">FOR IMMEDIATE RELEASE</div>.
    - Follow with <h1 class="headline"> and <h2 class="subheadline">.
    - Do NOT use slide-based layouts. 
    - The output should be ONE SINGLE CONTINUOUS DOCUMENT.
    
    Return ONLY pure HTML starting with <!DOCTYPE html>.
    `;
    } else {
        // WEB APP / PRESENTATION STYLE
        finalSystemPrompt = `
    You are a WORLD-CLASS UI/UX Designer.
    Apply the DESIGN ARCHETYPE: ${selectedArchetype.name}
    Rules: ${selectedArchetype.systemRules}
    
    === CRITICAL: ICON LIBRARY ===
    - ONLY use Font Awesome icons from the CDN provided below.
    - DO NOT use Heroicons, Phosphor Icons, or any other icon library.
    - DO NOT import ESM modules or use "import" statements in the HTML.
    
    === MANDATORY HEAD ===
    \`\`\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
            * { font-family: 'Inter', sans-serif; }
            ${selectedArchetype.style}
            .animate-fade-in { animation: fadeIn 0.6s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    </head>
    \`\`\`
    `;

        finalTaskPrompt = `
    ${strategy.htmlTask}
    TOPIC: ${topic}
    STYLE: ${style} (Archetype: ${selectedArchetype.name})
    IMAGE TOKENS: [${visualPlan.visuals.map(v => v.id).join(', ')}]
    
    === DESIGN REQUIREMENTS ===
    1. EXTRAPOLATE the content from the knowledge base into premium copy.
    2. USE the image tokens {{...}} across the document.
    3. Ensure high visual hierarchy and premium spacing.
    4. ONLY USE Font Awesome (<i class="fa-solid fa-..."></i>) for icons. NO Heroicons.
    
    ${customPrompt ? `💬 USER REQUEST: ${customPrompt}` : ''}
    
    Return pure HTML starting with <!DOCTYPE html>.
    `;
    }

    console.log('[UniversalCreator] 🏗️ Assembling HTML...');
    let htmlResult;
    try {
        htmlResult = await executeLLM(finalSystemPrompt, finalTaskPrompt);
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
        htmlResult = htmlResult.replace(pattern, `https://source.unsplash.com/${fallbackDim}/?${fallbackKeyword},business&sig=${Math.random()}`);
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
