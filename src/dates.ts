/** How dates are read from text and written back, shared by `cast_date`,
 * the expression operators and cell display so that all three agree. */

const DATE_ONLY = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/;

/** Reads text as the instant it names, or `undefined` if it names none.
 *
 * `Date.parse` reads a bare date (`2021-01-11`, `2021-01`, `2021`) as UTC
 * midnight but a date with a time (`2021-01-11 08:00`) in the local time
 * zone, so a filter like `start >= "2021-10-28"` would admit the previous
 * evening's cells west of UTC. Bare dates are read as local midnight
 * instead, so every form is read in the same zone. */
export function parseDateText(text: string): Date | undefined {
  const dateOnly = DATE_ONLY.exec(text);
  if (dateOnly !== null) {
    const year = Number(dateOnly[1]);
    const month = dateOnly[2] === undefined ? 1 : Number(dateOnly[2]);
    const day = dateOnly[3] === undefined ? 1 : Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    if (year < 100) {
      // The constructor reads years 0–99 as 1900–1999.
      date.setFullYear(year);
    }
    return date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : undefined;
  }
  const time = Date.parse(text);
  return Number.isNaN(time) ? undefined : new Date(time);
}

const pad = (n: number, width = 2): string => String(n).padStart(width, "0");

/** A Date as the CSV most likely wrote it: `2021-01-11` for a date at local
 * midnight, otherwise `2021-01-11 08:00` (with seconds when they aren't
 * zero), in local time, which is how `cast_date` read it. */
export function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return "Invalid Date";
  }
  const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  // Compared with the start of its day rather than with 00:00, since on a
  // day that begins with a daylight-saving jump midnight doesn't exist.
  if (date.getTime() === new Date(date).setHours(0, 0, 0, 0)) {
    return day;
  }
  const [h, m, s, ms] = [
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  ];
  const seconds = s === 0 && ms === 0 ? "" : `:${pad(s)}`;
  return `${day} ${pad(h)}:${pad(m)}${seconds}`;
}
