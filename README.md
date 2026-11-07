# SKY at UIUC website

Source for [skyuiuc.org](https://skyuiuc.org): the public site, retreat registration, and the volunteer
and admin portals (rosters, groups, attendance, nametags, email dispatch, campaign analytics).

- **Frontend:** React 18 + Vite, hosted on Cloudflare Pages.
- **Data and sign-in:** Firebase (Firestore + Google sign-in), project `skyatuiuc-web`, Spark plan.
- **Email and campaign tracking:** a Google Apps Script relay in `apps-script/`.

## Working on it

```bash
npm install
cp .env.example .env    # then fill in the Firebase web config
npm run dev             # local dev server
npm test                # unit tests
npm run test:rules      # Firestore rules tests (emulator)
npm run test:e2e        # end-to-end smoke suite (emulators + local Chrome)
```

Work happens on the `dev` branch. Release branches are managed by the club owner.

## Deploying and cloud settings

- [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md): every Cloudflare, Firebase, Google Cloud, Apps Script and GitHub setting the site depends on.
- [docs/AUTOMATED_DEPLOYMENTS_GUIDE.md](docs/AUTOMATED_DEPLOYMENTS_GUIDE.md): the deploy commands.
- [docs/RESEARCH_REPOSITORY_GUIDE.md](docs/RESEARCH_REPOSITORY_GUIDE.md): how to add studies to the research page.
