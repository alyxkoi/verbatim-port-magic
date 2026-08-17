// Derived lead status, filters and typed pillars.
//
// Reference: sections 2.1 (six machine fields), 2.2 (five typed pillars) and
// 3.5 (visible status is derived, never stored). Nothing here is AI.

export type PillarType = "choice" | "integer" | "boolean" | "tag_array";

export type PillarSpec = {
  key: string;
  type: PillarType;
  label: string;
  asks?: string;
  feeds?: string;
};

export type PillarValue = string | number | boolean | string[] | null;

/** UI type labels from the prototype, mapped onto the stored pillar types. */
export const PILLAR_TYPE_COPY: Record<PillarType, [string, string]> = {
  integer: ["Number", "Must come back as a figure"],
  boolean: ["Yes or no", "Must come back as true or false"],
  choice: ["Choice", "Must match a known option"],
  tag_array: ["Tags", "Maps to capability tags"],
};

export const PILLAR_FEEDS: Record<string, string> = {
  business_type: "Plan language and which vertical questions Blip asks",
  staff_count: "Scale floor",
  location_count: "Scale floor, decisive on its own",
  takes_payments: "Second Operations signal, Connected floor",
  primary_struggle: "Capability floor",
};

/* ------------------------------------------------------------------ *
 * Machine state
 * ------------------------------------------------------------------ */

export type LeadMachine = {
  stage: string;
  screening_state: string;
  automation_state: string;
  qualification_state: string;
  engagement_state: string;
  call_requested_at: string | null;
  opted_out_at: string | null;
};

export type DisplayStatus =
  | "new"
  | "talking"
  | "review"
  | "drafted"
  | "won"
  | "closed";

/** Tone map ported verbatim from statusMap in alyxlab-console.html. */
export const STATUS_MAP: Record<string, [string, string]> = {
  new: ["New", "muted"],
  talking: ["Talking", "cyan"],
  review: ["Needs review", "pulse"],
  drafted: ["Drafted", "pulse"],
  won: ["Won", "volt"],
  closed: ["Closed", "muted"],
};

/**
 * Precedence, highest first:
 *   opted out / closed-by-machine  ->  closed  (nothing overrides opted out)
 *   held or soft-flagged screening, needs_review, or a call request -> review
 *   a plan exists for the lead     ->  drafted (passed in by the caller)
 *   stage talking / replying       ->  talking
 */
export function deriveDisplayStatus(
  lead: LeadMachine,
  opts: { hasPlan?: boolean; manual?: DisplayStatus | null } = {},
): DisplayStatus {
  // Opted out beats everything, and no manual change overrides it (3.5).
  if (lead.opted_out_at || lead.automation_state === "opted_out") return "closed";
  if (lead.stage === "closed" || lead.screening_state === "junk") return "closed";
  if (lead.stage === "won") return "won";
  if (
    lead.screening_state === "held" ||
    lead.qualification_state === "needs_review" ||
    lead.call_requested_at
  ) {
    return "review";
  }
  if (opts.manual) return opts.manual;
  if (opts.hasPlan) return "drafted";
  if (lead.stage === "talking") return "talking";
  return "new";
}

/**
 * A manual status choice is kept as a `status:<value>` marker on `lead.tags`
 * so the visible status stays derived rather than stored in its own column.
 */
export const MANUAL_STATUS_PREFIX = "status:";

export function manualStatusFromTags(tags: string[] | null | undefined) {
  const marker = (tags ?? []).find((tag) => tag.startsWith(MANUAL_STATUS_PREFIX));
  if (!marker) return null;
  const value = marker.slice(MANUAL_STATUS_PREFIX.length) as DisplayStatus;
  return LEAD_MANUAL_STATUS_OPTIONS.some(([status]) => status === value) ? value : null;
}

export function withManualStatusTag(
  tags: string[] | null | undefined,
  status: DisplayStatus | null,
) {
  const rest = (tags ?? []).filter((tag) => !tag.startsWith(MANUAL_STATUS_PREFIX));
  return status ? [...rest, `${MANUAL_STATUS_PREFIX}${status}`] : rest;
}

export const LEAD_FILTERS: Array<[string, string]> = [
  ["all", "All"],
  ["needs_you", "Needs you"],
  ["active", "Active"],
  ["plans", "Plans"],
  ["won", "Won"],
  ["closed", "Closed"],
];

export const LEAD_MANUAL_STATUS_OPTIONS: Array<[DisplayStatus, string]> = [
  ["new", "New"],
  ["talking", "Talking"],
  ["review", "Needs review"],
  ["drafted", "Drafted"],
  ["won", "Won"],
  ["closed", "Closed"],
];

export function leadMatchesFilter(displayStatus: DisplayStatus, filter: string) {
  if (filter === "all") return true;
  if (filter === "needs_you") return ["review", "drafted"].includes(displayStatus);
  if (filter === "active") return ["new", "talking"].includes(displayStatus);
  if (filter === "plans") return displayStatus === "drafted";
  if (filter === "won") return displayStatus === "won";
  if (filter === "closed") return displayStatus === "closed";
  return displayStatus === filter;
}

const SORT_PRIORITY: Record<DisplayStatus, number> = {
  review: 0,
  drafted: 1,
  talking: 2,
  new: 3,
  won: 4,
  closed: 5,
};

export function leadSortPriority(displayStatus: DisplayStatus) {
  return SORT_PRIORITY[displayStatus] ?? 20;
}

/* ------------------------------------------------------------------ *
 * Typed pillars — enforced in code before write (2.2)
 * ------------------------------------------------------------------ */

export function isMissingPillar(value: PillarValue | undefined) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  const normalized = String(value).trim();
  return !normalized || normalized === "\u2014" || normalized === "-";
}

export function completedPillarCount(
  specs: PillarSpec[],
  pillars: Record<string, PillarValue>,
) {
  return specs.filter((spec) => !isMissingPillar(pillars[spec.key])).length;
}

export function pillarsComplete(
  specs: PillarSpec[],
  pillars: Record<string, PillarValue>,
) {
  return specs.length > 0 && completedPillarCount(specs, pillars) === specs.length;
}

/** Text out of the drawer input, coerced to the pillar's declared type. */
export function coercePillar(
  type: PillarType,
  raw: unknown,
): { ok: true; value: PillarValue } | { ok: false; error: string } {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { ok: true, value: null };
  }
  const text = String(raw).trim();
  if (type === "integer") {
    if (!/^-?\d+$/.test(text)) return { ok: false, error: "Must be a whole number" };
    return { ok: true, value: Number(text) };
  }
  if (type === "boolean") {
    if (/^(yes|true|y)$/i.test(text)) return { ok: true, value: true };
    if (/^(no|false|n)$/i.test(text)) return { ok: true, value: false };
    return { ok: false, error: "Must be yes or no" };
  }
  if (type === "tag_array") {
    const tags = text
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!tags.length) return { ok: false, error: "Add at least one tag" };
    return { ok: true, value: tags };
  }
  return { ok: true, value: text };
}

/** Display form for a stored pillar value. */
export function pillarText(value: PillarValue | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function initials(business: string) {
  return business
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** Compact relative time in the prototype's shape: 4m, 3h, 2d, Yesterday. */
export function relativeTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d`;
}
