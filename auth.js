// Authentication Logic
(function () {
    console.log("🔒 ZYNK Auth Script Loaded");

    // Google Sign-In Provider
    const provider = new firebase.auth.GoogleAuthProvider();

    // Login Function
    async function signInWithGoogle(targetBtn = null) {
        console.log("🔑 signInWithGoogle called", targetBtn);
        if (targetBtn) {
            targetBtn.disabled = true;
            targetBtn.style.opacity = '0.5';
            targetBtn.style.cursor = 'not-allowed';
        } else {
            // Fallback: Try to find a primary button if no target provided
            const fallbackBtn = document.querySelector('.nav-links .btn-primary');
            if (fallbackBtn) {
                fallbackBtn.disabled = true;
                fallbackBtn.style.opacity = '0.5';
                fallbackBtn.style.cursor = 'not-allowed';
            }
        }

        try {
            console.log("🚀 Starting sign-in popup...");
            if (!firebase.apps.length) {
                console.error("❌ Firebase app is not initialized!");
                alert("Authentication System Error: Firebase not initialized.");
                return;
            }

            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            console.log("✅ User signed in successfully:", user.displayName);

            // Auto-create or update user document in Firestore
            let needsOnboarding = false;
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                const userDoc = await userRef.get();

                if (!userDoc.exists) {
                    needsOnboarding = true;
                    // Create new user document
                    await userRef.set({
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        lastAccess: firebase.firestore.FieldValue.serverTimestamp(),
                        tier: 'free',
                        role: 'user',
                        onboardingCompleted: false
                    });
                    console.log('✨ New user document created in Firestore');
                } else {
                    const userData = userDoc.data();
                    if (!userData.onboardingCompleted) {
                        needsOnboarding = true;
                    }
                    // Update last login and last access time
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        lastAccess: firebase.firestore.FieldValue.serverTimestamp(),
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL
                    });
                    console.log('🔄 User document updated in Firestore');
                }
            }

            // Redirect to appropriate page
            if (needsOnboarding) {
                console.log("➡️ Redirecting to onboarding.html...");
                window.location.href = 'onboarding.html';
            } else {
                console.log("➡️ Redirecting to command-center.html...");
                window.location.href = 'command-center.html';
            }

        } catch (error) {
            console.error("❌ Error signing in:", error);
            if (error.code !== 'auth/cancelled-popup-request') {
                alert(`Login failed: ${error.message}`);
            }
        } finally {
            if (targetBtn) {
                targetBtn.disabled = false;
                targetBtn.style.opacity = '1';
                targetBtn.style.cursor = 'pointer';
            } else {
                const fallbackBtn = document.querySelector('.nav-links .btn-primary');
                if (fallbackBtn) {
                    fallbackBtn.disabled = false;
                    fallbackBtn.style.opacity = '1';
                    fallbackBtn.style.cursor = 'pointer';
                }
            }
        }
    }

    // Logout Function
    async function signOut() {
        try {
            await auth.signOut();
            console.log("👋 User signed out");
            window.location.reload();
        } catch (error) {
            console.error("❌ Error signing out:", error);
        }
    }

    // Update UI based on Auth State
    function updateUI(user) {
        // Remove existing profile element if any
        const existingProfile = document.getElementById('user-profile');
        if (existingProfile) {
            existingProfile.remove();
        }

        // Reset Login Button visibility
        // Note: We use a more specific selector to avoid conflicts or selecting wrong buttons
        const navLoginBtn = document.querySelector('.nav-links .btn-primary');
        if (navLoginBtn) {
            navLoginBtn.style.display = user ? 'none' : 'flex';
        }

        if (user) {
            console.log("👤 Updating UI for logged-in user:", user.displayName);
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
    if (typeof auth !== 'undefined' && auth) {
        auth.onAuthStateChanged((user) => {
            updateUI(user);
        });
    } else {
        console.error("❌ 'auth' object is undefined. Check firebase-config.js order.");
    }

    // Attach Event Listener to Login Buttons
    document.addEventListener('DOMContentLoaded', () => {
        // Select all buttons that should trigger login:
        // 1. Navbar "Get Started" (.nav-links .btn-primary)
        // 2. Hero "Start for Free" (.btn-hero)
        // 3. CTA "Start for Free" (.btn-hero in .cta-buttons)
        const loginButtons = document.querySelectorAll('.nav-links .btn-primary, .btn-hero');
        console.log(`🔗 Attaching login listeners to ${loginButtons.length} buttons`);

        loginButtons.forEach(btn => {
            // Remove any existing listeners to be safe (though cloning is cleaner, simply adding logic is fine here)
            btn.addEventListener('click', (e) => {
                console.log("🖱️ Login button clicked");
                // Check if we are already logged in (UI should handle this, but safety check)
                if (typeof auth !== 'undefined' && auth.currentUser) {
                    console.log("ℹ️ User already logged in, redirecting...");
                    window.location.href = 'command-center.html';
                } else {
                    e.preventDefault(); // Prevent default link behavior if it's an anchor
                    signInWithGoogle(e.currentTarget);
                }
            });
        });
    });

})(); // End IIFE
