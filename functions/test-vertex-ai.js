/**
 * Vertex AI Image Generation Test Script
 * Run: node test-vertex-ai.js
 */

const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

async function testVertexAI() {
    const projectId = process.env.GCLOUD_PROJECT || 'zinc-c790f';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; // Use stable model for testing

    console.log('🚀 Testing Vertex AI Image Generation...');
    console.log(`   Project: ${projectId}`);
    console.log(`   Model: ${modelId}`);
    console.log(`   Location: ${location}`);
    console.log('');

    try {
        // 1. Get Access Token
        console.log('1️⃣ Getting Access Token...');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        console.log('   ✅ Access Token obtained');

        // 2. Call Vertex AI
        console.log('2️⃣ Calling Vertex AI Imagen API...');
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

        const payload = {
            instances: [
                { prompt: "A modern office building with glass windows, professional style, high quality" }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9"
            }
        };

        const response = await axios.post(endpoint, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken.token || accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        console.log('   ✅ API Response received');

        // 3. Check Response
        console.log('3️⃣ Parsing Response...');
        const predictions = response.data.predictions;

        if (predictions && predictions.length > 0) {
            const prediction = predictions[0];
            const imageBase64 = prediction.bytesBase64Encoded;

            if (imageBase64) {
                console.log('   ✅ Image Generated Successfully!');
                console.log(`   📏 Base64 Length: ${imageBase64.length} characters`);
                console.log(`   📊 Approx Size: ${Math.round(imageBase64.length * 0.75 / 1024)} KB`);
                console.log('');
                console.log('🎉 VERTEX AI IS WORKING!');
            } else {
                console.log('   ❌ No image data in response');
                console.log('   Response:', JSON.stringify(prediction, null, 2));
            }
        } else {
            console.log('   ❌ No predictions in response');
            console.log('   Response:', JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.log('');
        console.log('❌ VERTEX AI TEST FAILED');
        console.log('');

        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }

        console.log('');
        console.log('💡 Possible Solutions:');
        console.log('   1. Enable Vertex AI API in Google Cloud Console');
        console.log('   2. Ensure billing is enabled for the project');
        console.log('   3. Check if Imagen API is available in your region');
        console.log('   4. Run: gcloud auth application-default login');
    }
}

testVertexAI();
