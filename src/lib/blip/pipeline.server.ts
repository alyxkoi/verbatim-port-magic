// Message lifecycle (reference 4.3). Generate at receive, hold until due,
// regenerate when stale. The precedence stack (reference 3.3) is evaluated
// before anything is generated, and Blip is last in it.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { TAG_ENUM } from "@/lib/blip/config";
import { hasHardFail, runGate, violationSummary, type Violation } from "@/lib/blip/gate";
import { BlipGenerationError, callBlipJson } from "@/lib/blip/models.server";
import { getActiveRelease, type ActiveRelease } from "@/lib/blip/release.server";
import { coercePillar, isMissingPillar, type PillarSpec, type PillarValue } from "@/lib/lead-status";
import { nextSendableTime, replyDelaySeconds, segmentsFor } from "@/lib/timing";

type Db = SupabaseClient<Database>;

export const STALENESS_WINDOW_MS = 2 * 60 * 60 * 1000;

const PAIN_LANGUAGE =
  /(miss(ed|ing)?\s+(a\s+)?calls?|voicemail|no[\s-]?show|late|slow|behind|deposit|payment|invoice|forms?|reviews?|after hours|closed|busy|swamped|overwhelm|manual|spreadsheet|double[\s-]?book|follow[\s-]?up|reschedul|rebook|two locations|multiple locations|crews?)/i;

export type PipelineOutcome = {
  outcome: "generated" | "held" | "skipped";
  reason?: string;
  messageId?: string;
  violations?: Violation[];
  draft?: string;
};

type ReplyOutput = {
  reply_text?: string;
  asks_pillars?: string[];
  needs_human?: boolean;
  needs_human_reason?: string | null;
  mirrored_terms?: string[];
};

async function log(supabase: Db, entity: string, entityId: string | null, action: string, detail: unknown) {
  await supabase.from("event_log").insert({
    entity,
    entity_id: entityId,
    action,
    detail: detail as never,
  });
}

function transcriptText(messages: Array<{ id: string; direction: string; body: string; created_at: string }>) {
  return messages
    .map(
      (message) =>
        `[${message.id}] ${message.direction === "inbound" ? "lead" : "alyx"} (${message.created_at}): ${message.body}`,
    )
    .join("\n");
}

/* ------------------------------------------------------------------ *
 * Job 2 — Extract
 * ------------------------------------------------------------------ */

async function runExtract(
  supabase: Db,
  release: ActiveRelease,
  lead: { id: string; pillars: Record<string, PillarValue> },
  specs: PillarSpec[],
  messages: Array<{ id: string; direction: string; body: string; created_at: string }>,
) {
  const { data } = await callBlipJson<{
    extractions?: Array<{
      field?: string;
      value?: unknown;
      source_message_id?: string;
      confidence?: number;
      conflicts_with_existing?: boolean;
    }>;
  }>({
    job: "extract",
    system: release.compiled.extract,
    user: [
      "KNOWN FIELDS AND TYPES",
      specs.map((spec) => `${spec.key} (${spec.type})`).join("\n"),
      "",
      "ALREADY KNOWN",
      JSON.stringify(lead.pillars),
      "",
      "TRANSCRIPT",
      transcriptText(messages),
    ].join("\n"),
  });

  const pillars = { ...lead.pillars };
  const accepted: Record<string, PillarValue> = {};
  const review: Array<{ field: string; proposed: unknown; reason: string; source?: string }> = [];

  for (const extraction of data.extractions ?? []) {
    const spec = specs.find((item) => item.key === extraction.field);
    if (!spec) continue;
    const coerced = coercePillar(spec.type, extraction.value);
    if (!coerced.ok) {
      review.push({ field: spec.key, proposed: extraction.value, reason: coerced.error, source: extraction.source_message_id });
      continue;
    }
    if ((extraction.confidence ?? 1) < 0.6) {
      review.push({ field: spec.key, proposed: coerced.value, reason: "low confidence", source: extraction.source_message_id });
      continue;
    }
    const existing = pillars[spec.key];
    const conflicts =
      !isMissingPillar(existing) && JSON.stringify(existing) !== JSON.stringify(coerced.value);
    if (conflicts || extraction.conflicts_with_existing) {
      // Conflicts never silently overwrite (spec 2.2).
      review.push({
        field: spec.key,
        proposed: coerced.value,
        reason: "conflicts with what is already known",
        source: extraction.source_message_id,
      });
      continue;
    }
    pillars[spec.key] = coerced.value;
    accepted[spec.key] = coerced.value;
  }

  const complete = specs.length > 0 && specs.every((spec) => !isMissingPillar(pillars[spec.key]));
  await supabase
    .from("lead")
    .update({
      pillars: pillars as never,
      qualification_state: review.length ? "needs_review" : complete ? "complete" : "incomplete",
    })
    .eq("id", lead.id);

  await log(supabase, "lead", lead.id, "blip_extract", {
    accepted,
    review,
    release: release.number,
  });

  return { pillars, review, accepted };
}

