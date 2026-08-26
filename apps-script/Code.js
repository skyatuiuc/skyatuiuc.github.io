/**
 * GOOGLE APPS SCRIPT RELAY & CAMPAIGN ANALYTICS ENGINE FOR SKY AT UIUC
 * 
 * Version: 4.1.0
 * Managed in GitHub repository: https://github.com/skyatuiuc/skyatuiuc.github.io
 * 
 * Capabilities:
 * 1. Cryptographically verified Email Relay for authorized volunteers
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
 * Cryptographically verify incoming Firebase Auth ID Token claims using Google's OAuth Tokeninfo API
 * @param {string} idToken Signed Firebase JWT
 * @returns {object|null} { email: string, uid: string, emailVerified: boolean } or null
 */
function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string" || idToken.trim() === "") {
    return null;
  }

  try {
    var url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken.trim());
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (response.getResponseCode() !== 200) {
      Logger.log("Token verification failed with status: " + response.getResponseCode());
      return null;
    }

    var payload = JSON.parse(response.getContentText());

    // 1. Verify Audience and Issuer match the Firebase project
    var expectedIssuer = "https://securetoken.google.com/" + FIREBASE_PROJECT_ID;
    if (payload.aud !== FIREBASE_PROJECT_ID || payload.iss !== expectedIssuer) {
      Logger.log("Audience/Issuer mismatch: " + payload.aud + " / " + payload.iss);
      return null;
    }

    // 2. Verify Email is present
    var email = (payload.email || "").toLowerCase().trim();
    if (!email) {
      Logger.log("Missing email in verified token payload");
      return null;
    }

    var isEmailVerified = payload.email_verified === true || payload.email_verified === "true";

    return {
      email: email,
      uid: payload.user_id || payload.sub || "",
      emailVerified: isEmailVerified
    };
  } catch (err) {
    Logger.log("Token verification exception: " + err.toString());
    return null;
  }
}

/**
 * Check if the verified caller email is an authorized volunteer or super admin
 * @param {string} callerEmail
 * @param {string} idToken
 * @returns {boolean}
 */
