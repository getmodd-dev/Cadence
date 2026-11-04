/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Robust date utilities for local YYYY-MM-DD operations.
 * Avoids UTC timezone conversion shifts (e.g. toISOString() or new Date('YYYY-MM-DD')
 * shifting backward by a day in western timezones).
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getLocalTodayDate(): string {
  const now = new Date();
  return formatLocalDate(now);
}

/**
 * Formats a JavaScript Date object into a local 'YYYY-MM-DD' string.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses a 'YYYY-MM-DD' string into a local Date object.
 * We set the time to 12:00:00 (midday) to eliminate edge-of-day daylight saving or midnight shifts.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return new Date();

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date();
  }

  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Nicely formats a 'YYYY-MM-DD' string for display (e.g. "Tuesday, November 3, 2026").
 */
export function formatDisplayDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString(undefined, options);
}

/**
 * Adds or subtracts days from a 'YYYY-MM-DD' string and returns the new 'YYYY-MM-DD' string.
 */
export function shiftDateStr(dateStr: string, deltaDays: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalDate(d);
}

/**
 * Checks whether a 'YYYY-MM-DD' string represents today in local time.
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getLocalTodayDate();
}
