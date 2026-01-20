/**
 * ZYNK Persona Engine - User Scheduler Trigger Detector
 * 
 * 조건: Cron 기반 - 특정 시각 도달 시 trigger 생성
 * 
 * @description
 * 사용자 일정/리마인더가 예정 시간에 도달했을 때 알림
 */

import { TriggerType } from '../constants/triggerTypes.js';
import { createTrigger } from './triggerFactory.js';

/**
 * 예정된 일정 감지 - Cron에서 주기적으로 호출
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {number} [lookaheadMinutes=15] - 앞으로 몇 분 내 일정을 조회할지
 * @returns {Promise<Array>} 생성된 트리거 결과 배열
 */
export async function detectScheduledEvents(db, lookaheadMinutes = 15) {
    console.log(`[UserScheduler] Checking scheduled events (lookahead: ${lookaheadMinutes}min)`);

    const results = [];
    const now = new Date();
    const lookahead = new Date(now.getTime() + lookaheadMinutes * 60 * 1000);

    try {
        // 모든 사용자의 예정된 일정 조회
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;

            // 사용자의 스케줄/리마인더 조회
            const schedulesRef = db.collection('users').doc(userId).collection('schedules');
            const query = schedulesRef
                .where('scheduled_at', '>=', now)
                .where('scheduled_at', '<=', lookahead)
                .where('notification_sent', '==', false)
                .orderBy('scheduled_at', 'asc')
                .limit(5);

            const schedulesSnapshot = await query.get();

            for (const scheduleDoc of schedulesSnapshot.docs) {
                const schedule = scheduleDoc.data();

                const result = await detectUserSchedule(db, userId, scheduleDoc.id, schedule);

                if (result) {
                    results.push(result);

                    // 알림 발송 완료 표시
                    if (result.approved) {
                        await scheduleDoc.ref.update({ notification_sent: true });
                    }
                }
            }
        }

        console.log(`[UserScheduler] Processed ${results.length} scheduled events`);
        return results;

    } catch (error) {
        console.error('[UserScheduler] Error detecting scheduled events:', error);
        return results;
    }
}

/**
 * 개별 일정 트리거 생성
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {string} scheduleId 
 * @param {Object} scheduleData 
 * @returns {Promise<Object|null>}
 */
export async function detectUserSchedule(db, userId, scheduleId, scheduleData) {
    console.log(`[UserScheduler] Processing schedule: ${scheduleId}`);

    try {
        const scheduledAt = scheduleData.scheduled_at?.toDate
            ? scheduleData.scheduled_at.toDate()
            : new Date(scheduleData.scheduled_at);

        const payload = {
            scheduleId,
            title: scheduleData.title || 'Reminder',
            description: scheduleData.description || '',
            scheduledAt: scheduledAt.toISOString(),
            type: scheduleData.type || 'reminder', // reminder, deadline, meeting, etc.
            priority: scheduleData.priority || 'normal',
            relatedProjectId: scheduleData.project_id || null,
            relatedDraftId: scheduleData.draft_id || null
        };

        const result = await createTrigger(db, userId, TriggerType.USER_SCHEDULER, payload);
        console.log(`[UserScheduler] Trigger created: ${result.triggerId}, approved: ${result.approved}`);

        return result;

    } catch (error) {
        console.error('[UserScheduler] Error creating schedule trigger:', error);
        return null;
    }
}

/**
 * 사용자 일정 생성 (헬퍼)
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {Object} scheduleData 
 * @returns {Promise<string>} 생성된 일정 ID
 */
export async function createSchedule(db, userId, scheduleData) {
    const schedule = {
        title: scheduleData.title,
        description: scheduleData.description || '',
        scheduled_at: new Date(scheduleData.scheduledAt),
        type: scheduleData.type || 'reminder',
        priority: scheduleData.priority || 'normal',
        project_id: scheduleData.projectId || null,
        draft_id: scheduleData.draftId || null,
        notification_sent: false,
        created_at: new Date()
    };

    const ref = await db.collection('users').doc(userId).collection('schedules').add(schedule);
    console.log(`[UserScheduler] Schedule created: ${ref.id}`);

    return ref.id;
}

export default {
    detectScheduledEvents,
    detectUserSchedule,
    createSchedule
};
