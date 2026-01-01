/**
 * 🎨 Template Archive System
 * Pre-designed HTML templates with placeholder replacement
 */

// Template definitions with metadata
const TEMPLATE_ARCHIVE = {
    event_poster: {
        modern_tech: {
            name: 'Modern Tech',
            description: 'Clean, futuristic design with gradient accents',
            backgroundPrompt: 'Abstract technology background with subtle geometric shapes, dark blue gradient, no text, clean and minimal, high quality',
            placeholders: ['EVENT_TYPE', 'HEADLINE', 'SUBTEXT', 'DATE', 'LOCATION', 'CTA_TEXT']
        },
        corporate_elegant: {
            name: 'Corporate Elegant',
            description: 'Luxurious gold accents with serif typography',
            backgroundPrompt: 'Elegant dark marble texture with subtle gold veins, luxury atmosphere, no text, sophisticated and professional',
            placeholders: ['EVENT_TYPE', 'HEADLINE', 'SUBTEXT', 'DATE', 'LOCATION', 'CTA_TEXT']
        },
        cyberpunk: {
            name: 'Cyberpunk',
            description: 'Neon glow effects with glitch aesthetics',
            backgroundPrompt: 'Cyberpunk cityscape at night, neon lights, digital rain effect, dark with cyan and pink accents, no text, futuristic',
            placeholders: ['EVENT_TYPE', 'HEADLINE', 'SUBTEXT', 'DATE', 'LOCATION', 'CTA_TEXT']
        }
    },
    invitation: {
        formal_gold: {
            name: 'Formal Gold',
            description: 'Elegant invitation with gold decorations',
            backgroundPrompt: 'Soft cream paper texture with subtle gold leaf pattern, elegant and formal, no text',
            placeholders: ['EVENT_TYPE', 'HEADLINE', 'SUBTEXT', 'DATE', 'LOCATION', 'CTA_TEXT']
        }
    },
    social_banner: {
        bold_gradient: {
            name: 'Bold Gradient',
            description: 'Eye-catching gradient background',
            backgroundPrompt: 'Vibrant gradient background, purple to orange, abstract fluid shapes, no text, modern and bold',
            placeholders: ['HEADLINE', 'SUBTEXT', 'CTA_TEXT']
        }
    }
};

