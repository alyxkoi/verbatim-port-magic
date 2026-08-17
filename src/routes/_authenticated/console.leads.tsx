import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/console/EmptyState";

export const Route = createFileRoute("/_authenticated/console/leads")({
  component: LeadsScreen,
});

function LeadsScreen() {
  return (
    <section className="screen" aria-label="Leads">
      <article className="surface">
        <EmptyState
          title="No lead activity yet"
          text="New conversations will appear here the moment Blip answers."
        />
      </article>
    </section>
  );
}
