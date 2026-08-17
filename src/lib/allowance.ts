// SMS allowances and tier features. Deterministic, read from the pricing
// ruleset shape, never from Blip. Overage is displayed, never charged.

export type TierKey = "presence" | "connected" | "operations";

export const TIER_LIMITS: Record<TierKey, { label: string; monthly: number; setup: number; setupAnnual: number; segments: number }> = {
  presence: { label: "Presence", monthly: 97, setup: 297, setupAnnual: 149, segments: 2000 },
  connected: { label: "Connected", monthly: 249, setup: 597, setupAnnual: 299, segments: 6000 },
  operations: { label: "Operations", monthly: 499, setup: 997, setupAnnual: 499, segments: 12000 },
};

export const SMS_OVERAGE_RATE = 0.02;
export const SEAT_TARGET = 30;
export const WARN_AT = 0.8;

export const TIER_RANK: Record<TierKey, number> = { presence: 0, connected: 1, operations: 2 };

export const TIER_FEATURES: Array<[string, TierKey]> = [
  ["Website and forms", "presence"],
  ["Instant lead response", "presence"],
  ["AI qualification by text", "presence"],
  ["Client dashboard", "presence"],
  ["Weekly summary email", "presence"],
  ["Missed lead alert", "presence"],
  ["Missed call text back", "connected"],
  ["After hours handling", "presence"],
  ["Booking handoff", "connected"],
  ["Appointment reminders", "connected"],
  ["No show follow up", "connected"],
  ["Payment links", "connected"],
  ["Review requests", "connected"],
  ["Intake forms", "connected"],
  ["Multi location routing", "operations"],
  ["Payment reconciliation", "operations"],
  ["Dedicated phone line", "operations"],
  ["Recalls and rebooking", "operations"],
  ["Monthly report", "operations"],
];

export function tierKey(tier: string): TierKey {
  const key = String(tier ?? "").toLowerCase();
  return key === "operations" || key === "connected" ? key : "presence";
}

export function allowanceFor(tier: string) {
  return TIER_LIMITS[tierKey(tier)].segments;
}

export function usagePct(segments: number, tier: string) {
  return Math.round((segments / allowanceFor(tier)) * 100);
}

export function usageTone(pct: number) {
  return pct > 90 ? "danger" : pct >= 80 ? "attention" : "ok";
}

/** Recorded and shown so the cost is visible. Never invoiced. */
export function overageSegments(segments: number, tier: string) {
  return Math.max(0, segments - allowanceFor(tier));
}

export function overageDollars(segments: number, tier: string) {
  return overageSegments(segments, tier) * SMS_OVERAGE_RATE;
}

export const STRIPE_LABELS: Record<string, [string, string]> = {
  connected: ["Connected", "ok"],
  disconnected: ["Disconnected by client", "attention"],
  revoked_by_client: ["Access revoked by client", "attention"],
  error: ["Needs attention", "attention"],
  pending: ["Waiting on client", "muted"],
  not_connected: ["Not connected", "muted"],
};

/** The chip is only a button when it needs action. */
export function stripeNeedsAction(status: string) {
  return status !== "connected";
}

/**
 * Usage periods follow the client's start date, not the calendar month.
 * Returns the ISO date (yyyy-mm-dd) of the current period start.
 */
export function periodStart(startedAt: string, now = new Date()) {
  const start = new Date(`${startedAt}T00:00:00Z`);
  const anchorDay = start.getUTCDate();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(anchorDay, daysInMonth);
  let candidate = new Date(Date.UTC(year, month, day));
  if (candidate.getTime() > now.getTime()) {
    const prevDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    candidate = new Date(Date.UTC(year, month - 1, Math.min(anchorDay, prevDays)));
  }
  if (candidate.getTime() < start.getTime()) candidate = start;
  return candidate.toISOString().slice(0, 10);
}
