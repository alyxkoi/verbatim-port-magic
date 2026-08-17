import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/console/EmptyState";

export const Route = createFileRoute("/_authenticated/console/clients")({
  component: ClientsScreen,
});

function ClientsScreen() {
  return (
    <section className="screen" aria-label="Clients">
      <article className="surface">
        <EmptyState
          title="No clients running yet"
          text="Clients appear here once a plan is accepted and live."
        />
      </article>
    </section>
  );
}
