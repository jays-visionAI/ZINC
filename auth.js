// Authentication Logic

// DOM Elements
const loginBtn = document.querySelector('.btn-primary');
const navLinks = document.querySelector('.nav-links');

// Google Sign-In Provider
const provider = new firebase.auth.GoogleAuthProvider();

// Login Function
// Login Function
async function signInWithGoogle(targetBtn = null) {
    if (targetBtn) {
        targetBtn.disabled = true;
        targetBtn.style.opacity = '0.5';
        targetBtn.style.cursor = 'not-allowed';
    } else if (loginBtn) { // Fallback to global if no target provided
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.5';
        loginBtn.style.cursor = 'not-allowed';
    }

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log("User signed in:", user.displayName);

        // Auto-create or update user document in Firestore
        if (user) {
            const userRef = db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                // Create new user document
                await userRef.set({
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastAccess: firebase.firestore.FieldValue.serverTimestamp(),
                    tier: 'free',
                    role: 'user'
                });
                console.log('New user document created in Firestore');
            } else {
                // Update last login and last access time
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastAccess: firebase.firestore.FieldValue.serverTimestamp(),
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                });
                console.log('User document updated in Firestore');
            }
        }

        // Redirect to Command Center
        window.location.href = 'command-center.html';
    } catch (error) {
        console.error("Error signing in:", error);
        if (error.code !== 'auth/cancelled-popup-request') {
            alert(`Login failed: ${error.message}`);
        }
    } finally {
        if (targetBtn) {
            targetBtn.disabled = false;
            targetBtn.style.opacity = '1';
            targetBtn.style.cursor = 'pointer';
        } else if (loginBtn) {
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

// Save User to Firestore - This function is removed as its logic is now integrated into signInWithGoogle
/*
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
*/
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
        dashboardLink.href = 'command-center.html';
        dashboardLink.textContent = 'Command Center';

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
        const langToggle = document.getElementById('lang-toggle');

        if (navLinks) {
            if (langToggle) {
                navLinks.insertBefore(profileDiv, langToggle);
            } else {
                navLinks.appendChild(profileDiv);
            }
        }
    }
}

// Auth State Listener
if (auth) {
    auth.onAuthStateChanged((user) => {
        updateUI(user);
    });
}

// Attach Event Listener to Login Button
// Attach Event Listener to Login Buttons
document.addEventListener('DOMContentLoaded', () => {
    // Select all buttons that should trigger login:
    // 1. Navbar "Get Started" (.nav-links .btn-primary)
    // 2. Hero "Start for Free" (.btn-hero)
    // 3. CTA "Start for Free" (.btn-hero in .cta-buttons)
    const loginButtons = document.querySelectorAll('.nav-links .btn-primary, .btn-hero');

    loginButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Check if we are already logged in (UI should handle this, but safety check)
            if (!auth.currentUser) {
                e.preventDefault(); // Prevent default link behavior if it's an anchor
                signInWithGoogle(e.currentTarget);
            } else {
                // If logged in, redirect to dashboard
                window.location.href = 'command-center.html';
            }
        });
    });
});
