/**
 * admin-ui-menu.js
 * Logic for the Admin UI & Menu Management Page
 */

const UIManagement = {
    init: function () {
        console.log('[UIManagement] Initializing...');
        this.bindEvents();
        this.loadCurrentConfig();
    },

    bindEvents: function () {
        // Save Button
        document.getElementById('btn-save-ui')?.addEventListener('click', () => this.saveChanges());

        // Reset Button
        document.getElementById('btn-reset-ui')?.addEventListener('click', () => this.resetDefaults());

        // Color Pickers Sync
        this.bindColorPicker('input-brand-grad-from', 'input-brand-grad-from-picker');
        this.bindColorPicker('input-brand-grad-to', 'input-brand-grad-to-picker');
        this.bindColorPicker('input-studio-grad-from', 'input-studio-grad-from-picker');
        this.bindColorPicker('input-studio-grad-to', 'input-studio-grad-to-picker');
    },

    bindColorPicker: function (textId, pickerId) {
        const textInput = document.getElementById(textId);
        const pickerInput = document.getElementById(pickerId);
        if (!textInput || !pickerInput) return;

        // Picker -> Text
        pickerInput.addEventListener('input', (e) => {
            textInput.value = e.target.value.toUpperCase();
        });

        // Text -> Picker
        textInput.addEventListener('change', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                pickerInput.value = e.target.value;
            }
        });
    },

    loadCurrentConfig: function () {
        // We rely on UI.config being loaded. 
        if (!window.UI || !window.UI.config) {
            console.warn('[UIManagement] UI Config not found.');
            return;
        }

        const headers = window.UI.config.headers;

        // Populate Brand Brain
        if (headers.brand_brain) {
            const bb = headers.brand_brain;
            this.setVal('input-brand-title', bb.title);
            this.setVal('input-brand-subtitle', bb.subtitle);
            this.setVal('input-brand-grad-from', bb.gradient_from);
            this.setVal('input-brand-grad-to', bb.gradient_to);
            this.setVal('input-brand-grad-from-picker', bb.gradient_from);
            this.setVal('input-brand-grad-to-picker', bb.gradient_to);
        }

        // Populate Studio
        if (headers.studio) {
            const st = headers.studio;
            this.setVal('input-studio-title', st.title);
            this.setVal('input-studio-subtitle', st.subtitle);
            this.setVal('input-studio-version', st.version);
            this.setVal('input-studio-grad-from', st.gradient_from);
            this.setVal('input-studio-grad-to', st.gradient_to);
            this.setVal('input-studio-grad-from-picker', st.gradient_from);
            this.setVal('input-studio-grad-to-picker', st.gradient_to);
        }

        // Populate Sidebar
        this.renderSidebarItems(window.UI.config.sidebar);
    },

    /**
     * Move an item up or down within its section
     * @param {number} index - Visual index of the item row across all sections
     * @param {number} direction - -1 (Up) or 1 (Down)
     */
    moveItem: function (index, direction) {
        // 1. Capture current state from DOM
        const allItems = this.getSidebarDataFromDOM();

        // 2. Group items to find neighbors in the same section
        const sections = {
            'WORKSPACE': [],
            '5-STAGE PIPELINE': [],
            'SETTINGS': [],
            'OTHER': []
        };

        allItems.forEach(item => {
            const sec = item.section || 'OTHER';
            if (sections[sec]) sections[sec].push(item);
            else sections['OTHER'].push(item);
        });

        // 3. Reconstruct the visual array to map the global index to a specific item
        let visualList = [];
        ['WORKSPACE', '5-STAGE PIPELINE', 'SETTINGS', 'OTHER'].forEach(secKey => {
            if (sections[secKey]) {
                // Ensure they are sorted by order before flattening, leveraging the fact getSidebarDataFromDOM already sorts them
                visualList = visualList.concat(sections[secKey]);
            }
        });

        if (index < 0 || index >= visualList.length) return;

        const item = visualList[index];
        const sectionItems = sections[item.section || 'OTHER'];
        const idxInSection = sectionItems.indexOf(item);

        // 4. Perform Swap
        if (direction === -1 && idxInSection > 0) {
            // Swap Up
            [sectionItems[idxInSection], sectionItems[idxInSection - 1]] = [sectionItems[idxInSection - 1], sectionItems[idxInSection]];
        } else if (direction === 1 && idxInSection < sectionItems.length - 1) {
            // Swap Down
            [sectionItems[idxInSection], sectionItems[idxInSection + 1]] = [sectionItems[idxInSection + 1], sectionItems[idxInSection]];
        } else {
            return; // Cannot move
        }

        // 5. Flatten again to create the new master list
        let newFlatList = [];
        ['WORKSPACE', '5-STAGE PIPELINE', 'SETTINGS', 'OTHER'].forEach(secKey => {
            if (sections[secKey]) newFlatList = newFlatList.concat(sections[secKey]);
        });

        // 6. Re-assign Orders (Gap of 10) to persist the new sequence
        newFlatList.forEach((it, idx) => {
            it.order = (idx + 1) * 10;
        });

        // 7. Re-render
        this.renderSidebarItems(newFlatList);
    },

    renderSidebarItems: function (items) {
        const container = document.getElementById('sidebar-items-container');
        if (!container) return;

        if (!items || !items.length) {
            container.innerHTML = '<div style="padding:1rem; opacity:0.6;">No menu items found.</div>';
            return;
        }

        // Available Icons Reference (Visual Grid)
        let iconKeys = [];
        if (window.ICON_PRESETS) {
            iconKeys = Object.keys(window.ICON_PRESETS);
        }

        // Generate Visual Icon Grid
        const iconGridHtml = `
            <div style="margin-bottom: 2rem; padding: 1.5rem; background: #1e293b; border: 1px solid #334155; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="color: #fff; font-size: 0.875rem; font-weight: 600; margin: 0;">🎨 Icon Library</h4>
                    <span style="font-size: 0.75rem; color: #94a3b8;">Click an icon to insert its ID into the selected field</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; max-height: 200px; overflow-y: auto; padding-right: 8px;">
                    ${iconKeys.map(key => {
            const svg = this.getPreviewIconSvg(key);
            return `
                        <button type="button" class="icon-select-btn" data-icon-id="${key}" style="
                            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
                            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
                            padding: 12px 8px; cursor: pointer; transition: all 0.2s; color: #cbd5e1;
                        " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                            <div style="pointer-events: none;">${svg}</div>
                            <span style="font-size: 0.7rem; font-family: monospace; opacity: 0.8; word-break: break-all;">${key}</span>
                        </button>
                        `;
        }).join('')}
                </div>
                </div>
                
                <!-- Add Custom Icon Section -->
                <div style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                    <button type="button" id="btn-toggle-icon-form" style="background: none; border: none; color: #60a5fa; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 4px;">
                        <span>+ Add Custom Icon</span>
                    </button>
                    
                    <div id="add-icon-form" style="display: none; margin-top: 1rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                            <div style="flex: 1;">
                                <label style="display: block; color: #94a3b8; font-size: 0.75rem; margin-bottom: 4px;">New Icon ID</label>
                                <input type="text" id="new-icon-id" class="admin-input" placeholder="my-icon" style="width: 100%;">
                            </div>
                        </div>
                        <div style="margin-bottom: 0.5rem;">
                             <label style="display: block; color: #94a3b8; font-size: 0.75rem; margin-bottom: 4px;">SVG Content (Inner Path Only or Full SVG)</label>
                             <textarea id="new-icon-svg" class="admin-input" rows="3" placeholder='<path d="..." />' style="width: 100%; font-family: monospace; font-size: 0.75rem;"></textarea>
                        </div>
                        <div style="text-align: right;">
                            <button type="button" id="btn-save-icon" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Add to Library</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Group by Section
        const sections = {
            'WORKSPACE': [],
            '5-STAGE PIPELINE': [],
            'SETTINGS': [],
            'OTHER': []
        };
        items.forEach(item => {
            const sec = item.section || 'OTHER';
            if (sections[sec]) sections[sec].push(item);
            else sections['OTHER'].push(item);
        });

        let html = iconGridHtml;
        let globalIndex = 0; // Track visual index for moveItem

        // Render sections in fixed order
        ['WORKSPACE', '5-STAGE PIPELINE', 'SETTINGS', 'OTHER'].forEach(sectionName => {
            const sectionItems = sections[sectionName];
            if (!sectionItems || sectionItems.length === 0) return;

            // Sort by Order
            sectionItems.sort((a, b) => (a.order || 0) - (b.order || 0));

            html += `
                <div style="margin-bottom: 2rem;">
                    <h4 style="color: #60a5fa; font-size: 1.1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; border-bottom: 2px solid rgba(96, 165, 250, 0.4); padding-bottom: 0.75rem;">
                        ${sectionName}
                    </h4>
            `;

            sectionItems.forEach((item, index) => {
                const isFirst = index === 0;
                const isLast = index === sectionItems.length - 1;

                html += `
                <div class="form-group-container sidebar-item-row" style="margin-bottom: 1rem; padding: 1.25rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="font-size: 1rem; font-weight: 700; color: #fff;">${item.label}</span>
                        <div style="display: flex; align-items: center; gap: 12px;">
                             <span style="font-size: 0.75rem; color: #64748b; font-family: monospace;">ID: ${item.id}</span>
                            <div style="display: flex; gap: 4px;">
                                <button type="button" class="btn-move-item" data-index="${globalIndex}" data-dir="-1" style="
                                    padding: 6px 10px; border: 1px solid #334155; border-radius: 6px; background: ${isFirst ? '#1e293b' : '#334155'}; color: ${isFirst ? '#475569' : '#e2e8f0'}; cursor: ${isFirst ? 'default' : 'pointer'};
                                " ${isFirst ? 'disabled' : ''}>▲</button>
                                <button type="button" class="btn-move-item" data-index="${globalIndex}" data-dir="1" style="
                                    padding: 6px 10px; border: 1px solid #334155; border-radius: 6px; background: ${isLast ? '#1e293b' : '#334155'}; color: ${isLast ? '#475569' : '#e2e8f0'}; cursor: ${isLast ? 'default' : 'pointer'};
                                " ${isLast ? 'disabled' : ''}>▼</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row" style="margin-bottom: 0.75rem;">
                         <div class="form-group" style="flex: 1; display: none;"> <!-- Hidden Order Input -->
                            <label>Order (Sort)</label>
                            <input type="number" class="admin-input item-order trigger-preview" value="${item.order || 0}" style="text-align: center;">
                        </div>
                        <div class="form-group" style="flex: 3;">
                            <label>Label (Title)</label>
                            <input type="text" class="admin-input item-label trigger-preview" value="${item.label || ''}">
                        </div>
                         <div class="form-group" style="flex: 2;">
                             <label>Icon ID</label>
                             <input type="text" class="admin-input item-icon trigger-preview" value="${item.icon || ''}" placeholder="e.g. activity">
                        </div>
                    </div>
                    
                    <div class="form-row" style="margin-bottom: 0.75rem;">
                        <div class="form-group" style="flex: 3;">
                            <label>Subtitle (For Page Header)</label>
                            <input type="text" class="admin-input item-subtitle" value="${item.subtitle || ''}" placeholder="Page subtitle...">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Version</label>
                            <input type="text" class="admin-input item-version" value="${item.version || ''}" placeholder="v1.0">
                        </div>
                    </div>

                    <div class="form-row" style="margin-bottom: 0.75rem;">
                         <div class="form-group" style="flex: 1;">
                            <label>Gradient From</label>
                            <div class="color-input-wrapper" style="display: flex; align-items: center; gap: 8px;">
                                <input type="color" class="item-grad-from-picker" value="${item.gradient_from || '#000000'}" style="width: 32px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;">
                                <input type="text" class="admin-input item-grad-from" value="${item.gradient_from || ''}" placeholder="#Hex" style="font-family: monospace;">
                            </div>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Gradient To</label>
                            <div class="color-input-wrapper" style="display: flex; align-items: center; gap: 8px;">
                                <input type="color" class="item-grad-to-picker" value="${item.gradient_to || '#000000'}" style="width: 32px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;">
                                <input type="text" class="admin-input item-grad-to" value="${item.gradient_to || ''}" placeholder="#Hex" style="font-family: monospace;">
                            </div>
                        </div>
                    </div>
 
                    <div class="form-row">
                        <div class="form-group" style="flex: 3;">
                            <label>Link (URL)</label>
                            <input type="text" class="admin-input item-link trigger-preview" value="${item.link || ''}">
                        </div>
                        <div class="form-group" style="flex: 2;">
                            <label>Section</label>
                            <select class="admin-input item-section trigger-preview">
                                <option value="WORKSPACE" ${item.section === 'WORKSPACE' ? 'selected' : ''}>WORKSPACE</option>
                                <option value="5-STAGE PIPELINE" ${item.section === '5-STAGE PIPELINE' ? 'selected' : ''}>5-STAGE PIPELINE</option>
                                <option value="SETTINGS" ${item.section === 'SETTINGS' ? 'selected' : ''}>SETTINGS</option>
                                <option value="OTHER" ${item.section === 'OTHER' ? 'selected' : ''}>OTHER</option>
                            </select>
                        </div>
                    </div>
                    <!-- Hidden fields -->
                <input type="hidden" class="item-id" value="${item.id}">
                </div>
            `;
                globalIndex++;
            });
            html += `</div>`; // Close section div
        });

        container.innerHTML = html;

        // Init Preview
        this.renderPreview();

        // ---------------------------------------------------------
        // Bind Dynamic Events (Preview, Icon Focus, Color Sync)
        // ---------------------------------------------------------

        // 1. Color Picker Sync (Dynamic Rows)
        container.querySelectorAll('.sidebar-item-row').forEach(row => {
            // Gradient From
            const fromText = row.querySelector('.item-grad-from');
            const fromPicker = row.querySelector('.item-grad-from-picker');
            if (fromText && fromPicker) {
                fromPicker.addEventListener('input', (e) => fromText.value = e.target.value.toUpperCase());
                fromText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) fromPicker.value = e.target.value;
                });
            }
            // Gradient To
            const toText = row.querySelector('.item-grad-to');
            const toPicker = row.querySelector('.item-grad-to-picker');
            if (toText && toPicker) {
                toPicker.addEventListener('input', (e) => toText.value = e.target.value.toUpperCase());
                toText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) toPicker.value = e.target.value;
                });
            }
        });

        // 2. Bind Preview Triggers & Icon Focus Tracking
        let activeIconInput = null;

        container.querySelectorAll('.trigger-preview').forEach(input => {
            input.addEventListener('input', () => {
                this.renderPreview();
            });
            input.addEventListener('change', () => {
                this.renderPreview();
            });

            // Track active icon input
            if (input.classList.contains('item-icon')) {
                input.addEventListener('focus', (e) => {
                    activeIconInput = e.target;
                    // Visual feedback (optional)
                    document.querySelectorAll('.item-icon').forEach(el => el.style.borderColor = '');
                    e.target.style.borderColor = '#3b82f6';
                });
            }
        });

        // Bind Icon Grid Clicks
        container.querySelectorAll('.icon-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const iconId = btn.getAttribute('data-icon-id');
                if (activeIconInput) {
                    activeIconInput.value = iconId;
                    activeIconInput.dispatchEvent(new Event('input')); // Trigger preview

                    // Visual flash
                    const originalBg = btn.style.background;
                    btn.style.background = 'rgba(59, 130, 246, 0.4)';
                    setTimeout(() => {
                        btn.style.background = originalBg;
                    }, 200);
                } else {
                    alert('Please click on an "Icon ID" input field first, then select an icon from the library.');
                }
            });
        });

        // Bind Reorder Buttons
        container.querySelectorAll('.btn-move-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-index'));
                const direction = parseInt(btn.getAttribute('data-dir'));
                this.moveItem(index, direction);
            });
        });

        // Bind Custom Icon Form
        const toggleBtn = container.querySelector('#btn-toggle-icon-form');
        const formDiv = container.querySelector('#add-icon-form');
        const saveIconBtn = container.querySelector('#btn-save-icon');

        if (toggleBtn && formDiv) {
            toggleBtn.addEventListener('click', () => {
                formDiv.style.display = formDiv.style.display === 'none' ? 'block' : 'none';
                toggleBtn.querySelector('span').textContent = formDiv.style.display === 'none' ? '+ Add Custom Icon' : '- Hide Form';
            });
        }

        if (saveIconBtn) {
            saveIconBtn.addEventListener('click', async () => {
                const idInput = container.querySelector('#new-icon-id');
                const svgInput = container.querySelector('#new-icon-svg');
                const iconId = idInput.value.trim();
                let svgContent = svgInput.value.trim();

                if (!iconId || !svgContent) {
                    alert('Please enter both Icon ID and SVG Content.');
                    return;
                }

                // Basic clean up: if user pasted full <svg> tag, try to strip it or keep it valid
                // For simplicity, we assume user might paste inner content or full tag. 
                // We'll trust the user input generally, but cleaning <svg> wrapper if present is safer for getPreviewIconSvg logic which wraps it again?
                // Actually `getPreviewIconSvg` logic wraps innerPath. If user pastes <svg>, we doubly wrap.
                // Let's check.
                if (svgContent.startsWith('<svg') && svgContent.endsWith('</svg>')) {
                    // Extract inner HTML
                    const temp = document.createElement('div');
                    temp.innerHTML = svgContent;
                    const svgEl = temp.querySelector('svg');
                    if (svgEl) svgContent = svgEl.innerHTML;
                }

                try {
                    // Save to Firestore 'system_config/ui_layout' -> custom_icons map
                    // We need to read existing first to merge? set with merge: true handles it if we send specific field path
                    // But 'custom_icons' is a map. set({custom_icons: { [iconId]: svgContent }}, {merge: true}) works.

                    saveIconBtn.textContent = 'Adding...';

                    await db.collection('chatbotConfig').doc('ui_layout').set({
                        custom_icons: {
                            [iconId]: svgContent
                        }
                    }, { merge: true });

                    // Update local global for immediate feedback
                    if (!window.ICON_PRESETS) window.ICON_PRESETS = {};
                    window.ICON_PRESETS[iconId] = svgContent;

                    alert(`Icon '${iconId}' added successfully!`);

                    // Reset Form
                    idInput.value = '';
                    svgInput.value = '';
                    formDiv.style.display = 'none';
                    toggleBtn.querySelector('span').textContent = '+ Add Custom Icon';

                    // Re-render to show new icon in grid
                    const currentItems = this.getSidebarDataFromDOM(); // Capture current work
                    this.renderSidebarItems(currentItems);

                } catch (e) {
                    console.error('Error adding icon:', e);
                    alert('Error adding icon: ' + e.message);
                } finally {
                    saveIconBtn.textContent = 'Add to Library';
                }
            });
        }
    },

    /**
     * Renders the visual sidebar mockup based on current form inputs
     */
    renderPreview: function () {
        const data = this.getSidebarDataFromDOM(); // Reuse scraper logic
        const container = document.getElementById('preview-menu-content');
        if (!container) return;

        // Re-using logic from UI Loader, but simplified for Preview rendering
        const itemsBySection = data.reduce((acc, item) => {
            const section = item.section || 'Uncategorized';
            if (!acc[section]) acc[section] = [];
            acc[section].push(item);
            return acc;
        }, {});

        Object.keys(itemsBySection).forEach(section => {
            itemsBySection[section].sort((a, b) => a.order - b.order);
        });

        const sectionOrder = ['WORKSPACE', '5-STAGE PIPELINE', 'SETTINGS'];
        let html = '';

        sectionOrder.forEach((section, index) => {
            const items = itemsBySection[section];
            if (!items || items.length === 0) return;

            const marginTopStyle = index > 0 ? 'style="margin-top: 1rem;"' : '';
            html += `<div class="menu-label" ${marginTopStyle}> ${section}</div>`;

            items.forEach(item => {
                const isActive = item.id === 'command_center' ? 'active' : ''; // Just mock active state
                const iconSvg = this.getPreviewIconSvg(item.icon);

                html += `
                <a href="#" onclick="return false;" class="menu-item ${isActive}" style="pointer-events: none;">
                    ${iconSvg}
                    ${item.label}
                </a>
    `;
            });
        });

        container.innerHTML = html;
    },

    getPreviewIconSvg: function (iconName) {
        if (window.ICON_PRESETS && window.ICON_PRESETS[iconName]) {
            const innerPath = window.ICON_PRESETS[iconName];
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${innerPath}</svg>`;
        }
        return `<svg width="20" height="20" viewBox="0 0 24 24" style="background:rgba(255,255,255,0.1); border-radius:4px;"></svg>`;
    },

    getSidebarDataFromDOM: function () {
        const rows = document.querySelectorAll('.sidebar-item-row');
        const items = [];

        rows.forEach(row => {
            items.push({
                id: row.querySelector('.item-id').value,
                order: parseInt(row.querySelector('.item-order').value) || 0,
                label: row.querySelector('.item-label').value,
                subtitle: row.querySelector('.item-subtitle').value || '',
                version: row.querySelector('.item-version').value || '',
                gradient_from: row.querySelector('.item-grad-from').value,
                gradient_to: row.querySelector('.item-grad-to').value,
                section: row.querySelector('.item-section').value,
                link: row.querySelector('.item-link').value,
                icon: row.querySelector('.item-icon').value
            });
        });

        // Sort by order before saving
        items.sort((a, b) => a.order - b.order);
        return items;
    },

    setVal: function (id, val) {
        const el = document.getElementById(id);
        if (el && val !== undefined) {
            el.value = val;
            // Auto-sync color picker if it exists
            const picker = document.getElementById(id + '-picker');
            if (picker) {
                picker.value = val;
            }
        }
    },

    getVal: function (id) {
        return document.getElementById(id)?.value || '';
    },

    // Assuming this is the loadCurrentConfig function based on the instruction context
    loadCurrentConfig: async function () {
        if (!db) {
            console.error('Database not initialized.');
            return;
        }

        try {
            const doc = await db.collection('chatbotConfig').doc('ui_layout').get();
            if (doc.exists) {
                const data = doc.data();
                if (data.page_headers) { // Changed from 'headers' to 'page_headers' based on saveChanges
                    // Update Header Fields
                    this.setVal('input-brand-title', data.page_headers.brand_brain?.title); // Adjusted IDs
                    this.setVal('input-brand-subtitle', data.page_headers.brand_brain?.subtitle);
                    this.setVal('input-brand-grad-from', data.page_headers.brand_brain?.gradient_from);
                    this.setVal('input-brand-grad-to', data.page_headers.brand_brain?.gradient_to);

                    this.setVal('input-studio-title', data.page_headers.studio?.title);
                    this.setVal('input-studio-subtitle', data.page_headers.studio?.subtitle);
                    this.setVal('input-studio-version', data.page_headers.studio?.version);
                    this.setVal('input-studio-grad-from', data.page_headers.studio?.gradient_from);
                    this.setVal('input-studio-grad-to', data.page_headers.studio?.gradient_to);
                } else {
                    this.loadDefaultHeaderConfig();
                }

                // Merge Custom Icons for Admin View
                if (data.custom_icons) {
                    if (!window.ICON_PRESETS) window.ICON_PRESETS = {};
                    Object.assign(window.ICON_PRESETS, data.custom_icons);
                }

                if (data.sidebar_menus && Array.isArray(data.sidebar_menus)) { // Changed from 'sidebar' to 'sidebar_menus'
                    this.renderSidebarItems(data.sidebar_menus);
                } else {
                    // Fallback to default if no sidebar override exists
                    // Assuming a defaultConfig exists or will be handled elsewhere
                    if (window.DEFAULT_UI_CONFIG && window.DEFAULT_UI_CONFIG.sidebar) {
                        this.renderSidebarItems(window.DEFAULT_UI_CONFIG.sidebar);
                    }
                }
            } else {
                console.log('No UI layout configuration found, using defaults.');
                this.loadDefaultHeaderConfig();
                // Potentially render default items here if defaultConfig is available
                if (window.DEFAULT_UI_CONFIG && window.DEFAULT_UI_CONFIG.sidebar) {
                    this.renderSidebarItems(window.DEFAULT_UI_CONFIG.sidebar);
                }
            }
        } catch (e) {
            console.error('Error loading UI configuration:', e);
            this.loadDefaultHeaderConfig();
            // Fallback to default rendering so UI is not empty
            if (window.DEFAULT_UI_CONFIG && window.DEFAULT_UI_CONFIG.sidebar) {
                this.renderSidebarItems(window.DEFAULT_UI_CONFIG.sidebar);
            } else if (window.UI && window.UI.config && window.UI.config.sidebar) {
                this.renderSidebarItems(window.UI.config.sidebar);
            } else {
                document.getElementById('sidebar-items-container').innerHTML =
                    `<div style="padding:1rem; color:#ef4444; border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.1); border-radius:8px;">
                        Error loading configuration. Default items shown.<br>
                        <small>${e.message}</small>
                    </div>`;
            }
        }
    },

    loadDefaultHeaderConfig: function () {
        if (window.DEFAULT_UI_CONFIG && window.DEFAULT_UI_CONFIG.headers) {
            const h = window.DEFAULT_UI_CONFIG.headers;

            if (h.brand_brain) {
                this.setVal('input-brand-title', h.brand_brain.title);
                this.setVal('input-brand-subtitle', h.brand_brain.subtitle);
                this.setVal('input-brand-grad-from', h.brand_brain.gradient_from);
                this.setVal('input-brand-grad-to', h.brand_brain.gradient_to);
            }

            if (h.studio) {
                this.setVal('input-studio-title', h.studio.title);
                this.setVal('input-studio-subtitle', h.studio.subtitle);
                this.setVal('input-studio-version', h.studio.version);
                this.setVal('input-studio-grad-from', h.studio.gradient_from);
                this.setVal('input-studio-grad-to', h.studio.gradient_to);
            }
        }
    },

    saveChanges: async function () {
        if (!db) {
            alert('Database not initialized.');
            return;
        }

        // Collect Header Data
        const overrides = {
            page_headers: {
                brand_brain: {
                    title: this.getVal('input-brand-title'),
                    subtitle: this.getVal('input-brand-subtitle'),
                    gradient_from: this.getVal('input-brand-grad-from'),
                    gradient_to: this.getVal('input-brand-grad-to')
                },
                studio: {
                    title: this.getVal('input-studio-title'),
                    subtitle: this.getVal('input-studio-subtitle'),
                    version: this.getVal('input-studio-version'),
                    gradient_from: this.getVal('input-studio-grad-from'),
                    gradient_to: this.getVal('input-studio-grad-to')
                }
            },
            // Collect Sidebar Data
            sidebar_menus: this.getSidebarDataFromDOM()
        };

        try {
            const btn = document.getElementById('btn-save-ui');
            if (btn) btn.textContent = 'Saving...';

            await db.collection('chatbotConfig').doc('ui_layout').set(overrides, { merge: true });

            alert('Configuration saved successfully! Refresh page to see changes.');
            if (btn) btn.textContent = 'Save Changes';

            // Reload local UI config to reflect changes immediately in Admin (optional)
            if (window.UI && window.UI.init) {
                await window.UI.init();
                // Re-populate inputs with new merged values
                this.loadCurrentConfig();
            }

        } catch (e) {
            console.error('Error saving config:', e);
            alert('Error saving configuration: ' + e.message);
        }
    },

    resetDefaults: async function () {
        if (!confirm('Are you sure you want to reset all UI customizations to Default? This cannot be undone.')) return;

        try {
            await db.collection('chatbotConfig').doc('ui_layout').delete();
            alert('Reset to Defaults. Refreshing...');
            location.reload();
        } catch (e) {
            console.error('Error resetting:', e);
            alert('Error resetting: ' + e.message);
        }
    }
};

// Expose globally to be called by Admin Router
window.UIManagement = UIManagement;
window.initUiMenu = function () {
    UIManagement.init();
};
