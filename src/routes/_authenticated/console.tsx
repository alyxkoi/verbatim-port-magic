import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Console · Alyx Lab" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Alyx Lab operator console." },
      { property: "og:title", content: "Console · Alyx Lab" },
      { property: "og:description", content: "Alyx Lab operator console." },
    ],
  }),
  component: ConsoleShell,
});

function ConsoleShell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void router.navigate({ to: "/login", replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#000000",
        color: "#ffffff",
        fontFamily:
          '"Lufga", "Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "18px 22px",
          borderBottom: "1px solid rgba(255, 255, 255, .105)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: "34px",
              height: "34px",
              borderRadius: "11px",
              background: "#d7ff00",
              color: "#0d0f08",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "-.06em",
            }}
            aria-hidden="true"
          >
            al
          </div>
          <span style={{ fontSize: "14.5px", fontWeight: 600, letterSpacing: "-.02em" }}>Console</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, .64)" }}>{user.email}</span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            style={{
              minHeight: "38px",
              padding: "0 16px",
              border: "1px solid rgba(255, 255, 255, .105)",
              borderRadius: "12px",
              background: "transparent",
              color: "#ffffff",
              font: "inherit",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main style={{ display: "grid", placeItems: "center", padding: "40px 22px" }}>
        <p style={{ margin: 0, fontSize: "13px", color: "rgba(255, 255, 255, .38)" }}>
          Console shell. Nothing here yet.
        </p>
      </main>
    </div>
  );
}
