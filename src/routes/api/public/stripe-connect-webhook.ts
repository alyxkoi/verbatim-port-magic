// Relationship two: the CLIENT's own Stripe account, read only. Payments
// recorded here are between the client and their customer. Alyx Lab never
// holds, routes, or touches that money, so nothing in this handler creates a
// charge, a transfer, or a payout.
//
// Separate endpoint, separate signing secret, separate handler from the
// platform webhook. Never merged.
import { createFileRoute } from "@tanstack/react-router";

import { verifyStripeSignature, type StripeEvent } from "@/lib/stripe.server";

const PAYMENT_EVENTS = new Set([
  "payment_intent.succeeded",
  "charge.succeeded",
  "charge.refunded",
  "checkout.session.completed",
]);

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/stripe-connect-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const verified = await verifyStripeSignature(
          raw,
          request.headers.get("stripe-signature"),
          process.env["STRIPE_CONNECT_WEBHOOK_SECRET"],
        );
        if (!verified) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(raw) as StripeEvent;
        // Every connected event names its account. One without is a platform
        // event and is refused rather than reconciled as a client payment.
        if (!event.account) return ok({ ok: true, ignored: "platform event on connect endpoint" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: seen } = await supabaseAdmin
          .from("webhook_event")
          .insert({ event_id: event.id, source: "stripe_connect", account_id: event.account });
        if (seen) return ok({ ok: true, duplicate: true });

        const { data: connection } = await supabaseAdmin
          .from("client_payment_connection")
          .select("id, client_id")
          .eq("stripe_account_id", event.account)
          .maybeSingle();

        const nowIso = new Date().toISOString();

        // A client revoking access must be visible, not silent.
        if (event.type === "account.application.deauthorized") {
          if (connection) {
            await supabaseAdmin
              .from("client_payment_connection")
              .update({
                connection_status: "revoked_by_client",
                disconnected_at: nowIso,
                last_error: "Access revoked in the client's Stripe account",
              })
              .eq("id", connection.id);
            await supabaseAdmin.from("event_log").insert({
              entity: "client",
              entity_id: connection.client_id,
              action: "stripe_revoked_by_client",
              detail: { stripe_account_id: event.account },
            });
          }
          await supabaseAdmin.from("webhook_event").update({ processed_at: nowIso }).eq("event_id", event.id);
          return ok();
        }

        if (!connection) return ok({ ok: true, ignored: "unknown connected account" });

        if (event.type === "account.updated") {
          await supabaseAdmin
            .from("client_payment_connection")
            .update({ last_sync_at: nowIso, connection_status: "connected", last_error: null })
            .eq("id", connection.id);
          await supabaseAdmin.from("webhook_event").update({ processed_at: nowIso }).eq("event_id", event.id);
          return ok();
        }

        if (!PAYMENT_EVENTS.has(event.type)) return ok({ ok: true, ignored: event.type });

        const object = event.data.object;
        const amount = Number(object["amount_received"] ?? object["amount_total"] ?? object["amount"] ?? 0);
        const refunded = event.type === "charge.refunded";

        await supabaseAdmin.from("client_customer_payment").insert({
          client_id: connection.client_id,
          stripe_account_id: event.account,
          stripe_object_id: String(object["id"] ?? event.id),
          amount_cents: refunded ? -Number(object["amount_refunded"] ?? amount) : amount,
          currency: String(object["currency"] ?? "usd"),
          kind: refunded ? "refund" : "payment",
          status: refunded ? "refunded" : "succeeded",
          occurred_at: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        });

        await supabaseAdmin
          .from("client_payment_connection")
          .update({ last_sync_at: nowIso })
          .eq("id", connection.id);

        await supabaseAdmin.from("webhook_event").update({ processed_at: nowIso }).eq("event_id", event.id);
        return ok();
      },
    },
  },
});
