// Runs apps-script/Code.js inside a sandbox with mocked Apps Script globals.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const source = fs.readFileSync(new URL('../apps-script/Code.js', import.meta.url), 'utf8');

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const makeToken = (claims) => `${b64url({ alg: 'RS256' })}.${b64url(claims)}.signature`;
const validClaims = (email, extra = {}) => ({
  aud: 'skyatuiuc-web',
  iss: 'https://securetoken.google.com/skyatuiuc-web',
  exp: Math.floor(Date.now() / 1000) + 3000,
  email,
  email_verified: true,
  ...extra
});

function loadScript({ firestoreCodeFor }) {
  const cacheStore = new Map();
  const calls = { fetch: [], sent: [] };
  const ctx = {
    Utilities: {
      base64DecodeWebSafe: (s) => [...Buffer.from(s, 'base64url')],
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url'),
      newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes).toString('utf8') }),
      computeDigest: (_alg, str) => [...crypto.createHash('sha256').update(str).digest()],
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      formatDate: (d) => d.toISOString().slice(0, 10)
    },
    CacheService: { getScriptCache: () => ({ get: (k) => cacheStore.get(k) ?? null, put: (k, v) => cacheStore.set(k, v) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    UrlFetchApp: {
      fetch: (url, opts) => {
        calls.fetch.push({ url, opts });
        const token = opts.headers.Authorization.replace('Bearer ', '');
        return { getResponseCode: () => firestoreCodeFor(url, token) };
      }
    },
    GmailApp: { sendEmail: (...args) => calls.sent.push(args) },
    Logger: { log: () => {} },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } })
    }
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  ctx.handleGetAnalytics = () => ctx.createJsonResponse({ status: 'success', dailyMetrics: [] });
  return { ctx, calls, cacheStore };
}

const post = (ctx, body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text);
const emailBody = (idToken) => ({ action: 'send_email', idToken, to: 'x@y.com', subject: 's', htmlBody: '<p>hi</p>' });

describe('Apps Script relay authentication', () => {
  let env;
  beforeEach(() => {
    // Firestore accepts only tokens whose signature segment is "signature" (stand-in for a Google-signed token)
    env = loadScript({
      firestoreCodeFor: (url, token) => {
        if (!token.endsWith('.signature')) return 401;
        return url.endsWith('/authorized_volunteers/vol%40illinois.edu') ? 200 : 404;
      }
    });
  });

  it('rejects a forged super-admin token (Firestore says 401) and sends nothing', () => {
    const forged = makeToken(validClaims('skyatuiuc@gmail.com')).replace('.signature', '.forged');
    const res = post(env.ctx, emailBody(forged));
    expect(res.status).toBe('error');
    expect(env.calls.sent).toHaveLength(0);
  });

  it('rejects requests with no token', () => {
    expect(post(env.ctx, emailBody('')).status).toBe('error');
    expect(env.calls.sent).toHaveLength(0);
  });

  it('accepts a genuine super-admin token even though no volunteer doc exists (404)', () => {
    const res = post(env.ctx, emailBody(makeToken(validClaims('skyatuiuc@gmail.com'))));
    expect(res.status).toBe('success');
    expect(res.dispatchedBy).toBe('skyatuiuc@gmail.com');
    expect(env.calls.sent).toHaveLength(1);
  });

  it('accepts a genuine listed volunteer and reports the verified sender', () => {
    const res = post(env.ctx, emailBody(makeToken(validClaims('vol@illinois.edu'))));
    expect(res.status).toBe('success');
    expect(res.dispatchedBy).toBe('vol@illinois.edu');
  });

  it('rejects a genuine but unlisted user', () => {
    expect(post(env.ctx, emailBody(makeToken(validClaims('random@gmail.com')))).status).toBe('error');
  });

  it('rejects genuine tokens with unverified email', () => {
    const res = post(env.ctx, emailBody(makeToken(validClaims('skyatuiuc@gmail.com', { email_verified: false }))));
    expect(res.status).toBe('error');
  });

  it('rejects wrong-project and expired tokens without calling Firestore', () => {
    post(env.ctx, emailBody(makeToken(validClaims('skyatuiuc@gmail.com', { aud: 'other-project' }))));
    post(env.ctx, emailBody(makeToken(validClaims('skyatuiuc@gmail.com', { exp: 1 }))));
    expect(env.calls.fetch).toHaveLength(0);
    expect(env.calls.sent).toHaveLength(0);
  });

  it('caches by token, so a cached volunteer authorization cannot be reused by a forged token for the same email', () => {
    const genuine = makeToken(validClaims('vol@illinois.edu'));
    expect(post(env.ctx, emailBody(genuine)).status).toBe('success');
    expect(post(env.ctx, emailBody(genuine)).status).toBe('success');
    expect(env.calls.fetch).toHaveLength(1); // second call served from cache
    const forged = genuine.replace('.signature', '.forged');
    expect(post(env.ctx, emailBody(forged)).status).toBe('error');
  });

  it('requires a verified volunteer for campaign analytics, and refuses GET queries', () => {
    expect(post(env.ctx, { action: 'get_campaign_analytics' }).status).toBe('error');
    expect(post(env.ctx, { action: 'get_campaign_analytics', idToken: makeToken(validClaims('vol@illinois.edu')) }).status).toBe('success');
    const getRes = JSON.parse(env.ctx.doGet({ parameter: { action: 'get_campaign_analytics' } }).text);
    expect(getRes.status).toBe('error');
  });
});

