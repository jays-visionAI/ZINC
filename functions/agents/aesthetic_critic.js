const { GoogleGenerativeAI } = require('@google/generative-ai');
const { captureScreenshot } = require('../utils/screenshotService');
const admin = require('firebase-admin');

/**
 * Aesthetic Critic Agent
 * Uses Gemini 2.0 Flash Vision to critique UI/UX.
 */
exports.analyzeAesthetic = async (request) => {
    // Handle both v1 (data, context) and v2 (request) signatures for compatibility
    let data;
    if (request.data) {
        data = request.data; // v2
    } else {
        data = request; // v1 or direct call
    }

    const { url, projectId, targetAudience, designGoals } = data;

    if (!url) {
        throw new Error('URL is required for Aesthetic Analysis');
    }

    // [DEBUG] Bypass Puppeteer to test connection/CORS
    // Remove this block after confirming connection works
    /*
    return {
        success: true,
        analysis: {
            aesthetic_score: 99,
            overall_impression: "Connection Works! (Puppeteer Bypassed)",
            color_palette_analysis: "N/A",
            typography_analysis: "N/A",
            key_issues: ["This is a test response"],
            actionable_recommendations: ["Re-enable Puppeteer"]
        }
    };
    */

    /* Original Logic below */

    console.log(`[Aesthetic Critic] Starting analysis for: ${url}`);

    try {
        // 1. Capture Screenshot
        // Changing to try-catch the screenshot service specifically to see if that is the crash point
        let base64Image;
        try {
            console.log(`[Aesthetic Critic] Capturing screenshot for ${url}...`);
            base64Image = await captureScreenshot(url, { fullPage: false }); // Viewport only for speed
        } catch (err) {
            console.error("[Aesthetic Critic] Screenshot failed:", err);
            return {
                success: false,
                error: "Screenshot failed: " + err.message
            };
        }

        // 2. Prepare Gemini 2.0 Flash
        // Retrieve API Key (Assuming same as system provider for 'gemini')
        const db = admin.firestore();
        const providerDoc = await db.collection('systemLLMProviders').doc('gemini').get();
        const apiKey = providerDoc.data()?.apiKey;

        if (!apiKey) throw new Error('Gemini API Key not found in systemLLMProviders');

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use Gemini 1.5 Flash or 2.0 Flash Exp (check availability)
        // Fallback to 1.5 Pro if 2.0 not stable in libs
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. Construct Payload
        const prompt = `
            You are the "Aesthetic Critic", a world-class UI/UX designer and brand strategist.
            Analyze the attached screenshot of a web page.
            
            Context:
            - Target Audience: ${targetAudience || 'General Public'}
            - Design Goals: ${designGoals || 'Modern, clean, and high-conversion'}

            Provide a structured critique in JSON format with the following fields:
            - aesthetic_score (0-100)
            - color_palette_analysis (string)
            - typography_analysis (string)
            - key_issues (array of strings)
            - actionable_recommendations (array of strings, specific CSS/layout advises)
            - overall_impression (string)
            
            Be critical but constructive. Focus on visual hierarchy, spacing (whitespace), contrast, and modern design trends.
        `;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/png"
            }
        };

        // 4. Call Vision API
        const result = await model.generateContent([prompt, imagePart]);
        let response;
        try {
            response = await result.response;
        } catch (respErr) {
            console.error('[Aesthetic Critic] Response blocked or SDK error:', respErr.message);
            return {
                success: false,
                error: "Analysis blocked by safety filters or SDK constraints: " + respErr.message
            };
        }

        let responseText = '';
        try {
            responseText = response.text();
        } catch (textErr) {
            console.warn('[Aesthetic Critic] response.text() failed, using potential parts:', textErr.message);
            responseText = response.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
        }

        if (!responseText) {
            throw new Error('Empthy or blocked response from Gemini Vision');
        }

        console.log("[Aesthetic Critic] Raw Response length:", responseText.length);

        // 5. Parse JSON (Handle markdown code blocks)
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleanedText);

        // 6. Return Result
        return {
            success: true,
            url,
            analysis,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('[Aesthetic Critic] Error:', error);
        return { success: false, error: error.message };
    }
};
