import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Icon } from "@/components/console/icons";
import { NAV, SCREEN_META, daypartForNow, viewFromPathname } from "@/components/console/nav";
import { supabase } from "@/integrations/supabase/client";
import consoleCss from "../../styles/console.css?url";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Console · Alyx Lab" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#000000" },
      {
        name: "description",
        content: "Alyx Lab's private lead-to-plan operations console.",
      },
      { property: "og:title", content: "Console · Alyx Lab" },
      {
        property: "og:description",
        content: "Alyx Lab's private lead-to-plan operations console.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://xlpclvovydtuxbssetga.supabase.co" },
      { rel: "stylesheet", href: consoleCss },
    ],
  }),
  component: ConsoleShell,
});

function ConsoleShell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const view = viewFromPathname(pathname);
  const [title, subtitle] = SCREEN_META[view];

  // The clock and the daypart scene both tick off the same 30s interval the
  // prototype used.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const daypart = daypartForNow(now);

  // The stylesheet keys the daypart scenes and the view off body attributes.
  useEffect(() => {
    document.body.dataset["daypart"] = daypart;
    document.body.dataset["view"] = view;
    return () => {
      delete document.body.dataset["daypart"];
      delete document.body.dataset["view"];
    };
  }, [daypart, view]);

  const liveTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const todayDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "local" });
    void router.navigate({ to: "/login", replace: true });
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="desktop-rail" aria-label="Primary navigation">
        <div className="brand-mark" aria-label="Alyx Lab">
          <span className="brand-compact">al</span>
          <span className="brand-full">Alyx Lab</span>
        </div>
        <nav className="rail-nav" id="desktopNav">
          {NAV.map((item) => (
            <Link
              key={item.id}
              className={`nav-button ${view === item.id ? "is-active" : ""}`}
              to={item.to}
              data-label={item.label}
              aria-label={item.label}
              aria-current={view === item.id ? "page" : "false"}
              style={{ textDecoration: "none" }}
            >
              <Icon name={item.icon} />
              <span className="nav-text">{item.label}</span>
            </Link>
          ))}
        </nav>
        <button
          className="rail-profile"
          type="button"
          title="Sign out of the Alyx account"
          aria-label="Sign out of the Alyx account"
          onClick={() => void handleSignOut()}
        >
          A
        </button>
      </aside>

      <nav className="mobile-nav" id="mobileNav" aria-label="Primary navigation">
        {NAV.map((item) => (
          <Link
            key={item.id}
            className={`nav-button ${view === item.id ? "is-active" : ""}`}
            to={item.to}
            aria-label={item.label}
            aria-current={view === item.id ? "page" : "false"}
            style={{ textDecoration: "none" }}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="wordmark">Alyx Lab</p>
            <h1 className="screen-title" id="screenTitle">
              {title}
            </h1>
            <p className="screen-subtitle" id="screenSubtitle">
              {subtitle}
            </p>
          </div>
          <div className="topbar-meta" aria-label="Console status">
            <div className="date-block">
              <strong id="liveTime">{liveTime}</strong>
              <span id="todayDate">{todayDate}</span>
            </div>
            <div className="sync-block" id="automationConsoleStatus">
              <strong className="live-line">
                <span className="live-dot" aria-hidden="true"></span>
                <span id="automationStatusLabel">Automation live</span>
              </strong>
              <span id="automationStatusDetail">All systems ready</span>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <div className="panel-layer" id="panelLayer" aria-hidden="true"></div>
      <div className="toast-region" id="toastRegion" aria-live="polite" aria-atomic="true"></div>
    </>
  );
}
