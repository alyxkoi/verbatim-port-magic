import { createFileRoute } from "@tanstack/react-router";
import { GuideShell } from "@/components/site/SiteChrome";

const TITLE = "Terms of Service | Alyxlab";
const DESC =
  "Terms governing Alyxlab websites, business systems, subscriptions, customer care messaging, and related services.";

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
      { rel: "stylesheet", href: "/site.css" },
      { rel: "stylesheet", href: "/guide.css" },
      { rel: "canonical", href: "https://alyxlab.com/terms" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <GuideShell>
      <p className="gmeta rv in">Effective August 20, 2026</p>
      <h1 className="rv in">Terms of Service</h1>
      <p className="lede rv">
        These terms govern alyxlab.com and services provided by Alexander Alvarez, doing business as
        Alyxlab. A signed client agreement or written project plan may add or replace terms for a
        specific engagement.
      </p>

      <div className="legal-summary rv">
        <strong>How these terms work</strong>
        <p>
          The website terms apply generally. Your accepted written plan defines the actual scope,
          price, and service details. If the two conflict, the signed agreement or accepted written
          plan controls for that project.
        </p>
      </div>

      <nav className="legal-toc rv" aria-label="Terms of Service contents">
        <h2>Contents</h2>
        <div>
          <a href="#agreement">Agreement and eligibility</a>
          <a href="#services">Services and scope</a>
          <a href="#fees">Fees and billing</a>
          <a href="#cancellation">Term and cancellation</a>
          <a href="#responsibilities">Client responsibilities</a>
          <a href="#client-messaging">Client messaging compliance</a>
          <a href="#ownership">Ownership and licenses</a>
          <a href="#data">Data and confidentiality</a>
          <a href="#payments">Payment processing</a>
          <a href="#providers">Third-party services</a>
          <a href="#ai">AI-assisted features</a>
          <a href="#availability">Availability and results</a>
          <a href="#acceptable-use">Acceptable use</a>
          <a href="#disclaimers">Disclaimers and liability</a>
          <a href="#indemnity">Indemnity</a>
          <a href="#sms-terms">SMS Messaging Terms</a>
          <a href="#email-terms">Customer care email</a>
          <a href="#law">Texas law and venue</a>
          <a href="#general">General terms and contact</a>
        </div>
      </nav>

      <section className="legal-section rv" id="agreement">
        <h2>1. Agreement and eligibility</h2>
        <p>
          By using this website, submitting a form, accepting a written plan, creating an account,
          or using Alyxlab services, you agree to these Terms of Service and our{" "}
          <a href="/privacy">Privacy Policy</a>. If you act for a business, you represent that you
          are authorized to bind that business.
        </p>
        <p>
          You must be at least 18 years old and legally able to enter a contract. If you do not
          agree to these terms, do not use the services.
        </p>
      </section>

      <section className="legal-section rv" id="services">
        <h2>2. Services and written scope</h2>
        <p>
          Alyxlab designs, configures, hosts, and maintains connected business systems. Depending on
          the written plan, a system may include a public website, lead intake, booking, customer
          care text and email, payment connections, follow-up, review requests, intake forms,
          reporting, and an Alyxlab console.
        </p>
        <p>
          Every paid engagement is governed by a written plan, order, proposal, or signed agreement
          that identifies the selected services. Work outside that scope requires written approval
          and may involve additional fees. Alyxlab may use reasonable technical methods and
          providers to deliver the agreed result.
        </p>
        <p>
          If a signed client agreement, accepted written plan, and these terms conflict, they
          control in that order for the specific engagement.
        </p>
      </section>

      <section className="legal-section rv" id="fees">
        <h2>3. Fees, billing, and plan allowances</h2>
        <p>
          The following published baseline plans are current as of the effective date. The price and
          scope in your accepted written plan control.
        </p>
        <dl className="legal-pricing">
          <div>
            <dt>Presence</dt>
            <dd>
              $97 per month. Setup is $297 for monthly service or $149 with an annual term. Includes
              up to 2,000 customer care SMS segments per month.
            </dd>
          </div>
          <div>
            <dt>Connected</dt>
            <dd>
              $249 per month. Setup is $597 for monthly service or $299 with an annual term.
              Includes up to 6,000 customer care SMS segments per month.
            </dd>
          </div>
          <div>
            <dt>Operations</dt>
            <dd>
              $499 per month. Setup is $997 for monthly service or $499 with an annual term.
              Includes up to 12,000 customer care SMS segments per month.
            </dd>
          </div>
        </dl>
        <p>
          Setup fees, recurring fees, approved additional work, taxes, and any agreed usage charges
          are due according to the written plan. Included SMS amounts refer to message segments, not
          individual conversations. Any overage treatment must be disclosed in the written plan
          before it is charged.
        </p>
        <p>
          Alyxlab bills its fees through Stripe. By providing a payment method, you authorize Stripe
          and Alyxlab to charge amounts when due. You must keep billing information current and
          promptly report a disputed charge. Late or failed payments may result in service
          suspension after reasonable notice.
        </p>
      </section>

      <section className="legal-section rv" id="cancellation">
        <h2>4. Term and cancellation</h2>
        <p>
          The service term is stated in the accepted written plan. Unless that plan says otherwise,
          cancellation requires at least 30 days&apos; written notice and takes effect at the end of
          the applicable paid billing period. A cancellation does not erase fees incurred before its
          effective date. Any refund right is governed by the written plan and applicable law.
        </p>
        <p>
          Alyxlab may terminate or suspend service for material breach, nonpayment, unlawful use,
          security risk, provider restrictions, or conduct that threatens Alyxlab, a client, or
          another person. When reasonably possible, Alyxlab will provide notice and an opportunity
          to cure.
        </p>
      </section>

      <section className="legal-section rv" id="responsibilities">
        <h2>5. Client responsibilities</h2>
        <p>Clients are responsible for:</p>
        <ul>
          <li>
            Providing accurate requirements, content, account access, approvals, and decisions
            needed to perform the work.
          </li>
          <li>
            Having the rights and permissions needed for all supplied content, data, trademarks,
            images, contact lists, and instructions.
          </li>
          <li>
            Reviewing configurations, generated content, pricing, booking rules, notices, and
            workflows before launch and after material changes.
          </li>
          <li>
            Maintaining secure credentials and promptly reporting suspected unauthorized access.
          </li>
          <li>
            Using the services lawfully and providing legally required policies, disclosures, and
            industry-specific instructions.
          </li>
        </ul>
      </section>

      <section className="legal-section rv" id="client-messaging">
        <h2>6. Client messaging and marketing compliance</h2>
        <p>
          A client that uses Alyxlab to communicate with its own customers is responsible for the
          client&apos;s campaign, recipients, message content, consent records, quiet hours, opt-out
          handling, privacy notices, and compliance with applicable telephone, text message, email,
          advertising, and consumer protection laws.
        </p>
        <p>
          Clients must not upload purchased lists, message a person without the required permission,
          hide the sender&apos;s identity, ignore an opt-out, or use the service for unlawful or
          deceptive marketing. Alyxlab&apos;s technical implementation does not constitute legal
          advice or a determination that a client&apos;s campaign is lawful.
        </p>
      </section>

      <section className="legal-section rv" id="ownership">
        <h2>7. Ownership and licenses</h2>
        <p>
          A client retains ownership of its business data, trademarks, original content, and
          materials it supplies. Alyxlab retains ownership of its software, source code, templates,
          components, prompts, automation logic, methods, documentation, know-how, and other
          materials created or owned by Alyxlab, including improvements and reusable elements.
        </p>
        <p>
          During an active paid term, Alyxlab grants the client a limited, non-exclusive,
          non-transferable license to use the delivered hosted system for the client&apos;s internal
          business purposes. Client systems are separately hosted and maintained by Alyxlab. Source
          code is not transferred by default. Any source transfer, buyout, or expanded license must
          be stated in a separate signed writing.
        </p>
        <p>
          A domain or third-party account registered in the client&apos;s own name remains the
          client&apos;s property, subject to the provider&apos;s terms. Feedback may be used by
          Alyxlab without restriction as long as it does not identify confidential client
          information.
        </p>
      </section>

      <section className="legal-section rv" id="data">
        <h2>8. Client data, privacy, and confidentiality</h2>
        <p>
          Each party will use the other party&apos;s nonpublic information only for the engagement
          and will protect it using reasonable care. This obligation does not apply to information
          that becomes public without breach, was already lawfully known, is independently
          developed, or is received lawfully without a confidentiality duty.
        </p>
        <p>
          Alyxlab processes client customer data to provide the services and according to the
          client&apos;s instructions. Clients are responsible for their own privacy policy and legal
          basis for collecting and using customer data. Our direct privacy practices are described
          in the <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>

      <section className="legal-section rv" id="payments">
        <h2>9. Client customer payment disclaimer</h2>
        <p>
          Alyxlab may connect a client&apos;s system to the client&apos;s own Stripe account.
          Alyxlab never holds, routes, or receives payments made by the client&apos;s customers.
          Those funds move between the customer, the client&apos;s payment processor, and the
          client.
        </p>
        <p>
          When authorized, Alyxlab may observe limited payment status through a read-only Stripe
          Connect connection so a workflow can respond to a completed or failed payment. Alyxlab
          stores the connected account identifier, but not full card numbers or bank credentials.
          Alyxlab is not a bank, money transmitter, payment processor, or financial institution.
        </p>
      </section>

      <section className="legal-section rv" id="providers">
        <h2>10. Third-party services</h2>
        <p>
          The services may depend on Lovable, Supabase, Sent.dm, OpenAI, Resend, Stripe, Stripe
          Connect, Google Analytics, domain registrars, and other providers. Their services are
          governed by their own terms and privacy practices. Alyxlab does not control their
          networks, policies, service changes, or outages.
        </p>
        <p>
          Alyxlab may replace a provider with a reasonably comparable provider when needed for
          security, reliability, cost, or functionality. A provider failure does not excuse payment
          for services already performed, but Alyxlab will use reasonable efforts to restore
          affected functionality.
        </p>
      </section>

      <section className="legal-section rv" id="ai">
        <h2>11. AI-assisted features</h2>
        <p>
          Alyxlab may use AI systems to draft customer care messages, plan copy, summaries,
          classifications, and other operational material. Pricing calculations use configured
          rules. Alyxlab applies validation and human review during onboarding, but generated
          material can contain errors or unexpected wording.
        </p>
        <p>
          Clients must review any output that could materially affect a customer or requires legal,
          medical, financial, safety, employment, or other professional judgment. AI output is not
          professional advice, and Alyxlab does not guarantee that it is complete, accurate, or
          suitable for every use.
        </p>
      </section>

      <section className="legal-section rv" id="availability">
        <h2>12. Availability, support, and results</h2>
        <p>
          Alyxlab aims to keep systems available and responsive, but maintenance, provider
          incidents, internet failures, security events, and other interruptions can occur. No
          uptime guarantee, response-time guarantee, service credit, or formal service level
          agreement applies unless it is included in a signed agreement.
        </p>
        <p>
          Alyxlab does not guarantee leads, bookings, revenue, reviews, search rankings, customer
          responses, or any particular business result. Results depend on the client&apos;s market,
          offer, operations, content, customer behavior, and other factors outside Alyxlab&apos;s
          control.
        </p>
        <p>
          Neither party is liable for delay caused by events beyond its reasonable control,
          including natural disasters, utility or internet failures, labor actions, war, civil
          disturbance, government action, provider outages, or widespread cyber incidents.
        </p>
      </section>

      <section className="legal-section rv" id="acceptable-use">
        <h2>13. Acceptable use</h2>
        <p>You may not use the website or services to:</p>
        <ul>
          <li>Break a law, infringe rights, deceive, harass, or cause harm.</li>
          <li>
            Send spam, unauthorized messages, malware, or content that is fraudulent, abusive, or
            unlawfully discriminatory.
          </li>
          <li>
            Probe, disrupt, overload, reverse engineer, copy, resell, or bypass security or usage
            restrictions, except where law does not permit that restriction.
          </li>
          <li>Access another person&apos;s data or account without authorization.</li>
        </ul>
        <p>
          Alyxlab may investigate suspected misuse and restrict access when reasonably necessary to
          protect the service or comply with law.
        </p>
      </section>

      <section className="legal-section rv" id="disclaimers">
        <h2>14. Disclaimers and limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the website and services are provided &quot;as
          is&quot; and &quot;as available.&quot; Alyxlab disclaims implied warranties of
          merchantability, fitness for a particular purpose, title, and non-infringement. Nothing in
          these terms excludes a warranty or right that cannot legally be excluded.
        </p>
        <p>
          To the maximum extent permitted by law, Alyxlab is not liable for indirect, incidental,
          special, exemplary, punitive, or consequential damages, or for lost profits, revenue,
          data, goodwill, or business opportunity, arising from or related to the website or
          services.
        </p>
        <p>
          Alyxlab&apos;s total aggregate liability arising from or related to a service will not
          exceed the fees paid to Alyxlab for that service during the three months immediately
          before the event giving rise to the claim. These limitations apply regardless of the legal
          theory and even if a remedy fails of its essential purpose, except where law does not
          permit the limitation.
        </p>
      </section>

      <section className="legal-section rv" id="indemnity">
        <h2>15. Indemnity</h2>
        <p>
          To the extent permitted by law, a client will defend, indemnify, and hold harmless Alyxlab
          and Alexander Alvarez from third-party claims, damages, penalties, and reasonable costs
          arising from the client&apos;s content, customer data, products, instructions, unlawful
          use, breach of these terms, infringement of another person&apos;s rights, or failure to
          obtain required consent for the client&apos;s messages or marketing.
        </p>
        <p>
          Alyxlab will promptly notify the client of an indemnified claim and provide reasonable
          cooperation. The client may control the defense, but may not settle a claim in a way that
          admits fault by or imposes a non-monetary obligation on Alyxlab without Alyxlab&apos;s
          written consent.
        </p>
      </section>

      <section className="legal-section rv" id="sms-terms">
        <h2>16. Alyxlab SMS Messaging Terms</h2>
        <h3>1. Program description</h3>
        <p>
          Alyxlab operates a recurring customer care text message program for people who contact
          Alyxlab and voluntarily request texts. Messages may include inquiry responses,
          appointments and reminders, service details, project updates, and two-way support. The
          program does not send marketing or promotional messages.
        </p>
        <h3>2. How to opt in</h3>
        <p>
          Entering a phone number alone does not enroll you. You must separately check the optional
          text consent box. Alyxlab will then ask you to reply YES to confirm. Recurring customer
          care texts begin only after that confirmation. Consent is not a condition of purchase.
        </p>
        <h3>3. Message frequency</h3>
        <p>
          Message frequency varies based on your inquiry, appointments, project, and replies. The
          program is recurring but sends only customer care messages relevant to the relationship.
        </p>
        <h3>4. Message and data charges</h3>
        <p>
          Message and data rates may apply. Your mobile carrier determines and bills those charges.
          Alyxlab is not responsible for carrier charges.
        </p>
        <h3>5. How to opt out</h3>
        <p>
          Reply STOP, STOPALL, CANCEL, UNSUBSCRIBE, END, or QUIT to unsubscribe. Alyxlab will stop
          future program messages after processing the request.
        </p>
        <h3>6. Help</h3>
        <p>
          Reply HELP for help. You may also email{" "}
          <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>.
        </p>
        <h3>7. Re-subscription</h3>
        <p>
          You may re-subscribe at any time by replying START. Your new request applies from the time
          it is processed.
        </p>
        <h3>8. Privacy and carriers</h3>
        <p>
          Mobile opt-in data and consent are handled as described in the{" "}
          <a href="/privacy">Privacy Policy</a>. Mobile carriers are not liable for delayed or
          undelivered messages. Delivery is subject to carrier availability and supported networks.
        </p>
        <h3>9. Program changes and termination</h3>
        <p>
          Alyxlab may change or end the program where permitted by law. Material changes will be
          reflected in these terms or communicated through the program when appropriate. Your
          opt-out right remains available at any time.
        </p>
      </section>

      <section className="legal-section rv" id="email-terms">
        <h2>17. Customer care email</h2>
        <p>
          The customer care email choice on our contact form is optional and separate from text
          consent. If selected, Alyxlab may email you about your inquiry, appointments, service
          details, and project updates. You can unsubscribe at any time through an available email
          method or by contacting Alyxlab. Transactional or account messages necessary to provide an
          active service may still be sent where permitted by law.
        </p>
      </section>

      <section className="legal-section rv" id="law">
        <h2>18. Texas law and Dallas County venue</h2>
        <p>
          Texas law governs these terms without regard to conflict-of-law rules. Any lawsuit arising
          from these terms or the services must be brought in the state or federal courts located in
          Dallas County, Texas, and each party consents to those courts&apos; personal jurisdiction
          and venue.
        </p>
      </section>

      <section className="legal-section rv" id="general">
        <h2>19. General terms and contact</h2>
        <p>
          Alyxlab may update these terms as services or legal requirements change. The effective
          date identifies the latest revision. Material changes may be communicated through the
          website or directly to active clients. Continued use after an update becomes effective
          means you accept the updated terms to the extent permitted by law.
        </p>
        <p>
          A party&apos;s failure to enforce a provision is not a waiver. If a provision is
          unenforceable, it will be limited to the minimum extent necessary and the remaining terms
          will continue. You may not assign a client agreement without Alyxlab&apos;s written
          consent. Alyxlab may assign an agreement as part of a business reorganization or transfer.
        </p>
        <p>
          These terms, the Privacy Policy, and any accepted written plan or signed agreement are the
          entire agreement concerning their subject. Provisions that by their nature should survive
          termination will survive, including payment, ownership, confidentiality, disclaimers,
          liability limits, indemnity, and dispute provisions.
        </p>
        <address>
          Alyxlab
          <br />
          Alexander Alvarez, doing business as Alyxlab
          <br />
          839 S Good Latimer Expy
          <br />
          Dallas, TX 75226
          <br />
          <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>
        </address>
      </section>
    </GuideShell>
  );
}
