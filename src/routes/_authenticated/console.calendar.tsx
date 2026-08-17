import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/console/EmptyState";

export const Route = createFileRoute("/_authenticated/console/calendar")({
  component: CalendarScreen,
});

function CalendarScreen() {
  return (
    <section className="screen" aria-label="Calendar">
      <article className="surface">
        <EmptyState
          title="Nothing on the calendar"
          text="Booked calls and the time you protect will appear here."
        />
      </article>
    </section>
  );
}
