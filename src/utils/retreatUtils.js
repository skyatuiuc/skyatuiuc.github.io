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
