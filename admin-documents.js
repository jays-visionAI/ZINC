// admin-documents.js - Smart Editor Version with Tiptap (Fixed)
import { Editor } from 'https://esm.sh/@tiptap/core';
import { StarterKit } from 'https://esm.sh/@tiptap/starter-kit';
import { TextStyle } from 'https://esm.sh/@tiptap/extension-text-style';
import { FontFamily } from 'https://esm.sh/@tiptap/extension-font-family';
import { TextAlign } from 'https://esm.sh/@tiptap/extension-text-align';
import { Underline } from 'https://esm.sh/@tiptap/extension-underline';
import { Link } from 'https://esm.sh/@tiptap/extension-link';
import { Image } from 'https://esm.sh/@tiptap/extension-image';

let editor = null;
let allDocuments = [];
let currentDocId = null;
let documentToDelete = null;
const projectId = "default_project";

window.initDocuments = function (user) {
    console.log("Initializing Smart Documents Page...");

    // Initialize Tiptap Editor (Ensure clean start)
    if (editor) {
        editor.destroy();
    }

    editor = new Editor({
        element: document.querySelector('#editor-container'),
        extensions: [
            StarterKit,
            TextStyle,
            FontFamily,
            Underline,
            Link.configure({ openOnClick: false }),
            Image,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: '',
        onUpdate({ editor }) {
            // Can be used for auto-saving
        }
    });

    // Initialize Toolbar Event Listeners
    initToolbar();

    // Attach Main Actions
    const createBtn = document.getElementById('create-doc-btn');
    if (createBtn) createBtn.onclick = () => window.openDocumentModal();

    loadDocuments();
};

function initToolbar() {
    const bindBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = action;
    };

    bindBtn('btn-bold', () => editor.chain().focus().toggleBold().run());
    bindBtn('btn-italic', () => editor.chain().focus().toggleItalic().run());
    bindBtn('btn-underline', () => editor.chain().focus().toggleUnderline().run());

    const familySelect = document.getElementById('font-family');
    if (familySelect) {
        familySelect.onchange = (e) => editor.chain().focus().setFontFamily(e.target.value).run();
    }

    const sizeInput = document.getElementById('font-size-input');
    bindBtn('btn-font-size-plus', () => {
        let currentSize = parseInt(sizeInput.value) || 16;
        let newSize = currentSize + 1;
        sizeInput.value = newSize + 'px';
        editor.chain().focus().setMark('textStyle', { fontSize: newSize + 'px' }).run();
    });
    bindBtn('btn-font-size-minus', () => {
        let currentSize = parseInt(sizeInput.value) || 16;
        let newSize = Math.max(8, currentSize - 1);
        sizeInput.value = newSize + 'px';
        editor.chain().focus().setMark('textStyle', { fontSize: newSize + 'px' }).run();
    });

    bindBtn('btn-align-left', () => editor.chain().focus().setTextAlign('left').run());
    bindBtn('btn-align-center', () => editor.chain().focus().setTextAlign('center').run());
    bindBtn('btn-align-right', () => editor.chain().focus().setTextAlign('right').run());

    // File Attachment
    const fileInput = document.getElementById('editor-file-input');
    bindBtn('btn-attachment', () => fileInput.click());
    if (fileInput) {
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) await uploadEditorFile(file);
        };
    }
}

async function uploadEditorFile(file) {
    const storageRef = firebase.storage().ref(`projects/${projectId}/docs_assets/${Date.now()}_${file.name}`);
    try {
        const snapshot = await storageRef.put(file);
        const url = await snapshot.ref.getDownloadURL();
        if (file.type.startsWith('image/')) {
            editor.chain().focus().setImage({ src: url }).run();
        } else {
            editor.chain().focus().setLink({ href: url }).insertContent(` 📎 ${file.name} `).run();
        }
    } catch (e) { alert("Upload failed: " + e.message); }
}

async function loadDocuments() {
    const grid = document.getElementById('documents-grid');
    if (grid) grid.innerHTML = 'Loading...';
    try {
        const snapshot = await db.collection(`projects/${projectId}/documents`).orderBy('updated_at', 'desc').get();
        allDocuments = [];
        snapshot.forEach(doc => allDocuments.push({ id: doc.id, ...doc.data() }));
        window.renderDocuments(allDocuments);
    } catch (e) { console.error("Load failed", e); }
}

