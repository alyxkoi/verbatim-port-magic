// message-worker, cron every minute. Sends what is due, pushes quiet-hours
// sends forward rather than deleting them, and refuses to blast a stale queue
// when automation comes back on. Only consent and the kill switch stop a send.
import { createFileRoute } from "@tanstack/react-router";

import { normalizePhone, sendText } from "@/lib/sms.server";
import { isQuietHour, nextSendableTime, segmentsFor } from "@/lib/timing";
import { clientForLead, recordSegments } from "@/lib/usage.server";

const BATCH = 40;
/** Anything queued more than this long ago is stale and is not sent. */
const STALE_MS = 2 * 60 * 60 * 1000;

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

  const [{ data: runtime }, { data: setting }] = await Promise.all([
    supabaseAdmin.from("runtime_state").select("kill_switch").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("app_setting").select("*").eq("id", 1).maybeSingle(),
  ]);

  // The kill switch stops sending outright. Nothing is deleted.
  if (runtime?.kill_switch) return json({ ok: true, sent: 0, reason: "kill switch" });

  const timing = {
    reply_delay_min_sec: setting?.reply_delay_min_sec ?? 30,
    reply_delay_max_sec: setting?.reply_delay_max_sec ?? 60,
    quiet_start: String(setting?.quiet_start ?? "21:00"),
    quiet_end: String(setting?.quiet_end ?? "08:00"),
    timezone: String(setting?.timezone ?? "America/Chicago"),
  };

  const { data: due } = await supabaseAdmin
    .from("message")
    .select("id, lead_id, body, segments, send_after, created_at")
    .eq("direction", "outbound")
    .eq("status", "queued")
    .lte("send_after", now.toISOString())
    .order("send_after", { ascending: true })
    .limit(BATCH);

  let sent = 0;
  let deferred = 0;
  let cancelled = 0;
  let failed = 0;

  for (const message of due ?? []) {
    const dueAt = new Date(message.send_after ?? message.created_at);

    // Stale queue guard: never fire a backlog at a lead hours later.
    if (now.getTime() - dueAt.getTime() > STALE_MS) {
      await supabaseAdmin
        .from("message")
        .update({ status: "cancelled", held_reason: "stale queue, not sent" })
        .eq("id", message.id);
      cancelled += 1;
      continue;
    }

    // Quiet hours push the row forward. Nothing is dropped.
    if (isQuietHour(now, timing)) {
      await supabaseAdmin
        .from("message")
        .update({ send_after: nextSendableTime(now, timing).toISOString() })
        .eq("id", message.id);
      deferred += 1;
      continue;
    }

    const { data: lead } = await supabaseAdmin
      .from("lead")
      .select("id, phone, consent_at, opted_out_at, automation_state")
      .eq("id", message.lead_id)
      .maybeSingle();

    // Consent is the other hard stop.
    if (!lead || !lead.phone || lead.opted_out_at || lead.automation_state === "opted_out") {
      await supabaseAdmin
        .from("message")
        .update({ status: "cancelled", held_reason: "no consent to text" })
        .eq("id", message.id);
      cancelled += 1;
      continue;
    }

    const client = await clientForLead(supabaseAdmin, lead.id);
    const segments = message.segments || segmentsFor(message.body);

    try {
      const result = await sendText({
        to: normalizePhone(lead.phone),
        body: message.body,
        from: client?.sent_number ?? process.env["SENT_DEFAULT_NUMBER"] ?? null,
        subaccountId: client?.sent_subaccount_id ?? process.env["SENT_DEFAULT_SUBACCOUNT_ID"] ?? null,
      });

      await supabaseAdmin
        .from("message")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_id: result.providerId,
          segments: result.segments || segments,
          held_reason: null,
        })
        .eq("id", message.id);

      await supabaseAdmin
        .from("lead")
        .update({ last_outbound_at: new Date().toISOString() })
        .eq("id", lead.id);

      // Usage is recorded after the send, never used to block one.
      if (client) await recordSegments(supabaseAdmin, client, result.segments || segments);
      sent += 1;
    } catch (error) {
      failed += 1;
      await supabaseAdmin
        .from("message")
        .update({ status: "failed", held_reason: (error as Error).message.slice(0, 300) })
        .eq("id", message.id);
      await supabaseAdmin.from("event_log").insert({
        entity: "message",
        entity_id: message.id,
        action: "send_failed",
        detail: { message: (error as Error).message },
      });
    }
  }

  return json({ ok: true, sent, deferred, cancelled, failed });
}

export const Route = createFileRoute("/api/public/message-worker")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
