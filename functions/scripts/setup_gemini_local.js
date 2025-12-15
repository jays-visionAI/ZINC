const admin = require('firebase-admin');

// -----------------------------------------------------
// 로컬 에뮬레이터 DB 설정 스크립트
// -----------------------------------------------------

// Local Emulator 접속 설정
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({ projectId: 'zinc-c790f' });
const db = admin.firestore();

// 🔑 [중요] 여기에 Gemini API 키를 입력해주세요
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

async function setupLocalDB() {
    console.log('\n🔄 로컬 에뮬레이터 DB에 Gemini 설정을 주입합니다...');

    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_GEMINI')) {
        console.error('❌ [오류] 스크립트 파일(setup_gemini_local.js)을 열어 API 키를 먼저 입력해주세요.');
        return;
    }

    try {
        // 1. 시스템 Provider 등록 (API Key 저장)
        await db.collection('systemLLMProviders').doc('google_default').set({
            provider: 'google',
            status: 'active',
            isActive: true, // 레거시 호환
            apiKey: GEMINI_API_KEY,
            label: 'Gemini (Local Config)',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✓ Gemini Provider 등록 완료 (API Key 적용됨)');

        // 2. 글로벌 LLM 설정 (기본값 -> Gemini)
        await db.collection('systemSettings').doc('llmConfig').set({
            defaultModels: {
                default: { provider: 'google', model: 'gemini-2.0-flash-exp', creditMultiplier: 1.0 },
                boost: { provider: 'google', model: 'gemini-1.5-pro', creditMultiplier: 2.0 }
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✓ 글로벌 기본값 설정 완료 (Default: Gemini 2.0 Flash)');

        // 3. 에이전트 실행 정책 (Agent Execution -> Gemini)
        await db.collection('featurePolicies').doc('agent_execution').set({
            defaultTier: { provider: 'google', model: 'gemini-2.0-flash-exp' },
            boostTier: { provider: 'google', model: 'gemini-1.5-pro' }, // Planner, Manager 등
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✓ 에이전트 라우팅 정책 설정 완료');

        console.log('\n✅ 모든 설정이 완료되었습니다!');
        console.log('   이제 Studio에서 Agent를 실행하면 Gemini가 사용됩니다.');

    } catch (error) {
        console.error('\n❌ 설정 중 오류 발생:', error);
        console.log('   (혹시 Emulator가 실행 중이 아닌가요? firebase emulators:start가 필요합니다)');
    }
}

setupLocalDB();
