# Firebase Console Setup Guide

To ensure the new "Initialize Your Hive" wizard and "Command Center" features work correctly, please verify the following settings in your [Firebase Console](https://console.firebase.google.com/).

## 1. Authentication
*   **Go to:** Build > Authentication > Sign-in method
*   **Action:** Ensure **Google** and/or **Email/Password** providers are enabled.
*   **Why:** Users must be logged in (`auth.currentUser`) to create projects and save drafts.

## 2. Firestore Database
*   **Go to:** Build > Firestore Database
*   **Action:** Create database (if not exists). Start in **Production mode**.
*   **Rules:** Go to the **Rules** tab and paste the following. This ensures users can only read/write their own projects.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Projects collection
    match /projects/{projectId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      
      // Agent instances per project (subcollection)
      match /agents/{agentInstanceId} {
        allow read: if request.auth != null && 
          (get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid ||
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
        
        allow write: if request.auth != null &&
          (get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid ||
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
      }
    }
    
    // Industries collection
    match /industries/{industryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    
    // Master agents library
    match /agents/{agentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    
    // Users collection
    match /users/{uid} {
      allow read: if request.auth != null && 
        (request.auth.uid == uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

> [!WARNING]
> **Admin Access**: To grant admin privileges, manually add `role: "admin"` field to a user document in the Firestore Console. See [ADMIN_SETUP.md](file:///Users/sangjaeseo/Antigravity/ZINC/ADMIN_SETUP.md) for detailed instructions.

## 3. Storage (New!)
*   **Go to:** Build > Storage
*   **Action:** Click **Get started** to enable storage.
*   **Rules:** Go to the **Rules** tab and paste the following. This allows users to upload assets to their own project folders.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow access to 'projects/{projectId}/*' only if the user owns the project
    // Note: Since we can't easily check Firestore from Storage rules without advanced setup,
    // we'll use a simpler rule for now: Authenticated users can read/write.
    // For stricter security later, we can match the path structure.
    
    match /projects/{projectId}/{allPaths=**} {
       allow read, write: if request.auth != null;
    }
  }
}
```

## 4. CORS Configuration (If needed)
If you encounter CORS errors when uploading files from `localhost` or your domain:
1.  You may need to configure CORS for your storage bucket using `gsutil`.
2.  For now, standard Firebase Storage usually works fine with default settings for web apps.

---

**Verification:**
After applying these rules, try the "Add New Project" wizard again.
1.  **Step 1 Next:** Should save a draft to Firestore.
2.  **Step 2 Upload:** Should upload files to Storage.
3.  **Step 3 Launch:** Should finalize the project and show it on the dashboard.
