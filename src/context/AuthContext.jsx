import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, isFirebaseConfigured, signInWithPopup, getRedirectResult, firebaseSignOut } from '../firebase/config';
import { onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const ADMIN_EMAIL = "skyatuiuc@gmail.com";

// Production whitelist initially seeds Super Admin email
const INITIAL_AUTHORIZED_VOLUNTEERS = [
  ADMIN_EMAIL.toLowerCase()
];

// Browser storage keys that hold people's data; wiped whenever the session ends
const SESSION_DATA_KEYS = ['sky_authorized_emails', 'sky_registrations'];

const clearSessionData = () => {
  SESSION_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
};

const toUserObj = (user) => {
  const cleanEmail = user.email ? user.email.toLowerCase() : '';
  return {
    uid: user.uid,
    email: cleanEmail,
    displayName: user.displayName || cleanEmail,
    photoURL: user.photoURL,
    isGoogleAuth: true
  };
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authorizedEmails, setAuthorizedEmails] = useState(() => {
    try {
      const saved = localStorage.getItem('sky_authorized_emails');
      const parsed = saved ? JSON.parse(saved) : INITIAL_AUTHORIZED_VOLUNTEERS;
      if (!parsed.includes(ADMIN_EMAIL.toLowerCase())) {
        parsed.push(ADMIN_EMAIL.toLowerCase());
      }
      return parsed;
    } catch {
      return INITIAL_AUTHORIZED_VOLUNTEERS;
    }
  });

  // Confirm (or revoke) volunteer status for the signed-in email with a single document read
  const resolveVolunteerStatus = async (cleanEmail) => {
    if (!cleanEmail || !db) return;
    const rememberEmail = (prev) => {
      const updated = prev.includes(cleanEmail) ? prev : [...prev, cleanEmail];
      localStorage.setItem('sky_authorized_emails', JSON.stringify(updated));
      return updated;
    };
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      setAuthorizedEmails(rememberEmail);
      return;
    }
    try {
      const docSnap = await getDoc(doc(db, 'authorized_volunteers', cleanEmail));
      if (docSnap.exists()) {
        setAuthorizedEmails(rememberEmail);
      } else {
        setAuthorizedEmails((prev) => {
          const pruned = prev.filter(e => e !== cleanEmail);
          localStorage.setItem('sky_authorized_emails', JSON.stringify(pruned));
          return pruned;
        });
      }
    } catch (err) {
      console.warn("Volunteer verification notice:", err);
    }
  };

  // Listen to Firebase Auth state & verify volunteer status atomically
  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeFirestore = null;

    if (isFirebaseConfigured && auth) {
      // Catch redirect auth completion if popup flow fell back
      getRedirectResult(auth).then(async (result) => {
        if (result?.user) {
          const userObj = toUserObj(result.user);
          setCurrentUser(userObj);
          await resolveVolunteerStatus(userObj.email);
        }
      }).catch((err) => console.warn("Redirect sign-in notice:", err));

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userObj = toUserObj(user);
          setCurrentUser(userObj);
          // Resolve volunteer status before releasing the loading state
          await resolveVolunteerStatus(userObj.email);
        } else {
          setCurrentUser(null);
          // Only clear volunteer list on confirmed logout/unauthenticated state
          setAuthorizedEmails([ADMIN_EMAIL.toLowerCase()]);
          clearSessionData();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Real-time volunteer list sync (accessible by authorized volunteers & super admin)
  useEffect(() => {
    let unsubscribeFirestore = null;

    if (isFirebaseConfigured && db && currentUser) {
      const userEmail = currentUser.email?.toLowerCase();
      if (!userEmail) return;

      try {
        const volunteersRef = collection(db, 'authorized_volunteers');
        unsubscribeFirestore = onSnapshot(volunteersRef, (snapshot) => {
          const emails = [ADMIN_EMAIL.toLowerCase()];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.email) emails.push(data.email.toLowerCase());
          });
          setAuthorizedEmails(emails);
          localStorage.setItem('sky_authorized_emails', JSON.stringify(emails));
        }, (error) => {
          // If non-admin / student is unauthorized to list the whole collection, single getDoc handled user check
          if (error.code !== 'permission-denied') {
            console.warn("Firestore collection sync notice:", error.code);
          }
        });
      } catch (e) {
        console.warn("Firestore listener setup notice:", e);
      }
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [currentUser]);

  // 1-Click Production Google Sign-In via Popup
  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      const msg = "Firebase Auth is not initialized properly. Please check configuration.";
      alert(msg);
      throw new Error(msg);
    }
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      if (result && result.user) {
        const userObj = toUserObj(result.user);
        setCurrentUser(userObj);
        // Immediate volunteer status resolution on interactive login
        await resolveVolunteerStatus(userObj.email);

        return userObj;
      }
      return null;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Google sign-in popup closed by user.");
        return null;
      }
      console.error("Google Auth popup error:", error);
      alert(`Sign In Error (${error.code || 'unknown'}): ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    if (isFirebaseConfigured && auth && currentUser?.isGoogleAuth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.error("Firebase logout error:", e);
      }
    }
    setCurrentUser(null);
    setAuthorizedEmails([ADMIN_EMAIL.toLowerCase()]);
    clearSessionData();
  };

  // Add volunteer email (Super Admin only)
  const addVolunteerEmail = async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!authorizedEmails.includes(cleanEmail)) {
      const updated = [...authorizedEmails, cleanEmail];
      setAuthorizedEmails(updated);
      localStorage.setItem('sky_authorized_emails', JSON.stringify(updated));

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'authorized_volunteers', cleanEmail), {
            email: cleanEmail,
            addedAt: new Date().toISOString()
          });
        } catch (e) {
          console.warn("Firestore volunteer add error:", e);
        }
      }
      return true;
    }
    return false;
  };

  // Remove volunteer email (Super Admin only)
  const removeVolunteerEmail = async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      return false; // Cannot remove Super Admin
    }

    const updated = authorizedEmails.filter(e => e.toLowerCase() !== cleanEmail);
    setAuthorizedEmails(updated);
    localStorage.setItem('sky_authorized_emails', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'authorized_volunteers', cleanEmail));
      } catch (e) {
        console.warn("Firestore volunteer remove error:", e);
      }
    }
    return true;
  };

  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isVolunteer = isAdmin || Boolean(currentUser?.email && authorizedEmails.includes(currentUser.email.toLowerCase()));

  const value = {
    currentUser,
    loading,
    isAdmin,
    isVolunteer,
    authorizedEmails,
    loginWithGoogle,
    logout,
    addVolunteerEmail,
    removeVolunteerEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
