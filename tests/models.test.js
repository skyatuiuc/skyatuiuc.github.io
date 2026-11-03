import { describe, it, expect } from 'vitest';
import { dateKeyChicago, daysBetweenKeys, addDaysToKey } from '../src/utils/dateUtils';
import { getRoleCategory, ROLE_CATEGORY, getPayment, getGroupId, getGroupName, matchesSearch, getStatus, compareByAppliedAt, isAttending, isVolunteerRegistration } from '../src/models/applicant';
import { ACADEMIC_ROLE_OPTIONS } from '../src/data/pricingData';

describe('dateUtils', () => {
  it('uses the Chicago calendar date, not the UTC one', () => {
    // Friday 2026-09-11 7:30 pm CDT == Saturday 00:30 UTC
    expect(dateKeyChicago(new Date('2026-09-12T00:30:00Z'))).toBe('2026-09-11');
    expect(dateKeyChicago(new Date('2026-09-12T05:30:00Z'))).toBe('2026-09-12');
    // CST (winter)
    expect(dateKeyChicago(new Date('2026-12-01T05:59:00Z'))).toBe('2026-11-30');
  });
  it('does date-key arithmetic', () => {
    expect(daysBetweenKeys('2026-09-11', '2026-09-13')).toBe(2);
    expect(addDaysToKey('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('applicant model', () => {
  it('categorises roles without substring collisions (Undergraduate is not Graduate)', () => {
    expect(getRoleCategory({ academicRole: 'Undergraduate Student' })).toBe(ROLE_CATEGORY.UNDERGRADUATE);
    expect(getRoleCategory({ academicRole: 'Graduate Student' })).toBe(ROLE_CATEGORY.GRADUATE);
    expect(getRoleCategory({ academicRole: 'PhD Student' })).toBe(ROLE_CATEGORY.GRADUATE);
    expect(getRoleCategory({ academicRole: 'Non-UIUC Student' })).toBe(ROLE_CATEGORY.NON_UIUC_STUDENT);
    expect(getRoleCategory({ academicRole: 'Alumni / Non-UIUC Affiliate / Non-Student' })).toBe(ROLE_CATEGORY.COMMUNITY);
    expect(getRoleCategory({ academicRole: 'Post-Doctorate' })).toBe(ROLE_CATEGORY.SCHOLAR);
    expect(getRoleCategory({ academicRole: 'UIUC Faculty / Staff' })).toBe(ROLE_CATEGORY.FACULTY);
    // Every role offered on the form maps somewhere sensible
    for (const opt of ACADEMIC_ROLE_OPTIONS) expect(Object.values(ROLE_CATEGORY)).toContain(getRoleCategory({ academicRole: opt.value }));
  });

  it('derives payment from role and paymentStatus', () => {
    expect(getPayment({ academicRole: 'Graduate Student' }).status).toBe('Exempt');
    expect(getPayment({ academicRole: 'UIUC Faculty / Staff' }).status).toBe('Unpaid');
    expect(getPayment({ academicRole: 'UIUC Faculty / Staff', paymentStatus: 'Paid' })).toMatchObject({ status: 'Paid', amount: 50, isSettled: true });
  });

  it('resolves groups and names', () => {
    const retreat = { groupConfig: { numGroups: 4, groupNames: { 'group-2': 'Lotus' } } };
    expect(getGroupId({ groupId: 'group-2' }, retreat)).toBe('group-2');
    expect(getGroupId({ groupId: 'group-7' }, retreat)).toBeNull();
    expect(getGroupId({}, retreat)).toBeNull();
    expect(getGroupName('group-2', retreat)).toBe('Lotus');
    expect(getGroupName('group-3', retreat)).toBe('Group 3');
    expect(getGroupName(null, retreat)).toBe('Unassigned');
  });

  it('searches name, email, role and phone digits', () => {
    const reg = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.edu', phone: '(217) 555-1234', academicRole: 'PhD Student' };
    expect(matchesSearch(reg, 'lovelace')).toBe(true);
    expect(matchesSearch(reg, '555-12')).toBe(true);
    expect(matchesSearch(reg, 'phd')).toBe(true);
    expect(matchesSearch(reg, 'zzz')).toBe(false);
    expect(matchesSearch(reg, '')).toBe(true);
  });

  it('treats Approved and Volunteer as attending; only Volunteer as a volunteer', () => {
    expect(['Approved', 'Volunteer', 'Pending', 'Withdrawn'].map(status => isAttending({ status }))).toEqual([true, true, false, false]);
    expect(['Approved', 'Volunteer'].map(status => isVolunteerRegistration({ status }))).toEqual([false, true]);
  });

  it('treats unknown status as Uncontacted and sorts oldest first', () => {
    expect(getStatus({ status: 'weird' })).toBe('Uncontacted');
    const a = { firstName: 'B', appliedAt: '2026-09-01T00:00:00Z' };
    const b = { firstName: 'A', appliedAt: '2026-09-02T00:00:00Z' };
    expect([b, a].sort(compareByAppliedAt)[0]).toBe(a);
  });
});

import { registrationsToCsv, escapeCsvCell } from '../src/utils/exportUtils';

describe('CSV export', () => {
  it('escapes quotes and neutralises formula injection', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(escapeCsvCell(['a', 'b'])).toBe('"a; b"');
  });
  it('exports real fields through the model', () => {
    const retreat = { groupConfig: { numGroups: 3, groupNames: {} } };
    const csv = registrationsToCsv([{
      firstName: 'Ada', lastName: 'L', email: 'ada@x.edu', academicRole: 'UIUC Faculty / Staff', status: 'Approved',
      paymentStatus: 'Paid', groupId: 'group-2', attendance: { day1: true, day2: true, day3: true }, notes: 'note', appliedAt: '2026-09-01T00:00:00Z'
    }], retreat);
    const [header, row] = csv.split('\n');
    expect(header).toContain('"Volunteer Notes"');
    expect(row).toContain('"Ada L"');
    expect(row).toContain('"Paid"');
    expect(row).toContain('"Group 2"');
    expect(row).toContain('"Completed"');
    expect(row).toContain('"note"');
  });
});

import { formatRetreatDates, getRetreatLabel, getUpcomingRetreats, resolveActiveRetreatId } from '../src/models/retreat';
import { buildMovedRegistration } from '../src/models/applicant';

describe('retreat helpers', () => {
  it('labels retreats with their dates so repeated titles stay distinguishable', () => {
    expect(formatRetreatDates({ startDate: '2026-09-11', endDate: '2026-09-13' })).toBe('Sep 11–13, 2026');
    expect(formatRetreatDates({ startDate: '2026-10-30', endDate: '2026-11-01' })).toBe('Oct 30 – Nov 1, 2026');
    expect(formatRetreatDates({ startDate: '2026-12-31', endDate: '2027-01-02' })).toBe('Dec 31, 2026 – Jan 2, 2027');
    expect(getRetreatLabel({ title: 'SKY Retreat', startDate: '2026-09-11', endDate: '2026-09-13' })).toBe('SKY Retreat (Sep 11–13, 2026)');
    expect(getRetreatLabel({ title: 'General Interest List' })).toBe('General Interest List');
  });
  it('lists ongoing and upcoming retreats soonest first', () => {
    const retreats = [
      { id: 'past', startDate: '2026-09-11', endDate: '2026-09-13' },
      { id: 'later', startDate: '2027-02-05', endDate: '2027-02-07' },
      { id: 'ongoing', startDate: '2026-10-30', endDate: '2026-11-01' },
      { id: 'next', startDate: '2026-11-06', endDate: '2026-11-08' }
    ];
    expect(getUpcomingRetreats(retreats, '2026-10-31').map(r => r.id)).toEqual(['ongoing', 'next', 'later']);
  });
  it('opens on the upcoming retreat unless a choice still applies', () => {
    const sep = { id: 'sep', startDate: '2026-09-11', endDate: '2026-09-13' };
    const dec = { id: 'dec', startDate: '2026-12-04', endDate: '2026-12-06' };
    const feb = { id: 'feb', startDate: '2027-02-05', endDate: '2027-02-07' };
    const today = '2026-11-03';
    const resolve = (retreats, choice) => resolveActiveRetreatId(retreats, choice, today);
    // A remembered past retreat gives way to the new upcoming one
    expect(resolve([sep, dec], { savedId: 'sep' })).toBe('dec');
    // A remembered retreat that is still upcoming is kept
    expect(resolve([sep, dec, feb], { savedId: 'feb' })).toBe('feb');
    // A retreat chosen on this page load (selector or ?retreat=) wins, even a past one
    expect(resolve([sep, dec], { requestedId: 'sep', savedId: 'dec' })).toBe('sep');
    // Deleted retreats are ignored
    expect(resolve([sep, dec], { requestedId: 'gone', savedId: 'gone' })).toBe('dec');
    // Nothing upcoming: the most recent past retreat; no retreats at all: ''
    expect(resolve([sep], { savedId: 'general' })).toBe('sep');
    expect(resolve([], {})).toBe('');
  });
});

describe('buildMovedRegistration', () => {
  it('keeps answers, status and contact history but drops retreat-scoped fields', () => {
    const reg = {
      id: 'a@x.edu_general', notes: 'merged by roster', email: 'a@x.edu', retreatId: 'general', firstName: 'A', status: 'Pending',
      claimedBy: 'v@x.edu', lastContactedDate: '2026-10-01', appliedAt: '2026-09-22T00:00:00Z', groupId: 'group-1',
      attendance: { day1: true }, paymentStatus: 'Paid', paidAt: 'x', paypalLink: 'p', iahvRegistered: true, sentEmails: { welcome: { sent: true } }
    };
    expect(buildMovedRegistration(reg, 'retreat-2', 'NOW')).toEqual({
      email: 'a@x.edu', retreatId: 'retreat-2', firstName: 'A', status: 'Pending', claimedBy: 'v@x.edu',
      lastContactedDate: '2026-10-01', appliedAt: '2026-09-22T00:00:00Z', updatedAt: 'NOW'
    });
  });
});

import { validateRegistrationForm, prefillFromPreviousApplication } from '../src/models/registrationForm';

describe('registration form', () => {
  const valid = {
    firstName: 'Ada', lastName: 'L', email: 'ada@x.edu', phone: '217', academicRole: 'Undergraduate Student',
    isOver18: '18 or older', completedSkyBefore: 'No', healthConditions: ['None'], otherHealthConditions: '',
    foodAllergies: '', referralSource: 'Friend', agreeToAll3Days: 'Yes'
  };
  it('accepts a complete form and reports every missing field at once', () => {
    expect(validateRegistrationForm(valid)).toEqual({});
    const errors = validateRegistrationForm({ ...valid, firstName: ' ', phone: '', healthConditions: [], agreeToAll3Days: 'No' });
    expect(Object.keys(errors).sort()).toEqual(['agreeToAll3Days', 'firstName', 'healthConditions', 'phone']);
  });
  it('requires a description for "Other" and enforces the rules\' length limits', () => {
    expect(validateRegistrationForm({ ...valid, healthConditions: ['Other'] })).toHaveProperty('otherHealthConditions');
    expect(validateRegistrationForm({ ...valid, referralSource: 'x'.repeat(251) })).toHaveProperty('referralSource');
  });
  it('carries over identity, contact, role, age and health answers only', () => {
    const carried = prefillFromPreviousApplication({ ...valid, status: 'Approved', groupId: 'group-1', referralSource: 'Flyer' });
    expect(carried).toEqual({
      firstName: 'Ada', lastName: 'L', phone: '217', academicRole: 'Undergraduate Student', isOver18: '18 or older',
      healthConditions: ['None'], otherHealthConditions: '', foodAllergies: ''
    });
  });
});

import { getEmailEligibility } from '../src/models/applicant';

describe('email eligibility', () => {
  const full = { day1: true, day2: true, day3: true };
  it('matches each template to the people it is for', () => {
    expect(getEmailEligibility({ status: 'Uncontacted' }, 'application_received').eligible).toBe(true);
    expect(getEmailEligibility({ status: 'Pending' }, 'application_accepted_paypal').eligible).toBe(false);
    expect(getEmailEligibility({ status: 'Approved' }, 'application_accepted_standard').eligible).toBe(true);
    expect(getEmailEligibility({ status: 'Volunteer' }, 'welcome').eligible).toBe(true);
    expect(getEmailEligibility({ status: 'Pending' }, 'welcome').eligible).toBe(false);
    expect(getEmailEligibility({ status: 'Approved', attendance: { day1: true } }, 'completion').eligible).toBe(false);
    expect(getEmailEligibility({ status: 'Approved', attendance: full }, 'completion').eligible).toBe(true);
    expect(getEmailEligibility({ status: 'Withdrawn', attendance: full }, 'completion')).toEqual({ eligible: false, reason: 'has withdrawn' });
  });
});
