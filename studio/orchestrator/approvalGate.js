/**
 * ZYNK Persona Engine - Orchestrator Approval Gate
 * 
 * 핵심 역할: 트리거 후보가 발생해도 정책 검사 통과 시에만 발화
 * 
 * @description
 * Watchdog가 감지한 트리거는 반드시 이 게이트를 통과해야 발송됨.
 * Watchdog는 절대 직접 발송하지 않음.
 * 
 * 검사 순서:
 * 1. silent_mode 확인
 * 2. enabled_triggers[trigger_type] 확인
 * 3. 글로벌/트리거별 쿨다운 확인
 * 4. 디듀프(최근 동일 유형/동일 payload) 확인
 * 5. 레이트 리밋 확인
 */

import { TriggerType, Phase1Triggers } from '../constants/triggerTypes.js';
import {
    TriggerStatus,
    SuppressedReason,
    ProactivePolicyDefaults,
    checkApprovalGate
} from '../constants/proactivePolicy.js';

/**
 * 트리거 승인 결과 타입
 * @typedef {Object} ApprovalResult
 * @property {boolean} approved - 승인 여부
 * @property {string} [reason] - 차단 사유 (SuppressedReason)
 * @property {string} status - 최종 상태 (approved | suppressed)
 */

/**
 * Orchestrator 승인 게이트 - 메인 함수
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} triggerId - 트리거 문서 ID
 * @returns {Promise<ApprovalResult>}
 */
export async function orchestratorApproveTrigger(db, triggerId) {
    console.log(`[Orchestrator] Processing trigger: ${triggerId}`);

    try {
        // 1. 트리거 문서 조회
        const triggerRef = db.collection('triggers').doc(triggerId);
        const triggerDoc = await triggerRef.get();

        if (!triggerDoc.exists) {
            console.error(`[Orchestrator] Trigger not found: ${triggerId}`);
            return { approved: false, reason: 'TRIGGER_NOT_FOUND', status: TriggerStatus.SUPPRESSED };
        }

        const trigger = { id: triggerId, ...triggerDoc.data() };
        const userId = trigger.userId;

        if (!userId) {
            console.error(`[Orchestrator] Trigger missing userId: ${triggerId}`);
            return { approved: false, reason: 'INVALID_TRIGGER', status: TriggerStatus.SUPPRESSED };
        }

        // 2. 사용자 설정 로드
        const userDoc = await db.collection('users').doc(userId).get();
        const userSettings = userDoc.exists && userDoc.data().proactive_settings
            ? userDoc.data().proactive_settings
            : getDefaultProactiveSettings();

        // 3. 최근 트리거 이력 로드 (쿨다운/디듀프/레이트 리밋용)
        const recentTriggers = await getRecentTriggers(db, userId, trigger.trigger_type);

        // 4. 정책 평가
        const evaluation = await evaluateProactivePolicy(userSettings, trigger, recentTriggers);

        // 5. 결과에 따라 트리거 상태 업데이트
        const now = new Date();

        if (evaluation.approved) {
            await triggerRef.update({
                status: TriggerStatus.APPROVED,
                approved_at: now,
                suppressed_reason: null
            });

            console.log(`[Orchestrator] Trigger APPROVED: ${triggerId}`);
            return { approved: true, status: TriggerStatus.APPROVED };

        } else {
            await triggerRef.update({
                status: TriggerStatus.SUPPRESSED,
                suppressed_reason: evaluation.reason
            });

            console.log(`[Orchestrator] Trigger SUPPRESSED: ${triggerId}, reason: ${evaluation.reason}`);
            return { approved: false, reason: evaluation.reason, status: TriggerStatus.SUPPRESSED };
        }

    } catch (error) {
        console.error(`[Orchestrator] Error processing trigger ${triggerId}:`, error);
        return { approved: false, reason: 'INTERNAL_ERROR', status: TriggerStatus.SUPPRESSED };
    }
}

/**
 * Proactive 정책 평가 - 핵심 유틸리티
 * 
 * @param {Object} userSettings - 사용자의 proactive_settings
 * @param {Object} trigger - 트리거 문서 데이터
 * @param {Object} recentTriggers - 최근 트리거 이력
 * @returns {Promise<ApprovalResult>}
 */
