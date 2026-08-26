import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { logDatabaseOperation } from './telemetryService';
import { EMAIL_TEMPLATES } from '../templates/emailTemplates';
import { getRetreatDaySchedule } from '../data/scheduleData';
import { getFeeAmount } from '../data/pricingData';

export const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const sanitizeUrl = (url, fallback = '#') => {
  if (!url || typeof url !== 'string') return fallback;
  const clean = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(clean)) {
    return clean;
  }
  if (clean.startsWith('www.')) {
    return `https://${clean}`;
  }
  return fallback;
};

export const DEFAULT_EMAIL_SETTINGS = {
  webhookUrl: import.meta.env?.VITE_EMAIL_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzQ71gX5P3H0V7Z-EXAMPLE/exec', // Configurable Google Apps Script Webhook
  senderEmail: 'skyatuiuc@gmail.com',
  senderName: 'SKY Meditation at UIUC',
  clubEmail: 'skyatuiuc@gmail.com',
  contactName: 'SKY at UIUC Executive Team',
  contactPhone: 'Inquiries via email',
  contactEmail: 'skyatuiuc@gmail.com',
  sattvaLink: 'https://www.sattva.life/',
  whatsAppLink: import.meta.env?.VITE_WHATSAPP_LINK || 'https://chat.whatsapp.com/YOUR_WHATSAPP_INVITE_CODE',
  surveyLink: import.meta.env?.VITE_SURVEY_LINK || 'https://forms.gle/YOUR_SURVEY_FORM_ID',
  dailyPracticeLink: import.meta.env?.VITE_DAILY_PRACTICE_LINK || 'https://illinois.zoom.us/j/YOUR_ZOOM_MEETING_ID',
  defaultRegistrationLink: 'https://members.us.iahv.org/us-en/course/checkout'
};

// Robust Fee and Payment Status Parser
export const parseFeeAndPayment = (participant) => {
  if (!participant) return { amount: 0, formattedFee: '$0', isPaid: true, requiresPayment: false };

  // 1. Determine numeric fee amount
  let feeNum = null;
  
  if (participant.fee !== undefined && participant.fee !== null && participant.fee !== '') {
    const parsed = typeof participant.fee === 'number' ? participant.fee : parseFloat(String(participant.fee).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      feeNum = parsed;
    }
  }

  if (feeNum === null && participant.feeTier) {
    const tierStr = String(participant.feeTier);
    const match = tierStr.match(/\$(\d+)/);
    if (match) {
      feeNum = parseInt(match[1], 10);
    } else if (tierStr.toLowerCase().includes('free') || tierStr.toLowerCase().includes('student') || tierStr.toLowerCase().includes('undergrad') || tierStr.includes('$0')) {
      feeNum = 0;
    }
  }

  if (feeNum === null && participant.academicRole) {
    feeNum = getFeeAmount(participant.academicRole);
  }

  // Fallback default
  if (feeNum === null || isNaN(feeNum)) {
    feeNum = 20; // UIUC Student default subsidized fee
  }

  const isFreeTier = feeNum === 0;

  // 2. Determine Paid Status
  const rawStatus = (participant.paymentStatus || '').toLowerCase().trim();
  const rawPaidFlag = participant.paid === true || participant.paid === 'true';

  let isPaid = false;
  if (isFreeTier) {
    isPaid = true;
  } else if (rawPaidFlag || rawStatus === 'paid' || rawStatus === 'completed' || rawStatus === 'waived') {
    isPaid = true;
  } else {
    isPaid = false;
  }

  return {
    amount: feeNum,
    formattedFee: `$${feeNum}`,
    isPaid,
    requiresPayment: !isPaid && !isFreeTier
  };
};

// Check if participant requires payment
export const checkRequiresPayment = (participant) => {
  const parsed = parseFeeAndPayment(participant);
  return parsed.requiresPayment;
};

