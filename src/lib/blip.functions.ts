import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BlipConfig } from "@/lib/blip/config";
import { CAPABILITY_TAGS } from "@/lib/blip/config";
import { correctionSignals } from "@/lib/blip/corrections";
import type { PillarSpec, PillarValue } from "@/lib/lead-status";
import { relativeTime } from "@/lib/lead-status";

export type BlipScreenData = {
  autonomy: string;
  killSwitch: boolean;
  activeNumber: number;
  dirty: boolean;
  config: BlipConfig;
  featureCount: number;
  tagFloors: Array<[string, string]>;
  metrics: { uneditedRate: number; heldForYou: number; openCorrections: number };
  corrections: Array<{
    id: string;
    lead: string;
    draft: string;
    actual: string;
    signals: Array<{ area: string; why: string }>;
    selected: string[];
  }>;
  replay: { bannedHits: number; repetition: number; wrongNextAsk: number; priceLeaks: number } | null;
};

export const getBlipScreen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlipScreenData> => {
    const { supabase } = context;
    const { draftIsDirty } = await import("@/lib/blip/release.server");

    const [{ dirty, draft, active }, { data: runtime }, { data: ruleset }] = await Promise.all([
      draftIsDirty(supabase),
      supabase.from("runtime_state").select("*").eq("id", 1).single(),
      supabase
        .from("pricing_ruleset")
        .select("features, tag_floors")
        .order("number", { ascending: false })
        .limit(1),
    ]);

    const [{ data: corrections }, { data: learning }, { data: blipMessages }, { count: heldCount }, { data: replayRows }] =
      await Promise.all([
        supabase
          .from("blip_correction")
          .select("id, lead_id, blip_draft, alyx_actual, resolved_at, created_at")
          .is("resolved_at", null)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("blip_correction_learning").select("correction_id, area, status"),
        supabase
          .from("message")
          .select("id, status")
          .eq("authored_by", "blip")
          .in("status", ["sent", "delivered"]),
        supabase
          .from("message")
          .select("id", { count: "exact", head: true })
          .eq("authored_by", "blip")
          .eq("status", "held"),
        supabase
          .from("blip_replay_run")
          .select("metrics, created_at")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    const leadIds = Array.from(new Set((corrections ?? []).map((row) => row.lead_id).filter(Boolean)));
    const { data: leads } = leadIds.length
      ? await supabase.from("lead").select("id, business").in("id", leadIds as string[])
      : { data: [] as Array<{ id: string; business: string }> };

    const { count: correctedCount } = await supabase
      .from("blip_correction")
      .select("id", { count: "exact", head: true });
    const sentCount = (blipMessages ?? []).length;
    const uneditedRate = sentCount
      ? Math.round(((sentCount - Math.min(sentCount, correctedCount ?? 0)) / sentCount) * 100)
      : 0;

    const metricsRow = (replayRows?.[0]?.metrics ?? null) as BlipScreenData["replay"];

    return {
      autonomy: runtime?.autonomy_level ?? "draft",
      killSwitch: runtime?.kill_switch ?? false,
      activeNumber: active.number,
      dirty,
      config: draft,
      featureCount: Object.keys((ruleset?.[0]?.features ?? {}) as Record<string, string>).length,
      tagFloors: CAPABILITY_TAGS.map(([tag, fallback]) => [
        tag,
        ((ruleset?.[0]?.tag_floors ?? {}) as Record<string, string>)[tag] ?? fallback,
      ]),
      metrics: {
        uneditedRate,
        heldForYou: heldCount ?? 0,
        openCorrections: (corrections ?? []).length,
      },
      corrections: (corrections ?? []).map((row) => {
        const signals = correctionSignals(row.blip_draft, row.alyx_actual, draft.behavior.bannedWords);
        const selected = (learning ?? [])
          .filter((item) => item.correction_id === row.id && item.status !== "dismissed")
          .map((item) => item.area);
        return {
          id: row.id,
          lead:
            (leads ?? []).find((lead) => lead.id === row.lead_id)?.business ??
            `Lead ${relativeTime(row.created_at)}`,
          draft: row.blip_draft,
          actual: row.alyx_actual,
          signals,
          selected: selected.length ? selected : signals.map((signal) => signal.area),
        };
      }),
      replay: metricsRow,
    };
  });

/** Autonomy is runtime state, outside any release, so it changes instantly. */
export const setAutonomy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { level: "draft" | "assisted" | "live" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("runtime_state")
      .update({ autonomy_level: data.level, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    await supabase.from("event_log").insert({
      entity: "runtime_state",
      action: "autonomy_set",
      detail: { level: data.level },
    });
    return { ok: true as const };
  });

/** Editing configuration edits the draft. Nothing changes for leads yet. */
export const saveBlipArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { area: "behavior" | "logic" | "knowledge"; value: unknown }) => input)
  .handler(async ({ data, context }) => {
    const { saveDraftArea } = await import("@/lib/blip/release.server");
    await saveDraftArea(context.supabase, data.area, data.value);
    return { ok: true as const };
  });

