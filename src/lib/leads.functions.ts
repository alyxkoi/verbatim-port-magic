import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  coercePillar,
  deriveDisplayStatus,
  initials,
  manualStatusFromTags,
  pillarsComplete,
  relativeTime,
  withManualStatusTag,
  type DisplayStatus,
  type PillarSpec,
  type PillarValue,
} from "@/lib/lead-status";
import { nextSendableTime, replyDelaySeconds, segmentsFor } from "@/lib/timing";

export type LeadListRow = {
  id: string;
  business: string;
  contact: string;
  initials: string;
  phone: string;
  email: string;
  source: string;
  preview: string;
  time: string;
  displayStatus: DisplayStatus;
  flags: string[];
  takenOver: boolean;
  updatedIso: string;
  hasPlan: boolean;
  pillarsComplete: boolean;
};

export type LeadDetail = LeadListRow & {
  vertical: string[][];
  pillars: Record<string, PillarValue>;
  messages: Array<{
    id: string;
    direction: string;
    body: string;
    status: string;
    authored_by: string;
    send_after: string | null;
    sent_at: string | null;
    created_at: string;
  }>;
  plan: { id: string; tier: string; monthly: number; status: string; views: number } | null;
};

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [{ data: leads, error }, { data: plans }, { data: settingRow }] =
      await Promise.all([
        supabase.from("lead").select("*").order("created_at", { ascending: false }),
        supabase.from("plan").select("id, lead_id, tier, monthly, status, views"),
        supabase.from("app_setting").select("required_pillars").eq("id", 1).maybeSingle(),
      ]);
    if (error) throw error;

    const leadIds = (leads ?? []).map((lead) => lead.id);
    const { data: messages } = leadIds.length
      ? await supabase
          .from("message")
          .select("id, lead_id, direction, body, status, created_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [] as Array<Record<string, never>> };

    const { data: screening } = leadIds.length
      ? await supabase
          .from("event_log")
          .select("entity_id, action, detail, created_at")
          .eq("entity", "lead")
          .eq("action", "screened")
          .in("entity_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [] as Array<Record<string, never>> };

    const specs = (settingRow?.required_pillars ?? []) as PillarSpec[];

    const rows: LeadListRow[] = (leads ?? []).map((lead) => {
      const latest = (messages ?? []).find(
        (message) => (message as { lead_id: string }).lead_id === lead.id,
      ) as { body?: string } | undefined;
      const plan = (plans ?? []).find((item) => item.lead_id === lead.id);
      const flagRow = (screening ?? []).find(
        (event) => (event as { entity_id: string }).entity_id === lead.id,
      ) as { detail?: { flags?: string[] } } | undefined;
      const updatedIso =
        lead.last_inbound_at ?? lead.last_outbound_at ?? lead.created_at;

      return {
        id: lead.id,
        business: lead.business,
        contact: lead.contact ?? "",
        initials: initials(lead.business),
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        source: lead.source ?? "Direct",
        preview: latest?.body ?? "No messages yet",
        time: relativeTime(updatedIso),
        displayStatus: deriveDisplayStatus(lead, {
          hasPlan: Boolean(plan),
          manual: manualStatusFromTags(lead.tags),
        }),
        flags: flagRow?.detail?.flags ?? [],
        takenOver: lead.automation_state === "paused_takeover",
        updatedIso,
        hasPlan: Boolean(plan),
        pillarsComplete: pillarsComplete(
          specs,
          (lead.pillars ?? {}) as Record<string, PillarValue>,
        ),
      };
    });

    return { leads: rows, pillarSpecs: specs };
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string }) => input)
  .handler(async ({ data, context }): Promise<LeadDetail> => {
    const { supabase } = context;
    const [{ data: lead, error }, { data: messages }, { data: plans }, { data: settingRow }, { data: screening }] =
      await Promise.all([
        supabase.from("lead").select("*").eq("id", data.leadId).single(),
        supabase
          .from("message")
          .select("id, direction, body, status, authored_by, send_after, sent_at, created_at")
          .eq("lead_id", data.leadId)
          .order("created_at", { ascending: true }),
        supabase
          .from("plan")
          .select("id, tier, monthly, status, views")
          .eq("lead_id", data.leadId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("app_setting").select("required_pillars, vertical_questions").eq("id", 1).maybeSingle(),
        supabase
          .from("event_log")
          .select("detail")
          .eq("entity", "lead")
          .eq("entity_id", data.leadId)
          .eq("action", "screened")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
    if (error) throw error;

    const specs = (settingRow?.required_pillars ?? []) as PillarSpec[];
    const pillars = (lead.pillars ?? {}) as Record<string, PillarValue>;
    const plan = plans?.[0] ?? null;
    const updatedIso = lead.last_inbound_at ?? lead.last_outbound_at ?? lead.created_at;
    const verticalAnswers = (pillars["vertical_answers"] ?? null) as unknown;

    return {
      id: lead.id,
      business: lead.business,
      contact: lead.contact ?? "",
      initials: initials(lead.business),
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      source: lead.source ?? "Direct",
      preview: messages?.at(-1)?.body ?? "No messages yet",
      time: relativeTime(updatedIso),
      displayStatus: deriveDisplayStatus(lead, {
        hasPlan: Boolean(plan),
        manual: manualStatusFromTags(lead.tags),
      }),
      flags: ((screening?.[0]?.detail as { flags?: string[] } | null)?.flags ?? []) as string[],
      takenOver: lead.automation_state === "paused_takeover",
      updatedIso,
      hasPlan: Boolean(plan),
      pillarsComplete: pillarsComplete(specs, pillars),
      vertical: Array.isArray(verticalAnswers) ? (verticalAnswers as string[][]) : [],
      pillars,
      messages: messages ?? [],
      plan,
    };
  });

export const savePillars = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; values: Record<string, string> }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: settingRow }, { data: lead, error: leadError }] = await Promise.all([
      supabase.from("app_setting").select("required_pillars").eq("id", 1).maybeSingle(),
      supabase.from("lead").select("pillars").eq("id", data.leadId).single(),
    ]);
    if (leadError) throw leadError;

    const specs = (settingRow?.required_pillars ?? []) as PillarSpec[];
    const pillars = { ...((lead.pillars ?? {}) as Record<string, PillarValue>) };
    const errors: Record<string, string> = {};

    // Types are enforced in code before write (2.2).
    for (const spec of specs) {
      if (!(spec.key in data.values)) continue;
      const result = coercePillar(spec.type, data.values[spec.key]);
      if (result.ok) pillars[spec.key] = result.value;
      else errors[spec.key] = result.error;
    }
    if (Object.keys(errors).length) return { ok: false as const, errors };

    const complete = pillarsComplete(specs, pillars);
    const { error } = await supabase
      .from("lead")
      .update({
        pillars,
        qualification_state: complete ? "complete" : "incomplete",
      })
      .eq("id", data.leadId);
    if (error) throw error;

    await supabase.from("event_log").insert({
      entity: "lead",
      entity_id: data.leadId,
      action: "pillars_saved",
      detail: { pillars, complete },
    });

    return { ok: true as const, errors: {}, complete };
  });

