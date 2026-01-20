/**
 * ZYNK Persona Engine - Trigger Factory
 * 
 * 트리거 생성 유틸리티
 * 모든 트리거 감지기가 이 팩토리를 통해 트리거를 생성
 */

import { TriggerType } from '../constants/triggerTypes.js';
import { TriggerStatus } from '../constants/proactivePolicy.js';
import { orchestratorApproveTrigger } from '../orchestrator/approvalGate.js';
import { logTriggerEvent } from '../orchestrator/triggerLogger.js';

/**
 * 트리거 생성 및 승인 플로우 시작
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @param {string} triggerType - TriggerType enum 값
 * @param {Object} payload - 트리거 페이로드
 * @param {Object} [options] - 추가 옵션
 * @param {boolean} [options.autoApprove=true] - 즉시 승인 플로우 실행 여부
 * @returns {Promise<{triggerId: string, approved: boolean, reason?: string}>}
 */
export async function createTrigger(db, userId, triggerType, payload, options = {}) {
    const { autoApprove = true } = options;

    console.log(`[TriggerFactory] Creating trigger: ${triggerType} for user: ${userId}`);

    try {
        // 1. 트리거 문서 생성
        const triggerData = {
            userId,
            trigger_type: triggerType,
            status: TriggerStatus.DETECTED,
            payload: payload || {},
            detected_at: new Date(),
            approved_at: null,
            sent_at: null,
            suppressed_reason: null,
            metadata: {
                source: 'trigger_factory',
                version: '1.0.0'
            }
        };

        const triggerRef = await db
            .collection('users')
            .doc(userId)
            .collection('triggers')
            .add(triggerData);

        const triggerId = triggerRef.id;
        console.log(`[TriggerFactory] Trigger created: ${triggerId}`);

        // 2. 감지 이벤트 로깅
        await logTriggerEvent(db, {
            userId,
            triggerId,
            triggerType,
            event: 'detected',
            metadata: payload
        });

        // 3. 자동 승인 플로우 실행
        if (autoApprove) {
            // 트리거 문서를 루트 컬렉션에서 조회하도록 경로 조정
            const result = await processApproval(db, userId, triggerId);

            return {
                triggerId,
                approved: result.approved,
                reason: result.reason,
                status: result.status
            };
        }

        return {
            triggerId,
            approved: null, // 아직 처리되지 않음
            status: TriggerStatus.DETECTED
        };

    } catch (error) {
        console.error('[TriggerFactory] Error creating trigger:', error);
        throw error;
    }
}

/**
 * 트리거 승인 처리 (내부용)
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {string} triggerId 
 * @returns {Promise<Object>}
 */
async function processApproval(db, userId, triggerId) {
    try {
        // 트리거 문서 조회 (사용자 서브컬렉션에서)
        const triggerRef = db
            .collection('users')
            .doc(userId)
            .collection('triggers')
            .doc(triggerId);

        const triggerDoc = await triggerRef.get();

        if (!triggerDoc.exists) {
            return { approved: false, reason: 'TRIGGER_NOT_FOUND', status: TriggerStatus.SUPPRESSED };
        }

        const trigger = { id: triggerId, ...triggerDoc.data() };

        // 사용자 설정 로드
        const userDoc = await db.collection('users').doc(userId).get();
        const userSettings = userDoc.exists && userDoc.data().proactive_settings
            ? userDoc.data().proactive_settings
            : getDefaultProactiveSettings();

        // 최근 트리거 이력 조회
        const recentTriggers = await getRecentTriggersForUser(db, userId, trigger.trigger_type);

        // 정책 평가
        const { evaluateProactivePolicy } = await import('../orchestrator/approvalGate.js');
        const evaluation = await evaluateProactivePolicy(userSettings, trigger, recentTriggers);

        // 결과 업데이트
        const now = new Date();

        if (evaluation.approved) {
            await triggerRef.update({
                status: TriggerStatus.APPROVED,
                approved_at: now,
                suppressed_reason: null
            });

            await logTriggerEvent(db, {
                userId,
                triggerId,
                triggerType: trigger.trigger_type,
                event: 'approved'
            });

            console.log(`[TriggerFactory] Trigger APPROVED: ${triggerId}`);
            return { approved: true, status: TriggerStatus.APPROVED };

        } else {
            await triggerRef.update({
                status: TriggerStatus.SUPPRESSED,
                suppressed_reason: evaluation.reason
            });

            await logTriggerEvent(db, {
                userId,
                triggerId,
                triggerType: trigger.trigger_type,
                event: 'suppressed',
                reason: evaluation.reason
            });

            console.log(`[TriggerFactory] Trigger SUPPRESSED: ${triggerId}, reason: ${evaluation.reason}`);
            return { approved: false, reason: evaluation.reason, status: TriggerStatus.SUPPRESSED };
        }

    } catch (error) {
        console.error('[TriggerFactory] Error processing approval:', error);
        return { approved: false, reason: 'INTERNAL_ERROR', status: TriggerStatus.SUPPRESSED };
    }
}

/**
 * 사용자의 최근 트리거 이력 조회
 */
async function getRecentTriggersForUser(db, userId, triggerType) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
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

            if (!lastAnySentAt || sentAt > lastAnySentAt) {
                lastAnySentAt = sentAt;
            }

            if (data.trigger_type === triggerType) {
                if (!lastTypeSentAt || sentAt > lastTypeSentAt) {
                    lastTypeSentAt = sentAt;
                }
            }

            if (sentAt >= oneHourAgo) hourCount++;
            if (sentAt >= oneDayAgo) dayCount++;

            if (data.payload) {
                recentPayloads.push({
                    hash: hashPayload(data.payload),
                    sentAt: sentAt
                });
            }
        });

        return { lastAnySentAt, lastTypeSentAt, hourCount, dayCount, recentPayloads };

    } catch (error) {
        console.error('[TriggerFactory] Error fetching recent triggers:', error);
        return { lastAnySentAt: null, lastTypeSentAt: null, hourCount: 0, dayCount: 0, recentPayloads: [] };
    }
}

/**
 * 기본 proactive_settings
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
        cooldown: { global_minutes: 5, per_trigger_minutes: {} },
        rate_limit: { max_per_hour: 5, max_per_day: 15 }
    };
}

/**
 * Payload 해시 (디듀프용)
 */
function hashPayload(payload) {
    const sorted = JSON.stringify(payload, Object.keys(payload).sort());
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
        const char = sorted.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

export default {
    createTrigger
};
