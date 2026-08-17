// Releases (spec 7). Editing configuration edits the DRAFT. Production reads
// the active release snapshot only, never live config. Promoting compiles a new
// immutable snapshot, stores the compiled bytes on it, and makes it active.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { compileBlipPrompts, compileTimeErrors, gateSpecFor, type CompiledPrompts, type GateSpec } from "@/lib/blip/compile";
import { DEFAULT_BLIP_CONFIG, type BlipConfig } from "@/lib/blip/config";

type Db = SupabaseClient<Database>;

export type ActiveRelease = {
  id: string;
  number: number;
  config: BlipConfig;
  compiled: CompiledPrompts;
  gate: GateSpec;
  promotedAt: string | null;
};

const AREAS = ["behavior", "logic", "knowledge"] as const;
export type ConfigArea = (typeof AREAS)[number];

/** Stable ordering so the same config always serialises to the same bytes. */
export function canonicalConfig(config: BlipConfig): BlipConfig {
  return {
    behavior: {
      maxSentences: config.behavior.maxSentences,
      mirroring: config.behavior.mirroring,
      lowercaseOpenings: config.behavior.lowercaseOpenings,
      noEmDash: config.behavior.noEmDash,
      noEmoji: config.behavior.noEmoji,
      noExclamation: config.behavior.noExclamation,
      bannedWords: [...config.behavior.bannedWords],
    },
    logic: {
      stallNudges: config.logic.stallNudges,
      escalateUnknown: config.logic.escalateUnknown,
      stopOnCallRequest: true,
      tagsEnabled: Object.fromEntries(
        Object.keys(config.logic.tagsEnabled)
          .sort()
          .map((key) => [key, config.logic.tagsEnabled[key] === true]),
      ),
      verticalQuestions: Object.fromEntries(
        Object.keys(config.logic.verticalQuestions)
          .sort()
          .map((key) => [key, config.logic.verticalQuestions[key]!]),
      ),
    },
    knowledge: {
      approved: config.knowledge.approved.map((entry) => ({ ...entry })),
      scopeOut: [...config.knowledge.scopeOut],
    },
  };
}

/**
 * Deep key-sorted bytes. JSONB does not preserve object key order, so a config
 * read back from the database must serialise identically to the same config in
 * memory or the draft would always look dirty.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function serialise(config: BlipConfig) {
  return stableStringify(canonicalConfig(config));
}

/** The draft: granular config items, one row per area. */
export async function loadDraftConfig(supabase: Db): Promise<BlipConfig> {
  const { data, error } = await supabase
    .from("blip_config_item")
    .select("key, value")
    .in("key", [...AREAS]);
  if (error) throw error;

  const config = canonicalConfig(DEFAULT_BLIP_CONFIG);
  for (const row of data ?? []) {
    const area = row.key as ConfigArea;
    if (!AREAS.includes(area)) continue;
    Object.assign(config[area] as Record<string, unknown>, row.value as Record<string, unknown>);
  }
  config.logic.stopOnCallRequest = true;
  return canonicalConfig(config);
}

export async function saveDraftArea(supabase: Db, area: ConfigArea, value: unknown) {
  const { error } = await supabase.from("blip_config_item").upsert(
    { key: area, area, value: value as never, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw error;
}

function releaseFromRow(row: {
  id: string;
  number: number;
  config_snapshot: unknown;
  compiled_prompts: unknown;
  promoted_at: string | null;
}): ActiveRelease {
  const config = canonicalConfig(row.config_snapshot as BlipConfig);
  return {
    id: row.id,
    number: row.number,
    config,
    compiled: row.compiled_prompts as CompiledPrompts,
    gate: gateSpecFor(config),
    promotedAt: row.promoted_at,
  };
}

/**
 * The snapshot production reads. If nothing has ever been promoted, v1 is
 * compiled from the seeded defaults so there is always a release to stamp on a
 * message.
 */
export async function getActiveRelease(supabase: Db): Promise<ActiveRelease> {
  const { data, error } = await supabase
    .from("blip_release")
    .select("id, number, config_snapshot, compiled_prompts, promoted_at")
    .eq("status", "active")
    .order("number", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (data?.[0]) return releaseFromRow(data[0]);

  const config = await loadDraftConfig(supabase);
  const compiled = compileBlipPrompts(config);
  const { data: inserted, error: insertError } = await supabase
    .from("blip_release")
    .insert({
      number: 1,
      status: "active",
      config_snapshot: canonicalConfig(config) as never,
      knowledge_snapshot: config.knowledge as never,
      compiled_prompts: compiled as never,
      promoted_at: new Date().toISOString(),
      notes: "Initial release, compiled from the seeded defaults.",
    })
    .select("id, number, config_snapshot, compiled_prompts, promoted_at")
    .single();
  if (insertError) {
    // A concurrent caller may have created it first.
    const { data: existing } = await supabase
      .from("blip_release")
      .select("id, number, config_snapshot, compiled_prompts, promoted_at")
      .eq("status", "active")
      .order("number", { ascending: false })
      .limit(1);
    if (existing?.[0]) return releaseFromRow(existing[0]);
    throw insertError;
  }
  return releaseFromRow(inserted);
}

export async function draftIsDirty(supabase: Db) {
  const [draft, active] = await Promise.all([loadDraftConfig(supabase), getActiveRelease(supabase)]);
  return { dirty: serialise(draft) !== serialise(active.config), draft, active };
}

/** Discard the draft: config items go back to the active snapshot. */
export async function discardDraft(supabase: Db) {
  const active = await getActiveRelease(supabase);
  for (const area of AREAS) {
    await saveDraftArea(supabase, area, active.config[area]);
  }
  return active;
}

export async function promoteDraft(supabase: Db, notes?: string) {
  const draft = await loadDraftConfig(supabase);
  const errors = compileTimeErrors(draft);
  if (errors.length) return { ok: false as const, errors };

  const active = await getActiveRelease(supabase);
  if (serialise(draft) === serialise(active.config)) {
    return { ok: false as const, errors: ["Nothing has changed since the active release."] };
  }

  const compiled = compileBlipPrompts(draft);
  const { data: highest } = await supabase
    .from("blip_release")
    .select("number")
    .order("number", { ascending: false })
    .limit(1);
  const nextNumber = (highest?.[0]?.number ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("blip_release")
    .insert({
      number: nextNumber,
      status: "active",
      config_snapshot: canonicalConfig(draft) as never,
      knowledge_snapshot: draft.knowledge as never,
      compiled_prompts: compiled as never,
      parent_release_id: active.id,
      promoted_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .select("id, number")
    .single();
  if (error) throw error;

  await supabase.from("blip_release").update({ status: "archived" }).eq("id", active.id);
  await supabase.from("event_log").insert({
    entity: "blip_release",
    entity_id: inserted.id,
    action: "promoted",
    detail: { number: inserted.number, from: active.number },
  });

  return { ok: true as const, number: inserted.number, id: inserted.id };
}
