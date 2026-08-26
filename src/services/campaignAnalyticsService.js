import { db, isFirebaseConfigured } from '../firebase/config';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { logDatabaseOperation } from './telemetryService';

/**
 * Record a QR Code / Shortlink Scan.
 * Uses monthly batched Firestore documents (`campaign_analytics_monthly/{YYYY-MM}`)
 * to minimize read/write costs.
 * 
 * @param {string} rawTag - e.g. "insta", "eceb"
 * @param {string} category - e.g. "Social Media", "Campus Poster"
 */
export async function recordCampaignScan(rawTag, category = 'General Outreach') {
  if (!rawTag) return;
  const tag = rawTag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!tag) return;

  // Automated Email Link Scanner & Security Bot Filter Protection
  // Blocks enterprise email scanners (Microsoft SafeLinks, Proofpoint, Mimecast, Barracuda, GoogleImageProxy, bots)
  // from consuming database write quotas or inflating campaign analytics when campus newsletters are dispatched.
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /bot|crawl|spider|slurp|proofpoint|mimecast|safelinks|barracuda|googleimageproxy|facebookexternalhit|twitterbot|linkedinbot|preview|fetch|headless/i.test(ua);
    if (isBot) {
      return; // Skip analytics write for automated email link scanners
    }
  }

  // Session deduplication: Don't count duplicate reloads within the same 5-minute session
  const lastScanKey = `sky_scan_${tag}_last`;
  const lastScanTime = sessionStorage.getItem(lastScanKey);
  const nowMs = Date.now();
  if (lastScanTime && (nowMs - Number(lastScanTime)) < 5 * 60 * 1000) {
    // Within 5 min window; skip Firestore write to prevent inflated spam counts
    return;
  }
  sessionStorage.setItem(lastScanKey, nowMs.toString());

  const now = new Date();
  const yearMonth = now.toISOString().substring(0, 7); // "YYYY-MM"
  const dayKey = now.toISOString().substring(8, 10);    // "DD"

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'campaign_analytics_monthly', yearMonth);
      const isoString = now.toISOString();

      await setDoc(docRef, {
        yearMonth,
        updatedAt: isoString,
        tags: {
          [tag]: {
            tag,
            category,
            lastScannedAt: isoString,
            totalScans: increment(1),
            days: {
              [dayKey]: {
                scans: increment(1)
              }
            }
          }
        }
      }, { merge: true });

      // Telemetry log: 1 write
      logDatabaseOperation(0, 1, 0);
    } catch (err) {
      console.warn("Campaign scan record notice:", err);
    }
  }

  // Also persist in local storage fallback for offline support
  try {
    const localStr = localStorage.getItem('sky_campaign_analytics_local') || '{}';
    const localData = JSON.parse(localStr);
    if (!localData[yearMonth]) localData[yearMonth] = { tags: {} };
    if (!localData[yearMonth].tags[tag]) {
      localData[yearMonth].tags[tag] = {
        tag,
        category,
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
    console.warn("Local storage campaign scan error:", e);
  }
}

/**
 * Record a Registration Referral Conversion.
 * Triggered when a user completes a retreat application after arriving via a campaign shortcode.
 * 
 * @param {string} rawTag - e.g. "insta"
 */
export async function recordCampaignConversion(rawTag) {
  if (!rawTag) return;
  const tag = rawTag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!tag) return;

  const now = new Date();
  const yearMonth = now.toISOString().substring(0, 7); // "YYYY-MM"
  const dayKey = now.toISOString().substring(8, 10);    // "DD"

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'campaign_analytics_monthly', yearMonth);
      const isoString = now.toISOString();

      await setDoc(docRef, {
        yearMonth,
        updatedAt: isoString,
        tags: {
          [tag]: {
            tag,
            totalConversions: increment(1),
            days: {
              [dayKey]: {
                conversions: increment(1)
              }
            }
          }
        }
      }, { merge: true });

      // Telemetry log: 1 write
      logDatabaseOperation(0, 1, 0);
    } catch (err) {
      console.warn("Campaign conversion record notice:", err);
    }
  }

  // Persist local storage fallback
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
    console.warn("Local storage campaign conversion error:", e);
  }
}

/**
 * Fetch Campaign Analytics for a specific Date Range (YYYY-MM-DD to YYYY-MM-DD).
 * Groups metrics day-by-day with MINIMAL Firestore reads (1 read per month requested).
 * Includes per-channel breakdown per day for comparative performance graphing.
 */
export async function getCampaignAnalyticsForDateRange(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { dailyMetrics: [], tagTotals: [], grandTotalScans: 0, grandTotalConversions: 0 };
  }

  // Calculate required YYYY-MM monthly buckets
  const yearMonths = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endLimit) {
    const ym = current.toISOString().substring(0, 7);
    yearMonths.push(ym);
    current.setMonth(current.getMonth() + 1);
  }

  const monthlyDocs = {};

  // Fetch monthly bucket documents from Firestore (1 read per month)
  if (isFirebaseConfigured && db) {
    try {
      let readCount = 0;
      await Promise.all(
        yearMonths.map(async (ym) => {
          const docRef = doc(db, 'campaign_analytics_monthly', ym);
          const snap = await getDoc(docRef);
          readCount++;
          if (snap.exists()) {
            monthlyDocs[ym] = snap.data();
          }
        })
      );
      if (readCount > 0) logDatabaseOperation(readCount, 0, 0);
    } catch (err) {
      console.warn("Firestore fetch campaign analytics error:", err);
    }
  }

  // Fallback to local storage if Firestore has missing buckets
  try {
    const localStr = localStorage.getItem('sky_campaign_analytics_local') || '{}';
    const localData = JSON.parse(localStr);
    yearMonths.forEach((ym) => {
      if (!monthlyDocs[ym] && localData[ym]) {
        monthlyDocs[ym] = localData[ym];
      }
    });
  } catch (e) {
    console.warn("Local storage campaign fallback error:", e);
  }

  // Aggregate day-by-day metrics between startDateStr and endDateStr
  const dailyMetricsMap = {};
  const tagTotalsMap = {};

  // Generate list of days in date range
  const dateCursor = new Date(start);
  while (dateCursor <= end) {
    const dateKey = dateCursor.toISOString().split('T')[0]; // "YYYY-MM-DD"
    dailyMetricsMap[dateKey] = {
      date: dateKey,
      scans: 0,
      conversions: 0,
      channels: {} // { "insta": { scans: N, conversions: N } }
    };
    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  let grandTotalScans = 0;
  let grandTotalConversions = 0;

  yearMonths.forEach((ym) => {
    const bucket = monthlyDocs[ym];
    if (!bucket || !bucket.tags) return;

    Object.entries(bucket.tags).forEach(([tag, tagData]) => {
      if (!tagTotalsMap[tag]) {
        tagTotalsMap[tag] = {
          tag,
          category: tagData.category || 'General Outreach',
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
