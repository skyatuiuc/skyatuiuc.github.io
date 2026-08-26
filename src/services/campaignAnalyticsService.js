/**
 * CAMPAIGN ANALYTICS SERVICE
 * 
 * Secure, zero-Firestore-quota campaign tracking engine for SKY at UIUC.
 * Routes high-throughput anonymous QR/Shortlink scans and referral conversions
 * through Google Apps Script & Google Sheets with rate-limiting and local storage fallback.
 */

// Helper to resolve the active Google Apps Script Webhook URL
const DEFAULT_CAMPAIGN_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyHJFonGIbqaZfADEed5QgzodmE65hTDLYp_iY-Tn_Nemg9k-eAUQV4s5mYMMRV3zDT/exec';

export function getCampaignWebhookUrl() {
  // 1. Check environment variables
  const envUrl = import.meta.env?.VITE_CAMPAIGN_WEBHOOK_URL || 
                 import.meta.env?.VITE_EMAIL_WEBHOOK_URL || 
                 import.meta.env?.VITE_APPS_SCRIPT_URL;
  if (envUrl && envUrl.startsWith('https://script.google.com/macros/s/') && !envUrl.includes('EXAMPLE')) {
    return envUrl;
  }

  // 2. Check saved settings in LocalStorage (configured via Volunteer / Admin Email Settings Modal)
  try {
    const customCampUrl = localStorage.getItem('sky_campaign_webhook_url');
    if (customCampUrl && customCampUrl.startsWith('https://script.google.com/macros/s/') && !customCampUrl.includes('EXAMPLE')) {
      return customCampUrl;
    }

    const emailSettingsStr = localStorage.getItem('sky_email_settings');
    if (emailSettingsStr) {
      const emailSettings = JSON.parse(emailSettingsStr);
      if (emailSettings?.webhookUrl && 
          emailSettings.webhookUrl.startsWith('https://script.google.com/macros/s/') && 
          !emailSettings.webhookUrl.includes('EXAMPLE')) {
        return emailSettings.webhookUrl;
      }
    }
  } catch {
    // Ignore parse error
  }

  return DEFAULT_CAMPAIGN_WEBHOOK_URL;
}

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
  const yearMonth = now.toISOString().substring(0, 7); // "YYYY-MM"
  const dayKey = now.toISOString().substring(8, 10);    // "DD"
  const webhookUrl = getCampaignWebhookUrl();

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

  // 4. Update LocalStorage fallback for offline / instant responsiveness
  try {
    const localStr = localStorage.getItem('sky_campaign_analytics_local') || '{}';
    const localData = JSON.parse(localStr);
    if (!localData[yearMonth]) localData[yearMonth] = { tags: {} };
    if (!localData[yearMonth].tags[tag]) {
      localData[yearMonth].tags[tag] = {
        tag,
        totalScans: 0,
        totalConversions: 0,
        days: {}
      };
    }
    const t = localData[yearMonth].tags[tag];
    t.totalScans = (t.totalScans || 0) + 1;
    t.lastScannedAt = now.toISOString();
    if (!t.days[dayKey]) t.days[dayKey] = { scans: 0, conversions: 0 };
    t.days[dayKey].scans = (t.days[dayKey].scans || 0) + 1;
    localStorage.setItem('sky_campaign_analytics_local', JSON.stringify(localData));
  } catch (e) {
    console.warn("Local storage campaign scan fallback error:", e);
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
  const yearMonth = now.toISOString().substring(0, 7); // "YYYY-MM"
  const dayKey = now.toISOString().substring(8, 10);    // "DD"
  const webhookUrl = getCampaignWebhookUrl();

  // 1. Dispatch conversion notification to Google Apps Script
  if (webhookUrl) {
    try {
      const payload = JSON.stringify({
        action: 'record_campaign_conversion',
        tag,
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

  // 2. Persist in local storage fallback
  try {
    const localStr = localStorage.getItem('sky_campaign_analytics_local') || '{}';
    const localData = JSON.parse(localStr);
    if (!localData[yearMonth]) localData[yearMonth] = { tags: {} };
    if (!localData[yearMonth].tags[tag]) {
      localData[yearMonth].tags[tag] = {
        tag,
        totalScans: 0,
        totalConversions: 0,
        days: {}
      };
    }
    const t = localData[yearMonth].tags[tag];
    t.totalConversions = (t.totalConversions || 0) + 1;
    if (!t.days[dayKey]) t.days[dayKey] = { scans: 0, conversions: 0 };
    t.days[dayKey].conversions = (t.days[dayKey].conversions || 0) + 1;
    localStorage.setItem('sky_campaign_analytics_local', JSON.stringify(localData));
  } catch (e) {
    console.warn("Local storage campaign conversion fallback error:", e);
  }
}

/**
 * Fetch Campaign Analytics for a specific Date Range (YYYY-MM-DD to YYYY-MM-DD).
 * Queries Google Apps Script with LocalStorage cache fallback.
 * 
 * @param {string} startDateStr - "YYYY-MM-DD"
 * @param {string} endDateStr - "YYYY-MM-DD"
 */
export async function getCampaignAnalyticsForDateRange(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { dailyMetrics: [], tagTotals: [], grandTotalScans: 0, grandTotalConversions: 0 };
  }

  const webhookUrl = getCampaignWebhookUrl();

  // 1. Try querying Google Apps Script Engine
  if (webhookUrl) {
    try {
      const fetchUrl = `${webhookUrl}?action=get_campaign_analytics&startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`;
      const resp = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.status === 'success' || Array.isArray(data.dailyMetrics))) {
          // Cache successful payload
          try {
            localStorage.setItem('sky_campaign_analytics_cached', JSON.stringify({
              timestamp: Date.now(),
              startDate: startDateStr,
              endDate: endDateStr,
              data
            }));
          } catch {
            // Ignore storage quota error
          }

          return {
            dailyMetrics: data.dailyMetrics || [],
            tagTotals: data.tagTotals || [],
            grandTotalScans: data.grandTotalScans || 0,
            grandTotalConversions: data.grandTotalConversions || 0
          };
        }
      }
    } catch (err) {
      console.warn("Google Apps Script campaign fetch error, switching to fallback:", err);
    }
  }

  // 2. Fallback: Aggregate from Local Storage
  const localStr = localStorage.getItem('sky_campaign_analytics_local') || '{}';
  let localData = {};
  try {
    localData = JSON.parse(localStr);
  } catch {
    localData = {};
  }

  // Calculate required YYYY-MM buckets
  const yearMonths = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endLimit) {
    const ym = current.toISOString().substring(0, 7);
    yearMonths.push(ym);
    current.setMonth(current.getMonth() + 1);
  }

  const dailyMetricsMap = {};
  const tagTotalsMap = {};

  const dateCursor = new Date(start);
  while (dateCursor <= end) {
    const dateKey = dateCursor.toISOString().split('T')[0];
    dailyMetricsMap[dateKey] = {
      date: dateKey,
      scans: 0,
      conversions: 0,
      channels: {}
    };
    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  let grandTotalScans = 0;
  let grandTotalConversions = 0;

  yearMonths.forEach((ym) => {
    const bucket = localData[ym];
    if (!bucket || !bucket.tags) return;

    Object.entries(bucket.tags).forEach(([tag, tagData]) => {
      if (!tagTotalsMap[tag]) {
        tagTotalsMap[tag] = {
          tag,
          totalScans: 0,
          totalConversions: 0,
          lastScannedAt: tagData.lastScannedAt || ''
        };
      }
      const tagRecord = tagTotalsMap[tag];

      if (tagData.days) {
        Object.entries(tagData.days).forEach(([dayKey, dayData]) => {
          const fullDateKey = `${ym}-${dayKey.padStart(2, '0')}`;
          const scans = Number(dayData.scans) || 0;
          const conversions = Number(dayData.conversions) || 0;

          if (dailyMetricsMap[fullDateKey]) {
            dailyMetricsMap[fullDateKey].scans += scans;
            dailyMetricsMap[fullDateKey].conversions += conversions;

            if (!dailyMetricsMap[fullDateKey].channels[tag]) {
              dailyMetricsMap[fullDateKey].channels[tag] = { scans: 0, conversions: 0 };
            }
            dailyMetricsMap[fullDateKey].channels[tag].scans += scans;
            dailyMetricsMap[fullDateKey].channels[tag].conversions += conversions;
          }

          tagRecord.totalScans += scans;
          tagRecord.totalConversions += conversions;
          grandTotalScans += scans;
          grandTotalConversions += conversions;

          if (tagData.lastScannedAt && (!tagRecord.lastScannedAt || tagData.lastScannedAt > tagRecord.lastScannedAt)) {
            tagRecord.lastScannedAt = tagData.lastScannedAt;
          }
        });
      }
    });
  });

  const dailyMetrics = Object.values(dailyMetricsMap).sort((a, b) => a.date.localeCompare(b.date));
  const tagTotals = Object.values(tagTotalsMap).sort((a, b) => b.totalScans - a.totalScans);

  return {
    dailyMetrics,
    tagTotals,
    grandTotalScans,
    grandTotalConversions
  };
}
