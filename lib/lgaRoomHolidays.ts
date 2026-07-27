function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Shifts a fixed-date federal holiday to the observed weekday: Saturday moves to the
// preceding Friday, Sunday moves to the following Monday.
function observed(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return date;
}

// The nth (1-indexed) occurrence of `weekday` (0=Sun..6=Sat) in `month` (0-indexed) of `year`.
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

// The last occurrence of `weekday` in `month` of `year`.
function lastWeekday(year: number, month: number, weekday: number): Date {
  const lastOfMonth = new Date(year, month + 1, 0);
  const offset = (lastOfMonth.getDay() - weekday + 7) % 7;
  return new Date(year, month, lastOfMonth.getDate() - offset);
}

export function getFederalHolidayName(dateStr: string): string | undefined {
  const year = Number(dateStr.slice(0, 4));
  if (!Number.isFinite(year)) return undefined;
  return getFederalHolidays(year).get(dateStr);
}

export function isFederalHoliday(dateStr: string): boolean {
  return Boolean(getFederalHolidayName(dateStr));
}

export function getFederalHolidays(year: number): Map<string, string> {
  const holidays: [string, Date][] = [
    ["New Year's Day", observed(new Date(year, 0, 1))],
    ['Martin Luther King Jr. Day', nthWeekday(year, 0, 1, 3)],
    ["Washington's Birthday", nthWeekday(year, 1, 1, 3)],
    ['Memorial Day', lastWeekday(year, 4, 1)],
    ['Juneteenth', observed(new Date(year, 5, 19))],
    ['Independence Day', observed(new Date(year, 6, 4))],
    ['Labor Day', nthWeekday(year, 8, 1, 1)],
    ['Columbus Day', nthWeekday(year, 9, 1, 2)],
    ['Veterans Day', observed(new Date(year, 10, 11))],
    ['Thanksgiving', nthWeekday(year, 10, 4, 4)],
    ['Christmas Day', observed(new Date(year, 11, 25))],
  ];

  const map = new Map<string, string>();
  holidays.forEach(([name, date]) => map.set(toDateStr(date), name));
  return map;
}
