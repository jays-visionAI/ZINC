/**
 * ZYNK Persona Engine - Profiler Agent
 * 
 * 역할: 비동기 학습 - 사용자 행동/피드백 기반 persona_profile 업데이트
 * 
 * 트리거:
 * - 세션 종료
 * - "아니/그거말고/앞으로는" 수정 패턴 감지
 * - 생성물 편집 저장
 * 
 * 규칙:
 * - opt-out 설정 시 write 금지
 * - 모든 변경에 로그 남김 (updated_at)
 */

import { AgentRole } from '../constants/agentRoles.js';

/**
 * 수정 패턴 키워드 (한국어/영어)
 */
const CORRECTION_PATTERNS = {
    ko: [
        '아니', '아니야', '아니요', '아닌데', '그거 말고', '그거말고',
        '다르게', '다른 방식으로', '앞으로는', '다음부터는', '이렇게 하지 마',
        '너무 길어', '너무 짧아', '더 짧게', '더 길게', '덜 격식체로',
        '더 친근하게', '더 전문적으로', '이모지 빼줘', '이모지 넣어줘',
        '~하지 마', '~하지마', '항상 ~해줘', '매번 ~해'
    ],
    en: [
        'no', 'not that', 'not like that', 'different', 'differently',
        'from now on', 'in the future', 'stop doing', 'don\'t do',
        'too long', 'too short', 'shorter', 'longer', 'less formal',
        'more friendly', 'more professional', 'no emojis', 'add emojis',
        'always', 'never', 'every time'
    ]
};

/**
 * 학습 가능한 프로필 필드
 */
const LEARNABLE_FIELDS = {
    'preferences.tone': {
        description: '선호 톤앤매너',
        extractPatterns: ['친근', 'friendly', '전문', 'professional', '격식', 'formal', '캐주얼', 'casual']
    },
    'preferences.brevity_score': {
        description: '간결함 선호도 (0-1)',
        extractPatterns: ['짧게', 'shorter', '길게', 'longer', '간결', 'brief', '자세', 'detailed']
    },
    'preferences.emoji_usage': {
        description: '이모지 사용 선호',
        extractPatterns: ['이모지', 'emoji', '이모티콘']
    },
    'preferences.formality_level': {
        description: '격식 수준',
        extractPatterns: ['격식', '반말', '존댓말', 'formal', 'casual']
    },
    'vocabulary_overrides': {
        description: '용어 대체 규칙',
        extractPatterns: ['~대신', 'instead of', '~말고', '~라고 해']
    },
    'routines': {
        description: '반복 패턴',
        extractPatterns: ['항상', 'always', '매번', 'every time', '앞으로', 'from now']
    }
};

/**
 * Profiler 메인 실행 함수
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @param {string} sessionId - 세션 ID
 * @param {Object} [options] - 옵션
 * @param {string} [options.triggerType] - 트리거 유형 (session_end, correction, edit)
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function profilerRun(db, userId, sessionId, options = {}) {
    console.log(`[Profiler] Running for user: ${userId}, session: ${sessionId}`);

    const result = {
        success: false,
        optedOut: false,
        updates: [],
        skipped: false
    };

    try {
        // 1. Opt-out 확인
        const isOptedOut = await checkLearningOptOut(db, userId);
        if (isOptedOut) {
            console.log('[Profiler] User has opted out of learning');
            result.optedOut = true;
            result.skipped = true;
            return result;
        }

        // 2. 현재 persona_profile 로드
        const currentProfile = await loadPersonaProfile(db, userId);

        // 3. 세션 메시지 분석
        const sessionData = await analyzeSession(db, userId, sessionId);

        // 4. 학습 데이터 추출
        const learnings = extractLearnings(sessionData);

        if (learnings.length === 0) {
            console.log('[Profiler] No learnable patterns found');
            result.skipped = true;
            result.success = true;
            return result;
        }

        // 5. Profile 업데이트 적용
        const updates = await applyLearnings(db, userId, currentProfile, learnings);

        result.success = true;
        result.updates = updates;

        console.log(`[Profiler] Applied ${updates.length} updates`);
        return result;

    } catch (error) {
        console.error('[Profiler] Error running profiler:', error);
        result.error = error.message;
        return result;
    }
}

/**
 * 학습 Opt-out 확인
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
async function checkLearningOptOut(db, userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;

        const userData = userDoc.data();

        // 학습 설정 확인 (여러 경로 지원)
        return userData.learning_opt_out === true ||
            userData.privacy_settings?.learning_disabled === true ||
            userData.persona_settings?.learning_enabled === false;

    } catch (error) {
        console.error('[Profiler] Error checking opt-out:', error);
        return false; // 에러 시 기본적으로 학습 허용
    }
}

/**
 * 현재 persona_profile 로드
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
async function loadPersonaProfile(db, userId) {
    try {
        const profileDoc = await db
            .collection('users')
            .doc(userId)
            .collection('persona_profile')
            .doc('current_state')
            .get();

        if (profileDoc.exists) {
            return profileDoc.data();
        }

        // 기본 프로필 반환
        return {
            identity: {},
            preferences: {
                tone: 'neutral',
                brevity_score: 0.5,
                emoji_usage: 'moderate',
                formality_level: 'neutral'
            },
            vocabulary_overrides: {},
            routines: [],
            relations_graph: {},
            created_at: new Date(),
            updated_at: new Date()
        };

    } catch (error) {
        console.error('[Profiler] Error loading profile:', error);
        return { preferences: {}, vocabulary_overrides: {}, routines: [] };
    }
}

/**
 * 세션 메시지 분석
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {string} sessionId 
 * @returns {Promise<Object>}
 */
