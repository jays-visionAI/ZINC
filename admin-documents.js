// admin-documents.js
let allDocuments = [];
let currentDocId = null;
const projectId = "default_project";

window.initDocuments = function (user) {
    console.log("Initializing Documents Page...");

    // Wait for DOM to be ready
    setTimeout(() => {
        // Attach event listeners
        const createBtn = document.getElementById('create-doc-btn');
        if (createBtn) {
            createBtn.onclick = function () {
                console.log("Create button clicked");
                window.openDocumentModal();
            };
            console.log("✅ Create Document button event attached");
        } else {
            console.warn("❌ Create Document button not found");
        }
    }, 100);

    loadDocuments();
};

async function loadDocuments() {
    const grid = document.getElementById('documents-grid');
    grid.innerHTML = `<div style="text-align: center; padding: 60px; color: rgba(255,255,255,0.3); grid-column: 1 / -1;">Loading...</div>`;

    try {
        const snapshot = await db.collection(`projects/${projectId}/documents`)
            .orderBy('updated_at', 'desc')
            .get();

        allDocuments = [];
        snapshot.forEach(doc => {
            allDocuments.push({ id: doc.id, ...doc.data() });
        });

        renderDocuments(allDocuments);
    } catch (error) {
        console.error("Error loading documents:", error);
        grid.innerHTML = `<div style="text-align: center; color: #ef4444; grid-column: 1 / -1;">Error: ${error.message}</div>`;
    }
}

