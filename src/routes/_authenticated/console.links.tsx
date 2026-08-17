import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/console/EmptyState";

export const Route = createFileRoute("/_authenticated/console/links")({
  component: LinksScreen,
});

function LinksScreen() {
  return (
    <section className="screen" aria-label="Links">
      <article className="surface">
        <EmptyState
          title="No links tracked yet"
          text="Create a link group and Alyx will start measuring action."
        />
      </article>
    </section>
  );
}
