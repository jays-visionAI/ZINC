/**
 * Studio Session History Service
 * Persists conversation history to Firestore for retrieval across sessions
 * 
 * Limits:
 * - Retention: 180 days
 * - Max sessions per project: 100
 * - Max messages per session: 1,000
 * - Storage limit: 20MB per project (using subcollections)
 * - LLM context load: last 20 messages
 */

(function () {
    console.log('[SessionHistoryService] Initializing...');

    // Configuration
    const CONFIG = {
        RETENTION_DAYS: 15, // Changed from 180 to 15
        MAX_SESSIONS_PER_PROJECT: 100,
        MAX_MESSAGES_PER_SESSION: 1000,
        MAX_IMAGES_PER_PROJECT: 30, // New limit
        LLM_CONTEXT_MESSAGES: 20,
        SESSION_TIMEOUT_HOURS: 24,
        TITLE_MAX_LENGTH: 50,
        PREVIEW_MAX_LENGTH: 100
    };

    // Current session state
    let currentSession = {
        id: null,
        projectId: null,
        messageCount: 0
    };

    /**
     * Safe Firebase accessor
     */
    function getFirestore() {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            return firebase.firestore();
        }
        return null;
    }

    function getCurrentUserId() {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            return firebase.auth().currentUser.uid;
        }
        return null;
    }

    /**
     * Generate session title from first message
     */
    function generateTitle(content) {
        if (!content) return 'New Session';
        const clean = content.replace(/[\n\r]+/g, ' ').trim();
        return clean.length > CONFIG.TITLE_MAX_LENGTH
            ? clean.substring(0, CONFIG.TITLE_MAX_LENGTH) + '...'
            : clean;
    }

    /**
     * Create a new session
     */
    async function createSession(projectId, projectName) {
        const db = getFirestore();
        const userId = getCurrentUserId();
        if (!db || !userId || !projectId) {
            console.warn('[SessionHistoryService] Cannot create session: missing db, user, or project');
            return null;
        }

        try {
            const sessionRef = db.collection('projects').doc(projectId)
                .collection('studioSessions').doc();

            const sessionData = {
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                title: 'New Session',
                messageCount: 0,
                lastMessage: '',
                isArchived: false,
                metadata: {
                    userId: userId,
                    projectName: projectName || 'Unknown'
                }
            };

            await sessionRef.set(sessionData);

            currentSession = {
                id: sessionRef.id,
                projectId: projectId,
                messageCount: 0
            };

            console.log('[SessionHistoryService] Created session:', sessionRef.id);
            return sessionRef.id;
        } catch (error) {
            console.error('[SessionHistoryService] Error creating session:', error);
            return null;
        }
    }

    /**
     * Save a message to the current session
     */
    async function saveMessage(role, content, metadata = {}) {
        const db = getFirestore();
        if (!db || !currentSession.id || !currentSession.projectId) {
            console.warn('[SessionHistoryService] No active session');
            return null;
        }

        // Check image limit if this message has images
        if (metadata.hasImages) {
            try {
                const projectRef = db.collection('projects').doc(currentSession.projectId);
                const projectDoc = await projectRef.get();
                const currentImages = projectDoc.data()?.imageCount || 0;

                if (currentImages >= CONFIG.MAX_IMAGES_PER_PROJECT) {
                    console.warn('[SessionHistoryService] Image limit reached for this project');
                    // We might want to allow sending but stop saving to Firestore, 
                    // but for now let's just log it.
                } else {
                    await projectRef.set({ imageCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });
                }
            } catch (e) {
                console.error('[SessionHistoryService] Error updating image count:', e);
            }
        }

        // Check message limit
        if (currentSession.messageCount >= CONFIG.MAX_MESSAGES_PER_SESSION) {
            console.log('[SessionHistoryService] Message limit reached, creating new session');
            const projectName = metadata.projectName || 'Unknown';
            await createSession(currentSession.projectId, projectName);
        }

        try {
            const sessionRef = db.collection('projects').doc(currentSession.projectId)
                .collection('studioSessions').doc(currentSession.id);

            // Save message to subcollection
            const messageRef = sessionRef.collection('messages').doc();
            await messageRef.set({
                role: role,
                content: content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                metadata: metadata
            });

            // Update session metadata
            const preview = content.substring(0, CONFIG.PREVIEW_MAX_LENGTH);
            const updateData = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                messageCount: firebase.firestore.FieldValue.increment(1),
                lastMessage: preview
            };

            // Update title if first user message
            if (role === 'user' && currentSession.messageCount === 0) {
                updateData.title = generateTitle(content);
            }

            await sessionRef.update(updateData);
            currentSession.messageCount++;

            console.log('[SessionHistoryService] Saved message:', messageRef.id);
            return messageRef.id;
        } catch (error) {
            console.error('[SessionHistoryService] Error saving message:', error);
            return null;
        }
    }

    /**
     * List sessions for a project
     */
    async function listSessions(projectId, limit = 10, includeArchived = false) {
        const db = getFirestore();
        const userId = getCurrentUserId();
        if (!db || !userId || !projectId) return [];

        try {
            let query = db.collection('projects').doc(projectId)
                .collection('studioSessions')
                .where('metadata.userId', '==', userId)
                .orderBy('updatedAt', 'desc')
                .limit(limit);

            if (!includeArchived) {
                query = query.where('isArchived', '==', false);
            }

            const snapshot = await query.get();
            const sessions = [];
            snapshot.forEach(doc => {
                sessions.push({ id: doc.id, ...doc.data() });
            });

            return sessions;
        } catch (error) {
            console.error('[SessionHistoryService] Error listing sessions:', error);
            return [];
        }
    }

    /**
     * Load messages from a session
     */
    async function loadSessionMessages(projectId, sessionId, limit = 50) {
        const db = getFirestore();
        if (!db || !projectId || !sessionId) return [];

        try {
            const snapshot = await db.collection('projects').doc(projectId)
                .collection('studioSessions').doc(sessionId)
                .collection('messages')
                .orderBy('timestamp', 'asc')
                .limit(limit)
                .get();

            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });

            return messages;
        } catch (error) {
            console.error('[SessionHistoryService] Error loading messages:', error);
            return [];
        }
    }

    /**
     * Load recent messages for LLM context
     */
    async function loadLLMContext(projectId, sessionId) {
        const db = getFirestore();
        if (!db || !projectId || !sessionId) return [];

        try {
            const snapshot = await db.collection('projects').doc(projectId)
                .collection('studioSessions').doc(sessionId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(CONFIG.LLM_CONTEXT_MESSAGES)
                .get();

            const messages = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                messages.unshift({ role: data.role, content: data.content });
            });

            return messages;
        } catch (error) {
            console.error('[SessionHistoryService] Error loading LLM context:', error);
            return [];
        }
    }

    /**
     * Resume a session
     */
    async function resumeSession(projectId, sessionId) {
        const db = getFirestore();
        if (!db || !projectId || !sessionId) return false;

        try {
            const sessionDoc = await db.collection('projects').doc(projectId)
                .collection('studioSessions').doc(sessionId).get();

            if (!sessionDoc.exists) {
                console.warn('[SessionHistoryService] Session not found');
                return false;
            }

            const data = sessionDoc.data();
            if (data.isArchived) {
                console.warn('[SessionHistoryService] Cannot resume archived session');
                return false;
            }

            currentSession = {
                id: sessionId,
                projectId: projectId,
                messageCount: data.messageCount || 0
            };

            console.log('[SessionHistoryService] Resumed session:', sessionId);
            return true;
        } catch (error) {
            console.error('[SessionHistoryService] Error resuming session:', error);
            return false;
        }
    }

    /**
     * Delete a session
     */
    async function deleteSession(projectId, sessionId) {
        const db = getFirestore();
        if (!db || !projectId || !sessionId) return false;

        try {
            // Delete all messages first (Firestore doesn't cascade delete)
            const messagesSnapshot = await db.collection('projects').doc(projectId)
                .collection('studioSessions').doc(sessionId)
                .collection('messages').get();

            const batch = db.batch();
            messagesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete session document
            const sessionRef = db.collection('projects').doc(projectId)
                .collection('studioSessions').doc(sessionId);
            batch.delete(sessionRef);

            await batch.commit();

            // Clear current session if it was the deleted one
            if (currentSession.id === sessionId) {
                currentSession = { id: null, projectId: null, messageCount: 0 };
            }

            console.log('[SessionHistoryService] Deleted session:', sessionId);
            return true;
        } catch (error) {
            console.error('[SessionHistoryService] Error deleting session:', error);
            return false;
        }
    }

    /**
     * Get or create session for current project
     */
    async function ensureSession(projectId, projectName) {
        // Check if we have an active session for this project
        if (currentSession.id && currentSession.projectId === projectId) {
            return currentSession.id;
        }

        // Try to find recent session (within 24 hours)
        const sessions = await listSessions(projectId, 1);
        if (sessions.length > 0) {
            const lastSession = sessions[0];
            const updatedAt = lastSession.updatedAt?.toDate?.() || new Date(0);
            const hoursSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);

            if (hoursSinceUpdate < CONFIG.SESSION_TIMEOUT_HOURS) {
                await resumeSession(projectId, lastSession.id);
                return lastSession.id;
            }
        }

        // Create new session
        return await createSession(projectId, projectName);
    }

    /**
     * Get current session info
     */
    function getCurrentSession() {
        return { ...currentSession };
    }

    /**
     * Get configuration
     */
    function getConfig() {
        return { ...CONFIG };
    }

    // Export service
    const SessionHistoryService = {
        createSession,
        saveMessage,
        listSessions,
        loadSessionMessages,
        loadLLMContext,
        resumeSession,
        deleteSession,
        ensureSession,
        getCurrentSession,
        getConfig,
        CONFIG
    };

    window.SessionHistoryService = SessionHistoryService;
    console.log('[SessionHistoryService] Ready');
})();
