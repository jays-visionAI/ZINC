const { generateWithVertexAI } = require('../utils/vertexAI');

/**
 * 🎨 Universal Creative Agent
 * Handles visual planning, asset generation, and HTML assembly for various content types.
 * Supported Types: 'pitch_deck', 'product_brochure', 'one_pager', 'promo_images', 'press_release'
 */
async function createCreativeContent(inputs, context, plan, executeLLM, type, advancedOptions = {}) {
    const { topic, style = 'Modern', audience, slideCount = 5, newsType, visualSubject, executivePhotoUrl, executiveName, imageCount: inputsImageCount } = inputs;
    const slideCountNum = parseInt(slideCount) || 5;

    // Check if we have a user-uploaded executive photo
    const hasExecutivePhoto = executivePhotoUrl && (newsType === 'New Executive Hire' || type?.includes('press'));
    if (hasExecutivePhoto) {
        console.log(`[UniversalCreator] 📸 Using user-uploaded executive photo: ${executivePhotoUrl}`);
    }

    // Extract advanced customization options
    const {
        colorScheme = 'Indigo/Purple (Default)',
        contentTone = 'Professional',
        imageStyle: advImageStyle,
        iconStyle = 'Heroicons',
        includeCharts = 'None',
        layoutDensity = 'Balanced',
        imageCount: advImageCount = '2',
        glassmorphism = true,
        floatingBlobs = true,
        colorTone = 'Vibrant',
        lighting = 'Studio',
        aspectRatio = '16:9',
        customPrompt = ''
    } = advancedOptions;

    // Final image count derived from inputs or advanced options
    const finalImageCount = advImageCount || inputsImageCount || '2';

    // PRD Fix: Priority to user grid selection (inputs.style) if advanced imageStyle is not set
    const imageStyle = advImageStyle || style || 'Photorealistic';

    // Helper to clean aspect ratio string (e.g., "16:9 (Landscape)" -> "16:9")
    const cleanAspectRatio = (ratio) => {
        if (!ratio) return '16:9';
        const match = ratio.match(/(\d+:\d+)/);
        return match ? match[1] : '16:9';
    };
    const targetRatio = cleanAspectRatio(aspectRatio);

    // Normalize type for robust comparison
    const normalizedType = String(type || '').toLowerCase().trim();

    console.log(`[UniversalCreator] 🚀 Starting generation for type: ${normalizedType} (${style})...`);
    console.log(`[UniversalCreator] ⚙️ Advanced Options: ratio=${targetRatio}, imageStyle=${imageStyle}, lighting=${lighting}, tone=${colorTone}, useArena=${plan.useArena}`);

    // === STRATEGY PATTERN: Define prompts based on type ===
    let strategy = {
        role: "Creative Director",
        visualTask: "Identify key visuals.",
        htmlTask: "Create a webpage.",
        visualIds: [{ id: "GENERIC_VISUAL_1", desc: "General concept image" }, { id: "GENERIC_VISUAL_2", desc: "Abstract background" }]
    };

    if (normalizedType === 'pitch_deck') {
        strategy = {
            role: "Presentation Designer",
            visualTask: `Identify 3-4 KEY visuals for a ${slideCountNum}-slide pitch deck (e.g., Cover Image, Data Chart, Product/Team Photo).`,
            htmlTask: `Create EXACTLY ${slideCountNum} slides for a Pitch Deck.
            
    🚨 STRICT RULE: You MUST output exactly ${slideCountNum} <section> elements. No more, no less.
    
    CRITICAL REQUIREMENTS:
    - Each section is ONE slide with class="min-h-screen flex items-center snap-start"
    - The body MUST have a dot-navigation container <nav class="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3"> with ${slideCountNum} dots linking to #slide-1, #slide-2, etc.
    - Each <section> MUST have an id="slide-N" (where N is 1 to ${slideCountNum}).
    - Mandatory Slides (Sequential):
      1. Title/Cover (id="slide-1")
      2. Problem Statement (id="slide-2")
      3. Solution (id="slide-3")
      4. Features/Benefits (id="slide-4")
      5. Traction/Market (id="slide-5")
      ...
      ${slideCountNum}. Final CTA / Contact Us (id="slide-${slideCountNum}")`,
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
        const count = Math.min(parseInt(finalImageCount) || 2, 4);
        const vIds = [];
        for (let i = 1; i <= count; i++) {
            vIds.push({ id: `PROMO_IMG_${i}`, desc: `Promotional asset variation ${i}` });
        }
        strategy = {
            role: "Advertising Art Director",
            visualTask: `Identify ${count} distinct visual compositions for the promotional concept "${topic}". Each should vary in angle or focus but maintain consistent branding.`,
            htmlTask: `Create a sleek, gallery-style showcase for ${count} promotional images. 
            Include a sophisticated header, a minimalist grid to display the images, and a section for "Usage Guidelines" or "Campaign Details".`,
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
    let requestedImageCount = parseInt(finalImageCount) || strategy.visualIds.length;
    if (normalizedType === 'pitch_deck') {
        requestedImageCount = Math.min(Math.max(parseInt(finalImageCount), 3), 8);
    }

    console.log(`[UniversalCreator] 🖼️ Visual Planning: requestedImages=${requestedImageCount}`);

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
    3. prompt: A VERY DETAILED prompt for Imagen 4.0. 
       - Style: ${imageStyle}. Do not deviate from this.
       - Include: Subject description, lighting (${lighting}), color palette (${colorTone}), composition, and mood.
       - Avoid text in images.

    Return JSON only:
    {
        "visuals": [
             {"id": "...", "desc": "...", "prompt": "..."}
        ]
    }`;

    let visualPlan = { visuals: [] };
    try {
        console.log(`[UniversalCreator] 🧠 Planning ${requestedImageCount} visuals...`);
        const planResult = await executeLLM("You are a JSON-speaking Design Director.", visualPlanPrompt);
        const jsonMatch = planResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            visualPlan = JSON.parse(jsonMatch[0]);
            visualPlan.visuals = visualPlan.visuals.slice(0, 10);
            console.log(`[UniversalCreator] ✅ Visual Plan parsed: ${visualPlan.visuals.length} items.`);
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
    const assetMap = {};
    const getFallbackDim = (ratio) => {
        if (ratio === '1:1') return '1080x1080';
        if (ratio === '9:16') return '1080x1920';
        if (ratio === '4:3') return '1200x900';
        if (ratio === '3:2') return '1200x800';
        return '1600x900';
    };
    const fallbackDim = getFallbackDim(targetRatio);

    await Promise.all(visualPlan.visuals.map(async (visual) => {
        // Use uploaded executive photo for specific IDs if available
        if (hasExecutivePhoto && (visual.id === 'PR_HERO' || visual.id === 'COVER_IMAGE' || visual.id.includes('HERO'))) {
            assetMap[visual.id] = executivePhotoUrl;
            return;
        }

        try {
            console.log(`[UniversalCreator] 🖌️ Generating image for: ${visual.id}...`);
            const prompt = `${visual.prompt || visual.desc}, ${style} style, ${imageStyle}, professional, high resolution, no text`;
            const imageUrl = await generateWithVertexAI(prompt, 'imagen-3.0-generate-001', {
                aspectRatio: targetRatio
            });
            assetMap[visual.id] = imageUrl;
        } catch (err) {
            console.warn(`[UniversalCreator] ⚠️ Image failed for ${visual.id}, using fallback.`);
            const keyword = encodeURIComponent(topic.split(' ')[0] || 'business');
            assetMap[visual.id] = `https://source.unsplash.com/${fallbackDim}/?${keyword},tech&sig=${Math.random()}`;
        }
    }));

    // 3. HTML ASSEMBLY
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
            systemRules: "Style: Clean, corporate, trustworthy. Features: White backgrounds, solid cards, deep navy/blue accents."
        },
        'disruptor': {
            name: 'Disruptor (Bold)',
            style: `
                body { background-color: #000000; color: #ffffff; }
                .glass { background: #111; border: 2px solid #fff; }
                .accent-text { color: #facc15; text-transform: uppercase; font-weight: 900; }
                .card-hover:hover { background: #facc15; color: #000; border-color: #000; }
            `,
            systemRules: "Style: Brutalist, high-contrast, energetic. Features: Black & White with Yellow/Neon accent."
        },
        'minimalist': {
            name: 'Minimalist (Artistic)',
            style: `
                body { background-color: #f5f5f5; color: #262626; }
                .glass { background: transparent; border: 1px solid #d4d4d4; }
                .accent-text { color: #000; font-weight: 300; letter-spacing: 0.1em; }
                .card-hover:hover { border-color: #000; }
            `,
            systemRules: "Style: High-whitespace, thin lines, minimalist. Background: bg-stone-50."
        },
        'journalistic': {
            name: 'Journalistic (Word Doc)',
            style: `
                body { font-family: 'EB Garamond', serif; background-color: #fff; color: #000; }
                .document-body { max-width: 800px; margin: 0 auto; padding: 60px 40px; }
                .headline { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 2.25rem; line-height: 1.2; margin-bottom: 20px; }
                .subheadline { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 1.25rem; color: #444; margin-bottom: 40px; }
                p { margin-bottom: 1.5rem; line-height: 1.8; font-size: 1.15rem; }
                img { width: 100%; border-radius: 4px; margin: 40px 0; }
            `,
            systemRules: "Style: Minimalist Word-processor document. NO buttons. NO hero sections."
        }
    };

    // Style Mapping
    const styleMap = {
        'modern tech': 'visionary',
        'futuristic': 'visionary',
        'minimalist': 'minimalist',
        'corporate': 'executive',
        'creative bold': 'disruptor',
        'luxury': 'visionary',
        'modern': 'visionary'
    };

    const isNews = normalizedType.includes('press') || normalizedType.includes('news');
    let selectedArchetype = isNews ? archetypes.journalistic : (archetypes[styleMap[style.toLowerCase()]] || archetypes.visionary);

    let finalSystemPrompt, finalTaskPrompt;

    if (isNews) {
        finalSystemPrompt = `
    You are a SENIOR NEWS EDITOR. Write a PROFESSIONAL PRESS RELEASE in a minimalist Word-processor format.
    
    === RULES ===
    - NO Tailwind layouts (grid/flex) for overall document flow.
    - NO hero sections or modern UI buttons.
    - Result MUST look like a printed page.
    - Use {{PR_HERO}} and {{PR_DETAIL_1}} for images.
    
    === HEAD ===
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond&family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>${selectedArchetype.style}</style>
    </head>
    `;

        finalTaskPrompt = `
    Generate the Press Release for: ${topic}
    News Category: ${newsType}
    Context: ${context || 'N/A'}

    === OUTPUT RULES ===
    - Wrap in <div class="document-body">.
    - Use <h1 class="headline"> and <h2 class="subheadline">.
    - Continuous document form.
    
    Return pure HTML.
    `;
    } else {
        finalSystemPrompt = `
    You are a WORLD-CLASS UI/UX Designer.
    Apply the DESIGN ARCHETYPE: ${selectedArchetype.name}
    Rules: ${selectedArchetype.systemRules}
    
    === ICON LIBRARY ===
    - ONLY use Font Awesome icons (https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css).
    
    === HEAD ===
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
            * { font-family: 'Inter', sans-serif; }
            ${selectedArchetype.style}
            .animate-fade-in { animation: fadeIn 0.6s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    </head>
    `;

        finalTaskPrompt = `
    ${strategy.htmlTask}
    TOPIC: ${topic}
    STYLE: ${style} (Archetype: ${selectedArchetype.name})
    IMAGE TOKENS: [${visualPlan.visuals.map(v => v.id).join(', ')}]
    
    === DESIGN REQUIREMENTS ===
    1. EXTRAPOLATE premium copy from context.
    2. USE {{token_id}} for images.
    3. ONLY use Font Awesome (<i class="fa-solid fa-..."></i>).
    4. SLIDE PDF SUPPORT: Ensure each <section> is a discrete visual unit for Pitch Decks.
    
    ${customPrompt ? `💬 USER REQUEST: ${customPrompt}` : ''}
    
    Return pure HTML starting with <!DOCTYPE html>.
    `;
    }

    console.log(`[UniversalCreator] 🏗️ Assembly Mode: ${plan.useArena ? 'ARENA (Adversarial)' : 'SIMPLE'}`);
    let htmlResult;

    if (plan.useArena) {
        try {
            console.log('[UniversalCreator] 🛡️ Arena: Drafting...');
            const draft = await executeLLM(finalSystemPrompt, finalTaskPrompt);

            console.log('[UniversalCreator] 🛡️ Arena: Auditing...');
            const auditPrompt = `
            Critique this ${normalizedType} HTML. Provide 3 specific improvements for Copy, Visuals, and Branding.
            BE BRIEF. HTML snippet provided below.
            ${draft.substring(0, 3000)}
            `;
            const critique = await executeLLM("You are a stern creative director.", auditPrompt);

            console.log('[UniversalCreator] 🛡️ Arena: Synthesizing...');
            const synthesisPrompt = `
            ${finalTaskPrompt}
            === FEEDBACK TO ADDRESS ===
            ${critique}
            Refine the draft and deliver the FINAL premium HTML.
            `;
            htmlResult = await executeLLM(finalSystemPrompt, synthesisPrompt);
        } catch (err) {
            console.warn('[UniversalCreator] Arena failed, fallback to simple.');
            htmlResult = await executeLLM(finalSystemPrompt, finalTaskPrompt);
        }
    } else {
        htmlResult = await executeLLM(finalSystemPrompt, finalTaskPrompt);
    }

    // 4. CLEANUP & INJECTION
    htmlResult = String(htmlResult || '').replace(/```html/g, '').replace(/```/g, '').trim();

    // Token Replacement
    console.log('[UniversalCreator] 🔗 Injecting asset URLs...');
    Object.keys(assetMap).forEach(key => {
        const urlValue = String(assetMap[key] || '');
        const regex = new RegExp(`{{${key}}}`, 'g');
        const regexSpaces = new RegExp(`{{ ${key} }}`, 'g');
        htmlResult = htmlResult.replace(regex, urlValue).replace(regexSpaces, urlValue);
    });

    // Fallback images
    const fallbackKeyword = encodeURIComponent(topic.split(' ')[0] || 'tech');
    htmlResult = htmlResult.replace(/https?:\/\/via\.placeholder\.com[^\s"')]+/g, `https://source.unsplash.com/${fallbackDim}/?${fallbackKeyword},pro&sig=${Math.random()}`);
    htmlResult = htmlResult.replace(/{{[A-Z_0-9]+}}/g, `https://source.unsplash.com/${fallbackDim}/?${fallbackKeyword},abstract&sig=${Math.random()}`);

    console.log('[UniversalCreator] ✅ HTML generation complete.');
    return htmlResult;
}

module.exports = { createCreativeContent };
