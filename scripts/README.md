# Phase 1 Setup Guide

## Quick Start

### Step 1: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database** → **Rules** tab
3. Copy the rules from [FIREBASE_SETUP.md](../FIREBASE_SETUP.md)
4. Click **Publish**

### Step 2: Run Migration Script

This adds new fields to existing projects.

**In Browser Console:**
1. Open your ZYNK app (localhost:8000 or deployed URL)
2. Login as any user
3. Open browser console (F12)
4. Copy and paste the contents of `migrate-projects-v2.js`
5. Press Enter
6. Wait for "✨ Successfully migrated X projects!"

**What it does:**
- Adds `status: "Normal"` to all projects
- Adds `stepProgress` based on `isDraft` status
- Initializes all KPI fields to 0
- Adds `totalAgents: 0`

### Step 3: Seed Master Agents

This creates the initial agent library.

**In Browser Console:**
1. Make sure you're logged in as **admin** user
2. Open browser console (F12)
3. Copy and paste the contents of `seed-master-agents.js`
4. Press Enter
5. Confirm the prompt
6. Wait for "✨ Successfully seeded 8 master agents!"

**Agents Created:**
1. Instagram Content Agent
2. Twitter/X Engagement Agent
3. LinkedIn Professional Agent
4. Crypto Market Analyst
5. Trend Research Agent
6. Content Writer Agent
7. Video Script Agent (developing)
8. Community Manager Agent (developing)

---

## Verification

### Check Migration Success

**Firestore Console:**
1. Go to Firestore Database
2. Open any `projects/{id}` document
3. Verify these fields exist:
   - `status` = "Normal"
   - `stepProgress` = 3 (or 1/2 for drafts)
   - `totalAgents` = 0
   - `avgFollowerGrowth30d` = 0
   - `avgEngagementRate` = 0
   - `totalContentCreated` = 0
   - `totalContentApproved` = 0
   - `avgApprovalRate` = 0
   - `kpiLastUpdated` = (timestamp)

### Check Agents Seeded

**Firestore Console:**
1. Go to Firestore Database
2. Check `agents` collection exists
3. Should have 8 documents
4. Each should have:
   - `name`
   - `description`
   - `category`
   - `status` ("active" or "developing")
   - `totalInstances` = 0
   - `createdAt`
   - `updatedAt`

---

## Troubleshooting

### "Firestore 'db' not found"

**Problem**: Firebase not initialized.

**Solution**: 
- Make sure you're on the ZYNK app page
- Check browser console for Firebase errors
- Verify `firebase-config.js` is loaded

### "Permission denied" during migration

**Problem**: Firestore rules not updated.

**Solution**:
1. Update rules in Firebase Console (Step 1 above)
2. Wait 1 minute for rules to propagate
3. Try again

### "Permission denied" during agent seeding

**Problem**: Not logged in as admin.

**Solution**:
1. Check Firestore Console
2. Find `users/{your-uid}` document
3. Verify `role: "admin"` field exists
4. Logout and login again

---

## Next Steps

After completing Phase 1:

1. ✅ Database structure updated
2. ✅ Master agents seeded
3. ✅ Security rules applied

**Ready for Phase 2**: Draft Resume Feature

See `../ADMIN_SETUP.md` for admin panel usage.
