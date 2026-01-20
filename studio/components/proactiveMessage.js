/**
 * ZYNK Persona Engine - Proactive Message Renderer
 * 
 * 선제 메시지를 일반 챗 메시지와 동일 채널에 표시하되 시각적으로 구분
 * 
 * @description
 * - role=assistant, agent_id=ORCHESTRATOR로 저장
 * - metadata.proactive=true로 표시
 * - UI에서 "알림/제안/공지" 라벨 표시
 * - CTA 버튼 1~2개 포함
 */

import { TriggerType, TriggerMeta } from '../constants/triggerTypes.js';
import { AgentRole } from '../constants/agentRoles.js';
import { BroadcastSeverity } from '../constants/proactivePolicy.js';

/**
 * Proactive 메시지 타입별 라벨 및 스타일
 */
const PROACTIVE_LABELS = {
    task_recovery: {
        ko: '작업 복구',
        en: 'Task Recovery',
        icon: 'refresh',
        color: '#10B981'  // green
    },
    async_completion: {
        ko: '작업 완료',
        en: 'Job Complete',
        icon: 'check',
        color: '#3B82F6'  // blue
    },
    strategic_insight: {
        ko: '전략 인사이트',
        en: 'Insight',
        icon: 'star',
        color: '#F59E0B'  // amber
    },
    market_signal: {
        ko: '시장 시그널',
        en: 'Market Signal',
        icon: 'chart',
        color: '#8B5CF6'  // purple
    },
    user_scheduler: {
        ko: '일정 알림',
        en: 'Reminder',
        icon: 'calendar',
        color: '#6366F1'  // indigo
    },
    lifecycle_crm: {
        ko: '도움말',
        en: 'Tip',
        icon: 'heart',
        color: '#EC4899'  // pink
    },
    admin_broadcast: {
        ko: '공지',
        en: 'Notice',
        icon: 'bell',
        color: '#EF4444'  // red
    }
};

/**
 * Proactive 메시지 아이콘 SVG
 */
const PROACTIVE_ICONS = {
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    star: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
    calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    heart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>'
};

/**
 * Proactive 메시지 HTML 생성
 * 
 * @param {Object} message - 메시지 데이터
 * @param {string} message.triggerType - 트리거 타입
 * @param {string} message.title - 메시지 제목
 * @param {string} message.body - 메시지 본문
 * @param {Array} message.cta - CTA 버튼 배열 [{label, action, primary}]
 * @param {string} [message.severity] - 심각도 (admin_broadcast용)
 * @param {string} [lang='ko'] - 언어
 * @returns {string} HTML 문자열
 */
export function renderProactiveMessage(message, lang = 'ko') {
    const { triggerType, title, body, cta = [], severity } = message;
    const labelConfig = PROACTIVE_LABELS[triggerType] || PROACTIVE_LABELS.admin_broadcast;
    const label = lang === 'ko' ? labelConfig.ko : labelConfig.en;
    const icon = PROACTIVE_ICONS[labelConfig.icon] || PROACTIVE_ICONS.bell;
    const color = severity === 'critical' ? '#EF4444' :
        severity === 'warning' ? '#F59E0B' : labelConfig.color;

    // CTA 버튼 렌더링
    const ctaHtml = cta.slice(0, 2).map((btn, idx) => {
        const isPrimary = btn.primary || idx === 0;
        const btnClass = isPrimary ? 'proactive-cta-primary' : 'proactive-cta-secondary';
        return `<button class="${btnClass}" data-action="${btn.action}" onclick="handleProactiveCTA('${btn.action}', event)">${btn.label}</button>`;
    }).join('');

    return `
        <div class="proactive-message" data-trigger-type="${triggerType}">
            <div class="proactive-header">
                <div class="proactive-label" style="background: ${color}20; color: ${color}; border-color: ${color}40;">
                    <span class="proactive-icon">${icon}</span>
                    <span>${label}</span>
                </div>
                <button class="proactive-dismiss" onclick="dismissProactiveMessage(this)" title="Dismiss">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="proactive-content">
                ${title ? `<div class="proactive-title">${title}</div>` : ''}
                <div class="proactive-body">${body}</div>
            </div>
            ${ctaHtml ? `<div class="proactive-actions">${ctaHtml}</div>` : ''}
        </div>
    `;
}

/**
 * Proactive 메시지를 채팅 스트림에 추가
 * 
 * @param {Object} message - 메시지 데이터
 */
export function addProactiveMessage(message) {
    const lang = localStorage.getItem('zynk-language') || 'ko';
    const html = renderProactiveMessage(message, lang);

    const streamContainer = document.getElementById('chat-stream-log');
    if (streamContainer) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'proactive-message-wrapper';
        msgDiv.innerHTML = html;
        streamContainer.appendChild(msgDiv);

        // Auto-scroll
        const parent = streamContainer.closest('.engine-stream-container') || streamContainer;
        parent.scrollTop = parent.scrollHeight;
    }
}

