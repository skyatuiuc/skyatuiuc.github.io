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

/**
 * Centralized Retreat Utilities
 */

/**
 * Computes the default active retreat ID:
 * 1. If savedRetreatId is provided and exists in retreats, returns savedRetreatId.
 * 2. Finds the nearest ongoing or upcoming retreat (endDate >= today or startDate >= today), sorted ascending by startDate.
 * 3. If no upcoming/ongoing retreat exists, finds the most recent past retreat (sorted descending by startDate).
 * 4. Falls back to retreats[0]?.id or ''.
 */
export const getDefaultActiveRetreatId = (retreats, savedRetreatId = null) => {
  if (!retreats || !Array.isArray(retreats) || retreats.length === 0) return '';

  // If a valid saved retreat ID exists in current retreats list, respect it
  if (savedRetreatId && retreats.some(r => r.id === savedRetreatId)) {
    return savedRetreatId;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Ongoing or Upcoming retreats (nearest start date first)
  const upcomingOrOngoing = retreats
    .filter(r => (r.endDate && r.endDate >= todayStr) || (r.startDate && r.startDate >= todayStr))
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  if (upcomingOrOngoing.length > 0) {
    return upcomingOrOngoing[0].id;
  }

  // 2. If all retreats are past, choose the most recent one (newest start date first)
  const past = [...retreats].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  return past[0]?.id || retreats[0]?.id || '';
};
