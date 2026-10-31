// End-to-end smoke test against the local Firebase emulators (never production).
//
//   npm run test:e2e                                   # synthetic v1 data
//   SKY_BACKUP_PATH=~/Downloads/backup.json npm run test:e2e   # a real Admin snapshot (stays local)
//
// Seeds v1-shaped (pre-migration) data, then drives the real app in headless Chrome: runs the Admin
// schema migration, opens every Admin/Volunteer tab, and exercises the flows changed in the 2026
// hardening pass, checking Firestore after each write.

import fs from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

const PROJECT_ID = 'demo-skyatuiuc';
const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ADMIN = 'skyatuiuc@gmail.com';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- seed (v1 shape)
const loadSeed = () => {
  const path = process.env.SKY_BACKUP_PATH;
  if (path && fs.existsSync(path)) {
    const backup = JSON.parse(fs.readFileSync(path, 'utf8'));
    const volunteers = backup.collections.authorized_volunteers.map(v => (typeof v === 'string' ? v : v.id || v.email));
    return { retreats: backup.collections.retreat_history, registrations: backup.collections.registrations, volunteers, source: 'backup' };
  }
  const retreat = { id: 'retreat-past', title: 'Past Retreat', startDate: '2026-09-11', endDate: '2026-09-13', location: 'Room 1', groupConfig: { numGroups: 3, groupNames: {} } };
  const statuses = [['Approved', 'Approved'], ['Pending', 'Did Not Reply'], ['Withdrawn', 'Withdrawn'], ['Uncontacted', 'Uncontacted']];
  const registrations = Array.from({ length: 16 }, (_, i) => {
    const email = `person${i}@illinois.edu`;
    const [status, detailed] = statuses[i % 4];
    const reg = {
      id: `${email}_${retreat.id}`, email, retreatId: retreat.id, retreatTitle: retreat.title,
      firstName: `First${i}`, lastName: `Last${i}`, fullName: `First${i} Last${i}`,
      phone: '2175550000', academicRole: i % 3 === 0 ? 'UIUC Faculty / Staff' : 'Undergraduate Student',
      isOver18: '18 or older', completedSkyBefore: 'No', agreeToAll3Days: 'Yes', healthConditions: ['None'],
      otherHealthConditions: '', foodAllergies: '', referralSource: 'Friend',
      status, interviewStatus: detailed, orientationStatus: detailed,
      appliedAt: new Date(Date.UTC(2026, 7, 20 + i)).toISOString(), updatedAt: new Date(Date.UTC(2026, 7, 20 + i)).toISOString()
    };
    if (i % 2 === 0) Object.assign(reg, { orientationNotes: `note ${i}`, interviewNotes: `note ${i}` });
    if (i % 3 === 0 && i % 4 === 0) Object.assign(reg, { isPaid: true, paymentStatus: 'Paid', paidAt: reg.appliedAt });
    if (detailed === 'Approved') Object.assign(reg, { groupId: `group-${(i % 3) + 1}`, assignedGroup: `Group ${(i % 3) + 1}`, attendance: { day1: true }, attendedDaysCount: 1, attendanceStatus: 'In Progress', completed: false });
    if (i === 0) reg['sentEmails.welcome'] = { sent: true, sentAt: reg.appliedAt, sentBy: ADMIN };
    return reg;
  });
  return { retreats: [retreat], registrations, volunteers: [ADMIN, 'person0@illinois.edu', 'vol@illinois.edu'], source: 'synthetic' };
};

