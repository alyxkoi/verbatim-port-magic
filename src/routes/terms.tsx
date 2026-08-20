import { createFileRoute } from "@tanstack/react-router";
import { GuideShell } from "@/components/site/SiteChrome";

const TITLE = "Terms of Service | ALYXLAB";
const DESC = "The terms that apply to work done by Alyx Lab in Dallas, Texas.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alyxlab.com/terms" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "/site.css" }, { rel: "stylesheet", href: "/guide.css" },
      { rel: "canonical", href: "https://alyxlab.com/terms" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <GuideShell>
      <h1 className="rv in">Terms</h1>
      <p className="lede rv">
        Plain terms for plain work. Anything specific to your build is in your
        written plan.
      </p>
      <h2 className="rv">Scope and price</h2>
      <p className="rv">
        Every engagement starts with a written plan naming the scope and a fixed
        price. Work outside that scope is quoted before it begins.
      </p>
      <h2 className="rv">Ownership</h2>
      <p className="rv">
        You own the code, the data, and the domain. If we stop working together,
        the system stays yours.
      </p>
      <h2 className="rv">Monthly and cancellation</h2>
      <p className="rv">
        Monthly arrangements cover hosting, support, and changes. They are month
        to month and you can cancel at any time.
      </p>
      <h2 className="rv">Contact</h2>
      <p className="rv">
        Questions go to{" "}
        <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>.
      </p>
    </GuideShell>
  );
}
