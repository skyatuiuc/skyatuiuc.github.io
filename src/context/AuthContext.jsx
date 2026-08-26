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

  // Listen to Firebase Auth state & verify volunteer status atomically
  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeFirestore = null;

    if (isFirebaseConfigured && auth) {
      // Catch redirect auth completion if popup flow fell back
      getRedirectResult(auth).then(async (result) => {
        if (result?.user) {
          const cleanEmail = result.user.email ? result.user.email.toLowerCase() : '';
          const userObj = {
            uid: result.user.uid,
            email: cleanEmail,
            displayName: result.user.displayName || cleanEmail,
            photoURL: result.user.photoURL,
            isGoogleAuth: true
          };
          setCurrentUser(userObj);

          if (cleanEmail && db && cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
            try {
              const userDocRef = doc(db, 'authorized_volunteers', cleanEmail);
              const docSnap = await getDoc(userDocRef);
              if (docSnap.exists()) {
                setAuthorizedEmails((prev) => {
                  const updated = prev.includes(cleanEmail) ? prev : [...prev, cleanEmail];
                  localStorage.setItem('sky_authorized_emails', JSON.stringify(updated));
                  return updated;
                });
              }
            } catch (err) {
              console.warn("Redirect volunteer verification error:", err);
            }
          }
        }
      }).catch((err) => console.warn("Redirect sign-in notice:", err));

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const cleanEmail = user.email ? user.email.toLowerCase() : '';
          const userObj = {
            uid: user.uid,
            email: cleanEmail,
            displayName: user.displayName || user.email,
            photoURL: user.photoURL,
            isGoogleAuth: true
          };
          setCurrentUser(userObj);

          // Direct volunteer document check for current user prior to releasing loading state
          if (cleanEmail && db) {
            if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
              setAuthorizedEmails((prev) => {
                const updated = prev.includes(cleanEmail) ? prev : [...prev, cleanEmail];
                localStorage.setItem('sky_authorized_emails', JSON.stringify(updated));
                return updated;
              });
            } else {
              try {
                const userDocRef = doc(db, 'authorized_volunteers', cleanEmail);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                  setAuthorizedEmails((prev) => {
                    const updated = prev.includes(cleanEmail) ? prev : [...prev, cleanEmail];
                    localStorage.setItem('sky_authorized_emails', JSON.stringify(updated));
                    return updated;
                  });
                } else {
                  // Current user is not an authorized volunteer: prune from local whitelist
                  setAuthorizedEmails((prev) => {
                    const pruned = prev.filter(e => e !== cleanEmail || e === ADMIN_EMAIL.toLowerCase());
                    localStorage.setItem('sky_authorized_emails', JSON.stringify(pruned));
                    return pruned;
                  });
                }
              } catch (e) {
                console.warn("Volunteer doc check notice:", e);
              }
            }
          }
        } else {
          setCurrentUser(null);
          // Only clear volunteer list on confirmed logout/unauthenticated state
          setAuthorizedEmails([ADMIN_EMAIL.toLowerCase()]);
          localStorage.removeItem('sky_authorized_emails');
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
        const cleanEmail = result.user.email ? result.user.email.toLowerCase() : '';
        const userObj = {
          uid: result.user.uid,
          email: cleanEmail,
          displayName: result.user.displayName || cleanEmail,
          photoURL: result.user.photoURL,
          isGoogleAuth: true
        };
        setCurrentUser(userObj);

        // Immediate volunteer status resolution on interactive login
        if (cleanEmail && db && cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
          try {
            const userDocRef = doc(db, 'authorized_volunteers', cleanEmail);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              setAuthorizedEmails(prev => {
                const updated = prev.includes(cleanEmail) ? prev : [...prev, cleanEmail];
                localStorage.setItem('sky_authorized_emails', JSON.stringify(updated));
                return updated;
              });
            }
          } catch (e) {
            console.warn("Volunteer verification error on login:", e);
          }
        }

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
    localStorage.removeItem('sky_authorized_emails');
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
