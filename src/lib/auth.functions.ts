import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

type SignInInput = { email: string; password: string };

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;
const WINDOW_SECONDS = 900;
const IP_MAX_ATTEMPTS = 20;

function clientIp(): string | null {
  const request = getRequest();
  const headers = request?.headers;
  if (!headers) return null;
  const forwarded = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for");
  return forwarded ? (forwarded.split(",")[0] ?? "").trim() || null : null;
}

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((input: SignInInput) => ({
    email: String(input?.email ?? "").trim().toLowerCase().slice(0, 320),
    password: String(input?.password ?? "").slice(0, 512),
  }))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ip = clientIp();
    const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

    // Server-side throttle. Failures only; a success clears the counter.
    const { data: emailFails } = await supabaseAdmin
      .from("login_attempt")
      .select("created_at")
      .eq("email_key", data.email)
      .eq("succeeded", false)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_ATTEMPTS);

    const emailCount = emailFails?.length ?? 0;
    if (emailCount >= MAX_ATTEMPTS) {
      const newest = emailFails?.[0]?.created_at;
      const elapsed = newest ? (Date.now() - new Date(newest).getTime()) / 1000 : LOCK_SECONDS;
      const retryAfter = Math.max(1, Math.ceil(LOCK_SECONDS - elapsed));
      if (elapsed < LOCK_SECONDS) {
        return { ok: false as const, locked: true as const, retryAfter, attemptsLeft: 0 };
      }
    }

    if (ip) {
      const { count } = await supabaseAdmin
        .from("login_attempt")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .eq("succeeded", false)
        .gte("created_at", since);
      if ((count ?? 0) >= IP_MAX_ATTEMPTS) {
        return { ok: false as const, locked: true as const, retryAfter: LOCK_SECONDS, attemptsLeft: 0 };
      }
    }

    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const auth = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: result, error } = await auth.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error || !result?.session) {
      await supabaseAdmin
        .from("login_attempt")
        .insert({ email_key: data.email, ip, succeeded: false });
      const fresh = emailCount + 1;
      if (fresh >= MAX_ATTEMPTS) {
        return { ok: false as const, locked: true as const, retryAfter: LOCK_SECONDS, attemptsLeft: 0 };
      }
      return {
        ok: false as const,
        locked: false as const,
        retryAfter: 0,
        attemptsLeft: MAX_ATTEMPTS - fresh,
      };
    }

    const { data: operatorRole, error: roleError } = await auth
      .from("user_roles")
      .select("role")
      .eq("user_id", result.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !operatorRole) {
      await auth.auth.signOut({ scope: "local" });
      await supabaseAdmin
        .from("login_attempt")
        .insert({ email_key: data.email, ip, succeeded: false });
      return {
        ok: false as const,
        locked: false as const,
        retryAfter: 0,
        attemptsLeft: Math.max(0, MAX_ATTEMPTS - (emailCount + 1)),
      };
    }

    await supabaseAdmin
      .from("login_attempt")
      .delete()
      .eq("email_key", data.email)
      .eq("succeeded", false);
    await supabaseAdmin
      .from("login_attempt")
      .insert({ email_key: data.email, ip, succeeded: true });

    return {
      ok: true as const,
      locked: false as const,
      retryAfter: 0,
      attemptsLeft: MAX_ATTEMPTS,
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; redirectTo: string }) => ({
    email: String(input?.email ?? "").trim().toLowerCase().slice(0, 320),
    redirectTo: String(input?.redirectTo ?? "").slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const auth = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    // Result is intentionally discarded: the same answer for every address.
    await auth.auth.resetPasswordForEmail(data.email, { redirectTo: data.redirectTo });
    return { ok: true as const };
  });
