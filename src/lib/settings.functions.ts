import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PillarSpec } from "@/lib/lead-status";

export type ConsoleSettings = {
  killSwitch: boolean;
  automation: boolean;
  autonomyLevel: string;
  firstFollowupMin: number;
  replyDelayMinSec: number;
  replyDelayMaxSec: number;
  stallNudgeHours: number;
  maxNudges: number;
  quietStart: string;
  quietEnd: string;
  timezone: string;
  requiredPillars: PillarSpec[];
  notifications: Record<string, boolean>;
};

const NOTIFICATION_DEFAULTS: Record<string, boolean> = {
  planApproval: true,
  callRequested: true,
  leadReview: true,
  paymentUnmatched: true,
  everyLead: false,
};

const NOTIFICATION_KEY = "notifications";

export const getConsoleSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConsoleSettings> => {
    const { supabase } = context;
    const [{ data: setting, error }, { data: runtime }, { data: config }] =
      await Promise.all([
        supabase.from("app_setting").select("*").eq("id", 1).single(),
        supabase.from("runtime_state").select("*").eq("id", 1).single(),
        supabase
          .from("blip_config_item")
          .select("value")
          .eq("key", NOTIFICATION_KEY)
          .maybeSingle(),
      ]);
    if (error) throw error;

    return {
      killSwitch: runtime?.kill_switch ?? false,
      automation: !(runtime?.kill_switch ?? false),
      autonomyLevel: runtime?.autonomy_level ?? "draft",
      firstFollowupMin: setting.first_followup_min,
      replyDelayMinSec: setting.reply_delay_min_sec,
      replyDelayMaxSec: setting.reply_delay_max_sec,
      stallNudgeHours: setting.stall_nudge_hours,
      maxNudges: setting.max_nudges,
      quietStart: String(setting.quiet_start).slice(0, 5),
      quietEnd: String(setting.quiet_end).slice(0, 5),
      timezone: setting.timezone,
      requiredPillars: (setting.required_pillars ?? []) as PillarSpec[],
      notifications: {
        ...NOTIFICATION_DEFAULTS,
        ...((config?.value ?? {}) as Record<string, boolean>),
      },
    };
  });

export const setKillSwitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { automation: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("runtime_state")
      .update({ kill_switch: !data.automation, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;

    if (!data.automation) {
      // Stopping automation must not leave scheduled texts in flight.
      await supabase
        .from("message")
        .update({ status: "held", held_reason: "kill_switch" })
        .eq("status", "queued");
    }
    await supabase.from("event_log").insert({
      entity: "runtime_state",
      action: data.automation ? "automation_started" : "automation_stopped",
      detail: {},
    });
    return { ok: true as const };
  });

export const saveTiming = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      firstFollowupMin?: number;
      replyDelayMinSec?: number;
      replyDelayMaxSec?: number;
      stallNudgeHours?: number;
      maxNudges?: number;
      quietStart?: string;
      quietEnd?: string;
      timezone?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: {
      first_followup_min?: number;
      reply_delay_min_sec?: number;
      reply_delay_max_sec?: number;
      stall_nudge_hours?: number;
      max_nudges?: number;
      quiet_start?: string;
      quiet_end?: string;
      timezone?: string;
    } = {};

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Math.round(value)));

    if (typeof data.firstFollowupMin === "number")
      patch.first_followup_min = clamp(data.firstFollowupMin, 1, 7200);
    if (typeof data.stallNudgeHours === "number")
      patch.stall_nudge_hours = clamp(data.stallNudgeHours, 1, 1728);
    if (typeof data.maxNudges === "number") patch.max_nudges = clamp(data.maxNudges, 0, 5);
    if (typeof data.replyDelayMinSec === "number")
      patch.reply_delay_min_sec = clamp(data.replyDelayMinSec, 1, 18000);
    if (typeof data.replyDelayMaxSec === "number")
      patch.reply_delay_max_sec = clamp(data.replyDelayMaxSec, 1, 18000);
    if (data.quietStart) patch.quiet_start = data.quietStart;
    if (data.quietEnd) patch.quiet_end = data.quietEnd;
    if (data.timezone) patch.timezone = data.timezone;

    if (
      patch.reply_delay_min_sec !== undefined &&
      patch.reply_delay_max_sec !== undefined &&
      patch.reply_delay_min_sec > patch.reply_delay_max_sec
    ) {
      return { ok: false as const, error: "The minimum delay must be below the maximum." };
    }

    if (Object.keys(patch).length) {
      const { error } = await supabase.from("app_setting").update(patch).eq("id", 1);
      if (error) throw error;
      await supabase.from("event_log").insert({
        entity: "app_setting",
        action: "timing_saved",
        detail: patch,
      });
    }
    return { ok: true as const };
  });

export const saveNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { notifications: Record<string, boolean> }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("blip_config_item").upsert(
      {
        key: NOTIFICATION_KEY,
        area: "operations",
        value: data.notifications,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw error;
    return { ok: true as const };
  });

/**
 * Pillar definitions live in app_setting so Alyx can rename or reorder them
 * without a deploy. Adding or removing one is a deploy, so the count and the
 * keys are fixed here — only labels, prompts and order can move.
 */
export const savePillarSpecs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pillars: PillarSpec[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: setting, error: readError } = await supabase
      .from("app_setting")
      .select("required_pillars")
      .eq("id", 1)
      .single();
    if (readError) throw readError;

    const current = (setting.required_pillars ?? []) as PillarSpec[];
    const currentKeys = [...current.map((pillar) => pillar.key)].sort();
    const nextKeys = [...data.pillars.map((pillar) => pillar.key)].sort();
    if (currentKeys.join("|") !== nextKeys.join("|")) {
      return {
        ok: false as const,
        error: "Adding or removing a pillar is a deploy, not a setting.",
      };
    }
    if (data.pillars.some((pillar) => !pillar.label.trim())) {
      return { ok: false as const, error: "Every pillar needs a name." };
    }

    const next = data.pillars.map((pillar) => {
      const existing = current.find((item) => item.key === pillar.key)!;
      return {
        key: pillar.key,
        type: existing.type,
        label: pillar.label.trim(),
        asks: (pillar.asks ?? "").trim(),
        feeds: existing.feeds ?? pillar.feeds ?? "",
      };
    });

    const { error } = await supabase
      .from("app_setting")
      .update({ required_pillars: next })
      .eq("id", 1);
    if (error) throw error;
    await supabase.from("event_log").insert({
      entity: "app_setting",
      action: "pillars_saved",
      detail: { pillars: next },
    });
    return { ok: true as const };
  });
