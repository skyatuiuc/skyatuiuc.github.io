// File export helpers shared by the Admin Data tab and roster screens.
import {
  getDisplayName, getStatus, getPayment, getGroupId, getGroupName, getAttendance, isVolunteerEmail
} from '../models/applicant';

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Quote every cell, and neutralise spreadsheet formula injection from applicant-entered text
export const escapeCsvCell = (val) => {
  if (val === undefined || val === null) return '""';
  let str = Array.isArray(val) ? val.join('; ') : String(val);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
};

const ROSTER_COLUMNS = [
  ['Name', (r) => getDisplayName(r)],
  ['Email', (r) => r.email],
  ['Phone', (r) => r.phone],
  ['Academic Role', (r) => r.academicRole],
  ['Volunteer', (r, ctx) => (isVolunteerEmail(r.email, ctx.authorizedEmails) ? 'Yes' : '')],
  ['Status', (r) => getStatus(r)],
  ['Fee', (r) => getPayment(r).formattedFee],
  ['Payment', (r) => getPayment(r).status],
  ['IAHV Registered', (r) => (r.iahvRegistered ? 'Yes' : 'No')],
  ['Group', (r, ctx) => getGroupName(getGroupId(r, ctx.retreat), ctx.retreat)],
  ['Day 1', (r) => (getAttendance(r).days.day1 ? 'Y' : '')],
  ['Day 2', (r) => (getAttendance(r).days.day2 ? 'Y' : '')],
  ['Day 3', (r) => (getAttendance(r).days.day3 ? 'Y' : '')],
  ['Attendance', (r) => getAttendance(r).label],
  ['Claimed By', (r) => r.claimedBy],
  ['Last Contacted', (r) => r.lastContactedDate],
  ['Food Allergies / Diet', (r) => r.foodAllergies],
  ['Health Conditions', (r) => r.healthConditions],
  ['Other Health Conditions', (r) => r.otherHealthConditions],
  ['Age', (r) => r.isOver18],
  ['Done SKY Before', (r) => r.completedSkyBefore],
  ['Referral Source', (r) => r.referralSource],
  ['Volunteer Notes', (r) => r.notes],
  ['Applied At', (r) => r.appliedAt]
];

/** CSV of the given registrations (one retreat), using the canonical applicant model. */
export const registrationsToCsv = (registrations, retreat, authorizedEmails = []) => {
  const ctx = { retreat, authorizedEmails };
  const header = ROSTER_COLUMNS.map(([name]) => escapeCsvCell(name)).join(',');
  const rows = registrations.map(r => ROSTER_COLUMNS.map(([, get]) => escapeCsvCell(get(r, ctx))).join(','));
  return [header, ...rows].join('\n');
};
