/**
 * Retreat Schedule & Timing Utilities
 */

export const DEFAULT_RETREAT_SCHEDULE = [
  { day: 'Friday', time: '6:30 PM – 9:30 PM' },
  { day: 'Saturday', time: '10:00 AM – 2:00 PM' },
  { day: 'Sunday', time: '10:00 AM – 2:00 PM' }
];

/**
 * Computes specific date-and-time rows for each day of a retreat
 * e.g., [
 *   { dayName: 'Friday', dateFormatted: 'Sep 11', fullLabel: 'Friday, Sep 11', time: '6:30 PM – 9:30 PM' },
 *   { dayName: 'Saturday', dateFormatted: 'Sep 12', fullLabel: 'Saturday, Sep 12', time: '10:00 AM – 2:00 PM' },
 *   { dayName: 'Sunday', dateFormatted: 'Sep 13', fullLabel: 'Sunday, Sep 13', time: '10:00 AM – 2:00 PM' }
 * ]
 */
export function getRetreatDaySchedule(retreat) {
  if (!retreat) return [];

  // Check if custom dailySchedule array is provided
  if (Array.isArray(retreat.dailySchedule) && retreat.dailySchedule.length > 0) {
    return retreat.dailySchedule.map(item => ({
      dayName: item.day || item.dayName || 'Session',
      dateFormatted: item.date || item.dateFormatted || '',
      fullLabel: item.fullLabel || (item.date ? `${item.day}, ${item.date}` : item.day),
      time: item.time || '10:00 AM – 2:00 PM'
    }));
  }

  const defaultTimes = [
    { defaultDay: 'Friday', time: retreat.fridayTime || retreat.day1Time || '6:30 PM – 9:30 PM' },
    { defaultDay: 'Saturday', time: retreat.saturdayTime || retreat.day2Time || '10:00 AM – 2:00 PM' },
    { defaultDay: 'Sunday', time: retreat.sundayTime || retreat.day3Time || '10:00 AM – 2:00 PM' }
  ];

  if (!retreat.startDate) {
    return defaultTimes.map(d => ({
      dayName: d.defaultDay,
      dateFormatted: '',
      fullLabel: d.defaultDay,
      time: d.time
    }));
  }

  try {
    // Parse YYYY-MM-DD in local time to avoid timezone shifts
    const parts = retreat.startDate.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0])) {
      throw new Error("Invalid date format");
    }
    const [year, month, day] = parts;
    const start = new Date(year, month - 1, day);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const scheduleList = [];
    for (let i = 0; i < 3; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);

      const dayName = dayNames[cur.getDay()];
      const monthName = monthNames[cur.getMonth()];
      const dayNum = cur.getDate();

      const timeStr = defaultTimes[i] ? defaultTimes[i].time : '10:00 AM – 2:00 PM';

      scheduleList.push({
        dayName: dayName,
        dateFormatted: `${monthName} ${dayNum}`,
        fullLabel: `${dayName}, ${monthName} ${dayNum}`,
        time: timeStr
      });
    }
    return scheduleList;
  } catch {
    return defaultTimes.map(d => ({
      dayName: d.defaultDay,
      dateFormatted: '',
      fullLabel: d.defaultDay,
      time: d.time
    }));
  }
}