// Compile email template payload with variables
export const compileEmailPayload = (templateTypeKey, participant, retreat, emailSettings = {}) => {
  const settings = { ...DEFAULT_EMAIL_SETTINGS, ...emailSettings };
  
  let effectiveTemplateKey = templateTypeKey;
  const isPaying = checkRequiresPayment(participant);

  // Intelligent Acceptance Template Resolution: Standard vs PayPal
  if (templateTypeKey === 'application_accepted' || templateTypeKey === 'application_accepted_standard' || templateTypeKey === 'application_accepted_paypal') {
    if (isPaying) {
      // Validate PayPal Link existence
      const link = (participant.paypalLink || '').trim();
      if (!link) {
        throw new Error(`Missing PayPal Invoice Link for ${participant.name || participant.email}. Please provide a PayPal link on their row before sending.`);
      }
      effectiveTemplateKey = 'application_accepted_paypal';
    } else {
      effectiveTemplateKey = 'application_accepted_standard';
    }
  }

  const template = EMAIL_TEMPLATES[effectiveTemplateKey];
  if (!template) {
    throw new Error(`Email template "${templateTypeKey}" not found.`);
  }

  // Dynamic Retreat Schedule Computation
  const schedule = getRetreatDaySchedule(retreat);
  const day1 = schedule[0] || { fullLabel: 'Friday', time: retreat?.fridayTime || '6:30 PM – 9:30 PM' };
  const day2 = schedule[1] || { fullLabel: 'Saturday', time: retreat?.saturdayTime || '10:00 AM – 2:00 PM' };
  const day3 = schedule[2] || { fullLabel: 'Sunday', time: retreat?.sundayTime || '10:00 AM – 2:00 PM' };

  const dates = retreat?.startDate && retreat?.endDate 
    ? `${escapeHtml(retreat.startDate)} to ${escapeHtml(retreat.endDate)}`
    : escapeHtml(retreat?.title || 'Upcoming Retreat');

  const cleanPaypalLink = sanitizeUrl(participant.paypalLink);
  const formattedPaypalLink = cleanPaypalLink !== '#' ? cleanPaypalLink : '';

  const templateData = {
    firstName: escapeHtml(participant.firstName || (participant.name || '').split(' ')[0] || 'Participant'),
    lastName: escapeHtml(participant.lastName || ''),
    name: escapeHtml(participant.name || participant.email),
    email: escapeHtml(participant.email),
    phone: escapeHtml(participant.phone || ''),
    academicRole: escapeHtml(participant.academicRole || 'Participant'),
    feeTier: escapeHtml(participant.feeTier || 'Standard'),
    paymentStatus: escapeHtml(participant.paymentStatus || 'Pending'),
    paypalLink: formattedPaypalLink,
    dates,
    day1Label: escapeHtml(day1.fullLabel),
    day1Time: escapeHtml(day1.time),
    day2Label: escapeHtml(day2.fullLabel),
    day2Time: escapeHtml(day2.time),
    day3Label: escapeHtml(day3.fullLabel),
    day3Time: escapeHtml(day3.time),
    fridayDate: escapeHtml(day1.fullLabel),
    fridayTime: escapeHtml(day1.time),
    saturdayDate: escapeHtml(day2.fullLabel),
    saturdayTime: escapeHtml(day2.time),
    sundayDate: escapeHtml(day3.fullLabel),
    sundayTime: escapeHtml(day3.time),
    weekendDates: `${escapeHtml(day2.fullLabel)} & ${escapeHtml(day3.fullLabel)}`,
    weekendTime: day2.time === day3.time ? escapeHtml(day2.time) : `${escapeHtml(day2.time)} (Sat), ${escapeHtml(day3.time)} (Sun)`,
    location: escapeHtml(retreat?.location || 'Sidney Lu Mechanical Engineering Building, Room 2100'),
    address: escapeHtml(retreat?.address || ''),
    fullLocationString: escapeHtml(retreat?.location ? `${retreat.location}${retreat.address ? ` (${retreat.address})` : ''}` : 'Sidney Lu Mechanical Engineering Building, Room 2100'),
    teachers: escapeHtml(retreat?.teachers || 'SKY Certified Teachers'),
    registrationLink: sanitizeUrl(retreat?.registrationLink || settings.defaultRegistrationLink),
    clubEmail: escapeHtml(settings.clubEmail || 'skyatuiuc@gmail.com'),
    contactName: escapeHtml(retreat?.contactName || settings.contactName),
    contactPhone: escapeHtml(retreat?.contactPhone || settings.contactPhone),
    contactEmail: escapeHtml(retreat?.contactEmail || settings.contactEmail),
    sattvaLink: sanitizeUrl(settings.sattvaLink),
    whatsAppLink: sanitizeUrl(settings.whatsAppLink),
    surveyLink: sanitizeUrl(settings.surveyLink),
    dailyPracticeLink: sanitizeUrl(settings.dailyPracticeLink)
  };

  const htmlBody = template.renderHtml(templateData);
  const plainText = htmlBody
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return {
    templateKey: effectiveTemplateKey,
    templateName: template.name,
    subject: template.subject,
    recipientEmail: participant.email,
    recipientName: participant.name || participant.email,
    senderEmail: settings.senderEmail || 'skyatuiuc@gmail.com',
    senderName: settings.senderName || 'SKY Meditation at UIUC',
    htmlBody,
    plainText,
    isPaying,
    paypalLink: formattedPaypalLink
  };
};

