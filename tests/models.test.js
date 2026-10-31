import { describe, it, expect } from 'vitest';
import { dateKeyChicago, daysBetweenKeys, addDaysToKey } from '../src/utils/dateUtils';
import { getRoleCategory, ROLE_CATEGORY, getPayment, getGroupId, getGroupName, matchesSearch, getStatus, compareByAppliedAt } from '../src/models/applicant';
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
    }], retreat, ['ada@x.edu']);
    const [header, row] = csv.split('\n');
    expect(header).toContain('"Volunteer Notes"');
    expect(row).toContain('"Ada L"');
    expect(row).toContain('"Paid"');
    expect(row).toContain('"Group 2"');
    expect(row).toContain('"Completed"');
    expect(row).toContain('"note"');
  });
});
