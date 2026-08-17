import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/console/EmptyState";

export const Route = createFileRoute("/_authenticated/console/settings")({
  component: SettingsScreen,
});

function SettingsScreen() {
  return (
    <section className="screen" aria-label="Settings">
      <article className="surface">
        <EmptyState
          title="Settings are not wired yet"
          text="Automation rules you can change without a deploy will live here."
        />
      </article>
    </section>
  );
}
