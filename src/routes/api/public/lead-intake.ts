import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SMS_DOUBLE_OPT_IN } from "@/lib/consent";
import { isOutOfArea, screenLead } from "@/lib/screening";
import { normalizePhone, sendText } from "@/lib/sms.server";

const payloadSchema = z
  .object({
    business: z.string().trim().min(1).max(120),
    contact: z.string().trim().max(120).optional().default(""),
    phone: z.string().trim().max(40).optional().default(""),
    email: z.string().trim().max(160).optional().default(""),
    message: z.string().trim().max(2000).optional().default(""),
    source: z.string().trim().max(80).optional().default("Website"),
    vertical: z.string().trim().max(80).optional().default(""),
    sms_consent: z.boolean().optional().default(false),
    email_consent: z.boolean().optional().default(false),
    // Honeypot: a real person never fills this.
    company_url: z.string().optional().default(""),
    /** Milliseconds the form was on screen before submit. */
    fill_ms: z.coerce.number().optional().default(0),
  })
  .superRefine((value, context) => {
    const phoneDigits = value.phone.replace(/\D/g, "");
    if (value.sms_consent && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "A valid phone number is required to request text messages.",
      });
    }
  });

const WINDOW_MINUTES = 10;
const MAX_PER_IP = 5;

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    request.headers.get("cf-connecting-ip") ??
    (forwarded ? forwarded.split(",")[0]!.trim() : null) ??
    "unknown"
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function sendConfirmationEmail(to: string, business: string) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: "ALYXLAB <hello@alyxlab.com>",
        to: [to],
        subject: "We got your request",
        text: `Thanks for reaching out about ${business}. We read every message ourselves and will reply by email shortly.\n\nALYXLAB, Dallas TX`,
        headers: {
          "List-Unsubscribe": "<mailto:alyxlabwork@gmail.com?subject=Unsubscribe>",
        },
      }),
    });
  } catch {
    // A failed confirmation email must never lose the lead.
  }
}

async function sendDoubleOptInText(leadId: string, phone: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await sendText({
    to: normalizePhone(phone),
    body: SMS_DOUBLE_OPT_IN,
    from: process.env["SENT_DEFAULT_NUMBER"] ?? null,
    subaccountId: process.env["SENT_DEFAULT_SUBACCOUNT_ID"] ?? null,
  });

  const { error } = await supabaseAdmin.from("message").insert({
    lead_id: leadId,
    direction: "outbound",
    authored_by: "alyx",
    body: SMS_DOUBLE_OPT_IN,
    status: "sent",
    sent_at: new Date().toISOString(),
    provider_id: result.providerId,
    segments: result.segments || Math.max(1, Math.ceil(SMS_DOUBLE_OPT_IN.length / 160)),
  });
  if (error) throw error;
}

export const Route = createFileRoute("/api/public/lead-intake")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = payloadSchema.parse(await request.json());
        } catch {
          return json({ ok: false, error: "Invalid submission." }, 400);
        }

        const ip = clientIp(request);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const since = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();

        const { count: recent } = await supabaseAdmin
          .from("event_log")
          .select("id", { count: "exact", head: true })
          .eq("entity", "lead")
          .eq("action", "intake")
          .gte("created_at", since)
          .filter("detail->>ip", "eq", ip);
        if ((recent ?? 0) >= MAX_PER_IP) {
          return json({ ok: false, error: "Too many submissions. Try again shortly." }, 429);
        }

        const digits = parsed.phone.replace(/\D/g, "");
        const { data: duplicates } = digits
          ? await supabaseAdmin
              .from("lead")
              .select("id")
              .or(
                [`phone.eq.${parsed.phone}`, parsed.email ? `email.eq.${parsed.email}` : null]
                  .filter(Boolean)
                  .join(","),
              )
              .limit(1)
          : { data: [] as Array<{ id: string }> };

        const screening = screenLead({
          honeypot: parsed.company_url,
          message: parsed.message,
          phone: parsed.phone,
          fillMs: parsed.fill_ms,
          duplicate: Boolean(duplicates?.length),
          outOfArea: isOutOfArea(parsed.phone),
        });

        const submittedAt = new Date().toISOString();
        const { data: lead, error } = await supabaseAdmin
          .from("lead")
          .insert({
            business: parsed.business,
            contact: parsed.contact || null,
            phone: parsed.phone || null,
            email: parsed.email || null,
            source: parsed.source || "Website",
            vertical: parsed.vertical || null,
            stage: "new",
            screening_state: screening.state,
            automation_state: screening.state === "junk" ? "killed" : "active",
            last_inbound_at: submittedAt,
            sms_consent_requested_at: parsed.sms_consent ? submittedAt : null,
            email_consent_at: parsed.email_consent ? submittedAt : null,
          })
          .select("id")
          .single();
        if (error) return json({ ok: false, error: "Could not save the request." }, 500);

        if (parsed.message) {
          const { error: messageError } = await supabaseAdmin.from("message").insert({
            lead_id: lead.id,
            direction: "inbound",
            authored_by: "lead",
            body: parsed.message,
            status: "delivered",
            sent_at: new Date().toISOString(),
            segments: Math.max(1, Math.ceil(parsed.message.length / 160)),
          });
          if (messageError) return json({ ok: false, error: "Could not save the request." }, 500);
        }

        await supabaseAdmin.from("event_log").insert([
          {
            entity: "lead",
            entity_id: lead.id,
            action: "intake",
            detail: {
              ip,
              source: parsed.source,
              fill_ms: parsed.fill_ms,
              sms_consent_requested: parsed.sms_consent,
              email_consent: parsed.email_consent,
              consent_copy_version: "2026-08-20",
            },
          },
          {
            entity: "lead",
            entity_id: lead.id,
            action: "screened",
            detail: {
              state: screening.state,
              flags: screening.flags,
              hardFlags: screening.hardFlags,
              softFlags: screening.softFlags,
            },
          },
        ]);

        if (screening.state !== "junk" && parsed.email_consent) {
          await sendConfirmationEmail(parsed.email, parsed.business);
        }

        if (screening.state !== "junk" && parsed.sms_consent && parsed.phone) {
          try {
            await sendDoubleOptInText(lead.id, parsed.phone);
            await supabaseAdmin.from("event_log").insert({
              entity: "lead",
              entity_id: lead.id,
              action: "sms_double_opt_in_sent",
              detail: { consent_copy_version: "2026-08-20" },
            });
          } catch (error) {
            await supabaseAdmin.from("event_log").insert({
              entity: "lead",
              entity_id: lead.id,
              action: "sms_double_opt_in_failed",
              detail: { message: (error as Error).message },
            });
          }
        }

        // The public response never reveals the screening decision.
        return json({ ok: true });
      },
    },
  },
});
