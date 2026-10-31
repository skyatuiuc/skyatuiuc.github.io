// Read-only schema health check for registrations (schema v3). Pure, so it is unit tested and runs
// in the Admin Data tab without writing anything.

import { STATUS_OPTIONS, GENERAL_RETREAT_ID, getGroupNumber, registrationId, RETREAT_DAYS } from './applicant';

// Every field a v3 registration may carry (see the model header in applicant.js)
export const V3_FIELDS = new Set([
  'email', 'retreatId', 'firstName', 'lastName', 'phone', 'academicRole', 'isOver18', 'completedSkyBefore',
  'healthConditions', 'otherHealthConditions', 'foodAllergies', 'referralSource',
  'status', 'paymentStatus', 'paidAt', 'paypalLink', 'iahvRegistered', 'groupId', 'attendance', 'sentEmails',
  'claimedBy', 'claimedByName', 'lastContactedDate', 'appliedAt', 'updatedAt'
]);

const ATTENDANCE_FIELDS = new Set([...RETREAT_DAYS, 'updatedBy', 'lastUpdated']);

/**
 * @param {string} id document id
 * @param {object} data registration document data
 * @param {Set<string>} retreatIds ids of existing retreats
 * @returns {string[]} human-readable problems (empty when healthy)
 */
export function checkRegistration(id, data, retreatIds) {
  const problems = [];
  const unknown = Object.keys(data).filter(k => !V3_FIELDS.has(k));
  if (unknown.length) problems.push(`unexpected fields: ${unknown.join(', ')}`);
  if (!data.email) problems.push('missing email');
  if (!data.retreatId) problems.push('missing retreatId');
  else if (data.retreatId !== GENERAL_RETREAT_ID && !retreatIds.has(data.retreatId)) problems.push(`retreat ${data.retreatId} no longer exists`);
  if (data.email && data.retreatId && id !== registrationId(data.email, data.retreatId)) problems.push('document id does not match {email}_{retreatId}');
  if (!STATUS_OPTIONS.includes(data.status)) problems.push(`invalid status "${data.status ?? ''}"`);
  if ('groupId' in data && getGroupNumber(data.groupId) === null) problems.push(`invalid groupId "${data.groupId}"`);
  if ('paymentStatus' in data && data.paymentStatus !== 'Paid') problems.push(`invalid paymentStatus "${data.paymentStatus}"`);
  if (data.attendance && typeof data.attendance === 'object') {
    const extra = Object.keys(data.attendance).filter(k => !ATTENDANCE_FIELDS.has(k));
    if (extra.length) problems.push(`unexpected attendance fields: ${extra.join(', ')}`);
  }
  return problems;
}

/**
 * @param {{id: string, data: object}[]} registrations
 * @param {{id: string}[]} privateNotes registration_private documents
 * @param {Set<string>} retreatIds
 */
export function checkSchemaHealth(registrations, privateNotes, retreatIds) {
  const issues = [];
  registrations.forEach(({ id, data }) => {
    const problems = checkRegistration(id, data, retreatIds);
    if (problems.length) issues.push({ id, problems });
  });
  const registrationIds = new Set(registrations.map(r => r.id));
  const orphanNotes = privateNotes.filter(n => !registrationIds.has(n.id)).map(n => n.id);
  return { total: registrations.length, issues, orphanNotes };
}
