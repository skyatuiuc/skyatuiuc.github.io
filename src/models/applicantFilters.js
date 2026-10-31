// Shared applicant filtering & sorting (pure). Every roster surface - Volunteer orientation,
// Email Dispatch, Group Assignment, Attendance, Nametags - filters through these facets so the
// same filter means the same thing everywhere.

import {
  matchesSearch, getStatus, getPayment, PAYMENT, getGroupId, getRoleCategory, isVolunteerEmail,
  hasSentEmail, getAttendance, compareByAppliedAt, compareByName, compareByStatus, STATUS_OPTIONS
} from './applicant';

export const FILTER_DEFAULTS = Object.freeze({
  search: '',
  statuses: [], // empty = any status
  claim: 'all', // all | mine | unclaimed | others
  payment: 'all', // all | settled | unpaid | paid | exempt
  iahv: 'all', // all | yes | no
  group: 'all', // all | unassigned | group-N
  role: 'all', // all | ROLE_CATEGORY value
  people: 'all', // all | participants | volunteers
  email: 'all', // all | unsent:<templateKey> | sent:<templateKey> | needs_paypal
  attendance: 'all', // all | present:dayN | absent:dayN | complete | incomplete
  sort: 'oldest' // oldest | newest | name | status | lastContacted
});

const lower = (v) => String(v || '').trim().toLowerCase();

const FACET_MATCHERS = {
  search: (r, v) => matchesSearch(r, v),
  statuses: (r, v) => !v?.length || v.includes(getStatus(r)),
  claim: (r, v, ctx) => {
    const by = lower(r.claimedBy);
    const me = lower(ctx.userEmail);
    if (v === 'mine') return Boolean(by) && by === me;
    if (v === 'unclaimed') return !by;
    if (v === 'others') return Boolean(by) && by !== me;
    return true;
  },
  payment: (r, v) => {
    const status = getPayment(r).status;
    if (v === 'settled') return status !== PAYMENT.UNPAID;
    if (v === 'unpaid') return status === PAYMENT.UNPAID;
    if (v === 'paid') return status === PAYMENT.PAID;
    if (v === 'exempt') return status === PAYMENT.EXEMPT;
    return true;
  },
  iahv: (r, v) => (v === 'yes' ? Boolean(r.iahvRegistered) : v === 'no' ? !r.iahvRegistered : true),
  group: (r, v, ctx) => {
    if (v === 'all') return true;
    const groupId = getGroupId(r, ctx.retreat);
    return v === 'unassigned' ? !groupId : groupId === v;
  },
  role: (r, v) => v === 'all' || getRoleCategory(r) === v,
  people: (r, v, ctx) => {
    if (v === 'all') return true;
    const isVol = isVolunteerEmail(r.email, ctx.authorizedEmails);
    return v === 'volunteers' ? isVol : !isVol;
  },
  email: (r, v) => {
    if (v === 'all') return true;
    if (v === 'needs_paypal') return getPayment(r).status === PAYMENT.UNPAID && !String(r.paypalLink || '').trim();
    const [mode, key] = v.split(':');
    if (mode === 'unsent') return !hasSentEmail(r, key);
    if (mode === 'sent') return hasSentEmail(r, key);
    return true;
  },
  attendance: (r, v) => {
    if (v === 'all') return true;
    const att = getAttendance(r);
    if (v === 'complete') return att.isComplete;
    if (v === 'incomplete') return !att.isComplete;
    const [mode, day] = v.split(':');
    if (mode === 'present') return att.days[day] === true;
    if (mode === 'absent') return att.days[day] !== true;
    return true;
  }
};

const lastContactedMs = (r) => {
  const ms = Date.parse(r.lastContactedDate || '');
  return Number.isNaN(ms) ? 0 : ms;
};

export const SORTERS = {
  oldest: compareByAppliedAt,
  newest: (a, b) => compareByAppliedAt(b, a),
  name: compareByName,
  status: (a, b) => compareByStatus(a, b) || compareByAppliedAt(a, b),
  lastContacted: (a, b) => lastContactedMs(b) - lastContactedMs(a) || compareByAppliedAt(a, b)
};

/**
 * @param {object[]} registrations
 * @param {object} filters FILTER_DEFAULTS-shaped
 * @param {{userEmail?: string, retreat?: object, authorizedEmails?: string[]}} ctx
 * @param {string[]} [skipFacets] facets to ignore (used to compute per-status counts)
 */
export function filterApplicants(registrations, filters, ctx = {}, skipFacets = []) {
  const active = Object.keys(FACET_MATCHERS).filter(f => !skipFacets.includes(f) && filters[f] !== undefined);
  const list = registrations.filter(r => active.every(f => FACET_MATCHERS[f](r, filters[f], ctx)));
  return list.sort(SORTERS[filters.sort] || SORTERS.oldest);
}

/** Per-status counts for the list as filtered by every facet except status (for the status chips). */
export function countByStatus(registrations, filters, ctx = {}) {
  const counts = Object.fromEntries(STATUS_OPTIONS.map(s => [s, 0]));
  filterApplicants(registrations, filters, ctx, ['statuses']).forEach((r) => { counts[getStatus(r)] += 1; });
  return counts;
}

/** Number of facets that differ from their defaults (excluding sort). */
export function countActiveFilters(filters) {
  return Object.keys(FACET_MATCHERS).filter((f) => {
    const v = filters[f];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== FILTER_DEFAULTS[f];
  }).length;
}
