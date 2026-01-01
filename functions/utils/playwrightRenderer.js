/**
 * 🖨️ Playwright PDF Renderer
 * Server-side PDF generation using Playwright for true WYSIWYG output
 */

const playwright = require('playwright-core');

/**
 * Render HTML to PDF using Playwright
 * @param {string} htmlContent - Full HTML document string
 * @param {Object} options - Rendering options
 * @returns {Promise<Buffer>} - PDF as Buffer
 */
async function renderHTMLToPDF(htmlContent, options = {}) {
    const {
        pageFormat = 'A4',
        landscape = false,
        printBackground = true,
        preferCSSPageSize = true,
        margin = { top: '0px', right: '0px', bottom: '0px', left: '0px' },
        timeout = 30000,
        waitForReadyGate = true
    } = options;

    console.log('[PlaywrightRenderer] 🚀 Starting PDF generation...');
    console.log(`[PlaywrightRenderer] Options: format=${pageFormat}, landscape=${landscape}`);

    let browser = null;
    let page = null;

    try {
        // Launch browser - use chromium from environment or bundled
        browser = await playwright.chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=none'
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 1024 },
            deviceScaleFactor: 2 // High DPI for better quality
        });

        page = await context.newPage();

        // Set content
        console.log('[PlaywrightRenderer] 📄 Loading HTML content...');
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle',
            timeout: timeout
        });

        // Wait for ready-gate if enabled
        if (waitForReadyGate) {
            console.log('[PlaywrightRenderer] ⏳ Waiting for render-ready signal...');
            try {
                await page.waitForFunction(
                    () => window.__ZYNK_RENDER_READY__ === true,
                    { timeout: 15000 }
                );
                console.log('[PlaywrightRenderer] ✅ Render-ready signal received');
            } catch (e) {
                console.warn('[PlaywrightRenderer] ⚠️ Ready-gate timeout, proceeding anyway...');
            }
        }

        // Wait for fonts to load
        console.log('[PlaywrightRenderer] 🔤 Waiting for fonts...');
        await page.evaluate(() => document.fonts.ready);

        // Wait for images to load
        console.log('[PlaywrightRenderer] 🖼️ Waiting for images...');
        await page.evaluate(async () => {
            const images = Array.from(document.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Resolve even on error to not block
                    // Timeout fallback
                    setTimeout(resolve, 5000);
                });
            }));
        });

        // Small delay for any final rendering
        await page.waitForTimeout(500);

        // Generate PDF
        console.log('[PlaywrightRenderer] 📑 Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: pageFormat,
            landscape: landscape,
            printBackground: printBackground,
            preferCSSPageSize: preferCSSPageSize,
            margin: margin,
            displayHeaderFooter: false
        });

        console.log(`[PlaywrightRenderer] ✅ PDF generated: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
        return pdfBuffer;

    } catch (error) {
        console.error('[PlaywrightRenderer] ❌ PDF generation failed:', error);
        throw error;
    } finally {
        if (page) await page.close().catch(() => { });
        if (browser) await browser.close().catch(() => { });
    }
}

/**
 * Inject ready-gate script into HTML
 * @param {string} htmlContent - Original HTML
 * @returns {string} - HTML with ready-gate script
 */
function injectReadyGate(htmlContent) {
    const readyGateScript = `
<script>
    window.__ZYNK_RENDER_READY__ = false;
    window.addEventListener('load', function() {
        Promise.all([
            document.fonts.ready,
            Promise.all(Array.from(document.images).map(function(img) {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise(function(resolve) {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 5000);
                });
            }))
        ]).then(function() {
            window.__ZYNK_RENDER_READY__ = true;
            console.log('[ZYNK] Render ready signal set');
        });
    });
</script>
`;

    // Insert before </head> or at the start of <body>
    if (htmlContent.includes('</head>')) {
        return htmlContent.replace('</head>', readyGateScript + '</head>');
    } else if (htmlContent.includes('<body')) {
        return htmlContent.replace('<body', readyGateScript + '<body');
    } else {
        return readyGateScript + htmlContent;
    }
}

module.exports = {
    renderHTMLToPDF,
    injectReadyGate
};