function isAuthorizedCaller(callerEmail, idToken) {
  if (!callerEmail) return false;
  callerEmail = callerEmail.toLowerCase().trim();

  // 1. Super Admin is always authorized
  if (callerEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // 2. Check Script Property AUTHORIZED_VOLUNTEERS fallback if configured
  var authorizedListStr = PropertiesService.getScriptProperties().getProperty("AUTHORIZED_VOLUNTEERS");
  if (authorizedListStr) {
    var authorizedList = authorizedListStr.toLowerCase().split(",").map(function(s) { return s.trim(); });
    if (authorizedList.indexOf(callerEmail) !== -1) {
      return true;
    }
  }

  // 3. Query Cloud Firestore to check if authorized_volunteers/{callerEmail} document exists
  if (idToken) {
    try {
      var fsUrl = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/authorized_volunteers/" + encodeURIComponent(callerEmail);
      var fsResp = UrlFetchApp.fetch(fsUrl, {
        muteHttpExceptions: true,
        headers: {
          "Authorization": "Bearer " + idToken
        }
      });
      if (fsResp.getResponseCode() === 200) {
        return true;
      }
    } catch (e) {
      // Fallback
    }
  }

  return false;
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
  var now = new Date();
  var dateStr = Utilities.formatDate(now, "America/Chicago", "yyyy-MM-dd");
  var nowIso = now.toISOString();

  // Deduplication & Anti-Spam Rate Limiting via CacheService (5-minute window)
  var cache = CacheService.getScriptCache();
  var cacheKey = "scan_" + tag + "_" + fingerprint;
  if (cache.get(cacheKey)) {
    return createJsonResponse({ status: "ignored", reason: "duplicate_session_window", tag: tag });
  }
  cache.put(cacheKey, "1", 300); // 5 minutes TTL

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); // Wait up to 5 seconds for lock
    var sheet = getOrCreateCampaignSheet();
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;

    // Search for existing row matching (Date, Tag)
    for (var i = 1; i < values.length; i++) {
      var rowDate = values[i][0];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(rowDate, "America/Chicago", "yyyy-MM-dd");
      }
      if (rowDate === dateStr && String(values[i][1]).toLowerCase() === tag) {
        rowIndex = i + 1; // 1-indexed for Sheet API
        break;
      }
    }

    if (rowIndex > 0) {
      // Increment Scans column (Col 3: C), update LastScannedAt (Col 5: E)
      var currentScans = Number(values[rowIndex - 1][2]) || 0;
      sheet.getRange(rowIndex, 3).setValue(currentScans + 1);
      sheet.getRange(rowIndex, 5).setValue(nowIso);
    } else {
      // Append new daily tag row: [Date, Tag, Scans, Conversions, LastScannedAt, LastConvertedAt]
      sheet.appendRow([dateStr, tag, 1, 0, nowIso, ""]);
    }

    return createJsonResponse({ status: "success", action: "scan_recorded", tag: tag, date: dateStr });
  } catch (err) {
    Logger.log("Error recording campaign scan: " + err.toString());
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * Handle campaign referral conversion tracking (when retreat application submitted)
 * @param {object} data { tag }
 */
function handleRecordConversion(data) {
  var tag = (data.tag || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").substring(0, 32);
  if (!tag) {
    return createJsonResponse({ status: "error", message: "Invalid tag parameter" });
  }

  var now = new Date();
  var dateStr = Utilities.formatDate(now, "America/Chicago", "yyyy-MM-dd");
  var nowIso = now.toISOString();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    var sheet = getOrCreateCampaignSheet();
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < values.length; i++) {
      var rowDate = values[i][0];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(rowDate, "America/Chicago", "yyyy-MM-dd");
      }
      if (rowDate === dateStr && String(values[i][1]).toLowerCase() === tag) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > 0) {
      // Increment Conversions column (Col 4: D), update LastConvertedAt (Col 6: F)
      var currentConv = Number(values[rowIndex - 1][3]) || 0;
      sheet.getRange(rowIndex, 4).setValue(currentConv + 1);
      sheet.getRange(rowIndex, 6).setValue(nowIso);
    } else {
      // Append row: [Date, Tag, Scans, Conversions, LastScannedAt, LastConvertedAt]
      sheet.appendRow([dateStr, tag, 0, 1, "", nowIso]);
    }

    return createJsonResponse({ status: "success", action: "conversion_recorded", tag: tag, date: dateStr });
  } catch (err) {
    Logger.log("Error recording campaign conversion: " + err.toString());
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
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

    var start = startDateStr || defaultStart;
    var end = endDateStr || defaultEnd;

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

    // Process rows
    for (var i = 1; i < values.length; i++) {
      var rowDate = values[i][0];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(rowDate, "America/Chicago", "yyyy-MM-dd");
      }
      rowDate = String(rowDate).trim();
      if (!rowDate || rowDate < start || rowDate > end) {
        continue;
      }

      var tag = String(values[i][1] || "").toLowerCase().trim();
      var scans = Number(values[i][2]) || 0;
      var conversions = Number(values[i][3]) || 0;
      var lastScannedAt = String(values[i][4] || "");

      if (!tagTotalsMap[tag]) {
        tagTotalsMap[tag] = {
          tag: tag,
          totalScans: 0,
          totalConversions: 0,
          lastScannedAt: ""
        };
      }

      var tagRecord = tagTotalsMap[tag];
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
        if (!dailyMetricsMap[rowDate].channels[tag]) {
          dailyMetricsMap[rowDate].channels[tag] = { scans: 0, conversions: 0 };
        }
        dailyMetricsMap[rowDate].channels[tag].scans += scans;
        dailyMetricsMap[rowDate].channels[tag].conversions += conversions;
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

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "No POST payload received" });
    }

    if (e.postData.contents.length > 65536) {
      return createJsonResponse({ status: "error", message: "Payload size limit exceeded" });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
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

    // 3. Handle Campaign Analytics Query (Protected: Volunteer / Admin Only)
    if (action === "get_campaign_analytics" || action === "analytics") {
      var queryToken = data.idToken || (e.parameter ? e.parameter.idToken : "") || "";
      var isQueryAuthorized = false;
      if (queryToken) {
        var verifiedQueryCaller = verifyFirebaseIdToken(queryToken);
        if (verifiedQueryCaller && isAuthorizedCaller(verifiedQueryCaller.email, queryToken)) {
          isQueryAuthorized = true;
        }
      }

      if (!isQueryAuthorized) {
        return createJsonResponse({ 
          status: "error", 
          message: "Unauthorized: Valid Firebase ID token from an authorized volunteer or super admin is required." 
        });
      }

      return handleGetAnalytics(data.startDate || (e.parameter ? e.parameter.startDate : ""), data.endDate || (e.parameter ? e.parameter.endDate : ""));
    }

    // 4. Authenticated Email Dispatch Relay
    var isAuthorized = false;
    var senderEmail = "";

    if (data.idToken) {
      var verifiedCaller = verifyFirebaseIdToken(data.idToken);
      if (verifiedCaller && isAuthorizedCaller(verifiedCaller.email, data.idToken)) {
        isAuthorized = true;
        senderEmail = verifiedCaller.email;
      }
    }

    if (!isAuthorized) {
      return createJsonResponse({ 
        status: "error", 
        message: "Unauthorized: Valid Firebase ID token from an authorized volunteer or super admin is required." 
      });
    }

    if (!data.to || !data.subject || !data.htmlBody) {
      return createJsonResponse({ 
        status: "error", 
        message: "Missing required fields (to, subject, htmlBody)" 
      });
    }

    GmailApp.sendEmail(data.to, data.subject, data.plainText || "", {
      htmlBody: data.htmlBody,
      name: data.senderName || "SKY Meditation at UIUC",
      replyTo: "skyatuiuc@gmail.com"
    });

    return createJsonResponse({ 
      status: "success", 
      recipient: data.to,
      templateKey: data.templateKey || "custom",
      dispatchedBy: senderEmail,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  if (action === "get_campaign_analytics" || action === "analytics") {
    var idToken = e && e.parameter ? (e.parameter.idToken || "") : "";
    var isAuthorized = false;
    if (idToken) {
      var verifiedCaller = verifyFirebaseIdToken(idToken);
      if (verifiedCaller && isAuthorizedCaller(verifiedCaller.email, idToken)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return createJsonResponse({ 
        status: "error", 
        message: "Unauthorized: Valid Firebase ID token from an authorized volunteer or super admin is required." 
      });
    }

    return handleGetAnalytics(e.parameter.startDate, e.parameter.endDate);
  }

  return createJsonResponse({ 
    status: "online", 
    service: "SKY UIUC Relay & Campaign Engine",
    version: "4.2.0",
    time: new Date().toISOString()
  });
}
