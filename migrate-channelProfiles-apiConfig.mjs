/**
 * Channel Profiles API Config Migration Script
 * 
 * 이 스크립트는 channelProfiles 컬렉션에 apiCredentialConfig 필드를 추가합니다.
 * 
 * 실행 방법:
 * 1. serviceAccountKey.json 파일을 프로젝트 루트에 넣기
 * 2. npm install firebase-admin
 * 3. node migrate-channelProfiles-apiConfig.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// 서비스 계정 키 로드
const serviceAccount = JSON.parse(
    readFileSync('./serviceAccountKey.json', 'utf8')
);

// 1. Firebase Admin 초기화
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// 2. user-settings.js 에서 사용 중인 PROVIDER_CONFIG 그대로 복사
const PROVIDER_CONFIG = {
    x: {
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API Key', required: true },
            { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Enter API Secret', required: false },
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', placeholder: 'Enter Token Secret', required: false }
        ]
    },
    instagram: {
        fields: [
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'Enter Facebook Page ID', required: true, help: 'Facebook Page ID connected to Instagram' }
        ]
    },
    youtube: {
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter YouTube API Key', required: true, help: 'From Google Cloud Console' }
        ]
    },
    linkedin: {
        fields: [
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'urn', label: 'Organization URN', type: 'text', placeholder: 'urn:li:organization:12345', required: false }
        ]
    },
    tiktok: {
        fields: [
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'clientKey', label: 'Client Key', type: 'text', placeholder: 'Enter Client Key', required: true }
        ]
    },
    facebook: {
        fields: [
            { key: 'accessToken', label: 'Access Token', type: 'password', required: true }
        ]
    },
    discord: {
        fields: [
            { key: 'botToken', label: 'Bot Token', type: 'password', required: true }
        ]
    },
    naver_blog: {
        fields: [
            { key: 'clientId', label: 'Client ID', type: 'text', required: true },
            { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ]
    },
    naver_smartstore: {
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    coupang: {
        fields: [
            { key: 'accessKey', label: 'Access Key', type: 'text', required: true },
            { key: 'secretKey', label: 'Secret Key', type: 'password', required: true }
        ]
    },
    reddit: {
        fields: [
            { key: 'clientId', label: 'Client ID', type: 'text', required: true },
            { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ]
    },
    kakaotalk: {
        fields: [
            { key: 'apiKey', label: 'REST API Key', type: 'password', required: true }
        ]
    },
    line: {
        fields: [
            { key: 'channelAccessToken', label: 'Channel Access Token', type: 'password', required: true }
        ]
    },
    telegram: {
        fields: [
            { key: 'botToken', label: 'Bot Token', type: 'password', required: true }
        ]
    },
    whatsapp: {
        fields: [
            { key: 'accessToken', label: 'Access Token', type: 'password', required: true }
        ]
    }
};

// 3. migration 실행 함수
async function migrateChannelProfiles() {
    console.log('🚀 Start migrating channelProfiles.apiCredentialConfig ...');

    let updated = 0;
    let notFound = 0;

    for (const [key, config] of Object.entries(PROVIDER_CONFIG)) {
        // channelProfiles 에서 key 필드로 해당 채널 찾기
        const snap = await db
            .collection('channelProfiles')
            .where('key', '==', key)
            .get();

        if (snap.empty) {
            console.warn(`⚠️  channelProfiles 문서 없음: key=${key}`);
            notFound++;
            continue;
        }

        for (const doc of snap.docs) {
            console.log(`➡️  Updating channelProfile: id=${doc.id}, key=${key}`);

            await doc.ref.set(
                {
                    key, // 안전하게 한 번 더 세팅
                    supportsApiConnection: true,
                    apiCredentialConfig: config,   // { fields: [...] }
                    updatedAt: new Date()
                },
                { merge: true }
            );
            updated++;
        }
    }

    console.log('');
    console.log('========================================');
    console.log(`✅ Migration completed!`);
    console.log(`   - Updated: ${updated} documents`);
    console.log(`   - Not found: ${notFound} keys`);
    console.log('========================================');
}

migrateChannelProfiles()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Migration error:', err);
        process.exit(1);
    });
