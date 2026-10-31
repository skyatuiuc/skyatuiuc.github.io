// Retreat helpers (pure). Titles can repeat across semesters, so anywhere a retreat is picked from a
// list it is labelled with its dates as well.

import { todayChicago } from '../utils/dateUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' date keys are calendar dates; parse them without a timezone shift
const parseDateKey = (key) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
};

/** "Sep 11–13, 2026", "Oct 30 – Nov 1, 2026", or '' when the retreat has no start date. */
export const formatRetreatDates = (retreat) => {
  const a = parseDateKey(retreat?.startDate);
  const b = parseDateKey(retreat?.endDate);
  if (!a) return '';
  if (!b || (a.y === b.y && a.m === b.m && a.d === b.d)) return `${MONTHS[a.m]} ${a.d}, ${a.y}`;
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m]} ${a.d}–${b.d}, ${a.y}`;
  if (a.y === b.y) return `${MONTHS[a.m]} ${a.d} – ${MONTHS[b.m]} ${b.d}, ${a.y}`;
  return `${MONTHS[a.m]} ${a.d}, ${a.y} – ${MONTHS[b.m]} ${b.d}, ${b.y}`;
};

/** Title plus dates, e.g. "SKY Happiness Retreat (Sep 11–13, 2026)". */
export const getRetreatLabel = (retreat) => {
  const title = retreat?.title || 'Untitled retreat';
  const dates = formatRetreatDates(retreat);
  return dates ? `${title} (${dates})` : title;
};

/** Ongoing or upcoming retreats (not yet ended, Chicago time), soonest first. */
export const getUpcomingRetreats = (retreats, today = todayChicago()) => (retreats || [])
  .filter(r => (r.endDate && r.endDate >= today) || (r.startDate && r.startDate >= today))
  .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
