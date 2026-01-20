/**
 * ZYNK Persona Engine - Trigger Logger
 * 
 * 트리거 이벤트 로깅 유틸리티
 * 쿨다운/디듀프 추적 및 디버깅용
 */

import { TriggerStatus, SuppressedReason } from '../constants/proactivePolicy.js';

/**
 * 트리거 이벤트 로그 기록
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {Object} logData - 로그 데이터
 * @param {string} logData.userId - 사용자 ID
 * @param {string} logData.triggerId - 트리거 ID
 * @param {string} logData.triggerType - 트리거 타입
 * @param {string} logData.event - 이벤트 타입 (detected, approved, suppressed, sent)
 * @param {string} [logData.reason] - 차단 사유
 * @param {Object} [logData.metadata] - 추가 메타데이터
 * @returns {Promise<string>} 로그 문서 ID
 */
export async function logTriggerEvent(db, logData) {
    const { userId, triggerId, triggerType, event, reason, metadata } = logData;

    try {
        const logEntry = {
            userId,
            triggerId,
            triggerType,
            event,
            reason: reason || null,
            metadata: metadata || {},
            timestamp: new Date(),
            // 추적용 필드
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            date: new Date().toISOString().split('T')[0]
        };

        // 사용자별 트리거 로그 컬렉션에 저장
        const logRef = await db
            .collection('users')
            .doc(userId)
            .collection('trigger_logs')
            .add(logEntry);

        console.log(`[TriggerLogger] Event logged: ${event} for trigger ${triggerId}`);
        return logRef.id;

    } catch (error) {
        console.error('[TriggerLogger] Error logging event:', error);
        return null;
    }
}

/**
 * 트리거 로그 조회
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 조회 옵션
 * @param {string} [options.triggerType] - 특정 트리거 타입만
 * @param {string} [options.event] - 특정 이벤트만
 * @param {number} [options.limit] - 최대 개수
 * @param {Date} [options.startDate] - 시작 일시
 * @returns {Promise<Array>}
 */
export async function getTriggerLogs(db, userId, options = {}) {
    try {
        let query = db
            .collection('users')
            .doc(userId)
            .collection('trigger_logs')
            .orderBy('timestamp', 'desc');

        if (options.triggerType) {
            query = query.where('triggerType', '==', options.triggerType);
        }

        if (options.event) {
            query = query.where('event', '==', options.event);
        }

        if (options.startDate) {
            query = query.where('timestamp', '>=', options.startDate);
        }

        query = query.limit(options.limit || 100);

        const snapshot = await query.get();
        const logs = [];

        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });

        return logs;

    } catch (error) {
        console.error('[TriggerLogger] Error fetching logs:', error);
        return [];
    }
}

/**
 * 트리거 통계 조회
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @param {string} period - 기간 (today, week, month)
 * @returns {Promise<Object>}
 */
export async function getTriggerStats(db, userId, period = 'today') {
    const now = new Date();
    let startDate;

    switch (period) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        default:
            startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    try {
        const logs = await getTriggerLogs(db, userId, { startDate, limit: 500 });

        const stats = {
            total: logs.length,
            byEvent: {
                detected: 0,
                approved: 0,
                suppressed: 0,
                sent: 0
            },
            byTriggerType: {},
            byReason: {},
            approvalRate: 0
        };

        logs.forEach(log => {
            // 이벤트별 카운트
            if (stats.byEvent[log.event] !== undefined) {
                stats.byEvent[log.event]++;
            }

            // 트리거 타입별 카운트
            if (!stats.byTriggerType[log.triggerType]) {
                stats.byTriggerType[log.triggerType] = 0;
            }
            stats.byTriggerType[log.triggerType]++;

            // 차단 사유별 카운트
            if (log.reason) {
                if (!stats.byReason[log.reason]) {
                    stats.byReason[log.reason] = 0;
                }
                stats.byReason[log.reason]++;
            }
        });

        // 승인률 계산
        const processed = stats.byEvent.approved + stats.byEvent.suppressed;
        if (processed > 0) {
            stats.approvalRate = Math.round((stats.byEvent.approved / processed) * 100);
        }

        return stats;

    } catch (error) {
        console.error('[TriggerLogger] Error calculating stats:', error);
        return null;
    }
}

export default {
    logTriggerEvent,
    getTriggerLogs,
    getTriggerStats
};
