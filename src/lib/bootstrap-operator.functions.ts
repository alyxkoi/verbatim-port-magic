import { createServerFn } from "@tanstack/react-start";

// One-time bootstrap for the single operator account. Refuses once any user exists.
export const bootstrapOperator = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => ({
    email: String(input?.email ?? "").trim().toLowerCase(),
    password: String(input?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (listError) throw new Error(listError.message);
    if ((existing?.users?.length ?? 0) > 0) {
      return { ok: false as const, reason: "an operator already exists" };
    }
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
