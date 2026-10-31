import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { migrateRegistration, applyMigrationToObject, REMOVED_FIELDS } from '../src/models/migrateRegistration';
import { getStatus, getPayment, getGroupName, getAttendance, getDisplayName, STATUS_OPTIONS } from '../src/models/applicant';

// Synthetic v1 documents covering every field combination seen in the Oct-2026 production backup
const v1 = (overrides = {}) => ({
  id: 'a@illinois.edu_retreat-1',
  email: 'a@illinois.edu',
  retreatId: 'retreat-1',
  retreatTitle: 'SKY Happiness Retreat | September 2026',
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: 'Ada Lovelace',
  phone: '2175551234',
  academicRole: 'Undergraduate Student',
  isOver18: '18 or older',
  completedSkyBefore: 'No',
  agreeToAll3Days: 'Yes',
  healthConditions: ['None'],
  otherHealthConditions: '',
  foodAllergies: '',
  referralSource: 'Friend',
  status: 'Approved',
  interviewStatus: 'Approved',
  orientationStatus: 'Approved',
  appliedAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides
});

describe('migrateRegistration', () => {
  it('collapses the status triplet, preferring the detailed orientationStatus', () => {
    const doc = v1({ status: 'Pending', interviewStatus: 'Did Not Reply', orientationStatus: 'Did Not Reply' });
    const out = applyMigrationToObject(doc, migrateRegistration(doc));
    expect(out.status).toBe('Did Not Reply');
    expect(out).not.toHaveProperty('interviewStatus');
    expect(out).not.toHaveProperty('orientationStatus');
  });

  it('keeps status when orientationStatus is missing', () => {
    const doc = v1({ orientationStatus: undefined });
    delete doc.orientationStatus;
    expect(applyMigrationToObject(doc, migrateRegistration(doc)).status).toBe('Approved');
  });

  it('moves notes to the private doc, taking whichever note field is set', () => {
    expect(migrateRegistration(v1({ orientationNotes: 'call back', interviewNotes: 'call back' })).privateNotes).toBe('call back');
    expect(migrateRegistration(v1({ interviewNotes: 'good vibes' })).privateNotes).toBe('good vibes');
    expect(migrateRegistration(v1({ orientationNotes: '', interviewNotes: '' })).privateNotes).toBeNull();
    const out = applyMigrationToObject(v1({ orientationNotes: 'x', interviewNotes: 'x' }), migrateRegistration(v1({ orientationNotes: 'x', interviewNotes: 'x' })));
    expect(out).not.toHaveProperty('orientationNotes');
    expect(out).not.toHaveProperty('interviewNotes');
  });

  it('folds isPaid/paymentStatus/paidAt into paymentStatus + paidAt', () => {
    const paid = v1({ academicRole: 'UIUC Faculty / Staff', isPaid: true, paymentStatus: 'Paid', paidAt: '2026-09-10T00:00:00Z' });
    const out = applyMigrationToObject(paid, migrateRegistration(paid));
    expect(out.paymentStatus).toBe('Paid');
    expect(out.paidAt).toBe('2026-09-10T00:00:00Z');
    expect(out).not.toHaveProperty('isPaid');
    expect(getPayment(out).status).toBe('Paid');

    const unpaid = v1({ academicRole: 'UIUC Faculty / Staff', paymentStatus: 'Unpaid', paidAt: null });
    const out2 = applyMigrationToObject(unpaid, migrateRegistration(unpaid));
    expect(out2).not.toHaveProperty('paymentStatus');
    expect(out2).not.toHaveProperty('paidAt');
    expect(getPayment(out2).status).toBe('Unpaid');
  });

  it('keeps groupId, drops assignedGroup, and clears "unassigned"', () => {
    const grouped = applyMigrationToObject(v1({ groupId: 'group-3', assignedGroup: 'Group 3' }), migrateRegistration(v1({ groupId: 'group-3', assignedGroup: 'Group 3' })));
    expect(grouped.groupId).toBe('group-3');
    expect(grouped).not.toHaveProperty('assignedGroup');
    const un = v1({ groupId: 'unassigned', assignedGroup: '' });
    expect(applyMigrationToObject(un, migrateRegistration(un))).not.toHaveProperty('groupId');
    const nameOnly = v1({ assignedGroup: 'Group 2' });
    expect(applyMigrationToObject(nameOnly, migrateRegistration(nameOnly)).groupId).toBe('group-2');
  });

  it('merges literal "sentEmails.<key>" fields and deletes them', () => {
    const doc = v1({
      sentEmails: { welcome: { sent: true, sentAt: '2026-09-11T06:13:00Z', templateKey: 'welcome' } },
      'sentEmails.welcome': { sent: true, sentAt: '2026-09-11T06:13:01Z' },
      'sentEmails.completion': { sent: true, sentAt: '2026-09-16T10:39:14Z' }
    });
    const out = applyMigrationToObject(doc, migrateRegistration(doc));
    expect(out.sentEmails.welcome.templateKey).toBe('welcome'); // map entry wins
    expect(out.sentEmails.completion.sent).toBe(true); // literal-only entry preserved
    expect(Object.keys(out).filter(k => k.startsWith('sentEmails.'))).toEqual([]);
  });

  it('drops derived attendance fields but keeps the attendance map', () => {
    const doc = v1({ attendance: { day1: true, day2: true, day3: false }, attendedDaysCount: 2, attendanceStatus: 'In Progress', completed: false });
    const out = applyMigrationToObject(doc, migrateRegistration(doc));
    expect(out.attendance).toEqual(doc.attendance);
    expect(getAttendance(out)).toMatchObject({ attendedCount: 2, isComplete: false });
    for (const f of ['attendedDaysCount', 'attendanceStatus', 'completed']) expect(out).not.toHaveProperty(f);
  });

  it('keeps a hand-set Volunteer status (v2 re-runs must not reset it)', () => {
    const doc = applyMigrationToObject(v1(), migrateRegistration(v1()));
    const volunteer = { ...doc, status: 'Volunteer' };
    expect(migrateRegistration(volunteer).changed).toBe(false);
  });

  it('v3: gives listed volunteers the Volunteer status, except when withdrawn', () => {
    const volunteerEmails = ['A@illinois.edu'];
    const approved = applyMigrationToObject(v1(), migrateRegistration(v1()));
    const marked = migrateRegistration(approved, { volunteerEmails });
    expect(marked.set).toEqual({ status: 'Volunteer' });
    expect(migrateRegistration(applyMigrationToObject(approved, marked), { volunteerEmails }).changed).toBe(false);
    expect(migrateRegistration({ ...approved, status: 'Withdrawn' }, { volunteerEmails }).changed).toBe(false);
    expect(migrateRegistration({ ...approved, email: 'b@illinois.edu' }, { volunteerEmails }).changed).toBe(false);
    // Straight from v1 in one pass
    expect(applyMigrationToObject(v1(), migrateRegistration(v1(), { volunteerEmails })).status).toBe('Volunteer');
  });

  it('is idempotent', () => {
    const doc = v1({ orientationNotes: 'n', isPaid: true, paymentStatus: 'Paid', paidAt: 'x', groupId: 'group-1', assignedGroup: 'Group 1' });
    const once = applyMigrationToObject(doc, migrateRegistration(doc));
    const second = migrateRegistration(once);
    expect(second.changed).toBe(false);
    expect(second.privateNotes).toBeNull();
  });
});

