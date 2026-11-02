// Canonical registration model (schema v2).
//
// Every screen that shows, filters, sorts or exports applicants reads them through these
// helpers, so the Volunteer roster, Email Dispatch, Groups, Attendance, Nametags and CSV
// export always agree. Pure functions only (no Firebase imports) so they are unit-testable
// and shared with the data migration.
//
// Registration document (registrations/{email}_{retreatId}):
//   email, retreatId, firstName, lastName, phone, academicRole, isOver18, completedSkyBefore,
//   healthConditions[], otherHealthConditions, foodAllergies, referralSource,
//   status (see STATUS; 'Volunteer' marks retreat volunteers), paymentStatus?, paidAt?, paypalLink?, iahvRegistered?, groupId?,
//   attendance? {day1, day2, day3, updatedBy, lastUpdated}, sentEmails? {key: record},
//   claimedBy?, claimedByName?, lastContactedDate?, appliedAt, updatedAt
// Volunteer notes live in registration_private/{same id} {retreatId, notes, updatedAt, updatedBy}
// and are merged onto the registration as `notes` by the roster provider.

import { getFeeAmount } from '../data/pricingData';

// v3: volunteers are identified by `status: 'Volunteer'` on their registration, not the access list
export const SCHEMA_VERSION = 3;

// Pseudo-retreat for applications submitted while no retreat was open
export const GENERAL_RETREAT_ID = 'general';
export const GENERAL_RETREAT_TITLE = 'General Interest List';
export const GENERAL_RETREAT = Object.freeze({ id: GENERAL_RETREAT_ID, title: GENERAL_RETREAT_TITLE, isGeneral: true });

// ---------- Identity ----------

export const registrationId = (email, retreatId) => `${String(email).trim().toLowerCase()}_${retreatId}`;

export const getDisplayName = (reg) => {
  const name = `${reg?.firstName || ''} ${reg?.lastName || ''}`.trim();
  return name || reg?.email || 'Unnamed applicant';
};

export const getAppliedAtMs = (reg) => {
  const ms = Date.parse(reg?.appliedAt || '');
  return Number.isNaN(ms) ? 0 : ms;
};

// ---------- Status ----------

export const STATUS = Object.freeze({
  UNCONTACTED: 'Uncontacted',
  PENDING: 'Pending',
  DID_NOT_REPLY: 'Did Not Reply',
  APPROVED: 'Approved',
  VOLUNTEER: 'Volunteer', // helping at the retreat (volunteers register for every retreat they help at)
  WITHDRAWN: 'Withdrawn'
});

// Workflow order, used for dropdowns and sorting
export const STATUS_OPTIONS = [STATUS.UNCONTACTED, STATUS.PENDING, STATUS.DID_NOT_REPLY, STATUS.APPROVED, STATUS.VOLUNTEER, STATUS.WITHDRAWN];

