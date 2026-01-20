/**
 * ZYNK Persona Engine - Task Recovery Trigger Detector
 * 
 * 조건: draft.status=saved && completed=false + 세션 종료/재진입
 * 
 * @description
 * 사용자가 작업 중 이탈했다가 복귀할 때,
 * 미완성 초안이 있으면 이어쓰기를 제안
 */

import { TriggerType } from '../constants/triggerTypes.js';
import { createTrigger } from './triggerFactory.js';

/**
 * 미완성 초안 감지 - 세션 시작 시 호출
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object|null>} 트리거 결과 또는 null
 */
export async function detectTaskRecovery(db, userId) {
    console.log(`[TaskRecovery] Checking for incomplete drafts for user: ${userId}`);

    try {
        // 미완성 초안 조회
        const draftsRef = db.collection('users').doc(userId).collection('drafts');
        const query = draftsRef
            .where('status', '==', 'saved')
            .where('completed', '==', false)
            .orderBy('updated_at', 'desc')
            .limit(1);

        const snapshot = await query.get();

        if (snapshot.empty) {
            console.log('[TaskRecovery] No incomplete drafts found');
            return null;
        }

        const draftDoc = snapshot.docs[0];
        const draft = { id: draftDoc.id, ...draftDoc.data() };

        // 마지막 업데이트 시간 확인 (최소 1시간 이전이어야 함)
        const lastUpdate = draft.updated_at?.toDate ? draft.updated_at.toDate() : new Date(draft.updated_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (lastUpdate > oneHourAgo) {
            console.log('[TaskRecovery] Draft too recent, skipping');
            return null;
        }

        // 트리거 생성
        const payload = {
            draftId: draft.id,
            draftTitle: draft.title || 'Untitled Draft',
            draftType: draft.content_type || 'general',
            lastEdited: lastUpdate.toISOString(),
            progress: draft.progress || 0
        };

        const result = await createTrigger(db, userId, TriggerType.TASK_RECOVERY, payload);
        console.log(`[TaskRecovery] Trigger created: ${result.triggerId}, approved: ${result.approved}`);

        return result;

    } catch (error) {
        console.error('[TaskRecovery] Error detecting task recovery:', error);
        return null;
    }
}

/**
 * 세션 시작 이벤트 핸들러
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {string} sessionId 
 */
export async function onSessionStart(db, userId, sessionId) {
    console.log(`[TaskRecovery] Session started: ${sessionId}`);

    // 이전 세션 종료 시간 확인
    const userDoc = await db.collection('users').doc(userId).get();
    const lastSessionEnd = userDoc.data()?.last_session_end_at;

    if (lastSessionEnd) {
        const endTime = lastSessionEnd.toDate ? lastSessionEnd.toDate() : new Date(lastSessionEnd);
        const hoursSinceLastSession = (Date.now() - endTime.getTime()) / (1000 * 60 * 60);

        // 1시간 이상 이탈 후 복귀한 경우에만 감지
        if (hoursSinceLastSession >= 1) {
            await detectTaskRecovery(db, userId);
        }
    }
}

export default {
    detectTaskRecovery,
    onSessionStart
};
