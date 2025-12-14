// Knowledge Hub Logic

const FILES = [
    { id: 1, name: 'Brand_Guidelines_v2.pdf', type: 'drive', date: '2 days ago', status: 'ready', summary: "Comprehensive guide on logo usage, color palette (Indigo/Slate), and typography (Inter). Includes restrictions on competitor mentions." },
    { id: 2, name: 'Q1_Product_Lineup.pptx', type: 'drive', date: '1 hour ago', status: 'processing', summary: "Details for the upcoming 'Winter Glow' serum launch. Key ingredients: Hyaluronic Acid, Vitamin C. Pricing strategy included." },
    { id: 3, name: 'Competitor_Analysis_2024', type: 'link', date: '5 days ago', status: 'ready', summary: "Analysis of top 5 competitors. Note: Competitor A is aggressive on TikTok. Recommendation: Increase video content." }
];

const dom = {
    fileList: document.getElementById('file-list'),
    uploadBtn: document.getElementById('btn-upload-trigger'),
    uploadArea: document.getElementById('upload-area'),
    uploadBar: document.getElementById('upload-bar'),
    previewEmpty: document.getElementById('preview-empty'),
    previewContent: document.getElementById('preview-content'),
    previewTitle: document.getElementById('preview-title'),
    previewSummary: document.getElementById('preview-summary')
};

function init() {
    renderFiles();
    setupUpload();
}

function renderFiles() {
    if(!dom.fileList) return;
    dom.fileList.innerHTML = '';

    FILES.forEach(file => {
        const el = document.createElement('div');
        el.className = "bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 transition-all cursor-pointer group";
        el.onclick = () => showPreview(file);
        
        let icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>`;
        if(file.type === 'link') icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

        let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>`;
        if(file.status === 'processing') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1"><span class="animate-spin text-[8px]">⌛</span> Processing</span>`;

        el.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-2 bg-slate-900 rounded-lg">
                    ${icon}
                </div>
                <div class="flex-1">
                    <h3 class="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">${file.name}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        ${statusBadge}
                        <span class="text-[10px] text-slate-500">${file.date}</span>
                    </div>
                </div>
                <button class="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-white transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
            </div>
        `;
        dom.fileList.appendChild(el);
    });
}

function showPreview(file) {
    if(!dom.previewContent) return;
    
    dom.previewEmpty.style.display = 'none';
    dom.previewContent.style.display = 'flex';
    dom.previewContent.classList.remove('hidden');

    dom.previewTitle.textContent = file.name;
    dom.previewSummary.textContent = file.summary;
}

function setupUpload() {
    if(!dom.uploadBtn) return;

    dom.uploadBtn.onclick = () => {
        dom.uploadArea.classList.remove('hidden');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            dom.uploadBar.style.width = `${progress}%`;
            if(progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    dom.uploadArea.classList.add('hidden');
                    // Add dummy file
                    FILES.unshift({
                        id: Date.now(),
                        name: 'New_Upload_File.pdf',
                        type: 'drive',
                        date: 'Just now',
                        status: 'processing',
                        summary: 'Analyzing content...'
                    });
                    renderFiles();
                }, 500);
            }
        }, 100);
    };
}

document.addEventListener('DOMContentLoaded', init);