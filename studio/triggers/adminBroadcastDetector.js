/**
 * ZYNK Persona Engine - Admin Broadcast Trigger Detector
 * 
 * 조건: admin/broadcasts 생성/스케줄 도래 시 대상 유저에 trigger 생성
 * 
 * @description
 * 관리자 공지사항, 시스템 점검 알림, 긴급 공지 등
 */

import { TriggerType } from '../constants/triggerTypes.js';
import { BroadcastSeverity } from '../constants/proactivePolicy.js';
import { createTrigger } from './triggerFactory.js';

/**
 * 예정된 브로드캐스트 감지 - Cron에서 주기적으로 호출
 * 
 * @param {Object} db - Firestore 인스턴스
 * @returns {Promise<Object>} 처리 결과
 */
export async function detectScheduledBroadcasts(db) {
    console.log('[AdminBroadcast] Checking scheduled broadcasts...');

    const now = new Date();
    const results = {
        processed: 0,
        triggered: 0,
        errors: 0
    };

    try {
        // 발송 예정이면서 아직 발송되지 않은 브로드캐스트 조회
        const broadcastsRef = db.collection('admin').doc('broadcasts').collection('items');
        const query = broadcastsRef
            .where('scheduled_at', '<=', now)
            .where('status', '==', 'scheduled')
            .limit(10);

        const snapshot = await query.get();

        for (const broadcastDoc of snapshot.docs) {
            const broadcast = { id: broadcastDoc.id, ...broadcastDoc.data() };
            results.processed++;

            try {
                await processBroadcast(db, broadcast, broadcastDoc.ref);
                results.triggered++;
            } catch (error) {
                console.error(`[AdminBroadcast] Error processing broadcast ${broadcast.id}:`, error);
                results.errors++;
            }
        }

        console.log(`[AdminBroadcast] Processed: ${results.processed}, Triggered: ${results.triggered}, Errors: ${results.errors}`);
        return results;

    } catch (error) {
        console.error('[AdminBroadcast] Error detecting broadcasts:', error);
        return results;
    }
}

/**
 * 브로드캐스트 처리 - 대상 유저들에게 트리거 생성
 * 
 * @param {Object} db 
 * @param {Object} broadcast 
 * @param {Object} broadcastRef 
 */
async function processBroadcast(db, broadcast, broadcastRef) {
    console.log(`[AdminBroadcast] Processing broadcast: ${broadcast.id}`);

    // 상태를 'sending'으로 변경
    await broadcastRef.update({ status: 'sending', started_at: new Date() });

    try {
        // 대상 유저 목록 조회
        const targetUsers = await getTargetUsers(db, broadcast);

        console.log(`[AdminBroadcast] Target users: ${targetUsers.length}`);

        let successCount = 0;
        let failCount = 0;

        for (const userId of targetUsers) {
            try {
                await createBroadcastTrigger(db, userId, broadcast);
                successCount++;
            } catch (error) {
                console.error(`[AdminBroadcast] Error for user ${userId}:`, error);
                failCount++;
            }
        }

        // 발송 완료 상태로 변경
        await broadcastRef.update({
            status: 'sent',
            sent_at: new Date(),
            target_count: targetUsers.length,
            success_count: successCount,
            fail_count: failCount
        });

        console.log(`[AdminBroadcast] Broadcast sent: ${successCount}/${targetUsers.length}`);

    } catch (error) {
        // 에러 발생 시 상태 변경
        await broadcastRef.update({
            status: 'failed',
            error_message: error.message
        });
        throw error;
    }
}

/**
 * 대상 유저 목록 조회
 * 
 * @param {Object} db 
 * @param {Object} broadcast 
 * @returns {Promise<Array<string>>}
 */
async function getTargetUsers(db, broadcast) {
    const { target_type, target_segment, target_user_ids } = broadcast;

    switch (target_type) {
        case 'all':
            // 모든 활성 사용자
            const allUsers = await db.collection('users')
                .where('status', '!=', 'deleted')
                .select()
                .get();
            return allUsers.docs.map(doc => doc.id);

        case 'segment':
            // 특정 세그먼트 (예: 'pro_users', 'trial_users')
            const segmentQuery = db.collection('users');
            // 세그먼트별 필터 로직 (확장 필요)
            if (target_segment === 'pro_users') {
                const proUsers = await segmentQuery.where('subscription.plan', '==', 'pro').get();
                return proUsers.docs.map(doc => doc.id);
            } else if (target_segment === 'trial_users') {
                const trialUsers = await segmentQuery.where('subscription.plan', '==', 'trial').get();
                return trialUsers.docs.map(doc => doc.id);
            }
            return [];

        case 'specific':
            // 특정 사용자 목록
            return target_user_ids || [];

        default:
            return [];
    }
}

/**
 * 개별 사용자에게 브로드캐스트 트리거 생성
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {Object} broadcast 
 * @returns {Promise<Object>}
 */
async function createBroadcastTrigger(db, userId, broadcast) {
    const payload = {
        broadcastId: broadcast.id,
        title: broadcast.title,
        body: broadcast.body,
        severity: broadcast.severity || BroadcastSeverity.INFO,
        category: broadcast.category || 'announcement',
        actionUrl: broadcast.action_url || null,
        expiresAt: broadcast.expires_at?.toDate?.().toISOString() || null
    };

    const result = await createTrigger(db, userId, TriggerType.ADMIN_BROADCAST, payload);
    return result;
}

/**
 * 새 브로드캐스트 생성 (관리자용)
 * 
 * @param {Object} db 
 * @param {Object} broadcastData 
 * @returns {Promise<string>} 생성된 브로드캐스트 ID
 */
export async function createBroadcast(db, broadcastData) {
    const broadcast = {
        title: broadcastData.title,
        body: broadcastData.body,
        severity: broadcastData.severity || BroadcastSeverity.INFO,
        category: broadcastData.category || 'announcement',
        target_type: broadcastData.targetType || 'all',
        target_segment: broadcastData.targetSegment || null,
        target_user_ids: broadcastData.targetUserIds || null,
        scheduled_at: new Date(broadcastData.scheduledAt || Date.now()),
        expires_at: broadcastData.expiresAt ? new Date(broadcastData.expiresAt) : null,
        action_url: broadcastData.actionUrl || null,
        status: 'scheduled',
        created_by: broadcastData.createdBy,
        created_at: new Date()
    };

    const ref = await db.collection('admin').doc('broadcasts').collection('items').add(broadcast);
    console.log(`[AdminBroadcast] Broadcast created: ${ref.id}`);

    return ref.id;
}

/**
 * 즉시 발송 브로드캐스트 (관리자용)
 * 
 * @param {Object} db 
 * @param {Object} broadcastData 
 * @returns {Promise<Object>}
 */
export async function sendImmediateBroadcast(db, broadcastData) {
    const broadcastId = await createBroadcast(db, {
        ...broadcastData,
        scheduledAt: new Date() // 즉시
    });

    // 즉시 처리
    return await detectScheduledBroadcasts(db);
}

export default {
    detectScheduledBroadcasts,
    createBroadcast,
    sendImmediateBroadcast
};