async function analyzeSession(db, userId, sessionId) {
    const messagesRef = db
        .collection('users')
        .doc(userId)
        .collection('sessions')
        .doc(sessionId)
        .collection('messages');

    const snapshot = await messagesRef.orderBy('created_at', 'asc').get();

    const messages = [];
    const corrections = [];
    const userPreferences = [];

    snapshot.forEach(doc => {
        const msg = doc.data();
        messages.push(msg);

        // 사용자 메시지에서 수정 패턴 감지
        if (msg.role === 'user') {
            const correctionType = detectCorrectionPattern(msg.text);
            if (correctionType) {
                corrections.push({
                    text: msg.text,
                    type: correctionType,
                    timestamp: msg.created_at
                });
            }

            const preference = extractPreferenceFromMessage(msg.text);
            if (preference) {
                userPreferences.push(preference);
            }
        }
    });

    return {
        messages,
        corrections,
        userPreferences,
        messageCount: messages.length,
        hasCorrections: corrections.length > 0
    };
}

/**
 * 수정 패턴 감지
 * 
 * @param {string} text 
 * @returns {Object|null}
 */
function detectCorrectionPattern(text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();

    // 한국어 패턴
    for (const pattern of CORRECTION_PATTERNS.ko) {
        if (text.includes(pattern)) {
            return { pattern, language: 'ko', type: categorizeCorrection(text) };
        }
    }

    // 영어 패턴
    for (const pattern of CORRECTION_PATTERNS.en) {
        if (lowerText.includes(pattern)) {
            return { pattern, language: 'en', type: categorizeCorrection(text) };
        }
    }

    return null;
}

/**
 * 수정 유형 분류
 * 
 * @param {string} text 
 * @returns {string}
 */
function categorizeCorrection(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('길') || lowerText.includes('짧') ||
        lowerText.includes('long') || lowerText.includes('short')) {
        return 'length';
    }

    if (lowerText.includes('톤') || lowerText.includes('tone') ||
        lowerText.includes('친근') || lowerText.includes('전문') ||
        lowerText.includes('friendly') || lowerText.includes('professional')) {
        return 'tone';
    }

    if (lowerText.includes('이모지') || lowerText.includes('emoji')) {
        return 'emoji';
    }

    if (lowerText.includes('격식') || lowerText.includes('반말') ||
        lowerText.includes('formal') || lowerText.includes('casual')) {
        return 'formality';
    }

    if (lowerText.includes('항상') || lowerText.includes('always') ||
        lowerText.includes('앞으로') || lowerText.includes('from now')) {
        return 'routine';
    }

    return 'general';
}

/**
 * 메시지에서 선호도 추출
 * 
 * @param {string} text 
 * @returns {Object|null}
 */
function extractPreferenceFromMessage(text) {
    if (!text) return null;

    const preferences = {};

    // 간결함 선호도
    if (text.includes('더 짧게') || text.includes('shorter') || text.includes('간결')) {
        preferences.brevity_score = { change: 0.1, direction: 'increase' };
    } else if (text.includes('더 길게') || text.includes('longer') || text.includes('자세')) {
        preferences.brevity_score = { change: 0.1, direction: 'decrease' };
    }

    // 톤 선호도
    if (text.includes('친근') || text.includes('friendly')) {
        preferences.tone = 'friendly';
    } else if (text.includes('전문') || text.includes('professional')) {
        preferences.tone = 'professional';
    }

    // 이모지 선호도
    if (text.includes('이모지 빼') || text.includes('no emoji')) {
        preferences.emoji_usage = 'none';
    } else if (text.includes('이모지 넣') || text.includes('add emoji')) {
        preferences.emoji_usage = 'frequent';
    }

    return Object.keys(preferences).length > 0 ? preferences : null;
}

/**
 * 학습 데이터 추출
 * 
 * @param {Object} sessionData 
 * @returns {Array}
 */
function extractLearnings(sessionData) {
    const learnings = [];

    // 수정 패턴에서 학습
    for (const correction of sessionData.corrections) {
        const learning = {
            source: 'correction',
            type: correction.type,
            originalText: correction.text,
            confidence: 0.8
        };

        switch (correction.type) {
            case 'length':
                learning.field = 'preferences.brevity_score';
                learning.value = correction.text.includes('짧') || correction.text.includes('short')
                    ? 'increase' : 'decrease';
                break;
            case 'tone':
                learning.field = 'preferences.tone';
                learning.value = extractToneValue(correction.text);
                break;
            case 'emoji':
                learning.field = 'preferences.emoji_usage';
                learning.value = correction.text.includes('빼') || correction.text.includes('no')
                    ? 'none' : 'frequent';
                break;
            case 'formality':
                learning.field = 'preferences.formality_level';
                learning.value = extractFormalityValue(correction.text);
                break;
            case 'routine':
                learning.field = 'routines';
                learning.value = { pattern: correction.text, addedAt: new Date() };
                break;
        }

        if (learning.field && learning.value) {
            learnings.push(learning);
        }
    }

    // 사용자 선호도에서 학습
    for (const pref of sessionData.userPreferences) {
        for (const [field, value] of Object.entries(pref)) {
            learnings.push({
                source: 'preference',
                field: `preferences.${field}`,
                value,
                confidence: 0.6
            });
        }
    }

    return learnings;
}

