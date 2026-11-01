/**
 * GOOGLE APPS SCRIPT RELAY & CAMPAIGN ANALYTICS ENGINE FOR SKY AT UIUC
 * 
 * Version: 4.5.1
 * Managed in GitHub repository: https://github.com/skyatuiuc/skyatuiuc.github.io
 * 
 * Capabilities:
 * 1. Email Relay for authorized volunteers (ID tokens verified by Google via Firestore REST)
 * 2. High-performance, rate-limited Campaign QR/Shortlink Scan Ingestion (Zero-Quota Firestore protection)
 * 3. Auto-provisioning Google Sheet Database for lifetime campaign analytics
 * 4. Date-range aggregated metrics querying for Volunteer & Admin Dashboards
 * 
 * Deployed as a Web App:
 * - Execute as: Me (skyatuiuc@gmail.com)
 * - Who has access: Anyone
 */

// Super Admin Identity & Firebase Project Configuration
var SUPER_ADMIN_EMAIL = "skyatuiuc@gmail.com";
var FIREBASE_PROJECT_ID = "skyatuiuc-web";
var SHEET_TAB_NAME = "Campaign_Analytics";

/**
 * Get or automatically create the Campaign Analytics Google Sheet.
 * Auto-provisions the database spreadsheet in Google Drive if one is not linked.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateCampaignSheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty("SPREADSHEET_ID");
  var ss = null;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (e) {
      Logger.log("Stored SPREADSHEET_ID invalid or inaccessible. Creating new one: " + e.toString());
      ss = null;
    }
  }

  if (!ss) {
    // Auto-create brand new Google Spreadsheet
    ss = SpreadsheetApp.create("SKY UIUC - Campaign Analytics Database");
    ssId = ss.getId();
    props.setProperty("SPREADSHEET_ID", ssId);
    Logger.log("Auto-provisioned new Campaign Analytics Spreadsheet ID: " + ssId);
  }

  var sheet = ss.getSheetByName(SHEET_TAB_NAME);
  var headers = ["Date", "Tag", "Scans", "Conversions", "LastScannedAt", "LastConvertedAt"];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB_NAME);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1E293B");
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  } else {
    // Auto-Migration: If existing sheet has legacy "Category" column at Col 3, remove it
    var lastCol = sheet.getLastColumn();
    if (lastCol >= 3) {
      var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      if (String(currentHeaders[2]).toLowerCase() === "category") {
        sheet.deleteColumn(3);
        Logger.log("Auto-migrated sheet: removed legacy Category column.");
      }
    }
  }

  return sheet;
}

/**
 * Decode (without trusting) the payload segment of a JWT.
 * @param {string} token
 * @returns {object|null}
 */
function decodeJwtPayload_(token) {
  var parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // JWT segments are unpadded base64url; Apps Script's decoder requires the "=" padding
    var segment = parts[1] + "===".slice((parts[1].length + 3) % 4);
    return JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(segment)).getDataAsString());
  } catch (err) {
    Logger.log("Could not decode caller token payload: " + err.toString());
    return null;
  }
}

// Why the last authenticateCaller() call rejected the caller (one request per execution), reported
// in the "Unauthorized" response so a failure can be diagnosed without reading the execution logs.
var lastAuthFailure_ = "";
function rejectCaller_(reason) {
  lastAuthFailure_ = reason;
  return null;
}

/**
 * Authenticate a caller from a Firebase Auth ID token.
 *
 * Apps Script cannot verify RS256 signatures itself, so the token is presented to the
 * Firestore REST API as a Bearer credential. Google validates its signature, expiry and
 * project before evaluating security rules:
 *   - 401 -> forged, expired or foreign token (rejected)
 *   - 200 -> authentic, and authorized_volunteers/{email} exists
 *   - 404 -> authentic, but not a listed volunteer
 * (Rules let any signed-in user `get` the doc for their own email, so a genuine token never
 * receives 403 for this path.) Only after this check are the payload claims trusted.
 *
 * Results are cached per token (SHA-256 digest), never per email, so a cached authorization
 * cannot be borrowed by a forged token that merely claims the same email.
 *
 * @param {string} idToken Firebase ID token from the web client
 * @returns {{email: string, authorized: boolean}|null} null when the token is not authentic
 */
