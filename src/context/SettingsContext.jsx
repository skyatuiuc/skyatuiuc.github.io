import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { useAuth } from './AuthContext';
import { DEFAULT_EMAIL_SETTINGS } from '../services/emailService';

// Global settings (system_settings/email_config): one live listener for volunteers, shared by every
// screen. Firestore is the only copy; nothing is cached in the browser.

const SettingsContext = createContext(null);

// Copies older builds kept in localStorage (settings incl. the relay URL, local campaign counts)
const LEGACY_STORAGE_KEYS = ['sky_email_settings', 'sky_campaign_webhook_url', 'sky_campaign_analytics_local', 'sky_campaign_analytics_cached'];

export function SettingsProvider({ children }) {
  const { isVolunteer } = useAuth();
  const enabled = Boolean(isVolunteer && isFirebaseConfigured && db);
  const [stored, setStored] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    } catch {
      // storage unavailable: nothing to clean up
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    return onSnapshot(doc(db, 'system_settings', 'email_config'), (snap) => {
      setStored(snap.exists() ? snap.data() : {});
      setSettingsLoaded(true);
    }, (err) => {
      console.warn('Settings sync notice:', err);
      setSettingsLoaded(true);
    });
  }, [enabled]);

  const emailSettings = useMemo(() => ({ ...DEFAULT_EMAIL_SETTINGS, ...(stored || {}) }), [stored]);

  // Admin only (enforced by the rules); throws so callers can show the real error
  const saveEmailSettings = useCallback(
    (next) => setDoc(doc(db, 'system_settings', 'email_config'), next, { merge: true }),
    []
  );

  const value = useMemo(() => ({ emailSettings, settingsLoaded, saveEmailSettings }), [emailSettings, settingsLoaded, saveEmailSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
