/**
 * Global Notification Utility for ZYNK Admin Console
 * Provides consistent, premium UI feedback for user actions.
 */

(function () {
    // 1. Core Implementation
    function showNotification(msg, type = 'success', duration = 4000) {
        // Ensure container exists
        let container = document.getElementById('zynk-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'zynk-notification-container';
            container.className = 'zynk-notification-container';
            document.body.appendChild(container);

            // Inject styles once
            if (!document.getElementById('zynk-notification-styles')) {
                const styles = document.createElement('style');
                styles.id = 'zynk-notification-styles';
                styles.textContent = `
                    .zynk-notification-container {
                        position: fixed;
                        top: 24px;
                        right: 24px;
                        z-index: 99999;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        pointer-events: none;
                    }
                    .zynk-notification {
                        min-width: 320px;
                        max-width: 450px;
                        padding: 16px 20px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        background: rgba(15, 23, 42, 0.95);
                        backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
                        color: #fff;
                        transform: translateX(40px);
                        opacity: 0;
                        transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                        pointer-events: auto;
                        position: relative;
                        overflow: hidden;
                    }
                    .zynk-notification.visible {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    .zynk-notification.success { border-left: 4px solid #10b981; }
                    .zynk-notification.error { border-left: 4px solid #ef4444; }
                    .zynk-notification.warning { border-left: 4px solid #f59e0b; }
                    .zynk-notification.info { border-left: 4px solid #3b82f6; }

                    .zynk-notification-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    .zynk-notification-content {
                        flex-grow: 1;
                        font-family: 'Inter', sans-serif;
                        font-size: 14px;
                        font-weight: 500;
                        line-height: 1.4;
                    }
                    .zynk-notification-close {
                        padding: 4px;
                        cursor: pointer;
                        opacity: 0.5;
                        transition: opacity 0.2s;
                        background: transparent;
                        border: none;
                        color: #fff;
                        font-size: 18px;
                    }
                    .zynk-notification-close:hover { opacity: 1; }

                    .zynk-notification-progress {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        height: 3px;
                        background: rgba(255, 255, 255, 0.2);
                        width: 0%;
                    }
                `;
                document.head.appendChild(styles);
            }
        }

        // 2. Create Notification Element
        const notification = document.createElement('div');
        notification.className = `zynk-notification ${type}`;

        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="zynk-notification-icon">${iconMap[type] || '🔔'}</div>
            <div class="zynk-notification-content">${msg}</div>
            <button class="zynk-notification-close">&times;</button>
            <div class="zynk-notification-progress"></div>
        `;

        container.appendChild(notification);

        // 3. Animation and Lifecycle
        requestAnimationFrame(() => {
            notification.classList.add('visible');
            const progress = notification.querySelector('.zynk-notification-progress');
            progress.style.transition = `width ${duration}ms linear`;
            progress.style.width = '100%';
        });

        const close = () => {
            notification.classList.remove('visible');
            notification.style.transform = 'translateX(40px) scale(0.95)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        };

        notification.querySelector('.zynk-notification-close').addEventListener('click', close);

        // Auto-remove
        const timeoutId = setTimeout(close, duration);

        // Pause on hover
        notification.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
            const progress = notification.querySelector('.zynk-notification-progress');
            progress.style.transition = 'none';
        });
    }

    // 4. Global Registration
    window.showNotification = showNotification;
    console.log('[Notifications] Global notification system initialized.');

})();