export const STATUS_STYLES = Object.freeze({
  [STATUS.UNCONTACTED]: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  [STATUS.PENDING]: { bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
  [STATUS.DID_NOT_REPLY]: { bg: '#FFEDD5', color: '#C2410C', border: '#FDBA74' },
  [STATUS.APPROVED]: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  [STATUS.VOLUNTEER]: { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D' },
  [STATUS.WITHDRAWN]: { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' }
});

// Display labels where the stored value is not the best wording ('Volunteer' = present at the retreat
// as a volunteer, distinct from Volunteer Access to the portal)
export const STATUS_LABELS = Object.freeze({
  [STATUS.VOLUNTEER]: 'Volunteering'
});

export const getStatusLabel = (status) => STATUS_LABELS[status] || status;

export const getStatus = (reg) => (STATUS_OPTIONS.includes(reg?.status) ? reg.status : STATUS.UNCONTACTED);

export const isVolunteerRegistration = (reg) => getStatus(reg) === STATUS.VOLUNTEER;

// Approved participants plus volunteers: the people expected at the retreat (attendance, nametags)
export const isAttending = (reg) => [STATUS.APPROVED, STATUS.VOLUNTEER].includes(getStatus(reg));

// ---------- Academic role ----------

export const ROLE_CATEGORY = Object.freeze({
  UNDERGRADUATE: 'undergraduate',
  GRADUATE: 'graduate', // Graduate + PhD students
  SCHOLAR: 'scholar', // Post-docs, visiting scholars
  FACULTY: 'faculty',
  NON_UIUC_STUDENT: 'non_uiuc_student',
  COMMUNITY: 'community' // Alumni / affiliates / non-students
});

export const ROLE_CATEGORY_LABELS = Object.freeze({
  [ROLE_CATEGORY.UNDERGRADUATE]: 'Undergraduate',
  [ROLE_CATEGORY.GRADUATE]: 'Graduate / PhD',
  [ROLE_CATEGORY.SCHOLAR]: 'Post-doc / Scholar',
  [ROLE_CATEGORY.FACULTY]: 'Faculty / Staff',
  [ROLE_CATEGORY.NON_UIUC_STUDENT]: 'Non-UIUC Student',
  [ROLE_CATEGORY.COMMUNITY]: 'Alumni / Community'
});

export const getRoleCategory = (reg) => {
  const role = String(reg?.academicRole || '').trim().toLowerCase();
  if (!role) return ROLE_CATEGORY.COMMUNITY;
  if (role.includes('non-uiuc student') || role.includes('non uiuc student')) return ROLE_CATEGORY.NON_UIUC_STUDENT;
  if (role.includes('undergrad')) return ROLE_CATEGORY.UNDERGRADUATE;
  if (role.includes('phd') || role.includes('graduate') || role.includes('grad student')) return ROLE_CATEGORY.GRADUATE;
  if (role.includes('post-doc') || role.includes('postdoc') || role.includes('scholar')) return ROLE_CATEGORY.SCHOLAR;
  if (role.includes('faculty') || role.includes('staff')) return ROLE_CATEGORY.FACULTY;
  return ROLE_CATEGORY.COMMUNITY;
};

// ---------- Payment ----------

export const PAYMENT = Object.freeze({ EXEMPT: 'Exempt', PAID: 'Paid', UNPAID: 'Unpaid' });

// Fee comes from the academic role; `paymentStatus: 'Paid'` (with paidAt) records settlement,
// including fees a volunteer waived.
export const getPayment = (reg) => {
  const amount = getFeeAmount(reg?.academicRole);
  let status = PAYMENT.UNPAID;
  if (amount === 0) status = PAYMENT.EXEMPT;
  else if (reg?.paymentStatus === PAYMENT.PAID) status = PAYMENT.PAID;
  return {
    amount,
    formattedFee: `$${amount}`,
    status,
    isSettled: status !== PAYMENT.UNPAID
  };
};

// ---------- Groups ----------

export const groupIdFor = (n) => `group-${n}`;

export const getGroupNumber = (groupId) => {
  const match = /^group-(\d+)$/.exec(groupId || '');
  return match ? Number(match[1]) : null;
};

// null when unassigned (or assigned to a group index beyond the retreat's current group count)
export const getGroupId = (reg, retreat) => {
  const n = getGroupNumber(reg?.groupId);
  if (n === null) return null;
  const numGroups = retreat?.groupConfig?.numGroups;
  if (numGroups && n > numGroups) return null;
  return reg.groupId;
};

export const getGroupName = (groupId, retreat) => {
  const n = getGroupNumber(groupId);
  if (n === null) return 'Unassigned';
  return retreat?.groupConfig?.groupNames?.[groupId] || `Group ${n}`;
};

// ---------- Attendance ----------

export const RETREAT_DAYS = ['day1', 'day2', 'day3'];

export const getAttendance = (reg) => {
  const a = reg?.attendance || {};
  const days = Object.fromEntries(RETREAT_DAYS.map(d => [d, a[d] === true]));
  const attendedCount = RETREAT_DAYS.filter(d => days[d]).length;
  const isComplete = attendedCount === RETREAT_DAYS.length;
  return {
    days,
    attendedCount,
    isComplete,
    label: isComplete ? 'Completed' : attendedCount > 0 ? 'In Progress' : 'Not Started'
  };
};

// ---------- Emails ----------

// Approved applicants get one of two acceptance templates; both are tracked under one key
export const sentEmailKey = (templateKey) => (String(templateKey).startsWith('application_accepted') ? 'application_accepted' : templateKey);

export const hasSentEmail = (reg, templateKey) => Boolean(reg?.sentEmails?.[sentEmailKey(templateKey)]?.sent);

// ---------- Moving between retreats ----------

// Fields that describe one retreat's logistics; they do not carry over when a registration moves
export const RETREAT_SCOPED_FIELDS = ['groupId', 'attendance', 'paymentStatus', 'paidAt', 'paypalLink', 'iahvRegistered', 'sentEmails'];

/**
 * Registration data for the same person in another retreat (e.g. from the General Interest List).
 * Keeps their answers, status, claim and contact history; drops retreat-scoped fields and the
 * roster's merged-in `id`/`notes` (notes live in registration_private).
 */
export const buildMovedRegistration = (reg, targetRetreatId, nowIso) => {
  const { id: _id, notes: _notes, ...data } = reg;
  RETREAT_SCOPED_FIELDS.forEach((field) => { delete data[field]; });
  return { ...data, retreatId: targetRetreatId, updatedAt: nowIso };
};

/**
 * Who each email is meant for. Email Dispatch skips anyone else unless an admin explicitly overrides.
 * @returns {{ eligible: boolean, reason: string }}
 */
export const getEmailEligibility = (reg, templateKey) => {
  const status = getStatus(reg);
  const key = sentEmailKey(templateKey);
  if (status === STATUS.WITHDRAWN) return { eligible: false, reason: 'has withdrawn' };
  if (key === 'application_accepted' || key === 'reminder') {
    return status === STATUS.APPROVED ? { eligible: true, reason: '' } : { eligible: false, reason: 'is not Approved' };
  }
  if (key === 'welcome') {
    return isAttending(reg) ? { eligible: true, reason: '' } : { eligible: false, reason: 'is not Approved or Volunteering' };
  }
  if (key === 'completion') {
    return getAttendance(reg).isComplete ? { eligible: true, reason: '' } : { eligible: false, reason: 'has not attended all 3 days' };
  }
  return { eligible: true, reason: '' };
};

// ---------- Search ----------

export const matchesSearch = (reg, query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  const haystack = [getDisplayName(reg), reg?.email, reg?.academicRole, reg?.referralSource]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (haystack.includes(q)) return true;
  return digits.length >= 3 && String(reg?.phone || '').replace(/\D/g, '').includes(digits);
};

// ---------- Sorting ----------

export const compareByAppliedAt = (a, b) => getAppliedAtMs(a) - getAppliedAtMs(b) || getDisplayName(a).localeCompare(getDisplayName(b));
export const compareByName = (a, b) => getDisplayName(a).localeCompare(getDisplayName(b));
export const compareByStatus = (a, b) => STATUS_OPTIONS.indexOf(getStatus(a)) - STATUS_OPTIONS.indexOf(getStatus(b));
