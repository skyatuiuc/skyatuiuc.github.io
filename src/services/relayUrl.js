// The Apps Script relay (email dispatch, campaign scans and analytics) has a single deployment, and
// its URL is built into the site. A build-time env var can override it (the e2e suite points it at
// a fake relay); it is no longer an admin setting.

const DEFAULT_RELAY_URL = 'https://script.google.com/macros/s/AKfycbyHJFonGIbqaZfADEed5QgzodmE65hTDLYp_iY-Tn_Nemg9k-eAUQV4s5mYMMRV3zDT/exec';

export function getRelayUrl() {
  const envUrl = import.meta.env?.VITE_CAMPAIGN_WEBHOOK_URL ||
                 import.meta.env?.VITE_EMAIL_WEBHOOK_URL ||
                 import.meta.env?.VITE_APPS_SCRIPT_URL;
  if (envUrl && envUrl.startsWith('https://script.google.com/macros/s/') && !envUrl.includes('EXAMPLE')) {
    return envUrl;
  }
  return DEFAULT_RELAY_URL;
}