export async function evaluateProactivePolicy(userSettings, trigger, recentTriggers = {}) {
    const triggerType = trigger.trigger_type;

    console.log(`[Orchestrator] Evaluating policy for trigger type: ${triggerType}`);

    // 1. Silent Mode 체크 (최우선)
    if (userSettings.silent_mode === true) {
        return {
            approved: false,
            reason: SuppressedReason.SILENT_MODE,
            status: TriggerStatus.SUPPRESSED
        };
    }

    // 2. 트리거 활성화 여부 체크
    if (userSettings.enabled_triggers && userSettings.enabled_triggers[triggerType] === false) {
        return {
            approved: false,
            reason: SuppressedReason.TRIGGER_DISABLED,
            status: TriggerStatus.SUPPRESSED
        };
    }

    // 3. 글로벌 쿨다운 체크
    const globalCooldownMs = (userSettings.cooldown?.global_minutes ||
        ProactivePolicyDefaults.globalCooldownMinutes) * 60 * 1000;

    if (recentTriggers.lastAnySentAt) {
        const elapsed = Date.now() - new Date(recentTriggers.lastAnySentAt).getTime();
        if (elapsed < globalCooldownMs) {
            return {
                approved: false,
                reason: SuppressedReason.COOLDOWN,
                status: TriggerStatus.SUPPRESSED
            };
        }
    }

    // 4. 트리거별 쿨다운 체크
    const perTriggerCooldownMs = getPerTriggerCooldown(userSettings, triggerType) * 60 * 1000;

    if (recentTriggers.lastTypeSentAt) {
        const elapsed = Date.now() - new Date(recentTriggers.lastTypeSentAt).getTime();
        if (elapsed < perTriggerCooldownMs) {
            return {
                approved: false,
                reason: SuppressedReason.COOLDOWN,
                status: TriggerStatus.SUPPRESSED
            };
        }
    }

    // 5. 디듀프 체크 (동일 payload)
    if (recentTriggers.recentPayloads && trigger.payload) {
        const payloadHash = hashPayload(trigger.payload);
        const dedupWindowMs = (ProactivePolicyDefaults.deduplication?.windowMinutes || 60) * 60 * 1000;

        for (const recent of recentTriggers.recentPayloads) {
            if (recent.hash === payloadHash) {
                const elapsed = Date.now() - new Date(recent.sentAt).getTime();
                if (elapsed < dedupWindowMs) {
                    return {
                        approved: false,
                        reason: SuppressedReason.DUPLICATE,
                        status: TriggerStatus.SUPPRESSED
                    };
                }
            }
        }
    }

    // 6. 레이트 리밋 체크 (시간당/일당)
    const maxPerHour = userSettings.rate_limit?.max_per_hour ||
        ProactivePolicyDefaults.rateLimit.maxPerHour;
    const maxPerDay = userSettings.rate_limit?.max_per_day ||
        ProactivePolicyDefaults.rateLimit.maxPerDay;

    if (recentTriggers.hourCount >= maxPerHour) {
        return {
            approved: false,
            reason: SuppressedReason.RATE_LIMIT,
            status: TriggerStatus.SUPPRESSED
        };
    }

    if (recentTriggers.dayCount >= maxPerDay) {
        return {
            approved: false,
            reason: SuppressedReason.RATE_LIMIT,
            status: TriggerStatus.SUPPRESSED
        };
    }

    // 모든 검사 통과
    return {
        approved: true,
        status: TriggerStatus.APPROVED
    };
}

/**
 * 최근 트리거 이력 조회
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @param {string} triggerType - 트리거 타입
 * @returns {Promise<Object>}
 */
async function getRecentTriggers(db, userId, triggerType) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
        // 지난 24시간 내 발송된 트리거 조회
        const triggersRef = db.collection('users').doc(userId).collection('triggers');
        const recentQuery = triggersRef
            .where('status', '==', TriggerStatus.SENT)
            .where('sent_at', '>=', oneDayAgo)
            .orderBy('sent_at', 'desc')
            .limit(50);

        const snapshot = await recentQuery.get();

        let lastAnySentAt = null;
        let lastTypeSentAt = null;
        let hourCount = 0;
        let dayCount = 0;
        const recentPayloads = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const sentAt = data.sent_at?.toDate ? data.sent_at.toDate() : new Date(data.sent_at);

            // 가장 최근 발송 시각
            if (!lastAnySentAt || sentAt > lastAnySentAt) {
                lastAnySentAt = sentAt;
            }

            // 해당 타입의 가장 최근 발송 시각
            if (data.trigger_type === triggerType) {
                if (!lastTypeSentAt || sentAt > lastTypeSentAt) {
                    lastTypeSentAt = sentAt;
                }
            }

            // 시간당/일당 카운트
            if (sentAt >= oneHourAgo) hourCount++;
            if (sentAt >= oneDayAgo) dayCount++;

            // payload 해시 저장 (디듀프용)
            if (data.payload) {
                recentPayloads.push({
                    hash: hashPayload(data.payload),
                    sentAt: sentAt
                });
            }
        });

        return {
            lastAnySentAt,
            lastTypeSentAt,
            hourCount,
            dayCount,
            recentPayloads
        };

    } catch (error) {
        console.error('[Orchestrator] Error fetching recent triggers:', error);
        return {
            lastAnySentAt: null,
            lastTypeSentAt: null,
            hourCount: 0,
            dayCount: 0,
            recentPayloads: []
        };
    }
}