// Optional: run against a real Admin "full system snapshot" without committing PII to the repo.
//   SKY_BACKUP_PATH=~/Downloads/skyatuiuc_full_backup_2026-10-31.json npm test
const backupPath = process.env.SKY_BACKUP_PATH;
describe.runIf(backupPath && fs.existsSync(backupPath))('migration against production backup', () => {
  const backup = backupPath ? JSON.parse(fs.readFileSync(backupPath, 'utf8')) : null;
  const regs = backup?.collections?.registrations || [];
  const retreats = Object.fromEntries((backup?.collections?.retreat_history || []).map(r => [r.id, r]));

  it('loses nothing but the removed redundant fields, and every derived value matches the old stored one', () => {
    expect(regs.length).toBeGreaterThan(0);
    for (const doc of regs) {
      const result = migrateRegistration(doc);
      const out = applyMigrationToObject(doc, result);
      for (const field of Object.keys(doc)) {
        if (REMOVED_FIELDS.includes(field) || field.startsWith('sentEmails.') || ['paymentStatus', 'paidAt', 'groupId', 'status', 'sentEmails'].includes(field)) continue;
        expect(out[field], `${doc.id}.${field}`).toEqual(doc[field]);
      }
      expect(STATUS_OPTIONS).toContain(getStatus(out));
      expect(getStatus(out)).toBe(doc.orientationStatus || doc.interviewStatus || doc.status);
      if (doc.fullName) expect(getDisplayName(out)).toBe(doc.fullName);
      if (doc.assignedGroup) expect(getGroupName(out.groupId, retreats[doc.retreatId])).toBe(doc.assignedGroup);
      if (doc.attendance) {
        const att = getAttendance(out);
        expect(att.attendedCount).toBe(doc.attendedDaysCount);
        expect(att.isComplete).toBe(doc.completed);
      }
      if (doc.isPaid) expect(getPayment(out).isSettled).toBe(true);
      expect(result.privateNotes).toBe((doc.orientationNotes || doc.interviewNotes || '').trim() || null);
      for (const key of Object.keys(doc.sentEmails || {})) expect(out.sentEmails[key]).toEqual(doc.sentEmails[key]);
      expect(migrateRegistration(out).changed).toBe(false);
    }
  });
});
