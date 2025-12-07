/**
 * Global Event Handler Utility
 * 
 * This module fixes the common issue where confirm() and alert() dialogs
 * disappear immediately due to event bubbling or page reloads.
 * 
 * It provides:
 * 1. Safe versions of confirm/alert that work reliably
 * 2. Global click handler to prevent form submissions
 * 3. Button type enforcement
 */

(function () {
    'use strict';

    console.log('[GlobalEventFix] Initializing...');

    // ===============================================
    // FIX 1: Wrap native confirm() for reliability
    // ===============================================
    const originalConfirm = window.confirm;
    window.safeConfirm = function (message) {
        return new Promise((resolve) => {
            // Use setTimeout to break out of the current event loop
            setTimeout(() => {
                const result = originalConfirm.call(window, message);
                resolve(result);
            }, 50);
        });
    };

    // ===============================================
    // FIX 2: Wrap native alert() for reliability  
    // ===============================================
    const originalAlert = window.alert;
    window.safeAlert = function (message) {
        return new Promise((resolve) => {
            setTimeout(() => {
                originalAlert.call(window, message);
                resolve();
            }, 50);
        });
    };

    // ===============================================
    // FIX 3: Prevent all buttons from submitting forms by default
    // ===============================================
    document.addEventListener('click', function (event) {
        const button = event.target.closest('button');
        if (button && !button.hasAttribute('type')) {
            // Buttons without type attribute should not submit forms
            button.setAttribute('type', 'button');
        }
    }, true); // Capture phase

    // ===============================================
    // FIX 4: Add type="button" to all existing buttons on load
    // ===============================================
    function fixButtonTypes() {
        document.querySelectorAll('button:not([type])').forEach(btn => {
            btn.setAttribute('type', 'button');
        });
    }

    // ===============================================
    // FIX 5: Prevent default on buttons with onclick handlers
    // ===============================================
    document.addEventListener('click', function (event) {
        const target = event.target.closest('button[onclick], [role="button"][onclick]');
        if (target) {
            // If button has inline onclick, prevent any form submission
            const form = target.closest('form');
            if (form) {
                event.preventDefault();
            }
        }
    }, true);

    // ===============================================
    // FIX 6: MutationObserver to fix dynamically added buttons
    // ===============================================
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Fix the node itself if it's a button
                    if (node.tagName === 'BUTTON' && !node.hasAttribute('type')) {
                        node.setAttribute('type', 'button');
                    }
                    // Fix any button descendants
                    if (node.querySelectorAll) {
                        node.querySelectorAll('button:not([type])').forEach(btn => {
                            btn.setAttribute('type', 'button');
                        });
                    }
                }
            });
        });
    });

    // ===============================================
    // Initialize on DOM ready
    // ===============================================
    function init() {
        fixButtonTypes();
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log('[GlobalEventFix] Ready - All buttons will have type="button" by default');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export utilities
    window.GlobalEventFix = {
        safeConfirm: window.safeConfirm,
        safeAlert: window.safeAlert,
        fixButtonTypes
    };

    console.log('[GlobalEventFix] Loaded. Use safeConfirm() and safeAlert() for reliable dialogs.');

})();
