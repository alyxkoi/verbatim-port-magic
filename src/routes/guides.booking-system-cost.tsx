import { createFileRoute } from "@tanstack/react-router";
import { GuideShell, GuideCta } from "@/components/site/SiteChrome";

const TITLE = "How Much Does a Booking System Actually Cost? (2026)";
const DESC =
  "Real numbers on what booking and scheduling systems cost small businesses, including the fees nobody quotes you up front.";

export const Route = createFileRoute("/guides/booking-system-cost")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://alyxlab.com/guides/booking-system-cost" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alyxlab.com/guides/booking-system-cost" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How much does a booking system actually cost?",
          description: DESC,
          datePublished: "2026-08-11",
          author: { "@type": "Organization", name: "ALYXLAB" },
          publisher: { "@type": "Organization", name: "ALYXLAB" },
          mainEntityOfPage: "https://alyxlab.com/guides/booking-system-cost",
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
      <div className="gmeta">6 min read</div>
      <h1 className="rv in">How much does a booking system actually cost?</h1>

      <div className="ganswer rv in">
        <h2>The short answer</h2>
        <p>
          Most small businesses land between $30 and $80 a month for off the shelf booking software,
          plus 2.6% to 3.5% on every card payment. A custom built system runs $300 to $1,500 up front
          and $100 to $500 a month. The cheaper option usually costs more by year two, and the reason
          is almost never the subscription price.
        </p>
      </div>

      <h2 className="rv">The number everyone quotes you</h2>
      <p className="rv">
        Off the shelf tools advertise a monthly price and it is usually honest. Square Appointments,
        Booksy, Vagaro and the rest sit in the $30 to $80 range depending on how many staff you have.
        If all you need is a calendar customers can book into, that is a fair deal and you should
        take it.
      </p>
      <p className="rv">The problem is that the calendar is rarely all you need.</p>

      <h2 className="rv">The fees that show up later</h2>
      <p className="rv">
        The price you compared is the price of the calendar. The bill you pay each month is the
        calendar plus everything attached to it. Here is where the rest comes from.
      </p>
      <ul className="rv">
        <li>
          Card processing at 2.6% to 3.5% plus a fixed fee per transaction. On $8,000 a month that is
          roughly $250.
        </li>
        <li>Per staff member pricing, so the price rises every time you hire.</li>
        <li>Text message reminders billed separately, or capped and then billed separately.</li>
        <li>The upgrade tier required for the one feature you actually wanted.</li>
      </ul>
      <p className="rv">
        Add those up and the subscription is the small number. It is the part everyone compares and
        the part that matters least.
      </p>

      <h2 className="rv">The cost nobody puts on an invoice</h2>
      <p className="rv">
        The real cost is the work that stays manual. Retyping bookings into a second calendar.
        Chasing deposits after the fact. Remembering to ask for reviews. Answering the same question
        by text forty times a week.
      </p>
      <p className="rv">
        Two to four hours a week is common. That is your time, and your time is the most expensive
        time in the business. It does not appear on any bill, which is exactly why it keeps getting
        paid.
      </p>

      <h2 className="rv">What custom actually costs</h2>
      <p className="rv">
        A built system runs $300 to $1,500 up front depending on scope, then $100 to $500 a month
        covering hosting, support and changes. That is more money on day one and less money by year
        two, once the manual work is gone and you are not stacking three subscriptions.
      </p>
      <p className="rv">
        It only makes sense when the off the shelf tool is leaving real work on the table. If it is
        not, keep the cheap tool.
      </p>

      <h2 className="rv">How to decide</h2>
      <p className="rv">Off the shelf is the right call if:</p>
      <ul className="rv">
        <li>You need a calendar and nothing else.</li>
        <li>You have one or two staff.</li>
        <li>Your tools do not need to talk to each other.</li>
      </ul>
      <p className="rv">Custom is the right call if:</p>
      <ul className="rv">
        <li>You are paying for three or more tools.</li>
        <li>You retype the same information twice.</li>
        <li>You lose customers outside opening hours.</li>
        <li>You cannot get your booking tool to do the one thing your business actually needs.</li>
      </ul>

      <h2 className="rv">What we charge</h2>
      <p className="rv">
        Presence is $97 a month plus $297 setup. Connected is $249 a month plus $597 setup.
        Operations is $499 a month plus $997 setup. The tiers are laid out in full on the{" "}
        <a href="/#price">pricing section</a>.
      </p>
      <p className="rv">
        Setup halves on a twelve month agreement. Everything is owned by you outright, and the
        monthly is month to month, cancel whenever you want.
      </p>

      <GuideCta
        line="Not sure which side you fall on? Tell me what you use now and I will send back a written plan with a fixed number, no cost."
        other="/guides/dallas-booking-system"
        otherLabel="Hiring someone to build a booking system in Dallas"
      />
    </GuideShell>
  );
}
