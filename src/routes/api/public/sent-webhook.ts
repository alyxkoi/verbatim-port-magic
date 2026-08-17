// Inbound SMS from Sent.dm. Signature verified before the body is parsed,
// idempotent on provider_id, and every segment increments client_usage.
import { createFileRoute } from "@tanstack/react-router";

import { phoneKey, verifySentSignature } from "@/lib/sms.server";
import { segmentsFor } from "@/lib/timing";
import { clientForLead, recordSegments } from "@/lib/usage.server";

const STOP_WORDS = /^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*$/i;

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/sent-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Raw body first. Nothing is parsed until the signature holds.
        const raw = await request.text();
        const signature =
          request.headers.get("x-sent-signature") ??
          request.headers.get("sent-signature") ??
          request.headers.get("x-signature");
        if (!(await verifySentSignature(raw, signature))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: Record<string, any>;
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const data = (event["data"] ?? event) as Record<string, any>;
        const providerId = String(data["id"] ?? data["message_id"] ?? event["id"] ?? "");
        const eventId = String(event["event_id"] ?? event["id"] ?? providerId);
        const type = String(event["type"] ?? event["event"] ?? "message.received");
        if (!eventId) return ok({ ok: true, ignored: "no event id" });

        // Idempotent on the event, and again on provider_id at insert time.
        const { error: seenError } = await supabaseAdmin
          .from("webhook_event")
          .insert({ event_id: eventId, source: "sent", account_id: String(data["subaccount_id"] ?? "") || null });
        if (seenError) return ok({ ok: true, duplicate: true });

        // Delivery receipts only touch the message they name.
        if (/deliver|fail|sent|undeliver/i.test(type) && !/received|inbound/i.test(type)) {
          const status = /fail|undeliver/i.test(type) ? "failed" : /deliver/i.test(type) ? "delivered" : "sent";
          if (providerId) {
            await supabaseAdmin.from("message").update({ status }).eq("provider_id", providerId);
          }
          await supabaseAdmin
            .from("webhook_event")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
          return ok();
        }

        const body = String(data["text"] ?? data["body"] ?? "").trim();
        const fromKey = phoneKey(data["from"] ?? data["sender"]);
        if (!body || !fromKey) return ok({ ok: true, ignored: "nothing to record" });

        // Resolve the lead from the sending number.
        const { data: leads } = await supabaseAdmin
          .from("lead")
          .select("id, phone, stage, automation_state")
          .order("created_at", { ascending: false })
          .limit(500);
        const lead = (leads ?? []).find((row) => phoneKey(row.phone) === fromKey);
        if (!lead) {
          await supabaseAdmin.from("event_log").insert({
            entity: "message",
            entity_id: null,
            action: "inbound_unmatched",
            detail: { from: fromKey, provider_id: providerId },
          });
          return ok({ ok: true, ignored: "unknown number" });
        }

        const now = new Date().toISOString();
        const segments = Number(data["segments"] ?? 0) || segmentsFor(body);

        const { error: insertError } = await supabaseAdmin.from("message").insert({
          lead_id: lead.id,
          direction: "inbound",
          authored_by: "lead",
          body,
          status: "delivered",
          sent_at: now,
          provider_id: providerId || null,
          segments,
        });
        if (insertError) return ok({ ok: true, duplicate: true });

        const optedOut = STOP_WORDS.test(body);

        // A new inbound cancels anything still queued outbound.
        await supabaseAdmin
          .from("message")
          .update({ status: "cancelled", held_reason: "superseded by inbound" })
          .eq("lead_id", lead.id)
          .eq("direction", "outbound")
          .eq("status", "queued");

        await supabaseAdmin
          .from("lead")
          .update({
            last_inbound_at: now,
            engagement_state: "replying",
            stage: lead.stage === "new" ? "talking" : lead.stage,
            nudge_count: 0,
            ...(optedOut ? { automation_state: "opted_out", opted_out_at: now } : {}),
          })
          .eq("id", lead.id);

        const client = await clientForLead(supabaseAdmin, lead.id);
        if (client) await recordSegments(supabaseAdmin, client, segments);

        await supabaseAdmin
          .from("webhook_event")
          .update({ processed_at: now })
          .eq("event_id", eventId);

        // Generate at receive. A generation failure never loses the message.
        if (!optedOut) {
          try {
            const { runInboundPipeline } = await import("@/lib/blip/pipeline.server");
            await runInboundPipeline(supabaseAdmin, lead.id);
          } catch (error) {
            await supabaseAdmin.from("event_log").insert({
              entity: "lead",
              entity_id: lead.id,
              action: "blip_failed",
              detail: { job: "pipeline", message: (error as Error).message },
            });
          }
        }

        return ok();
      },
    },
  },
});
