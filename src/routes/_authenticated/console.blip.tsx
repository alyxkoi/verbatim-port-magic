import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/console/EmptyState";

export const Route = createFileRoute("/_authenticated/console/blip")({
  component: BlipScreen,
});

function BlipScreen() {
  return (
    <section className="screen" aria-label="Blip">
      <article className="surface">
        <EmptyState
          title="Blip is not configured yet"
          text="Behavior, logic, knowledge, and learning will live here."
        />
      </article>
    </section>
  );
}
