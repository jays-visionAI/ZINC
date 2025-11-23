// admin-industries.js - Industry Master CRUD Operations

(function () {
    let editingId = null;
    let industries = [];

    // Initialize when page loads
    if (document.getElementById('industries-tbody')) {
        initIndustries();
    }

    function initIndustries() {
        loadIndustries();
        setupEventListeners();

        // Seed data if collection is empty
        checkAndSeedIndustries();
    }

    // 🔹 Load Industries from Firestore
    function loadIndustries() {
        db.collection("industries")
            .orderBy("order", "asc")
            .onSnapshot((snapshot) => {
                industries = [];
                snapshot.forEach(doc => {
                    industries.push({ id: doc.id, ...doc.data() });
                });
                renderIndustriesTable();
            }, (error) => {
                console.error("Error loading industries:", error);
                alert("Failed to load industries: " + error.message);
            });
    }

    // 🔹 Render Table
    function renderIndustriesTable() {
        const tbody = document.getElementById("industries-tbody");
        if (!tbody) return;

        if (industries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        No industries found. Click "Add Industry" to create one or wait for seed data.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = industries.map(ind => `
            <tr>
                <td><strong>${ind.labelEn}</strong></td>
                <td><code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 3px; font-size: 0.85rem;">${ind.key}</code></td>
                <td>${ind.order}</td>
                <td>
                    <label class="admin-toggle">
                        <input type="checkbox" ${ind.isActive ? 'checked' : ''} onchange="toggleIndustryActive('${ind.id}', this.checked)">
                        <span class="admin-toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <span class="${ind.allowCustomInput ? 'admin-status-active' : 'admin-status-inactive'} admin-status-badge">
                        ${ind.allowCustomInput ? 'Yes' : 'No'}
                    </span>
                </td>
                <td>
                    <div class="admin-table-actions">
                        <button class="admin-btn-edit" onclick="editIndustry('${ind.id}')">Edit</button>
                        <button class="admin-btn-danger" onclick="deleteIndustry('${ind.id}', '${ind.key}', ${ind.allowCustomInput})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // 🔹 Setup Event Listeners
    function setupEventListeners() {
        // Add Industry Button
        document.getElementById('btn-add-industry')?.addEventListener('click', () => {
            openModal();
        });

        // Modal Close
        document.getElementById('close-industry-modal')?.addEventListener('click', closeModal);
        document.getElementById('cancel-industry-modal')?.addEventListener('click', closeModal);

        // Form Submit
        document.getElementById('industry-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveIndustry();
        });

        // Auto-generate key from labelEn
        document.getElementById('industry-labelEn')?.addEventListener('input', (e) => {
            const keyInput = document.getElementById('industry-key');
            if (keyInput && !editingId) {
                keyInput.value = slugify(e.target.value);
            }
        });
    }

    // 🔹 Modal Functions
    function openModal(industry = null) {
        const modal = document.getElementById('industry-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('industry-form');

        if (industry) {
            editingId = industry.id;
            title.textContent = 'Edit Industry';
            document.getElementById('industry-labelEn').value = industry.labelEn || '';
            document.getElementById('industry-labelKo').value = industry.labelKo || '';
            document.getElementById('industry-key').value = industry.key || '';
            document.getElementById('industry-order').value = industry.order || 0;
            document.getElementById('industry-isActive').checked = industry.isActive !== false;
            document.getElementById('industry-allowCustomInput').checked = industry.allowCustomInput || false;
        } else {
            editingId = null;
            title.textContent = 'Add Industry';
            form.reset();
            // Set default order
            const maxOrder = industries.length > 0 ? Math.max(...industries.map(i => i.order || 0)) : 0;
            document.getElementById('industry-order').value = maxOrder + 10;
        }

        modal.classList.add('open');
    }

    function closeModal() {
        const modal = document.getElementById('industry-modal');
        modal.classList.remove('open');
        editingId = null;
        document.getElementById('industry-form').reset();
    }

    // 🔹 Save Industry (Create or Update)
    async function saveIndustry() {
        const data = {
            labelEn: document.getElementById('industry-labelEn').value.trim(),
            labelKo: document.getElementById('industry-labelKo').value.trim(),
            key: document.getElementById('industry-key').value.trim(),
            order: parseInt(document.getElementById('industry-order').value),
            isActive: document.getElementById('industry-isActive').checked,
            allowCustomInput: document.getElementById('industry-allowCustomInput').checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!data.labelEn || !data.key) {
            alert('Label (EN) and Key are required!');
            return;
        }

        try {
            if (editingId) {
                // Update
                await db.collection("industries").doc(editingId).update(data);
                console.log('Industry updated:', editingId);
            } else {
                // Create
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("industries").add(data);
                console.log('Industry created');
            }
            closeModal();
        } catch (error) {
            console.error('Error saving industry:', error);
            alert('Failed to save: ' + error.message);
        }
    }

    // 🔹 Edit Industry
    window.editIndustry = function (id) {
        const industry = industries.find(i => i.id === id);
        if (industry) {
            openModal(industry);
        }
    };

    // 🔹 Delete Industry
    window.deleteIndustry = async function (id, key, allowCustomInput) {
        if (allowCustomInput) {
            const confirmed = confirm('WARNING: This is the "Other (Custom Input)" option. Are you sure you want to delete it?');
            if (!confirmed) return;
        } else {
            const confirmed = confirm('Delete this industry? This action cannot be undone.');
            if (!confirmed) return;
        }

        try {
            await db.collection("industries").doc(id).delete();
            console.log('Industry deleted:', id);
        } catch (error) {
            console.error('Error deleting industry:', error);
            alert('Failed to delete: ' + error.message);
        }
    };

    // 🔹 Toggle Active Status
    window.toggleIndustryActive = async function (id, isActive) {
        try {
            await db.collection("industries").doc(id).update({
                isActive: isActive,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Industry active status updated:', id, isActive);
        } catch (error) {
            console.error('Error toggling active:', error);
            alert('Failed to update status: ' + error.message);
        }
    };

    // 🔹 Seed Industries
    async function checkAndSeedIndustries() {
        try {
            const snapshot = await db.collection("industries").limit(1).get();
            if (snapshot.empty) {
                console.log('Industries collection is empty, seeding data...');
                await seedIndustries();
            }
        } catch (error) {
            console.error('Error checking industries:', error);
        }
    }

    async function seedIndustries() {
        const seedData = [
            { key: "marketing_agency", labelEn: "Marketing Agency", labelKo: "마케팅 에이전시", order: 10 },
            { key: "it_dev_agency", labelEn: "IT / Dev Agency", labelKo: "IT / 개발 에이전시", order: 20 },
            { key: "blockchain_web3", labelEn: "Blockchain / Web3 Solutions", labelKo: "블록체인 / Web3", order: 30 },
            { key: "business_consulting", labelEn: "Business Consulting", labelKo: "비즈니스 컨설팅", order: 40 },
            { key: "ad_production", labelEn: "AD Production", labelKo: "광고 제작", order: 50 },
            { key: "ecommerce", labelEn: "E-Commerce", labelKo: "이커머스", order: 60 },
            { key: "fb_hospitality", labelEn: "F&B / Hospitality", labelKo: "F&B / 호스피탈리티", order: 70 },
            { key: "retail", labelEn: "Retail", labelKo: "리테일", order: 80 },
            { key: "manufacturing", labelEn: "Manufacturing", labelKo: "제조업", order: 90 },
            { key: "healthcare", labelEn: "Healthcare", labelKo: "헬스케어", order: 100 },
            { key: "education", labelEn: "Education", labelKo: "교육", order: 110 },
            { key: "logistics", labelEn: "Logistics", labelKo: "물류", order: 120 },
            { key: "media_publishing", labelEn: "Media / Publishing", labelKo: "미디어 / 출판", order: 130 },
            { key: "non_profit", labelEn: "Non-Profit", labelKo: "비영리", order: 140 },
            { key: "government", labelEn: "Government / Public", labelKo: "정부 / 공공기관", order: 150 },
            { key: "real_estate", labelEn: "Real Estate", labelKo: "부동산", order: 160 },
            { key: "other_custom", labelEn: "Other (Custom Input)", labelKo: "기타 (직접입력)", order: 999, allowCustomInput: true }
        ];

        const batch = db.batch();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        seedData.forEach(item => {
            const docRef = db.collection("industries").doc();
            batch.set(docRef, {
                ...item,
                isActive: true,
                allowCustomInput: item.allowCustomInput || false,
                createdAt: timestamp,
                updatedAt: timestamp
            });
        });

        try {
            await batch.commit();
            console.log('17 industries seeded successfully!');
            alert('Industry Master data initialized with 17 default industries.');
        } catch (error) {
            console.error('Error seeding industries:', error);
            alert('Failed to seed data: ' + error.message);
        }
    }

    // 🔹 Utility: Slugify
    function slugify(text) {
        return text.toString().toLowerCase()
            .trim()
            .replace(/\s+/g, '_')           // Replace spaces with _
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\_\_+/g, '_')         // Replace multiple _ with single _
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    }
})();
