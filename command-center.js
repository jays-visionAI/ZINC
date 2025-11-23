// command-center.js

document.addEventListener("DOMContentLoaded", () => {
    const hiveGrid = document.getElementById("hive-grid");

    const modal = document.getElementById("create-project-modal");
    const closeBtn = document.getElementById("close-modal-btn");
    const cancelBtn = document.getElementById("cancel-create-btn");
    const fab = document.getElementById("create-project-fab");

    // 🔹 모달 열기 / 닫기
    const openModal = () => {
        if (!modal) return;
        modal.classList.add("open");
    };

    const closeModal = () => {
        if (!modal) return;
        modal.classList.remove("open");
    };

    // 🔹 FAB 버튼은 아무 동작도 안 하도록
    if (fab) {
        fab.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // intentionally no action
        });
    }

    // 🔹 "Add New Project" 카드 렌더
    function renderAddProjectCard() {
        if (!hiveGrid) return;

        hiveGrid.innerHTML = "";

        const card = document.createElement("div");
        card.className = "client-card add-project-card";

        card.innerHTML = `
      <div class="add-project-inner">
        <div class="add-project-icon">+</div>
        <div class="add-project-label">Add New Project</div>
      </div>
    `;

        // 카드 전체 클릭 → 모달 열기
        card.addEventListener("click", openModal);

        hiveGrid.appendChild(card);
    }

    // 🔹 실제 프로젝트 리스트를 가져와 그리드 렌더링하는 자리
    // 현재는 프로젝트가 없다고 가정하고, Add Project 카드만 표시
    function initHiveGrid() {
        // TODO: 향후 Firestore에서 프로젝트 가져오면 여기서 데이터 받아서 분기하면 됨.
        const projects = []; // 현재는 0개

        if (!projects || projects.length === 0) {
            renderAddProjectCard();
        } else {
            // 프로젝트가 있을 때의 카드 렌더링 로직 (나중에 구현)
            hiveGrid.innerHTML = "";
            projects.forEach((p) => {
                const card = document.createElement("div");
                card.className = "client-card";
                card.textContent = p.name || "Project";
                hiveGrid.appendChild(card);
            });
        }
    }

    // 🔹 모달 닫기 버튼들
    [closeBtn, cancelBtn].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            closeModal();
        });
    });

    // 🔹 모달 바깥 클릭 시 닫기
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // 🔹 Language Switching Logic
    const btnEn = document.getElementById('btn-lang-en');
    const btnKo = document.getElementById('btn-lang-ko');

    function updateLanguageUI(lang) {
        if (btnEn && btnKo) {
            if (lang === 'en') {
                btnEn.classList.add('active');
                btnEn.style.cssText = 'background: var(--color-cyan); color: #000; font-weight: bold;';
                btnKo.classList.remove('active');
                btnKo.style.cssText = '';
            } else {
                btnKo.classList.add('active');
                btnKo.style.cssText = 'background: var(--color-cyan); color: #000; font-weight: bold;';
                btnEn.classList.remove('active');
                btnEn.style.cssText = '';
            }
        }

        // Update Add Project Card Text if it exists
        const addProjectLabel = document.querySelector('.add-project-label');
        if (addProjectLabel) {
            addProjectLabel.textContent = lang === 'ko' ? '새 프로젝트 추가' : 'Add New Project';
        }
    }

    if (btnEn) {
        btnEn.addEventListener('click', () => {
            translatePage('en');
            updateLanguageUI('en');
        });
    }

    if (btnKo) {
        btnKo.addEventListener('click', () => {
            translatePage('ko');
            updateLanguageUI('ko');
        });
    }

    // Initialize Language UI
    if (typeof currentLang !== 'undefined') {
        updateLanguageUI(currentLang);
        translatePage(currentLang);
    }

    // 초기 실행
    initHiveGrid();
});
