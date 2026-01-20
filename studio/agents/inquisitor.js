/**
 * ZYNK Persona Engine - Inquisitor Agent
 * 
 * 역할: Slot Filling - 작업 요청 시 필요 정보 감지 및 역질문 생성
 * 
 * 규칙:
 * - 최대 3개 질문만 허용
 * - 같은 슬롯 2회 이상 재질문 금지
 * - persona_profile에서 채울 수 있으면 자동 채움
 */

import { AgentRole } from '../constants/agentRoles.js';

/**
 * 슬롯 스키마 정의
 * 
 * priority: 1 (높음) ~ 5 (낮음)
 * required: 필수 여부
 * autoFillFromProfile: persona_profile에서 자동 채울 수 있는 필드 경로
 */
export const SLOT_SCHEMA = {
    task_type: {
        id: 'task_type',
        name: { ko: '작업 유형', en: 'Task Type' },
        description: { ko: '어떤 종류의 콘텐츠를 만들까요?', en: 'What type of content should I create?' },
        priority: 1,
        required: true,
        autoFillFromProfile: null, // 항상 사용자 입력 필요
        examples: ['블로그 포스트', '소셜 미디어 게시물', '마케팅 이메일', '보도자료'],
        question: {
            ko: '어떤 종류의 콘텐츠를 만들어 드릴까요? (예: 블로그 포스트, SNS 게시물, 이메일 등)',
            en: 'What type of content would you like me to create? (e.g., blog post, social media post, email)'
        }
    },

    audience: {
        id: 'audience',
        name: { ko: '타겟 오디언스', en: 'Target Audience' },
        description: { ko: '누구를 대상으로 하나요?', en: 'Who is the target audience?' },
        priority: 2,
        required: true,
        autoFillFromProfile: 'identity.target_audience', // persona_profile에서 자동 채움 시도
        examples: ['20대 직장인', 'B2B 마케터', '창업자', '일반 소비자'],
        question: {
            ko: '이 콘텐츠의 주요 대상은 누구인가요?',
            en: 'Who is the primary audience for this content?'
        }
    },

    deadline: {
        id: 'deadline',
        name: { ko: '마감 기한', en: 'Deadline' },
        description: { ko: '언제까지 필요한가요?', en: 'When do you need it?' },
        priority: 3,
        required: false,
        autoFillFromProfile: null,
        examples: ['오늘', '이번 주 금요일', '다음 달 1일', 'ASAP'],
        question: {
            ko: '언제까지 완성이 필요한가요? (마감이 없다면 "없음")',
            en: 'When do you need this completed? (Say "none" if no deadline)'
        }
    },

    channel: {
        id: 'channel',
        name: { ko: '발행 채널', en: 'Publishing Channel' },
        description: { ko: '어디에 게시하나요?', en: 'Where will this be published?' },
        priority: 2,
        required: true,
        autoFillFromProfile: 'preferences.default_channels', // 기본 채널 설정에서 가져옴
        examples: ['Instagram', 'LinkedIn', '회사 블로그', 'YouTube', '네이버 블로그'],
        question: {
            ko: '어떤 채널에 게시할 예정인가요?',
            en: 'Which channel will you publish this on?'
        }
    },

    tone: {
        id: 'tone',
        name: { ko: '톤앤매너', en: 'Tone & Manner' },
        description: { ko: '어떤 분위기로 작성할까요?', en: 'What tone should I use?' },
        priority: 3,
        required: false,
        autoFillFromProfile: 'preferences.default_tone', // 기본 톤 설정에서 가져옴
        examples: ['전문적', '친근한', '유머러스', '격식체', '캐주얼'],
        question: {
            ko: '어떤 톤으로 작성해 드릴까요? (예: 전문적, 친근한, 캐주얼)',
            en: 'What tone should I use? (e.g., professional, friendly, casual)'
        }
    },

    success_metric: {
        id: 'success_metric',
        name: { ko: '성공 지표', en: 'Success Metric' },
        description: { ko: '이 콘텐츠의 목표는?', en: 'What is the goal of this content?' },
        priority: 4,
        required: false,
        autoFillFromProfile: 'preferences.default_goals',
        examples: ['브랜드 인지도', '리드 생성', '판매 전환', '교육/정보 제공'],
        question: {
            ko: '이 콘텐츠로 달성하고 싶은 목표가 있나요?',
            en: 'What goal would you like to achieve with this content?'
        }
    },

    // 추가 슬롯들
    brand_voice: {
        id: 'brand_voice',
        name: { ko: '브랜드 보이스', en: 'Brand Voice' },
        description: { ko: '브랜드의 고유한 말투', en: 'Brand-specific voice' },
        priority: 4,
        required: false,
        autoFillFromProfile: 'identity.brand_voice',
        question: {
            ko: '특별히 사용해야 할 브랜드 보이스나 스타일 가이드가 있나요?',
            en: 'Is there a specific brand voice or style guide I should follow?'
        }
    },

    reference_material: {
        id: 'reference_material',
        name: { ko: '참고 자료', en: 'Reference Material' },
        description: { ko: '참고할 자료나 링크', en: 'Reference materials or links' },
        priority: 5,
        required: false,
        autoFillFromProfile: null,
        question: {
            ko: '참고할 자료나 링크가 있나요?',
            en: 'Do you have any reference materials or links to share?'
        }
    }
};

