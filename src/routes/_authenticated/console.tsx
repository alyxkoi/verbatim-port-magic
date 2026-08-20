import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Icon } from "@/components/console/icons";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

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
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await queryClient.cancelQueries();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      queryClient.clear();
      await router.navigate({ to: "/login", replace: true });
    } catch {
      setSignOutError("We could not log you out. Please try again.");
      setSigningOut(false);
    }
  }

  const requestSignOut = () => {
    setSignOutError("");
    setLogoutOpen(true);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="desktop-rail" aria-label="Primary navigation">
        <div className="brand-mark" aria-label="Alyx Lab">
          <img
            className="console-rail-logo"
            src="/img/logo-white.png"
            alt="Alyx Lab"
            width={1114}
            height={870}
          />
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
          className="rail-profile rail-logout"
          type="button"
          title="Log out"
          aria-label="Log out"
          onClick={requestSignOut}
        >
          <Icon name="logout" />
          <span className="rail-logout-text">Log out</span>
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
          <div className="console-heading">
            <div className="console-brand-row">
              <p className="wordmark">
                <img
                  className="console-topbar-logo"
                  src="/img/logo-white.png"
                  alt="Alyx Lab"
                  width={1114}
                  height={870}
                />
              </p>
              <button
                className="topbar-logout"
                type="button"
                aria-label="Log out"
                onClick={requestSignOut}
              >
                <Icon name="logout" />
                <span>Log out</span>
              </button>
            </div>
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

      <AlertDialog
        open={logoutOpen}
        onOpenChange={(next) => {
          if (!signingOut) setLogoutOpen(next);
        }}
      >
        <AlertDialogContent className="console-logout-dialog">
          <AlertDialogHeader>
            <span className="console-logout-dialog-icon" aria-hidden="true">
              <Icon name="logout" />
            </span>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription className="console-logout-description">
              You’ll need to sign in again to access the Alyx Lab console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {signOutError ? (
            <p className="console-logout-error" role="alert">
              {signOutError}
            </p>
          ) : null}
          <AlertDialogFooter className="console-logout-actions">
            <AlertDialogCancel disabled={signingOut} className="console-logout-cancel">
              Stay signed in
            </AlertDialogCancel>
            <button
              className="console-logout-confirm"
              type="button"
              disabled={signingOut}
              aria-busy={signingOut}
              onClick={() => void handleSignOut()}
            >
              <Icon name="logout" />
              {signingOut ? "Logging out…" : "Yes, log out"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