export const setLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; status: DisplayStatus }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lead, error: leadError } = await supabase
      .from("lead")
      .select("tags, opted_out_at, screening_state")
      .eq("id", data.leadId)
      .single();
    if (leadError) throw leadError;

    // No manual change overrides opted out (3.5).
    if (lead.opted_out_at) return { ok: false as const, reason: "opted_out" };

    const patch: {
      tags: string[];
      call_requested_at: null;
      qualification_state: string;
      screening_state?: string;
      stage?: string;
      automation_state?: string;
    } = {
      tags: withManualStatusTag(lead.tags, data.status),
      call_requested_at: null,
      qualification_state: "incomplete",
    };
    if (lead.screening_state === "held") patch.screening_state = "soft_flag";

    if (data.status === "new") patch.stage = "new";
    if (data.status === "talking") patch.stage = "talking";
    if (data.status === "review") patch.qualification_state = "needs_review";
    if (data.status === "drafted") {
      patch.stage = "talking";
      patch.qualification_state = "complete";
    }
    if (data.status === "won") patch.stage = "won";
    if (data.status === "closed") {
      patch.stage = "closed";
      patch.automation_state = "paused_call";
    }

    const { error } = await supabase.from("lead").update(patch).eq("id", data.leadId);
    if (error) throw error;

    await supabase.from("event_log").insert({
      entity: "lead",
      entity_id: data.leadId,
      action: "status_set",
      detail: { status: data.status },
    });
    return { ok: true as const };
  });

export const markLeadJunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("lead")
      .update({ screening_state: "junk", stage: "closed", automation_state: "killed" })
      .eq("id", data.leadId);
    if (error) throw error;
    await supabase
      .from("message")
      .update({ status: "cancelled" })
      .eq("lead_id", data.leadId)
      .eq("status", "queued");
    await supabase.from("event_log").insert({
      entity: "lead",
      entity_id: data.leadId,
      action: "marked_junk",
      detail: {},
    });
    return { ok: true as const };
  });

