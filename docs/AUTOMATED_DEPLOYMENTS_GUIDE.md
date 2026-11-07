# Unified Cloud Deployments Guide

All cloud deployments across the entire project (**Vite Frontend on Cloudflare Pages**, **Firestore Security Rules**, and **Google Apps Script**) are now unified into your standard deployment workflow:

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
│ firebase deploy  │             │ clasp push       │             │ wrangler pages   │
│ --only firestore │             │ (apps-script/    │             │ deploy (dist/    │
│ :rules           │             │  Code.js)        │             │  to live site)   │
└────────┬─────────┘             └────────┬─────────┘             └────────┬─────────┘
         │                                │                                │
         ▼                                ▼                                ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│ Firebase Database│             │Google Apps Script│             │ Cloudflare Pages │
│ (skyatuiuc-web)  │             │ (Email Webhook)  │             │ (skyuiuc.org)    │
└──────────────────┘             └──────────────────┘             └──────────────────┘
```

---

## 🛠️ Individual Deployment Commands (If Needed Separately)

You can also deploy any individual component on its own at any time:

| Command | What it Deploys | Target Service |
| :--- | :--- | :--- |
| **`npm run deploy`** | **Everything** (Rules + Apps Script + Web App) | Firebase + Google Apps Script + Cloudflare Pages |
| `npm run deploy:rules` | Firestore Security Rules (`firestore.rules`) | Firebase Firestore (`skyatuiuc-web`) |
| `npm run deploy:apps-script` | Apps Script Code (`apps-script/Code.js`) | Google Apps Script Web App |
| `npm run deploy:pages` | Frontend Build (`dist/`) | Cloudflare Pages (project `skyuiuc`) |

---

## 🔑 One-Time Login (Already Completed)

1. **Firebase**: Authenticated via `npx firebase login` (as `skyatuiuc@gmail.com`).
2. **Clasp**: Authenticated via `npm run clasp:login` (as `skyatuiuc@gmail.com`).
3. **Cloudflare**: Authenticated via `npx wrangler login` (the Cloudflare account that holds the `skyuiuc.org` zone).

Cloudflare issues and renews the site's HTTPS certificate itself; there is no origin certificate to maintain.

All console-side settings (DNS, SSL, redirect rules, Firebase authorized domains, API key restrictions, relay scopes) are in [INFRASTRUCTURE.md](INFRASTRUCTURE.md).

No GitHub Actions tokens or secrets are needed!
