const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

/**
 * Capture a screenshot of a given URL.
 * Optimized for Firebase Cloud Functions (Gen 2).
 * 
 * @param {string} url - The URL to capture.
 * @param {Object} options - Options for capture (viewport, fullPage).
 * @returns {Promise<Buffer>} - The image buffer (PNG).
 */
exports.captureScreenshot = async (url, options = {}) => {
    let browser = null;
    try {
        console.log(`[ScreenshotService] Launching browser for: ${url}`);

        // Use sparticuz/chromium for AWS Lambda/Cloud Functions environment
        // Local fallback to standard puppeteer if not in cloud
        const executablePath = await chromium.executablePath() || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();

        // Set Viewport (Default to Desktop)
        await page.setViewport({
            width: options.width || 1280,
            height: options.height || 800,
            deviceScaleFactor: options.deviceScaleFactor || 1
        });

        console.log('[ScreenshotService] Navigating...');
        await page.goto(url, {
            waitUntil: 'networkidle2', // Wait for basic network activity to settle
            timeout: 30000
        });

        console.log('[ScreenshotService] Capturing...');
        const screenshotBuffer = await page.screenshot({
            fullPage: options.fullPage !== false, // Default to full page
            encoding: 'base64' // Return base64 string for direct LLM injection
        });

        console.log('[ScreenshotService] Capture success.');
        return screenshotBuffer;

    } catch (error) {
        console.error('[ScreenshotService] Critical Error:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
