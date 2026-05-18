import {
  format,
  parseISO,
  addDays,
  startOfWeek,
  endOfWeek,
  endOfMonth,
  eachDayOfInterval,
  differenceInCalendarDays,
  differenceInMinutes,
  differenceInHours,
  isToday,
  isYesterday,
  isSameDay,
  isAfter,
  isBefore,
  getISODay,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Basic Formatting
// ---------------------------------------------------------------------------

/** Format a Date or ISO string to 'YYYY-MM-DD' */
export function toISO(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/** Today as 'YYYY-MM-DD' */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Extract date portion (YYYY-MM-DD) from a datetime string (ISO 8601) */
export function extractDate(datetime: string): string {
  // If it's already date-only, return as-is
  if (datetime.length === 10 && !datetime.includes('T')) {
    return datetime;
  }
  // Extract date portion from ISO 8601 datetime
  return datetime.split('T')[0];
}

/** Convert a date (YYYY-MM-DD) to datetime (ISO 8601) at a specific time, defaults to noon UTC */
export function dateToDatetime(date: string, time?: string): string {
  // If already datetime, return as-is
  if (date.includes('T')) return date;
  // Use provided time or default to noon UTC
  return `${date}T${time || '12:00:00Z'}`;
}

/** 'Nov 22' */
export function formatShort(iso: string): string {
  return format(parseISO(iso), 'MMM d');
}

/** 'Nov 22 at 3:45 PM' */
export function formatShortWithTime(iso: string): string {
  return format(parseISO(iso), 'MMM d \'at\' h:mm a');
}

/**
 * Format relative time for feed/comments:
 * - Within today: "5 min ago", "5 hours ago"
 * - Yesterday: "Yesterday @ 5:22PM"
 * - Before yesterday: "Nov 22 at 3:45 PM" (or "Nov 22" if no time needed)
 */
export function formatRelativeTime(iso: string, includeTime = true): string {
  const date = parseISO(iso);
  const now = new Date();

  if (isToday(date)) {
    const minutesAgo = differenceInMinutes(now, date);
    if (minutesAgo < 1) return 'just now';
    if (minutesAgo < 60) return `${minutesAgo} min ago`;
    const hoursAgo = differenceInHours(now, date);
    return `${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`;
  }

  if (isYesterday(date)) {
    return `Yesterday @ ${format(date, 'h:mm a')}`;
  }

  // Before yesterday: use existing format
  return includeTime ? formatShortWithTime(iso) : formatShort(iso);
}

/** 'November 22, 2025' */
export function formatLong(iso: string): string {
  return format(parseISO(iso), 'MMMM d, yyyy');
}

/** 'Wed' */
export function formatWeekday(iso: string): string {
  return format(parseISO(iso), 'EEE');
}

/** 'November 2025' for calendar headers */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

// ---------------------------------------------------------------------------
// Calendar Grid
// ---------------------------------------------------------------------------

/**
 * Returns all Date objects for the 6-week grid that contains the given month.
 * Grid always starts on Monday.
 */
export function calendarGridDates(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = endOfMonth(firstOfMonth);
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(lastOfMonth, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

/** All days in a given ISO week number for a year (Mon–Sun) */
export function daysInISOWeek(year: number, isoWeek: number): Date[] {
  // ISO week 1 is the week containing January 4
  const jan4 = new Date(year, 0, 4);
  const startOfISOWeek1 = startOfWeek(jan4, { weekStartsOn: 1 });
  const weekStart = addDays(startOfISOWeek1, (isoWeek - 1) * 7);
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
}

// ---------------------------------------------------------------------------
// Plan Day Mapping
// ---------------------------------------------------------------------------

/**
 * Given an active plan's start date and a PlanDay (week_number, day_of_week),
 * returns the calendar date for that plan day.
 * week_number is 1-indexed, day_of_week is 0=Mon, 6=Sun.
 */
export function planDayToDate(startDate: string, weekNumber: number, dayOfWeek: number): string {
  const start = parseISO(startDate);
  const dayOffset = (weekNumber - 1) * 7 + dayOfWeek;
  return toISO(addDays(start, dayOffset));
}

/**
 * Given an active plan start date, returns how many days into the plan today is (0-indexed).
 * Returns null if the plan hasn't started yet.
 */
export function daysIntoPlan(startDate: string): number | null {
  const start = parseISO(startDate);
  const diff = differenceInCalendarDays(new Date(), start);
  return diff >= 0 ? diff : null;
}

/**
 * Returns { weekNumber, dayOfWeek } for today given a plan start date.
 * Returns null if the plan hasn't started yet or has ended.
 */
export function currentPlanPosition(startDate: string, durationWeeks: number): {
  weekNumber: number;
  dayOfWeek: number;
} | null {
  const diff = daysIntoPlan(startDate);
  if (diff === null) return null;
  const weekNumber = Math.floor(diff / 7) + 1;
  if (weekNumber > durationWeeks) return null;
  const dayOfWeek = diff % 7;
  return { weekNumber, dayOfWeek };
}

// ---------------------------------------------------------------------------
// Guards & Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a calendar date to { weekNumber, dayOfWeek } relative to a plan's start date.
 * Returns null if the date is before the start or beyond durationWeeks.
 */
export function dateToPlanPosition(
  startDate: string,
  targetDate: string,
  durationWeeks: number,
): { weekNumber: number; dayOfWeek: number } | null {
  const diff = differenceInCalendarDays(parseISO(targetDate), parseISO(startDate));
  if (diff < 0 || diff >= durationWeeks * 7) return null;
  return { weekNumber: Math.floor(diff / 7) + 1, dayOfWeek: diff % 7 };
}

export { isToday, isSameDay, isAfter, isBefore, parseISO, addDays, format, getISODay };

