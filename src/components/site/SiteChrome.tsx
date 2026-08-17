import { useEffect } from "react";

/* Nav and footer for content pages. Same markup and classes as the home page,
   with absolute hrefs so every link works from a /guides/... URL. */

export function GuideNav() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    if (!nav) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 80 && y > last) nav.classList.add("hide");
      else nav.classList.remove("hide");
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav id="nav">
      <div className="navbar">
        <a className="mark" href="/" aria-label="Alyxlab home">
          <img className="logo-img" src="/img/logo.png" alt="Alyxlab" width="1500" height="1500" />
        </a>
        <div className="nlinks">
          <a href="/#gets">What you get</a>
          <a href="/#work">Our work</a>
          <a href="/#how">How it works</a>
          <a href="/#price">Pricing</a>
        </div>
        <a className="nbtn" href="/#start">Get my free plan</a>
      </div>
    </nav>
  );
}

export function GuideFooter() {
  return (
    <footer>
      <div className="fgrid">
        <div className="fcol fbrand">
          <img className="logo-img" src="/img/logo.png" alt="Alyxlab" width="1500" height="1500" />
          <p className="fline">Complete business systems for local businesses. One place that answers, books, takes the deposit, and asks for the review.</p>
          <address className="fnap">
            <strong>ALYXLAB</strong>
            839 S Good Latimer Expy<br />
            Dallas, TX 75226<br />
            <a href="tel:+14699431560">(469) 943 1560</a><br />
            <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>
          </address>
        </div>

        <div className="fcol">
          <h3>The system</h3>
          <ul>
            <li><a href="/#gets">What you get</a></li>
            <li><a href="/#work">Our work</a></li>
            <li><a href="/#how">How it works</a></li>
            <li><a href="/#price">Pricing</a></li>
            <li><a href="/#start">Contact</a></li>
          </ul>
        </div>

        <div className="fcol">
          <h3>Guides</h3>
          <ul>
            <li><a href="/guides/booking-system-cost">What a booking system costs</a></li>
            <li><a href="/guides/dallas-booking-system">Hiring someone in Dallas</a></li>
            <li><a className="fall" href="/guides">All guides</a></li>
          </ul>
        </div>

        <div className="fcol fstart">
          <h3>Get started</h3>
          <a className="nbtn fbtn" href="/#start">Get my free plan</a>
          <p className="fnote">A written plan for your business, usually within a day. No cost.</p>
          <div className="creach freach">
            <a href="tel:+14699431560">
              <svg viewBox="0 0 24 24"><path d="M6.5 3h3l1.5 4.5-2 1.5a13 13 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/></svg>
              (469) 943 1560</a>
            <a href="mailto:alyxlabwork@gmail.com">
              <svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4.5 8 7.5 5 7.5-5"/></svg>
              alyxlabwork@gmail.com</a>
          </div>
        </div>
      </div>

      <div className="fbar">
        <span>© 2026 Alyxlab. One person. Complete systems. Dallas, TX.</span>
        <div className="fbar-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/login">Operator login</a>

        </div>
      </div>
    </footer>
  );
}

/* Subtle scroll reveal, same class and easing the home page uses. */
export function useReveal() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const els = Array.from(document.querySelectorAll<HTMLElement>(".rv"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function GuideShell({ children }: { children: React.ReactNode }) {
  useReveal();
  return (
    <>
      <GuideNav />
      <main className="gpage">
        <div className="grain" aria-hidden="true"></div>
        <div className="gcol">{children}</div>
      </main>
      <GuideFooter />
    </>
  );
}

export function GuideCta({
  line,
  other,
  otherLabel,
}: {
  line: string;
  other: string;
  otherLabel: string;
}) {
  return (
    <div className="gcta rv">
      <p>{line}</p>
      <a className="btn" href="/#start">
        <span>Get my free plan</span>
        <svg viewBox="0 0 24 24"><path d="M5 12h13M12 5.5 18.5 12 12 18.5"/></svg>
      </a>
      <p className="gcta-alt">
        <a href={other}>{otherLabel}</a> · <a href="/guides">All guides</a>
      </p>
    </div>
  );
}
