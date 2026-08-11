import { createFileRoute } from "@tanstack/react-router";
import { GuideShell, GuideCta } from "@/components/site/SiteChrome";

const TITLE = "Hiring Someone to Build a Booking System in Dallas";
const DESC =
  "What to ask, what to avoid, and what it costs to have a booking and customer system built for a Dallas business.";

export const Route = createFileRoute("/guides/dallas-booking-system")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://alyxlab.com/guides/dallas-booking-system" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alyxlab.com/guides/dallas-booking-system" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Hiring someone to build a booking system in Dallas",
          description: DESC,
          datePublished: "2026-08-11",
          author: { "@type": "Organization", name: "ALYXLAB" },
          publisher: { "@type": "Organization", name: "ALYXLAB" },
          mainEntityOfPage: "https://alyxlab.com/guides/dallas-booking-system",
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
      <div className="gmeta">5 min read</div>
      <h1 className="rv in">Hiring someone to build a booking system in Dallas</h1>

      <div className="ganswer rv in">
        <h2>The short answer</h2>
        <p>
          Most Dallas businesses that go looking for this need one of three things: a booking
          calendar, a way to answer customers automatically, or all their tools talking to each
          other. Which one you need decides who you should hire, and the wrong choice costs you
          months. Here is how to tell them apart before you pay anyone.
        </p>
      </div>

      <h2 className="rv">Three different jobs, three different people</h2>
      <p className="rv">
        A web designer builds you a site that looks good. Good ones are excellent at that. They
        generally do not build systems that handle your bookings and payments.
      </p>
      <p className="rv">
        A software agency builds custom applications properly, and charges $15,000 and up with a
        three month timeline. Correct for a company, overkill for a shop.
      </p>
      <p className="rv">
        A systems builder connects the tools you already use and fills the gaps between them. Faster
        and cheaper because it is not built from nothing.
      </p>
      <p className="rv">
        Most local businesses need the third one and get sold the first one.
      </p>

      <h2 className="rv">What to ask before you pay anyone</h2>
      <ul className="rv">
        <li>
          <strong>Who owns the code and the data if we stop working together?</strong> This tells you
          whether you are buying a system or renting one.
        </li>
        <li>
          <strong>What happens when I need a change in six months, and what does it cost?</strong>{" "}
          This tells you whether support is part of the deal or a new invoice.
        </li>
        <li>
          <strong>What are you connecting to and what are you building from scratch?</strong> This
          tells you where the price and the timeline come from.
        </li>
        <li>
          <strong>Can I see something you built that is live right now?</strong> This tells you
          whether the work exists outside a slide deck.
        </li>
        <li>
          <strong>What is the monthly, and what is in it?</strong> This tells you what you are
          committed to a year from now.
        </li>
      </ul>
      <p className="rv">If any answer is vague, that is the answer.</p>

      <h2 className="rv">What it costs in Dallas</h2>
      <ul className="rv">
        <li>A basic site: $500 to $3,000 one time.</li>
        <li>A site with booking and automation: $1,000 to $5,000 up front, or $100 to $500 a month.</li>
        <li>A full custom application: $15,000 and up.</li>
      </ul>
      <p className="rv">
        Monthly arrangements usually include support and changes. One time builds usually do not. A
        year later, that is the difference that matters most.
      </p>

      <h2 className="rv">The part that goes wrong</h2>
      <p className="rv">
        The build is not the risk. The risk is month seven, when you need one change and the person
        who built it has moved on, does not answer, or wants a new quote for twenty minutes of work.
      </p>
      <p className="rv">
        That is the most common failure, and it is worth asking about before you sign anything.
      </p>

      <h2 className="rv">How we work</h2>
      <p className="rv">
        One person, and a small number of clients on purpose, so you text the person who built it
        rather than filing a ticket. Live in about two weeks. You own the code, the data and the
        domain. Month to month, cancel anytime. Based in Dallas.
      </p>
      <p className="rv">
        Prices are on the <a href="/#price">pricing section</a>, and the numbers behind them are
        broken down in{" "}
        <a href="/guides/booking-system-cost">how much a booking system actually costs</a>.
      </p>

      <GuideCta
        line="Working out what you need? Tell me how customers reach you today and I will map out the system and send a fixed price. Free, usually within a day."
        other="/guides/booking-system-cost"
        otherLabel="How much does a booking system actually cost?"
      />
    </GuideShell>
  );
}