/**
 * 트리거별 쿨다운 시간 조회 (분 단위)
 * 
 * @param {Object} userSettings 
 * @param {string} triggerType 
 * @returns {number} 쿨다운 시간 (분)
 */
function getPerTriggerCooldown(userSettings, triggerType) {
    // 사용자 설정에 트리거별 쿨다운이 있으면 사용
    if (userSettings.cooldown?.per_trigger_minutes?.[triggerType]) {
        return userSettings.cooldown.per_trigger_minutes[triggerType];
    }

    // 트리거 타입별 기본값 (TriggerMeta에서 가져올 수도 있음)
    const defaultCooldowns = {
        task_recovery: 1440,      // 24시간
        async_completion: 0,      // 즉시
        strategic_insight: 240,   // 4시간
        market_signal: 60,        // 1시간
        user_scheduler: 30,       // 30분
        lifecycle_crm: 1440,      // 24시간
        admin_broadcast: 0        // 즉시
    };

    return defaultCooldowns[triggerType] || ProactivePolicyDefaults.globalCooldownMinutes;
}

/**
 * Payload 해시 생성 (디듀프용)
 * 
 * @param {Object} payload 
 * @returns {string}
 */
function hashPayload(payload) {
    // 간단한 해시 - JSON 문자열화 후 정렬
    const sorted = JSON.stringify(payload, Object.keys(payload).sort());

    // 간단한 해시 함수 (실제 운영에서는 crypto 사용 권장)
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
        const char = sorted.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit integer로 변환
    }
    return hash.toString(16);
}

/**
 * 기본 proactive_settings 반환
 */
function getDefaultProactiveSettings() {
    return {
        silent_mode: false,
        enabled_triggers: {
            task_recovery: true,
            async_completion: true,
            strategic_insight: true,
            market_signal: true,
            user_scheduler: true,
            lifecycle_crm: true,
            admin_broadcast: true
        },
        cooldown: {
            global_minutes: ProactivePolicyDefaults.globalCooldownMinutes,
            per_trigger_minutes: {}
        },
        rate_limit: {
            max_per_hour: ProactivePolicyDefaults.rateLimit.maxPerHour,
            max_per_day: ProactivePolicyDefaults.rateLimit.maxPerDay
        }
    };
}

/**
 * 승인된 트리거를 발송 큐로 전달
 * (실제 발송은 이 함수 이후에만 수행)
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} triggerId - 트리거 ID
 * @param {Object} messageData - 발송할 메시지 데이터
 * @returns {Promise<boolean>}
 */
export async function enqueueApprovedTrigger(db, triggerId, messageData) {
    try {
        const triggerRef = db.collection('triggers').doc(triggerId);
        const triggerDoc = await triggerRef.get();

        if (!triggerDoc.exists) {
            console.error(`[Orchestrator] Cannot enqueue - trigger not found: ${triggerId}`);
            return false;
        }

        const trigger = triggerDoc.data();

        // 반드시 approved 상태여야 발송 가능
        if (trigger.status !== TriggerStatus.APPROVED) {
            console.error(`[Orchestrator] Cannot enqueue - trigger not approved: ${triggerId}, status: ${trigger.status}`);
            return false;
        }

        // 메시지 데이터 저장 및 상태를 SENT로 변경
        await triggerRef.update({
            status: TriggerStatus.SENT,
            sent_at: new Date(),
            message: messageData
        });

        console.log(`[Orchestrator] Trigger enqueued for delivery: ${triggerId}`);
        return true;

    } catch (error) {
        console.error(`[Orchestrator] Error enqueueing trigger ${triggerId}:`, error);
        return false;
    }
}

export default {
    orchestratorApproveTrigger,
    evaluateProactivePolicy,
    enqueueApprovedTrigger
};
