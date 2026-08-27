/**
 * Retreat Schedule & Timing Utilities
 */

/**
 * Computes specific date-and-time rows for each day of a retreat
 * Returns an array of day objects: { dayName, dateFormatted, fullLabel, time }
 */
export function getRetreatDaySchedule(retreat) {
  if (!retreat) return [];

  // Check if custom dailySchedule array is provided
  if (Array.isArray(retreat.dailySchedule) && retreat.dailySchedule.length > 0) {
    return retreat.dailySchedule.map(item => ({
      dayName: item.day || item.dayName || 'Session',
      dateFormatted: item.date || item.dateFormatted || '',
      fullLabel: item.fullLabel || (item.date ? `${item.day || item.dayName || 'Session'}, ${item.date}` : (item.day || item.dayName || 'Session')),
      time: item.time || ''
    }));
  }

  const sessionTimes = [
    { defaultDay: 'Friday', time: retreat.fridayTime || retreat.day1Time || '' },
    { defaultDay: 'Saturday', time: retreat.saturdayTime || retreat.day2Time || '' },
    { defaultDay: 'Sunday', time: retreat.sundayTime || retreat.day3Time || '' }
  ];

  if (!retreat.startDate) {
    return sessionTimes.map(d => ({
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

      const timeStr = sessionTimes[i] ? sessionTimes[i].time : '';

      scheduleList.push({
        dayName: dayName,
        dateFormatted: `${monthName} ${dayNum}`,
        fullLabel: `${dayName}, ${monthName} ${dayNum}`,
        time: timeStr
      });
    }
    return scheduleList;
  } catch {
    return sessionTimes.map(d => ({
      dayName: d.defaultDay,
      dateFormatted: '',
      fullLabel: d.defaultDay,
      time: d.time
    }));
  }
}