window.renderDocuments = function (docs) {
    const grid = document.getElementById('documents-grid');

    if (docs.length === 0) {
        grid.innerHTML = `<div style="text-align: center; padding: 60px; color: rgba(255,255,255,0.3); grid-column: 1 / -1;">No documents found</div>`;
        return;
    }

    grid.innerHTML = docs.map(doc => `
        <div class="admin-card doc-card" 
             data-doc-id="${doc.id}"
             style="cursor: pointer; transition: transform 0.2s;" 
             onmouseover="this.style.transform='translateY(-4px)'" 
             onmouseout="this.style.transform='translateY(0)'">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                    <span class="status-badge status-${doc.status === 'published' ? 'active' : doc.status === 'draft' ? 'pending' : 'inactive'}" 
                          style="font-size: 11px;">
                        ${doc.status}
                    </span>
                    <span style="margin-left: 8px; font-size: 11px; color: rgba(255,255,255,0.4);">
                        ${getCategoryLabel(doc.category)}
                    </span>
                </div>
                <button class="edit-doc-btn admin-btn-secondary" 
                        data-doc-id="${doc.id}"
                        style="padding: 4px 8px; font-size: 12px;">
                    Edit
                </button>
            </div>
            
            <h4 style="margin: 0 0 8px 0; color: #16e0bd; font-size: 16px;">
                ${doc.title}
            </h4>
            
            <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 12px;">
                ${doc.tags ? doc.tags.map(tag => `<span style="background: rgba(22,224,189,0.1); padding: 2px 8px; border-radius: 4px; margin-right: 4px;">#${tag}</span>`).join('') : ''}
            </div>
            
            <div style="font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 12px; max-height: 60px; overflow: hidden;">
                ${getDocumentPreview(doc.content)}
            </div>
            
            <div style="font-size: 11px; color: rgba(255,255,255,0.3); display: flex; justify-content: space-between;">
                <span>v${doc.version || '1.0.0'}</span>
                <span>${formatDate(doc.updated_at)}</span>
            </div>
        </div>
    `).join('');

    // Attach event listeners after rendering
    attachDocumentCardListeners();
}

// Attach event listeners to document cards
function attachDocumentCardListeners() {
    // Card click events
    const cards = document.querySelectorAll('.doc-card');
    cards.forEach(card => {
        card.addEventListener('click', function (e) {
            // Don't trigger if clicking edit button
            if (e.target.classList.contains('edit-doc-btn') || e.target.closest('.edit-doc-btn')) {
                return;
            }
            const docId = this.dataset.docId;
            console.log("Document card clicked:", docId);
            window.viewDocument(docId);
        });
    });

    // Edit button events
    const editBtns = document.querySelectorAll('.edit-doc-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const docId = this.dataset.docId;
            console.log("Edit button clicked:", docId);
            window.editDocument(docId);
        });
    });

    console.log(`✅ Attached listeners to ${cards.length} document cards`);
}

window.openDocumentModal = function (docId = null) {
    console.log("🔓 Opening Document Modal, docId:", docId);
    currentDocId = docId;
    const modal = document.getElementById('document-modal');

    if (!modal) {
        console.error("❌ Document modal element not found!");
        alert("Document modal element not found in DOM");
        return;
    }

    console.log("✅ Modal element found");
    const title = document.getElementById('doc-modal-title');
    const deleteBtn = document.getElementById('delete-doc-btn');

    if (docId) {
        title.textContent = 'Edit Document';
        if (deleteBtn) {
            deleteBtn.style.display = 'block'; // Show delete button
            // Attach event listener (remove old one first to avoid duplicates)
            deleteBtn.onclick = null;
            deleteBtn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.deleteDocument();
            };
        }
        const doc = allDocuments.find(d => d.id === docId);
        if (doc) {
            document.getElementById('doc-edit-id').value = doc.id;
            document.getElementById('doc-title').value = doc.title;
            document.getElementById('doc-category').value = doc.category;
            document.getElementById('doc-status').value = doc.status;
            document.getElementById('doc-tags').value = doc.tags ? doc.tags.join(', ') : '';
            document.getElementById('doc-content').value = doc.content;
        }
    } else {
        title.textContent = 'New Document';
        if (deleteBtn) deleteBtn.style.display = 'none'; // Hide delete button
        document.getElementById('doc-edit-id').value = '';
        document.getElementById('doc-title').value = '';
        document.getElementById('doc-category').value = 'user_guide';
        document.getElementById('doc-status').value = 'draft';
        document.getElementById('doc-tags').value = '';
        document.getElementById('doc-content').value = '';
    }

    console.log("🔓 Showing modal...");
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10); // Add class after display change
    console.log("✅ Modal display set to flex and open class added");
};

window.closeDocumentModal = function () {
    const modal = document.getElementById('document-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 300); // Wait for animation
    }
    currentDocId = null;
};

window.saveDocument = async function () {
    const title = document.getElementById('doc-title').value.trim();
    const category = document.getElementById('doc-category').value;
    const status = document.getElementById('doc-status').value;
    const tagsInput = document.getElementById('doc-tags').value.trim();
    const content = document.getElementById('doc-content').value.trim();
    const editId = document.getElementById('doc-edit-id').value;

    if (!title || !content) {
        alert("Title and Content are required");
        return;
    }

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
        const docData = {
            title,
            category,
            slug,
            status,
            content,
            tags,
            last_updated_by: firebase.auth().currentUser?.email || 'Unknown',
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (editId) {
            // Update existing - increment version and save history
            const existingDoc = allDocuments.find(d => d.id === editId);

            // Calculate new version
            const currentVersion = existingDoc.version || '1.0.0';
            const newVersion = incrementVersion(currentVersion);

            // Save current version to history before updating
            const historyId = `${editId}_v${currentVersion.replace(/\./g, '_')}`;
            await db.collection(`projects/${projectId}/documents/${editId}/history`).doc(historyId).set({
                version: currentVersion,
                title: existingDoc.title,
                content: existingDoc.content,
                category: existingDoc.category,
                status: existingDoc.status,
                tags: existingDoc.tags || [],
                archived_at: firebase.firestore.FieldValue.serverTimestamp(),
                archived_by: firebase.auth().currentUser?.email || 'Unknown'
            });

            // Update document with new version
            await db.collection(`projects/${projectId}/documents`).doc(editId).update({
                ...docData,
                version: newVersion
            });

            alert(`✅ Document Updated to v${newVersion}!`);
        } else {
            // Create new
            const docId = `doc_${Date.now()}`;
            await db.collection(`projects/${projectId}/documents`).doc(docId).set({
                id: docId,
                ...docData,
                version: "1.0.0",
                author: firebase.auth().currentUser?.email || 'Unknown',
                view_count: 0,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("✅ Document Created!");
        }

        closeDocumentModal();
        loadDocuments();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};

// Helper function to increment semantic version
function incrementVersion(version) {
    const parts = version.split('.').map(Number);
    // Increment patch version (1.0.0 -> 1.0.1)
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
}

window.editDocument = function (docId) {
    openDocumentModal(docId);
};

// Global variable to store document ID for deletion
let documentToDelete = null;

window.deleteDocument = function () {
    console.log("🗑️ Delete document function called");

    const docId = document.getElementById('doc-edit-id').value;
    console.log("Document ID:", docId);

    if (!docId) {
        alert("삭제할 문서가 선택되지 않았습니다");
        return;
    }

    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        alert("문서를 찾을 수 없습니다");
        return;
    }

    console.log("Document to delete:", doc.title);

    // Store document ID for later use
    documentToDelete = docId;

    // Show custom delete confirmation modal
    const deleteModal = document.getElementById('delete-confirm-modal');
    const docNameEl = document.getElementById('delete-doc-name');
    const passwordInput = document.getElementById('delete-password-input');

    if (docNameEl) docNameEl.textContent = doc.title;
    if (passwordInput) passwordInput.value = '';

    if (deleteModal) {
        deleteModal.style.display = 'flex';
        setTimeout(() => {
            deleteModal.classList.add('open');
            if (passwordInput) passwordInput.focus();
        }, 10);
    }
};

window.cancelDelete = function () {
    console.log("Delete cancelled");
    documentToDelete = null;
    const deleteModal = document.getElementById('delete-confirm-modal');
    if (deleteModal) {
        deleteModal.classList.remove('open');
        setTimeout(() => deleteModal.style.display = 'none', 300);
    }
};

window.confirmDelete = async function () {
    const passwordInput = document.getElementById('delete-password-input');
    const password = passwordInput ? passwordInput.value : '';

    console.log("Confirm delete called, password provided:", password ? "Yes" : "No");

    // Get current user
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("❌ 로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
        cancelDelete();
        return;
    }

    console.log("Current user:", user.email);
    console.log("Provider data:", user.providerData);

    // Check which authentication method was used
    const isGoogleAuth = user.providerData.some(provider => provider.providerId === 'google.com');
    const isEmailAuth = user.providerData.some(provider => provider.providerId === 'password');

    console.log("Is Google Auth:", isGoogleAuth);
    console.log("Is Email/Password Auth:", isEmailAuth);

    // Re-authenticate based on login method
    try {
        if (isGoogleAuth && !isEmailAuth) {
            // User logged in with Google OAuth - use Google re-authentication
            console.log("Using Google OAuth re-authentication...");

            const provider = new firebase.auth.GoogleAuthProvider();
            await user.reauthenticateWithPopup(provider);
            console.log("✅ Google re-authentication successful");

        } else if (isEmailAuth) {
            // User logged in with email/password
            if (!password) {
                alert("비밀번호를 입력해주세요");
                if (passwordInput) passwordInput.focus();
                return;
            }

            console.log("Using email/password re-authentication...");

            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                password
            );

            await user.reauthenticateWithCredential(credential);
            console.log("✅ Email/password re-authentication successful");

        } else {
            alert("❌ 지원하지 않는 로그인 방식입니다.");
            cancelDelete();
            return;
        }

    } catch (authError) {
        console.error("Re-authentication failed:", authError);

        let errorMessage = "❌ 인증에 실패했습니다.";

        if (authError.code === 'auth/wrong-password') {
            errorMessage = "❌ 비밀번호가 올바르지 않습니다.";
        } else if (authError.code === 'auth/too-many-requests') {
            errorMessage = "❌ 너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
        } else if (authError.code === 'auth/user-mismatch') {
            errorMessage = "❌ 사용자 정보가 일치하지 않습니다.";
        } else if (authError.code === 'auth/popup-closed-by-user') {
            errorMessage = "인증 팝업이 닫혔습니다. 다시 시도해주세요.";
        } else if (authError.code === 'auth/cancelled-popup-request') {
            errorMessage = "인증이 취소되었습니다.";
        }

        alert(errorMessage);

        if (passwordInput && isEmailAuth) {
            passwordInput.value = '';
            passwordInput.focus();
        }
        return;
    }

    if (!documentToDelete) {
        alert("삭제할 문서 정보가 없습니다");
        cancelDelete();
        return;
    }

    const doc = allDocuments.find(d => d.id === documentToDelete);
    if (!doc) {
        alert("문서를 찾을 수 없습니다");
        cancelDelete();
        return;
    }

    console.log("Authentication verified, proceeding with deletion...");

    try {
        // Delete document and its history
        await db.collection(`projects/${projectId}/documents`).doc(documentToDelete).delete();
        console.log("Document deleted from Firestore");

        // Delete all history versions
        const historySnapshot = await db.collection(`projects/${projectId}/documents/${documentToDelete}/history`).get();
        const batch = db.batch();
        historySnapshot.forEach(historyDoc => {
            batch.delete(historyDoc.ref);
        });
        await batch.commit();
        console.log("History deleted from Firestore");

        alert(`✅ "${doc.title}" 문서가 성공적으로 삭제되었습니다.`);

        // Close both modals
        cancelDelete();
        closeDocumentModal();
        loadDocuments(); // Refresh list
    } catch (error) {
        console.error("Error deleting document:", error);
        alert(`❌ 문서 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
};

window.viewDocument = async function (docId) {
    console.log("👁️ Viewing document:", docId);
    console.log("All documents:", allDocuments);

    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        console.error("❌ Document not found:", docId);
        alert(`Document not found: ${docId}`);
        return;
    }

    console.log("✅ Document found:", doc.title);
    currentDocId = docId;

    // Increment view count
    try {
        await db.collection(`projects/${projectId}/documents`).doc(docId).update({
            view_count: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.warn("Could not increment view count:", error);
    }

    const modal = document.getElementById('view-document-modal');
    if (!modal) {
        console.error("❌ View modal element not found!");
        alert("View modal element not found in DOM");
        return;
    }

    console.log("✅ Modal element found");

    const titleEl = document.getElementById('view-doc-title');
    if (titleEl) {
        titleEl.textContent = doc.title;
    } else {
        console.error("❌ Title element not found");
    }

    // Meta info
    const meta = document.getElementById('view-doc-meta');
    if (meta) {
        meta.innerHTML = `
            <div style="display: flex; gap: 24px; flex-wrap: wrap; font-size: 13px;">
                <div>
                    <span style="color: rgba(255,255,255,0.5);">Category:</span>
                    <span style="color: #16e0bd; margin-left: 8px;">${getCategoryLabel(doc.category)}</span>
                </div>
                <div>
                    <span style="color: rgba(255,255,255,0.5);">Status:</span>
                    <span class="status-badge status-${doc.status === 'published' ? 'active' : 'pending'}" style="margin-left: 8px; font-size: 11px;">
                        ${doc.status}
                    </span>
                </div>
                <div>
                    <span style="color: rgba(255,255,255,0.5);">Version:</span>
                    <span style="margin-left: 8px;">v${doc.version || '1.0.0'}</span>
                </div>
                <div>
                    <span style="color: rgba(255,255,255,0.5);">Last Updated:</span>
                    <span style="margin-left: 8px;">${formatDate(doc.updated_at)}</span>
                </div>
            </div>
            ${doc.tags && doc.tags.length > 0 ? `
                <div style="margin-top: 12px;">
                    ${doc.tags.map(tag => `<span style="background: rgba(22,224,189,0.1); color: #16e0bd; padding: 4px 12px; border-radius: 4px; margin-right: 8px; font-size: 12px;">#${tag}</span>`).join('')}
                </div>
            ` : ''}
        `;
    } else {
        console.error("❌ Meta element not found");
    }

    // Content (simple markdown rendering)
    const contentDiv = document.getElementById('view-doc-content');
    if (contentDiv) {
        contentDiv.innerHTML = renderMarkdown(doc.content);
    } else {
        console.error("❌ Content element not found");
    }

    console.log("🔓 Opening modal...");
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
    console.log("✅ Modal display set to flex and open class added");
};

window.closeViewDocumentModal = function () {
    const modal = document.getElementById('view-document-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    currentDocId = null;
};

window.editCurrentDocument = function () {
    if (currentDocId) {
        const docIdToEdit = currentDocId; // Capture ID before it's cleared
        closeViewDocumentModal();
        // Small delay to allow close animation to start/finish smoothly before opening new modal
        setTimeout(() => openDocumentModal(docIdToEdit), 100);
    }
};

window.filterDocuments = function () {
    const searchTerm = document.getElementById('doc-search').value.toLowerCase();
    const categoryFilter = document.getElementById('doc-category-filter').value;

    const filtered = allDocuments.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm) ||
            doc.content.toLowerCase().includes(searchTerm) ||
            (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm)));

        const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    renderDocuments(filtered);
};

