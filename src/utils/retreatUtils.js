import { collection, getDocs } from 'firebase/firestore';

const RETREAT_CACHE_KEY = 'sky_retreat_history';
const RETREAT_CACHE_TS_KEY = 'sky_retreat_history_ts';
export const DEFAULT_RETREAT_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Load retreats from localStorage cache if fresh, otherwise fetch once from Firestore.
 * Consumes 0 reads on repeated visits within TTL, protecting the Spark read quota.
 */
export const loadCachedRetreats = async (db, options = {}) => {
  const { forceRefresh = false, ttlMs = DEFAULT_RETREAT_CACHE_TTL_MS } = options;
  
  // 1. Try local cache
  try {
    const savedStr = localStorage.getItem(RETREAT_CACHE_KEY);
    const savedTs = localStorage.getItem(RETREAT_CACHE_TS_KEY);
    const now = Date.now();

    if (!forceRefresh && savedStr && savedTs && (now - Number(savedTs) < ttlMs)) {
      const parsed = JSON.parse(savedStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Cache read error:", e);
  }

  // 2. Fetch from Firestore if cache missing, stale, or refresh forced
  if (db) {
    try {
      const retreatsRef = collection(db, 'retreat_history');
      const snapshot = await getDocs(retreatsRef);
      const fetched = [];
      snapshot.forEach((d) => fetched.push({ id: d.id, ...d.data() }));
      
      try {
        localStorage.setItem(RETREAT_CACHE_KEY, JSON.stringify(fetched));
        localStorage.setItem(RETREAT_CACHE_TS_KEY, Date.now().toString());
      } catch (err) {
        console.warn("Cache write warning:", err);
      }
      return fetched;
    } catch (err) {
      console.warn("Firestore retreat fetch warning:", err);
    }
  }

  // Fallback to local storage or empty
  try {
    const savedStr = localStorage.getItem(RETREAT_CACHE_KEY);
    return savedStr ? JSON.parse(savedStr) : [];
  } catch {
    return [];
  }
};
