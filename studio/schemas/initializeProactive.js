/**
 * ZYNK Persona Engine - Firestore 초기화 스크립트
 * 
 * 새 사용자 가입 시 또는 기존 사용자 마이그레이션 시 실행
 * proactive_settings 및 persona_profile 초기값 설정
 * 
 * 사용법:
 * import { initializeUserForProactive } from './studio/schemas/initializeProactive.js';
 * await initializeUserForProactive(userId);
 */

import { getFirestore, doc, setDoc, getDoc, collection, serverTimestamp } from 'firebase/firestore';
import { createDefaultProactiveSettings } from '../constants/proactivePolicy.js';

/**
 * Firestore 인스턴스 가져오기
 */
function getDb() {
    return getFirestore();
}

/**
 * 사용자에게 Proactive 설정 초기화
 * 
 * @param {string} userId - 사용자 ID
 * @param {object} options - 옵션
 * @param {boolean} options.force - true면 기존 설정도 덮어씀
 * @returns {Promise<boolean>} - 초기화 수행 여부
 */
export async function initializeUserForProactive(userId, options = {}) {
    const db = getDb();
    const userRef = doc(db, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);

        // 이미 proactive_settings가 있으면 스킵 (force가 아닌 경우)
        if (userDoc.exists() && userDoc.data().proactive_settings && !options.force) {
            console.log(`[initializeProactive] User ${userId} already has proactive_settings`);
            return false;
        }

        // proactive_settings 초기화
        const proactiveSettings = createDefaultProactiveSettings();

        await setDoc(userRef, {
            proactive_settings: proactiveSettings,
            updated_at: serverTimestamp()
        }, { merge: true });

        console.log(`[initializeProactive] Initialized proactive_settings for user ${userId}`);
        return true;

    } catch (error) {
        console.error(`[initializeProactive] Error initializing user ${userId}:`, error);
        throw error;
    }
}

/**
 * 사용자 persona_profile 초기화
 * 
 * @param {string} userId - 사용자 ID
 * @param {object} initialProfile - 초기 프로필 데이터 (선택)
 * @returns {Promise<boolean>}
 */
export async function initializePersonaProfile(userId, initialProfile = {}) {
    const db = getDb();
    const profileRef = doc(db, 'users', userId, 'persona_profile', 'current_state');

    try {
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
            console.log(`[initializeProactive] User ${userId} already has persona_profile`);
            return false;
        }

        const defaultProfile = {
            identity: {
                role: null,
                industry: null,
                company_size: null,
                experience_years: null
            },
            preferences: {
                tone: 'balanced',
                brevity_score: 5,
                data_vs_story: 5,
                critique_level: 'balanced',
                vocabulary_overrides: {
                    preferred: [],
                    avoided: []
                }
            },
            relations_graph: {
                nodes: [],
                edges: []
            },
            routines: {},
            knowledge_gaps: [],
            updated_at: serverTimestamp(),
            version: 1,
            ...initialProfile
        };

        await setDoc(profileRef, defaultProfile);

        console.log(`[initializeProactive] Initialized persona_profile for user ${userId}`);
        return true;

    } catch (error) {
        console.error(`[initializeProactive] Error initializing persona_profile for ${userId}:`, error);
        throw error;
    }
}

/**
 * 전체 Proactive 시스템 초기화 (사용자별)
 * 
 * @param {string} userId 
 * @param {object} options 
 * @returns {Promise<{ proactive: boolean, profile: boolean }>}
 */
export async function initializeFullProactiveSystem(userId, options = {}) {
    const results = {
        proactive: await initializeUserForProactive(userId, options),
        profile: await initializePersonaProfile(userId, options.initialProfile)
    };

    console.log(`[initializeProactive] Full initialization for ${userId}:`, results);
    return results;
}

/**
 * 새 세션 생성
 * 
 * @param {string} userId 
 * @param {object} context - 세션 컨텍스트
 * @returns {Promise<string>} - 생성된 세션 ID
 */
