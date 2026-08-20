import { createFileRoute } from "@tanstack/react-router";
import { GuideShell, GuideCta } from "@/components/site/SiteChrome";

const TITLE = "Missed Call Text Back: How It Works | ALYXLAB";
const DESC =
  "How missed-call text back recaptures the leads a missed call would lose, what it sends, what it costs, and how it is set up for Dallas businesses.";

export const Route = createFileRoute("/guides/missed-call-text-back")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://alyxlab.com/guides/missed-call-text-back" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "/site.css" },
      { rel: "stylesheet", href: "/guide.css" },
      { rel: "canonical", href: "https://alyxlab.com/guides/missed-call-text-back" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Missed call text back: how it works",
          description: DESC,
          author: { "@type": "Organization", name: "ALYXLAB" },
          publisher: { "@type": "Organization", name: "ALYXLAB" },
          mainEntityOfPage: "https://alyxlab.com/guides/missed-call-text-back",
        }),
      },
    ],
  }),
  component: Post,
});

function Post() {
  return (
    <GuideShell>
      <a className="gback" href="/guides">
        <svg viewBox="0 0 24 24"><path d="M19 12H6M12 5.5 5.5 12 12 18.5"/></svg>
        All guides
      </a>
      <div className="gmeta">4 min read</div>
      <h1 className="rv in">Missed call text back: how it works</h1>

      <div className="ganswer rv in">
        <h2>The short answer</h2>
        <p>
          Missed-call text back sends an automatic text message the moment a call to your business
          goes unanswered, so the caller gets a reply in seconds instead of dialling the next shop.
          The conversation continues by text, which most people prefer anyway, and the lead lands in
          the same system that handles your booking and follow-up.
        </p>
      </div>

      <h2 className="rv">Why a missed call is the most expensive thing in a local business</h2>
      <p className="rv">
        A missed call is a customer who was ready to buy at the exact moment you were on a ladder,
        with a client, or closed. Nothing is recorded, nothing is followed up, and there is no way to
        tell later that it happened. It is the one loss that never shows up in any report.
      </p>
      <p className="rv">
        Callers rarely wait around. If nobody answers and nothing comes back, the next business in
        the search results gets the job.
      </p>

      <h2 className="rv">What actually happens on a missed call</h2>
      <ul className="rv">
        <li>The call rings through and goes unanswered.</li>
        <li>A text goes out to that number within seconds, from your business number.</li>
        <li>The message says who you are, apologises for the miss, and asks what they need.</li>
        <li>Their reply opens a text conversation you can pick up whenever you are free.</li>
        <li>The lead is saved with the number, time and full message history attached.</li>
      </ul>
      <p className="rv">
        Because the lead is stored rather than just answered, it can then be booked, reminded,
        invoiced and asked for a review without anyone retyping anything.
      </p>

      <h2 className="rv">What the message should say</h2>
      <p className="rv">
        Short, human and specific. Name the business, acknowledge the miss, ask one question. A
        message that reads like a marketing blast gets ignored, and a message with no question gets
        no reply.
      </p>
      <p className="rv">
        Two things to get right: send from the number they actually called, and answer the reply like
        a person. Automation buys you the first thirty seconds, not the whole conversation.
      </p>

      <h2 className="rv">Where it fits in the rest of the system</h2>
      <p className="rv">
        On its own it is a patch over one leak. It works properly when the text conversation connects
        to booking, deposits and follow-up, so a recovered call turns into an appointment instead of
        another thread you have to remember. That is what the{" "}
        <a href="/#journey">customer path</a> on the homepage lays out.
      </p>

      <h2 className="rv">What it costs</h2>
      <p className="rv">
        Missed-call text back is included in Connected at $249 a month plus $597 one-time setup,
        alongside SMS and email lead responses, booking, reminders and a lead dashboard. It is also
        part of Operations at $499 a month plus $997 setup, which adds payments, deposits and
        workflow rules. Full detail is in the <a href="/#price">pricing section</a>.
      </p>
      <p className="rv">
        For how these numbers compare with off the shelf tools, see{" "}
        <a href="/guides/booking-system-cost">how much a booking system actually costs</a>.
      </p>

      <h2 className="rv">Setting it up in Dallas</h2>
      <p className="rv">
        Setup runs on your existing business number, so nothing on your cards, van or listings has to
        change. Systems go live in about two weeks, and you own the setup and the data outright.
      </p>

      <GuideCta
        line="Tell me roughly how many calls you miss in a week and I will send back a written plan with a fixed number, no cost."
        other="/guides/dallas-booking-system"
        otherLabel="Hiring someone to build a booking system in Dallas"
      />
    </GuideShell>
  );
}
