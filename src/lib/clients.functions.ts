import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  allowanceFor,
  overageDollars,
  periodStart,
  SEAT_TARGET,
  TIER_LIMITS,
  tierKey,
  usagePct,
  usageTone,
  type TierKey,
} from "@/lib/allowance";

export type ClientRow = {
  id: string;
  name: string;
  contact: string;
  tier: TierKey;
  tierLabel: string;
  term: string;
  monthly: number;
  setupPaid: number;
  startedAt: string;
  endsAt: string | null;
  leadsMonth: number;
  segments: number;
  allowance: number;
  pct: number;
  tone: string;
  overage: number;
  number: string;
  stripe: string;
  stripeName: string | null;
  stripeLast4: string | null;
};

export type ClientRoster = {
  seatTarget: number;
  mrr: number;
  attention: number;
  overage: number;
  clients: ClientRow[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientRoster> => {
    const { supabase } = context;

    const [{ data: clients }, { data: usage }, { data: connections }, { data: leads }] = await Promise.all([
      supabase.from("client").select("*").order("started_at", { ascending: false }),
      supabase.from("client_usage").select("*"),
      supabase.from("client_payment_connection").select("*"),
      supabase.from("lead").select("id, contact, business, created_at"),
    ]);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const rows: ClientRow[] = (clients ?? [])
      .filter((client) => client.status !== "churned")
      .map((client) => {
        const key = tierKey(client.tier);
        const limits = TIER_LIMITS[key];
        const period = periodStart(client.started_at);
        const used = (usage ?? []).find((row) => row.client_id === client.id && row.period_start === period);
        const segments = used?.segments_used ?? 0;
        const pct = usagePct(segments, client.tier);
        const connection = (connections ?? []).find((row) => row.client_id === client.id);
        const lead = (leads ?? []).find((row) => row.id === client.lead_id);

        return {
          id: client.id,
          name: client.name,
          contact: client.contact ?? lead?.contact ?? "—",
          tier: key,
          tierLabel: limits.label,
          term: client.term,
          monthly: limits.monthly,
          setupPaid: client.term === "annual" ? limits.setupAnnual : limits.setup,
          startedAt: formatDate(client.started_at),
          endsAt: client.ends_at ? formatDate(client.ends_at) : null,
          // Leads this calendar month are counted from the client's own lead row.
          leadsMonth:
            lead && new Date(lead.created_at).getTime() >= monthStart.getTime() ? 1 : 0,
          segments,
          allowance: allowanceFor(client.tier),
          pct,
          tone: usageTone(pct),
          overage: overageDollars(segments, client.tier),
          number: client.sent_number ?? "Not assigned",
          stripe: connection?.connection_status ?? "not_connected",
          stripeName: connection?.stripe_business_name ?? null,
          stripeLast4: connection?.stripe_last4 ?? null,
        };
      });

    return {
      seatTarget: SEAT_TARGET,
      mrr: rows.reduce((sum, row) => sum + row.monthly, 0),
      attention: rows.filter((row) => row.stripe !== "connected" || row.pct >= 80).length,
      overage: rows.reduce((sum, row) => sum + row.overage, 0),
      clients: rows,
    };
  });

/** Builds the read_only authorize URL and stores a single-use signed nonce. */
export const startStripeConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string; origin: string }) => {
    if (!input?.clientId) throw new Error("clientId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { connectAuthorizeUrl, signState } = await import("@/lib/stripe.server");
    const nonce = crypto.randomUUID().replace(/-/g, "");

    const { error } = await context.supabase.from("stripe_oauth_state").insert({
      nonce,
      client_id: data.clientId,
      scope: "read_only",
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    if (error) throw new Error(error.message);

    const redirectUri = `${data.origin.replace(/\/$/, "")}/api/public/stripe-connect-callback`;
    return { url: connectAuthorizeUrl(await signState(nonce), redirectUri) };
  });

export const disconnectStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => {
    if (!input?.clientId) throw new Error("clientId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: connection } = await context.supabase
      .from("client_payment_connection")
      .select("id, stripe_account_id")
      .eq("client_id", data.clientId)
      .maybeSingle();
    if (!connection) return { ok: true };

    try {
      const { deauthorizeConnect } = await import("@/lib/stripe.server");
      await deauthorizeConnect(connection.stripe_account_id);
    } catch {
      // Stripe may already consider it revoked. The local record still updates.
    }

    await context.supabase
      .from("client_payment_connection")
      .update({
        connection_status: "disconnected",
        disconnected_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", connection.id);

    await context.supabase.from("event_log").insert({
      entity: "client",
      entity_id: data.clientId,
      action: "stripe_disconnected",
      detail: { by: "operator" },
    });

    return { ok: true };
  });

/**
 * Clients past 80 percent of their included segments, surfaced in the Today
 * queue. Nothing here blocks a send; it is a heads up only.
 */
export const listUsageWarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: clients }, { data: usage }] = await Promise.all([
      supabase.from("client").select("id, name, tier, started_at, status").eq("status", "active"),
      supabase.from("client_usage").select("client_id, period_start, segments_used"),
    ]);

    return (clients ?? [])
      .map((client) => {
        const period = periodStart(client.started_at);
        const row = (usage ?? []).find(
          (item) => item.client_id === client.id && item.period_start === period,
        );
        const segments = row?.segments_used ?? 0;
        return {
          id: client.id,
          name: client.name,
          pct: usagePct(segments, client.tier),
          segments,
          allowance: allowanceFor(client.tier),
          overage: overageDollars(segments, client.tier),
        };
      })
      .filter((row) => row.pct >= 80)
      .sort((a, b) => b.pct - a.pct);
  });
