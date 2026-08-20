import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // The server functions still validate the bearer token before returning data.
    // Reusing the freshly persisted session here avoids another auth round trip
    // between a successful sign-in and the first console paint.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) throw redirect({ to: "/login" });
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
