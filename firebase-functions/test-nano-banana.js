/**
 * Nano Banana Pro Image Generation Unit Test
 * 
 * Usage:
 *   1. Set your Google API key: export GOOGLE_API_KEY="your-api-key"
 *   2. Run: node test-nano-banana.js
 * 
 * Or get key from Firebase:
 *   node test-nano-banana.js --firebase
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Get API key from environment or Firebase
async function getApiKey() {
    if (process.env.GOOGLE_API_KEY) {
        return process.env.GOOGLE_API_KEY;
    }

    // Try to get from Firebase Admin if --firebase flag is passed
    if (process.argv.includes('--firebase')) {
        try {
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp();
            }
            const db = admin.firestore();
            const snapshot = await db.collection('systemLLMProviders')
                .where('provider', 'in', ['google', 'gemini'])
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return doc.data().apiKey;
            }
        } catch (error) {
            console.error('Firebase error:', error.message);
        }
    }

    return null;
}

// Test Nano Banana Pro image generation
async function testNanoBananaPro(apiKey, prompt) {
    console.log('\n🧪 Testing Nano Banana Pro Image Generation...\n');
    console.log(`📝 Prompt: "${prompt}"`);
    console.log('─'.repeat(60));

    const modelsToTest = [
        'gemini-2.5-flash-image',      // Nano Banana
        'gemini-3-pro-image-preview',  // Nano Banana Pro
        'gemini-2.0-flash-exp'         // Legacy
    ];

    for (const modelName of modelsToTest) {
        console.log(`\n🔄 Testing model: ${modelName}`);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            const startTime = Date.now();
            const response = await axios.post(url, {
                contents: [{
                    parts: [{ text: `Generate a high-quality image: ${prompt}. Style: Professional, no text or logos.` }]
                }],
                generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT'],
                    temperature: 1
                }
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000
            });
            const elapsed = Date.now() - startTime;

            const parts = response.data?.candidates?.[0]?.content?.parts || [];

            // Check for image
            let foundImage = false;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                    foundImage = true;
                    const imageSize = Math.round(part.inlineData.data.length / 1024);
                    console.log(`   ✅ SUCCESS! Image generated (${imageSize} KB, ${elapsed}ms)`);
                    console.log(`   📷 MIME Type: ${part.inlineData.mimeType}`);

                    // Save image to file
                    const filename = `test-image-${modelName.replace(/[^a-z0-9]/gi, '-')}.png`;
                    const buffer = Buffer.from(part.inlineData.data, 'base64');
                    fs.writeFileSync(filename, buffer);
                    console.log(`   💾 Saved to: ${filename}`);
                    break;
                }
            }

            if (!foundImage) {
                const textPart = parts.find(p => p.text);
                if (textPart) {
                    console.log(`   ⚠️ RETURNED TEXT instead of image:`);
                    console.log(`   "${textPart.text.substring(0, 150)}..."`);
                } else {
                    console.log(`   ❌ EMPTY RESPONSE - No image or text returned`);
                }
            }

        } catch (error) {
            const status = error.response?.status;
            const errorMsg = error.response?.data?.error?.message || error.message;

            if (status === 404) {
                console.log(`   ❌ MODEL NOT FOUND (404) - Model may not be available`);
            } else if (status === 429) {
                console.log(`   ❌ QUOTA EXCEEDED (429) - Rate limit hit`);
            } else if (status === 403) {
                console.log(`   ❌ ACCESS DENIED (403) - API key issue or model access`);
            } else if (status === 400) {
                console.log(`   ❌ BAD REQUEST (400) - ${errorMsg}`);
            } else {
                console.log(`   ❌ ERROR (${status}): ${errorMsg}`);
            }
        }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('🧪 Test Complete\n');
}

// Main
async function main() {
    console.log('═'.repeat(60));
    console.log('   🍌 Nano Banana Pro Image Generation Test');
    console.log('═'.repeat(60));

    const apiKey = await getApiKey();

    if (!apiKey) {
        console.error('\n❌ No API key found!');
        console.error('   Set GOOGLE_API_KEY environment variable or use --firebase flag');
        console.error('\n   Example:');
        console.error('   export GOOGLE_API_KEY="your-api-key"');
        console.error('   node test-nano-banana.js');
        process.exit(1);
    }

    console.log(`\n✅ API Key found: ${apiKey.substring(0, 10)}...`);

    const testPrompt = process.argv[2] && !process.argv[2].startsWith('--')
        ? process.argv[2]
        : 'A modern tech startup office with glass walls, plants, and people collaborating';

    await testNanoBananaPro(apiKey, testPrompt);
}

main().catch(console.error);
