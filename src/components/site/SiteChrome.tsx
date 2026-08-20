import { useEffect } from "react";

/* Header, mobile drawer and footer lifted from src/site/index.html so every page
   uses the same chrome. Homepage section links are absolute (/#journey) because
   those sections do not exist on a guide page. */

const NAV = [
  { href: "/#journey", label: "What we build" },
  { href: "/#build", label: "How we work" },
  { href: "/#work", label: "Our work" },
  { href: "/#price", label: "Pricing" },
];

export function GuideNav() {
  return (
    <>
      <div aria-label="Primary navigation" className="desktop-header">
        <nav className="desktop-nav">
          <a className="nav-brand" href="/">
            <img className="brand-logo" src="/img/logo-white.png" alt="Alyx Lab" width={1114} height={870} />
          </a>
          <div className="desktop-links">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>{n.label}</a>
            ))}
          </div>
          <div className="nav-actions">
            <a className="nav-cta" href="/#start">
              <span className="full">Get my free plan</span>
              <span className="short">Start</span>
              <span>↗</span>
            </a>
          </div>
        </nav>
      </div>
      <div className="mobile-header">
        <div className="mobile-nav-shell">
          <nav aria-label="Mobile navigation" className="mobile-nav">
            <a className="nav-brand mobile-brand" href="/">
              <img className="brand-logo" src="/img/logo-white.png" alt="Alyx Lab" width={1114} height={870} />
            </a>
            <button
              aria-controls="mobileMenu"
              aria-expanded="false"
              aria-label="Open navigation"
              className="mobile-menu-btn"
              type="button"
            >
              <span></span><span></span><span></span>
            </button>
          </nav>
          <div className="mobile-menu-backdrop" aria-hidden="true"></div>
          <aside className="mobile-menu" id="mobileMenu" aria-label="Mobile menu">
            <div className="mobile-menu-top"><span>Navigate</span></div>
            <div className="mobile-menu-links">
              {NAV.map((n, i) => (
                <a key={n.href} href={n.href}>
                  <span>{n.label}</span>
                  <b>{`0${i + 1}`}</b>
                </a>
              ))}
            </div>
            <a className="mobile-menu-cta" href="/#start">
              <span>Get my free plan</span>
              <span>↗</span>
            </a>
          </aside>
        </div>
      </div>
    </>
  );
}

/* Same nav behaviour as the homepage: scroll progress bar, compact-on-scroll,
   and the drawer that fades the nav pill while open. */
function useSiteNav() {
  useEffect(() => {
    const body = document.body;
    const desktopNav = document.querySelector<HTMLElement>(".desktop-nav");
    const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
    const menuBtn = document.querySelector<HTMLButtonElement>(".mobile-menu-btn");
    const backdrop = document.querySelector<HTMLElement>(".mobile-menu-backdrop");
    let lastY = window.scrollY;
    let ticking = false;

    const closeMenu = () => {
      body.classList.remove("mobile-menu-open");
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.setAttribute("aria-label", "Open navigation");
      }
    };

    const update = () => {
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, y / max));
      desktopNav?.style.setProperty("--scroll-progress", String(progress));
      mobileNav?.style.setProperty("--scroll-progress", String(progress));
      if (y < 36) {
        body.classList.remove("nav-scrolled", "nav-compact");
      } else {
        body.classList.add("nav-scrolled");
        const delta = y - lastY;
        if (!body.classList.contains("mobile-menu-open")) {
          if (delta > 3 && y > 120) body.classList.add("nav-compact");
          if (delta < -3) body.classList.remove("nav-compact");
        }
      }
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    const onBtn = () => {
      const open = !body.classList.contains("mobile-menu-open");
      body.classList.toggle("mobile-menu-open", open);
      body.classList.remove("nav-compact");
      menuBtn?.setAttribute("aria-expanded", String(open));
      menuBtn?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    };
    const onResize = () => { if (window.innerWidth > 760) closeMenu(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".mobile-menu a"));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("keydown", onKey);
    menuBtn?.addEventListener("click", onBtn);
    backdrop?.addEventListener("click", closeMenu);
    links.forEach((a) => a.addEventListener("click", closeMenu));
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
      menuBtn?.removeEventListener("click", onBtn);
      backdrop?.removeEventListener("click", closeMenu);
      links.forEach((a) => a.removeEventListener("click", closeMenu));
      body.classList.remove("mobile-menu-open", "nav-scrolled", "nav-compact");
    };
  }, []);
}

export function GuideFooter() {
  return (
    <footer className="footer footer-rich">
      <div className="shell footer-shell">
        <div className="footer-main">
          <div className="footer-brand-col">
            <a className="footer-mark" href="/" aria-label="Alyx Lab home">
              <img className="footer-logo" src="/img/logo-white.png" alt="Alyx Lab" width={1114} height={870} />
            </a>
            <p className="footer-blurb">Complete business systems for local businesses. One place that answers, books, takes the deposit, and asks for the review.</p>
            <div className="footer-company">
              <strong>ALYXLAB</strong>
              <span>839 S Good Latimer Expy</span>
              <span>Dallas, TX 75226</span>
              <a href="tel:+14699431560">(469) 943 1560</a>
              <a href="mailto:alyxlabwork@gmail.com">alyxlabwork@gmail.com</a>
            </div>
          </div>

          <nav className="footer-col" aria-label="The system">
            <h3>The system</h3>
            <a href="/#journey">What we build</a>
            <a href="/#build">How we work</a>
            <a href="/#work">Our work</a>
            <a href="/#price">Pricing</a>
            <a href="/#start">Contact</a>
          </nav>

          <nav className="footer-col" aria-label="Guides">
            <h3>Guides</h3>
            <a href="/guides/booking-system-cost">What a booking system costs</a>
            <a href="/guides/dallas-booking-system">Hiring someone in Dallas</a>
            <a className="footer-accent-link" href="/guides">All guides</a>
          </nav>

          <div className="footer-cta-col">
            <h3>Get started</h3>
            <a className="footer-cta" href="/#start">Get my free plan</a>
            <p>A written plan for your business, usually within a day. No cost.</p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Alyxlab. One person. Complete systems. Dallas, TX.</span>
          <nav aria-label="Legal">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/login">Operator login</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* Subtle scroll reveal, same class and easing the home page uses. */
export function useReveal() {
  useEffect(() => {
    document.documentElement.classList.add("motion-ready");
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
    return () => {
      io.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);
}

export function GuideShell({ children }: { children: React.ReactNode }) {
  useSiteNav();
  useReveal();
  return (
    <>
      <GuideNav />
      <main className="gpage">
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
      <a className="nav-cta gcta-btn" href="/#start">
        <span>Get my free plan</span>
        <span>↗</span>
      </a>
      <p className="gcta-alt">
        <a href={other}>{otherLabel}</a> · <a href="/guides">All guides</a>
      </p>
    </div>
  );
}