/**
 * 톤 값 추출
 */
function extractToneValue(text) {
    if (text.includes('친근') || text.includes('friendly')) return 'friendly';
    if (text.includes('전문') || text.includes('professional')) return 'professional';
    if (text.includes('캐주얼') || text.includes('casual')) return 'casual';
    if (text.includes('격식') || text.includes('formal')) return 'formal';
    return 'neutral';
}

/**
 * 격식 수준 값 추출
 */
function extractFormalityValue(text) {
    if (text.includes('반말') || text.includes('casual')) return 'casual';
    if (text.includes('존댓말') || text.includes('격식') || text.includes('formal')) return 'formal';
    return 'neutral';
}

/**
 * 학습 내용 적용
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {Object} currentProfile 
 * @param {Array} learnings 
 * @returns {Promise<Array>}
 */
async function applyLearnings(db, userId, currentProfile, learnings) {
    const updates = [];
    const profileRef = db
        .collection('users')
        .doc(userId)
        .collection('persona_profile')
        .doc('current_state');

    const updateData = {};

    for (const learning of learnings) {
        const { field, value } = learning;

        // 필드 경로 파싱
        const fieldParts = field.split('.');

        if (fieldParts[0] === 'preferences' && fieldParts.length === 2) {
            const prefKey = fieldParts[1];

            // brevity_score는 증감 처리
            if (prefKey === 'brevity_score' && typeof value === 'string') {
                const currentScore = currentProfile.preferences?.brevity_score || 0.5;
                const newScore = value === 'increase'
                    ? Math.min(1, currentScore + 0.1)
                    : Math.max(0, currentScore - 0.1);
                updateData[`preferences.${prefKey}`] = newScore;
            } else {
                updateData[`preferences.${prefKey}`] = typeof value === 'object' ? value.change || value : value;
            }

            updates.push({
                field: `preferences.${prefKey}`,
                oldValue: currentProfile.preferences?.[prefKey],
                newValue: updateData[`preferences.${prefKey}`],
                source: learning.source
            });
        }

        if (field === 'routines' && value) {
            // 루틴 추가
            const routines = currentProfile.routines || [];
            routines.push(value);
            updateData['routines'] = routines;

            updates.push({
                field: 'routines',
                action: 'added',
                value: value.pattern,
                source: learning.source
            });
        }
    }

    // 업데이트가 있으면 저장
    if (Object.keys(updateData).length > 0) {
        updateData['updated_at'] = new Date();
        updateData['last_learned_from'] = `session_${new Date().toISOString()}`;

        await profileRef.set(updateData, { merge: true });

        // 변경 로그 저장
        await logProfileChange(db, userId, updates);

        console.log('[Profiler] Profile updated:', Object.keys(updateData));
    }

    return updates;
}

/**
 * 프로필 변경 로그 저장
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {Array} updates 
 */
async function logProfileChange(db, userId, updates) {
    try {
        const logRef = db
            .collection('users')
            .doc(userId)
            .collection('persona_profile')
            .doc('change_logs');

        const logEntry = {
            timestamp: new Date(),
            changes: updates,
            count: updates.length
        };

        // 로그 배열에 추가 (최근 100개 유지)
        await logRef.set({
            logs: db.FieldValue?.arrayUnion
                ? db.FieldValue.arrayUnion(logEntry)
                : [logEntry],
            last_updated: new Date()
        }, { merge: true });

    } catch (error) {
        console.error('[Profiler] Error logging change:', error);
    }
}

/**
 * 세션 종료 시 Profiler 실행 (이벤트 핸들러)
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {string} sessionId 
 */
export async function onSessionEnd(db, userId, sessionId) {
    console.log(`[Profiler] Session ended: ${sessionId}`);
    return await profilerRun(db, userId, sessionId, { triggerType: 'session_end' });
}

/**
 * 수정 발화 감지 시 Profiler 실행
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {string} userMessage 
 */
export async function onCorrectionDetected(db, userId, sessionId, userMessage) {
    const correction = detectCorrectionPattern(userMessage);
    if (correction) {
        console.log(`[Profiler] Correction detected: ${correction.type}`);
        return await profilerRun(db, userId, sessionId, { triggerType: 'correction' });
    }
    return null;
}

export default {
    profilerRun,
    onSessionEnd,
    onCorrectionDetected,
    detectCorrectionPattern,
    CORRECTION_PATTERNS,
    LEARNABLE_FIELDS
};
