// user-settings.js

document.addEventListener("DOMContentLoaded", () => {
    // Auth Check
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initSettings(user);
        } else {
            window.location.href = "index.html";
        }
    });
});

let currentUser = null;

function initSettings(user) {
    currentUser = user;
    console.log("Settings initialized for user:", user.email);

    // No data loading for v1 (Connections, Profile, Billing are placeholders)
}

// Tab Switching
window.switchTab = function (tabName) {
    // Update Tab UI
    document.querySelectorAll('.settings-tab').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.tab === tabName) el.classList.add('active');
    });

    // Update Content Visibility
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
}
