/**
 * 🖨️ Serverless PDF Renderer
 * Uses @sparticuz/chromium (optimized for Cloud Functions) + puppeteer-core
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

/**
 * Render HTML to PDF using Puppeteer with serverless Chromium
 * @param {string} htmlContent - Full HTML document string
 * @param {Object} options - Rendering options
 * @returns {Promise<Buffer>} - PDF as Buffer
 */
async function renderHTMLToPDF(htmlContent, options = {}) {
    const {
        pageFormat = 'A4',
        landscape = false,
        printBackground = true,
        timeout = 60000
    } = options;

    console.log('[PDFRenderer] 🚀 Starting PDF generation...');
    console.log(`[PDFRenderer] Options: format=${pageFormat}, landscape=${landscape}`);

    let browser = null;

    try {
        // Launch browser with @sparticuz/chromium
        browser = await puppeteer.launch({
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });

        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({
            width: 1280,
            height: 1024,
            deviceScaleFactor: 2
        });

        // Set content
        console.log('[PDFRenderer] 📄 Loading HTML content...');
        await page.setContent(htmlContent, {
            waitUntil: ['networkidle2', 'domcontentloaded'],
            timeout: timeout
        });

        // Wait for fonts
        console.log('[PDFRenderer] 🔤 Waiting for fonts...');
        await page.evaluate(() => document.fonts.ready);

        // Wait for images
        console.log('[PDFRenderer] 🖼️ Waiting for images...');
        await page.evaluate(async () => {
            const images = Array.from(document.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 5000);
                });
            }));
        });

        // Small delay for final rendering
        await new Promise(r => setTimeout(r, 500));

        // Generate PDF
        console.log('[PDFRenderer] 📑 Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: pageFormat,
            landscape: landscape,
            printBackground: printBackground,
            preferCSSPageSize: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
            displayHeaderFooter: false
        });

        console.log(`[PDFRenderer] ✅ PDF generated: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
        return pdfBuffer;

    } catch (error) {
        console.error('[PDFRenderer] ❌ PDF generation failed:', error);
        throw error;
    } finally {
        if (browser) await browser.close().catch(() => { });
    }
}

/**
 * Inject cleanup styles for PDF (hide UI elements)
 */
function injectReadyGate(htmlContent) {
    const pdfCleanupCSS = `
<style>
    .refine-btn, .img-overlay, .editor-status-badge, [id*="refine-btn"],
    button, .no-print { 
        display: none !important; 
        visibility: hidden !important;
    }
    * { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
    }
    @page { margin: 0; }
</style>
`;

    if (htmlContent.includes('</head>')) {
        return htmlContent.replace('</head>', pdfCleanupCSS + '</head>');
    } else if (htmlContent.includes('<body')) {
        return htmlContent.replace('<body', pdfCleanupCSS + '<body');
    }
    return pdfCleanupCSS + htmlContent;
}

module.exports = {
    renderHTMLToPDF,
    injectReadyGate
};
