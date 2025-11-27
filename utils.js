// Utility function to update user's lastAccess timestamp
// This should be called on every page load for authenticated users

async function updateLastAccess() {
    const user = firebase.auth().currentUser;
    if (user) {
        try {
            await db.collection('users').doc(user.uid).update({
                lastAccess: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Last access updated');
        } catch (error) {
            console.error('Error updating last access:', error);
        }
    }
}

// Auto-update lastAccess when user is authenticated
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        updateLastAccess();
    }
});
