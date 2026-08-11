import { createFileRoute } from "@tanstack/react-router";
import { GuideShell } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/guides/")({
  head: () => ({
    meta: [
      { title: "Guides · Alyxlab" },
      {
        name: "description",
        content:
          "Straight answers about what booking and customer systems cost, what they do, and whether you need one.",
      },
      { property: "og:title", content: "Guides · Alyxlab" },
      {
        property: "og:description",
        content:
          "Straight answers about what booking and customer systems cost, what they do, and whether you need one.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alyxlab.com/guides" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alyxlab.com/guides" }],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <GuideShell>
      <h1 className="rv in">Guides</h1>
      <p className="lede rv">
        Straight answers about what these systems cost, what they do, and whether you need one.
      </p>

      <div className="glist">
        <a className="gcard rv" href="/guides/booking-system-cost">
          <h2>How much does a booking system actually cost?</h2>
          <p>
            Real numbers on off the shelf software, the fees that show up later, and what custom
            work runs.
          </p>
          <div className="gmeta">6 min read</div>
        </a>

        <a className="gcard rv" href="/guides/dallas-booking-system">
          <h2>Hiring someone to build a booking system in Dallas</h2>
          <p>
            Who does what, what to ask before you pay anyone, and what it costs here.
          </p>
          <div className="gmeta">5 min read</div>
        </a>
      </div>
    </GuideShell>
  );
}
