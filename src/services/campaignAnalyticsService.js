/**
 * CAMPAIGN ANALYTICS SERVICE
 * 
 * Secure, zero-Firestore-quota campaign tracking engine for SKY at UIUC.
 * Routes anonymous QR/shortlink scans and referral conversions through the Google Apps Script
 * relay into a Google Sheet. There is deliberately no per-browser fallback: the Sheet is the only
 * source of truth, and a failed analytics query is shown as an error, never as local counts.
 */

import { auth } from '../firebase/config';
import { getRelayUrl } from './relayUrl';

/**
 * Generate or retrieve an ephemeral session fingerprint for rate-limiting
 */
function getSessionFingerprint() {
  try {
    let fp = sessionStorage.getItem('sky_client_fp');
    if (!fp) {
      fp = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      sessionStorage.setItem('sky_client_fp', fp);
    }
    return fp;
  } catch {
    return 'anon';
  }
}

/**
 * Record a QR Code / Shortlink Scan.
 * Uses fire-and-forget background beacon to Google Apps Script & Google Sheets,
 * consuming 0 Firestore writes and executing in < 0.1ms without blocking page navigation.
 * 
 * @param {string} rawTag - e.g. "demo", "insta", "eceb"
 */
export async function recordCampaignScan(rawTag) {
  if (!rawTag) return;
  const tag = rawTag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!tag) return;

  // 1. Filter enterprise email link scanners / crawler bots
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /bot|crawl|spider|slurp|proofpoint|mimecast|safelinks|barracuda|googleimageproxy|facebookexternalhit|twitterbot|linkedinbot|preview|fetch|headless/i.test(ua);
    if (isBot) {
      return;
    }
  }

  // 2. Client-side session deduplication (5-minute window)
  const lastScanKey = `sky_scan_${tag}_last`;
  const lastScanTime = sessionStorage.getItem(lastScanKey);
  const nowMs = Date.now();
  if (lastScanTime && (nowMs - Number(lastScanTime)) < 5 * 60 * 1000) {
    return;
  }
  sessionStorage.setItem(lastScanKey, nowMs.toString());

  const now = new Date();
  const webhookUrl = getRelayUrl();

  // 3. Dispatch fire-and-forget background beacon to Google Apps Script
  if (webhookUrl) {
    try {
      const payload = JSON.stringify({
        action: 'record_campaign_scan',
        tag,
        fingerprint: getSessionFingerprint(),
        timestamp: now.toISOString()
      });

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
        navigator.sendBeacon(webhookUrl, blob);
      } else {
        fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("GAS campaign scan dispatch warning:", err);
    }
  }
}

/**
 * Record a Registration Referral Conversion.
 * Triggered when a student completes a retreat application after arriving via a campaign shortlink.
 * 
 * @param {string} rawTag - e.g. "demo", "quad"
 */
export async function recordCampaignConversion(rawTag) {
  if (!rawTag) return;
  const tag = rawTag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!tag) return;

  const now = new Date();
  const webhookUrl = getRelayUrl();

  // 1. Dispatch conversion notification to Google Apps Script
  if (webhookUrl) {
    try {
      const payload = JSON.stringify({
        action: 'record_campaign_conversion',
        tag,
        fingerprint: getSessionFingerprint(),
        timestamp: now.toISOString()
      });

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
        navigator.sendBeacon(webhookUrl, blob);
      } else {
        fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("GAS campaign conversion dispatch warning:", err);
    }
  }
}

/**
 * Fetch campaign analytics for a date range (YYYY-MM-DD to YYYY-MM-DD) from the relay's Sheet.
 * Volunteers only (the relay verifies the caller's ID token). Throws on any failure.
 */
export async function getCampaignAnalyticsForDateRange(startDateStr, endDateStr) {
  if (Number.isNaN(Date.parse(startDateStr)) || Number.isNaN(Date.parse(endDateStr))) {
    return { dailyMetrics: [], tagTotals: [], grandTotalScans: 0, grandTotalConversions: 0 };
  }

  let idToken = '';
  if (auth?.currentUser) {
    try {
      idToken = await auth.currentUser.getIdToken();
    } catch (tokenErr) {
      console.warn("Could not fetch ID token for campaign analytics:", tokenErr);
    }
  }

  const resp = await fetch(getRelayUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'get_campaign_analytics', idToken, startDate: startDateStr, endDate: endDateStr })
  });
  if (!resp.ok) throw new Error(`Analytics relay HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data || data.status !== 'success') throw new Error(data?.message || 'Analytics relay rejected the request.');

  return {
    dailyMetrics: data.dailyMetrics || [],
    tagTotals: data.tagTotals || [],
    grandTotalScans: data.grandTotalScans || 0,
    grandTotalConversions: data.grandTotalConversions || 0
  };
}
