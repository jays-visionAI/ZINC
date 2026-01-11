// Import the functions you need from the SDKs you need
// These will be available globally via the CDN scripts in index.html
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyDbX2wse6sPKvHTJvmjdZbOFYv_DQ0cIkw",
    authDomain: "zinc-c790f.firebaseapp.com",
    projectId: "zinc-c790f",
    storageBucket: "zinc-c790f.firebasestorage.app",
    messagingSenderId: "670347890116",
    appId: "1:670347890116:web:40293006c53b83fd72a891",
    measurementId: "G-2YFRT6T83B"
};

// Initialize Firebase
// Note: We are using the namespaced API version compatible with CDN scripts
let app;
let auth;
let db;
let storage;

try {
    app = firebase.initializeApp(firebaseConfig);

    // Resilient initialization: check if SDKs are loaded before calling functions
    if (typeof firebase.auth === 'function') {
        auth = firebase.auth();
    } else {
        console.warn("Firebase Auth SDK not loaded - auth will be undefined");
    }

    if (typeof firebase.firestore === 'function') {
        db = firebase.firestore();
    } else {
        console.warn("Firebase Firestore SDK not loaded - db will be undefined");
    }

    if (typeof firebase.storage === 'function') {
        storage = firebase.storage();
    } else {
        console.warn("Firebase Storage SDK not loaded - storage will be undefined");
    }

    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization failed:", error);
    console.warn("Please update firebase-config.js with your actual Firebase configuration.");
}

export { app, auth, db, storage };
