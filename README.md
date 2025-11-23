# ZINC Landing Page

This repository contains the **ZINC** AI‑powered social media automation landing page.

## Features
- Multi‑language support (English / Korean) with a language toggle.
- Progressive Web App (PWA) setup – manifest, service worker, app icons.
- Firebase authentication (Google Sign‑In) and Firestore integration.
- Responsive, premium UI with hover effects and animations.

## Deploy to Cloudflare Pages
1. **Push the repository** to GitHub (or any Git provider).
2. In the Cloudflare dashboard, go to **Pages → Create a Project** and connect the repository.
3. **Build settings**:
   - **Framework preset**: *None* (static site).
   - **Build command**: `npm install && npm run build` *(if you add a build step later; otherwise leave empty)*.
   - **Build output directory**: `./` (root of the repo).
4. **Environment variables** (optional, for Firebase):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
   > Add the values from `firebase-config.js`.
5. Click **Save and Deploy**. Cloudflare will build (if needed) and publish the site at a generated URL.

## Local Development
```bash
# Install dependencies (if any)
npm install
# Start a local server (required for service workers & Firebase)
python3 -m http.server 8000   # or `npx serve .`
```
Open `http://localhost:8000` in your browser.

## Updating the Site
- Commit changes to the `main` (or your chosen) branch.
- Cloudflare Pages automatically redeploys on each push.

---
*For any questions, feel free to open an issue or contact the repository owner.*
