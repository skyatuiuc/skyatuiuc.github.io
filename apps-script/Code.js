/**
 * GOOGLE APPS SCRIPT EMAIL DISPATCH RELAY FOR SKY AT UIUC
 * 
 * Version: 3.3.0
 * Managed in GitHub repository: https://github.com/skyatuiuc/skyatuiuc.github.io
 * 
 * Deployed as a Web App:
 * - Execute as: Me (skyatuiuc@gmail.com)
 * - Who has access: Anyone
 */

// Super Admin Identity & Firebase Project Configuration
var SUPER_ADMIN_EMAIL = "skyatuiuc@gmail.com";
var FIREBASE_PROJECT_ID = "skyatuiuc-web";

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

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "No POST payload received" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var isAuthorized = false;
    var senderEmail = "";

    // Primary Authentication: Firebase Auth ID Token Verification
    if (data.idToken) {
      var verifiedCaller = verifyFirebaseIdToken(data.idToken);
      if (verifiedCaller && isAuthorizedCaller(verifiedCaller.email, data.idToken)) {
        isAuthorized = true;
        senderEmail = verifiedCaller.email;
      }
    }

    if (!isAuthorized) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Unauthorized: Valid Firebase ID token from an authorized volunteer or super admin is required." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Validate required payload fields
    if (!data.to || !data.subject || !data.htmlBody) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Missing required fields (to, subject, htmlBody)" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Dispatch email natively using GmailApp
    GmailApp.sendEmail(data.to, data.subject, data.plainText || "", {
      htmlBody: data.htmlBody,
      name: data.senderName || "SKY Meditation at UIUC",
      replyTo: "skyatuiuc@gmail.com"
    });

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      recipient: data.to,
      templateKey: data.templateKey || "custom",
      dispatchedBy: senderEmail,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    service: "SKY UIUC Email Relay",
    version: "3.2.0",
    authMode: "Firebase Auth ID Token (Native JWT)",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
