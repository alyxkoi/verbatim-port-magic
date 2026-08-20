import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/guides/what-a-booking-system-costs")({
  beforeLoad: () => {
    throw redirect({ to: "/guides/booking-system-cost" });
  },
});
