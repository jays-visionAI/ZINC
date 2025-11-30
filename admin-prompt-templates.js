// admin-prompt-templates.js
// System Prompt Template Management

(function () {
    'use strict';

    const db = firebase.firestore();
    let templates = [];
    let filteredTemplates = [];
    let editingTemplateId = null;

    window.addEventListener('DOMContentLoaded', () => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                loadTemplates();
            } else {
                window.location.href = 'login.html';
            }
        });
    });

    async function loadTemplates() {
        try {
            const snapshot = await db.collection('systemPromptTemplates').get();
            templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filteredTemplates = [...templates];
            renderTemplates();
        } catch (error) {
            console.error('Error loading templates:', error);
            alert('Failed to load templates');
        }
    }

    function renderTemplates() {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;

        if (filteredTemplates.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No templates found</div>';
            return;
        }

        grid.innerHTML = filteredTemplates.map(template => `
            <div class="template-card" onclick="editTemplate('${template.id}')">
                <div class="template-header">
                    <div>
                        <div class="template-name">${template.name}</div>
                        <div class="template-family">${template.family}</div>
                    </div>
                    <div class="template-version">v${template.version}</div>
                </div>
                <div class="template-description">${template.description || 'No description'}</div>
                <div class="template-content-preview">${template.content.substring(0, 100)}...</div>
                <div class="template-footer">
                    <div class="template-usage">
                        <span>📊 Used by ${template.usageCount || 0} templates</span>
                    </div>
                    <div>${getStatusBadge(template.status)}</div>
                </div>
            </div>
        `).join('');
    }

    function getStatusBadge(status) {
        const badges = {
            active: '<span style="color: #22c55e;">✓ Active</span>',
            draft: '<span style="color: #eab308;">📝 Draft</span>',
            deprecated: '<span style="color: #ef4444;">❌ Deprecated</span>'
        };
        return badges[status] || status;
    }

    window.applyFilters = function () {
        const familyFilter = document.getElementById('family-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        const searchTerm = document.getElementById('search-input').value.toLowerCase();

        filteredTemplates = templates.filter(template => {
            const matchesFamily = familyFilter === 'all' || template.family === familyFilter;
            const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
            const matchesSearch = !searchTerm ||
                template.name.toLowerCase().includes(searchTerm) ||
                template.description?.toLowerCase().includes(searchTerm);

            return matchesFamily && matchesStatus && matchesSearch;
        });

        renderTemplates();
    };

    window.openCreateModal = function () {
        editingTemplateId = null;
        document.getElementById('modal-title').textContent = 'Create System Prompt Template';
        document.getElementById('template-name').value = '';
        document.getElementById('template-family').value = '';
        document.getElementById('template-description').value = '';
        document.getElementById('template-content').value = '';
        document.getElementById('template-status').value = 'draft';
        document.getElementById('version-type').value = 'patch';
        document.getElementById('change-description').value = '';
        document.getElementById('template-modal').style.display = 'flex';
    };

    window.editTemplate = async function (templateId) {
        editingTemplateId = templateId;
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        document.getElementById('modal-title').textContent = `Edit Template: ${template.name}`;
        document.getElementById('template-name').value = template.name;
        document.getElementById('template-family').value = template.family;
        document.getElementById('template-description').value = template.description || '';
        document.getElementById('template-content').value = template.content;
        document.getElementById('template-status').value = template.status;
        document.getElementById('template-modal').style.display = 'flex';
    };

    window.closeModal = function () {
        document.getElementById('template-modal').style.display = 'none';
        editingTemplateId = null;
    };

    window.saveTemplate = async function () {
        const name = document.getElementById('template-name').value.trim();
        const family = document.getElementById('template-family').value;
        const description = document.getElementById('template-description').value.trim();
        const content = document.getElementById('template-content').value.trim();
        const status = document.getElementById('template-status').value;
        const versionType = document.getElementById('version-type').value;
        const changeDesc = document.getElementById('change-description').value.trim();

        if (!name || !family || !content) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const user = firebase.auth().currentUser;
            const now = firebase.firestore.Timestamp.now();

            if (editingTemplateId) {
                // Update existing template
                const existing = templates.find(t => t.id === editingTemplateId);
                const newVersion = window.incrementVersion(existing.version, versionType);
                const versionEntry = window.createVersionHistoryEntry(
                    newVersion,
                    changeDesc || `Updated to v${newVersion}`,
                    versionType === 'major'
                );

                await db.collection('systemPromptTemplates').doc(editingTemplateId).update({
                    name,
                    family,
                    description,
                    content,
                    status,
                    version: newVersion,
                    versionHistory: firebase.firestore.FieldValue.arrayUnion(versionEntry),
                    updatedAt: now
                });

                alert(`Template updated to v${newVersion}`);
            } else {
                // Create new template
                const templateId = `spt_${family}_${Date.now()}`;
                const versionEntry = window.createVersionHistoryEntry(
                    '1.0.0',
                    changeDesc || 'Initial version',
                    false
                );

                await db.collection('systemPromptTemplates').doc(templateId).set({
                    id: templateId,
                    name,
                    family,
                    description,
                    content,
                    version: '1.0.0',
                    versionHistory: [versionEntry],
                    usedBy: [],
                    usageCount: 0,
                    status,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: user.uid
                });

                alert('Template created successfully');
            }

            closeModal();
            loadTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template');
        }
    };

})();