/* ------------------------------------------------------------------ *
 * Job 3 — Tag struggles
 * ------------------------------------------------------------------ */

async function runTagStruggles(
  supabase: Db,
  release: ActiveRelease,
  lead: { id: string; tags: string[] },
  messages: Array<{ id: string; direction: string; body: string; created_at: string }>,
) {
  const allowed = new Set(
    TAG_ENUM.filter(
      (tag) => tag === "unclear" || tag === "after_hours" || release.config.logic.tagsEnabled[tag],
    ),
  );

  const { data } = await callBlipJson<{ tags?: string[]; evidence?: Record<string, string> }>({
    job: "tag",
    system: release.compiled.tag,
    user: ["TRANSCRIPT", transcriptText(messages)].join("\n"),
  });

  const tags = (data.tags ?? []).filter((tag) => allowed.has(tag) && tag !== "unclear");
  if (tags.length) {
    const merged = Array.from(new Set([...(lead.tags ?? []), ...tags]));
    await supabase.from("lead").update({ tags: merged }).eq("id", lead.id);
  }
  await log(supabase, "lead", lead.id, "blip_tagged", {
    tags,
    raw: data.tags ?? [],
    evidence: data.evidence ?? {},
    release: release.number,
  });
  return tags;
}

/* ------------------------------------------------------------------ *
 * Job 1 — Reply, then the gate
 * ------------------------------------------------------------------ */

