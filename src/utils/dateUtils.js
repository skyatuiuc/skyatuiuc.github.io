// Calendar dates for the club are always Champaign-Urbana local dates. Never derive a
// "YYYY-MM-DD" from toISOString(): that is the UTC date, which rolls over at 6-7 pm Central.

export const CLUB_TIME_ZONE = 'America/Chicago';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLUB_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/** "YYYY-MM-DD" for the given instant, in club-local time. */
export const dateKeyChicago = (date = new Date()) => dateKeyFormatter.format(date);

/** Today's club-local date as "YYYY-MM-DD". */
export const todayChicago = () => dateKeyChicago(new Date());

/** Whole days from date key `a` to date key `b` (both "YYYY-MM-DD"). */
export const daysBetweenKeys = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** Date key `n` days after `key`. */
export const addDaysToKey = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** "YYYY-MM" for the given instant, in club-local time. */
export const monthKeyChicago = (date = new Date()) => dateKeyChicago(date).slice(0, 7);