export const discardBlipDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { discardDraft } = await import("@/lib/blip/release.server");
    const active = await discardDraft(context.supabase);
    return { ok: true as const, number: active.number };
  });

export const promoteBlipDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { promoteDraft } = await import("@/lib/blip/release.server");
    return promoteDraft(context.supabase);
  });

/** Read-only View Compiled Prompt, plus the values the gate reads. */
export const getCompiledPrompt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadDraftConfig, getActiveRelease } = await import("@/lib/blip/release.server");
    const { compileBlipPrompts, gateSpecFor } = await import("@/lib/blip/compile");
    const [draft, active] = await Promise.all([
      loadDraftConfig(context.supabase),
      getActiveRelease(context.supabase),
    ]);
    const compiled = compileBlipPrompts(draft);
    const gate = gateSpecFor(draft);
    return {
      prompts: compiled,
      activeNumber: active.number,
      activeBytes: active.compiled.reply.length,
      gateRows: [
        ["Sentence ceiling", String(gate.maxSentences)],
        ["Banned terms", String(gate.bannedWords.length)],
        ["Em dashes", gate.blockEmDash ? "blocked" : "allowed"],
        ["Emoji", gate.blockEmoji ? "blocked" : "allowed"],
        ["Price mentions", "blocked"],
        ["Double sends", "blocked"],
      ] as Array<[string, string]>,
    };
  });

export const selectCorrectionAreas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { correctionId: string; areas: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const areas = data.areas.filter((area) =>
      ["behavior", "logic", "knowledge", "example", "none"].includes(area),
    );
    await supabase.from("blip_correction_learning").delete().eq("correction_id", data.correctionId);
    if (areas.length) {
      const { error } = await supabase.from("blip_correction_learning").insert(
        areas.map((area) => ({ correction_id: data.correctionId, area, status: "proposed" })),
      );
      if (error) throw error;
    }
    return { ok: true as const };
  });

/** Filing accepts the confirmed areas. Nothing publishes itself into config. */
export const fileCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { correctionId: string; areas: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const areas = data.areas.filter((area) =>
      ["behavior", "logic", "knowledge", "example", "none"].includes(area),
    );
    await supabase.from("blip_correction_learning").delete().eq("correction_id", data.correctionId);
    if (areas.length) {
      await supabase.from("blip_correction_learning").insert(
        areas.map((area) => ({
          correction_id: data.correctionId,
          area,
          status: area === "none" ? "dismissed" : "accepted",
        })),
      );
    }
    const { error } = await supabase
      .from("blip_correction")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", data.correctionId);
    if (error) throw error;
    await supabase.from("event_log").insert({
      entity: "blip_correction",
      entity_id: data.correctionId,
      action: "filed",
      detail: { areas },
    });
    return { ok: true as const };
  });

/**
 * Replay: run the draft's gate against the last 20 conversations. Deterministic
 * and cheap — no model calls, so it can run before every promotion.
 */
export const runReplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { loadDraftConfig, getActiveRelease } = await import("@/lib/blip/release.server");
    const { gateSpecFor } = await import("@/lib/blip/compile");
    const { runGate } = await import("@/lib/blip/gate");

    const [draft, active, { data: settings }] = await Promise.all([
      loadDraftConfig(supabase),
      getActiveRelease(supabase),
      supabase.from("app_setting").select("required_pillars").eq("id", 1).maybeSingle(),
    ]);
    const spec = gateSpecFor(draft);
    const pillarSpecs = (settings?.required_pillars ?? []) as PillarSpec[];

    const { data: leads } = await supabase
      .from("lead")
      .select("id, pillars, call_requested_at, opted_out_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const metrics = { bannedHits: 0, repetition: 0, wrongNextAsk: 0, priceLeaks: 0, punctuation: 0, ceiling: 0 };
    let conversations = 0;

    for (const lead of leads ?? []) {
      const { data: messages } = await supabase
        .from("message")
        .select("direction, body, status")
        .eq("lead_id", lead.id)
        .in("status", ["sent", "delivered", "queued"])
        .order("created_at", { ascending: true });
      const history = messages ?? [];
      const lastOutbound = [...history].reverse().find((message) => message.direction === "outbound");
      if (!lastOutbound) continue;
      conversations += 1;
      const violations = runGate({
        text: lastOutbound.body,
        spec,
        transcript: history.slice(0, Math.max(0, history.length - 1)),
        pillarSpecs,
        pillars: (lead.pillars ?? {}) as Record<string, PillarValue>,
        callRequested: Boolean(lead.call_requested_at),
        optedOut: Boolean(lead.opted_out_at),
      });
      for (const violation of violations) {
        if (violation.check === "banned_vocabulary") metrics.bannedHits += 1;
        if (violation.check === "repetition") metrics.repetition += 1;
        if (violation.check === "known_field_ask") metrics.wrongNextAsk += 1;
        if (violation.check === "price_leakage") metrics.priceLeaks += 1;
        if (violation.check === "punctuation") metrics.punctuation += 1;
        if (violation.check === "length") metrics.ceiling += 1;
      }
    }

    await supabase.from("blip_replay_run").insert({
      release_id: active.id,
      conversation_count: conversations,
      metrics: metrics as never,
    });

    return { ok: true as const, conversations, metrics };
  });