const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
await env.clearFirestore();
const seed = loadSeed();
const today = new Date();
const plusDays = (n) => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10);
const upcoming = { id: 'retreat-upcoming', title: 'Upcoming Test Retreat', startDate: plusDays(10), endDate: plusDays(12), location: 'Test Hall', groupConfig: { numGroups: 4, groupNames: {} } };
// General Interest List applicants (v1 shape): one to move, one who already applied to the upcoming retreat
const interestBase = (email, retreatId) => ({
  id: `${email}_${retreatId}`, email, retreatId, firstName: 'Interest', lastName: email.split('@')[0], phone: '2175550100',
  academicRole: 'Undergraduate Student', isOver18: '18 or older', completedSkyBefore: 'No', healthConditions: ['None'],
  otherHealthConditions: '', foodAllergies: '', referralSource: 'Quad Day', status: 'Pending',
  appliedAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z'
});
const INTEREST = 'interest1@illinois.edu';
const DUP = 'dup@illinois.edu';
seed.registrations.push(
  { ...interestBase(INTEREST, 'general'), orientationNotes: 'wants the November retreat', claimedBy: ADMIN, sentEmails: { welcome: { sent: true, sentAt: '2026-09-22T00:00:00Z', sentBy: ADMIN } } },
  interestBase(DUP, 'general'),
  { ...interestBase(DUP, upcoming.id), status: 'Uncontacted' }
);
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const r of [...seed.retreats, upcoming]) {
    const { id, ...data } = r;
    await setDoc(doc(db, 'retreat_history', id), data);
  }
  for (const v of seed.volunteers) await setDoc(doc(db, 'authorized_volunteers', v), { email: v, addedAt: '2026-08-01T00:00:00Z' });
  for (const r of seed.registrations) {
    const { id, ...data } = r;
    await setDoc(doc(db, 'registrations', id), { id, ...data });
  }
});
const pastRetreat = seed.retreats[0];
console.log(`Seeded ${seed.registrations.length} v1 registrations (${seed.source}), retreat ${pastRetreat.id}`);

const readAll = async (name) => {
  let docs = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDocs(collection(ctx.firestore(), name));
    docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
  return docs;
};
const readOne = async (name, id) => {
  let data = null;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), name, id));
    data = snap.exists() ? snap.data() : null;
  });
  return data;
};

// ---------------------------------------------------------------- app + browser
Object.assign(process.env, {
  VITE_USE_FIREBASE_EMULATORS: 'true',
  VITE_FIREBASE_API_KEY: 'demo-api-key',
  VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
  VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
  VITE_FIREBASE_APP_ID: 'demo-app'
});
const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' });
await server.listen();
// App modules (extensionless imports) are loaded through Vite, exactly as the browser sees them
const { migrateRegistration } = await server.ssrLoadModule('/src/models/migrateRegistration.js');

// Back/forward cache would keep earlier test pages (and their Firestore channels to the HTTP/1.1
// emulator) alive until Chrome's 6-connections-per-host limit stalls new pages. Production Firestore
// is HTTP/2, so this is an emulator-only artefact.
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-back-forward-cache'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
// The production CSP (index.html) rightly blocks connections to the local emulators
await page.setBypassCSP(true);
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(err.message));
const consoleTail = [];
page.on('console', (msg) => { consoleTail.push(`${msg.type()}: ${msg.text().slice(0, 200)}`); if (consoleTail.length > 12) consoleTail.shift(); });
page.on('console', (msg) => {
  if (msg.type() === 'error' && !/favicon|Failed to load resource|ERR_FAILED|cleardot/.test(msg.text())) pageErrors.push(msg.text());
});
// Native dialogs are no longer used; fail loudly if one appears
page.on('dialog', (d) => { pageErrors.push(`Unexpected native dialog: ${d.message()}`); d.dismiss(); });
await page.setRequestInterception(true);
page.on('request', (req) => {
  // Never let the local app reach the production Apps Script or analytics
  if (/script\.google\.com|googleusercontent\.com\/macros/.test(req.url())) req.abort();
  else req.continue();
});