// Template HTML content (loaded from files or embedded)
const TEMPLATE_HTML = {
    'event_poster/modern_tech': `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        .gradient-overlay { background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%); }
        .glow-text { text-shadow: 0 0 40px rgba(99, 102, 241, 0.5); }
        .accent-line { width: 80px; height: 4px; background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%); }
    </style>
</head>
<body>
    <div class="relative w-full min-h-screen" style="aspect-ratio: 9/16; max-width: 450px; margin: 0 auto;">
        <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('{{BACKGROUND}}');"></div>
        <div class="absolute inset-0 gradient-overlay"></div>
        <div class="relative z-10 flex flex-col h-full p-8 text-white">
            <div class="mb-auto">
                <span class="inline-block px-4 py-2 text-xs font-semibold tracking-widest uppercase bg-white/10 backdrop-blur-sm rounded-full border border-white/20">{{EVENT_TYPE}}</span>
            </div>
            <div class="flex-1 flex flex-col justify-center items-center text-center py-12">
                <div class="accent-line mx-auto mb-6"></div>
                <h1 class="text-4xl md:text-5xl font-extrabold leading-tight mb-4 glow-text" style="font-family: 'Space Grotesk', sans-serif;">{{HEADLINE}}</h1>
                <p class="text-lg text-white/80 max-w-xs leading-relaxed mb-8">{{SUBTEXT}}</p>
                <div class="accent-line mx-auto mb-8"></div>
                <div class="space-y-2 text-sm text-white/70">
                    <div class="flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                        <span>{{DATE}}</span>
                    </div>
                    <div class="flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                        <span>{{LOCATION}}</span>
                    </div>
                </div>
            </div>
            <div class="mt-auto flex flex-col items-center gap-4">
                <a href="#" class="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full font-semibold text-sm uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-indigo-500/30">{{CTA_TEXT}}</a>
                <div class="text-[10px] text-white/30 tracking-widest uppercase">Powered by ZYNK</div>
            </div>
        </div>
    </div>
</body>
</html>`,

    'event_poster/corporate_elegant': `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        .serif-title { font-family: 'Playfair Display', serif; }
        .gold-accent { color: #D4AF37; }
        .gold-border { border-color: #D4AF37; }
        .gold-bg { background-color: #D4AF37; }
    </style>
</head>
<body>
    <div class="relative w-full min-h-screen" style="aspect-ratio: 9/16; max-width: 450px; margin: 0 auto;">
        <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('{{BACKGROUND}}');"></div>
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="absolute inset-4 border-2 gold-border opacity-50"></div>
        <div class="absolute inset-8 border gold-border opacity-30"></div>
        <div class="relative z-10 flex flex-col h-full p-12 text-white">
            <div class="text-center mb-auto">
                <div class="inline-flex items-center gap-3">
                    <span class="h-px w-8 gold-bg"></span>
                    <span class="text-xs tracking-[0.3em] uppercase gold-accent">{{EVENT_TYPE}}</span>
                    <span class="h-px w-8 gold-bg"></span>
                </div>
            </div>
            <div class="flex-1 flex flex-col justify-center items-center text-center">
                <div class="gold-accent text-3xl mb-6">✦</div>
                <h1 class="serif-title text-4xl md:text-5xl font-bold leading-tight mb-6 gold-accent">{{HEADLINE}}</h1>
                <p class="text-base text-white/80 max-w-xs leading-relaxed mb-8 italic">{{SUBTEXT}}</p>
                <div class="flex items-center gap-4 mb-8">
                    <span class="h-px w-12 gold-bg opacity-50"></span>
                    <div class="gold-accent text-xl">◆</div>
                    <span class="h-px w-12 gold-bg opacity-50"></span>
                </div>
                <div class="space-y-3 text-sm">
                    <div class="gold-accent font-medium tracking-wider">{{DATE}}</div>
                    <div class="text-white/70">{{LOCATION}}</div>
                </div>
            </div>
            <div class="mt-auto flex flex-col items-center gap-6">
                <a href="#" class="px-10 py-3 border-2 gold-border gold-accent text-sm uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-all duration-300">{{CTA_TEXT}}</a>
                <div class="text-[10px] text-white/20 tracking-widest uppercase">Powered by ZYNK</div>
            </div>
        </div>
    </div>
</body>
</html>`,

    'event_poster/cyberpunk': `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0a0a0a; }
        .neon-text { text-shadow: 0 0 10px #00ffcc, 0 0 20px #00ffcc, 0 0 40px #00ffcc; }
        .neon-pink { text-shadow: 0 0 10px #ff0080, 0 0 20px #ff0080; }
        .neon-border { box-shadow: 0 0 10px #00ffcc, inset 0 0 10px rgba(0, 255, 204, 0.1); }
        .glitch-line { background: linear-gradient(90deg, transparent 0%, #00ffcc 50%, transparent 100%); height: 1px; }
    </style>
</head>
<body>
    <div class="relative w-full min-h-screen" style="aspect-ratio: 9/16; max-width: 450px; margin: 0 auto; background: #0a0a0a;">
        <div class="absolute inset-0 bg-cover bg-center opacity-40" style="background-image: url('{{BACKGROUND}}');"></div>
        <div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);"></div>
        <div class="relative z-10 flex flex-col h-full p-8 text-white">
            <div class="mb-auto flex justify-between items-start">
                <span class="text-xs font-mono text-[#00ffcc] tracking-widest">{{EVENT_TYPE}}</span>
                <span class="text-xs font-mono text-[#ff0080]">▲ LIVE</span>
            </div>
            <div class="flex-1 flex flex-col justify-center py-12">
                <div class="glitch-line w-full mb-8"></div>
                <h1 class="text-5xl md:text-6xl font-bold leading-none mb-4 neon-text" style="font-family: 'Space Grotesk', sans-serif; color: #00ffcc;">{{HEADLINE}}</h1>
                <p class="text-lg text-white/70 max-w-sm leading-relaxed mb-8 font-mono">{{SUBTEXT}}</p>
                <div class="glitch-line w-2/3 mb-8"></div>
                <div class="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div class="p-4 border border-[#00ffcc]/30 neon-border">
                        <div class="text-[#00ffcc] mb-1">DATE</div>
                        <div class="text-white">{{DATE}}</div>
                    </div>
                    <div class="p-4 border border-[#ff0080]/30" style="box-shadow: 0 0 10px #ff0080, inset 0 0 10px rgba(255, 0, 128, 0.1);">
                        <div class="text-[#ff0080] mb-1">LOCATION</div>
                        <div class="text-white">{{LOCATION}}</div>
                    </div>
                </div>
            </div>
            <div class="mt-auto flex flex-col items-center gap-4">
                <a href="#" class="w-full py-4 border-2 border-[#00ffcc] text-[#00ffcc] text-center font-bold uppercase tracking-widest hover:bg-[#00ffcc] hover:text-black transition-all duration-300 neon-border">{{CTA_TEXT}}</a>
                <div class="text-[10px] text-white/20 font-mono tracking-widest">// ZYNK.SYSTEM</div>
            </div>
        </div>
    </div>
</body>
</html>`
};

/**
 * Get template HTML and fill placeholders
 */
function getTemplateWithContent(templateType, templateStyle, content, backgroundUrl) {
    const templateKey = `${templateType}/${templateStyle}`;
    let html = TEMPLATE_HTML[templateKey];

    if (!html) {
        // Fallback to default template
        html = TEMPLATE_HTML['event_poster/modern_tech'];
    }

    // Replace placeholders
    html = html.replace(/\{\{BACKGROUND\}\}/g, backgroundUrl || '');
    html = html.replace(/\{\{HEADLINE\}\}/g, content.headline || 'Event Title');
    html = html.replace(/\{\{SUBTEXT\}\}/g, content.subtext || '');
    html = html.replace(/\{\{EVENT_TYPE\}\}/g, content.eventType || 'Event');
    html = html.replace(/\{\{DATE\}\}/g, content.date || '');
    html = html.replace(/\{\{LOCATION\}\}/g, content.location || '');
    html = html.replace(/\{\{CTA_TEXT\}\}/g, content.ctaText || 'Learn More');

    return html;
}

/**
 * Get background prompt for a template
 */
function getBackgroundPrompt(templateType, templateStyle, topic) {
    const meta = TEMPLATE_ARCHIVE[templateType]?.[templateStyle];
    if (meta) {
        return `${meta.backgroundPrompt}, related to: ${topic}`;
    }
    return `Abstract professional background related to ${topic}, no text, high quality`;
}

/**
 * List available templates
 */
function listTemplates(templateType) {
    const templates = TEMPLATE_ARCHIVE[templateType];
    if (!templates) return [];

    return Object.entries(templates).map(([key, value]) => ({
        key,
        ...value
    }));
}

module.exports = {
    TEMPLATE_ARCHIVE,
    TEMPLATE_HTML,
    getTemplateWithContent,
    getBackgroundPrompt,
    listTemplates
};