describe('Apps Script campaign scan ingestion', () => {
  // Minimal in-memory Sheet: rows[0] is the header
  const makeSheet = () => {
    const rows = [['Date', 'Tag', 'Scans', 'Conversions', 'LastScannedAt', 'LastConvertedAt']];
    const stats = { fullReads: 0 };
    const sheet = {
      rows,
      stats,
      getLastRow: () => rows.length,
      getDataRange: () => ({ getValues: () => { stats.fullReads++; return rows.map(r => [...r]); } }),
      getRange: (row, col, numRows = 1, numCols = 1) => ({
        getValues: () => rows.slice(row - 1, row - 1 + numRows).map(r => r.slice(col - 1, col - 1 + numCols)),
        getValue: () => rows[row - 1][col - 1],
        setValue: (v) => { rows[row - 1][col - 1] = v; }
      }),
      appendRow: (r) => rows.push([...r])
    };
    return sheet;
  };

  const setup = () => {
    const env = loadScript({ firestoreCodeFor: () => 404 });
    const sheet = makeSheet();
    env.ctx.getOrCreateCampaignSheet = () => sheet;
    env.ctx.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
    return { ...env, sheet };
  };

  it('creates a row, then increments it via the cached row without re-reading the sheet', () => {
    const { ctx, sheet } = setup();
    expect(post(ctx, { action: 'scan', tag: 'quad', fingerprint: 'a' }).status).toBe('success');
    expect(post(ctx, { action: 'scan', tag: 'quad', fingerprint: 'b' }).status).toBe('success');
    expect(post(ctx, { action: 'conversion', tag: 'quad', fingerprint: 'a' }).status).toBe('success');
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1].slice(1, 4)).toEqual(['quad', 2, 1]);
    expect(sheet.stats.fullReads).toBe(1); // only the very first lookup scanned the sheet
  });

  it('keeps separate rows per tag and ignores duplicate scans in the same session window', () => {
    const { ctx, sheet } = setup();
    post(ctx, { action: 'scan', tag: 'quad', fingerprint: 'a' });
    expect(post(ctx, { action: 'scan', tag: 'quad', fingerprint: 'a' }).status).toBe('ignored');
    post(ctx, { action: 'scan', tag: 'insta', fingerprint: 'a' });
    expect(sheet.rows.map(r => r[1])).toEqual(['Tag', 'quad', 'insta']);
    expect(sheet.rows[1][2]).toBe(1);
  });

  it('falls back to a full scan when the cached row no longer matches', () => {
    const { ctx, sheet, cacheStore } = setup();
    post(ctx, { action: 'scan', tag: 'quad', fingerprint: 'a' });
    for (const key of cacheStore.keys()) if (key.startsWith('row_')) cacheStore.set(key, '1'); // stale/garbage pointer
    post(ctx, { action: 'scan', tag: 'quad', fingerprint: 'b' });
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][2]).toBe(2);
  });
});
