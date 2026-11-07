# Infrastructure and Cloud Settings

Where skyuiuc.org runs, how each service is configured, and what has to stay in sync between them.
Settings that live only in a web console (Cloudflare, Firebase, Google Cloud, Apps Script, GitHub) are
recorded here, because nothing in the code would show them. Update this file whenever one changes.

All accounts belong to the club Google account **skyatuiuc@gmail.com**. Secrets (the `.env` values,
CLI login tokens) are never committed; the values below are identifiers, not credentials.

## Overview

```
Visitor ──HTTPS──▶ Cloudflare (DNS, TLS, redirects)
                     └─▶ Cloudflare Pages project "skyuiuc"  (static React build from dist/)
Browser app ──▶ Firebase Auth (Google sign-in) + Firestore      (project skyatuiuc-web, Spark plan)
Browser app ──▶ Google Apps Script relay ("Relay & Campaign Engine")
                  ├─ sends email from skyatuiuc@gmail.com (volunteers only, ID token verified)
                  └─ records campaign scans/conversions in a Google Sheet
```

## Deploying

| Command | What it deploys | Where |
| :--- | :--- | :--- |
| `npm run deploy:all` | Build, then everything below | |
| `npm run deploy:rules` | `firestore.rules` | Firebase project `skyatuiuc-web` |
| `npm run deploy:apps-script` | `apps-script/` (creates a version, repoints every live deployment) | Apps Script |
| `npm run deploy:pages` | `dist/` (run `npm run build` first) | Cloudflare Pages project `skyuiuc` |

One-time CLI logins on the deploying machine, all as skyatuiuc@gmail.com:
`npx firebase login`, `npm run clasp:login`, `npx wrangler login` (check with `npx wrangler whoami`).
More detail: [AUTOMATED_DEPLOYMENTS_GUIDE.md](AUTOMATED_DEPLOYMENTS_GUIDE.md).

## Cloudflare

**Account:** "Skyatuiuc@gmail.com's Account", ID `0c437e7b20645e7ab66e472369c3e783`. The deploy
script pins this ID, so a login with access to other accounts cannot deploy the site elsewhere.

**Zone `skyuiuc.org`** (nameservers `huxley.ns.cloudflare.com`, `journey.ns.cloudflare.com`)

| Setting | Value | Notes |
| :--- | :--- | :--- |
| DNS `skyuiuc.org` | CNAME → `skyuiuc.pages.dev`, Proxied | Created by the Pages custom domain; don't edit by hand |
| DNS `www` | CNAME → `skyuiuc.pages.dev`, Proxied | Same |
| Other DNS records | none | No MX or TXT records: the club uses the Gmail address, not domain email |
| SSL/TLS encryption mode | Full (strict) | |
| Edge Certificates › Always Use HTTPS | On | `http://` redirects to `https://` |
| Edge certificates | Issued and renewed automatically by Cloudflare | Nothing to renew by hand |
| Rules › Redirect Rules | "Redirect from WWW to root": `www.skyuiuc.org/*` → `https://skyuiuc.org/…`, 301, query string preserved | |

**Pages project `skyuiuc`** (Workers & Pages › skyuiuc)

- **Deployment method:** direct upload from `npm run deploy:pages` (`scripts/deploy-pages.sh`, wrangler pinned in `package.json`). There is no Git integration, so nothing deploys on push.
- **Production branch:** `main`. Every upload goes to production.
- **Custom domains:** `skyuiuc.org` and `www.skyuiuc.org`.
- **Fixed project address:** `skyuiuc.pages.dev`.
- **Per-upload addresses:** each upload also gets one like `https://<hash>.skyuiuc.pages.dev`. Sign-in does not work on those, because they are not Firebase authorized domains.
- **Deep links:** the upload contains no `404.html`, so Pages serves `index.html` for unknown paths (`/admin/settings`, campaign links like `/demo`) with status 200.
- **Rollback:** Workers & Pages › skyuiuc › Deployments, then **Rollback** on an earlier deployment.

## Firebase (project `skyatuiuc-web`, Spark plan)

- **Plan:** Spark (free). Cloud Storage and Cloud Functions are not available. Template images are stored as Firestore chunks, and `storage.rules` / `deploy:storage` are unused.
- **Authentication:**
  - Sign-in method: **Google only**.
  - The rules require `email_verified`.
  - The super admin is `skyatuiuc@gmail.com` (`ADMIN_EMAIL` in `src/context/AuthContext.jsx`).
  - Volunteers are the documents in `authorized_volunteers` (Admin › Volunteer Access).