const errorsSince = (n) => pageErrors.slice(n);
// Firestore keeps a long-lived channel open, so "network idle" never happens; wait on DOM instead
const _goto = page.goto.bind(page);
page.goto = async (url, opts) => {
  const res = await _goto(url, opts);
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, { timeout: 15000 });
  await sleep(600);
  return res;
};
const bodyText = () => page.evaluate(() => document.body.innerText);
const waitForText = async (text, timeout = 10000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
};
const clickByText = async (selector, text) => {
  const ok = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find(e => e.innerText.trim().includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, selector, text);
  if (!ok) throw new Error(`No ${selector} containing "${text}"`);
};
// In-app confirm dialog (useConfirm): click its confirm button
const confirmDialog = async () => {
  await page.waitForSelector('[data-confirm="ok"]', { timeout: 5000 });
  await page.click('[data-confirm="ok"]');
};
const signInAs = async (email) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__skyEmulatorSignIn === 'function');
  await page.evaluate((e) => window.__skyEmulatorSignIn(e), email);
  await sleep(800);
};
const signOut = async () => {
  await page.evaluate(() => indexedDB.deleteDatabase('firebaseLocalStorageDb'));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
};
const step = async (name, fn) => {
  const before = pageErrors.length;
  try {
    await fn();
    const errs = errorsSince(before);
    check(`${name} (no page errors)`, errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (err) {
    const where = await page.evaluate(() => `${location.pathname}${location.search} retreat=${document.querySelector("#active-retreat-select")?.value || "-"} :: ${(document.body.innerText.match(/Showing[^\n]*|of \d+ applicant[^\n]*|\d+ applications|Firestore denied[^\n]*|Live roster[^\n]*|Loading…/g) || []).join(" | ")}`).catch(() => '?');
    check(name, false, `${err.message.split('\n')[0]} [at ${where}]`);
    if (process.env.E2E_DEBUG) console.log(consoleTail.join('\n'));
  }
};

try {
  await step('Home page renders', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    check('Home has content', (await bodyText()).length > 200);
  });

  // ------------------------------------------------ Admin + migration
  await signInAs(ADMIN);
  await step('Admin page loads', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await waitForText('Authorize New Volunteer');
  });

  await step('Admin migration: dry run + apply', async () => {
    await clickByText('button', 'Data, Usage & Backups');
    await waitForText('Data Maintenance');
    await clickByText('button', 'Dry run');
    await waitForText('need migration');
    await clickByText('button', 'Apply migration');
    await confirmDialog();
    await waitForText('Migrated', 20000);
  });

  const migrated = await readAll('registrations');
  const notesDocs = await readAll('registration_private');
  const legacyLeft = migrated.filter(({ id, ...data }) => migrateRegistration(data).changed);
  check('every registration is on schema v2 after the UI migration', legacyLeft.length === 0, `${legacyLeft.length} left`);
  check('no literal sentEmails.* fields remain', migrated.every(r => Object.keys(r).every(k => !k.startsWith('sentEmails.'))));
  const expectedNotes = seed.registrations.filter(r => (r.orientationNotes || r.interviewNotes || '').trim()).length;
  check('volunteer notes moved to registration_private', notesDocs.length === expectedNotes, `${notesDocs.length}/${expectedNotes}`);
  const sampleWithDnr = seed.registrations.find(r => r.orientationStatus === 'Did Not Reply');
  if (sampleWithDnr) {
    check('detailed status preserved ("Did Not Reply")', migrated.find(r => r.id === sampleWithDnr.id)?.status === 'Did Not Reply');
  }
  const schema = await readOne('system_settings', 'schema');
  check('schema version stamped', schema?.registrationsVersion === 3);
  const listedVolunteerRegs = migrated.filter(r => seed.volunteers.includes(r.email));
  check('v3: listed volunteers\' registrations carry the Volunteer status (unless withdrawn)',
    listedVolunteerRegs.length > 0 && listedVolunteerRegs.every(r => r.status === 'Volunteer' || r.status === 'Withdrawn'),
    listedVolunteerRegs.map(r => r.status).join(','));
  check('v3: nobody else became a Volunteer', migrated.filter(r => r.status === 'Volunteer').every(r => seed.volunteers.includes(r.email)));

  await step('Re-running the dry run after v3 finds nothing to do', async () => {
    await clickByText('button', 'Dry run');
    await sleep(1500);
    check('dry run shows 0 to migrate', (await bodyText()).includes('scanned · 0 need migration'));
  });

  // Make sure the past retreat is the active one in the selector
  await page.evaluate((id) => localStorage.setItem('sky_active_retreat_id', id), pastRetreat.id);

  for (const tab of ['Volunteer Access', 'Retreat Management', 'Group Assignments', 'Auto Email Dispatch', 'Flyer Templates', 'Nametag Templates', 'Campaign Scan Analytics', 'Data, Usage & Backups']) {
    await step(`Admin tab "${tab}" renders`, async () => {
      await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
      await clickByText('button', tab);
      await sleep(900);
    });
  }

  const retreatRegs = migrated.filter(r => r.retreatId === pastRetreat.id);
  await step('Email Dispatch lists the active retreat', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await clickByText('button', 'Auto Email Dispatch');
    await waitForText(`of ${retreatRegs.length} applicant records`);
  });

  await step('Group Assignments: auto-arrange writes groupId only', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await clickByText('button', 'Group Assignments');
    await sleep(800);
    await clickByText('button', 'Auto-Arrange');
    await sleep(1500);
    const after = await readAll('registrations');
    const grouped = after.filter(r => r.retreatId === pastRetreat.id && r.groupId);
    check('auto-arrange assigned groups', grouped.length > 0, `${grouped.length} grouped`);
    check('no assignedGroup written', after.every(r => !('assignedGroup' in r)));
  });

  // ------------------------------------------------ Volunteer portal (as admin)
  await step('Volunteer orientation roster shows only the active retreat', async () => {
    await page.goto(`${BASE}/volunteer`, { waitUntil: 'domcontentloaded' });
    await waitForText(`Showing ${retreatRegs.length} of ${retreatRegs.length}`);
  });

  await step('Status chip filter matches badge counts', async () => {
    const approved = retreatRegs.filter(r => r.status === 'Approved').length;
    await clickByText('button', 'Approved (');
    await waitForText(`Showing ${approved} of ${retreatRegs.length}`);
    await clickByText('button', 'Clear');
  });

  await step('Dossier: notes typed then closed immediately are still saved', async () => {
    const target = retreatRegs.find(r => r.status !== 'Withdrawn') || retreatRegs[0];
    await page.goto(`${BASE}/volunteer`, { waitUntil: 'domcontentloaded' });
    await page.type('input[aria-label="Search applicants"]', target.email);
    await sleep(300);
    await clickByText('button', 'Orientation Dossier');
    await page.waitForSelector('#dossier-notes');
    await page.$eval('#dossier-notes', el => el.select());
    await page.type('#dossier-notes', 'e2e quick note');
    await page.keyboard.press('Escape'); // close before the 600 ms debounce
    await sleep(1500);
    const priv = await readOne('registration_private', target.id);
    check('notes flushed on close', priv?.notes === 'e2e quick note', JSON.stringify(priv?.notes));

    await clickByText('button', 'Orientation Dossier');
    await page.waitForSelector('#dossier-status');
    await page.select('#dossier-status', 'Did Not Reply');
    await sleep(1000);
    const reg = await readOne('registrations', target.id);
    check('status change writes one canonical field', reg?.status === 'Did Not Reply' && !('orientationStatus' in reg) && !('interviewStatus' in reg));
    await clickByText('button', 'Log Contact Today');
    await sleep(800);
    const reg2 = await readOne('registrations', target.id);
    const chicagoToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
    check('Log Contact Today uses the Chicago date', reg2?.lastContactedDate === chicagoToday, reg2?.lastContactedDate);
    await page.keyboard.press('Escape');
  });

  await step('Attendance: toggling one day writes only that day', async () => {
    await page.goto(`${BASE}/volunteer`, { waitUntil: 'domcontentloaded' });
    await clickByText('button', 'Retreat Attendance');
    await sleep(800);
    await clickByText('button', 'Everyone (');
    await sleep(500);
    const before = await readAll('registrations');
    const clicked = await page.evaluate(() => {
      const toggle = document.querySelector('button[aria-pressed][aria-label$="attendance"]');
      if (!toggle) return false;
      toggle.click();
      return true;
    });
    await sleep(1200);
    const after = await readAll('registrations');
    const changed = after.filter(a => JSON.stringify(a.attendance || {}) !== JSON.stringify(before.find(b => b.id === a.id)?.attendance || {}));
    check('attendance toggle clicked', clicked);
    check('exactly one registration changed', changed.length === 1, `${changed.length} changed`);
    if (changed[0]) {
      const prev = before.find(b => b.id === changed[0].id)?.attendance || {};
      const keysChanged = ['day1', 'day2', 'day3'].filter(d => Boolean(prev[d]) !== Boolean(changed[0].attendance?.[d]));
      check('only one day flag changed', keysChanged.length === 1, keysChanged.join(','));
    }
  });

  await step('Flyer studio tab renders', async () => {
    await page.goto(`${BASE}/volunteer`, { waitUntil: 'domcontentloaded' });
    await clickByText('button', 'Flyer & QR Studio');
    await sleep(800);
  });

  await step('General Interest List: move to the next retreat', async () => {
    const generalBefore = (await readAll('registrations')).filter(r => r.retreatId === 'general');
    await page.evaluate(() => localStorage.setItem('sky_active_retreat_id', 'general'));
    await page.goto(`${BASE}/volunteer`, { waitUntil: 'domcontentloaded' });
    await waitForText('Move interest list to');
    const target = await page.$eval('#interest-move-target', el => el.value);
    check('move target defaults to the next retreat', target === upcoming.id, target);
    await clickByText('button', `Move ${generalBefore.length} shown`);
    await confirmDialog();
    await waitForText('Moved ', 20000);
    check('duplicate applicant reported as skipped', (await bodyText()).includes('Skipped 1 already registered'));

    const after = await readAll('registrations');
    const movedDoc = after.find(r => r.id === `${INTEREST}_${upcoming.id}`);
    check('moved applicant now in the target retreat', movedDoc?.retreatId === upcoming.id && movedDoc?.status === 'Pending' && movedDoc?.claimedBy === ADMIN, JSON.stringify(movedDoc && { retreatId: movedDoc.retreatId, status: movedDoc.status }));
    check('moved applicant keeps no retreat-scoped fields', movedDoc && !('sentEmails' in movedDoc) && !('groupId' in movedDoc));
    check('general-list doc removed', !after.some(r => r.id === `${INTEREST}_general`));
    const movedNotes = await readOne('registration_private', `${INTEREST}_${upcoming.id}`);
    check('notes moved with the applicant', movedNotes?.notes === 'wants the November retreat' && movedNotes?.retreatId === upcoming.id, JSON.stringify(movedNotes));
    check('old notes doc removed', (await readOne('registration_private', `${INTEREST}_general`)) === null);
    check('skipped applicant left on the general list', after.some(r => r.id === `${DUP}_general`));
    check('general list now holds only the skipped applicant', after.filter(r => r.retreatId === 'general').length === 1);
    await page.evaluate((id) => localStorage.setItem('sky_active_retreat_id', id), pastRetreat.id);
  });

  await step('URL state: deep link to a tab + retreat, tab clicks update the URL', async () => {
    await page.goto(`${BASE}/admin/groups?retreat=${pastRetreat.id}`, { waitUntil: 'domcontentloaded' });
    await waitForText('Print Nametag Sheets');
    check('deep link opens the Groups tab', true);
    check('?retreat= selects that retreat', (await page.$eval('#active-retreat-select', el => el.value)) === pastRetreat.id);
    await clickByText('button', 'Auto Email Dispatch');
    await sleep(500);
    check('tab click updates the path and keeps ?retreat=', page.url().includes('/admin/emails?retreat=' + encodeURIComponent(pastRetreat.id)), page.url());
    await page.goto(`${BASE}/admin/not-a-tab`, { waitUntil: 'domcontentloaded' });
    await waitForText('Authorize New Volunteer');
    check('unknown tab falls back to the default tab', true);
    check('retreat added to the URL from the stored selection', page.url().includes('retreat='), page.url());
  });

  // ------------------------------------------------ non-admin volunteer
  const volunteer = seed.volunteers.find(v => v !== ADMIN);
  await signOut();
  await signInAs(volunteer);
  await step('Non-admin volunteer can load the roster', async () => {
    await page.goto(`${BASE}/volunteer`, { waitUntil: 'domcontentloaded' });
    await waitForText(`Showing ${retreatRegs.length} of`);
  });
  await step('Non-admin volunteer is kept out of /admin', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    check('redirected away from admin', !(await bodyText()).includes('Authorize New Volunteer'));
  });

  // ------------------------------------------------ applicants
  const returning = migrated.find(r => r.retreatId === pastRetreat.id && !seed.volunteers.includes(r.email));
  await signOut();
  await signInAs(returning.email);
  await step('Returning applicant is not locked out of a new retreat', async () => {
    await page.goto(`${BASE}/register/${upcoming.id}`, { waitUntil: 'domcontentloaded' });
    await sleep(1200);
    check('form is editable', !(await bodyText()).includes('Application Submitted (View Only)'));
  });
  await step('My Retreats lists the past application (applicant email query allowed)', async () => {
    await page.goto(`${BASE}/my-retreats`, { waitUntil: 'domcontentloaded' });
    await waitForText(pastRetreat.title);
  });

  const newbie = 'newbie@illinois.edu';
  await signOut();
  await signInAs(newbie);
  await step('New applicant submits a v2 application', async () => {
    await page.goto(`${BASE}/register/${upcoming.id}`, { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    await page.evaluate(() => {
      const setVal = (el, value) => {
        const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      };
      const byLabel = (prefix) => {
        const label = [...document.querySelectorAll('label')].find(l => l.innerText.trim().toUpperCase().startsWith(prefix));
        return label?.parentElement.querySelector('input, select');
      };
      setVal(byLabel('FIRST NAME'), 'New');
      setVal(byLabel('LAST NAME'), 'Bie');
      setVal(document.querySelector('input[placeholder="(217) 555-0199"]'), '2175550199');
      const selects = [...document.querySelectorAll('form select')];
      const pick = (sel, value) => setVal(sel, value);
      const role = selects.find(s => [...s.options].some(o => o.value === 'Undergraduate Student'));
      pick(role, 'Undergraduate Student');
      pick(selects.find(s => [...s.options].some(o => o.value === '18 or older')), '18 or older');
      pick(selects.find(s => [...s.options].some(o => o.value === 'No' && o.text.includes('first SKY'))), 'No');
      pick(selects.find(s => [...s.options].some(o => o.value === 'Yes') && s !== role && ![...s.options].some(o => o.text.includes('graduate'))), 'Yes');
      const none = [...document.querySelectorAll('label')].find(l => l.innerText.trim() === 'None');
      none.querySelector('input').click();
      setVal(document.querySelector('input[placeholder^="Quad Day"]'), 'e2e test');
    });
    await sleep(300);
    await page.click('button[type="submit"]');
    await sleep(2500);
    const created = await readOne('registrations', `${newbie}_${upcoming.id}`);
    check('application created', Boolean(created), (await bodyText()).match(/Please[^\n]*/)?.[0] || '');
    if (created) {
      const keys = Object.keys(created);
      check('application uses only v2 keys', keys.every(k => !['fullName', 'orientationStatus', 'interviewStatus', 'retreatTitle', 'agreeToAll3Days', 'id'].includes(k)), keys.join(','));
    }
  });
} finally {
  await browser.close();
  await server.close();
  await env.cleanup();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
