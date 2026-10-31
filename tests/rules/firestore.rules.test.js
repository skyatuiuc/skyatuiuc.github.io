// Firestore security rules tests. Run with:  npm run test:rules
// (starts the Firestore emulator for a throwaway demo project; never touches production)
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc
} from 'firebase/firestore';

const PROJECT_ID = 'demo-skyatuiuc';
const RETREAT = 'retreat-1';
let env;

const applicantDoc = (email, overrides = {}) => ({
  retreatId: RETREAT,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email,
  phone: '2175551234',
  isOver18: '18 or older',
  academicRole: 'Undergraduate Student',
  completedSkyBefore: 'No',
  healthConditions: ['None'],
  otherHealthConditions: '',
  foodAllergies: '',
  referralSource: 'Friend',
  status: 'Uncontacted',
  appliedAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides
});

const as = (email) => env.authenticatedContext(email, { email, email_verified: true }).firestore();

describe.runIf(process.env.FIRESTORE_EMULATOR_HOST)('firestore.rules', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
    });
  });
  afterAll(async () => { await env?.cleanup(); });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'retreat_history', RETREAT), { title: 'Fall Retreat', startDate: '2026-11-06' });
      await setDoc(doc(db, 'authorized_volunteers', 'vol@illinois.edu'), { email: 'vol@illinois.edu' });
      await setDoc(doc(db, 'registrations', `other@illinois.edu_${RETREAT}`), applicantDoc('other@illinois.edu'));
      await setDoc(doc(db, 'registration_private', `other@illinois.edu_${RETREAT}`), { retreatId: RETREAT, notes: 'private' });
    });
  });

  describe('applicant create', () => {
    it('allows a v2 application for an existing retreat', async () => {
      await assertSucceeds(setDoc(doc(as('ada@illinois.edu'), 'registrations', `ada@illinois.edu_${RETREAT}`), applicantDoc('ada@illinois.edu')));
    });
    it('allows the general interest list', async () => {
      await assertSucceeds(setDoc(doc(as('ada@illinois.edu'), 'registrations', 'ada@illinois.edu_general'), applicantDoc('ada@illinois.edu', { retreatId: 'general' })));
    });
    it('rejects legacy v1 fields (fullName, orientationStatus, retreatTitle, ...)', async () => {
      const db = as('ada@illinois.edu');
      const ref = doc(db, 'registrations', `ada@illinois.edu_${RETREAT}`);
      await assertFails(setDoc(ref, applicantDoc('ada@illinois.edu', { fullName: 'Ada Lovelace' })));
      await assertFails(setDoc(ref, applicantDoc('ada@illinois.edu', { orientationStatus: 'Uncontacted' })));
      await assertFails(setDoc(ref, applicantDoc('ada@illinois.edu', { retreatTitle: 'x' })));
    });
    it('rejects self-approval, other people\'s ids and unknown retreats', async () => {
      const db = as('ada@illinois.edu');
      await assertFails(setDoc(doc(db, 'registrations', `ada@illinois.edu_${RETREAT}`), applicantDoc('ada@illinois.edu', { status: 'Approved' })));
      await assertFails(setDoc(doc(db, 'registrations', `eve@illinois.edu_${RETREAT}`), applicantDoc('eve@illinois.edu')));
      await assertFails(setDoc(doc(db, 'registrations', 'ada@illinois.edu_retreat-nope'), applicantDoc('ada@illinois.edu', { retreatId: 'retreat-nope' })));
    });
    it('does not let applicants edit after submitting', async () => {
      const db = as('other@illinois.edu');
      await assertFails(updateDoc(doc(db, 'registrations', `other@illinois.edu_${RETREAT}`), { status: 'Approved' }));
    });
  });

  describe('applicant reads', () => {
    it('lets an applicant list their own applications by email (My Retreats / Register)', async () => {
      const db = as('other@illinois.edu');
      await assertSucceeds(getDocs(query(collection(db, 'registrations'), where('email', '==', 'other@illinois.edu'))));
    });
    it('does not let an applicant read others or the whole roster', async () => {
      const db = as('ada@illinois.edu');
      await assertFails(getDoc(doc(db, 'registrations', `other@illinois.edu_${RETREAT}`)));
      await assertFails(getDocs(query(collection(db, 'registrations'), where('retreatId', '==', RETREAT))));
    });
    it('never exposes volunteer notes to the applicant they are about', async () => {
      await assertFails(getDoc(doc(as('other@illinois.edu'), 'registration_private', `other@illinois.edu_${RETREAT}`)));
    });
  });

  describe('volunteers', () => {
    it('can query the active retreat roster and its notes', async () => {
      const db = as('vol@illinois.edu');
      await assertSucceeds(getDocs(query(collection(db, 'registrations'), where('retreatId', '==', RETREAT))));
      await assertSucceeds(getDocs(query(collection(db, 'registration_private'), where('retreatId', '==', RETREAT))));
    });
    it('can update registrations and write notes, but not delete', async () => {
      const db = as('vol@illinois.edu');
      await assertSucceeds(updateDoc(doc(db, 'registrations', `other@illinois.edu_${RETREAT}`), { 'attendance.day1': true }));
      await assertSucceeds(setDoc(doc(db, 'registration_private', `other@illinois.edu_${RETREAT}`), { retreatId: RETREAT, notes: 'x' }, { merge: true }));
      await assertFails(deleteDoc(doc(db, 'registrations', `other@illinois.edu_${RETREAT}`)));
    });
    it('cannot write the volunteer list or system settings', async () => {
      const db = as('vol@illinois.edu');
      await assertFails(setDoc(doc(db, 'authorized_volunteers', 'x@y.com'), { email: 'x@y.com' }));
      await assertFails(setDoc(doc(db, 'system_settings', 'schema'), { registrationsVersion: 2 }));
    });
  });

  describe('super admin', () => {
    it('can delete registrations and stamp the schema version', async () => {
      const db = as('skyatuiuc@gmail.com');
      await assertSucceeds(deleteDoc(doc(db, 'registrations', `other@illinois.edu_${RETREAT}`)));
      await assertSucceeds(setDoc(doc(db, 'system_settings', 'schema'), { registrationsVersion: 2 }));
    });
  });

  describe('unverified email addresses', () => {
    const unverified = (email) => env.authenticatedContext(email, { email, email_verified: false }).firestore();
    it('grant no volunteer or admin access', async () => {
      await assertFails(getDocs(query(collection(unverified('vol@illinois.edu'), 'registrations'), where('retreatId', '==', RETREAT))));
      await assertFails(getDoc(doc(unverified('vol@illinois.edu'), 'registration_private', `other@illinois.edu_${RETREAT}`)));
      await assertFails(deleteDoc(doc(unverified('skyatuiuc@gmail.com'), 'registrations', `other@illinois.edu_${RETREAT}`)));
    });
    it('cannot read or create applications under that address', async () => {
      const db = unverified('other@illinois.edu');
      await assertFails(getDocs(query(collection(db, 'registrations'), where('email', '==', 'other@illinois.edu'))));
      await assertFails(setDoc(doc(unverified('ada@illinois.edu'), 'registrations', `ada@illinois.edu_${RETREAT}`), applicantDoc('ada@illinois.edu')));
    });
  });

  describe('Apps Script relay assumption', () => {
    // authenticateCaller() treats "404 for your own volunteer doc" as "authentic token, not a volunteer".
    it('a signed-in non-volunteer may get (and so receive 404 for) their own volunteer doc', async () => {
      await assertSucceeds(getDoc(doc(as('random@gmail.com'), 'authorized_volunteers', 'random@gmail.com')));
    });
  });
});