/**
 * 필수 슬롯 목록
 */
export const REQUIRED_SLOTS = Object.values(SLOT_SCHEMA)
    .filter(slot => slot.required)
    .map(slot => slot.id);

/**
 * 우선순위별 정렬된 슬롯 목록
 */
export const SLOTS_BY_PRIORITY = Object.values(SLOT_SCHEMA)
    .sort((a, b) => a.priority - b.priority)
    .map(slot => slot.id);

/**
 * 슬롯 Gap 감지
 * 
 * @param {Object} taskContext - 현재 작업 컨텍스트
 * @param {Object} taskContext.userRequest - 사용자 요청 텍스트
 * @param {Object} taskContext.extractedSlots - 이미 추출된 슬롯 값
 * @param {Object} taskContext.personaProfile - 사용자 persona_profile
 * @param {Array} taskContext.askedSlots - 이 세션에서 이미 질문한 슬롯들
 * @returns {Object} 감지 결과
 */
export function inquisitorDetectGaps(taskContext) {
    const {
        extractedSlots = {},
        personaProfile = {},
        askedSlots = []
    } = taskContext;

    console.log('[Inquisitor] Detecting gaps in task context...');

    const result = {
        filledSlots: {},      // 이미 채워진 슬롯
        autoFilledSlots: {},  // persona_profile에서 자동 채운 슬롯
        missingSlots: [],     // 비어있는 슬롯
        askableSlots: [],     // 질문 가능한 슬롯 (재질문 제외)
        complete: false
    };

    // 각 슬롯 검사
    for (const slotId of SLOTS_BY_PRIORITY) {
        const schema = SLOT_SCHEMA[slotId];

        // 1. 이미 추출된 값이 있는지 확인
        if (extractedSlots[slotId] && extractedSlots[slotId].value) {
            result.filledSlots[slotId] = extractedSlots[slotId].value;
            continue;
        }

        // 2. persona_profile에서 자동 채움 시도
        if (schema.autoFillFromProfile) {
            const autoValue = getNestedValue(personaProfile, schema.autoFillFromProfile);
            if (autoValue) {
                result.autoFilledSlots[slotId] = autoValue;
                result.filledSlots[slotId] = autoValue;
                console.log(`[Inquisitor] Auto-filled ${slotId} from profile: ${autoValue}`);
                continue;
            }
        }

        // 3. 비어있는 슬롯으로 분류
        result.missingSlots.push(slotId);

        // 4. 이미 질문한 슬롯이 아니면 질문 가능 목록에 추가
        if (!askedSlots.includes(slotId)) {
            result.askableSlots.push(slotId);
        }
    }

    // 필수 슬롯이 모두 채워졌는지 확인
    const missingRequired = REQUIRED_SLOTS.filter(
        id => !result.filledSlots[id]
    );

    result.complete = missingRequired.length === 0;

    console.log(`[Inquisitor] Gaps detected - Missing: ${result.missingSlots.length}, Askable: ${result.askableSlots.length}, Complete: ${result.complete}`);

    return result;
}

