// utils-version-manager.js
// Semantic Version Management Utility
// Handles version comparison, upgrade policies, and template version loading

(function () {
    'use strict';

    /**
     * Compare two semantic versions
     * @param {string} v1 - Version 1 (e.g., "2.1.0")
     * @param {string} v2 - Version 2 (e.g., "2.2.0")
     * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     */
    window.compareVersions = function (v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    };

    /**
     * Parse semantic version into components
     * @param {string} version - Version string (e.g., "2.1.3")
     * @returns {Object} { major, minor, patch }
     */
    window.parseVersion = function (version) {
        const [major, minor, patch] = version.split('.').map(Number);
        return { major, minor, patch };
    };

    /**
     * Check if auto-upgrade is allowed
     * @param {string} currentVersion - Current version
     * @param {string} newVersion - New version
     * @param {boolean} autoUpgrade - Auto-upgrade policy
     * @returns {boolean} True if upgrade is allowed
     */
    window.canAutoUpgrade = function (currentVersion, newVersion, autoUpgrade) {
        if (!autoUpgrade) return false;

        const current = parseVersion(currentVersion);
        const newVer = parseVersion(newVersion);

        // Only auto-upgrade for PATCH and MINOR updates
        if (newVer.major > current.major) {
            console.log('[Version] MAJOR update detected, manual upgrade required');
            return false;
        }

        return true;
    };

    /**
     * Get version difference description
     * @param {string} oldVersion - Old version
     * @param {string} newVersion - New version
     * @returns {Object} { type, description }
     */
    window.getVersionDiff = function (oldVersion, newVersion) {
        const old = parseVersion(oldVersion);
        const newVer = parseVersion(newVersion);

        if (newVer.major > old.major) {
            return {
                type: 'MAJOR',
                description: 'Breaking changes - manual review required',
                severity: 'high'
            };
        }

        if (newVer.minor > old.minor) {
            return {
                type: 'MINOR',
                description: 'New features added - review recommended',
                severity: 'medium'
            };
        }

        if (newVer.patch > old.patch) {
            return {
                type: 'PATCH',
                description: 'Bug fixes and improvements',
                severity: 'low'
            };
        }

        return {
            type: 'NONE',
            description: 'No changes',
            severity: 'none'
        };
    };

    /**
     * Load specific version of a template
     * @param {string} templateId - Template ID
     * @param {string} version - Version to load (optional, defaults to latest)
     * @returns {Promise<Object>} Template data
     */
    window.loadTemplateVersion = async function (templateId, version = null) {
        try {
            const doc = await db.collection('subAgentTemplates').doc(templateId).get();

            if (!doc.exists) {
                throw new Error(`Template not found: ${templateId}`);
            }

            const template = doc.data();

            // If no version specified or version matches, return current
            if (!version || template.version === version) {
                return template;
            }

            // TODO: Implement version history lookup
            // For now, return current version with warning
            console.warn(`[Version] Version ${version} requested, but only ${template.version} available`);
            return template;
        } catch (error) {
            console.error('[Version] Failed to load template:', error);
            throw error;
        }
    };

    /**
     * Increment version number
     * @param {string} currentVersion - Current version
     * @param {string} type - 'major', 'minor', or 'patch'
     * @returns {string} New version
     */
    window.incrementVersion = function (currentVersion, type) {
        const { major, minor, patch } = parseVersion(currentVersion);

        switch (type) {
            case 'major':
                return `${major + 1}.0.0`;
            case 'minor':
                return `${major}.${minor + 1}.0`;
            case 'patch':
                return `${major}.${minor}.${patch + 1}`;
            default:
                throw new Error(`Invalid version type: ${type}`);
        }
    };

    /**
     * Create version history entry
     * @param {string} version - New version
     * @param {string} changes - Description of changes
     * @param {boolean} isBreaking - Is this a breaking change?
     * @returns {Object} Version history entry
     */
    window.createVersionHistoryEntry = function (version, changes, isBreaking = false) {
        return {
            version,
            changedAt: firebase.firestore.Timestamp.now(),
            changes,
            isBreaking,
            changedBy: firebase.auth().currentUser?.uid || 'unknown'
        };
    };

    console.log('[Version Manager] Utility loaded');
})();
