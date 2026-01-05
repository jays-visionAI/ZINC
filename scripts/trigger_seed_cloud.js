const https = require('https');

const PROJECT_ID = 'zinc-c790f';
const REGION = 'us-central1';
const FUNCTION_NAME = 'seedMasterAgents';
const URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}`;

async function triggerSeed() {
    console.log(`🚀 Triggering Cloud Seeding: ${URL}`);

    const data = JSON.stringify({ data: { force: true } });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(URL, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log('Response:', body);

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject(new Error(`Failed: ${body}`));
                }
            });
        });

        req.on('error', error => {
            console.error('Request Error:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

triggerSeed().catch(console.error);