/**
 * 질문 생성 (최대 3개)
 * 
 * @param {Array} gaps - 질문 가능한 슬롯 ID 배열
 * @param {string} [lang='ko'] - 언어
 * @returns {Object} 질문 목록 및 메타데이터
 */
export function inquisitorGenerateQuestions(gaps, lang = 'ko') {
    console.log(`[Inquisitor] Generating questions for ${gaps.length} gaps...`);

    const MAX_QUESTIONS = 3;

    // 필수 슬롯을 우선, 그 다음 priority 순
    const prioritizedGaps = gaps
        .map(id => ({ id, ...SLOT_SCHEMA[id] }))
        .sort((a, b) => {
            // 필수 슬롯 우선
            if (a.required && !b.required) return -1;
            if (!a.required && b.required) return 1;
            // 같으면 priority 순
            return a.priority - b.priority;
        })
        .slice(0, MAX_QUESTIONS);

    const questions = prioritizedGaps.map((slot, index) => ({
        slotId: slot.id,
        question: slot.question[lang] || slot.question.en,
        name: slot.name[lang] || slot.name.en,
        examples: slot.examples || [],
        required: slot.required,
        order: index + 1
    }));

    // 질문 메시지 포맷팅
    const formattedMessage = formatQuestionsMessage(questions, lang);

    return {
        questions,
        count: questions.length,
        slotIds: questions.map(q => q.slotId),
        message: formattedMessage
    };
}

/**
 * 질문을 자연스러운 메시지로 포맷
 * 
 * @param {Array} questions 
 * @param {string} lang 
 * @returns {string}
 */
function formatQuestionsMessage(questions, lang = 'ko') {
    if (questions.length === 0) {
        return lang === 'ko'
            ? '모든 정보가 준비되었습니다. 작업을 시작할게요!'
            : 'All information is ready. Let me start working!';
    }

    const intro = lang === 'ko'
        ? '작업을 시작하기 전에 몇 가지 확인이 필요해요:'
        : 'Before I start, I need to confirm a few things:';

    const questionLines = questions.map((q, i) => {
        const prefix = questions.length > 1 ? `${i + 1}. ` : '';
        return `${prefix}${q.question}`;
    });

    return `${intro}\n\n${questionLines.join('\n\n')}`;
}

/**
 * 세션에 질문 메시지 기록
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {Object} questionData - inquisitorGenerateQuestions 결과
 * @returns {Promise<string>} 메시지 ID
 */
export async function recordQuestionMessage(db, userId, sessionId, questionData) {
    const messageData = {
        role: 'assistant',
        text: questionData.message,
        agent_id: AgentRole.INQUISITOR,
        metadata: {
            inquisitor: true,
            slot_questions: questionData.questions,
            asked_slots: questionData.slotIds,
            question_count: questionData.count
        },
        created_at: new Date()
    };

    try {
        const messagesRef = db
            .collection('users')
            .doc(userId)
            .collection('sessions')
            .doc(sessionId)
            .collection('messages');

        const docRef = await messagesRef.add(messageData);

        // 세션에 asked_slots 업데이트 (재질문 방지용)
        const sessionRef = db
            .collection('users')
            .doc(userId)
            .collection('sessions')
            .doc(sessionId);

        await sessionRef.update({
            asked_slots: db.FieldValue?.arrayUnion
                ? db.FieldValue.arrayUnion(...questionData.slotIds)
                : questionData.slotIds,
            last_inquisitor_at: new Date()
        });

        console.log(`[Inquisitor] Question message recorded: ${docRef.id}`);
        return docRef.id;

    } catch (error) {
        console.error('[Inquisitor] Error recording question message:', error);
        return null;
    }
}