export const restoreLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lead, error: leadError } = await supabase
      .from("lead")
      .select("tags, opted_out_at")
      .eq("id", data.leadId)
      .single();
    if (leadError) throw leadError;
    if (lead.opted_out_at) return { ok: false as const, reason: "opted_out" };
    const { error } = await supabase
      .from("lead")
      .update({
        screening_state: "clean",
        stage: "talking",
        automation_state: "active",
        tags: withManualStatusTag(lead.tags, null),
      })
      .eq("id", data.leadId);
    if (error) throw error;
    await supabase.from("event_log").insert({
      entity: "lead",
      entity_id: data.leadId,
      action: "restored",
      detail: {},
    });
    return { ok: true as const };
  });

export const setTakeover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; takeover: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("lead")
      .update({ automation_state: data.takeover ? "paused_takeover" : "active" })
      .eq("id", data.leadId);
    if (error) throw error;
    if (data.takeover) {
      // Alyx is replying: nothing Blip queued should still go out.
      await supabase
        .from("message")
        .update({ status: "cancelled" })
        .eq("lead_id", data.leadId)
        .eq("status", "queued")
        .eq("authored_by", "blip");
    }
    await supabase.from("event_log").insert({
      entity: "lead",
      entity_id: data.leadId,
      action: data.takeover ? "takeover" : "automation_resumed",
      detail: {},
    });
    return { ok: true as const };
  });

/**
 * Manual text, typed by Alyx. Queued as a row with a send_after inside the
 * configured reply delay range, pushed past quiet hours.
 */
export const sendManualMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const body = data.body.trim();
    if (!body) return { ok: false as const, reason: "empty" };

    const [{ data: settings }, { data: runtime }] = await Promise.all([
      supabase
        .from("app_setting")
        .select("reply_delay_min_sec, reply_delay_max_sec, quiet_start, quiet_end, timezone")
        .eq("id", 1)
        .single(),
      supabase.from("runtime_state").select("kill_switch").eq("id", 1).single(),
    ]);

    const delay = replyDelaySeconds(settings!);
    const sendAfter = nextSendableTime(new Date(Date.now() + delay * 1000), settings!);
    const held = runtime?.kill_switch === true;

    const { data: inserted, error } = await supabase
      .from("message")
      .insert({
        lead_id: data.leadId,
        direction: "outbound",
        body,
        status: held ? "held" : "queued",
        held_reason: held ? "kill_switch" : null,
        send_after: sendAfter.toISOString(),
        segments: segmentsFor(body),
        authored_by: "alyx",
      })
      .select("id, send_after, status")
      .single();
    if (error) throw error;

    // Typing a reply takes the conversation over from Blip.
    await supabase
      .from("lead")
      .update({
        automation_state: "paused_takeover",
        last_outbound_at: new Date().toISOString(),
        stage: "talking",
      })
      .eq("id", data.leadId);

    await supabase.from("event_log").insert({
      entity: "message",
      entity_id: inserted.id,
      action: "queued_by_alyx",
      detail: { leadId: data.leadId, sendAfter: inserted.send_after, delay },
    });

    return { ok: true as const, message: inserted };
  });

export const cancelQueuedMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messageId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("message")
      .update({ status: "cancelled" })
      .eq("id", data.messageId)
      .eq("status", "queued");
    if (error) throw error;
    await supabase.from("event_log").insert({
      entity: "message",
      entity_id: data.messageId,
      action: "cancelled",
      detail: {},
    });
    return { ok: true as const };
  });

/**
 * An inbound reply cancels everything still queued for that lead: whatever was
 * scheduled was written before the lead said this.
 */
export const recordInboundMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const now = new Date().toISOString();
    const { error } = await supabase.from("message").insert({
      lead_id: data.leadId,
      direction: "inbound",
      body: data.body,
      status: "delivered",
      sent_at: now,
      authored_by: "lead",
      segments: segmentsFor(data.body),
    });
    if (error) throw error;
    const { data: cancelled } = await supabase
      .from("message")
      .update({ status: "cancelled" })
      .eq("lead_id", data.leadId)
      .eq("status", "queued")
      .select("id");
    await supabase
      .from("lead")
      .update({ last_inbound_at: now, engagement_state: "replying", stage: "talking" })
      .eq("id", data.leadId);
    return { ok: true as const, cancelled: cancelled?.length ?? 0 };
  });