function authenticateCaller(idToken) {
  lastAuthFailure_ = "";
  if (!idToken || typeof idToken !== "string") return rejectCaller_("missing_token");
  var token = idToken.trim();
  var payload = decodeJwtPayload_(token);
  if (!payload) return rejectCaller_("token_unreadable");

  // Cheap pre-checks so obviously bad tokens never cost a Firestore read
  var nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID || payload.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID) {
    return rejectCaller_("wrong_project");
  }
  if (!payload.exp || payload.exp <= nowSec) return rejectCaller_("token_expired");
  var email = String(payload.email || "").toLowerCase().trim();
  if (!email) return rejectCaller_("no_email");

  var cache = CacheService.getScriptCache();
  var cacheKey = "auth_tok_" + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8)
  );
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { /* fall through to re-verify */ }
  }

  var code;
  try {
    var fsUrl = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
      "/databases/(default)/documents/authorized_volunteers/" + encodeURIComponent(email);
    var resp = UrlFetchApp.fetch(fsUrl, {
      muteHttpExceptions: true,
      headers: { "Authorization": "Bearer " + token }
    });
    code = resp.getResponseCode();
  } catch (err) {
    Logger.log("Token verification request failed: " + err.toString());
    return rejectCaller_("verification_request_failed");
  }

  if (code !== 200 && code !== 404) {
    Logger.log("Rejected caller token for " + email + " (Firestore HTTP " + code + ")");
    return rejectCaller_("verification_http_" + code);
  }

  // The payload is now known to be Google-signed, so its claims can be trusted
  if (payload.email_verified !== true) {
    Logger.log("Rejected caller " + email + ": email not verified");
    return rejectCaller_("email_not_verified");
  }

  var result = {
    email: email,
    authorized: code === 200 || email === SUPER_ADMIN_EMAIL.toLowerCase() || isInScriptAllowlist_(email)
  };

  var ttl = Math.min(600, payload.exp - nowSec);
  if (ttl > 0) cache.put(cacheKey, JSON.stringify(result), ttl);
  return result;
}

/**
 * Optional AUTHORIZED_VOLUNTEERS script property (comma-separated emails).
 * Only consulted after the caller's identity has been verified.
 * @param {string} email
 * @returns {boolean}
 */
function isInScriptAllowlist_(email) {
  var listStr = PropertiesService.getScriptProperties().getProperty("AUTHORIZED_VOLUNTEERS");
  if (!listStr) return false;
  var list = listStr.toLowerCase().split(",").map(function(s) { return s.trim(); });
  return list.indexOf(email) !== -1;
}

function unauthorizedResponse_() {
  var reason = lastAuthFailure_ || "not_a_volunteer";
  return createJsonResponse({
    status: "error",
    code: "unauthorized",
    reason: reason,
    message: "Unauthorized (" + reason + "): Valid Firebase ID token from an authorized volunteer or super admin is required."
  });
}

/**
 * Find the sheet row for (dateStr, tag) without reading the whole sheet when possible.
 * Row numbers never change (rows are only appended), so the last known row for a key is cached
 * and re-validated with a single-row read; on a miss we fall back to one full scan.
 * Must be called while holding the script lock.
 * @returns {number} 1-based row index, or -1 when the row does not exist yet
 */
function findCampaignRow_(sheet, dateStr, tag) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "row_" + dateStr + "_" + tag;
  var cachedRow = Number(cache.get(cacheKey));
  var normalizeDate = function(value) {
    return value instanceof Date ? Utilities.formatDate(value, "America/Chicago", "yyyy-MM-dd") : String(value);
  };

  if (cachedRow > 1 && cachedRow <= sheet.getLastRow()) {
    var row = sheet.getRange(cachedRow, 1, 1, 2).getValues()[0];
    if (normalizeDate(row[0]) === dateStr && String(row[1]).toLowerCase() === tag) {
      return cachedRow;
    }
  }

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (normalizeDate(values[i][0]) === dateStr && String(values[i][1]).toLowerCase() === tag) {
      cache.put(cacheKey, String(i + 1), 21600);
      return i + 1;
    }
  }
  return -1;
}

