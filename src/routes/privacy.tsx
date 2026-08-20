import { createFileRoute } from "@tanstack/react-router";
import { GuideShell } from "@/components/site/SiteChrome";

const TITLE = "Privacy Policy | Alyxlab";
const DESC =
  "How Alyxlab collects, uses, shares, and protects personal information, including customer care text and email consent.";

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
      { rel: "stylesheet", href: "/site.css" },
      { rel: "stylesheet", href: "/guide.css" },
      { rel: "canonical", href: "https://alyxlab.com/privacy" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <GuideShell>
      <p className="gmeta rv in">Effective August 20, 2026</p>
      <h1 className="rv in">Privacy Policy</h1>
      <p className="lede rv">
        This policy explains what Alyxlab collects, why we use it, and the choices available to
        website visitors, prospective clients, clients, and people whose information is processed
        through a client system.
      </p>

      <div className="legal-summary rv">
        <strong>The short version</strong>
        <p>
          We use personal information to answer inquiries, provide and improve our services, operate
          client systems, and meet legal obligations. We do not sell personal information. Text and
          email choices on our contact form are optional and separate.
        </p>
      </div>

      <nav className="legal-toc rv" aria-label="Privacy Policy contents">
        <h2>Contents</h2>
        <div>
          <a href="#who-we-are">Who we are</a>
          <a href="#scope">Scope and roles</a>
          <a href="#information">Information we collect</a>
          <a href="#uses">How we use information</a>
          <a href="#ai">Artificial intelligence</a>
          <a href="#sharing">Service providers and sharing</a>
          <a href="#communications">Texts and emails</a>
          <a href="#analytics">Cookies and analytics</a>
          <a href="#retention">Retention</a>
          <a href="#rights">Your choices and rights</a>
          <a href="#state-rights">State privacy rights</a>
          <a href="#security">Security and children</a>
          <a href="#changes">Changes and contact</a>
        </div>
      </nav>

      <section className="legal-section rv" id="who-we-are">
        <h2>1. Who we are</h2>
        <p>
          Alyxlab is operated by Alexander Alvarez, doing business as Alyxlab. We are a Dallas,
          Texas business that designs, hosts, and maintains connected websites and operating systems
          for local service and ecommerce businesses.
        </p>
        <address>
          Alyxlab
          <br />
          839 S Good Latimer Expy
          <br />
          Dallas, TX 75226
          <br />
          <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>
        </address>
      </section>

      <section className="legal-section rv" id="scope">
        <h2>2. Scope and our data roles</h2>
        <p>
          This policy applies to alyxlab.com, our contact and intake forms, our communications with
          prospects and clients, and the Alyxlab console. It also describes our role when we operate
          systems for clients.
        </p>
        <p>
          For information submitted directly to Alyxlab, we decide why and how it is processed. When
          Alyxlab processes a client&apos;s customer data to provide the client&apos;s system, the
          client controls that data and Alyxlab acts as a service provider or processor under the
          client&apos;s instructions. The client&apos;s own privacy policy governs its relationship
          with its customers.
        </p>
        <p>
          A separate signed client agreement may contain additional privacy and security terms. If
          it conflicts with this policy for a client engagement, the signed agreement controls for
          that engagement.
        </p>
      </section>

      <section className="legal-section rv" id="information">
        <h2>3. Information we collect</h2>
        <h3>Website visitors and prospective clients</h3>
        <ul>
          <li>
            Contact details, such as name, email address, phone number, business name, and business
            type.
          </li>
          <li>
            Inquiry details, including the operational problem, project needs, and any other
            information included in a message.
          </li>
          <li>
            Communication preferences, including when an optional text or email choice was selected
            and text opt-out or re-subscription activity.
          </li>
          <li>
            Device and usage information, such as browser type, approximate location, pages viewed,
            referral source, and interaction data.
          </li>
        </ul>
        <h3>Clients and client representatives</h3>
        <ul>
          <li>
            Account, billing, project, support, authentication, and business workflow information.
          </li>
          <li>Content and configuration supplied to build, host, and maintain a client system.</li>
          <li>
            Stripe account identifiers and read-only payment activity made available through an
            authorized Stripe Connect connection. Alyxlab does not store full payment card details.
          </li>
        </ul>
        <h3>Client end-customers</h3>
        <p>
          Depending on the system selected by a client, Alyxlab may process the client&apos;s
          customer names, contact details, inquiries, bookings, appointment details, intake
          responses, message history, review requests, and payment status. The exact information
          depends on the client&apos;s configuration and instructions.
        </p>
      </section>

      <section className="legal-section rv" id="uses">
        <h2>4. How we use information</h2>
        <p>We use information to:</p>
        <ul>
          <li>Answer inquiries and prepare requested business system plans.</li>
          <li>Provide customer care by email or text when separately requested.</li>
          <li>Build, host, maintain, secure, and support client systems.</li>
          <li>
            Operate booking, intake, follow-up, review, notification, and related workflows selected
            by a client.
          </li>
          <li>Process Alyxlab subscription and setup fees through Stripe.</li>
          <li>
            Diagnose errors, prevent abuse, measure performance, and improve our website and
            services.
          </li>
          <li>Comply with law, enforce agreements, and protect legal rights.</li>
        </ul>
        <p>
          We process information as needed to provide requested services, perform contracts, pursue
          legitimate business purposes, comply with law, and honor consent where consent is
          required.
        </p>
      </section>

      <section className="legal-section rv" id="ai">
        <h2>5. Artificial intelligence</h2>
        <p>
          Alyxlab uses OpenAI-supported tools to help draft customer care text messages, project
          plan copy, summaries, classifications, and similar operational content. Relevant inquiry
          or client-system information may be sent to those tools for processing. Pricing
          calculations are based on configured rules rather than generated by an AI model.
        </p>
        <p>
          Alyxlab reviews configurations during onboarding and applies validation controls, but
          AI-generated content can be incomplete or incorrect. Clients remain responsible for
          reviewing material that requires professional, legal, medical, financial, or other
          specialized judgment.
        </p>
      </section>

      <section className="legal-section rv" id="sharing">
        <h2>6. Service providers and information sharing</h2>
        <p>
          We disclose information only as reasonably needed to operate the services, follow client
          instructions, complete a transaction, protect rights, or comply with law. Current provider
          categories include:
        </p>
        <ul>
          <li>Lovable for website development and hosting support.</li>
          <li>Supabase for databases, authentication, and backend services.</li>
          <li>Sent.dm for customer care text message delivery.</li>
          <li>OpenAI for the AI-assisted processing described above.</li>
          <li>Resend for customer care email delivery.</li>
          <li>
            Stripe and Stripe Connect for Alyxlab billing and authorized, read-only observation of
            client payment status.
          </li>
          <li>Google Analytics for website measurement.</li>
        </ul>
        <p>
          Providers may process information only for the services they perform for Alyxlab or as
          otherwise permitted by their agreements and law. We may also disclose information in
          connection with a business transfer, legal request, safety issue, or protection of our
          rights. We do not sell personal information.
        </p>
      </section>

      <section className="legal-section rv" id="communications">
        <h2>7. Customer care text messages and emails</h2>
        <h3>Text messages</h3>
        <p>
          Alyxlab&apos;s text program is limited to customer care. If you separately check the text
          consent box and provide a valid phone number, Alyxlab sends a confirmation request.
          Recurring customer care texts begin only after you reply YES. Messages may concern your
          inquiry, appointments and reminders, service details, project updates, and two-way
          support. Consent is not a condition of purchase.
        </p>
        <p>
          No mobile information will be shared with third parties or affiliates for marketing or
          promotional purposes. Information sharing with subcontractors providing support services,
          such as customer service and message delivery, is permitted. Text messaging originator
          opt-in data and consent will not be shared with any third parties. Message frequency
          varies. Message and data rates may apply.
        </p>
        <p>
          Reply HELP for help. Reply STOP, CANCEL, UNSUBSCRIBE, END, or QUIT to unsubscribe. You can
          re-subscribe by replying START. Alyxlab does not send marketing or promotional text
          messages through this program.
        </p>
        <h3>Email</h3>
        <p>
          The email choice on the contact form is separate and optional. If you select it, Alyxlab
          may send customer care emails about your inquiry, appointments, service details, and
          project updates. You may unsubscribe at any time using an unsubscribe method in the email
          or by contacting us. Service messages that are necessary to an active client relationship
          may still be sent where permitted by law.
        </p>
      </section>

      <section className="legal-section rv" id="analytics">
        <h2>8. Cookies and Google Analytics</h2>
        <p>
          Alyxlab uses cookies and similar technologies for essential site operation, security,
          preferences, and measurement. We use Google Analytics 4, measurement ID G-57PVCQW4NB, to
          understand aggregate site use and improve performance. Google may collect device, browser,
          approximate location, referral, and interaction information according to its own terms and
          privacy practices.
        </p>
        <p>
          You can limit cookies through browser controls. You may also use the Google Analytics
          opt-out browser add-on. Blocking cookies may affect some site features.
        </p>
      </section>

      <section className="legal-section rv" id="retention">
        <h2>9. Data retention</h2>
        <p>
          We generally retain prospect and direct customer care information for as long as needed
          for the inquiry or relationship and for up to 24 months after the last substantive
          interaction. We may retain records longer when required for accounting, security, dispute
          resolution, consent evidence, opt-out enforcement, legal compliance, or the establishment
          and defense of legal claims.
        </p>
        <p>
          Client-system data is retained according to the signed client agreement, the client&apos;s
          instructions, the needs of the service, and applicable law. Backups and logs may remain
          for a limited period after deletion from active systems.
        </p>
      </section>

      <section className="legal-section rv" id="rights">
        <h2>10. Your choices and privacy requests</h2>
        <p>
          Depending on where you live and which law applies, you may have the right to request
          access, correction, deletion, or a copy of personal information, and to object to or limit
          certain processing. You may also have the right to opt out of certain sales, sharing,
          targeted advertising, or profiling. Alyxlab does not discriminate against a person for
          exercising an applicable privacy right.
        </p>
        <p>
          Send requests to <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>. We may
          ask for information reasonably necessary to verify the request and protect personal
          information. An authorized agent may submit a request where permitted by law, subject to
          verification of authority.
        </p>
      </section>

      <section className="legal-section rv" id="state-rights">
        <h2>11. Texas and California privacy rights</h2>
        <h3>Texas</h3>
        <p>
          To the extent the Texas Data Privacy and Security Act applies, Texas residents may request
          confirmation of processing, access, correction, deletion, and a portable copy of personal
          data. They may also opt out of qualifying sales, targeted advertising, or certain
          profiling. If we deny a request, you may appeal by replying to our decision with the
          subject line &quot;Privacy Appeal.&quot;
        </p>
        <h3>California</h3>
        <p>
          To the extent the California Consumer Privacy Act applies, California residents may
          request to know, access, correct, or delete personal information and may opt out of
          qualifying sale or sharing. They may also have rights concerning sensitive personal
          information and non-discrimination. Alyxlab does not sell personal information or share it
          for cross-context behavioral advertising.
        </p>
      </section>

      <section className="legal-section rv" id="security">
        <h2>12. Security and children</h2>
        <p>
          We use reasonable administrative, technical, and organizational safeguards designed to
          protect personal information. No internet transmission or storage system is completely
          secure, so we cannot guarantee absolute security.
        </p>
        <p>
          Alyxlab&apos;s services are intended for businesses and adults. They are not directed to
          children under 18, and we do not knowingly collect personal information directly from
          children under 18. Contact us if you believe a child has provided information directly to
          Alyxlab.
        </p>
      </section>

      <section className="legal-section rv" id="changes">
        <h2>13. Changes and contact</h2>
        <p>
          We may update this policy as our services or legal obligations change. The effective date
          at the top shows the latest revision. Material changes may also be communicated through
          the site or directly to affected clients when appropriate.
        </p>
        <p>
          Questions and privacy requests can be sent to{" "}
          <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a> or mailed to Alyxlab, 839
          S Good Latimer Expy, Dallas, TX 75226.
        </p>
      </section>
    </GuideShell>
  );
}
