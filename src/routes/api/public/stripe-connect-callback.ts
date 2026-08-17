// Stripe Connect OAuth return. Public because Stripe redirects the browser
// here; the signed state plus a single-use nonce row is what authorizes it.
// read_only scope, and only the acct_ id is stored. No access or refresh
// token is written anywhere.
import { createFileRoute } from "@tanstack/react-router";

import { exchangeConnectCode, readState, stripeRequest } from "@/lib/stripe.server";

function back(request: Request, params: Record<string, string>) {
  const url = new URL(request.url);
  const target = new URL("/console/clients", url.origin);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return new Response(null, { status: 302, headers: { location: target.toString(), "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/public/stripe-connect-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (url.searchParams.get("error")) return back(request, { stripe: "denied" });
        if (!code || !state) return back(request, { stripe: "invalid" });

        const nonce = await readState(state);
        if (!nonce) return back(request, { stripe: "invalid" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Single use, and it must still be inside its window.
        const { data: pending } = await supabaseAdmin
          .from("stripe_oauth_state")
          .select("nonce, client_id, expires_at, consumed_at")
          .eq("nonce", nonce)
          .maybeSingle();
        if (!pending || pending.consumed_at || new Date(pending.expires_at).getTime() < Date.now()) {
          return back(request, { stripe: "expired" });
        }
        await supabaseAdmin
          .from("stripe_oauth_state")
          .update({ consumed_at: new Date().toISOString() })
          .eq("nonce", nonce);

        try {
          const { accountId, scope } = await exchangeConnectCode(code);

          let businessName: string | null = null;
          let last4 = accountId.slice(-4);
          try {
            const account = await stripeRequest(`/accounts/${accountId}`, { account: accountId });
            businessName =
              (((account["business_profile"] as Record<string, unknown> | undefined)?.["name"] as string) ??
                (account["email"] as string) ??
                null) || null;
          } catch {
            businessName = null;
          }

          const nowIso = new Date().toISOString();
          await supabaseAdmin.from("client_payment_connection").upsert(
            {
              client_id: pending.client_id,
              provider: "stripe",
              stripe_account_id: accountId,
              stripe_business_name: businessName,
              stripe_last4: last4,
              scope,
              connection_status: "connected",
              connected_at: nowIso,
              disconnected_at: null,
              last_error: null,
              last_sync_at: nowIso,
            },
            { onConflict: "client_id" },
          );

          await supabaseAdmin.from("event_log").insert({
            entity: "client",
            entity_id: pending.client_id,
            action: "stripe_connected",
            detail: { stripe_account_id: accountId, scope },
          });

          return back(request, { stripe: "connected" });
        } catch (error) {
          await supabaseAdmin.from("event_log").insert({
            entity: "client",
            entity_id: pending.client_id,
            action: "stripe_connect_failed",
            detail: { message: (error as Error).message },
          });
          return back(request, { stripe: "error" });
        }
      },
    },
  },
});