// Send single email and persist status
export const sendSingleEmail = async (templateTypeKey, participant, retreat, emailSettings = {}, currentUser = null) => {
  if (!participant?.email) {
    throw new Error("Cannot send email: participant has no email address.");
  }

  // 1. Prepare and validate email payload
  const payload = compileEmailPayload(templateTypeKey, participant, retreat, emailSettings);

  const settings = { ...DEFAULT_EMAIL_SETTINGS, ...emailSettings };
  const webhookUrl = settings.webhookUrl?.trim();
  const isConfiguredWebhook = webhookUrl && webhookUrl.startsWith('https://script.google.com/macros/s/') && !webhookUrl.includes('EXAMPLE');

  if (!isConfiguredWebhook) {
    throw new Error("Gmail Webhook URL is not configured yet. Please open 'Email Settings & Links', deploy the Google Apps Script connector under skyatuiuc@gmail.com, and paste your Web App URL.");
  }

  // 2. Obtain caller's live Firebase Auth ID Token for authenticated relay
  let idToken = '';
  if (auth?.currentUser) {
    try {
      idToken = await auth.currentUser.getIdToken(false);
    } catch (tokenErr) {
      console.warn("Could not retrieve fresh Firebase ID token:", tokenErr);
    }
  }

  // 3. Dispatch via Google Apps Script Webhook
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'send_email',
        idToken,
        sender: 'skyatuiuc@gmail.com',
        to: payload.recipientEmail,
        toName: payload.recipientName,
        subject: payload.subject,
        htmlBody: payload.htmlBody,
        plainText: payload.plainText,
        templateKey: payload.templateKey,
        participantId: participant.id
      })
    });

    // Inspect real JSON response from Google Apps Script
    const rawText = await response.text();
    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      throw new Error(`Apps Script dispatch failed (Non-JSON response): ${rawText.slice(0, 120)}`);
    }

    if (!result || result.status !== 'success') {
      throw new Error(result?.message || 'Apps Script email dispatch rejected.');
    }
  } catch (err) {
    console.error("Apps Script Webhook request error:", err);
    throw new Error(`Failed to dispatch email via Apps Script Webhook: ${err.message}`);
  }

  // 3. Update sent record in participant registration
  const sentRecord = {
    sent: true,
    sentAt: new Date().toISOString(),
    sentBy: currentUser?.email || 'skyatuiuc@gmail.com',
    templateKey: payload.templateKey,
    subject: payload.subject,
    paypalLinkUsed: payload.paypalLink || null
  };

  // Canonical key for status tracking
  const stateKey = (templateTypeKey.startsWith('application_accepted')) ? 'application_accepted' : templateTypeKey;

  const currentSentEmails = participant.sentEmails || {};
  const updatedSentEmails = {
    ...currentSentEmails,
    [stateKey]: sentRecord
  };

  // 4. Save to Firestore & localStorage
  if (participant.id && isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'registrations', participant.id), {
        sentEmails: updatedSentEmails,
        emailUpdatedAt: new Date().toISOString()
      }, { merge: true });
      logDatabaseOperation(0, 1, 0);
    } catch (err) {
      console.warn("Error saving email status to Firestore:", err);
    }
  }

  return {
    success: true,
    subject: payload.subject,
    templateName: payload.templateName,
    payload,
    sentRecord,
    updatedSentEmails
  };
};

// Batch email sender with parallel execution & error reporting
export const sendBatchEmails = async (templateTypeKey, participants, retreat, emailSettings = {}, currentUser = null, onProgress = null) => {
  const results = {
    successes: [],
    failures: []
  };

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (onProgress) {
      onProgress(i + 1, participants.length, p);
    }

    try {
      const res = await sendSingleEmail(templateTypeKey, p, retreat, emailSettings, currentUser);
      results.successes.push({ participant: p, result: res });
    } catch (err) {
      results.failures.push({ participant: p, error: err.message });
    }
  }

  return results;
};