/** Generate a draft for a lead now: the same pipeline an inbound triggers. */
export const generateDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { runInboundPipeline } = await import("@/lib/blip/pipeline.server");
    return runInboundPipeline(context.supabase, data.leadId);
  });

/**
 * Approve a held draft. Regenerates first if it went stale, captures the diff as
 * a correction when Alyx edited the words, then queues it with a fresh delay.
 */
export const approveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messageId: string; body?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { ensureFreshDraft } = await import("@/lib/blip/pipeline.server");
    const { getActiveRelease } = await import("@/lib/blip/release.server");
    const { gateSpecFor } = await import("@/lib/blip/compile");
    const { runGate, violationSummary } = await import("@/lib/blip/gate");
    const { nextSendableTime, replyDelaySeconds, segmentsFor } = await import("@/lib/timing");

    const fresh = await ensureFreshDraft(supabase, data.messageId);
    const messageId = fresh.outcome === "skipped" ? data.messageId : fresh.messageId;
    if (!messageId) return { ok: false as const, reason: fresh.reason ?? "no draft" };

    const { data: message, error } = await supabase
      .from("message")
      .select("id, lead_id, body, blip_release_id, status")
      .eq("id", messageId)
      .single();
    if (error) throw error;

    const body = (data.body ?? message.body).trim();
    if (!body) return { ok: false as const, reason: "empty" };

    const [{ data: lead }, { data: settings }, { data: history }, release, { data: pillarRow }] =
      await Promise.all([
        supabase
          .from("lead")
          .select("pillars, call_requested_at, opted_out_at")
          .eq("id", message.lead_id)
          .single(),
        supabase.from("app_setting").select("*").eq("id", 1).single(),
        supabase
          .from("message")
          .select("direction, body, status")
          .eq("lead_id", message.lead_id)
          .in("status", ["sent", "delivered"])
          .order("created_at", { ascending: true }),
        getActiveRelease(supabase),
        supabase.from("app_setting").select("required_pillars").eq("id", 1).maybeSingle(),
      ]);

    // Never queue an unvalidated reply, even one Alyx retyped.
    const violations = runGate({
      text: body,
      spec: gateSpecFor(release.config),
      transcript: history ?? [],
      pillarSpecs: (pillarRow?.required_pillars ?? []) as PillarSpec[],
      pillars: (lead?.pillars ?? {}) as Record<string, PillarValue>,
      callRequested: Boolean(lead?.call_requested_at),
      optedOut: Boolean(lead?.opted_out_at),
    }).filter((violation) => violation.hard);

    if (violations.length) {
      await supabase
        .from("message")
        .update({ status: "held", held_reason: `gate: ${violationSummary(violations)}` })
        .eq("id", messageId);
      return { ok: false as const, reason: violationSummary(violations) };
    }

    const edited = body !== message.body.trim();
    if (edited) {
      // Edit before send: the diff is the signal (spec 8.1).
      const { data: correction } = await supabase
        .from("blip_correction")
        .insert({
          lead_id: message.lead_id,
          message_id: messageId,
          blip_release_id: message.blip_release_id,
          blip_draft: message.body,
          alyx_actual: body,
          kind: "edited_before_send",
        })
        .select("id")
        .single();
      if (correction) {
        const { correctionSignals: signalsFor } = await import("@/lib/blip/corrections");
        const signals = signalsFor(message.body, body, release.config.behavior.bannedWords);
        await supabase.from("blip_correction_learning").insert(
          signals.map((signal) => ({
            correction_id: correction.id,
            area: signal.area,
            status: "proposed",
          })),
        );
      }
    }

    const delay = replyDelaySeconds(settings!);
    const sendAfter = nextSendableTime(new Date(Date.now() + delay * 1000), settings!);
    const { error: updateError } = await supabase
      .from("message")
      .update({
        body,
        status: "queued",
        held_reason: null,
        send_after: sendAfter.toISOString(),
        segments: segmentsFor(body),
      })
      .eq("id", messageId);
    if (updateError) throw updateError;

    await supabase.from("event_log").insert({
      entity: "message",
      entity_id: messageId,
      action: "draft_approved",
      detail: { edited, sendAfter: sendAfter.toISOString(), release: release.number },
    });

    return { ok: true as const, messageId, edited, sendAfter: sendAfter.toISOString() };
  });
