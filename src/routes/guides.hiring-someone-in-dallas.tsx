import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/guides/hiring-someone-in-dallas")({
  beforeLoad: () => {
    throw redirect({ to: "/guides/dallas-booking-system" });
  },
});
