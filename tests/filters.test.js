import { describe, it, expect } from 'vitest';
import { filterApplicants, countByStatus, countActiveFilters, FILTER_DEFAULTS } from '../src/models/applicantFilters';

const ctx = {
  userEmail: 'me@x.edu',
  retreat: { groupConfig: { numGroups: 3, groupNames: {} } }
};
const regs = [
  { id: '1', firstName: 'Ann', email: 'ann@x.edu', status: 'Approved', academicRole: 'Undergraduate Student', claimedBy: 'me@x.edu', groupId: 'group-1', appliedAt: '2026-09-03T00:00:00Z', attendance: { day1: true, day2: true, day3: true }, sentEmails: { welcome: { sent: true } } },
  { id: '2', firstName: 'Bob', email: 'bob@x.edu', status: 'Pending', academicRole: 'UIUC Faculty / Staff', claimedBy: 'other@x.edu', appliedAt: '2026-09-01T00:00:00Z', attendance: { day1: true } },
  { id: '3', firstName: 'Cat', email: 'vol@x.edu', status: 'Did Not Reply', academicRole: 'PhD Student', paymentStatus: 'Paid', iahvRegistered: true, appliedAt: '2026-09-02T00:00:00Z', sentEmails: { application_accepted: { sent: true } } },
  { id: '4', firstName: 'Dan', email: 'dan@x.edu', status: 'Withdrawn', academicRole: 'UIUC Faculty / Staff', paymentStatus: 'Paid', groupId: 'group-9', appliedAt: '2026-09-04T00:00:00Z' }
];
const ids = (list) => list.map(r => r.id);
const run = (overrides) => ids(filterApplicants(regs, { ...FILTER_DEFAULTS, ...overrides }, ctx));

describe('filterApplicants', () => {
  it('defaults to everyone, oldest first', () => expect(run({})).toEqual(['2', '3', '1', '4']));
  it('filters by multiple statuses', () => expect(run({ statuses: ['Approved', 'Pending'] })).toEqual(['2', '1']));
  it('filters claims relative to the current user', () => {
    expect(run({ claim: 'mine' })).toEqual(['1']);
    expect(run({ claim: 'unclaimed' })).toEqual(['3', '4']);
    expect(run({ claim: 'others' })).toEqual(['2']);
  });
  it('filters payment using role-derived fees', () => {
    expect(run({ payment: 'unpaid' })).toEqual(['2']);
    expect(run({ payment: 'settled' })).toEqual(['3', '1', '4']);
    expect(run({ payment: 'exempt' })).toEqual(['3', '1']);
  });
  it('treats out-of-range groups as unassigned', () => {
    expect(run({ group: 'unassigned' })).toEqual(['2', '3', '4']);
    expect(run({ group: 'group-1' })).toEqual(['1']);
  });
  it('filters role categories and IAHV', () => {
    expect(run({ role: 'graduate' })).toEqual(['3']);
    expect(run({ iahv: 'yes' })).toEqual(['3']);
  });
  it('identifies volunteers by the Volunteer status, not by email', () => {
    const withVolunteer = [...regs, { id: '5', firstName: 'Eve', email: 'eve@x.edu', status: 'Volunteer', appliedAt: '2026-09-05T00:00:00Z' }];
    const people = (v) => ids(filterApplicants(withVolunteer, { ...FILTER_DEFAULTS, people: v }, ctx));
    expect(people('volunteers')).toEqual(['5']);
    expect(people('participants')).toEqual(['2', '3', '1', '4']);
    expect(ids(filterApplicants(withVolunteer, { ...FILTER_DEFAULTS, statuses: ['Volunteer'] }, ctx))).toEqual(['5']);
  });
  it('filters email dispatch state (both acceptance templates share one key)', () => {
    expect(run({ email: 'unsent:welcome' })).toEqual(['2', '3', '4']);
    expect(run({ email: 'sent:application_accepted_paypal' })).toEqual(['3']);
    expect(run({ email: 'needs_paypal' })).toEqual(['2']);
  });
  it('filters attendance by day', () => {
    expect(run({ attendance: 'present:day1' })).toEqual(['2', '1']);
    expect(run({ attendance: 'absent:day2' })).toEqual(['2', '3', '4']);
    expect(run({ attendance: 'complete' })).toEqual(['1']);
  });
  it('searches and sorts', () => {
    expect(run({ search: 'bob' })).toEqual(['2']);
    expect(run({ sort: 'name' })).toEqual(['1', '2', '3', '4']);
    expect(run({ sort: 'newest' })).toEqual(['4', '1', '3', '2']);
    expect(run({ sort: 'status' })).toEqual(['2', '3', '1', '4']);
  });
  it('counts statuses ignoring the status facet but honouring the others', () => {
    expect(countByStatus(regs, { ...FILTER_DEFAULTS, statuses: ['Approved'], claim: 'unclaimed' }, ctx))
      .toEqual({ Uncontacted: 0, Pending: 0, 'Did Not Reply': 1, Approved: 0, Volunteer: 0, Withdrawn: 1 });
    expect(countActiveFilters({ ...FILTER_DEFAULTS, statuses: ['Approved'], claim: 'mine', sort: 'name' })).toBe(2);
  });
});

describe('countActiveFilters baseline', () => {
  it('counts differences from a screen baseline, ignoring status order', () => {
    const baseline = { ...FILTER_DEFAULTS, statuses: ['Approved', 'Volunteer'] };
    expect(countActiveFilters({ ...baseline, statuses: ['Volunteer', 'Approved'] }, baseline)).toBe(0);
    expect(countActiveFilters({ ...baseline, statuses: ['Approved'] }, baseline)).toBe(1);
    expect(countActiveFilters({ ...baseline, statuses: [] }, baseline)).toBe(1);
  });
});
