import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/operator-login")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
