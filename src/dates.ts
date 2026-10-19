/** How dates are read from text and written back, shared by `cast_date`
 * (when a block turns it on), the expression operators and cell display so
 * that all three agree. */

/** A date, optionally with a wall-clock time and no zone: `2021`,
 * `2021-01`, `2021-01-11`, `2021-01-11 08:00`, `2021-01-11T08:00:00.5`. */
const LOCAL_DATE_TIME =
  /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?)?)?$/;

/** Reads text as the instant it names, or `undefined` if it names none.
 *
 * `Date.parse` reads a bare date (`2021-01-11`, `2021-01`, `2021`) as UTC
 * midnight but a date with a time (`2021-01-11 08:00`) in the local time
 * zone, so a filter like `start >= "2021-10-28"` would admit the previous
 * evening's cells west of UTC. Both forms are read here as local time
 * instead, so every form is read in the same zone -- and the forms this
 * plugin writes are read without `Date.parse`, whose behaviour for them is
 * engine-specific. Anything else (a zone, another separator) goes to
 * `Date.parse`. */
export function parseDateText(text: string): Date | undefined {
  const local = LOCAL_DATE_TIME.exec(text);
  if (local !== null) {
    const [year, month, day, hours, minutes, seconds, fraction] = [
      Number(local[1]),
      local[2] === undefined ? 1 : Number(local[2]),
      local[3] === undefined ? 1 : Number(local[3]),
      local[4] === undefined ? 0 : Number(local[4]),
      local[5] === undefined ? 0 : Number(local[5]),
      local[6] === undefined ? 0 : Number(local[6]),
      local[7] === undefined ? 0 : Number(local[7].padEnd(3, "0")),
    ];
    // `24:00` is the end of the day, as ECMAScript's date format allows.
    const endOfDay = hours === 24 && minutes === 0 && seconds === 0 && fraction === 0;
    if ((hours > 23 && !endOfDay) || minutes > 59 || seconds > 59) {
      return undefined;
    }
    const date = new Date(year, month - 1, day, hours, minutes, seconds, fraction);
    if (year < 100) {
      // The constructor reads years 0–99 as 1900–1999.
      date.setFullYear(year);
    }
    const checked = endOfDay ? new Date(date.getTime() - 1) : date;
    return checked.getMonth() === month - 1 && checked.getDate() === day
      ? date
      : undefined;
  }
  const time = Date.parse(text);
  return Number.isNaN(time) ? undefined : new Date(time);
}

const pad = (n: number, width = 2): string => String(n).padStart(width, "0");

/** A Date as the CSV most likely wrote it: `2021-01-11` for a date at local
 * midnight, otherwise `2021-01-11 08:00` (with seconds, and milliseconds,
 * when they aren't zero), in local time, which is how `parseDateText` read
 * it; `parseDateText` reads the result back as the same instant. */
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
  const millis = ms === 0 ? "" : `.${pad(ms, 3)}`;
  const seconds = s === 0 && ms === 0 ? "" : `:${pad(s)}${millis}`;
  return `${day} ${pad(h)}:${pad(m)}${seconds}`;
}
