// Sent.dm. One parent account on Alyx Lab's card, one sub-account and number
// per entity. All traffic billed centrally, so there is exactly one API key.

import { hmacHex, safeEqual } from "@/lib/webhook-crypto.server";

const API_BASE = process.env["SENT_API_BASE"] ?? "https://api.sent.dm/v1";

export type SendResult = { providerId: string; segments: number };

export function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/** Last ten digits, the only reliable way to match a provider number back. */
export function phoneKey(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

export async function sendText(input: {
  to: string;
  body: string;
  from?: string | null;
  subaccountId?: string | null;
}): Promise<SendResult> {
  const apiKey = process.env["SENT_API_KEY"];
  if (!apiKey) throw new Error("SENT_API_KEY is not configured");

  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  if (input.subaccountId) headers["x-subaccount-id"] = input.subaccountId;

  const response = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: normalizePhone(input.to),
      from: input.from ? normalizePhone(input.from) : undefined,
      text: input.body,
    }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`Sent.dm send failed [${response.status}]: ${raw}`);

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  const providerId = String(
    payload["id"] ?? payload["message_id"] ?? (payload["data"] as Record<string, unknown> | undefined)?.["id"] ?? "",
  );
  const segments = Number(payload["segments"] ?? 0);
  if (!providerId) throw new Error("Sent.dm send returned no message id");
  return { providerId, segments: segments > 0 ? segments : 0 };
}

/**
 * Verified against the raw body before anything is parsed. Header format is
 * `t=<unix>,v1=<hex>`, with a bare hex digest also accepted.
 */
export async function verifySentSignature(raw: string, header: string | null) {
  const secret = process.env["SENT_WEBHOOK_SECRET"];
  if (!secret || !header) return false;

  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const provided = parts.find((part) => part.startsWith("v1="))?.slice(3) ?? header.trim();

  if (timestamp) {
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) return false;
    return safeEqual(provided, await hmacHex(secret, `${timestamp}.${raw}`));
  }
  return safeEqual(provided, await hmacHex(secret, raw));
}
