const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export function bkkArrivalTimestamp(value: unknown, timezone: unknown) {
  if (!value) return null;
  const arrivalTimezone = String(timezone || 'Asia/Bangkok');
  if (arrivalTimezone !== 'Asia/Bangkok') return null;

  const match = String(value).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(?:Z|[+-]\d{2}:?\d{2})?$/u
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second = '0', fraction = ''] = match;
  const localClockMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(fraction.slice(0, 3).padEnd(3, '0'))
  );
  const localClock = new Date(localClockMs);
  if (
    localClock.getUTCFullYear() !== Number(year)
    || localClock.getUTCMonth() !== Number(month) - 1
    || localClock.getUTCDate() !== Number(day)
    || localClock.getUTCHours() !== Number(hour)
    || localClock.getUTCMinutes() !== Number(minute)
    || localClock.getUTCSeconds() !== Number(second)
  ) return null;

  return new Date(localClockMs - BANGKOK_OFFSET_MS).toISOString();
}
