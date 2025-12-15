/* functions/scripts/verify_gemini.js */
// Run this script from the project root: node functions/scripts/verify_gemini.js
// Or from functions dir: node scripts/verify_gemini.js

let GoogleGenerativeAI;
try {
    // Try resolving from local node_modules or parent
    GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (e) {
    try {
        GoogleGenerativeAI = require('../node_modules/@google/generative-ai').GoogleGenerativeAI;
    } catch (e2) {
        console.error('❌ Could not load @google/generative-ai. Ensure dependencies are installed.');
        process.exit(1);
    }
}

// ==========================================
// 🔑 PASTE YOUR GEMINI API KEY BELOW
// ==========================================
const API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

async function verify() {
    if (!API_KEY || API_KEY.includes('YOUR_GEMINI')) {
        console.log('\n⚠️  API Key Required');
        console.log('   Please edit "functions/scripts/verify_gemini.js" and paste your Google AI Studio Key.');
        return;
    }

    console.log(`\n🔍 Verifying Gemini Models availability...\n`);

    const genAI = new GoogleGenerativeAI(API_KEY);

    // List of models to test (Prioritizing newer/faster models)
    const models = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro'
    ];

    for (const modelName of models) {
        process.stdout.write(`Testing [ ${modelName.padEnd(20)} ] ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Reply with "OK"');
            const text = result.response.text().trim();
            console.log(`✅ Success! (Response: ${text})`);
        } catch (err) {
            let msg = err.message || 'Unknown Error';
            if (msg.includes('404')) msg = 'Not Found (404)';
            else if (msg.includes('400')) msg = 'Bad Request (400)';
            else if (msg.includes('403')) msg = 'Permission Denied (403)';
            else if (msg.includes('fetch failed')) msg = 'Network Error (Fetch Failed)';

            console.log(`❌ Failed (${msg})`);
        }
    }
    console.log('\nDone.');
}

verify();