/**
 * Increment the scan or conversion counter for (today, tag), creating the day's row if needed.
 * @param {string} tag sanitized campaign tag
 * @param {"scan"|"conversion"} kind
 */
function incrementCampaignCounter_(tag, kind) {
  var now = new Date();
  var dateStr = Utilities.formatDate(now, "America/Chicago", "yyyy-MM-dd");
  var nowIso = now.toISOString();
  var countCol = kind === "scan" ? 3 : 4; // C: Scans, D: Conversions
  var timeCol = kind === "scan" ? 5 : 6;  // E: LastScannedAt, F: LastConvertedAt

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    var sheet = getOrCreateCampaignSheet();
    var rowIndex = findCampaignRow_(sheet, dateStr, tag);

    if (rowIndex > 0) {
      var current = Number(sheet.getRange(rowIndex, countCol).getValue()) || 0;
      sheet.getRange(rowIndex, countCol).setValue(current + 1);
      sheet.getRange(rowIndex, timeCol).setValue(nowIso);
    } else {
      // [Date, Tag, Scans, Conversions, LastScannedAt, LastConvertedAt]
      sheet.appendRow(kind === "scan" ? [dateStr, tag, 1, 0, nowIso, ""] : [dateStr, tag, 0, 1, "", nowIso]);
      CacheService.getScriptCache().put("row_" + dateStr + "_" + tag, String(sheet.getLastRow()), 21600);
    }

    return createJsonResponse({ status: "success", action: kind + "_recorded", tag: tag, date: dateStr });
  } catch (err) {
    Logger.log("Error recording campaign " + kind + ": " + err.toString());
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * Handle high-throughput campaign QR/Shortlink scan ingestion
 * @param {object} data { tag, fingerprint }
 */
function handleRecordScan(data) {
  var tag = (data.tag || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").substring(0, 32);
  if (!tag) {
    return createJsonResponse({ status: "error", message: "Invalid tag parameter" });
  }

  var fingerprint = (data.fingerprint || "anon").trim().substring(0, 64);

  // Deduplication & Anti-Spam Rate Limiting via CacheService (5-minute window)
  var cache = CacheService.getScriptCache();
  var cacheKey = "scan_" + tag + "_" + fingerprint;
  if (cache.get(cacheKey)) {
    return createJsonResponse({ status: "ignored", reason: "duplicate_session_window", tag: tag });
  }
  cache.put(cacheKey, "1", 300); // 5 minutes TTL

  return incrementCampaignCounter_(tag, "scan");
}

/**
 * Handle campaign referral conversion tracking (when retreat application submitted)
 * @param {object} data { tag, fingerprint }
 */
function handleRecordConversion(data) {
  var tag = (data.tag || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").substring(0, 32);
  if (!tag) {
    return createJsonResponse({ status: "error", message: "Invalid tag parameter" });
  }

  var fingerprint = (data.fingerprint || "anon").trim().substring(0, 64);

  // Deduplication & Anti-Spam Rate Limiting via CacheService (5-minute window)
  var cache = CacheService.getScriptCache();
  var cacheKey = "conv_" + tag + "_" + fingerprint;
  if (cache.get(cacheKey)) {
    return createJsonResponse({ status: "ignored", reason: "duplicate_session_window", tag: tag });
  }
  cache.put(cacheKey, "1", 300); // 5 minutes TTL

  return incrementCampaignCounter_(tag, "conversion");
}

/**
 * Aggregate campaign analytics for a specified date range
 * @param {string} startDateStr YYYY-MM-DD
 * @param {string} endDateStr YYYY-MM-DD
 */
function handleGetAnalytics(startDateStr, endDateStr) {
  try {
    var sheet = getOrCreateCampaignSheet();
    var values = sheet.getDataRange().getValues();

    var defaultEnd = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd");
    var defaultStart = Utilities.formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "America/Chicago", "yyyy-MM-dd");

    var start = (startDateStr || defaultStart).trim();
    var end = (endDateStr || defaultEnd).trim();

    var dailyMetricsMap = {};
    var tagTotalsMap = {};
    var grandTotalScans = 0;
    var grandTotalConversions = 0;

    // Generate daily map slots between start and end
    var cur = new Date(start + "T12:00:00Z");
    var endLimit = new Date(end + "T12:00:00Z");
    while (cur <= endLimit) {
      var dKey = cur.toISOString().split("T")[0];
      dailyMetricsMap[dKey] = {
        date: dKey,
        scans: 0,
        conversions: 0,
        channels: {}
      };
      cur.setDate(cur.getDate() + 1);
    }

    // Process rows (skip header row 0)
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (!row || row[0] === "" || row[0] === null || row[0] === undefined) {
        continue;
      }

      var rawDate = row[0];
      var rowDate = "";
      if (rawDate instanceof Date) {
        rowDate = Utilities.formatDate(rawDate, "America/Chicago", "yyyy-MM-dd");
      } else if (typeof rawDate === "string") {
        var trimmed = rawDate.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          rowDate = trimmed.substring(0, 10);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
          var parts = trimmed.split('/');
          var m = parts[0].length === 1 ? '0' + parts[0] : parts[0];
          var d = parts[1].length === 1 ? '0' + parts[1] : parts[1];
          rowDate = parts[2].substring(0, 4) + '-' + m + '-' + d;
        } else {
          rowDate = trimmed;
        }
      }

      if (!rowDate || rowDate < start || rowDate > end) {
        continue;
      }

      // Normalize tag: strip '#', lowercase, trim
      var rawTag = String(row[1] || "").toLowerCase().trim().replace(/^#+/, "").replace(/[^a-z0-9_-]/g, "");
      if (!rawTag) continue;

      var scans = Number(row[2]) || 0;
      var conversions = Number(row[3]) || 0;
      var lastScannedAt = String(row[4] || "");

      if (!tagTotalsMap[rawTag]) {
        tagTotalsMap[rawTag] = {
          tag: rawTag,
          totalScans: 0,
          totalConversions: 0,
          lastScannedAt: ""
        };
      }

      var tagRecord = tagTotalsMap[rawTag];
      tagRecord.totalScans += scans;
      tagRecord.totalConversions += conversions;
      if (lastScannedAt && (!tagRecord.lastScannedAt || lastScannedAt > tagRecord.lastScannedAt)) {
        tagRecord.lastScannedAt = lastScannedAt;
      }

      grandTotalScans += scans;
      grandTotalConversions += conversions;

      if (dailyMetricsMap[rowDate]) {
        dailyMetricsMap[rowDate].scans += scans;
        dailyMetricsMap[rowDate].conversions += conversions;
        if (!dailyMetricsMap[rowDate].channels[rawTag]) {
          dailyMetricsMap[rowDate].channels[rawTag] = { scans: 0, conversions: 0 };
        }
        dailyMetricsMap[rowDate].channels[rawTag].scans += scans;
        dailyMetricsMap[rowDate].channels[rawTag].conversions += conversions;
      }
    }

    var dailyMetrics = Object.keys(dailyMetricsMap).sort().map(function(k) {
      return dailyMetricsMap[k];
    });

    var tagTotals = Object.keys(tagTotalsMap).map(function(k) {
      return tagTotalsMap[k];
    }).sort(function(a, b) {
      return b.totalScans - a.totalScans;
    });

    return createJsonResponse({
      status: "success",
      dailyMetrics: dailyMetrics,
      tagTotals: tagTotals,
      grandTotalScans: grandTotalScans,
      grandTotalConversions: grandTotalConversions
    });
  } catch (err) {
    Logger.log("Error querying campaign analytics: " + err.toString());
    return createJsonResponse({
      status: "error",
      message: err.toString(),
      dailyMetrics: [],
      tagTotals: [],
      grandTotalScans: 0,
      grandTotalConversions: 0
    });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Email quota (consumer Gmail: about 100 recipients per rolling 24 hours) ----------
// The relay is the only sender on this account, so it counts its own sends instead of calling
// MailApp.getRemainingDailyQuota(), which would need an extra OAuth scope (and re-authorization).
var EMAIL_DAILY_LIMIT_DEFAULT = 100;
var EMAIL_SEND_LOG_KEY = "email_send_log";
var DAY_MS = 24 * 60 * 60 * 1000;

function emailQuotaStatus_() {
  var props = PropertiesService.getScriptProperties();
  var limit = Number(props.getProperty("EMAIL_DAILY_LIMIT")) || EMAIL_DAILY_LIMIT_DEFAULT;
  var cutoff = Date.now() - DAY_MS;
  var log = [];
  try { log = JSON.parse(props.getProperty(EMAIL_SEND_LOG_KEY) || "[]"); } catch (err) { log = []; }
  log = log.filter(function (t) { return typeof t === "number" && t > cutoff; });
  var nextFreeAt = log.length >= limit ? new Date(Math.min.apply(null, log) + DAY_MS).toISOString() : null;
  return { limit: limit, used: log.length, remaining: Math.max(0, limit - log.length), nextFreeAt: nextFreeAt, log: log, props: props };
}

function recordEmailSend_() {
  var quota = emailQuotaStatus_();
  quota.log.push(Date.now());
  quota.props.setProperty(EMAIL_SEND_LOG_KEY, JSON.stringify(quota.log));
  return Math.max(0, quota.limit - quota.log.length);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "No POST payload received" });
    }

    if (e.postData.contents.length > 65536) {
      return createJsonResponse({ status: "error", message: "Payload size limit exceeded" });
    }

    var rawContents = (e.postData && typeof e.postData.getDataAsString === 'function') 
      ? e.postData.getDataAsString() 
      : (e.postData ? e.postData.contents : "");

    var data;
    try {
      data = JSON.parse(rawContents);
    } catch (parseErr) {
      // In case sendBeacon sends plain string or form-encoded
      data = e.parameter || {};
    }

    var action = (data.action || (e.parameter ? e.parameter.action : "") || "").trim();

    // 1. Handle Anonymous Campaign Scan Beacon (Zero Firestore Writes)
    if (action === "record_campaign_scan" || action === "scan") {
      return handleRecordScan(data);
    }

    // 2. Handle Campaign Conversion Tracking
    if (action === "record_campaign_conversion" || action === "conversion") {
      return handleRecordConversion(data);
    }

    // 3. Handle Campaign Analytics Query (volunteers only)
    if (action === "get_campaign_analytics" || action === "analytics") {
      var queryCaller = authenticateCaller(data.idToken || "");
      if (!queryCaller || !queryCaller.authorized) {
        return unauthorizedResponse_();
      }
      return handleGetAnalytics(data.startDate || "", data.endDate || "");
    }

    // 4. Authenticated Email Dispatch Relay
    var caller = authenticateCaller(data.idToken || "");
    if (!caller || !caller.authorized) {
      return unauthorizedResponse_();
    }
    var senderEmail = caller.email;

    // 4a. Remaining email quota (volunteers only)
    if (action === "get_email_quota" || action === "quota") {
      var status = emailQuotaStatus_();
      return createJsonResponse({ status: "success", limit: status.limit, used: status.used, remaining: status.remaining, nextFreeAt: status.nextFreeAt });
    }

    if (!data.to || !data.subject || !data.htmlBody) {
      return createJsonResponse({ 
        status: "error", 
        message: "Missing required fields (to, subject, htmlBody)" 
      });
    }

    var quota = emailQuotaStatus_();
    if (quota.remaining <= 0) {
      return createJsonResponse({
        status: "error",
        code: "quota_exhausted",
        message: "Daily email limit reached (" + quota.limit + " per 24 hours). Sending resumes after " + quota.nextFreeAt + ".",
        nextFreeAt: quota.nextFreeAt
      });
    }

    GmailApp.sendEmail(data.to, data.subject, data.plainText || "", {
      htmlBody: data.htmlBody,
      name: data.senderName || "SKY Meditation at UIUC",
      replyTo: "skyatuiuc@gmail.com"
    });
    var remaining = recordEmailSend_();

    return createJsonResponse({ 
      status: "success", 
      recipient: data.to,
      templateKey: data.templateKey || "custom",
      dispatchedBy: senderEmail,
      remaining: remaining,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  if (action === "get_campaign_analytics" || action === "analytics") {
    // Analytics must be requested via POST with the ID token in the body (keeps tokens out of URLs/logs)
    return createJsonResponse({ status: "error", message: "Use POST for campaign analytics queries." });
  }

  return createJsonResponse({
    status: "online",
    service: "SKY UIUC Relay & Campaign Engine",
    version: "4.5.1",
    time: new Date().toISOString()
  });
}
