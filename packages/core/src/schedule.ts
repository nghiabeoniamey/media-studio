import type { Platform } from "./enums";
import type { ScheduleSlot } from "./niche";

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function localParts(date: Date, timeZone: string): LocalParts {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Minutes the zone is ahead of UTC at `date` (e.g. -240 for New York in summer). */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = localParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Convert a wall-clock time in `timeZone` to a UTC instant (DST-safe; skipped times roll forward). */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let offset = zoneOffsetMinutes(new Date(guess), timeZone);
  let result = guess - offset * 60000;
  const offset2 = zoneOffsetMinutes(new Date(result), timeZone);
  if (offset2 !== offset) {
    offset = offset2;
    result = guess - offset * 60000;
  }
  return new Date(result);
}

export interface SlotOccurrence {
  at: Date;
  time: string;
  platforms: Platform[];
}

/** Every slot occurrence strictly after `from`, for the next `days` local days, sorted by time. */
export function upcomingSlots(slots: ScheduleSlot[], timeZone: string, from: Date, days = 14): SlotOccurrence[] {
  const today = localParts(from, timeZone);
  const out: SlotOccurrence[] = [];
  for (let offset = 0; offset <= days; offset++) {
    const local = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const weekday = local.getUTCDay();
    for (const slot of slots) {
      if (slot.days.length > 0 && !slot.days.includes(weekday)) continue;
      const [h, m] = slot.time.split(":").map(Number) as [number, number];
      const at = zonedTimeToUtc(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), h, m, timeZone);
      if (at.getTime() > from.getTime()) out.push({ at, time: slot.time, platforms: slot.platforms });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * First slot after `from` (plus a lead time) that has no video booked yet.
 * `taken` holds ISO strings of occupied slot instants for this niche.
 */
export function nextFreeSlot(
  slots: ScheduleSlot[],
  timeZone: string,
  from: Date,
  taken: Set<string>,
  leadMinutes = 30,
): SlotOccurrence | null {
  const earliest = new Date(from.getTime() + leadMinutes * 60000);
  return upcomingSlots(slots, timeZone, earliest, 60).find((s) => !taken.has(s.at.toISOString())) ?? null;
}
