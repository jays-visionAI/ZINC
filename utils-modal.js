/**
 * Global Modal Utilities
 * Provides persistent modal dialogs that won't be dismissed by page re-renders
 * 
 * Usage:
 *   showConfirmModal('Title', 'Message', function() { ... });
 *   showAlertModal('Title', 'Message');
 */

(function () {
    'use strict';

    /**
     * Show a persistent confirmation modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {function} onConfirm - Callback when user confirms
     * @param {object} options - Optional settings
     */
    window.showConfirmModal = function (title, message, onConfirm, options = {}) {
        const {
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmStyle = 'danger', // 'danger', 'success', 'primary'
            onCancel = null
        } = options;

        // Remove existing modal
        const existing = document.getElementById('global-confirm-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'global-confirm-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.75);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            animation: modalFadeIn 0.2s ease;
        `;

        const confirmBtnStyles = {
            danger: 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff;',
            success: 'background: linear-gradient(135deg, #16e0bd 0%, #0ea5a0 100%); color: #000;',
            primary: 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff;'
        };

        modal.innerHTML = `
            <style>
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                #global-confirm-modal .modal-btn:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                }
            </style>
            <div style="
                background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 32px;
                max-width: 420px;
                width: 90%;
                text-align: center;
                box-shadow: 0 25px 80px rgba(0,0,0,0.6);
            ">
                <div style="font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 16px;">${title}</div>
                <div style="font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; white-space: pre-line; margin-bottom: 28px;">${message}</div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="modal-cancel" class="modal-btn" style="
                        padding: 12px 28px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: rgba(255,255,255,0.8);
                        border-radius: 10px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">${cancelText}</button>
                    <button id="modal-confirm" class="modal-btn" style="
                        padding: 12px 28px;
                        ${confirmBtnStyles[confirmStyle] || confirmBtnStyles.primary}
                        border: none;
                        border-radius: 10px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        const cleanup = () => {
            modal.remove();
            document.body.style.overflow = '';
        };

        document.getElementById('modal-cancel').onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };

        document.getElementById('modal-confirm').onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) cleanup();
        };
    };

    /**
     * Show a persistent alert modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {function} onClose - Callback when closed
     * @param {object} options - Optional settings
     */
    window.showAlertModal = function (title, message, onClose = null, options = {}) {
        const {
            buttonText = 'OK',
            type = 'info' // 'info', 'success', 'warning', 'error'
        } = options;

        // Remove existing modal
        const existing = document.getElementById('global-alert-modal');
        if (existing) existing.remove();

        const icons = {
            info: '💡',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const modal = document.createElement('div');
        modal.id = 'global-alert-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.75);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            animation: modalFadeIn 0.2s ease;
        `;

        modal.innerHTML = `
            <style>
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>
            <div style="
                background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 32px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 25px 80px rgba(0,0,0,0.6);
            ">
                <div style="font-size: 40px; margin-bottom: 16px;">${icons[type] || icons.info}</div>
                <div style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 12px;">${title}</div>
                <div style="font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; white-space: pre-line; margin-bottom: 24px;">${message}</div>
                <button id="alert-ok" style="
                    padding: 12px 40px;
                    background: linear-gradient(135deg, #16e0bd 0%, #0ea5a0 100%);
                    border: none;
                    color: #000;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                ">${buttonText}</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const cleanup = () => {
            modal.remove();
            document.body.style.overflow = '';
            if (onClose) onClose();
        };

        document.getElementById('alert-ok').onclick = cleanup;

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) cleanup();
        };
    };

    /**
     * Show a persistent action modal with custom action button
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {string} actionText - Action button text
     * @param {function} onAction - Callback for action button
     */
    window.showActionModal = function (title, message, actionText, onAction) {
        showConfirmModal(title, message, onAction, {
            confirmText: actionText,
            cancelText: 'Close',
            confirmStyle: 'success'
        });
    };

})();

console.log('[Global Modal Utils] Loaded');
