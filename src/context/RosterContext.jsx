import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { collection, doc, onSnapshot, query, where, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { useAuth } from './AuthContext';
import { getDefaultActiveRetreatId } from '../utils/retreatUtils';
import { GENERAL_RETREAT, GENERAL_RETREAT_ID } from '../models/applicant';

// Shared roster for every volunteer/admin screen.
//
// One listener on retreat_history, one on registrations for the *active retreat only*, and one on
// the matching volunteer-only notes (registration_private). Mounted once above the router, so
// moving between /volunteer and /admin re-uses the same listeners instead of re-reading the roster,
// and public visitors never subscribe to anything.

const RosterContext = createContext(null);

const ACTIVE_RETREAT_KEY = 'sky_active_retreat_id';

const readSavedRetreatId = () => {
  try {
    return localStorage.getItem(ACTIVE_RETREAT_KEY) || '';
  } catch {
    return '';
  }
};

export function RosterProvider({ children }) {
  const { isVolunteer } = useAuth();
  const enabled = Boolean(isVolunteer && isFirebaseConfigured && db);

  const [retreats, setRetreats] = useState([]);
  const [retreatsLoaded, setRetreatsLoaded] = useState(false);
  const [requestedRetreatId, setRequestedRetreatId] = useState(readSavedRetreatId);
  const [registrationsState, setRegistrationsState] = useState({ retreatId: null, docs: [] });
  const [notesState, setNotesState] = useState({ retreatId: null, byId: {} });
  const [syncError, setSyncError] = useState('');

  // Retreats (small, public collection)
  useEffect(() => {
    if (!enabled) return undefined;
    return onSnapshot(collection(db, 'retreat_history'), (snapshot) => {
      setRetreats(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setRetreatsLoaded(true);
    }, (err) => {
      console.warn('Retreats sync notice:', err);
      setRetreatsLoaded(true);
    });
  }, [enabled]);

  // Resolve the active retreat: the requested one if it still exists, otherwise the nearest upcoming
  // (the general interest list when no retreat has been scheduled yet)
  const activeRetreatId = useMemo(() => {
    if (requestedRetreatId === GENERAL_RETREAT_ID) return GENERAL_RETREAT_ID;
    if (!retreatsLoaded) return '';
    return getDefaultActiveRetreatId(retreats, requestedRetreatId) || GENERAL_RETREAT_ID;
  }, [retreats, retreatsLoaded, requestedRetreatId]);

  const setActiveRetreatId = useCallback((id) => {
    setRequestedRetreatId(id);
    try {
      localStorage.setItem(ACTIVE_RETREAT_KEY, id);
    } catch {
      // storage unavailable (private mode) - selection still applies for this session
    }
  }, []);

  // Registrations for the active retreat only
  useEffect(() => {
    if (!enabled || !activeRetreatId) return undefined;
    const q = query(collection(db, 'registrations'), where('retreatId', '==', activeRetreatId));
    return onSnapshot(q, (snapshot) => {
      setRegistrationsState({ retreatId: activeRetreatId, docs: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) });
      setSyncError('');
    }, (err) => {
      console.warn('Registrations sync notice:', err);
      setSyncError(err.code === 'permission-denied'
        ? 'Firestore denied access to registrations. Check that your account is an authorized volunteer.'
        : 'Live roster sync interrupted. Refresh the page to retry.');
    });
  }, [enabled, activeRetreatId]);

  // Volunteer-only notes for the active retreat
  useEffect(() => {
    if (!enabled || !activeRetreatId) return undefined;
    const q = query(collection(db, 'registration_private'), where('retreatId', '==', activeRetreatId));
    return onSnapshot(q, (snapshot) => {
      const byId = {};
      snapshot.docs.forEach((d) => { byId[d.id] = d.data(); });
      setNotesState({ retreatId: activeRetreatId, byId });
    }, (err) => console.warn('Notes sync notice:', err));
  }, [enabled, activeRetreatId]);

  const registrationsReady = registrationsState.retreatId === activeRetreatId;

  const registrations = useMemo(() => {
    if (!registrationsReady) return [];
    const notesById = notesState.retreatId === activeRetreatId ? notesState.byId : {};
    return registrationsState.docs.map(reg => ({ ...reg, notes: notesById[reg.id]?.notes || '' }));
  }, [registrationsReady, registrationsState, notesState, activeRetreatId]);

  const activeRetreat = useMemo(() => {
    if (activeRetreatId === GENERAL_RETREAT_ID) return GENERAL_RETREAT;
    return retreats.find(r => r.id === activeRetreatId) || null;
  }, [retreats, activeRetreatId]);

  // Retreat selector options: newest first, then the general interest list
  const retreatOptions = useMemo(() => (
    [...retreats].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')).concat(GENERAL_RETREAT)
  ), [retreats]);

  // ---------- Writes ----------

  const updateRegistration = useCallback(async (id, fields) => {
    await updateDoc(doc(db, 'registrations', id), { ...fields, updatedAt: new Date().toISOString() });
  }, []);

  // Apply the same kind of update to many registrations atomically (max 500 per batch)
  const updateRegistrations = useCallback(async (updatesById) => {
    const entries = Object.entries(updatesById);
    const now = new Date().toISOString();
    for (let i = 0; i < entries.length; i += 450) {
      const batch = writeBatch(db);
      entries.slice(i, i + 450).forEach(([id, fields]) => {
        batch.update(doc(db, 'registrations', id), { ...fields, updatedAt: now });
      });
      await batch.commit();
    }
  }, []);

  const saveNotes = useCallback(async (reg, notes, updatedBy) => {
    await setDoc(doc(db, 'registration_private', reg.id), {
      retreatId: reg.retreatId,
      notes,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || ''
    }, { merge: true });
  }, []);

  const deleteRegistration = useCallback(async (id) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'registrations', id));
    batch.delete(doc(db, 'registration_private', id));
    await batch.commit();
  }, []);

  const value = {
    retreats,
    retreatsLoaded,
    retreatOptions,
    activeRetreatId,
    activeRetreat,
    setActiveRetreatId,
    registrations,
    registrationsReady,
    syncError,
    updateRegistration,
    updateRegistrations,
    saveNotes,
    deleteRegistration
  };

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

export function useRoster() {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error('useRoster must be used inside <RosterProvider>');
  return ctx;
}