export async function createSession(userId, context = {}) {
    const db = getDb();
    const sessionsRef = collection(db, 'users', userId, 'sessions');

    const sessionData = {
        status: 'active',
        started_at: serverTimestamp(),
        last_active_at: serverTimestamp(),
        closed_at: null,
        context: {
            project_id: context.projectId || null,
            intent: context.intent || null,
            active_draft_id: context.draftId || null
        },
        stats: {
            message_count: 0,
            token_usage: 0,
            duration_seconds: 0
        }
    };

    const docRef = doc(sessionsRef);
    await setDoc(docRef, sessionData);

    return docRef.id;
}

/**
 * 세션에 메시지 추가
 * 
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {object} message 
 * @returns {Promise<string>} - 생성된 메시지 ID
 */
export async function addMessage(userId, sessionId, message) {
    const db = getDb();
    const messagesRef = collection(db, 'users', userId, 'sessions', sessionId, 'messages');

    const messageData = {
        role: message.role,             // user | assistant | system
        text: message.text,
        agent_id: message.agentId || null,
        metadata: {
            tokens: message.tokens || 0,
            latency_ms: message.latencyMs || 0,
            cost_usd: message.costUsd || 0,
            citations: message.citations || [],
            slot_fills: message.slotFills || {}
        },
        proactive: {
            is_proactive: message.isProactive || false,
            trigger_id: message.triggerId || null,
            trigger_type: message.triggerType || null
        },
        created_at: serverTimestamp()
    };

    const docRef = doc(messagesRef);
    await setDoc(docRef, messageData);

    return docRef.id;
}

/**
 * 트리거 기록 생성 (Watchdog가 호출)
 * 
 * @param {string} userId 
 * @param {string} triggerType - TriggerType enum 값
 * @param {object} payload - 트리거 페이로드
 * @returns {Promise<string>} - 생성된 트리거 ID
 */
export async function createTrigger(userId, triggerType, payload) {
    const db = getDb();
    const triggersRef = collection(db, 'users', userId, 'triggers');

    const triggerData = {
        trigger_type: triggerType,
        payload: payload,
        status: 'detected',         // Watchdog가 감지만 함
        suppressed_reason: null,
        message: null,
        detected_at: serverTimestamp(),
        approved_at: null,
        sent_at: null,
        user_response: {
            clicked: false,
            dismissed: false,
            responded_at: null
        }
    };

    const docRef = doc(triggersRef);
    await setDoc(docRef, triggerData);

    console.log(`[createTrigger] Created trigger ${docRef.id} of type ${triggerType} for user ${userId}`);
    return docRef.id;
}

/**
 * 초안 생성
 * 
 * @param {string} userId 
 * @param {object} draftData 
 * @returns {Promise<string>}
 */
export async function createDraft(userId, draftData) {
    const db = getDb();
    const draftsRef = collection(db, 'users', userId, 'drafts');

    const draft = {
        type: draftData.type || 'doc',
        title: draftData.title || 'Untitled',
        content: draftData.content || '',
        status: 'saved',
        completed: false,
        linked_session_id: draftData.sessionId || null,
        linked_job_id: null,
        slots: {
            task_type: null,
            audience: null,
            deadline: null,
            channel: null,
            tone: null,
            success_metric: null
        },
        slots_filled: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
    };

    const docRef = doc(draftsRef);
    await setDoc(docRef, draft);

    return docRef.id;
}

/**
 * 비동기 작업 생성
 * 
 * @param {string} userId 
 * @param {object} jobData 
 * @returns {Promise<string>}
 */
export async function createJob(userId, jobData) {
    const db = getDb();
    const jobsRef = collection(db, 'users', userId, 'jobs');

    const job = {
        type: jobData.type,         // research | analysis | docgen | ...
        status: 'queued',
        request: {
            prompt: jobData.prompt || '',
            parameters: jobData.parameters || {},
            source_session_id: jobData.sessionId || null
        },
        result_ref: null,
        result_preview: null,
        error_message: null,
        progress: 0,
        created_at: serverTimestamp(),
        started_at: null,
        finished_at: null
    };

    const docRef = doc(jobsRef);
    await setDoc(docRef, job);

    return docRef.id;
}

export default {
    initializeUserForProactive,
    initializePersonaProfile,
    initializeFullProactiveSystem,
    createSession,
    addMessage,
    createTrigger,
    createDraft,
    createJob
};