function replyUserMessage(options: {
  lead: Record<string, unknown>;
  specs: PillarSpec[];
  pillars: Record<string, PillarValue>;
  messages: Array<{ id: string; direction: string; body: string; created_at: string }>;
  nextTargets: string[];
  violations?: Violation[];
}) {
  const known = options.specs
    .filter((spec) => !isMissingPillar(options.pillars[spec.key]))
    .map((spec) => `${spec.key} = ${JSON.stringify(options.pillars[spec.key])}`);
  const missing = options.specs
    .filter((spec) => isMissingPillar(options.pillars[spec.key]))
    .map((spec) => spec.key);

  return [
    "LEAD STATE",
    JSON.stringify(
      {
        business: options.lead["business"],
        vertical: options.lead["vertical"],
        nudge_count: options.lead["nudge_count"],
        engagement_state: options.lead["engagement_state"],
        last_inbound_at: options.lead["last_inbound_at"],
        call_requested_at: options.lead["call_requested_at"],
      },
      null,
      0,
    ),
    "",
    "KNOWN PILLARS (never ask about these again)",
    known.length ? known.join("\n") : "none yet",
    "",
    "MISSING PILLARS",
    missing.length ? missing.join(", ") : "none",
    "",
    "NEXT TARGET",
    options.nextTargets.length ? options.nextTargets.join(", ") : "nothing left to ask",
    "",
    "TRANSCRIPT",
    transcriptText(options.messages),
    ...(options.violations?.length
      ? [
          "",
          "YOUR LAST ATTEMPT WAS REJECTED BY THE VALIDATION GATE",
          options.violations.map((violation) => `- ${violation.check}: ${violation.message}`).join("\n"),
          "write it again without that violation.",
        ]
      : []),
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * The pipeline
 * ------------------------------------------------------------------ */

export async function runInboundPipeline(supabase: Db, leadId: string): Promise<PipelineOutcome> {
  const [{ data: lead, error: leadError }, { data: runtime }, { data: settings }, { data: messages }] =
    await Promise.all([
      supabase.from("lead").select("*").eq("id", leadId).single(),
      supabase.from("runtime_state").select("*").eq("id", 1).single(),
      supabase.from("app_setting").select("*").eq("id", 1).single(),
      supabase
        .from("message")
        .select("id, direction, body, status, created_at")
        .eq("lead_id", leadId)
        .in("status", ["queued", "sent", "delivered", "held"])
        .order("created_at", { ascending: true }),
    ]);
  if (leadError) throw leadError;

  // ---- Precedence stack, first blocker wins (reference 3.3) ----
  // 1. Consent and opt-out, absolute.
  if (lead.opted_out_at || lead.automation_state === "opted_out") {
    return { outcome: "skipped", reason: "opted_out" };
  }
  // 2. Kill switch.
  if (runtime?.kill_switch) {
    await log(supabase, "lead", leadId, "blip_skipped", { reason: "kill_switch" });
    return { outcome: "skipped", reason: "kill_switch" };
  }
  // 3. Per-lead takeover or a call request pause.
  if (lead.automation_state === "paused_takeover" || lead.automation_state === "paused_call") {
    return { outcome: "skipped", reason: lead.automation_state };
  }
  if (lead.automation_state === "killed" || lead.screening_state === "junk") {
    return { outcome: "skipped", reason: "screened_out" };
  }
  if (lead.screening_state === "held") {
    return { outcome: "skipped", reason: "held_for_screening" };
  }

  const release = await getActiveRelease(supabase);
  const specs = (settings?.required_pillars ?? []) as PillarSpec[];
  const history = (messages ?? []).filter((message) => message.status !== "held");

  // Extract runs on every inbound.
  let pillars = (lead.pillars ?? {}) as Record<string, PillarValue>;
  let extractReview: Array<{ field: string }> = [];
  try {
    const extracted = await runExtract(
      supabase,
      release,
      { id: leadId, pillars },
      specs,
      history,
    );
    pillars = extracted.pillars;
    extractReview = extracted.review;
  } catch (error) {
    await log(supabase, "lead", leadId, "blip_failed", {
      job: "extract",
      message: (error as Error).message,
    });
  }

  // Tag struggles only when pain language is present.
  const inboundText = history
    .filter((message) => message.direction === "inbound")
    .map((message) => message.body)
    .join(" ");
  if (PAIN_LANGUAGE.test(inboundText)) {
    try {
      await runTagStruggles(supabase, release, { id: leadId, tags: lead.tags ?? [] }, history);
    } catch (error) {
      await log(supabase, "lead", leadId, "blip_failed", {
        job: "tag",
        message: (error as Error).message,
      });
    }
  }

  // 4-6. Quiet hours and persisted timing decide when, not whether.
  const delay = replyDelaySeconds(settings!);
  const sendAfter = nextSendableTime(new Date(Date.now() + delay * 1000), settings!);

  // 7. Blip judgment, last.
  const nextTargets = specs
    .filter((spec) => isMissingPillar(pillars[spec.key]))
    .slice(0, 2)
    .map((spec) => spec.key);

  let attempt = 0;
  let violations: Violation[] = [];
  let text = "";
  let output: ReplyOutput = {};

  while (attempt < 2) {
    try {
      const result = await callBlipJson<ReplyOutput>({
        job: "reply",
        system: release.compiled.reply,
        user: replyUserMessage({
          lead: lead as Record<string, unknown>,
          specs,
          pillars,
          messages: history,
          nextTargets,
          violations: attempt ? violations : undefined,
        }),
      });
      output = result.data;
      text = String(result.data.reply_text ?? "").trim();
    } catch (error) {
      const failure = error as BlipGenerationError;
      await log(supabase, "lead", leadId, "blip_failed", {
        job: "reply",
        kind: failure.kind ?? "unknown",
        message: failure.message,
      });
      return { outcome: "held", reason: failure.message };
    }

    if (!text) {
      violations = [{ check: "empty_reply", hard: false, message: "returned no reply text" }];
    } else {
      violations = runGate({
        text,
        spec: release.gate,
        transcript: history,
        pillarSpecs: specs,
        pillars,
        callRequested: Boolean(lead.call_requested_at),
        optedOut: Boolean(lead.opted_out_at),
      });
    }

    // Hard fails hold immediately: retrying cannot make them safe.
    if (hasHardFail(violations)) break;
    if (!violations.length) break;
    attempt += 1;
  }

  const retries = attempt;
  const blocked = violations.length > 0;
  const unusual =
    Boolean(output.needs_human) || retries > 0 || extractReview.length > 0 || !text;

  const autonomy = runtime?.autonomy_level ?? "draft";
  let status: "queued" | "held" = "held";
  let heldReason: string | null = null;

  if (blocked) {
    heldReason = `gate: ${violationSummary(violations)}`;
  } else if (autonomy === "live") {
    status = "queued";
  } else if (autonomy === "assisted") {
    if (unusual) heldReason = "assisted: unusual, waiting on you";
    else status = "queued";
  } else {
    heldReason = "draft_only";
  }

  const body = text || "(no reply generated)";
  const { data: inserted, error: insertError } = await supabase
    .from("message")
    .insert({
      lead_id: leadId,
      direction: "outbound",
      body,
      status,
      held_reason: heldReason,
      send_after: sendAfter.toISOString(),
      segments: segmentsFor(body),
      authored_by: "blip",
      blip_release_id: release.id,
      validation_retries: retries,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  if (status === "queued") {
    await supabase
      .from("lead")
      .update({ stage: "talking", last_outbound_at: null })
      .eq("id", leadId)
      .eq("stage", "new");
  }
  if (blocked || output.needs_human) {
    await supabase.from("lead").update({ qualification_state: "needs_review" }).eq("id", leadId);
  }

  await log(supabase, "message", inserted.id, blocked ? "blip_held" : "blip_drafted", {
    release: release.number,
    status,
    heldReason,
    retries,
    violations,
    asks_pillars: output.asks_pillars ?? [],
    mirrored_terms: output.mirrored_terms ?? [],
    needs_human: Boolean(output.needs_human),
    needs_human_reason: output.needs_human_reason ?? null,
  });

  return {
    outcome: blocked ? "held" : "generated",
    messageId: inserted.id,
    reason: heldReason ?? undefined,
    violations,
    draft: body,
  };
}

/**
 * Staleness guard (reference 4.3): a draft generated more than two hours before
 * its send time, or one with a newer inbound behind it, is discarded and
 * regenerated rather than sent stale.
 */
export async function ensureFreshDraft(supabase: Db, messageId: string): Promise<PipelineOutcome> {
  const { data: message, error } = await supabase
    .from("message")
    .select("id, lead_id, created_at, send_after, status, authored_by")
    .eq("id", messageId)
    .single();
  if (error) throw error;
  if (message.authored_by !== "blip") return { outcome: "skipped", reason: "not_blip" };

  const generatedAt = new Date(message.created_at).getTime();
  const dueAt = message.send_after ? new Date(message.send_after).getTime() : Date.now();
  const { data: newerInbound } = await supabase
    .from("message")
    .select("id")
    .eq("lead_id", message.lead_id)
    .eq("direction", "inbound")
    .gt("created_at", message.created_at)
    .limit(1);

  const stale = Math.max(dueAt, Date.now()) - generatedAt > STALENESS_WINDOW_MS;
  if (!stale && !newerInbound?.length) return { outcome: "skipped", reason: "fresh" };

  await supabase.from("message").update({ status: "cancelled" }).eq("id", messageId);
  await log(supabase, "message", messageId, "blip_discarded_stale", {
    stale,
    newerInbound: Boolean(newerInbound?.length),
  });

  try {
    return await runInboundPipeline(supabase, message.lead_id);
  } catch (error) {
    await log(supabase, "lead", message.lead_id, "blip_failed", {
      job: "regenerate",
      message: (error as Error).message,
    });
    return { outcome: "held", reason: "regeneration failed" };
  }
}
