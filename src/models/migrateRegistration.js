// One-time v1 -> v2 registration migration (pure transform; Firestore I/O lives in the Admin
// Data Maintenance panel). Idempotent: running it on an already-migrated document yields no changes.

import { STATUS, STATUS_OPTIONS, getGroupNumber } from './applicant';

// Redundant or derived v1 fields that v2 no longer stores
export const REMOVED_FIELDS = [
  'id', // duplicate of the document id
  'fullName', // firstName + lastName
  'interviewStatus', // merged into status
  'orientationStatus', // merged into status
  'interviewNotes', // moved to registration_private.notes
  'orientationNotes', // moved to registration_private.notes
  'notes', // volunteer-only, moved to registration_private
  'retreatTitle', // derived from retreat_history/{retreatId}
  'assignedGroup', // derived from groupId + retreat.groupConfig
  'attendedDaysCount', // derived from attendance
  'attendanceStatus', // derived from attendance
  'completed', // derived from attendance
  'isPaid', // folded into paymentStatus
  'paid', // folded into paymentStatus
  'paymentExempt', // exemption is derived from academicRole
  'agreeToAll3Days', // always "Yes" (required to submit)
  'groupUpdatedAt', // superseded by updatedAt
  'emailUpdatedAt' // superseded by sentEmails.*.sentAt
];

const normalizeStatus = (raw) => {
  const lower = String(raw || '').trim().toLowerCase();
  if (!lower) return null;
  if (lower.includes('approve') || lower.includes('accept')) return STATUS.APPROVED;
  if (lower.includes('withdraw')) return STATUS.WITHDRAWN;
  if (lower.includes('did not reply') || lower.includes('no reply')) return STATUS.DID_NOT_REPLY;
  if (lower.includes('pending') || lower.includes('progress')) return STATUS.PENDING;
  if (lower.includes('uncontacted')) return STATUS.UNCONTACTED;
  return null;
};

const SETTLED_PAYMENT_VALUES = ['paid', 'completed', 'waived', 'exempt'];

/**
 * @param {object} data registration document data (v1 or v2)
 * @returns {{ set: object, remove: string[], privateNotes: string|null, changed: boolean }}
 */
export function migrateRegistration(data) {
  const set = {};
  const remove = [];
  const assign = (field, value) => {
    if (data[field] !== value) set[field] = value;
  };

  // Status: orientationStatus is the field volunteers actually edited; it carries "Did Not Reply"
  // where the legacy `status` mirror only said "Pending".
  const status = normalizeStatus(data.orientationStatus) || normalizeStatus(data.interviewStatus) ||
    normalizeStatus(data.status) || STATUS.UNCONTACTED;
  if (!STATUS_OPTIONS.includes(data.status) || data.status !== status) assign('status', status);

  // Payment
  const settled = data.isPaid === true || data.paid === true || data.paid === 'true' ||
    SETTLED_PAYMENT_VALUES.includes(String(data.paymentStatus || '').trim().toLowerCase());
  if (settled) {
    assign('paymentStatus', 'Paid');
    if (!data.paidAt) assign('paidAt', data.updatedAt || data.appliedAt || null);
  } else {
    if ('paymentStatus' in data) remove.push('paymentStatus');
    if ('paidAt' in data) remove.push('paidAt');
  }

  // Group
  let groupId = getGroupNumber(data.groupId) !== null ? data.groupId : null;
  if (!groupId) {
    const fromName = /^group\s+(\d+)$/i.exec(String(data.assignedGroup || '').trim());
    if (fromName) groupId = `group-${fromName[1]}`;
  }
  if (groupId) assign('groupId', groupId);
  else if ('groupId' in data) remove.push('groupId');

  // Sent emails: fold literal "sentEmails.<key>" fields (written by a setDoc dot-path bug) into the map
  const sentEmails = { ...(data.sentEmails || {}) };
  let sentEmailsChanged = false;
  Object.keys(data).forEach((field) => {
    if (!field.startsWith('sentEmails.')) return;
    const key = field.slice('sentEmails.'.length);
    if (!sentEmails[key] && data[field] && typeof data[field] === 'object') {
      sentEmails[key] = data[field];
      sentEmailsChanged = true;
    }
    remove.push(field);
  });
  if (sentEmailsChanged) set.sentEmails = sentEmails;

  // Volunteer notes move to registration_private
  const notes = [data.orientationNotes, data.interviewNotes, data.notes]
    .map(n => (typeof n === 'string' ? n.trim() : ''))
    .find(Boolean) || null;

  REMOVED_FIELDS.forEach((field) => {
    if (field in data) remove.push(field);
  });

  return {
    set,
    remove: [...new Set(remove)],
    privateNotes: notes,
    changed: Object.keys(set).length > 0 || remove.length > 0
  };
}

/** Apply a migration result to a plain object (used by tests and the dry-run preview). */
export function applyMigrationToObject(data, result) {
  const next = { ...data, ...result.set };
  result.remove.forEach((field) => { delete next[field]; });
  return next;
}
