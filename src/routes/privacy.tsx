import { createFileRoute } from "@tanstack/react-router";
import alyxlabCss from "@/styles/alyxlab.css?url";
import { GuideShell } from "@/components/site/SiteChrome";

const TITLE = "Privacy Policy | ALYXLAB";
const DESC =
  "How Alyx Lab collects, uses, and protects information submitted through this site.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alyxlab.com/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: alyxlabCss },
      { rel: "canonical", href: "https://alyxlab.com/privacy" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <GuideShell>
      <h1 className="rv in">Privacy</h1>
      <p className="lede rv">
        We collect only what you send us and we do not sell it.
      </p>
      <h2 className="rv">What we collect</h2>
      <p className="rv">
        When you submit the contact form we receive your name, email, business
        name, business type, and message. If we start working together we also
        hold the operational data required to run your system.
      </p>
      <h2 className="rv">How we use it</h2>
      <p className="rv">
        To reply to you, to prepare a plan, and to run the system we built for
        you. Nothing else. We do not sell or rent information to anyone.
      </p>
      <h2 className="rv">Deletion</h2>
      <p className="rv">
        Email <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>{" "}
        and we will delete your information.
      </p>
    </GuideShell>
  );
}
