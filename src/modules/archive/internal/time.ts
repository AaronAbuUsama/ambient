import type { RawLine } from "./line.ts";

type Parts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

/**
 * The Wall clock of an Instant in one Zone, field by field.
 *
 * `formatToParts` returns the fields in whatever order the locale writes them,
 * and may omit any of them — a Zone the runtime does not know yields no parts at
 * all. So they are read by name and required together: a partial Wall clock is
 * not a worse answer than none, it is a wrong one.
 */
const partsOf = (formatter: Intl.DateTimeFormat, instant: number): Parts | undefined => {
  const found = new Map(
    formatter.formatToParts(new Date(instant)).map((part) => [part.type, Number(part.value)]),
  );
  const year = found.get("year");
  const month = found.get("month");
  const day = found.get("day");
  const hour = found.get("hour");
  const minute = found.get("minute");
  const second = found.get("second");

  return year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
    ? undefined
    : { year, month, day, hour, minute, second };
};

export const formatterFor = (zone: string): Intl.DateTimeFormat | undefined => {
  if (/^[+-]\d{2}:?\d{2}$/.test(zone)) return undefined;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      calendar: "gregory",
      numberingSystem: "latn",
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return undefined;
  }
};

const same = (
  actual: ReturnType<typeof partsOf>,
  wanted: {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
  },
): boolean =>
  actual !== undefined &&
  actual.year === wanted.year &&
  actual.month === wanted.month &&
  actual.day === wanted.day &&
  actual.hour === wanted.hour &&
  actual.minute === wanted.minute &&
  actual.second === wanted.second;

export const instantOf = (
  line: RawLine,
  dayFirst: boolean,
  formatter: Intl.DateTimeFormat,
): number | undefined => {
  const wanted = {
    year: line.year,
    month: dayFirst ? line.second : line.first,
    day: dayFirst ? line.first : line.second,
    hour: line.hour,
    minute: line.minute,
    second: line.secondOfMinute,
  };
  if (
    wanted.month < 1 ||
    wanted.month > 12 ||
    wanted.day < 1 ||
    wanted.day > 31 ||
    wanted.hour < 0 ||
    wanted.hour > 23 ||
    wanted.minute > 59 ||
    wanted.second > 59
  )
    return undefined;

  const wallAsUtc = Date.UTC(
    wanted.year,
    wanted.month - 1,
    wanted.day,
    wanted.hour,
    wanted.minute,
    wanted.second,
  );
  const rolled = new Date(wallAsUtc);
  if (
    rolled.getUTCFullYear() !== wanted.year ||
    rolled.getUTCMonth() !== wanted.month - 1 ||
    rolled.getUTCDate() !== wanted.day
  )
    return undefined;

  const offsetAt = (instant: number): number | undefined => {
    const local = partsOf(formatter, instant);
    return local === undefined
      ? undefined
      : Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) -
          instant;
  };
  const firstOffset = offsetAt(wallAsUtc);
  if (firstOffset === undefined) return undefined;
  let candidate = wallAsUtc - firstOffset;
  const secondOffset = offsetAt(candidate);
  if (secondOffset === undefined) return undefined;
  candidate = wallAsUtc - secondOffset;
  return same(partsOf(formatter, candidate), wanted) ? candidate : undefined;
};