window.renderDocuments = function (docs) {
    const grid = document.getElementById('documents-grid');
    if (!grid) return;
    grid.innerHTML = docs.map(doc => `
        <div class="admin-card doc-card" onclick="window.viewDocument('${doc.id}')" style="cursor: pointer;">
            <div class="flex-between mb-3">
                <span class="status-badge status-${doc.status}">${doc.status}</span>
                <button class="admin-btn-secondary py-1 px-2" onclick="event.stopPropagation(); window.editDocument('${doc.id}')">Edit</button>
            </div>
            <h4 class="mb-2" style="color: #16e0bd;">${doc.title}</h4>
            <div style="font-size: 13px; color: rgba(255,255,255,0.5); overflow: hidden; height: 40px;">${stripHtml(doc.content || '').substring(0, 80)}...</div>
        </div>
    `).join('');
};

function stripHtml(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

window.openDocumentModal = function (docId = null) {
    currentDocId = docId;
    const modal = document.getElementById('document-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);

    if (docId) {
        const doc = allDocuments.find(d => d.id === docId);
        document.getElementById('doc-edit-id').value = doc.id;
        document.getElementById('doc-title').value = doc.title;
        document.getElementById('doc-category').value = doc.category;
        document.getElementById('doc-status').value = doc.status;
        editor.commands.setContent(doc.content || '');
    } else {
        document.getElementById('doc-edit-id').value = '';
        document.getElementById('doc-title').value = '';
        editor.commands.setContent('');
    }
};

window.closeDocumentModal = () => {
    const modal = document.getElementById('document-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};

window.saveDocument = async function () {
    const title = document.getElementById('doc-title').value.trim();
    if (!title) return alert("Title required");
    const editId = document.getElementById('doc-edit-id').value;
    const docData = {
        title,
        category: document.getElementById('doc-category').value,
        status: document.getElementById('doc-status').value,
        content: editor.getHTML(),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        if (editId) await db.collection(`projects/${projectId}/documents`).doc(editId).update(docData);
        else await db.collection(`projects/${projectId}/documents`).doc(`doc_${Date.now()}`).set(docData);
        window.closeDocumentModal();
        loadDocuments();
    } catch (e) { alert(e.message); }
};

window.viewDocument = (docId) => {
    currentDocId = docId;
    const doc = allDocuments.find(d => d.id === docId);
    document.getElementById('view-doc-title').textContent = doc.title;
    document.getElementById('view-doc-content').innerHTML = doc.content;
    const modal = document.getElementById('view-document-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
};

window.closeViewDocumentModal = () => {
    const modal = document.getElementById('view-document-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};

window.editDocument = (docId) => window.openDocumentModal(docId);
window.editCurrentDocument = () => {
    if (currentDocId) {
        const id = currentDocId;
        window.closeViewDocumentModal();
        setTimeout(() => window.editDocument(id), 200);
    }
};

window.filterDocuments = () => {
    const term = document.getElementById('doc-search').value.toLowerCase();
    const cat = document.getElementById('doc-category-filter').value;
    const filtered = allDocuments.filter(d =>
        (d.title.toLowerCase().includes(term) || d.content.toLowerCase().includes(term)) &&
        (cat === 'all' || d.category === cat)
    );
    window.renderDocuments(filtered);
};

window.viewDocumentHistory = () => alert("History feature coming soon with Smart Editor");
window.closeHistoryModal = () => document.getElementById('history-modal').style.display = 'none';

// Re-implementing delete logic to match previous behavior
window.deleteDocument = () => {
    const id = document.getElementById('doc-edit-id').value;
    if (!id) return;
    documentToDelete = id;
    const confirmModal = document.getElementById('delete-confirm-modal');
    confirmModal.style.display = 'flex';
    confirmModal.classList.add('open');
};
window.cancelDelete = () => {
    const modal = document.getElementById('delete-confirm-modal');
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
};
window.confirmDelete = async () => {
    try {
        await db.collection(`projects/${projectId}/documents`).doc(documentToDelete).delete();
        window.cancelDelete();
        window.closeDocumentModal();
        loadDocuments();
    } catch (e) { alert(e.message); }
};

function formatDate(ts) {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString();
}
