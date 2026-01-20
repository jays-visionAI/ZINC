/**
 * ZYNK Persona Engine - Triggers Module Index
 * 
 * Phase 1 트리거 감지기 5종 통합 export
 */

// 트리거 팩토리 (공통)
export { createTrigger, default as TriggerFactory } from './triggerFactory.js';

// Phase 1 트리거 감지기
export {
    detectTaskRecovery,
    onSessionStart,
    default as TaskRecoveryDetector
} from './taskRecoveryDetector.js';

export {
    detectAsyncCompletion,
    onJobStatusChange,
    checkPendingJobs,
    default as AsyncCompletionDetector
} from './asyncCompletionDetector.js';

export {
    detectScheduledEvents,
    detectUserSchedule,
    createSchedule,
    default as UserSchedulerDetector
} from './userSchedulerDetector.js';

export {
    detectLifecycleEvents,
    detectLifecycleMilestone,
    LIFECYCLE_MESSAGES,
    default as LifecycleCRMDetector
} from './lifecycleCRMDetector.js';

export {
    detectScheduledBroadcasts,
    createBroadcast,
    sendImmediateBroadcast,
    default as AdminBroadcastDetector
} from './adminBroadcastDetector.js';

/**
 * 모든 Cron 기반 감지기 실행 (일일 Cron용)
 * 
 * @param {Object} db - Firestore 인스턴스
 */
export async function runAllCronTriggers(db) {
    console.log('[Triggers] Running all cron-based triggers...');

    const results = {
        scheduler: null,
        lifecycle: null,
        broadcast: null,
        asyncJobs: null
    };

    try {
        // 1. User Scheduler (15분 lookahead)
        const { detectScheduledEvents } = await import('./userSchedulerDetector.js');
        results.scheduler = await detectScheduledEvents(db, 15);

        // 2. Lifecycle CRM (D+1, D+7, D+30)
        const { detectLifecycleEvents } = await import('./lifecycleCRMDetector.js');
        results.lifecycle = await detectLifecycleEvents(db);

        // 3. Admin Broadcast
        const { detectScheduledBroadcasts } = await import('./adminBroadcastDetector.js');
        results.broadcast = await detectScheduledBroadcasts(db);

        // 4. Pending Async Jobs
        const { checkPendingJobs } = await import('./asyncCompletionDetector.js');
        results.asyncJobs = await checkPendingJobs(db);

        console.log('[Triggers] Cron triggers completed:', results);
        return results;

    } catch (error) {
        console.error('[Triggers] Error running cron triggers:', error);
        return results;
    }
}
