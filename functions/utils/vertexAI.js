const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const admin = require('firebase-admin');

// Ensure Firebase is initialized (it usually is in the main process, but good to be safe if used standalone)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

/**
 * Helper: Get Google Cloud Access Token (for Vertex AI)
 * Uses Application Default Credentials (ADC)
 */
async function getVertexAccessToken() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token || accessToken;
}

/**
 * Upload Base64 Image to Firebase Storage
 */
async function uploadBase64ToStorage(base64String, modelName) {
    // TEMPORARY FIX: Return Data URI directly to avoid Storage permission issues.
    // This ensures images ALWAYS show up if generated.
    console.log('[uploadBase64ToStorage] ⚠️ Returning Data URI directly (Bypassing Storage for reliability)');
    return `data:image/png;base64,${base64String}`;
}

/**
 * Generate Image using Vertex AI (REST API)
 * Supports: imagen-3.0-generate-001, imagen-4.0-generate-001 (Preview)
 */
async function generateWithVertexAI(prompt, modelId = 'imagen-3.0-generate-001') {
    const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId || 'zinc-c790f';
    const location = 'us-central1';

    console.log(`[generateWithVertexAI] 🚀 Calling Vertex AI: ${modelId} for project ${projectId}`);

    try {
        const accessToken = await getVertexAccessToken();

        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

        const payload = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9",
                addWatermark: false // We handle watermark via CSS
            }
        };

        const response = await axios.post(endpoint, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });

        const predictions = response.data.predictions;
        if (predictions && predictions.length > 0) {
            const prediction = predictions[0];
            const imageBase64 = prediction.bytesBase64Encoded || prediction;

            if (imageBase64 && typeof imageBase64 === 'string') {
                console.log(`[generateWithVertexAI] ✅ Success! Image generated.`);
                return await uploadBase64ToStorage(imageBase64, modelId);
            }
        }

        throw new Error('No image data found in Vertex AI response');

    } catch (error) {
        console.error('[generateWithVertexAI] Error:', error.response?.data?.error || error.message);
        if (error.response?.data) {
            console.error('Vertex AI Error Details:', JSON.stringify(error.response.data));
        }
        throw error;
    }
}

module.exports = {
    generateWithVertexAI,
    uploadBase64ToStorage
};