/**
 * 사용자 응답에서 슬롯 값 추출 (간단한 버전)
 * 
 * @param {string} userResponse - 사용자 응답 텍스트
 * @param {Array} expectedSlots - 예상되는 슬롯 ID 배열
 * @returns {Object} 추출된 슬롯 값
 */
export function extractSlotsFromResponse(userResponse, expectedSlots) {
    // 실제 구현에서는 LLM을 사용하여 추출
    // 여기서는 기본 구조만 제공

    console.log('[Inquisitor] Extracting slots from user response...');

    const extracted = {};

    // 간단한 키워드 매칭 (실제로는 LLM 사용)
    for (const slotId of expectedSlots) {
        // 예시: 채널 감지
        if (slotId === 'channel') {
            const channelKeywords = {
                'instagram': 'Instagram',
                'insta': 'Instagram',
                '인스타': 'Instagram',
                'linkedin': 'LinkedIn',
                '링크드인': 'LinkedIn',
                'youtube': 'YouTube',
                '유튜브': 'YouTube',
                'blog': 'Blog',
                '블로그': 'Blog',
                'twitter': 'X (Twitter)',
                'x': 'X (Twitter)'
            };

            const lowerResponse = userResponse.toLowerCase();
            for (const [keyword, value] of Object.entries(channelKeywords)) {
                if (lowerResponse.includes(keyword)) {
                    extracted[slotId] = { value, confidence: 0.9 };
                    break;
                }
            }
        }

        // 톤 감지
        if (slotId === 'tone') {
            const toneKeywords = {
                '전문': 'professional',
                'professional': 'professional',
                '친근': 'friendly',
                'friendly': 'friendly',
                '캐주얼': 'casual',
                'casual': 'casual',
                '격식': 'formal',
                'formal': 'formal'
            };

            const lowerResponse = userResponse.toLowerCase();
            for (const [keyword, value] of Object.entries(toneKeywords)) {
                if (lowerResponse.includes(keyword)) {
                    extracted[slotId] = { value, confidence: 0.8 };
                    break;
                }
            }
        }
    }

    return extracted;
}

/**
 * Inquisitor 메인 플로우
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {Object} taskContext 
 * @returns {Promise<Object>}
 */
export async function runInquisitor(db, userId, sessionId, taskContext) {
    console.log('[Inquisitor] Starting slot filling process...');

    // 1. Gap 감지
    const gapResult = inquisitorDetectGaps(taskContext);

    // 2. 완료 상태면 바로 반환
    if (gapResult.complete) {
        return {
            complete: true,
            filledSlots: gapResult.filledSlots,
            autoFilledSlots: gapResult.autoFilledSlots,
            questions: null
        };
    }

    // 3. 질문 가능한 슬롯이 없으면 (모두 이미 질문함)
    if (gapResult.askableSlots.length === 0) {
        console.log('[Inquisitor] No more askable slots, proceeding with available data');
        return {
            complete: true, // 강제 진행
            filledSlots: gapResult.filledSlots,
            autoFilledSlots: gapResult.autoFilledSlots,
            questions: null,
            warning: 'Some required slots may be missing'
        };
    }

    // 4. 질문 생성
    const lang = taskContext.userLanguage || 'ko';
    const questionResult = inquisitorGenerateQuestions(gapResult.askableSlots, lang);

    // 5. 세션에 질문 기록
    if (questionResult.count > 0) {
        await recordQuestionMessage(db, userId, sessionId, questionResult);
    }

    return {
        complete: false,
        filledSlots: gapResult.filledSlots,
        autoFilledSlots: gapResult.autoFilledSlots,
        questions: questionResult,
        waitingForSlots: questionResult.slotIds
    };
}

/**
 * 중첩 객체에서 값 가져오기
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return null;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return null;
        }
    }
    return value;
}

export default {
    SLOT_SCHEMA,
    REQUIRED_SLOTS,
    SLOTS_BY_PRIORITY,
    inquisitorDetectGaps,
    inquisitorGenerateQuestions,
    recordQuestionMessage,
    extractSlotsFromResponse,
    runInquisitor
};
