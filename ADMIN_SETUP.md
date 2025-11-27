# ZYNK Admin Panel Setup Guide

## Quick Start

### 1. Enable Admin Access for Your Account

To access the admin panel, you need to manually set the `role` field in Firestore:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database**
3. Find the `users` collection
4. Locate your user document (search by email)
5. Add a new field:
   - **Field name**: `role`
   - **Type**: string
   - **Value**: `admin`
6. Save the document

### 2. Access Admin Panel

Navigate to: `http://localhost:8000/admin.html` (or your deployed URL + `/admin.html`)

If you're not an admin, you'll be redirected to the Command Center.

---

## Admin Panel Structure

### 6 Main Sections

1. **Overview** (`/admin.html#overview`)
   - Dashboard with user, sales, and agent metrics
   - Currently showing placeholder data

2. **Users** (`/admin.html#users`)
   - User management with tier filtering
   - View user details and payment history (to be implemented)

3. **Agents** (`/admin.html#agents`)
   - Manage AI agents
   - "Add New Agent" button for future AI Agent Design flow

4. **Industry Master** (`/admin.html#industries`) ⭐ **FULLY FUNCTIONAL**
   - Full CRUD operations for industry master data
   - Auto-seeds 17 initial industries on first load
   - Controls what appears in Command Center project creation

5. **Subscription MGT** (`/admin.html#subscriptions`)
   - Manage subscription tiers and pricing
   - Set project/agent limits per tier

6. **Settings** (`/admin.html#settings`)
   - Global application settings
   - Configuration placeholder

---

## Industry Master Usage

### Initial Setup

1. Navigate to **Industry Master** in the admin sidebar
2. On first load, the system automatically creates 17 default industries
3. You should see a confirmation alert: "Industry Master data initialized with 17 default industries"

### Managing Industries

**Add New Industry:**
1. Click "Add Industry" button
2. Fill in the form:
   - **Label (EN)**: English display name (required)
   - **Label (KO)**: Korean display name (optional)
   - **Key**: Auto-generated from English label, but editable (required)
   - **Order**: Sort order in dropdown (10, 20, 30...) (required)
   - **Active**: Show in user-facing dropdown
   - **Allow Custom Input**: Enable text input field (for "Other" option)
3. Click "Save Industry"

**Edit Industry:**
1. Click "Edit" button on any row
2. Modify fields
3. Click "Save Industry"

**Delete Industry:**
1. Click "Delete" button
2. Confirm deletion
3. Note: Deleting the "Other (Custom Input)" option shows an extra warning

**Toggle Active Status:**
1. Use the toggle switch in the "Active" column
2. Inactive industries won't appear in the Command Center dropdown

---

## Command Center Integration

### How It Works

1. When users click "Add New Project" in Command Center
2. The Industry dropdown is populated from Firestore `industries` collection
3. Only `isActive: true` industries are shown
4. Industries are sorted by the `order` field

### Custom Industry Input

When a user selects an industry with `allowCustomInput: true` (like "Other"):
1. A text field appears below the dropdown
2. User can type their custom industry (e.g., "Legal Services", "Agriculture")
3. The project is saved with:
   - `industry`: The industry key (e.g., "other_custom")
   - `industryCustomLabel`: The user's custom text

---

## Firestore Collections

### `industries` Collection

**Document Structure:**
```json
{
  "key": "marketing_agency",
  "labelEn": "Marketing Agency",
  "labelKo": "마케팅 에이전시",
  "order": 10,
  "isActive": true,
  "allowCustomInput": false,
  "createdAt": (timestamp),
  "updatedAt": (timestamp)
}
```

**Security Rules** (add to Firestore Rules):
```javascript
match /industries/{id} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
}
```

### `users` Collection

**Example Document (Admin User):**
```json
{
  "email": "admin@example.com",
  "displayName": "Admin User",
  "role": "admin",  // ← This field grants admin access
  "createdAt": (timestamp)
}
```

**Security Rules** (update existing):
```javascript
match /users/{uid} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == uid;
  // Admin can read all users
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
}
```

---

## Troubleshooting

### "Access denied. Admin privileges required."

**Problem**: Your user doesn't have admin role.

**Solution**: 
1. Check Firestore Console
2. Verify your `users/{uid}` document has `role: "admin"`
3. Log out and log back in

### Industry dropdown shows "Loading industries..." forever

**Problem**: Firestore query failed or no industries exist.

**Solution**:
1. Check browser console for errors
2. Go to Admin Panel → Industry Master
3. The seed script should auto-run
4. Check Firestore Rules allow read access to `industries` collection

### Industries don't appear after seeding

**Problem**: Browser cache or Firestore listener not updating.

**Solution**:
1. Refresh the Command Center page (Cmd/Ctrl + R)
2. Hard refresh (Cmd/Ctrl + Shift + R)
3. Check Firestore Console to verify data was written

---

## Next Steps

1. **Deploy to Production**: Update Cloudflare Pages with new admin files
2. **Configure Firestore Rules**: Apply the security rules above
3. **Test Workflow**: 
   - Set admin role for your account
   - Access admin panel
   - Modify an industry
   - Create a new project and verify dropdown
4. **Implement Remaining Features**: Users, Agents, Subscriptions, Settings pages

---

## File Structure

```
/admin.html                   # Main admin panel layout
/admin.js                     # Routing and auth logic
/admin-overview.html          # Dashboard (placeholder)
/admin-users.html             # User management (placeholder)
/admin-agents.html            # Agent management (placeholder)
/admin-industries.html        # Industry Master (⭐ FULLY FUNCTIONAL)
/admin-industries.js          # Industry CRUD logic
/admin-subscriptions.html     # Subscription MGT (placeholder)
/admin-settings.html          # Settings (placeholder)
/styles.css                   # Contains admin panel styles
```

All admin styles are in the "ADMIN PANEL STYLES" section at the bottom of `styles.css`.
