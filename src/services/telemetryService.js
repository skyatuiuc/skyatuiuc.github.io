import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { doc, setDoc, increment } from 'firebase/firestore';

// Pending telemetry buffer for atomic batching
let pendingReads = 0;
let pendingWrites = 0;
let pendingDeletes = 0;
let flushTimeout = null;

const getTodayDateParts = () => {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const yearMonth = todayStr.substring(0, 7); // YYYY-MM
  const dayKey = todayStr.substring(8, 10);   // DD
  return { todayStr, yearMonth, dayKey };
};

/**
 * Log atomic read, write, and delete operations to monthly bucket document in Firestore
 * @param {number} readCount Number of document read operations performed
 * @param {number} writeCount Number of document write operations performed
 * @param {number} deleteCount Number of document delete operations performed
 */
export function logDatabaseOperation(readCount = 0, writeCount = 0, deleteCount = 0) {
  if (!isFirebaseConfigured || !db) return;

  pendingReads += readCount;
  pendingWrites += writeCount;
  pendingDeletes += deleteCount;

  // Debounce/batch telemetry flushes every 2 seconds to optimize write usage
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushTelemetry();
    }, 2000);
  }
}

/**
 * Seed or verify current monthly bucket document to ensure collection exists in Firestore
 */
export async function seedDailyAuditIfMissing() {
  if (!isFirebaseConfigured || !db) return;
  const { yearMonth, dayKey } = getTodayDateParts();
  const auditDocRef = doc(db, 'daily_audit_logs', yearMonth);
  try {
    const payload = {
      yearMonth,
      lastUpdated: new Date().toISOString(),
      days: {
        [dayKey]: {
          reads: increment(1),
          writes: increment(1),
          deletes: increment(0)
        }
      }
    };
    await setDoc(auditDocRef, payload, { merge: true });
    console.log("Successfully seeded monthly bucket daily_audit_logs/", yearMonth);
  } catch (err) {
    console.warn("Seed daily audit error:", err);
  }
}

/**
 * Flush accumulated telemetry atomically to monthly bucket document (daily_audit_logs/{YYYY-MM})
 */
async function flushTelemetry() {
  const readsToFlush = pendingReads;
  const writesToFlush = pendingWrites;
  const deletesToFlush = pendingDeletes;

  pendingReads = 0;
  pendingWrites = 0;
  pendingDeletes = 0;
  flushTimeout = null;

  if (readsToFlush === 0 && writesToFlush === 0 && deletesToFlush === 0) return;
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return;

  const userEmail = (auth.currentUser.email || '').toLowerCase().trim();
  const isAdmin = userEmail === 'skyatuiuc@gmail.com';
  let isVolunteer = isAdmin;
  if (!isVolunteer && userEmail) {
    try {
      const cached = JSON.parse(localStorage.getItem('sky_authorized_emails') || '[]');
      if (Array.isArray(cached) && cached.map(e => String(e).toLowerCase().trim()).includes(userEmail)) {
        isVolunteer = true;
      }
    } catch {
      isVolunteer = false;
    }
  }

  // Only authorized volunteers/admins possess permission to write to daily_audit_logs
  if (!isVolunteer) return;

  const { yearMonth, dayKey } = getTodayDateParts();
  const auditDocRef = doc(db, 'daily_audit_logs', yearMonth);

  try {
    const dayMetrics = {};
    if (readsToFlush > 0) dayMetrics.reads = increment(readsToFlush);
    if (writesToFlush > 0) dayMetrics.writes = increment(writesToFlush);
    if (deletesToFlush > 0) dayMetrics.deletes = increment(deletesToFlush);

    const payload = {
      yearMonth,
      lastUpdated: new Date().toISOString(),
      days: {
        [dayKey]: dayMetrics
      }
    };

    await setDoc(auditDocRef, payload, { merge: true });
  } catch (err) {
    console.warn("Telemetry audit flush notice:", err);
  }
}
