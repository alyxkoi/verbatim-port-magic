import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/console/EmptyState";

export const Route = createFileRoute("/_authenticated/console/plans")({
  component: PlansScreen,
});

function PlansScreen() {
  return (
    <section className="screen" aria-label="Plans">
      <article className="surface">
        <EmptyState
          title="No plans drafted"
          text="Plans appear here once a lead has answered enough to price."
        />
      </article>
    </section>
  );
}
