// Segment counting. Every segment that leaves or arrives on a client number
// increments client_usage. The cap never blocks a live conversation: it only
// records, warns at 80 percent, and displays the absorbed overage.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { allowanceFor, overageSegments, periodStart, WARN_AT } from "@/lib/allowance";
import { sendOperatorEmail } from "@/lib/notify.server";

type Db = SupabaseClient<Database>;

export type UsageClient = { id: string; name: string; tier: string; started_at: string };

/** Resolves the client behind a lead, if that lead became one. */
export async function clientForLead(supabase: Db, leadId: string) {
  const { data } = await supabase
    .from("client")
    .select("id, name, tier, started_at, sent_number, sent_subaccount_id, status")
    .eq("lead_id", leadId)
    .maybeSingle();
  return data ?? null;
}

export async function recordSegments(supabase: Db, client: UsageClient, segments: number) {
  if (segments <= 0) return;
  const period = periodStart(client.started_at);
  const allowance = allowanceFor(client.tier);

  const { data: existing } = await supabase
    .from("client_usage")
    .select("id, segments_used, warned_at_80, warned_email_at")
    .eq("client_id", client.id)
    .eq("period_start", period)
    .maybeSingle();

  const used = (existing?.segments_used ?? 0) + segments;
  const overage = overageSegments(used, client.tier);

  if (existing) {
    await supabase
      .from("client_usage")
      .update({ segments_used: used, overage_segments: overage })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("client_usage")
      .insert({ client_id: client.id, period_start: period, segments_used: used, overage_segments: overage });
  }

  if (overage > 0) {
    await supabase.from("event_log").insert({
      entity: "client",
      entity_id: client.id,
      action: "usage_overage",
      detail: { period, used, allowance, overage_segments: overage, charged: false },
    });
  }

  // Warn once per period, in the Today queue and by email.
  if (used >= allowance * WARN_AT && !existing?.warned_at_80) {
    const now = new Date().toISOString();
    await supabase
      .from("client_usage")
      .update({ warned_at_80: now, warned_email_at: now })
      .eq("client_id", client.id)
      .eq("period_start", period);
    await supabase.from("event_log").insert({
      entity: "client",
      entity_id: client.id,
      action: "usage_warning_80",
      detail: { period, used, allowance },
    });
    await sendOperatorEmail(
      `${client.name} is at ${Math.round((used / allowance) * 100)}% of its texts`,
      `${client.name} has used ${used.toLocaleString()} of ${allowance.toLocaleString()} included segments this period.\n\nNothing is blocked and nothing is charged. Overage is absorbed.`,
    );
  }
}
