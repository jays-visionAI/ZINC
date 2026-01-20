/**
 * ZYNK Persona Engine - Lifecycle CRM Trigger Detector
 * 
 * 조건: 가입일 기준 D+1, D+7, D+30 Cron
 * 
 * @description
 * 온보딩 팁, 기능 소개 등 사용자 라이프사이클 기반 알림
 */

import { TriggerType } from '../constants/triggerTypes.js';
import { createTrigger } from './triggerFactory.js';

/**
 * 라이프사이클 메시지 정의
 */
const LIFECYCLE_MESSAGES = {
    day_1: {
        ko: {
            title: 'ZYNK에 오신 것을 환영합니다!',
            body: 'ZYNK의 핵심 기능을 알아보세요. Studio에서 첫 번째 콘텐츠를 만들어보는 건 어떨까요?',
            cta: [
                { label: 'Studio 열기', action: 'navigate:/studio', primary: true },
                { label: '나중에', action: 'dismiss', primary: false }
            ]
        },
        en: {
            title: 'Welcome to ZYNK!',
            body: 'Discover the core features of ZYNK. How about creating your first content in Studio?',
            cta: [
                { label: 'Open Studio', action: 'navigate:/studio', primary: true },
                { label: 'Later', action: 'dismiss', primary: false }
            ]
        }
    },
    day_7: {
        ko: {
            title: '첫 주를 함께 해주셨네요!',
            body: 'Multi-Channel 기능을 활용해보셨나요? 한 번에 여러 채널용 콘텐츠를 생성할 수 있습니다.',
            cta: [
                { label: '멀티채널 알아보기', action: 'navigate:/help/multi-channel', primary: true }
            ]
        },
        en: {
            title: 'One week together!',
            body: 'Have you tried the Multi-Channel feature? Create content for multiple channels at once.',
            cta: [
                { label: 'Learn Multi-Channel', action: 'navigate:/help/multi-channel', primary: true }
            ]
        }
    },
    day_30: {
        ko: {
            title: '한 달간 감사합니다!',
            body: 'ZYNK 프로 요금제로 더 많은 기능을 이용해보세요. 지금 업그레이드하면 20% 할인!',
            cta: [
                { label: '프로 플랜 보기', action: 'navigate:/billing', primary: true },
                { label: '괜찮아요', action: 'dismiss', primary: false }
            ]
        },
        en: {
            title: 'Thank you for one month!',
            body: 'Unlock more features with ZYNK Pro. Upgrade now for 20% off!',
            cta: [
                { label: 'View Pro Plan', action: 'navigate:/billing', primary: true },
                { label: 'No thanks', action: 'dismiss', primary: false }
            ]
        }
    }
};

/**
 * 라이프사이클 이벤트 감지 - Cron에서 일일 호출
 * 
 * @param {Object} db - Firestore 인스턴스
 * @returns {Promise<Array>}
 */
export async function detectLifecycleEvents(db) {
    console.log('[LifecycleCRM] Checking lifecycle events...');

    const results = [];
    const now = new Date();

    try {
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();

            // 가입일 확인
            const createdAt = userData.created_at?.toDate
                ? userData.created_at.toDate()
                : new Date(userData.created_at || userData.createdAt);

            if (!createdAt || isNaN(createdAt.getTime())) {
                continue;
            }

            const daysSinceSignup = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

            // D+1, D+7, D+30 체크
            const milestones = [1, 7, 30];
            const matchedMilestone = milestones.find(m => daysSinceSignup === m);

            if (matchedMilestone) {
                // 이미 해당 마일스톤 알림을 받았는지 확인
                const sentKey = `lifecycle_day_${matchedMilestone}_sent`;
                if (userData[sentKey]) {
                    continue;
                }

                const result = await detectLifecycleMilestone(db, userId, matchedMilestone, userData);

                if (result) {
                    results.push(result);

                    // 발송 완료 표시
                    if (result.approved) {
                        await userDoc.ref.update({ [sentKey]: true });
                    }
                }
            }
        }

        console.log(`[LifecycleCRM] Processed ${results.length} lifecycle events`);
        return results;

    } catch (error) {
        console.error('[LifecycleCRM] Error detecting lifecycle events:', error);
        return results;
    }
}

/**
 * 개별 마일스톤 트리거 생성
 * 
 * @param {Object} db 
 * @param {string} userId 
 * @param {number} milestone - 가입 후 일수 (1, 7, 30)
 * @param {Object} userData 
 * @returns {Promise<Object|null>}
 */
export async function detectLifecycleMilestone(db, userId, milestone, userData) {
    console.log(`[LifecycleCRM] Processing milestone D+${milestone} for user: ${userId}`);

    try {
        const messageKey = `day_${milestone}`;
        const messages = LIFECYCLE_MESSAGES[messageKey];

        if (!messages) {
            console.log(`[LifecycleCRM] No message defined for milestone: ${messageKey}`);
            return null;
        }

        const lang = userData.language || 'ko';
        const message = messages[lang] || messages.en;

        const payload = {
            milestone: `D+${milestone}`,
            milestoneDay: milestone,
            title: message.title,
            body: message.body,
            cta: message.cta,
            userLanguage: lang,
            signupDate: userData.created_at?.toDate?.().toISOString() || null
        };

        const result = await createTrigger(db, userId, TriggerType.LIFECYCLE_CRM, payload);
        console.log(`[LifecycleCRM] Trigger created: ${result.triggerId}, approved: ${result.approved}`);

        return result;

    } catch (error) {
        console.error('[LifecycleCRM] Error creating lifecycle trigger:', error);
        return null;
    }
}

export default {
    detectLifecycleEvents,
    detectLifecycleMilestone,
    LIFECYCLE_MESSAGES
};
