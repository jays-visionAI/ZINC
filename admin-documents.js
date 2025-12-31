// admin-documents.js - Smart Editor Version with Tiptap
import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family';
import FontSize from 'https://esm.sh/tiptap-extension-font-size'; // We might need a custom one if not available, but let's try
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align';
import Underline from 'https://esm.sh/@tiptap/extension-underline';
import Link from 'https://esm.sh/@tiptap/extension-link';
import Image from 'https://esm.sh/@tiptap/extension-image';

let editor = null;
let allDocuments = [];
let currentDocId = null;
const projectId = "default_project";

window.initDocuments = function (user) {
    console.log("Initializing Smart Documents Page...");

    // Initialize Tiptap Editor
    if (!editor) {
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
                // Keep track of changes if needed
            }
        });

        // Initialize Toolbar Event Listeners
        initToolbar();
    }

    // Wait for DOM to be ready
    setTimeout(() => {
        const createBtn = document.getElementById('create-doc-btn');
        if (createBtn) {
            createBtn.onclick = () => window.openDocumentModal();
        }
    }, 100);

    loadDocuments();
};

function initToolbar() {
    // Bold, Italic, Underline
    document.getElementById('btn-bold').onclick = () => editor.chain().focus().toggleBold().run();
    document.getElementById('btn-italic').onclick = () => editor.chain().focus().toggleItalic().run();
    document.getElementById('btn-underline').onclick = () => editor.chain().focus().toggleUnderline().run();

    // Font Family
    document.getElementById('font-family').onchange = (e) => {
        editor.chain().focus().setFontFamily(e.target.value).run();
    };

    // Font Size (+/-)
    const sizeInput = document.getElementById('font-size-input');
    document.getElementById('btn-font-size-plus').onclick = () => {
        let currentSize = parseInt(sizeInput.value) || 16;
        let newSize = currentSize + 1;
        sizeInput.value = newSize + 'px';
        editor.chain().focus().setMark('textStyle', { fontSize: newSize + 'px' }).run();
    };
    document.getElementById('btn-font-size-minus').onclick = () => {
        let currentSize = parseInt(sizeInput.value) || 16;
        let newSize = Math.max(8, currentSize - 1);
        sizeInput.value = newSize + 'px';
        editor.chain().focus().setMark('textStyle', { fontSize: newSize + 'px' }).run();
    };

    // Alignment
    document.getElementById('btn-align-left').onclick = () => editor.chain().focus().setTextAlign('left').run();
    document.getElementById('btn-align-center').onclick = () => editor.chain().focus().setTextAlign('center').run();
    document.getElementById('btn-align-right').onclick = () => editor.chain().focus().setTextAlign('right').run();

    // File Attachment
    const fileInput = document.getElementById('editor-file-input');
    document.getElementById('btn-attachment').onclick = () => fileInput.click();
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadEditorFile(file);
        }
    };
}

async function uploadEditorFile(file) {
    const storageRef = firebase.storage().ref(`projects/${projectId}/docs_assets/${Date.now()}_${file.name}`);
    try {
        const snapshot = await storageRef.put(file);
        const url = await snapshot.ref.getDownloadURL();

        if (file.type.startsWith('image/')) {
            editor.chain().focus().setImage({ src: url }).run();
        } else {
            // Insert as a smart link
            editor.chain().focus().setLink({ href: url }).insertContent(` 📎 ${file.name} `).run();
        }
        alert("File attached successfully!");
    } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to upload file");
    }
}

async function loadDocuments() {
    const grid = document.getElementById('documents-grid');
    grid.innerHTML = `<div style="text-align: center; padding: 60px; color: rgba(255,255,255,0.3); grid-column: 1 / -1;">Loading documents...</div>`;

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
        <div class="admin-card doc-card" data-doc-id="${doc.id}" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <span class="status-badge status-${doc.status === 'published' ? 'active' : 'pending'}">${doc.status}</span>
                <button class="edit-doc-btn admin-btn-secondary" onclick="event.stopPropagation(); window.editDocument('${doc.id}')">Edit</button>
            </div>
            <h4 style="margin: 0 0 8px 0; color: #16e0bd;">${doc.title}</h4>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); overflow: hidden; height: 40px;">${stripHtml(doc.content || '').substring(0, 80)}...</p>
            <div style="font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 10px;">v${doc.version || '1.0.0'} • ${formatDate(doc.updated_at)}</div>
        </div>
    `).join('');

    // Attach card click
    document.querySelectorAll('.doc-card').forEach(card => {
        card.onclick = () => window.viewDocument(card.dataset.docId);
    });
};

function stripHtml(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

window.openDocumentModal = function (docId = null) {
    currentDocId = docId;
    const modal = document.getElementById('document-modal');
    const deleteBtn = document.getElementById('delete-doc-btn');
    const titleEl = document.getElementById('doc-modal-title');

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);

    if (docId) {
        titleEl.textContent = 'Edit Document';
        deleteBtn.style.display = 'block';
        const doc = allDocuments.find(d => d.id === docId);
        if (doc) {
            document.getElementById('doc-edit-id').value = doc.id;
            document.getElementById('doc-title').value = doc.title;
            document.getElementById('doc-category').value = doc.category;
            document.getElementById('doc-status').value = doc.status;
            document.getElementById('doc-tags').value = doc.tags ? doc.tags.join(', ') : '';
            editor.commands.setContent(doc.content || '');
            loadComments(docId);
        }
    } else {
        titleEl.textContent = 'New Document';
        deleteBtn.style.display = 'none';
        document.getElementById('doc-edit-id').value = '';
        document.getElementById('doc-title').value = '';
        editor.commands.setContent('');
        document.getElementById('comments-list').innerHTML = '<p class="no-comments">New document</p>';
    }
};

window.saveDocument = async function () {
    const title = document.getElementById('doc-title').value.trim();
    if (!title) return alert("Title is required");

    const content = editor.getHTML();
    const editId = document.getElementById('doc-edit-id').value;

    try {
        const docData = {
            title,
            category: document.getElementById('doc-category').value,
            status: document.getElementById('doc-status').value,
            content,
            tags: document.getElementById('doc-tags').value.split(',').map(t => t.trim()),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (editId) {
            await db.collection(`projects/${projectId}/documents`).doc(editId).update(docData);
        } else {
            const newId = `doc_${Date.now()}`;
            await db.collection(`projects/${projectId}/documents`).doc(newId).set({
                id: newId,
                ...docData,
                version: "1.0.0",
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        alert("Saved!");
        window.closeDocumentModal();
        loadDocuments();
    } catch (error) {
        alert(error.message);
    }
};

// Commenting System Basic Logic
async function loadComments(docId) {
    const list = document.getElementById('comments-list');
    list.innerHTML = 'Loading comments...';
    // Simplified: Load from a sub-collection
}

// ... other existing helper functions like formatDate, etc. (Keeping them from original)
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}

window.closeDocumentModal = function () {
    const modal = document.getElementById('document-modal');
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
};

window.viewDocument = (docId) => {
    const doc = allDocuments.find(d => d.id === docId);
    document.getElementById('view-doc-title').textContent = doc.title;
    document.getElementById('view-doc-content').innerHTML = doc.content;
    const modal = document.getElementById('view-document-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
};

window.closeViewDocumentModal = () => {
    const modal = document.getElementById('view-document-modal');
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
};
