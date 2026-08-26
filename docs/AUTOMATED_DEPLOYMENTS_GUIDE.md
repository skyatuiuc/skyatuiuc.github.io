# Unified Cloud Deployments Guide

All cloud deployments across the entire project (**Vite Frontend on GitHub Pages**, **Firestore Security Rules**, and **Google Apps Script**) are now unified into your standard deployment workflow:

```bash
npm run build && npm run deploy
```

---

## ⚡ The Unified Deploy Flow

Running `npm run deploy` automatically executes all three deployments in sequence:

```
                    ┌──────────────────────────────────────────────┐
                    │      npm run build && npm run deploy         │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                                 │                                 │
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│  Step 1: Rules   │             │ Step 2: Scripts  │             │ Step 3: Website  │
│                  │             │                  │             │                  │
│ firebase deploy  │             │ clasp push       │             │ gh-pages -d dist │
│ --only firestore │             │ (apps-script/    │             │ (dist/ build     │
│ :rules           │             │  Code.js)        │             │  to live site)   │
└────────┬─────────┘             └────────┬─────────┘             └────────┬─────────┘
         │                                │                                │
         ▼                                ▼                                ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│ Firebase Database│             │Google Apps Script│             │   GitHub Pages   │
│ (skyatuiuc-web)  │             │ (Email Webhook)  │             │ (skyuiuc.org)    │
└──────────────────┘             └──────────────────┘             └──────────────────┘
```

---

## 🛠️ Individual Deployment Commands (If Needed Separately)

You can also deploy any individual component on its own at any time:

| Command | What it Deploys | Target Service |
| :--- | :--- | :--- |
| **`npm run deploy`** | **Everything** (Rules + Apps Script + Web App) | Firebase + Google Apps Script + GitHub Pages |
| `npm run deploy:rules` | Firestore Security Rules (`firestore.rules`) | Firebase Firestore (`skyatuiuc-web`) |
| `npm run deploy:apps-script` | Apps Script Code (`apps-script/Code.js`) | Google Apps Script Web App |
| `npm run deploy:pages` | Frontend Build (`dist/`) | GitHub Pages (`gh-pages`) |

---

## 🔑 One-Time Login (Already Completed)

Since both CLI tools use your local Google account:
1. **Firebase**: Authenticated via `npx firebase login` (as `skyatuiuc@gmail.com`).
2. **Clasp**: Authenticated via `npm run clasp:login` (as `skyatuiuc@gmail.com`).

No GitHub Actions tokens or secrets are needed!
