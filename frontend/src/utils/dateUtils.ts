/**
 * Date utility functions for calendar-based period calculations.
 * 
 * IMPORTANT: These functions use calendar boundaries (week/month/year), NOT rolling periods.
 * - Week: First day of week (Monday or Sunday) 00:00 to current time
 * - Month: 1st day 00:00 to current time
 * - Year: January 1st 00:00 to current time
 */

type WeekStart = 'MONDAY' | 'SUNDAY'

/**
 * Get the start of the current calendar week.
 * @param date - The date to calculate from (defaults to now)
 * @param weekStart - First day of week ('MONDAY' for ISO 8601, 'SUNDAY' for US standard)
 */
export function getStartOfWeek(date: Date = new Date(), weekStart: WeekStart = 'MONDAY'): Date {
  const result = new Date(date)
  const day = result.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  let diff: number
  if (weekStart === 'SUNDAY') {
    // For Sunday start: Sunday = 0 days back, Monday = 1 day back, etc.
    diff = day
  } else {
    // For Monday start (ISO 8601): Monday = 0 days back, Tuesday = 1 day back, ..., Sunday = 6 days back
    diff = day === 0 ? 6 : day - 1
  }
  
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the start of the current calendar month (1st day at 00:00:00).
 */
export function getStartOfMonth(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the start of the current calendar year (January 1st at 00:00:00).
 */
export function getStartOfYear(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setMonth(0, 1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the end of the current day (23:59:59.999).
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get the current week's date range.
 * @param now - Current date/time (defaults to now)
 * @param weekStart - First day of week ('MONDAY' or 'SUNDAY')
 * Use this for "weekly" data calculations.
 */
export function getCurrentWeekRange(now: Date = new Date(), weekStart: WeekStart = 'MONDAY'): { start: Date; end: Date } {
  return {
    start: getStartOfWeek(now, weekStart),
    end: new Date(now), // Current moment
  }
}

/**
 * Get the current month's date range (1st day 00:00 to now).
 * Use this for "monthly" data calculations.
 */
export function getCurrentMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfMonth(now),
    end: new Date(now), // Current moment
  }
}

/**
 * Get the current year's date range (Jan 1st 00:00 to now).
 * Use this for "yearly" data calculations.
 */
export function getCurrentYearRange(now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfYear(now),
    end: new Date(now), // Current moment
  }
}

/**
 * Get the start of today (00:00:00).
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get today's date range (00:00:00 to now).
 */
export function getTodayRange(now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfDay(now),
    end: new Date(now), // Current moment
  }
}

/**
 * Check if a date is in the future.
 */
export function isFutureDate(date: Date, reference: Date = new Date()): boolean {
  return date.getTime() > reference.getTime()
}

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm).
 */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Get the maximum allowed datetime for input fields (current moment).
 */
export function getMaxDateTime(): string {
  return formatDateTimeLocal(new Date())
}

/**
 * Get the ISO 8601 week number (1-53) for a date.
 * Example: 2026-08-01 -> 31
 */
export function getISOWeekNumber(date: Date = new Date()): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Get the end of the calendar week containing `date` (23:59:59.999 on the 7th day).
 */
export function getEndOfWeek(date: Date = new Date(), weekStart: WeekStart = 'MONDAY'): Date {
  const result = getStartOfWeek(date, weekStart)
  result.setDate(result.getDate() + 6)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get the end of the calendar month containing `date` (last day, 23:59:59.999).
 */
export function getEndOfMonth(date: Date = new Date()): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get the end of the calendar year containing `date` (Dec 31st, 23:59:59.999).
 */
export function getEndOfYear(date: Date = new Date()): Date {
  const result = new Date(date.getFullYear(), 11, 31)
  result.setHours(23, 59, 59, 999)
  return result
}

/** Step a date forward/backward by whole calendar weeks, preserving time-of-day. */
export function addWeeks(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + amount * 7)
  return result
}

/** Step a date forward/backward by whole calendar months, clamped to a valid day. */
export function addMonths(date: Date, amount: number): Date {
  const result = new Date(date)
  const day = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + amount)
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDayOfTargetMonth))
  return result
}

/** Step a date forward/backward by whole calendar years. */
export function addYears(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + amount)
  return result
}

/** Format a Date as a `YYYY-MM-DD` local calendar-date string (no time/timezone shift). */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
