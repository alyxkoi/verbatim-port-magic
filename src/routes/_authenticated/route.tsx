import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: ["auth", "operator"],
      staleTime: 60_000,
      queryFn: async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw redirect({ to: "/login" });

        const { data: operatorRole, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roleError || !operatorRole) {
          await supabase.auth.signOut({ scope: "local" });
          throw redirect({ to: "/login" });
        }

        return data.user;
      },
    });

    return { user };
  },
  component: () => <Outlet />,
});
