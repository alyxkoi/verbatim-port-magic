// Relationship one: Alyx Lab's OWN Stripe account. Retainer matching only.
// This handler never reads a connected account and never touches client
// customer money. It has its own signing secret and shares no code path with
// the connect webhook.
import { createFileRoute } from "@tanstack/react-router";

import { verifyStripeSignature, type StripeEvent } from "@/lib/stripe.server";

const HANDLED = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
  "customer.subscription.deleted",
]);

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/stripe-platform-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const verified = await verifyStripeSignature(
          raw,
          request.headers.get("stripe-signature"),
          process.env["STRIPE_PLATFORM_WEBHOOK_SECRET"],
        );
        if (!verified) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(raw) as StripeEvent;

        // A platform event must not carry an account id. If it does, it belongs
        // to the connect endpoint and is refused here rather than merged.
        if (event.account) return ok({ ok: true, ignored: "connected event on platform endpoint" });
        if (!HANDLED.has(event.type)) return ok({ ok: true, ignored: event.type });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: seen } = await supabaseAdmin
          .from("webhook_event")
          .insert({ event_id: event.id, source: "stripe_platform", account_id: null });
        if (seen) return ok({ ok: true, duplicate: true });

        const object = event.data.object;
        const occurredAt = new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
        const email =
          (object["customer_email"] as string | undefined) ??
          ((object["customer_details"] as Record<string, unknown> | undefined)?.["email"] as string | undefined) ??
          null;
        const amount = Number(
          object["amount_paid"] ?? object["amount_total"] ?? object["amount_refunded"] ?? object["amount"] ?? 0,
        );
        const kind =
          event.type === "checkout.session.completed"
            ? "setup"
            : event.type === "charge.refunded"
              ? "refund"
              : event.type === "customer.subscription.deleted"
                ? "cancellation"
                : "retainer";
        const status = event.type === "invoice.payment_failed" ? "failed" : "succeeded";

        // Match the retainer to a client by the email on the lead, when it exists.
        let clientId: string | null = null;
        if (email) {
          const { data: lead } = await supabaseAdmin
            .from("lead")
            .select("id")
            .ilike("email", email)
            .maybeSingle();
          if (lead) {
            const { data: client } = await supabaseAdmin
              .from("client")
              .select("id")
              .eq("lead_id", lead.id)
              .maybeSingle();
            clientId = client?.id ?? null;
          }
        }

        await supabaseAdmin.from("retainer_payment").insert({
          stripe_object_id: String(object["id"] ?? event.id),
          client_id: clientId,
          customer_email: email,
          amount_cents: amount,
          currency: String(object["currency"] ?? "usd"),
          kind,
          status,
          description: String(object["description"] ?? event.type),
          occurred_at: occurredAt,
          matched_at: clientId ? new Date().toISOString() : null,
        });

        if (event.type === "invoice.payment_failed" && clientId) {
          await supabaseAdmin.from("event_log").insert({
            entity: "client",
            entity_id: clientId,
            action: "retainer_failed",
            detail: { amount_cents: amount, email },
          });
        }

        await supabaseAdmin
          .from("webhook_event")
          .update({ processed_at: new Date().toISOString() })
          .eq("event_id", event.id);

        return ok();
      },
    },
  },
});