/**
 * CTA 버튼 클릭 핸들러 (글로벌)
 */
window.handleProactiveCTA = function (action, event) {
    event.stopPropagation();
    console.log('[Proactive] CTA clicked:', action);

    // 액션 파싱 (format: "action_type:payload")
    const [actionType, ...payloadParts] = action.split(':');
    const payload = payloadParts.join(':');

    switch (actionType) {
        case 'resume_draft':
            // 초안 이어쓰기
            if (payload) {
                console.log('[Proactive] Resuming draft:', payload);
                // TODO: 초안 열기 로직
            }
            break;

        case 'view_result':
            // 작업 결과 보기
            if (payload) {
                console.log('[Proactive] Viewing result:', payload);
                // TODO: 결과 모달/페이지 열기
            }
            break;

        case 'open_schedule':
            // 일정 열기
            console.log('[Proactive] Opening schedule');
            // TODO: 캘린더/일정 열기
            break;

        case 'dismiss':
            // 메시지 닫기
            const wrapper = event.target.closest('.proactive-message-wrapper');
            if (wrapper) wrapper.remove();
            break;

        case 'navigate':
            // URL 이동
            if (payload) {
                window.location.href = payload;
            }
            break;

        default:
            console.log('[Proactive] Unknown action:', action);
    }
};

/**
 * Proactive 메시지 닫기
 */
window.dismissProactiveMessage = function (btn) {
    const wrapper = btn.closest('.proactive-message-wrapper');
    if (wrapper) {
        wrapper.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => wrapper.remove(), 300);
    }
};

/**
 * Firestore에 Proactive 메시지 저장
 * 
 * @param {Object} db - Firestore 인스턴스
 * @param {string} userId - 사용자 ID
 * @param {string} sessionId - 세션 ID
 * @param {Object} message - 메시지 데이터
 * @returns {Promise<string>} 메시지 ID
 */
export async function saveProactiveMessage(db, userId, sessionId, message) {
    const { triggerType, triggerId, title, body, cta } = message;

    const messageData = {
        role: 'assistant',
        text: body,
        agent_id: AgentRole.ORCHESTRATOR,
        metadata: {
            proactive: true,
            trigger_type: triggerType,
            trigger_id: triggerId,
            title: title,
            cta: cta || [],
            tokens: 0,
            latency_ms: 0,
            cost_usd: 0
        },
        proactive: {
            is_proactive: true,
            trigger_id: triggerId,
            trigger_type: triggerType
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
        console.log('[Proactive] Message saved:', docRef.id);
        return docRef.id;

    } catch (error) {
        console.error('[Proactive] Error saving message:', error);
        return null;
    }
}

/**
 * 트리거 타입별 기본 CTA 생성
 * 
 * @param {string} triggerType 
 * @param {Object} payload - 트리거 페이로드
 * @param {string} lang 
 * @returns {Array}
 */
export function getDefaultCTAs(triggerType, payload = {}, lang = 'ko') {
    const ctas = {
        task_recovery: [
            { label: lang === 'ko' ? '이어쓰기' : 'Resume', action: `resume_draft:${payload.draftId}`, primary: true },
            { label: lang === 'ko' ? '나중에' : 'Later', action: 'dismiss', primary: false }
        ],
        async_completion: [
            { label: lang === 'ko' ? '결과 보기' : 'View Result', action: `view_result:${payload.jobId}`, primary: true },
            { label: lang === 'ko' ? '확인' : 'OK', action: 'dismiss', primary: false }
        ],
        strategic_insight: [
            { label: lang === 'ko' ? '전략 업데이트' : 'Update Strategy', action: `view_insight:${payload.insightId}`, primary: true }
        ],
        market_signal: [
            { label: lang === 'ko' ? '분석 보기' : 'View Analysis', action: `view_signal:${payload.signalId}`, primary: true }
        ],
        user_scheduler: [
            { label: lang === 'ko' ? '일정 열기' : 'Open Schedule', action: 'open_schedule', primary: true },
            { label: lang === 'ko' ? '알겠어요' : 'Got it', action: 'dismiss', primary: false }
        ],
        lifecycle_crm: [
            { label: lang === 'ko' ? '알아보기' : 'Learn More', action: `navigate:${payload.url || '/help'}`, primary: true },
            { label: lang === 'ko' ? '다음에' : 'Later', action: 'dismiss', primary: false }
        ],
        admin_broadcast: [
            { label: lang === 'ko' ? '확인' : 'Acknowledge', action: 'dismiss', primary: true }
        ]
    };

    return ctas[triggerType] || ctas.admin_broadcast;
}

export default {
    renderProactiveMessage,
    addProactiveMessage,
    saveProactiveMessage,
    getDefaultCTAs,
    PROACTIVE_LABELS,
    PROACTIVE_ICONS
};