function getCategoryLabel(category) {
    const labels = {
        'user_guide': 'User Guide',
        'technical': 'Technical',
        'api': 'API Reference'
    };
    return labels[category] || category;
}

function getDocumentPreview(content) {
    // Remove markdown syntax and get first 100 chars
    const plain = content.replace(/[#*`\[\]]/g, '').substring(0, 100);
    return plain + (content.length > 100 ? '...' : '');
}

function renderMarkdown(markdown) {
    // Simple markdown rendering (basic support)
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3 style="color: #16e0bd; margin: 24px 0 12px 0;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="color: #16e0bd; margin: 32px 0 16px 0;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="color: #16e0bd; margin: 40px 0 20px 0;">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong style="color: #16e0bd;">$1</strong>')
        // Code blocks
        .replace(/```(.*?)```/gims, '<pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0;"><code>$1</code></pre>')
        // Inline code
        .replace(/`(.*?)`/gim, '<code style="background: rgba(22,224,189,0.1); color: #16e0bd; padding: 2px 6px; border-radius: 4px;">$1</code>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li style="margin: 8px 0;">$1</li>')
        // Line breaks
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');

    // Wrap lists
    html = html.replace(/(<li.*?<\/li>)+/gim, '<ul style="margin: 16px 0; padding-left: 24px;">$&</ul>');

    return html;
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Version History Functions
window.viewDocumentHistory = async function () {
    if (!currentDocId) return;

    const historyModal = document.getElementById('history-modal');
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = 'Loading history...';
    historyModal.style.display = 'flex';
    setTimeout(() => historyModal.classList.add('open'), 10);

    try {
        const snapshot = await db.collection(`projects/${projectId}/documents/${currentDocId}/history`)
            .orderBy('archived_at', 'desc')
            .get();

        if (snapshot.empty) {
            historyList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.3);">
                    No version history yet
                </div>
            `;
            return;
        }

        const versions = [];
        snapshot.forEach(doc => {
            versions.push({ id: doc.id, ...doc.data() });
        });

        historyList.innerHTML = versions.map(v => `
            <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <span style="color: #16e0bd; font-weight: bold;">v${v.version}</span>
                        <span style="margin-left: 12px; font-size: 12px; color: rgba(255,255,255,0.5);">
                            ${formatDate(v.archived_at)}
                        </span>
                    </div>
                    <button onclick="restoreVersion('${v.id}', '${v.version}')" 
                            class="admin-btn-secondary" 
                            style="padding: 4px 12px; font-size: 12px;">
                        Restore
                    </button>
                </div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.6);">
                    Archived by: ${v.archived_by}
                </div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 8px; max-height: 60px; overflow: hidden;">
                    ${getDocumentPreview(v.content)}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Error loading history:", error);
        historyList.innerHTML = `<div style="color: #ef4444;">Error: ${error.message}</div>`;
    }
};

window.closeHistoryModal = function () {
    const modal = document.getElementById('history-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};

window.restoreVersion = async function (historyId, version) {
    if (!confirm(`Restore to version ${version}? This will create a new version.`)) return;

    try {
        // Get the historical version
        const historyDoc = await db.collection(`projects/${projectId}/documents/${currentDocId}/history`)
            .doc(historyId)
            .get();

        if (!historyDoc.exists) {
            alert("Version not found");
            return;
        }

        const historyData = historyDoc.data();

        // Get current document to save to history
        const currentDoc = allDocuments.find(d => d.id === currentDocId);
        const currentVersion = currentDoc.version || '1.0.0';

        // Save current version to history
        const currentHistoryId = `${currentDocId}_v${currentVersion.replace(/\./g, '_')}`;
        await db.collection(`projects/${projectId}/documents/${currentDocId}/history`).doc(currentHistoryId).set({
            version: currentVersion,
            title: currentDoc.title,
            content: currentDoc.content,
            category: currentDoc.category,
            status: currentDoc.status,
            tags: currentDoc.tags || [],
            archived_at: firebase.firestore.FieldValue.serverTimestamp(),
            archived_by: firebase.auth().currentUser?.email || 'Unknown'
        });

        // Calculate new version
        const newVersion = incrementVersion(currentVersion);

        // Restore historical content as new version
        await db.collection(`projects/${projectId}/documents`).doc(currentDocId).update({
            title: historyData.title,
            content: historyData.content,
            category: historyData.category,
            status: historyData.status,
            tags: historyData.tags,
            version: newVersion,
            last_updated_by: firebase.auth().currentUser?.email || 'Unknown',
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`✅ Restored to v${version} as v${newVersion}!`);
        closeHistoryModal();
        closeViewDocumentModal();
        loadDocuments();

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};
