// Authentication Logic

// DOM Elements
const loginBtn = document.querySelector('.btn-primary');
const navLinks = document.querySelector('.nav-links');

// Google Sign-In Provider
const provider = new firebase.auth.GoogleAuthProvider();

// Login Function
async function signInWithGoogle() {
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.5';
        loginBtn.style.cursor = 'not-allowed';
    }

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log("User signed in:", user.displayName);
        // You can save user data to Firestore here if needed
        saveUserToFirestore(user);
    } catch (error) {
        console.error("Error signing in:", error);
        if (error.code !== 'auth/cancelled-popup-request') {
            alert(`Login failed: ${error.message}`);
        }
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';
            loginBtn.style.cursor = 'pointer';
        }
    }
}

// Logout Function
async function signOut() {
    try {
        await auth.signOut();
        console.log("User signed out");
    } catch (error) {
        console.error("Error signing out:", error);
    }
}

// Save User to Firestore
async function saveUserToFirestore(user) {
    try {
        const userRef = db.collection('users').doc(user.uid);
        await userRef.set({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error saving user data:", error);
    }
}

// Update UI based on Auth State
function updateUI(user) {
    // Remove existing profile element if any
    const existingProfile = document.getElementById('user-profile');
    if (existingProfile) {
        existingProfile.remove();
    }

    // Reset Login Button
    const loginBtn = document.querySelector('.nav-links .btn-primary');
    if (loginBtn) {
        loginBtn.style.display = user ? 'none' : 'flex';
    }

    if (user) {
        // Create Profile Element
        const profileDiv = document.createElement('div');
        profileDiv.id = 'user-profile';
        profileDiv.className = 'user-profile';

        const avatar = document.createElement('img');
        avatar.src = user.photoURL || 'https://via.placeholder.com/40';
        avatar.alt = user.displayName;
        avatar.className = 'user-avatar';

        const dropdown = document.createElement('div');
        dropdown.className = 'profile-dropdown';

        const userName = document.createElement('div');
        userName.className = 'user-name';
        userName.textContent = user.displayName;

        const dashboardLink = document.createElement('a');
        dashboardLink.href = '#dashboard';
        dashboardLink.textContent = 'Dashboard';

        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Sign Out';
        logoutBtn.className = 'btn-logout';
        logoutBtn.onclick = signOut;

        dropdown.appendChild(userName);
        dropdown.appendChild(dashboardLink);
        dropdown.appendChild(logoutBtn);

        profileDiv.appendChild(avatar);
        profileDiv.appendChild(dropdown);

        // Add to Nav
        const navLinks = document.querySelector('.nav-links');
        navLinks.appendChild(profileDiv);
    }
}

// Auth State Listener
if (auth) {
    auth.onAuthStateChanged((user) => {
        updateUI(user);
    });
}

// Attach Event Listener to Login Button
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.querySelector('.nav-links .btn-primary');
    if (loginBtn) {
        // Only attach if it's the "Get Started" button intended for login
        // We might need a more specific selector or ID if there are multiple primary buttons
        loginBtn.addEventListener('click', (e) => {
            // Check if we are already logged in (UI should handle this, but safety check)
            if (!auth.currentUser) {
                e.preventDefault(); // Prevent default link behavior if it's an anchor
                signInWithGoogle();
            }
        });
    }
});
