// Persisted timing helpers. Delays are rows with a send_after, never sleeps.

export type TimingSettings = {
  reply_delay_min_sec: number;
  reply_delay_max_sec: number;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
};

/** Minutes past midnight for the given instant in the operator's timezone. */
function minutesInZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (hour % 24) * 60 + minute;
}

function parseClock(value: string) {
  const [hours, minutes] = String(value ?? "00:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isQuietHour(at: Date, settings: TimingSettings) {
  const now = minutesInZone(at, settings.timezone);
  const start = parseClock(settings.quiet_start);
  const end = parseClock(settings.quiet_end);
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

/**
 * Push a send time out of quiet hours by stepping forward in 15 minute
 * increments. Deterministic, and never moves a message earlier.
 */
export function nextSendableTime(at: Date, settings: TimingSettings) {
  let candidate = new Date(at.getTime());
  for (let step = 0; step < 24 * 4 && isQuietHour(candidate, settings); step += 1) {
    candidate = new Date(candidate.getTime() + 15 * 60000);
  }
  return candidate;
}

/** A natural pause inside the configured reply delay range. */
export function replyDelaySeconds(settings: TimingSettings) {
  const min = Math.max(0, settings.reply_delay_min_sec);
  const max = Math.max(min, settings.reply_delay_max_sec);
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function segmentsFor(body: string) {
  return Math.max(1, Math.ceil(body.length / 160));
}

export function formatClock(value: string) {
  const [hours, minutes] = String(value ?? "00:00").split(":").map(Number);
  const suffix = (hours ?? 0) >= 12 ? "PM" : "AM";
  return `${(hours ?? 0) % 12 || 12}:${String(minutes || 0).padStart(2, "0")} ${suffix}`;
}