- **Authentication › Settings › Authorized domains:** `localhost`, `skyatuiuc-web.firebaseapp.com`, `skyatuiuc-web.web.app`, `skyuiuc.org`, `www.skyuiuc.org`.
  - A new hosting address needs adding here, or sign-in fails with `auth/unauthorized-domain`.
  - Remove temporary test addresses when done. A leftover address someone else could claim (for example a deleted `*.pages.dev` name) is a phishing risk.
- **Firestore:**
  - Rules live in `firestore.rules` and are tested by `npm run test:rules`.
  - Registrations use schema v3 (`src/models/applicant.js`). Admin › Data runs a read-only health check.
  - Backups are taken with Admin › Data › Full System Snapshot.
- **Web config:** the `VITE_FIREBASE_*` values in `.env` (see `.env.example`). The auth domain is `skyatuiuc-web.firebaseapp.com`, which hosts the Google sign-in popup.

## Google Cloud (same project, `skyatuiuc-web`)

**APIs & Services › Credentials › Browser key (auto created by Firebase).** This is the key in `VITE_FIREBASE_API_KEY`.

- **Application restrictions:** Websites.
- **Allowed referrers:** the list must include `https://skyuiuc.org/*` and `https://skyatuiuc-web.firebaseapp.com/*` (used by the sign-in popup). Add `http://localhost:5173/*` only if you develop against production; the tests use emulators and don't need it. `www` redirects to the root domain, so it doesn't need an entry.
- **When you add a hosting address:** add it here as well as in Firebase's authorized domains. Otherwise sign-in fails with `auth/requests-from-referer-…-are-blocked`.
- **Changes take a few minutes** to apply.

## Google Apps Script relay ("Relay & Campaign Engine")

- **Code:** `apps-script/` (`Code.js`, manifest `appsscript.json`), pushed with clasp (`.clasp.json`). The version string is in `doGet` and at the top of `Code.js`.
- **Web app:** executes as the owner (skyatuiuc@gmail.com), and anyone may call it. Callers are authenticated inside the script: it presents the caller's Firebase ID token to Firestore, which verifies it.
- **Deployments:** exactly **one** live deployment, plus `@HEAD`.
  - Its URL is built into the site in `src/services/relayUrl.js`. There is no admin setting for it.
  - `npm run deploy:apps-script` repoints every non-HEAD deployment to the new version.
  - Deployment IDs other than the one in `relayUrl.js` must not be committed.
- **OAuth scopes** (manifest): `script.external_request`, `script.send_mail`, `spreadsheets`, `drive`.
  - Because the script runs as the owner, **any scope change needs the owner to run `authorizeRelay` once in the Apps Script editor** and approve the consent screen.
  - Until then, every volunteer call fails as `Unauthorized (verification_request_failed)`.
- **Script properties:**

  | Property | Purpose |
  | :--- | :--- |
  | `SPREADSHEET_ID` | Campaign analytics Sheet (created automatically if missing) |
  | `EMAIL_DAILY_LIMIT` | Optional; default 100 |
  | `email_send_log` | Internal record of recent sends, used for the 24-hour quota |
  | `AUTHORIZED_VOLUNTEERS` | Optional comma-separated allowlist on top of Firestore |

- **Email quota:** the consumer Gmail account allows about 100 recipients per rolling 24 hours. The dispatch screen shows the remaining count and stops batches at the limit.
- **Health check:** Admin › Settings › **Check relay** shows the live version.

## GitHub (`skyatuiuc/skyatuiuc.github.io`)

- `dev`: day-to-day work.
- `release/…`: frozen releases, managed by the owner.
- `main`: the initial commit.
- `gh-pages`: the old GitHub Pages output. It is kept only as a fallback and can be deleted once Cloudflare Pages has run without problems for a while.
- GitHub Pages no longer hosts the site. It was retired on 2026-11-07: custom domain removed, site unpublished.

## History worth knowing

- **2026-11-07, site down with Cloudflare error 526:**
  - GitHub Pages' Let's Encrypt certificate for skyuiuc.org expired, because renewal fails behind Cloudflare's proxy.
  - Cloudflare's Full (strict) mode then refused the origin.
  - Hosting moved to Cloudflare Pages, which manages the certificate itself.
- **2026-11-01, relay authorization:**
  - The relay's `script.external_request` scope had never been granted, so token verification (email, analytics) failed until `authorizeRelay` was run.
  - Email now uses `MailApp` under the narrower `script.send_mail` scope.
  - The relay was consolidated to one deployment, after a second deployment had silently kept serving old code.
