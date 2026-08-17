// daily-maintenance, cron. Expires plans at 30 days, opens the new usage
// period for each client, and recomputes the decision queue read model.
import { createFileRoute } from "@tanstack/react-router";

import { allowanceFor, overageSegments, periodStart, WARN_AT } from "@/lib/allowance";
import { sendOperatorEmail } from "@/lib/notify.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function authorized(request: Request) {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return false;
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return header === secret;
}

async function run(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Plans expire 30 days after they were sent.
  const { data: expired } = await supabaseAdmin
    .from("plan")
    .update({ status: "expired" })
    .eq("status", "sent")
    .lt("expires_at", nowIso)
    .select("id");

  // 2. Usage periods roll forward. A fresh row per client per period.
  const { data: clients } = await supabaseAdmin
    .from("client")
    .select("id, name, tier, started_at, status")
    .eq("status", "active");

  let periodsOpened = 0;
  const warnings: string[] = [];

  for (const client of clients ?? []) {
    const period = periodStart(client.started_at, now);
    const { data: usage } = await supabaseAdmin
      .from("client_usage")
      .select("id, segments_used, warned_at_80")
      .eq("client_id", client.id)
      .eq("period_start", period)
      .maybeSingle();

    if (!usage) {
      await supabaseAdmin
        .from("client_usage")
        .insert({ client_id: client.id, period_start: period, segments_used: 0, overage_segments: 0 });
      periodsOpened += 1;
      continue;
    }

    const allowance = allowanceFor(client.tier);
    await supabaseAdmin
      .from("client_usage")
      .update({ overage_segments: overageSegments(usage.segments_used, client.tier) })
      .eq("id", usage.id);

    if (usage.segments_used >= allowance * WARN_AT && !usage.warned_at_80) {
      await supabaseAdmin
        .from("client_usage")
        .update({ warned_at_80: nowIso, warned_email_at: nowIso })
        .eq("id", usage.id);
      warnings.push(`${client.name}: ${usage.segments_used.toLocaleString()} of ${allowance.toLocaleString()}`);
    }
  }

  if (warnings.length) {
    await sendOperatorEmail(
      `${warnings.length} client${warnings.length === 1 ? "" : "s"} past 80% of texts`,
      `${warnings.join("\n")}\n\nNothing is blocked and nothing is charged.`,
    );
  }

  // 3. Recompute the decision queue. It is a read model, so the recompute is a
  //    freshness stamp plus the derived counts logged for the day.
  const [{ count: held }, { count: drafts }, { count: calls }] = await Promise.all([
    supabaseAdmin.from("message").select("id", { count: "exact", head: true }).eq("status", "held"),
    supabaseAdmin
      .from("message")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .eq("direction", "outbound"),
    supabaseAdmin.from("lead").select("id", { count: "exact", head: true }).not("call_requested_at", "is", null),
  ]);

  await supabaseAdmin.from("event_log").insert({
    entity: "system",
    entity_id: null,
    action: "daily_maintenance",
    detail: {
      plans_expired: expired?.length ?? 0,
      periods_opened: periodsOpened,
      warnings: warnings.length,
      queue: { held: held ?? 0, queued: drafts ?? 0, calls_requested: calls ?? 0 },
    },
  });

  return json({
    ok: true,
    plans_expired: expired?.length ?? 0,
    periods_opened: periodsOpened,
    warnings: warnings.length,
  });
}

export const Route = createFileRoute("/api/public/daily-maintenance")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
