/**
 * ZYNK Persona Engine - Async Completion Trigger Detector
 * 
 * 조건: jobs.status가 finished로 전환될 때
 * 
 * @description
 * 백그라운드 작업(이미지 생성, 대량 처리 등)이 완료되면 알림
 */

import { TriggerType } from '../constants/triggerTypes.js';
import { createTrigger } from './triggerFactory.js';

/**
 * Job 완료 감지 - Firestore onUpdate 트리거에서 호출
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @param {string} jobId - 완료된 Job ID
 * @param {Object} jobData - Job 데이터
 * @returns {Promise<Object|null>}
 */
export async function detectAsyncCompletion(db, userId, jobId, jobData) {
    console.log(`[AsyncCompletion] Job completed: ${jobId}`);

    try {
        // Job 상태 확인
        if (jobData.status !== 'finished') {
            console.log('[AsyncCompletion] Job not finished, skipping');
            return null;
        }

        // 트리거 생성
        const payload = {
            jobId,
            jobType: jobData.job_type || 'unknown',
            jobTitle: jobData.title || 'Background Task',
            startedAt: jobData.started_at?.toDate?.().toISOString() || null,
            finishedAt: jobData.finished_at?.toDate?.().toISOString() || new Date().toISOString(),
            resultSummary: jobData.result_summary || null,
            resultUrl: jobData.result_url || null,
            success: jobData.success !== false
        };

        const result = await createTrigger(db, userId, TriggerType.ASYNC_COMPLETION, payload);
        console.log(`[AsyncCompletion] Trigger created: ${result.triggerId}, approved: ${result.approved}`);

        return result;

    } catch (error) {
        console.error('[AsyncCompletion] Error detecting async completion:', error);
        return null;
    }
}

/**
 * Cloud Function용 Job 상태 변경 핸들러
 * 
 * @param {Object} change - Firestore 문서 변경
 * @param {Object} context - 함수 컨텍스트
 * @param {Object} db - Firestore 인스턴스
 */
export async function onJobStatusChange(change, context, db) {
    const before = change.before.data();
    const after = change.after.data();

    // finished로 변경된 경우에만 처리
    if (before?.status !== 'finished' && after?.status === 'finished') {
        const userId = context.params.userId;
        const jobId = context.params.jobId;

        await detectAsyncCompletion(db, userId, jobId, after);
    }
}

/**
 * 대기 중인 Job들 일괄 확인 (Cron용)
 * 
 * @param {Object} db 
 */
export async function checkPendingJobs(db) {
    console.log('[AsyncCompletion] Checking pending jobs...');

    try {
        // 모든 사용자의 pending/running jobs 조회
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const jobsRef = db.collection('users').doc(userId).collection('jobs');

            // finished 상태이면서 알림 미발송인 jobs 조회
            const query = jobsRef
                .where('status', '==', 'finished')
                .where('notification_sent', '==', false)
                .limit(10);

            const jobsSnapshot = await query.get();

            for (const jobDoc of jobsSnapshot.docs) {
                const job = jobDoc.data();
                const result = await detectAsyncCompletion(db, userId, jobDoc.id, job);

                if (result?.approved) {
                    // 알림 발송 완료 표시
                    await jobDoc.ref.update({ notification_sent: true });
                }
            }
        }

    } catch (error) {
        console.error('[AsyncCompletion] Error checking pending jobs:', error);
    }
}

export default {
    detectAsyncCompletion,
    onJobStatusChange,
    checkPendingJobs
};
