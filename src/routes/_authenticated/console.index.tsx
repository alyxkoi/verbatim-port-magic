import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/console/EmptyState";
import { Icon } from "@/components/console/icons";
import { daypartForNow, greetingForDaypart } from "@/components/console/nav";
import { listUsageWarnings } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/console/")({
  component: TodayScreen,
});

// Empty-day counters, exactly the prototype's `demoMode === "empty"` scene.
const COUNTERS = [
  ["Approvals", "pulse", 0],
  ["Call now", "volt", 0],
  ["Talking", "cyan", 0],
  ["New today", "muted", 0],
] as const;

function TodayScreen() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const daypart = daypartForNow(now);
  const greeting = greetingForDaypart(daypart);

  return (
    <section className="screen" aria-label="Today overview">
      <section className="today-sculpture" aria-labelledby="welcomeTitle">
        <article className="welcome-field">
          <div className="sky-art" aria-hidden="true">
            <img
              className={`sky-scene sky-scene-${daypart}`}
              src={`/img/sky/${daypart}.webp`}
              alt=""
              decoding="async"
            />
            <i className="night-star night-star-one"></i>
            <i className="night-star night-star-two"></i>
            <i className="night-star night-star-three"></i>
            <i className="night-star night-star-four"></i>
            <span className="sky-scrim"></span>
          </div>
          <div className="welcome-field-top">
            <span className="field-kicker">Today at Alyx Lab</span>
            <span className="automation-state">
              <i aria-hidden="true"></i> Automation live
            </span>
          </div>
          <div className="welcome-message">
            <h2 id="welcomeTitle">
              {greeting}, Alyx.
              <br />
              <span>Your studio is ready.</span>
            </h2>
            <p>
              Nothing is waiting on you. New conversations and approvals will surface here when
              they arrive.
            </p>
          </div>
          <div className="welcome-foot">
            <div>
              <span>Active clients</span>
              <strong>12</strong>
            </div>
            <div>
              <span>Capacity open</span>
              <strong>8</strong>
            </div>
            <div>
              <span>Response health</span>
              <strong>Ready</strong>
            </div>
          </div>
        </article>

        <section className="counter-field" aria-label="Live workload">
          <div className="counter-field-head">
            <span>Live workload</span>
            <Link to="/console/leads" style={{ textDecoration: "none" }}>
              Open leads <Icon name="arrow" />
            </Link>
          </div>
          <div className="sculpt-counter-grid">
            {COUNTERS.map(([label, tone, count]) => (
              <Counter key={label} label={label} tone={tone} count={count} />
            ))}
          </div>
        </section>

        <Link
          className="focus-field"
          to="/console/leads"
          aria-label="Open leads. Alyx is watching and no exceptions were detected."
          style={{ textDecoration: "none" }}
        >
          <span className="focus-contours" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="focus-bridge" aria-hidden="true">
            <Icon name="check" />
          </span>
          <span className="field-kicker">Systems quiet</span>
          <strong>Alyx is watching.</strong>
          <span className="focus-reason">
            Meta, website, and Stripe checked. No exceptions detected.
          </span>
          <span className="focus-action">
            Open leads <Icon name="arrow" />
          </span>
        </Link>
      </section>

      <UsageWarnings />

      <div className="today-section-label">
        <h2>What needs you</h2>
        <span>No decisions right now</span>
      </div>

      <div className="today-workbench">
        <article className="surface action-card">
          <div className="section-heading">
            <h2>Decision queue</h2>
            <span>Clear</span>
          </div>
          <EmptyState
            title="Decision queue is clear"
            text="New approvals and exceptions will appear here automatically."
          />
        </article>
        <aside className="week-stack" aria-label="Weekly momentum and upcoming calls">
          <article className="week-card">
            <div className="week-head">
              <h2>This week</h2>
              <span>Since Monday</span>
            </div>
            <strong className="week-total">38</strong>
            <span className="week-total-label">leads in</span>
            <div className="week-metrics">
              <div className="week-metric">
                <strong>12</strong>
                <span>plans sent</span>
              </div>
              <div className="week-metric">
                <strong>5</strong>
                <span>won</span>
              </div>
              <div className="week-metric">
                <strong>31%</strong>
                <span>to plan</span>
              </div>
            </div>
          </article>
          <article className="surface next-calls-card">
            <div className="section-heading">
              <h2>Next calls</h2>
              <span>Booked</span>
            </div>
            <EmptyState
              title="No calls booked"
              text="Booked calls and held time will appear here."
            />
          </article>
        </aside>
      </div>
    </section>
  );
}

// Counts tween up on mount, exactly like animateCounters() in the prototype.
function Counter({ label, tone, count }: { label: string; tone: string; count: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || count === 0) {
      node.textContent = String(count);
      return;
    }
    const start = performance.now();
    const duration = 420;
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      node.textContent = String(Math.round(count * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count]);

  return (
    <div className="sculpt-counter" data-tone={tone}>
      <span>{label}</span>
      <strong ref={ref} data-count={count}>
        0
      </strong>
      <i aria-hidden="true"></i>
    </div>
  );
}

/**
 * Texts running out is a warning, never a block. The cap is recorded and shown;
 * it does not stop a live conversation.
 */
function UsageWarnings() {
  const fetchWarnings = useServerFn(listUsageWarnings);
  const { data } = useQuery({ queryKey: ["usage-warnings"], queryFn: () => fetchWarnings() });
  if (!data?.length) return null;

  return (
    <div className="today-workbench" aria-label="Text allowance warnings">
      <article className="surface action-card">
        <div className="section-heading">
          <h2>Texts running low</h2>
          <span>
            {data.length} client{data.length === 1 ? "" : "s"} past 80%
          </span>
        </div>
        {data.map((row) => (
          <div key={row.id} className="client-usage">
            <div className="client-usage-head">
              <span className="usage-pct" data-tone={row.pct > 90 ? "danger" : "attention"}>
                <em>{row.name}</em> {row.segments.toLocaleString()} of {row.allowance.toLocaleString()}
              </span>
              {row.overage > 0 ? (
                <em className="tabular" data-tone="danger">
                  +${row.overage.toFixed(2)} absorbed
                </em>
              ) : null}
            </div>
            <div className="meter">
              <span
                className="meter-fill"
                data-tone={row.pct > 90 ? "danger" : "attention"}
                style={{ width: `${Math.min(100, row.pct)}%` }}
              />
            </div>
          </div>
        ))}
        <p className="pillar-note">Nothing is blocked and nothing is charged. Conversations keep running.</p>
      </article>
    </div>
  );
}
