// Stripe. Two completely separate relationships (reference 5.2):
//   platform  — Alyx Lab's own account, retainer matching
//   connect   — the client's account, customer payment reconciliation
// Two endpoints, two signing secrets, two handlers. Never merged.
//
// Alyx Lab never holds, routes, or touches client customer money. Connected
// scope is read_only and no access or refresh token is stored anywhere.

import { hmacHex, safeEqual } from "@/lib/webhook-crypto.server";

const API = "https://api.stripe.com/v1";

export type StripeEvent = {
  id: string;
  type: string;
  account?: string;
  created?: number;
  data: { object: Record<string, unknown> };
};

/** Verifies the Stripe-Signature header against the raw body. */
export async function verifyStripeSignature(raw: string, header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = await hmacHex(secret, `${timestamp}.${raw}`);
  return signatures.some((signature) => safeEqual(signature, expected));
}

function platformSecret() {
  const key = process.env["STRIPE_PLATFORM_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_PLATFORM_SECRET_KEY is not configured");
  return key;
}

/**
 * Connected-account reads authenticate with the platform secret plus the
 * Stripe-Account header. There is no per-client credential to store.
 */
export async function stripeRequest(
  path: string,
  options: { method?: string; account?: string | null; form?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${platformSecret()}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (options.account) headers["Stripe-Account"] = options.account;

  const response = await fetch(`${API}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.form ? new URLSearchParams(options.form).toString() : undefined,
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Stripe request failed [${response.status}]: ${raw}`);
  return JSON.parse(raw) as Record<string, unknown>;
}

/** OAuth token exchange. The returned tokens are read and immediately dropped. */
export async function exchangeConnectCode(code: string) {
  const response = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_secret: platformSecret(),
      code,
      grant_type: "authorization_code",
    }).toString(),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Stripe OAuth failed [${response.status}]: ${raw}`);
  const payload = JSON.parse(raw) as Record<string, unknown>;
  const accountId = String(payload["stripe_user_id"] ?? "");
  if (!accountId.startsWith("acct_")) throw new Error("Stripe OAuth returned no account id");
  // Only the acct_ id survives this function.
  return { accountId, scope: String(payload["scope"] ?? "read_only") };
}

export async function deauthorizeConnect(accountId: string) {
  const clientId = process.env["STRIPE_CONNECT_CLIENT_ID"];
  if (!clientId) throw new Error("STRIPE_CONNECT_CLIENT_ID is not configured");
  const response = await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: {
      authorization: `Bearer ${platformSecret()}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ client_id: clientId, stripe_user_id: accountId }).toString(),
  });
  if (!response.ok) throw new Error(`Stripe deauthorize failed [${response.status}]: ${await response.text()}`);
}

export function connectAuthorizeUrl(state: string, redirectUri: string) {
  const clientId = process.env["STRIPE_CONNECT_CLIENT_ID"];
  if (!clientId) throw new Error("STRIPE_CONNECT_CLIENT_ID is not configured");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only",
    state,
    redirect_uri: redirectUri,
  });
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/** Signed OAuth state so a callback cannot be forged. */
export async function signState(nonce: string) {
  const secret = process.env["OAUTH_STATE_SIGNING_SECRET"];
  if (!secret) throw new Error("OAUTH_STATE_SIGNING_SECRET is not configured");
  return `${nonce}.${await hmacHex(secret, nonce)}`;
}

export async function readState(state: string) {
  const secret = process.env["OAUTH_STATE_SIGNING_SECRET"];
  if (!secret) return null;
  const [nonce, signature] = state.split(".");
  if (!nonce || !signature) return null;
  return safeEqual(signature, await hmacHex(secret, nonce)) ? nonce : null;
}
